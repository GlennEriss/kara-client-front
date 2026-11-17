import { z } from 'zod'
import {
  asDate,
  boolField,
  dateField,
  defineAction,
  field,
  idField,
  moneyField,
  numberField,
  reasonField,
  selectField,
  textField,
  type FinanceAction,
  type FinanceModule,
} from '../actions'
import { caisseSpecialeDemandFormSchema } from '@/schemas/caisse-speciale.schema'
import { emergencyContactSchema } from '@/schemas/emergency-contact.schema'

export const caisseTypes = [
  ['STANDARD', 'Standard'],
  ['JOURNALIERE', 'Journalière'],
  ['LIBRE', 'Libre'],
  ['STANDARD_CHARITABLE', 'Standard charitable'],
  ['JOURNALIERE_CHARITABLE', 'Journalière charitable'],
  ['LIBRE_CHARITABLE', 'Libre charitable'],
].map(([value, label]) => ({ value, label }))
export const contactField = field(
  'emergencyContact',
  'Contact d’urgence',
  'fields',
  emergencyContactSchema.optional(),
  {
    fields: [
      textField('lastName', 'Nom'),
      textField('firstName', 'Prénom', false),
      textField('phone1', 'Téléphone principal'),
      textField('phone2', 'Autre téléphone', false),
      textField('relationship', 'Lien de parenté'),
      textField('typeId', 'Type de pièce d’identité'),
      textField('idNumber', 'Numéro de pièce'),
      field(
        'documentPhotoUrl',
        'Pièce justificative du contact',
        'file',
        z.string().url(),
      ),
    ],
  },
)
export const simulationFields = [
  moneyField(),
  field(
    'interestRate',
    'Taux d’intérêt (%)',
    'number',
    z.number().min(0).max(100),
  ),
  moneyField('monthlyPaymentAmount', 'Mensualité (FCFA)'),
  numberField('duration', 'Durée', 1, 1200),
  dateField('firstPaymentDate', 'Première échéance'),
  moneyField('totalAmount', 'Montant total prévu (FCFA)'),
  selectField(
    'durationUnit',
    'Unité de durée',
    [
      { value: 'MONTHS', label: 'Mois' },
      { value: 'WEEKS', label: 'Semaines' },
    ],
    true,
  ),
  field(
    'customSchedule',
    'Échéancier personnalisé',
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
      .max(1200)
      .optional(),
    { fields: [numberField('month', 'Échéance', 1, 1200), moneyField()] },
  ),
]
export function demandActions(module: FinanceModule): FinanceAction[] {
  const action = (
    id: string,
    label: string,
    scope: 'workspace' | 'demand',
    permission: string,
    fields: Parameters<typeof defineAction>[5],
    run: FinanceAction['run'],
    extra = {},
  ) => defineAction(module, id, label, scope, permission, fields, run, extra)
  const fields =
    module === 'caisse-speciale'
      ? [
          idField('memberId', 'Membre', 'members'),
          selectField('caisseType', 'Type de caisse', caisseTypes),
          field(
            'monthlyAmount',
            'Versement mensuel (FCFA)',
            'money',
            caisseSpecialeDemandFormSchema.shape.monthlyAmount,
            { min: 1000, max: 10000000 },
          ),
          numberField('monthsPlanned', 'Durée (mois)', 1, 12),
          dateField('desiredDate', 'Début souhaité'),
          textField('cause', 'Motif', false),
          { ...contactField, schema: emergencyContactSchema, required: true },
        ]
      : module === 'caisse-imprevue'
        ? [
            idField('memberId', 'Membre', 'members'),
            idField('subscriptionCIID', 'Forfait', 'subscriptions'),
            selectField('paymentFrequency', 'Fréquence', [
              { value: 'MONTHLY', label: 'Mensuelle' },
              { value: 'DAILY', label: 'Journalière' },
            ]),
            dateField('desiredStartDate', 'Début souhaité'),
            field(
              'cause',
              'Motif de la demande',
              'multiline',
              z.string().trim().min(10).max(500),
            ),
            { ...contactField, schema: emergencyContactSchema, required: true },
          ]
        : [
            idField('clientId', 'Membre emprunteur', 'members'),
            moneyField(),
            moneyField('monthlyPaymentAmount', 'Mensualité souhaitée (FCFA)'),
            dateField('desiredDate', 'Date souhaitée'),
            reasonField('cause', 'Objet du crédit'),
            idField('guarantorId', 'Garant', 'members', false),
            textField('guarantorRelation', 'Lien avec le garant', false),
            boolField('guarantorIsMember', 'Garant membre de KARA'),
          ]
  const actions: FinanceAction[] = [
    action(
      'demand.create',
      'Nouvelle demande',
      'workspace',
      'create',
      fields,
      async (ctx, data) => {
        const uid = ctx.caller.claims.uid
        if (module === 'caisse-speciale')
          return ctx.services.caisseSpeciale.createDemand(
            {
              ...data,
              contractType: 'INDIVIDUAL',
              status: 'PENDING',
              createdBy: uid,
            },
            uid,
          )
        if (module === 'caisse-imprevue') {
          const member = await ctx.services.members.getMemberById(data.memberId)
          const subscription =
            await ctx.services.ciSubscriptions.getSubscriptionById(
              data.subscriptionCIID,
            )
          if (!member || !subscription || subscription.status !== 'ACTIVE')
            throw new Error('Membre ou forfait actif introuvable')
          return ctx.services.ciDemandService.createDemand(
            {
              ...data,
              memberFirstName: member.firstName,
              memberLastName: member.lastName,
              memberContacts: member.contacts,
              memberEmail: member.email,
              memberMatricule: member.matricule || data.memberId,
              subscriptionCICode: subscription.code,
              subscriptionCILabel: subscription.label,
              subscriptionCIAmountPerMonth: subscription.amountPerMonth,
              subscriptionCINominal: subscription.nominal,
              subscriptionCIDuration: subscription.durationInMonths,
              subscriptionCISupportMin: subscription.supportMin,
              subscriptionCISupportMax: subscription.supportMax,
              status: 'PENDING',
              createdBy: uid,
            },
            uid,
          )
        }
        const member = await ctx.services.members.getMemberById(data.clientId)
        if (!member) throw new Error('Membre introuvable')
        const guarantor = data.guarantorId
          ? await ctx.services.members.getMemberById(data.guarantorId)
          : null
        return ctx.services.creditSpeciale.createDemand({
          ...data,
          clientFirstName: member.firstName,
          clientLastName: member.lastName,
          clientContacts: member.contacts,
          guarantorFirstName: guarantor?.firstName,
          guarantorLastName: guarantor?.lastName,
          guarantorIsMember: !!guarantor,
          creditType: 'SPECIALE',
          status: 'PENDING',
          createdBy: uid,
        })
      },
    ),
    action(
      'demand.update',
      'Modifier la demande',
      'demand',
      'create',
      fields.filter((item) => !['memberId', 'clientId'].includes(item.key)),
      async (ctx, data) => {
        if (module === 'caisse-speciale')
          return ctx.services.caisseSpeciale.updateDemandDetails(
            ctx.id,
            data,
            ctx.caller.claims.uid,
          )
        if (module === 'credit-speciale')
          return ctx.services.creditSpeciale.updateDemandDetails(
            ctx.id,
            data,
            ctx.caller.claims.uid,
          )
        const demand = await ctx.services.ciDemandService.getDemandById(ctx.id)
        if (!demand || !['PENDING', 'REOPENED'].includes(demand.status))
          throw new Error(
            'Seule une demande en attente ou réouverte peut être modifiée.',
          )
        const subscription =
          await ctx.services.ciSubscriptions.getSubscriptionById(
            data.subscriptionCIID,
          )
        if (!subscription || subscription.status !== 'ACTIVE')
          throw new Error('Forfait actif introuvable')
        return ctx.services.ciDemandService.updateDemand(
          ctx.id,
          {
            ...data,
            subscriptionCICode: subscription.code,
            subscriptionCIAmountPerMonth: subscription.amountPerMonth,
            subscriptionCINominal: subscription.nominal,
            subscriptionCIDuration: subscription.durationInMonths,
            subscriptionCISupportMin: subscription.supportMin,
            subscriptionCISupportMax: subscription.supportMax,
          },
          ctx.caller.claims.uid,
        )
      },
    ),
    ...(['approve', 'reject', 'reopen'] as const).map((decision) =>
      action(
        `demand.${decision}`,
        {
          approve: 'Accepter la demande',
          reject: 'Refuser la demande',
          reopen: 'Rouvrir la demande',
        }[decision],
        'demand',
        'validate',
        [
          field(
            'reason',
            'Motif de la décision',
            'multiline',
            z.string().trim().min(10).max(500),
          ),
        ],
        async (ctx, data) => {
          if (module === 'caisse-speciale')
            return ctx.services.caisseSpeciale[`${decision}Demand`](
              ctx.id,
              ctx.caller.claims.uid,
              data.reason,
            )
          if (module === 'caisse-imprevue')
            return ctx.services.ciDemandService[
              (
                {
                  approve: 'acceptDemand',
                  reject: 'rejectDemand',
                  reopen: 'reopenDemand',
                } as const
              )[decision]
            ](ctx.id, { reason: data.reason }, ctx.caller.claims.uid)
          return ctx.services.creditSpeciale.updateDemandStatus(
            ctx.id,
            { approve: 'APPROVED', reject: 'REJECTED', reopen: 'PENDING' }[
              decision
            ] as any,
            ctx.caller.claims.uid,
            data.reason,
          )
        },
      ),
    ),
    action(
      'demand.delete',
      'Supprimer la demande',
      'demand',
      'delete',
      [reasonField()],
      async (ctx) => {
        if (module === 'caisse-speciale')
          return ctx.services.caisseSpeciale.deleteDemand(ctx.id)
        if (module === 'credit-speciale')
          return ctx.services.creditSpeciale.deleteDemand(ctx.id)
        return ctx.services.ciDemandService.deleteDemand(
          ctx.id,
          ctx.caller.claims.uid,
        )
      },
      { destructive: true },
    ),
    action(
      'demand.convert',
      'Créer le contrat',
      'demand',
      'validate',
      module === 'credit-speciale'
        ? [
            ...simulationFields,
            contactField,
            field(
              'guarantorRemunerationPercentage',
              'Commission du garant (%)',
              'number',
              z.number().min(0).max(100).optional(),
            ),
            selectField(
              'disbursementPaymentMode',
              'Moyen de décaissement',
              [
                { value: 'cash', label: 'Espèces' },
                { value: 'bank_transfer', label: 'Virement bancaire' },
                { value: 'airtel_money', label: 'Airtel Money' },
                { value: 'mobicash', label: 'Mobicash' },
              ],
              true,
            ),
            dateField('disbursementDate', 'Date de décaissement'),
            textField('disbursementLocation', 'Lieu de décaissement', false),
          ]
        : [],
      async (ctx, data) => {
        if (module === 'caisse-speciale')
          return ctx.services.caisseSpeciale.convertDemandToContract(
            ctx.id,
            ctx.caller.claims.uid,
          )
        if (module === 'caisse-imprevue')
          return ctx.services.ciDemandService.createContractFromDemand(
            ctx.id,
            ctx.caller.claims.uid,
          )
        return ctx.services.creditSpeciale.createContractFromDemand(
          ctx.id,
          ctx.caller.claims.uid,
          {
            ...data,
            firstPaymentDate: asDate(data.firstPaymentDate),
            disbursementDate: asDate(data.disbursementDate),
          },
        )
      },
    ),
  ]
  return actions
}
