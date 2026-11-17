import { z } from 'zod'
import {
  actorName,
  asDate,
  defineAction,
  field,
  fileField,
  idField,
  numberField,
  paymentFields,
  reasonField,
  requiredFile,
  textField,
  type FinanceAction,
  type FinanceModule,
} from '../actions'

export function paymentActions(module: FinanceModule): FinanceAction[] {
  const action = (
    id: string,
    label: string,
    fields: Parameters<typeof defineAction>[5],
    run: FinanceAction['run'],
    extra = {},
  ) =>
    defineAction(module, id, label, 'contract', 'payment', fields, run, extra)
  if (module === 'caisse-speciale')
    return [
      action(
        'payment.create',
        'Ajouter un versement',
        [
          numberField('month', 'Échéance (mois)', 1, 1200),
          ...paymentFields(),
          fileField(
            'proof',
            'Preuve de paiement',
            true,
            'Image JPEG, PNG ou WebP — 8 Mo maximum',
          ),
        ],
        async (ctx, data) => {
          const contract = await ctx.services.csContracts.getContract(ctx.id)
          if (!contract) throw new Error('Contrat introuvable')
          if (contract.contractType === 'GROUP')
            throw new Error('Utilisez le versement de groupe pour ce contrat.')
          const { month, date, proof: _proof, ...payment } = data
          void _proof // Retire le marqueur de fichier des données métier.
          return ctx.services.cs.pay({
            ...payment,
            contractId: ctx.id,
            memberId: contract.memberId,
            dueMonthIndex: month - 1,
            paidAt: asDate(date),
            file: requiredFile(ctx, 'proof'),
          })
        },
      ),
      action(
        'payment.group',
        'Ajouter une contribution de groupe',
        [
          numberField('month', 'Échéance (mois)', 1, 1200),
          idField('memberId', 'Membre du groupe', 'groupMembers'),
          ...paymentFields(),
          fileField('proof', 'Preuve de paiement'),
        ],
        async (ctx, data) => {
          const { month, date, proof: _proof, ...payment } = data
          void _proof // Retire le marqueur de fichier des données métier.
          const member = await ctx.services.members.getMemberById(
            payment.memberId,
          )
          if (!member) throw new Error('Membre introuvable')
          return ctx.services.cs.payGroup({
            ...payment,
            memberName:
              `${member.firstName || ''} ${member.lastName || ''}`.trim(),
            memberMatricule: member.matricule || member.id || payment.memberId,
            memberContacts: member.contacts,
            contractId: ctx.id,
            dueMonthIndex: month - 1,
            paidAt: asDate(date),
            file: requiredFile(ctx, 'proof'),
          })
        },
      ),
      action(
        'payment.update',
        'Corriger une contribution',
        [
          idField('paymentId', 'Échéance', 'payments'),
          idField('contributionId', 'Contribution', 'contributions'),
          ...paymentFields(),
          reasonField('modificationReason', 'Motif de correction'),
          fileField('proof', 'Nouvelle preuve', false),
        ],
        async (ctx, data) => {
          const { date, proof: _proof, ...payment } = data
          void _proof // Retire le marqueur de fichier des données métier.
          const { paymentId, contributionId, ...updates } = payment
          return ctx.services.cs.updatePaymentContribution({
            contractId: ctx.id,
            paymentId,
            contributionId,
            updates: {
              ...updates,
              paidAt: asDate(date),
              proofFile: ctx.files.proof,
            },
          })
        },
      ),
    ]
  if (module === 'caisse-imprevue')
    return [
      action(
        'payment.create',
        'Ajouter un versement',
        [
          numberField('month', 'Échéance de départ (mois)', 1, 1200),
          ...paymentFields(),
          fileField('proof', 'Preuve de paiement'),
        ],
        async (ctx, data) => {
          const { month, proof: _proof, ...payment } = data
          void _proof // Retire le marqueur de fichier des données métier.
          return ctx.services.caisseImprevue.createVersement(
            ctx.id,
            month - 1,
            payment as any,
            requiredFile(ctx, 'proof'),
            ctx.caller.claims.uid,
          )
        },
      ),
      action(
        'payment.update',
        'Corriger un versement',
        [
          numberField('month', 'Échéance (mois)', 1, 1200),
          idField('versementId', 'Versement', 'versements'),
          ...paymentFields(),
          reasonField('modificationReason', 'Motif de correction'),
          fileField('proof', 'Nouvelle preuve', false),
        ],
        async (ctx, data) => {
          const {
            month,
            versementId,
            proof: _proof,
            modificationReason,
            ...payment
          } = data
          void _proof // Retire le marqueur de fichier des données métier.
          return ctx.services.caisseImprevue.updateVersement(
            ctx.id,
            month - 1,
            versementId,
            payment as any,
            ctx.files.proof,
            modificationReason,
            ctx.caller.claims.uid,
          )
        },
      ),
      action(
        'payment.delete',
        'Supprimer un versement erroné',
        [
          numberField('month', 'Échéance (mois)', 1, 1200),
          idField('versementId', 'Versement', 'versements'),
          reasonField(),
        ],
        async (ctx, data) =>
          ctx.services.caisseImprevue.deleteVersement(
            ctx.id,
            data.month - 1,
            data.versementId,
            ctx.caller.claims.uid,
          ),
        { destructive: true },
      ),
    ]
  const creditFields = paymentFields(true).map((item) =>
    item.key === 'amount'
      ? field(
          'amount',
          item.label,
          'money',
          z.number().int().min(0).max(1_000_000_000),
          { min: 0 },
        )
      : item,
  )
  return [
    action(
      'payment.create',
      'Ajouter un paiement',
      [
        numberField('month', 'Échéance', 1, 1200),
        ...creditFields,
        textField('comment', 'Commentaire', false),
        field(
          'note',
          'Note (sur 10)',
          'number',
          z.number().min(0).max(10).optional(),
        ),
        fileField('proof', 'Preuve de paiement', false),
      ],
      async (ctx, data) => {
        const { month, date, time, proof: _proof, ...payment } = data
        void _proof // Retire le marqueur de fichier des données métier.
        if (payment.amount === 0 && !payment.comment?.trim())
          throw new Error('Précisez le motif du paiement à zéro FCFA.')
        return ctx.services.creditSpeciale.createPayment(
          {
            ...payment,
            paymentDate: asDate(date),
            paymentTime: time,
            creditId: ctx.id,
            principalAmount: 0,
            interestAmount: 0,
            penaltyAmount: 0,
            createdBy: ctx.caller.claims.uid,
          } as any,
          ctx.files.proof,
          [],
          month,
        )
      },
    ),
    action(
      'payment.update',
      'Corriger un paiement',
      [
        idField('paymentId', 'Paiement', 'payments'),
        ...creditFields,
        textField('comment', 'Commentaire', false),
        reasonField('modificationReason', 'Motif de correction'),
        fileField('proof', 'Nouvelle preuve', false),
      ],
      async (ctx, data) => {
        const {
          paymentId,
          date,
          time,
          proof: _proof,
          modificationReason,
          ...payment
        } = data
        void _proof // Retire le marqueur de fichier des données métier.
        return ctx.services.creditSpeciale.updatePayment(
          paymentId,
          { ...payment, paymentDate: asDate(date), paymentTime: time },
          ctx.files.proof,
          modificationReason,
          ctx.caller.claims.uid,
        )
      },
    ),
    action(
      'payment.delete',
      'Supprimer un paiement erroné',
      [idField('paymentId', 'Paiement', 'payments'), reasonField()],
      async (ctx, data) =>
        ctx.services.creditSpeciale.deletePayment(
          data.paymentId,
          ctx.caller.claims.uid,
        ),
      { destructive: true },
    ),
    action(
      'rest.create',
      'Enregistrer un mois de repos',
      [numberField('month', 'Mois de repos', 1, 1200), reasonField()],
      async (ctx, data) =>
        ctx.services.creditSpeciale.recordRestMonth(
          ctx.id,
          data.month,
          data.reason,
          ctx.caller.claims.uid,
          actorName(ctx.caller),
        ),
    ),
    action('penalties.refresh', 'Actualiser les pénalités', [], async (ctx) =>
      ctx.services.creditSpeciale.checkAndCreateMissingPenalties(ctx.id),
    ),
    ...(['pay', 'update'] as const).map((type) =>
      action(
        `penalty.${type}`,
        type === 'pay'
          ? 'Régler une pénalité'
          : 'Corriger le règlement d’une pénalité',
        [
          idField('penaltyId', 'Pénalité', 'penalties'),
          ...paymentFields(true),
          textField('comment', 'Commentaire', false),
          fileField('proof', 'Preuve', false),
        ],
        async (ctx, data) => {
          const { penaltyId, date, time, proof: _proof, ...payment } = data
          void _proof // Retire le marqueur de fichier des données métier.
          const input = {
            ...payment,
            paymentDate: asDate(date),
            paymentTime: time,
          }
          return type === 'pay'
            ? ctx.services.creditSpeciale.payPenalty(
                penaltyId,
                input as any,
                ctx.files.proof,
                ctx.caller.claims.uid,
              )
            : ctx.services.creditSpeciale.updatePenaltyPayment(
                penaltyId,
                input as any,
                ctx.files.proof,
                ctx.caller.claims.uid,
              )
        },
      ),
    ),
    action(
      'guarantor.pay',
      'Verser la rémunération du garant',
      [
        ...paymentFields(true),
        textField('reference', 'Référence', false),
        textField('comment', 'Commentaire', false),
        fileField('proof', 'Preuve', false),
      ],
      async (ctx, data) => {
        const { date, time, proof: _proof, ...payment } = data
        void _proof // Retire le marqueur de fichier des données métier.
        return ctx.services.creditSpeciale.recordGuarantorPayment(
          ctx.id,
          { ...payment, paymentDate: asDate(date), paymentTime: time } as any,
          ctx.files.proof,
          ctx.caller.claims.uid,
        )
      },
    ),
    action(
      'guarantor.delete',
      'Supprimer un paiement au garant',
      [
        idField(
          'guarantorPaymentId',
          'Paiement au garant',
          'guarantorPayments',
        ),
        reasonField(),
      ],
      async (ctx, data) =>
        ctx.services.creditSpeciale.deleteGuarantorPayment(
          data.guarantorPaymentId,
        ),
      { destructive: true },
    ),
  ]
}
