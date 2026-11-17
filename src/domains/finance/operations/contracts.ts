import { addDays } from 'date-fns'
import {
  actorName,
  asDate,
  dateField,
  defineAction,
  fileField,
  idField,
  moneyField,
  paymentFields,
  reasonField,
  requiredFile,
  textField,
  type FinanceAction,
  type FinanceModule,
} from '../actions'
import { caisseTypes, contactField, simulationFields } from './demands'
import { numberField, selectField } from '../actions'
import { EARLY_REFUND_PAYOUT_DAYS } from '@/utils/refund-payout'

export function contractActions(module: FinanceModule): FinanceAction[] {
  const action = (
    id: string,
    label: string,
    permission: string,
    fields: Parameters<typeof defineAction>[5],
    run: FinanceAction['run'],
    extra = {},
  ) =>
    defineAction(module, id, label, 'contract', permission, fields, run, extra)
  const workspace =
    module === 'credit-speciale'
      ? []
      : [
          defineAction(
            module,
            'contract.create',
            'Nouveau contrat',
            'workspace',
            'create',
            module === 'caisse-speciale'
              ? [
                  idField('memberId', 'Membre', 'members', false),
                  idField('groupeId', 'Groupe', 'groups', false),
                  selectField('caisseType', 'Type de caisse', caisseTypes),
                  moneyField('monthlyAmount', 'Mensualité (FCFA)'),
                  numberField('monthsPlanned', 'Durée (mois)', 1, 60),
                  dateField('firstPaymentDate', 'Première échéance'),
                  contactField,
                ]
              : [
                  idField('memberId', 'Membre', 'members'),
                  idField('subscriptionCIID', 'Forfait', 'subscriptions'),
                  selectField('paymentFrequency', 'Fréquence', [
                    { value: 'MONTHLY', label: 'Mensuelle' },
                    { value: 'DAILY', label: 'Journalière' },
                  ]),
                  dateField('firstPaymentDate', 'Première échéance'),
                  { ...contactField, required: true },
                ],
            async (ctx, d) => {
              if (module === 'caisse-speciale') {
                if (!!d.memberId === !!d.groupeId)
                  throw new Error(
                    'Sélectionnez soit un membre, soit un groupe.',
                  )
                return ctx.services.cs.subscribe({
                  ...d,
                  createdBy: ctx.caller.claims.uid,
                })
              }
              const member = await ctx.services.members.getMemberById(
                  d.memberId,
                ),
                sub = await ctx.services.ciSubscriptions.getSubscriptionById(
                  d.subscriptionCIID,
                )
              if (
                !member ||
                !sub ||
                sub.status !== 'ACTIVE' ||
                !d.emergencyContact
              )
                throw new Error(
                  'Le membre, un forfait actif et le contact d’urgence sont requis.',
                )
              return ctx.services.caisseImprevue.createContractCI({
                ...d,
                id: crypto.randomUUID(),
                memberFirstName: member.firstName,
                memberLastName: member.lastName,
                memberContacts: member.contacts || [],
                memberEmail: member.email,
                subscriptionCICode: sub.code,
                subscriptionCILabel: sub.label,
                subscriptionCIAmountPerMonth: sub.amountPerMonth,
                subscriptionCINominal: sub.nominal,
                subscriptionCIDuration: sub.durationInMonths,
                subscriptionCISupportMin: sub.supportMin,
                subscriptionCISupportMax: sub.supportMax,
                status: 'ACTIVE',
                totalMonthsPaid: 0,
                isEligibleForSupport: false,
                supportHistory: [],
                createdBy: ctx.caller.claims.uid,
                updatedBy: ctx.caller.claims.uid,
              })
            },
          ),
        ]
  const docs = [
    action(
      'document.upload',
      'Ajouter le contrat signé',
      'create',
      [fileField('document', 'Contrat signé (PDF)')],
      async (ctx) => {
        const file = requiredFile(ctx, 'document')
        if (file.type !== 'application/pdf')
          throw new Error('Le contrat signé doit être un PDF.')
        if (module === 'caisse-speciale')
          return ctx.services.csContractService.uploadContractPdf({
            contractId: ctx.id,
            file,
            originalFileName: file.name,
            fileSize: file.size,
            uploadedBy: ctx.caller.claims.uid,
          })
        if (module === 'caisse-imprevue')
          return ctx.services.caisseImprevue.uploadContractDocument(
            file,
            ctx.id,
            (await ctx.services.ciContracts.getContractById(ctx.id))!.memberId,
            ctx.caller.claims.uid,
          )
        return ctx.services.creditSpeciale.uploadSignedContract(
          ctx.id,
          file,
          ctx.caller.claims.uid,
        )
      },
    ),
    action(
      'document.replace',
      'Remplacer le contrat signé',
      'create',
      [reasonField(), fileField('document', 'Nouveau contrat signé (PDF)')],
      async (ctx) => {
        const file = requiredFile(ctx, 'document')
        if (file.type !== 'application/pdf')
          throw new Error('Le contrat signé doit être un PDF.')
        if (module === 'caisse-speciale')
          return ctx.services.csContractService.replaceContractPdf(
            ctx.id,
            file,
            ctx.caller.claims.uid,
          )
        if (module === 'caisse-imprevue')
          return ctx.services.ciDemandService.replaceContractDocument(
            ctx.id,
            file,
            ctx.caller.claims.uid,
          )
        return ctx.services.creditSpeciale.replaceSignedContract(
          ctx.id,
          file,
          ctx.caller.claims.uid,
        )
      },
    ),
    action(
      'contract.delete',
      'Supprimer le contrat',
      'delete',
      [reasonField()],
      async (ctx) => {
        if (module === 'caisse-speciale')
          return ctx.services.csContractService.deleteCaisseContract(
            ctx.id,
            ctx.caller.claims.uid,
          )
        if (module === 'caisse-imprevue')
          return ctx.services.ciDemandService.deleteContractCI(
            ctx.id,
            ctx.caller.claims.uid,
          )
        return ctx.services.creditSpeciale.deleteContract(
          ctx.id,
          ctx.caller.claims.uid,
        )
      },
      { destructive: true, superAdminOnly: true },
    ),
  ]
  if (module === 'credit-speciale')
    return [
      ...workspace,
      ...docs,
      action(
        'contract.rest',
        'Mois de repos',
        'payment',
        [numberField('month', 'Mois', 1, 1200), reasonField()],
        async (ctx, d) =>
          ctx.services.creditSpeciale.recordRestMonth(
            ctx.id,
            d.month,
            d.reason,
            ctx.caller.claims.uid,
            actorName(ctx.caller),
          ),
      ),
      action(
        'contract.extend',
        'Augmenter le crédit',
        'validate',
        [
          moneyField('additionalAmount', 'Montant supplémentaire (FCFA)'),
          reasonField('cause', 'Motif du rajout'),
          ...simulationFields.filter(
            (f) =>
              !['amount', 'customSchedule', 'durationUnit'].includes(f.key),
          ),
          contactField,
          dateField('desiredDate', 'Date souhaitée'),
        ],
        async (ctx, d) => {
          const {
            additionalAmount,
            cause,
            emergencyContact,
            desiredDate,
            ...simulation
          } = d
          return ctx.services.creditSpeciale.extendContract(
            ctx.id,
            additionalAmount,
            cause,
            {
              ...simulation,
              firstPaymentDate: asDate(simulation.firstPaymentDate),
            },
            ctx.caller.claims.uid,
            emergencyContact,
            desiredDate,
          )
        },
      ),
      action(
        'contract.fixed',
        'Passer en phase fixe',
        'validate',
        [reasonField()],
        async (ctx, d) =>
          ctx.services.creditSpeciale.switchToFixedPhase(
            ctx.id,
            d.reason,
            ctx.caller.claims.uid,
          ),
      ),
      action(
        'contract.discharge',
        'Valider la décharge',
        'validate',
        [reasonField()],
        async (ctx, d) =>
          ctx.services.creditSpeciale.validateDischarge(
            ctx.id,
            d.reason,
            ctx.caller.claims.uid,
          ),
      ),
      action(
        'contract.quittance',
        'Ajouter la quittance signée',
        'validate',
        [
          fileField('document', 'Quittance signée (PDF)'),
          dateField('repaidAtDate', 'Date de remise'),
          selectField('paymentMode', 'Moyen de remise', [
            { value: 'cash', label: 'Espèces' },
            { value: 'bank_transfer', label: 'Virement bancaire' },
            { value: 'airtel_money', label: 'Airtel Money' },
            { value: 'mobicash', label: 'Mobicash' },
          ]),
          textField('repaidAtTime', 'Heure de remise'),
          textField('comment', 'Commentaire', false),
        ],
        async (ctx, d) =>
          ctx.services.creditSpeciale.uploadSignedQuittance(
            ctx.id,
            requiredFile(ctx, 'document'),
            ctx.caller.claims.uid,
            d as any,
          ),
      ),
      action(
        'contract.quittance.replace',
        'Remplacer la quittance signée',
        'validate',
        [
          fileField('document', 'Nouvelle quittance signée (PDF)'),
          dateField('repaidAtDate', 'Date de remise'),
          textField('repaidAtTime', 'Heure de remise'),
          selectField('paymentMode', 'Moyen de remise', [
            { value: 'cash', label: 'Espèces' },
            { value: 'bank_transfer', label: 'Virement bancaire' },
            { value: 'airtel_money', label: 'Airtel Money' },
            { value: 'mobicash', label: 'Mobicash' },
            { value: 'other', label: 'Autre' },
          ]),
          textField('methodOther', 'Précisez le moyen', false),
          textField('comment', 'Commentaire', false),
          reasonField('modificationReason', 'Motif du remplacement'),
        ],
        async (ctx, d) =>
          ctx.services.creditSpeciale.replaceSignedQuittance(
            ctx.id,
            requiredFile(ctx, 'document'),
            ctx.caller.claims.uid,
            actorName(ctx.caller),
            d as any,
            d.modificationReason,
          ),
      ),
      action(
        'contract.close',
        'Clôturer le crédit',
        'validate',
        [
          dateField('closedAt', 'Date de clôture'),
          reasonField('motifCloture', 'Motif de clôture'),
        ],
        async (ctx, d) =>
          ctx.services.creditSpeciale.closeContract(ctx.id, {
            ...d,
            closedAt: asDate(d.closedAt),
            closedBy: ctx.caller.claims.uid,
          }),
      ),
      action(
        'contract.writeoff',
        'Clôturer en perte',
        'validate',
        [
          reasonField('motif', 'Motif'),
          moneyField(
            'guarantorCommissionDue',
            'Commission restant due au garant (FCFA)',
            false,
          ),
        ],
        async (ctx, d) =>
          ctx.services.creditSpeciale.writeOffContract(ctx.id, {
            ...d,
            guarantorCommissionDue: d.guarantorCommissionDue || 0,
            adminId: ctx.caller.claims.uid,
            adminName: actorName(ctx.caller),
          }),
        { superAdminOnly: true, destructive: true },
      ),
      ...(['recovery', 'missed-earnings'] as const).map((kind) =>
        action(
          `contract.${kind}`,
          kind === 'recovery'
            ? 'Enregistrer un recouvrement après perte'
            : 'Encaisser le manque à gagner',
          'payment',
          [
            ...paymentFields(true),
            textField('comment', 'Commentaire', false),
            fileField('proof', 'Preuve', false),
          ],
          async (ctx, d) => {
            const input = {
              ...d,
              date: asDate(d.date),
              paymentTime: d.time,
              proofFile: ctx.files.proof,
              adminId: ctx.caller.claims.uid,
              adminName: actorName(ctx.caller),
            }
            return kind === 'recovery'
              ? ctx.services.creditSpeciale.recordWriteOffRecovery(
                  ctx.id,
                  input,
                )
              : ctx.services.creditSpeciale.recordMissedEarningsPayment(
                  ctx.id,
                  input,
                )
          },
        ),
      ),
      action(
        'shop.pay',
        'Régler le vendeur',
        'payment',
        [
          dateField('paidAt', 'Date du règlement'),
          selectField('mode', 'Moyen', [
            { value: 'cash', label: 'Espèces' },
            { value: 'bank_transfer', label: 'Virement' },
            { value: 'airtel_money', label: 'Airtel Money' },
            { value: 'mobicash', label: 'Mobicash' },
          ]),
          textField('reference', 'Référence', false),
          fileField('proof', 'Preuve', false),
        ],
        async (ctx, d) =>
          ctx.services.creditSpeciale.recordShopVendorPayment(ctx.id, {
            ...d,
            paidAt: asDate(d.paidAt),
            proofFile: ctx.files.proof,
            adminId: ctx.caller.claims.uid,
            adminName: actorName(ctx.caller),
          }),
      ),
      action(
        'shop.deliver',
        'Confirmer la livraison',
        'payment',
        [
          dateField('deliveredAt', 'Date de livraison'),
          textField('comment', 'Commentaire', false),
        ],
        async (ctx, d) =>
          ctx.services.creditSpeciale.confirmShopPurchaseDelivery(ctx.id, {
            ...d,
            deliveredAt: asDate(d.deliveredAt),
            adminId: ctx.caller.claims.uid,
            adminName: actorName(ctx.caller),
          }),
      ),
    ]
  return [
    ...workspace,
    ...docs,
    action(
      'member-document.approve',
      'Valider le contrat soumis par le membre',
      'validate',
      [fileField('document', 'Contrat validé')],
      async (ctx) =>
        module === 'caisse-speciale'
          ? ctx.services.csContractService.validateMemberSignedCSContract(
              ctx.id,
              ctx.caller.claims.uid,
              requiredFile(ctx, 'document'),
            )
          : ctx.services.ciDemandService.validateMemberSignedContract(
              ctx.id,
              ctx.caller.claims.uid,
              requiredFile(ctx, 'document'),
            ),
    ),
    action(
      'member-document.reject',
      'Refuser le contrat soumis par le membre',
      'validate',
      [reasonField()],
      async (ctx) =>
        module === 'caisse-speciale'
          ? ctx.services.csContractService.rejectMemberSignedCSContract(
              ctx.id,
              ctx.caller.claims.uid,
            )
          : ctx.services.ciDemandService.rejectMemberSignedContract(
              ctx.id,
              ctx.caller.claims.uid,
            ),
    ),
    ...(module === 'caisse-speciale'
      ? [
          action(
            'payment.delete',
            'Supprimer un versement erroné',
            'payment',
            [
              idField('paymentId', 'Échéance', 'payments'),
              idField(
                'contributionId',
                'Contribution (si applicable)',
                'contributions',
                false,
              ),
              reasonField(),
            ],
            async (ctx, d) =>
              ctx.services.csContractService.deleteContractPayment(
                ctx.id,
                d.paymentId,
                ctx.caller.claims.uid,
                d.contributionId,
              ),
            { destructive: true },
          ),
        ]
      : [
          action(
            'subscription.change',
            'Changer le forfait du contrat',
            'create',
            [
              idField('subscriptionId', 'Nouveau forfait', 'subscriptions'),
              reasonField(),
            ],
            async (ctx, d) =>
              ctx.services.ciDemandService.updateContractSubscription(
                ctx.id,
                d.subscriptionId,
                ctx.caller.claims.uid,
              ),
          ),
          action(
            'support.request',
            'Accorder une aide',
            'payment',
            [moneyField(), fileField('document', 'Demande d’aide signée')],
            async (ctx, d) =>
              ctx.services.caisseImprevue.requestSupport(
                ctx.id,
                d.amount,
                ctx.caller.claims.uid,
                requiredFile(ctx, 'document'),
              ),
          ),
          action(
            'support.approve',
            'Valider une demande d’aide du membre',
            'validate',
            [
              idField('supportId', 'Demande d’aide', 'supports'),
              fileField('document', 'Document validé'),
            ],
            async (ctx, d) =>
              ctx.services.caisseImprevue.validateMemberSupport(
                ctx.id,
                d.supportId,
                ctx.caller.claims.uid,
                requiredFile(ctx, 'document'),
              ),
          ),
          action(
            'support.reject',
            'Refuser une demande d’aide',
            'validate',
            [idField('supportId', 'Demande d’aide', 'supports'), reasonField()],
            async (ctx, d) =>
              ctx.services.caisseImprevue.rejectMemberSupport(
                ctx.id,
                d.supportId,
                ctx.caller.claims.uid,
                d.reason,
              ),
          ),
        ]),
    action(
      'refund.early',
      'Demander un retrait anticipé',
      'payment',
      [
        reasonField(),
        ...paymentFields().map((f) => ({
          ...f,
          key:
            {
              date: 'withdrawalDate',
              time: 'withdrawalTime',
              amount: 'withdrawalAmount',
              mode: 'withdrawalMode',
            }[f.key] || f.key,
        })),
        fileField('proof', 'Preuve de retrait'),
        fileField('document', 'Document de retrait signé'),
      ],
      async (ctx, d) => {
        const input = {
          ...d,
          withdrawalProof: requiredFile(ctx, 'proof'),
          documentPdf: requiredFile(ctx, 'document'),
          createdBy: ctx.caller.claims.uid,
          userId: ctx.caller.claims.uid,
        }
        return module === 'caisse-speciale'
          ? ctx.services.cs.requestEarlyRefund(ctx.id, input)
          : ctx.services.caisseImprevue.requestEarlyRefundCI(ctx.id, input)
      },
    ),
    action(
      'refund.final',
      'Demander le remboursement final',
      'payment',
      module === 'caisse-speciale'
        ? [reasonField()]
        : [
            reasonField(),
            dateField('withdrawalDate', 'Date de remise'),
            textField('withdrawalTime', 'Heure de remise'),
            selectField('withdrawalMode', 'Moyen de remise', [
              { value: 'cash', label: 'Espèces' },
              { value: 'bank_transfer', label: 'Virement' },
              { value: 'airtel_money', label: 'Airtel Money' },
              { value: 'mobicash', label: 'Mobicash' },
            ]),
            fileField('proof', 'Preuve'),
            fileField('document', 'Document signé'),
          ],
      async (ctx, d) =>
        module === 'caisse-speciale'
          ? ctx.services.cs.requestFinalRefund(ctx.id, d.reason)
          : ctx.services.caisseImprevue.requestFinalRefundCI(ctx.id, {
              ...d,
              withdrawalProof: requiredFile(ctx, 'proof'),
              documentPdf: requiredFile(ctx, 'document'),
              userId: ctx.caller.claims.uid,
            }),
    ),
    action(
      'refund.approve',
      'Approuver un remboursement',
      'validate',
      [
        idField('refundId', 'Remboursement', 'refunds'),
        ...(module === 'caisse-imprevue'
          ? [fileField('document', 'Document signé par l’administration')]
          : []),
      ],
      async (ctx, d) => {
        const refunds =
          module === 'caisse-speciale'
            ? await ctx.services.csRefunds.listRefunds(ctx.id)
            : await ctx.services.csRefunds.listRefundsCI(ctx.id)
        const refund = refunds.find((r: any) => r.id === d.refundId)
        if (!refund || refund.status !== 'PENDING')
          throw new Error(
            'Seul un remboursement en attente peut être approuvé.',
          )
        if (module === 'caisse-speciale')
          return ctx.services.cs.approveRefund(ctx.id, d.refundId)
        const document = await ctx.services.documents.uploadDocumentFile(
          requiredFile(ctx, 'document'),
          ctx.id,
          'REFUND_CI_ADMIN',
        )
        const approvedAt = new Date()
        return ctx.services.csRefunds.updateRefundCI(ctx.id, d.refundId, {
          status: 'APPROVED',
          approvedAt,
          approvedBy: ctx.caller.claims.uid,
          approvedByName: actorName(ctx.caller),
          ...(refund.type === 'EARLY'
            ? { payoutDueAt: addDays(approvedAt, EARLY_REFUND_PAYOUT_DAYS) }
            : {}),
          adminDocumentUrl: document.url,
        })
      },
    ),
    action(
      'refund.pay',
      'Confirmer la remise du remboursement',
      'payment',
      [
        idField('refundId', 'Remboursement', 'refunds'),
        dateField('handoverDate', 'Date de remise'),
        textField('handoverTime', 'Heure de remise'),
        selectField('paymentMode', 'Moyen de remise', [
          { value: 'cash', label: 'Espèces' },
          { value: 'bank_transfer', label: 'Virement' },
          { value: 'airtel_money', label: 'Airtel Money' },
          { value: 'mobicash', label: 'Mobicash' },
          { value: 'other', label: 'Autre' },
        ]),
        textField('paymentMethodOther', 'Autre moyen', false),
        fileField('proof', 'Preuve de remise'),
      ],
      async (ctx, d) => {
        const proof = await ctx.services.documents.uploadDocumentFile(
          requiredFile(ctx, 'proof'),
          ctx.id,
          'REFUND_HANDOVER',
        )
        return ctx.services.handover({
          ...d,
          fund: module === 'caisse-speciale' ? 'CS' : 'CI',
          contractId: ctx.id,
          adminId: ctx.caller.claims.uid,
          proofUrl: proof.url,
          proofPath: proof.path,
        })
      },
    ),
    action(
      'refund.cancel',
      'Annuler ou refuser un remboursement',
      'validate',
      [idField('refundId', 'Remboursement', 'refunds'), reasonField()],
      async (ctx, d) => {
        const refunds =
          module === 'caisse-speciale'
            ? await ctx.services.csRefunds.listRefunds(ctx.id)
            : await ctx.services.csRefunds.listRefundsCI(ctx.id)
        const refund = refunds.find((r: any) => r.id === d.refundId)
        if (!refund || !['PENDING', 'APPROVED'].includes(refund.status))
          throw new Error('Cette demande ne peut plus être annulée.')
        if (module === 'caisse-speciale')
          return refund.type === 'FINAL'
            ? ctx.services.cs.cancelFinalRefund(ctx.id, d.refundId, d.reason)
            : ctx.services.cs.cancelEarlyRefund(ctx.id, d.refundId)
        return ctx.services.csRefunds.updateRefundCI(ctx.id, d.refundId, {
          status: 'REJECTED',
          rejectedBy: ctx.caller.claims.uid,
          rejectedByName: actorName(ctx.caller),
          rejectionReason: d.reason,
        })
      },
    ),
    ...(['approve', 'reject'] as const).map((decision) =>
      action(
        `declaration.${decision}`,
        decision === 'approve'
          ? 'Valider un versement déclaré'
          : 'Refuser un versement déclaré',
        'validate',
        [
          idField('declarationId', 'Déclaration', 'declarations'),
          ...(decision === 'reject' ? [reasonField()] : []),
        ],
        async (ctx, d) => {
          const rows =
            module === 'caisse-speciale'
              ? await ctx.services.csRefunds.listDeclaredVersementsCS(ctx.id)
              : await ctx.services.csRefunds.listDeclaredVersementsCI(ctx.id)
          const row = rows.find((item: any) => item.id === d.declarationId)
          if (!row || row.status !== 'PENDING')
            throw new Error('Cette déclaration a déjà été traitée.')
          const update =
            decision === 'approve'
              ? {
                  status: 'VALIDATED',
                  validatedBy: ctx.caller.claims.uid,
                  validatedByName: actorName(ctx.caller),
                  validatedAt: new Date(),
                }
              : {
                  status: 'REJECTED',
                  rejectedBy: ctx.caller.claims.uid,
                  rejectedByName: actorName(ctx.caller),
                  rejectedAt: new Date(),
                  rejectionReason: d.reason,
                }
          const save =
            module === 'caisse-speciale'
              ? ctx.services.csRefunds.updateDeclaredVersementCS
              : ctx.services.csRefunds.updateDeclaredVersementCI
          await save(ctx.id, d.declarationId, update)
          if (row.memberId)
            await ctx.services.notifications.notifyMember({
              recipientId: row.memberId,
              module:
                module === 'caisse-speciale'
                  ? 'caisse_speciale'
                  : 'caisse_imprevue',
              entityId: ctx.id,
              type: 'status_update',
              title:
                decision === 'approve'
                  ? 'Versement validé'
                  : 'Versement refusé',
              message:
                decision === 'approve'
                  ? 'Votre versement déclaré a été validé.'
                  : d.reason,
            })
          return true
        },
      ),
    ),
  ]
}
