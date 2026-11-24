import { insuranceAssetOptions, isInsuranceAssetType, newInsuranceAssetType, insuranceAssetSettingsId, parseInsuranceAssetCatalog } from '@/domains/vehicles/asset-types'
import { ensureConfiguredAssetType } from '@/domains/vehicles/asset-types-server'
import { z } from 'zod'
import {
  textField,
  dateField,
  selectField,
  idField,
  field,
} from '@/domains/finance/actions'
import {
  prospectSchema,
  civilDate,
  KARA_SPONSOR_ID,
} from '@/domains/insurance-prospects/model'
import type { AdminModule, Dataset } from '../catalog'
import { actor, type AdminAction, type AdminContext } from '../server/registry'

const fields = [
  textField('ownerName', 'Nom du contact'),
  textField('phone', 'Téléphone'),
  textField('whatsapp', 'WhatsApp', false),
  field('vehicleType', 'Type de bien', 'select', z.string().refine(isInsuranceAssetType), {
    options: insuranceAssetOptions(),
    initial: 'car',
  }),
  field('vehicleDescription', 'Précisez le type de bien', 'text', z.string().trim().max(2000).optional(), {
    showWhen: { key: 'vehicleType', value: 'other' },
  }),
  textField('plateNumber', 'Immatriculation ou référence du bien'),
  textField('city', 'Ville'),
  selectField('locationType', 'Localisation', [
    { value: 'quarter', label: 'Quartier' },
    { value: 'other', label: 'Autre emplacement' },
  ]),
  idField('quarterId', 'Quartier de Géographie (si Quartier)', 'vehicleQuarters', false),
  textField('locationDetails', 'Précisez l’emplacement (si Autre)', false),
  textField('insuranceCompany', 'Assureur actuel'),
  dateField('endDate', 'Fin de l’assurance actuelle'),
  textField('notes', 'Notes', false),
]
const note = textField('note', 'Résultat / motif')
const sponsor = {
  ...idField(
    'sponsorMemberId',
    'Parrain (vide = LE KARA — Inconnu)',
    'members',
    false,
  ),
  initial: KARA_SPONSOR_ID,
}
const currentActor = (ctx: AdminContext) => ({ ...actor(ctx), admin: true })
export function insuranceProspectActions(
  module: AdminModule,
  dataset: Dataset,
): AdminAction[] {
  if (module.key !== 'vehicles' || !['insurance', 'prospects'].includes(dataset.key)) return []
  const action = (
    id: string,
    label: string,
    actionFields: AdminAction['fields'],
    kind: Parameters<
      AdminContext['services']['insuranceProspects']['change']
    >[2],
  ): AdminAction => ({
    id,
    label,
    fields: actionFields,
    scope: 'contract',
    permission: 'vehicules.edit',
    run: async (ctx, data) => {
      if (kind === 'edit') await ensureConfiguredAssetType(ctx.services.db, data.vehicleType, ctx.row?.vehicleType)
      return ctx.services.insuranceProspects.change(ctx.id, currentActor(ctx), kind, data)
    },
  })
  const catalogAction = (kind: 'add' | 'toggle'): AdminAction => ({
    id: `prospect.catalog.${kind}`,
    label: kind === 'add' ? 'Ajouter un type de bien' : 'Retirer ou réactiver un type de bien',
    scope: 'workspace',
    permission: 'vehicules.edit',
    fields: kind === 'add' ? [textField('label', 'Nom du type de bien')] : [
      field('catalogAssetType', 'Type de bien', 'select', z.string().refine(isInsuranceAssetType), { options: insuranceAssetOptions() }),
      selectField('state', 'Action', [{ value: 'inactive', label: 'Retirer' }, { value: 'active', label: 'Réactiver' }]),
    ],
    run: async ({ services }, input) => {
      const ref = services.db.collection('settings').doc(insuranceAssetSettingsId)
      await services.db.runTransaction(async tx => {
        const catalog = parseInsuranceAssetCatalog((await tx.get(ref)).data())
        if (kind === 'add') catalog.values.push(newInsuranceAssetType(input.label, catalog.values))
        else {
          const value = input.catalogAssetType
          if (value === 'other' || !insuranceAssetOptions(catalog, { includeInactive: true }).some(option => option.value === value))
            throw Error('Ce type de bien ne peut pas être modifié.')
          const inactive = new Set(catalog.inactive)
          if (input.state === 'inactive') inactive.add(value)
          else inactive.delete(value)
          catalog.inactive = [...inactive]
        }
        tx.set(ref, catalog, { merge: true })
      })
      return { success: true }
    },
  })
  const catalogActions = [catalogAction('add'), catalogAction('toggle')]
  if (dataset.key === 'insurance') return catalogActions
  return [
    ...catalogActions,
    {
      id: 'prospect.create',
      label: 'Nouveau prospect',
      scope: 'workspace',
      permission: 'vehicules.create',
      fields: [...fields, sponsor],
      schema: z
        .object({
          ...prospectSchema.shape,
          sponsorMemberId: z.string().optional(),
        })
        .strict()
        .superRefine((data, ctx) => {
          const input = Object.fromEntries(
            Object.entries(data).filter(([key]) => key !== 'sponsorMemberId'),
          )
          const result = prospectSchema.safeParse(input)
          if (!result.success)
            for (const issue of result.error.issues)
              ctx.addIssue({
                code: 'custom',
                path: issue.path,
                message: issue.message,
              })
        }),
      run: async (ctx, data) => {
        const { sponsorMemberId, ...input } = data
        await ensureConfiguredAssetType(ctx.services.db, input.vehicleType)
        return ctx.services.insuranceProspects.create(
          input,
          sponsorMemberId,
          currentActor(ctx),
        )
      },
    },
    {
      ...action('prospect.update', 'Modifier le prospect', fields, 'edit'),
      schema: prospectSchema,
    },
    ...(['contacted', 'quote_requested'] as const).map((kind) =>
      action(
        `prospect.${kind}`,
        kind === 'contacted'
          ? 'Enregistrer une relance'
          : 'Demander une assurance LE KARA',
        [
          note,
          field(
            'followUpDate',
            'Prochaine relance',
            'date',
            z.union([civilDate, z.literal('')]).optional(),
          ),
        ],
        kind,
      ),
    ),
    action(
      'prospect.renew',
      'Renouvelé ailleurs',
      [
        note,
        textField('insuranceCompany', 'Nouvel assureur'),
        dateField('endDate', 'Nouvelle fin de l’assurance'),
      ],
      'renewed_elsewhere',
    ),
    action(
      'prospect.assign',
      'Attribuer le parrainage',
      [sponsor, note],
      'assign',
    ),
    action(
      'prospect.convert',
      'Rattacher l’assurance LE KARA',
      [
        idField(
          'insuranceId',
          'Assurance validée du véhicule',
          'prospectInsurances',
        ),
        note,
      ],
      'converted',
    ),
    action('prospect.lost', 'Clôturer comme perdu', [note], 'lost'),
  ]
}
