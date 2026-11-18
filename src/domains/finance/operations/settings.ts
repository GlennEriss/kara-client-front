import { isCreditModule, creditTypeForModule } from '../credit-module'
/* eslint-disable no-restricted-imports -- Adaptateur temporaire vers les règles métier et modèles officiels existants. */
import { z } from 'zod'
import {
  asDate,
  boolField,
  dateField,
  defineAction,
  field,
  moneyField,
  numberField,
  reasonField,
  selectField,
  textField,
  type FinanceAction,
  type FinanceModule,
} from '../actions'
import { caisseTypes } from './demands'
import { DemandSimulationService } from '@/domains/financial/caisse-imprevue/services/DemandSimulationService'
import { runCaisseSpecialeSimulationWithSettings } from '@/services/caisse-speciale/CaisseSpecialeSimulationService'
export function settingsActions(module: FinanceModule): FinanceAction[] {
  const action = (
    id: string,
    label: string,
    scope: 'workspace' | 'settings',
    fields: Parameters<typeof defineAction>[5],
    run: FinanceAction['run'],
    extra = {},
  ) =>
    defineAction(
      module,
      id,
      label,
      scope,
      id.startsWith('simulation') ? 'view' : 'settings',
      fields,
      run,
      extra,
    )
  if (isCreditModule(module))
    return [
      action(
        'simulation.standard',
        'Simulation standard',
        'workspace',
        [
          moneyField(),
          field(
            'interestRate',
            'Taux (%)',
            'number',
            z
              .number()
              .min(0)
              .max(
                module === 'caisse-aide'
                  ? 5
                  : module === 'credit-fixe'
                    ? 50
                    : 100,
              ),
          ),
          moneyField('monthlyPaymentAmount', 'Mensualité (FCFA)'),
          dateField('firstPaymentDate', 'Première échéance'),
        ],
        async (ctx, d) =>
          ctx.services.creditSpeciale.calculateStandardSimulation(
            d.amount,
            d.interestRate,
            d.monthlyPaymentAmount,
            asDate(d.firstPaymentDate),
            creditTypeForModule(module),
          ),
        { readonly: true },
      ),
      action(
        'simulation.custom',
        'Simulation personnalisée',
        'workspace',
        [
          moneyField(),
          field(
            'interestRate',
            'Taux (%)',
            'number',
            z
              .number()
              .min(0)
              .max(
                module === 'caisse-aide'
                  ? 5
                  : module === 'credit-fixe'
                    ? 50
                    : 100,
              ),
          ),
          dateField('firstPaymentDate', 'Première échéance'),
          field(
            'monthlyPayments',
            'Échéancier',
            'rows',
            z
              .array(
                z
                  .object({
                    month: z.number().int().positive(),
                    amount: z.number().positive(),
                  })
                  .strict(),
              )
              .min(1)
              .max(1200),
            {
              fields: [numberField('month', 'Échéance', 1, 1200), moneyField()],
            },
          ),
        ],
        async (ctx, d) =>
          ctx.services.creditSpeciale.calculateCustomSimulation(
            d.amount,
            d.interestRate,
            d.monthlyPayments,
            asDate(d.firstPaymentDate),
            creditTypeForModule(module),
          ),
        { readonly: true },
      ),
      action(
        'simulation.proposed',
        'Simulation par durée',
        'workspace',
        [
          moneyField('totalAmount', 'Capital (FCFA)'),
          field(
            'interestRate',
            'Taux (%)',
            'number',
            z
              .number()
              .min(0)
              .max(
                module === 'caisse-aide'
                  ? 5
                  : module === 'credit-fixe'
                    ? 50
                    : 100,
              ),
          ),
          numberField(
            'duration',
            'Durée (mois)',
            1,
            module === 'caisse-aide' ? 3 : module === 'credit-fixe' ? 14 : 1200,
          ),
          dateField('firstPaymentDate', 'Première échéance'),
        ],
        async (ctx, d) =>
          ctx.services.creditSpeciale.calculateProposedSimulation(
            d.totalAmount,
            d.duration,
            d.interestRate,
            asDate(d.firstPaymentDate),
            creditTypeForModule(module),
          ),
        { readonly: true },
      ),
    ]
  const fields =
    module === 'caisse-imprevue'
      ? [
          textField('code', 'Code du forfait'),
          textField('label', 'Libellé', false),
          moneyField('amountPerMonth', 'Mensualité (FCFA)'),
          moneyField('nominal', 'Objectif nominal (FCFA)'),
          numberField('durationInMonths', 'Durée (mois)', 1, 12),
          field(
            'penaltyRate',
            'Pénalité (%)',
            'number',
            z.number().min(0).max(100),
          ),
          numberField(
            'penaltyDelayDays',
            'Délai sans pénalité (jours)',
            0,
            365,
          ),
          moneyField('supportMin', 'Aide minimum (FCFA)', false),
          moneyField('supportMax', 'Aide maximum (FCFA)', false),
          selectField('status', 'Statut', [
            { value: 'ACTIVE', label: 'Actif' },
            { value: 'INACTIVE', label: 'Inactif' },
          ]),
        ]
      : [
          selectField('caisseType', 'Type de caisse', caisseTypes),
          dateField('effectiveAt', 'Date de prise d’effet'),
          boolField('isActive', 'Version active'),
          field(
            'bonus',
            'Taux de bonus par mois',
            'rows',
            z
              .array(
                z
                  .object({
                    month: z.number().int().min(4).max(1200),
                    rate: z.number().min(0).max(100),
                  })
                  .strict(),
              )
              .max(1200),
            {
              fields: [
                numberField('month', 'Mois', 4, 1200),
                field('rate', 'Taux (%)', 'number', z.number().min(0).max(100)),
              ],
            },
          ),
          field(
            'penaltyPerDay',
            'Pénalité journalière (%)',
            'number',
            z.number().min(0).max(100),
          ),
        ]
  const toData = (d: any) =>
    module === 'caisse-imprevue'
      ? { ...d, supportMin: d.supportMin || 0, supportMax: d.supportMax || 0 }
      : {
          caisseType: d.caisseType,
          effectiveAt: asDate(d.effectiveAt),
          isActive: !!d.isActive,
          bonusTable: Object.fromEntries(
            d.bonus.map((row: any) => [`M${row.month}`, row.rate]),
          ),
          penaltyRules: { day4To12: { perDay: d.penaltyPerDay } },
        }
  return [
    action(
      'settings.create',
      module === 'caisse-imprevue'
        ? 'Nouveau forfait'
        : 'Nouvelle version de paramètres',
      'workspace',
      fields,
      async (ctx, d) => {
        if (module === 'caisse-imprevue')
          return ctx.services.caisseImprevue.createSubscription({
            ...toData(d),
            id: crypto.randomUUID(),
            createdBy: ctx.caller.claims.uid,
          })
        return ctx.services.csSettings.createSettings({
          ...toData(d),
          createdBy: ctx.caller.claims.uid,
        })
      },
    ),
    action(
      'settings.update',
      'Modifier les paramètres',
      'settings',
      fields,
      async (ctx, d) =>
        module === 'caisse-imprevue'
          ? ctx.services.caisseImprevue.updateSubscription(ctx.id, {
              ...toData(d),
              updatedBy: ctx.caller.claims.uid,
            })
          : ctx.services.csSettings.updateSettings(ctx.id, {
              ...toData(d),
              updatedBy: ctx.caller.claims.uid,
            }),
    ),
    ...(module === 'caisse-imprevue'
      ? [
          action(
            'simulation.standard',
            'Simulation de caisse',
            'workspace',
            [
              moneyField('subscriptionCIAmountPerMonth', 'Mensualité (FCFA)'),
              numberField('subscriptionCIDuration', 'Durée (mois)', 1, 1200),
              dateField('desiredStartDate', 'Début'),
              selectField('paymentFrequency', 'Fréquence', [
                { value: 'MONTHLY', label: 'Mensuelle' },
                { value: 'DAILY', label: 'Journalière' },
              ]),
            ],
            async (_ctx, d) =>
              DemandSimulationService.getInstance().calculatePaymentSchedule(
                d as any,
              ),
            { readonly: true },
          ),
        ]
      : []),
    ...(module === 'caisse-speciale'
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
      'Supprimer les paramètres',
      'settings',
      [reasonField()],
      async (ctx) =>
        module === 'caisse-imprevue'
          ? ctx.services.caisseImprevue.deleteSubscription(ctx.id)
          : ctx.services.csSettings.deleteSettings(ctx.id),
      { destructive: true, superAdminOnly: true },
    ),
    ...(module === 'caisse-imprevue'
      ? [
          action(
            'simulation.standard',
            'Simulation de caisse',
            'workspace',
            [
              moneyField('subscriptionCIAmountPerMonth', 'Mensualité (FCFA)'),
              numberField('subscriptionCIDuration', 'Durée (mois)', 1, 1200),
              dateField('desiredStartDate', 'Début'),
              selectField('paymentFrequency', 'Fréquence', [
                { value: 'MONTHLY', label: 'Mensuelle' },
                { value: 'DAILY', label: 'Journalière' },
              ]),
            ],
            async (_ctx, d) =>
              DemandSimulationService.getInstance().calculatePaymentSchedule(
                d as any,
              ),
            { readonly: true },
          ),
        ]
      : []),
    ...(module === 'caisse-speciale'
      ? [
          action(
            'simulation.standard',
            'Simulation de caisse',
            'workspace',
            [
              selectField(
                'caisseType',
                'Type de caisse',
                caisseTypes.filter((row) => row.value.startsWith('STANDARD')),
              ),
              moneyField('monthlyAmount', 'Mensualité (FCFA)'),
              numberField('durationMonths', 'Durée (mois)', 1, 1200),
              dateField('startDate', 'Début'),
            ],
            async (ctx, d) =>
              runCaisseSpecialeSimulationWithSettings(
                { ...d, startDate: asDate(d.startDate) },
                ctx.services.csSettings.getActiveSettings,
              ),
            { readonly: true },
          ),
        ]
      : []),
  ]
}
