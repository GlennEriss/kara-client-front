import { z } from 'zod'
import {
  subscriptionCISchema,
  defaultSubscriptionCIValues,
} from '@/schemas/caisse-imprevue.schema'
import {
  asDate,
  boolField,
  dateField,
  defineAction,
  field,
  numberField,
  reasonField,
  selectField,
  textField,
  type FinanceAction,
  type FinanceModule,
} from '../actions'
import { caisseTypes } from './demands'
import { financeCollection } from '../server/read-model'
const bonusSchema = z
  .array(
    z
      .object({
        month: z.number().int().min(4).max(1200),
        rate: z.number().min(0).max(100),
      })
      .strict(),
  )
  .max(1200)
  .refine(
    (v) => new Set(v.map((r) => r.month)).size === v.length,
    'Chaque mois doit apparaître une seule fois.',
  )
const stepsSchema = z
  .array(
    z
      .object({
        from: z.number().int().min(1).max(9),
        to: z.number().int().min(1).max(9),
        rate: z.number().min(0).max(100),
      })
      .strict()
      .refine((v) => v.to >= v.from, 'La fin du palier doit suivre son début.'),
  )
  .max(9)
  .refine(
    (v) =>
      v.every((s, i) =>
        v.every((t, j) => i === j || s.to < t.from || s.from > t.to),
      ),
    'Les paliers ne doivent pas se chevaucher.',
  )
const bonus = field('bonus', 'Bonus de M4 à M12', 'rows', bonusSchema, {
  initial: Array.from({ length: 9 }, (_, i) => ({ month: i + 4, rate: 0 })),
  fields: [
    numberField('month', 'Mois', 4, 1200),
    field('rate', 'Taux (%)', 'number', z.number().min(0).max(100)),
  ],
})
const perDay = field(
  'penaltyPerDay',
  'Pénalité par jour (%)',
  'number',
  z.number().min(0).max(100),
  { initial: 0 },
)
const csUpdate = z
  .object({
    bonus: bonusSchema,
    useSteps: z.boolean(),
    penaltyPerDay: z.number().min(0).max(100),
    penaltySteps: stepsSchema,
  })
  .strict()
  .refine(
    (v) => !v.useSteps || v.penaltySteps.length > 0,
    'Ajoutez au moins un palier ou choisissez une pénalité journalière.',
  )
function customId(prefix: string, code: string) {
  const stamp = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Libreville',
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
    .format(new Date())
    .replace(/[^0-9]/g, '')
  return `${prefix}_${code}_${stamp}_${crypto.randomUUID().slice(0, 8)}`
}
export function caisseSettingsActions(module: FinanceModule): FinanceAction[] {
  if (!['caisse-speciale', 'caisse-imprevue'].includes(module)) return []
  const ci = module === 'caisse-imprevue'
  const ciFields = [
    selectField(
      'code',
      'Code du forfait',
      Array.from({ length: 26 }, (_, i) => ({
        value: String.fromCharCode(65 + i),
        label: String.fromCharCode(65 + i),
      })),
    ),
    { ...textField('label', 'Libellé du forfait', false), keepEmpty: true },
    ...[
      'amountPerMonth',
      'nominal',
      'supportMin',
      'supportMax',
      'durationInMonths',
      'penaltyRate',
      'penaltyDelayDays',
    ].map((key) =>
      field(
        key,
        (
          {
            amountPerMonth: 'Montant mensuel (FCFA)',
            nominal: 'Nominal (FCFA)',
            supportMin: 'Appui minimum (FCFA)',
            supportMax: 'Appui maximum (FCFA)',
            durationInMonths: 'Durée (mois)',
            penaltyRate: 'Pénalité (%)',
            penaltyDelayDays: 'Délai avant pénalités (jours)',
          } as Record<string, string>
        )[key],
        'number',
        (subscriptionCISchema as any).shape[key],
        {
          initial: (defaultSubscriptionCIValues as any)[key],
          min:
            key === 'amountPerMonth' ||
            key === 'nominal' ||
            key === 'supportMax' ||
            key === 'durationInMonths'
              ? 1
              : 0,
          ...(key === 'durationInMonths'
            ? { max: 12 }
            : key === 'penaltyRate'
              ? { max: 100 }
              : key === 'penaltyDelayDays'
                ? { max: 30 }
                : {}),
        },
      ),
    ),
    selectField('status', 'Statut', [
      { value: 'ACTIVE', label: 'Actif' },
      { value: 'INACTIVE', label: 'Inactif' },
    ]),
  ].map((f) => ({
    ...f,
    ...((defaultSubscriptionCIValues as any)[f.key] !== undefined
      ? { initial: (defaultSubscriptionCIValues as any)[f.key] }
      : {}),
  }))
  const action = (
    id: string,
    label: string,
    scope: 'workspace' | 'settings',
    fields: FinanceAction['fields'],
    run: FinanceAction['run'],
    extra: Partial<FinanceAction> = {},
  ) => defineAction(module, id, label, scope, 'settings', fields, run, extra)
  const current = async (ctx: Parameters<FinanceAction['run']>[0]) => {
    const snap = await ctx.services.db
      .collection(financeCollection(module, 'settings'))
      .doc(ctx.id)
      .get()
    if (!snap.exists) throw Error('Paramètres introuvables.')
    return snap.data()!
  }
  const checkCode = async (
    ctx: Parameters<FinanceAction['run']>[0],
    d: any,
    create: boolean,
  ) => {
    if (create) {
      if (!/^[A-Z]$/.test(d.code)) throw Error('Choisissez un code de A à Z.')
      const rows = await ctx.services.caisseImprevue.getAllSubscriptions()
      if (rows.some((r) => r.code === d.code))
        throw Error('Ce code de forfait est déjà utilisé.')
    } else if ((await current(ctx)).code !== d.code)
      throw Error(
        'Le code du forfait ne peut pas être modifié après sa création.',
      )
  }
  return [
    action(
      'settings.create',
      ci ? 'Ajouter un forfait' : 'Nouvelle version de paramètres',
      'workspace',
      ci
        ? ciFields
        : [
            {
              ...selectField('caisseType', 'Type de caisse', caisseTypes),
              initial: 'STANDARD',
            },
            dateField('effectiveAt', 'Date de prise d’effet'),
            bonus,
            perDay,
          ],
      async (ctx, d) => {
        if (ci) {
          await checkCode(ctx, d, true)
          return ctx.services.caisseImprevue.createSubscription({
            ...d,
            id: customId('MK_CI_FORFAIT', d.code),
            createdBy: ctx.caller.claims.uid,
            updatedBy: ctx.caller.claims.uid,
          })
        }
        return ctx.services.csSettings.createSettings({
          id: customId('MK_VERSION', d.caisseType),
          caisseType: d.caisseType,
          effectiveAt: asDate(d.effectiveAt),
          isActive: false,
          bonusTable: Object.fromEntries(
            d.bonus.map((r: any) => [`M${r.month}`, r.rate]),
          ),
          penaltyRules: { day4To12: { perDay: d.penaltyPerDay } },
          businessTexts: {},
          createdBy: ctx.caller.claims.uid,
        })
      },
      ci ? { schema: subscriptionCISchema } : {},
    ),
    action(
      'settings.update',
      ci ? 'Modifier le forfait' : 'Modifier les bonus et pénalités',
      'settings',
      ci
        ? ciFields
        : [
            bonus,
            boolField('useSteps', 'Utiliser des paliers de pénalité'),
            perDay,
            field('penaltySteps', 'Paliers de pénalité', 'rows', stepsSchema, {
              fields: [
                numberField('from', 'Du jour de pénalité', 1, 9),
                numberField('to', 'Au jour de pénalité', 1, 9),
                field(
                  'rate',
                  'Taux par jour (%)',
                  'number',
                  z.number().min(0).max(100),
                ),
              ],
              help: 'Le jour 1 correspond à J+4, le jour 9 à J+12.',
            }),
          ],
      async (ctx, d) => {
        if (ci) {
          await checkCode(ctx, d, false)
          return ctx.services.caisseImprevue.updateSubscription(ctx.id, {
            ...d,
            updatedBy: ctx.caller.claims.uid,
          })
        }
        const previous = await current(ctx)
        return ctx.services.csSettings.updateSettings(ctx.id, {
          bonusTable: {
            ...previous.bonusTable,
            ...Object.fromEntries(
              d.bonus.map((r: any) => [`M${r.month}`, r.rate]),
            ),
          },
          penaltyRules: {
            ...previous.penaltyRules,
            day4To12: d.useSteps
              ? { steps: d.penaltySteps }
              : { perDay: d.penaltyPerDay },
          },
          updatedBy: ctx.caller.claims.uid,
        })
      },
      { schema: ci ? subscriptionCISchema : csUpdate },
    ),
    ...(!ci
      ? [
          action(
            'settings.activate',
            'Activer cette version',
            'settings',
            [],
            async (ctx) => ctx.services.csSettings.activateSettings(ctx.id),
          ),
        ]
      : []),
    action(
      'settings.delete',
      ci ? 'Supprimer le forfait' : 'Supprimer la version',
      'settings',
      [reasonField()],
      async (ctx) => {
        if (ci) await ctx.services.caisseImprevue.deleteSubscription(ctx.id)
        else await ctx.services.csSettings.deleteSettings(ctx.id)
        return { deleted: true }
      },
      { destructive: true, superAdminOnly: true },
    ),
  ]
}
