import { z } from 'zod'
import {
  asDate,
  idField,
  moneyField,
  dateField,
  timeField,
  boolField,
  textField,
  reasonField,
  fileField,
  field,
  numberField,
  paymentModes,
  selectField,
} from '@/domains/finance/actions'
import {
  placementDemandFormSchema,
  convertDemandToPlacementSchema,
  approveDemandSchema,
  rejectDemandSchema,
  reopenDemandSchema,
} from '@/schemas/placement.schema'
import {
  nested,
  select,
  textArea,
  type AdminModule,
  type Dataset,
} from '../catalog'
import { actor, type AdminAction, type AdminContext } from '../server/registry'
const urgent = nested(
  'urgentContact',
  'Contact d’urgence',
  [
    textField('name', 'Nom'),
    textField('firstName', 'Prénom', false),
    textField('phone', 'Téléphone'),
    textField('phone2', 'Autre téléphone', false),
    textField('relationship', 'Lien de parenté', false),
    textField('idNumber', 'Numéro de pièce', false),
    textField('typeId', 'Type de pièce', false),
  ],
  true,
)
const demandFields = [
  idField('benefactorId', 'Bienfaiteur', 'members'),
  moneyField(),
  field('rate', 'Taux de commission (%)', 'number', z.number().min(0).max(10)),
  numberField('periodMonths', 'Durée (mois)', 1, 7),
  select('payoutMode', 'Règlement', [
    'MonthlyCommission_CapitalEnd',
    'CapitalPlusCommission_End',
  ]),
  dateField('desiredDate', 'Début souhaité'),
  textArea('cause', 'Motif', true),
  urgent,
]
const file = (ctx: AdminContext, key: string) => {
  if (!ctx.files[key]) throw Error('Ajoutez le document demandé.')
  return ctx.files[key]
}
export function placementActions(
  module: AdminModule,
  dataset: Dataset,
): AdminAction[] {
  if (module.key !== 'placements') return []
  const action = (
    id: string,
    label: string,
    permission: string,
    fields: AdminAction['fields'],
    run: AdminAction['run'],
    extra: Partial<AdminAction> = {},
  ): AdminAction => ({
    id,
    label,
    scope: 'contract',
    permission: `placements.${permission}`,
    fields,
    run,
    ...extra,
  })
  if (dataset.key === 'demands')
    return [
      action(
        'demand.create',
        'Nouvelle demande',
        'create',
        demandFields,
        (ctx, d) =>
          ctx.services.placementService.createDemand(
            {
              ...placementDemandFormSchema.parse(d),
              status: 'PENDING',
              createdBy: actor(ctx).id,
            },
            actor(ctx).id,
          ),
        { scope: 'workspace' },
      ),
      ...[
        ['approve', 'Accepter', approveDemandSchema],
        ['reject', 'Refuser', rejectDemandSchema],
        ['reopen', 'Réouvrir', reopenDemandSchema],
      ].map(([key, label, schema]) =>
        action(
          `demand.${key}`,
          String(label),
          'validate',
          [reasonField()],
          (ctx, d) => {
            const parsed = (schema as z.ZodTypeAny).parse(d) as {
              reason: string
            }
            return (ctx.services.placementService as any)[`${key}Demand`](
              ctx.id,
              actor(ctx).id,
              parsed.reason,
            )
          },
        ),
      ),
      action(
        'demand.convert',
        'Convertir en placement',
        'create',
        [
          selectField('paymentMode', 'Moyen de remise', paymentModes),
          boolField('withFees', 'Avec frais'),
          textField('paymentMethodOther', 'Autre moyen', false),
          textField('handoverLocation', 'Lieu de remise'),
          dateField('handoverDate', 'Date de remise'),
          timeField('handoverTime', 'Heure de remise'),
        ],
        (ctx, d) => {
          const parsed = convertDemandToPlacementSchema.parse(d)
          return ctx.services.placementService.convertDemandToPlacement(
            ctx.id,
            actor(ctx).id,
            {
              ...parsed,
              handoverDate: asDate(parsed.handoverDate, parsed.handoverTime),
            },
          )
        },
      ),
    ]
  return [
    action(
      'placement.update',
      'Modifier le placement',
      'create',
      [
        idField('benefactorId', 'Bienfaiteur', 'members'),
        moneyField(),
        field(
          'rate',
          'Taux de commission (%)',
          'number',
          z.number().min(0).max(10),
        ),
        numberField('periodMonths', 'Durée (mois)', 1, 7),
        select('payoutMode', 'Règlement', [
          'MonthlyCommission_CapitalEnd',
          'CapitalPlusCommission_End',
        ]),
        urgent,
      ],
      (ctx, d) =>
        ctx.services.placementService.updatePlacement(ctx.id, d, actor(ctx).id),
    ),
    action(
      'commission.pay',
      'Payer une commission',
      'commission',
      [
        idField('commissionId', 'Commission à payer', 'commissions'),
        dateField(),
        timeField(),
        selectField('paymentMode', 'Moyen de paiement', paymentModes),
        boolField('withFees', 'Avec frais'),
        textField('paymentMethodOther', 'Autre moyen', false),
        fileField('proof', 'Preuve de paiement (image)'),
      ],
      async (ctx, d) => {
        const due = (
          await ctx.services.placementService.listCommissions(ctx.id)
        ).find((c) => c.id === d.commissionId)
        if (!due) throw Error('Commission introuvable.')
        return ctx.services.placementService.payCommissionWithProof(
          ctx.id,
          d.commissionId,
          file(ctx, 'proof'),
          ctx.row.benefactorId,
          asDate(d.date, d.time),
          actor(ctx).id,
          {
            paidAmount: due.amount,
            paymentMode: d.paymentMode,
            withFees: !!d.withFees,
            paymentMethodOther: d.paymentMethodOther,
          },
        )
      },
    ),
    action(
      'placement.early.calculate',
      'Calculer le retrait anticipé',
      'view',
      [dateField('effectiveDate', 'Date de retrait')],
      (ctx, d) =>
        ctx.services.placementService.calculateEarlyExitAmounts(
          ctx.id,
          asDate(d.effectiveDate),
        ),
      { readonly: true },
    ),
    action(
      'placement.early',
      'Demander un retrait anticipé',
      'validate',
      [
        reasonField(),
        dateField('withdrawalDate', 'Date de retrait'),
        timeField('withdrawalTime', 'Heure de retrait'),
        selectField('paymentMode', 'Mode de retrait', paymentModes),
        boolField('withFees', 'Avec frais'),
        textField('paymentMethodOther', 'Autre moyen', false),
        fileField('withdrawalProof', 'Preuve du retrait (image)'),
        fileField('documentPdf', 'Document PDF signé'),
      ],
      async (ctx, d) => {
        const amounts =
          await ctx.services.placementService.calculateEarlyExitAmounts(
            ctx.id,
            asDate(d.withdrawalDate, d.withdrawalTime),
          )
        return ctx.services.placementService.requestEarlyExit(
          ctx.id,
          {
            ...d,
            ...amounts,
            withdrawalProof: file(ctx, 'withdrawalProof'),
            documentPdf: file(ctx, 'documentPdf'),
          },
          ctx.row.benefactorId,
          actor(ctx).id,
        )
      },
    ),
    action(
      'placement.close',
      'Clôturer le placement',
      'validate',
      [
        reasonField(
          'closingReason',
          'Motif de clôture (10 caractères minimum)',
        ),
        fileField('quittance', 'Procès-verbal de liquidation signé'),
      ],
      (ctx, d) =>
        ctx.services.placementService.closePlacement(
          ctx.id,
          file(ctx, 'quittance'),
          d.closingReason,
          actor(ctx).id,
        ),
    ),
    ...[
      ['PLACEMENT_CONTRACT', 'Déposer le contrat signé'],
      ['PLACEMENT_FINAL_QUITTANCE', 'Déposer la quittance finale'],
      ['PLACEMENT_EARLY_EXIT_QUITTANCE', 'Déposer la liquidation anticipée'],
      ['PLACEMENT_EARLY_EXIT_ADDENDUM', 'Déposer l’avenant de retrait'],
    ].map(([type, label]) =>
      action(
        `document.${type}`,
        label,
        'create',
        [fileField('document', 'Document PDF')],
        (ctx) =>
          ctx.services.placementService.uploadPlacementDocument(
            file(ctx, 'document'),
            ctx.id,
            ctx.row.benefactorId,
            type as any,
            actor(ctx).id,
          ),
      ),
    ),
    action(
      'placement.delete',
      'Supprimer le placement',
      'delete',
      [reasonField()],
      async (ctx) => {
        await ctx.services.placementService.deletePlacement(ctx.id)
        return { deleted: true }
      },
      { destructive: true },
    ),
  ]
}
