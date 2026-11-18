import { demandActions } from '@/domains/finance/operations/demands'
import { remainingContribution } from '@/domains/groups/contribution-model'
import { NextRequest } from 'next/server'
import { DELETE as deleteGroup } from '@/app/api/groups/[id]/deletion/route'
import { payoutAmounts } from '@/domains/groups/payout-model'
import { z } from 'zod'
import {
  textField,
  idField,
  moneyField,
  dateField,
  numberField,
  boolField,
  reasonField,
  field,
  fileField,
} from '@/domains/finance/actions'
import { rows, nested, select, textArea, type AdminModule } from '../catalog'
import { actor, type AdminAction, type AdminContext } from '../server/registry'
import { shuffleParticipants } from '@/domains/groups/payout-order'
const people = (source = 'members') =>
  rows('members', 'Membres', [idField('memberId', 'Membre', source)])
const projectFields = [
  textField('name', 'Nom du projet'),
  select('kind', 'Type de projet', ['TONTINE', 'PURCHASE', 'OTHER']),
  select('status', 'État', ['PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED']),
  textArea('description', 'Objectif et organisation', true),
  moneyField('estimatedBudget', 'Budget estimé (FCFA)', false),
  field('targetDate', 'Date cible', 'date', z.string().optional()),
  people('groupMembers'),
]
const groupFields = [
  textField('name', 'Nom du groupe'),
  textArea('description', 'Raison de se regrouper', true),
  textField('label', 'Libellé', false),
  idField('coordinatorId', 'Référent', 'members', false),
  idField('guarantorId', 'Garant', 'members'),
]
const draft = (d: any) => {
  const { members, ...rest } = d
  return {
    ...rest,
    description: d.description || '',
    participantIds: members.map((r: any) => r.memberId),
  }
}
const projectId = () => idField('projectId', 'Projet', 'projects')
const agreementId = () => idField('agreementId', 'Accord', 'agreements')
const payment = [
  moneyField(),
  dateField(),
  select('source', 'Moyen de paiement', [
    'CASH',
    'AIRTEL_MONEY',
    'MOBICASH',
    'BANK_TRANSFER',
  ]),
  textField('reference', 'Référence', false),
  textArea('note', 'Note', true),
]
export function groupActions(module: AdminModule): AdminAction[] {
  if (module.key === 'geography')
    return [
      {
        id: 'district.bulk',
        label: 'Créer des arrondissements en masse',
        scope: 'workspace',
        permission: 'geography.manage',
        fields: [
          idField('communeId', 'Commune', 'communes'),
          numberField('count', 'Nombre d’arrondissements', 1, 50),
        ],
        run: (ctx, d) =>
          ctx.services.geography.createDistrictsBulk(
            d.communeId,
            d.count,
            actor(ctx).id,
          ),
      },
    ]
  if (module.key !== 'groups') return []
  const action = (
    id: string,
    label: string,
    fields: AdminAction['fields'],
    run: AdminAction['run'],
    extra: Partial<AdminAction> = {},
  ): AdminAction => ({
    id,
    label,
    scope: 'contract',
    permission: 'groups.manage',
    fields,
    run,
    ...extra,
  })
  const upload = async (ctx: AdminContext, key: string) => {
    const file = ctx.files[key]
    if (!file) return undefined
    return ctx.services.documents.uploadDocumentFile(
      file,
      ctx.id,
      'GROUP_AGREEMENT_PROOF',
    )
  }
  return [
    action(
      'group.create',
      'Créer un groupe',
      [
        ...groupFields,
        people(),
        nested(
          'project',
          'Premier projet',
          projectFields.map((f) =>
            f.key === 'members' ? people('members') : f,
          ),
          true,
        ),
      ],
      (ctx, d) =>
        ctx.services.groups.createCollectiveGroup(
          {
            ...d,
            description: d.description || '',
            memberIds: d.members.map((r: any) => r.memberId),
            project: d.project ? draft(d.project) : undefined,
          },
          actor(ctx),
        ),
      { scope: 'workspace' },
    ),
    action(
      'group.delete',
      'Supprimer définitivement le groupe',
      [textField('confirmationId', 'Recopiez l’identifiant du groupe')],
      async (ctx, d) => {
        const result = await deleteGroup(
          new NextRequest('http://localhost/api/groups/native/deletion', {
            method: 'DELETE',
            headers: {
              authorization: `Bearer ${ctx.token}`,
              'content-type': 'application/json',
            },
            body: JSON.stringify(d),
          }),
          { params: Promise.resolve({ id: ctx.id }) },
        )
        const data = await result.json()
        if (!result.ok) throw Error(data.error || 'Suppression impossible.')
        return data
      },
      { superAdminOnly: true, destructive: true },
    ),
    action('group.update', 'Modifier le groupe', groupFields, (ctx, d) =>
      ctx.services.groups.updateCollectiveGroup(
        ctx.id,
        { ...d, description: d.description || '' },
        actor(ctx),
      ),
    ),
    action('group.add', 'Ajouter des membres', [people()], (ctx, d) =>
      ctx.services.groups.addGroupMembers(
        ctx.id,
        d.members.map((r: any) => r.memberId),
        actor(ctx),
      ),
    ),
    action(
      'group.remove',
      'Retirer un membre',
      [idField('memberId', 'Membre du groupe', 'groupMembers'), reasonField()],
      (ctx, d) =>
        ctx.services.groups.removeGroupMember(ctx.id, d.memberId, actor(ctx)),
    ),
    action('project.create', 'Nouveau projet', projectFields, (ctx, d) =>
      ctx.services.groups.saveGroupProject(ctx.id, draft(d), actor(ctx)),
    ),
    action(
      'project.update',
      'Modifier le projet',
      [projectId(), ...projectFields],
      (ctx, d) =>
        ctx.services.groups.saveGroupProject(
          ctx.id,
          draft(d),
          actor(ctx),
          d.projectId,
        ),
    ),
    action(
      'project.draw',
      'Effectuer un tirage',
      [projectId()],
      async (ctx, d) => {
        const p = ctx.row.projects?.find((p: any) => p.id === d.projectId)
        if (!p) throw Error('Projet introuvable.')
        const order = shuffleParticipants(p.participantIds)
        await ctx.services.groups.saveGroupPayoutOrder(
          ctx.id,
          d.projectId,
          order,
          p.payoutOrderDrawId || null,
          actor(ctx),
        )
        return { order: order.map((id) => p.participantNames?.[id] || id) }
      },
    ),
    action(
      'contribution.configure',
      'Configurer le cycle',
      [
        projectId(),
        moneyField(),
        select('frequency', 'Fréquence', ['MONTHLY', 'WEEKLY', 'DAILY']),
        textField('startMonth', 'Premier mois (AAAA-MM)', false),
        dateField('startDate', 'Date de début'),
        numberField('periodCount', 'Nombre de périodes', 1, 1200),
        numberField('dueDay', 'Jour d’échéance du mois', 1, 31),
      ],
      (ctx, d) =>
        ctx.services.contributions.configureContributions(
          ctx.id,
          d.projectId,
          d.frequency === 'MONTHLY'
            ? {
                amount: d.amount,
                frequency: 'MONTHLY',
                startMonth: d.startMonth || d.startDate.slice(0, 7),
                months: d.periodCount,
                dueDay: d.dueDay,
              }
            : {
                amount: d.amount,
                frequency: d.frequency,
                startDate: d.startDate,
                periodCount: d.periodCount,
              },
          actor(ctx),
        ),
    ),
    action(
      'contribution.pay',
      'Enregistrer un versement',
      [
        projectId(),
        textField('period', 'Période de cotisation (AAAA-MM ou AAAA-MM-JJ)'),
        idField('memberId', 'Participant', 'groupMembers'),
        ...payment,
      ],
      (ctx, d) =>
        ctx.services.contributions.recordContributionPayment(
          ctx.id,
          d.projectId,
          d.period,
          d.memberId,
          {
            id: ctx.operationId,
            amount: d.amount,
            date: d.date,
            source: d.source,
            reference: d.reference,
            note: d.note,
          },
          actor(ctx),
        ),
    ),
    action(
      'payout.fee',
      'Configurer la redevance',
      [
        projectId(),
        boolField('enabled', 'Retenir une redevance Kara'),
        moneyField('amount', 'Redevance par remise (FCFA)', false),
      ],
      (ctx, d) =>
        ctx.services.payouts.configurePayoutFee(
          ctx.id,
          d.projectId,
          { enabled: !!d.enabled, amount: d.amount || 0 },
          actor(ctx),
        ),
    ),
    action(
      'payout.record',
      'Enregistrer une remise',
      [
        projectId(),
        textField('period', 'Période de remise (AAAA-MM ou AAAA-MM-JJ)'),
        idField('beneficiaryId', 'Bénéficiaire prévu', 'groupMembers'),
        dateField(),
        select('source', 'Moyen de remise', [
          'CASH',
          'AIRTEL_MONEY',
          'MOBICASH',
          'BANK_TRANSFER',
        ]),
        textField('reference', 'Référence', false),
        textArea('note', 'Note', true),
      ],
      (ctx, d) => {
        const project = ctx.row.projects?.find((p: any) => p.id === d.projectId)
        const amounts = payoutAmounts(
          project?.contributionPlan?.amount *
            project?.contributionPlan?.participants?.length,
          project?.payoutFee,
        )
        return ctx.services.payouts.recordGroupPayout(
          ctx.id,
          d.projectId,
          d.period,
          {
            date: d.date,
            source: d.source,
            reference: d.reference || '',
            note: d.note || '',
            operationId: ctx.operationId,
            beneficiaryId: d.beneficiaryId,
            expectedGross: amounts.grossAmount,
            expectedFee: amounts.feeAmount,
          },
          actor(ctx),
        )
      },
    ),
    ...(['FIXE', 'SPECIALE'] as const).map((type) =>
      action(
        `project.credit.${type.toLowerCase()}`,
        type === 'FIXE'
          ? 'Nouvelle demande individuelle de crédit fixe'
          : 'Nouvelle demande individuelle de crédit spécial',
        [
          projectId(),
          idField('clientId', 'Participant', 'groupMembers'),
          moneyField(),
          moneyField('monthlyPaymentAmount', 'Mensualité souhaitée (FCFA)'),
          dateField('desiredDate', 'Date souhaitée'),
          reasonField('cause', 'Motif'),
          idField('guarantorId', 'Garant', 'members', false),
        ],
        async (ctx, d) => {
          const project = ctx.row.projects?.find(
            (p: any) => p.id === d.projectId,
          )
          if (!project) throw Error('Projet introuvable.')
          const module = type === 'FIXE' ? 'credit-fixe' : 'credit-speciale'
          const create = demandActions(module).find(
            (a) => a.id === 'demand.create',
          )!
          const { projectId, ...data } = d
          return create.run(ctx, {
            ...data,
            groupProject: {
              groupId: ctx.id,
              projectId,
              projectName: project.name,
            },
          })
        },
        {
          requiredPermissions: [
            type === 'FIXE' ? 'creditFixe.create' : 'creditSpeciale.create',
          ],
        },
      ),
    ),
    action(
      'contribution.credit.request',
      'Financer une cotisation par crédit fixe',
      [
        projectId(),
        idField('contributionId', 'Cotisation', 'contributions'),
        moneyField('monthlyPaymentAmount', 'Mensualité souhaitée (FCFA)'),
        dateField('desiredDate', 'Date souhaitée'),
      ],
      async (ctx, d) => {
        const project = ctx.row.projects?.find((p: any) => p.id === d.projectId)
        if (!project) throw Error('Projet introuvable.')
        const rows = await ctx.services.contributions.listContributions(
          ctx.id,
          d.projectId,
        )
        const row = rows.find((r) => r.id === d.contributionId)
        if (!row) throw Error('Cotisation introuvable.')
        const create = demandActions('credit-fixe').find(
          (a) => a.id === 'demand.create',
        )!
        return create.run(ctx, {
          clientId: row.memberId,
          amount: remainingContribution(row),
          monthlyPaymentAmount: d.monthlyPaymentAmount,
          desiredDate: d.desiredDate,
          cause: `Prise en charge de la cotisation de ${row.period} pour le projet « ${project.name} ».`,
          guarantorId:
            ctx.row.guarantorId !== row.memberId
              ? ctx.row.guarantorId
              : undefined,
          groupProject: {
            groupId: ctx.id,
            projectId: d.projectId,
            projectName: project.name,
            contributionId: row.id,
            contributionPeriod: row.period,
          },
        })
      },
      { requiredPermissions: ['creditFixe.create'] },
    ),
    action(
      'contribution.credit.allocate',
      'Confirmer la prise en charge d’une cotisation',
      [
        projectId(),
        idField('contributionId', 'Cotisation', 'contributions'),
        dateField(),
        textArea('note', 'Note', true),
      ],
      async (ctx, d) => {
        const rows = await ctx.services.contributions.listContributions(
          ctx.id,
          d.projectId,
        )
        const row = rows.find((r) => r.id === d.contributionId)
        if (!row) throw Error('Cotisation introuvable.')
        return ctx.services.contributions.allocateContributionFinancing(
          ctx.id,
          d.projectId,
          row.period,
          row.memberId,
          { date: d.date, note: d.note },
          actor(ctx),
        )
      },
    ),
    action(
      'project.credit.collective',
      'Demande collective de crédit fixe',
      [
        projectId(),
        moneyField('totalAmount', 'Montant total (FCFA)'),
        dateField('desiredDate', 'Date souhaitée'),
        reasonField('cause', 'Motif'),
        rows('shares', 'Parts à financer', [
          idField('memberId', 'Participant', 'groupMembers'),
          moneyField(),
          idField('guarantorId', 'Garant', 'members', false),
        ]),
      ],
      async (ctx, d) => {
        if (
          !ctx.caller.access.isSuperAdmin &&
          ctx.caller.access.permissionsDefined &&
          !ctx.caller.access.permissions.includes('creditFixe.create')
        )
          throw Error('Permission de création de crédit fixe requise.')
        return ctx.services.projectCredit.createCollectiveCreditRequest(
          {
            ...d,
            requestId: ctx.operationId,
            groupId: ctx.id,
            expectedGuarantorId: ctx.row.guarantorId,
          },
          actor(ctx),
        )
      },
    ),
    ...[false, true].map((remove) =>
      action(
        remove ? 'project.credit.unlink' : 'project.credit.link',
        remove ? 'Détacher un contrat' : 'Rattacher un contrat existant',
        [
          projectId(),
          idField('contractId', 'Contrat du participant', 'creditContracts'),
        ],
        (ctx, d) =>
          remove
            ? ctx.services.projectCredit.unlinkProjectCredit(
                ctx.id,
                d.projectId,
                d.contractId,
                actor(ctx),
              )
            : ctx.services.projectCredit.linkProjectCredit(
                ctx.id,
                d.projectId,
                d.contractId,
                actor(ctx),
              ),
      ),
    ),
    action(
      'project.demand.unlink',
      'Détacher une demande de crédit',
      [projectId(), idField('demandId', 'Demande de crédit', 'creditDemands')],
      (ctx, d) =>
        ctx.services.projectCredit.unlinkProjectDemand(
          ctx.id,
          d.projectId,
          d.demandId,
          actor(ctx),
        ),
    ),
    action(
      'agreement.create',
      'Créer des accords',
      [
        idField('creditorId', 'Bénéficiaire', 'groupMembers'),
        select('kind', 'Type d’accord', ['SALE', 'LOAN', 'SERVICE']),
        textField('title', 'Objet'),
        textArea('description', 'Conditions', true),
        dateField('agreementDate', 'Date de l’accord'),
        rows('buyers', 'Membres qui paient', [
          idField('debtorId', 'Membre', 'groupMembers'),
          numberField('quantity', 'Quantité', 1, 10000),
          moneyField('unitAmount', 'Prix unitaire (FCFA)'),
          rows('schedule', 'Échéancier', [
            dateField('dueDate', 'Date d’échéance'),
            moneyField(),
          ]),
        ]),
      ],
      (ctx, d) =>
        ctx.services.agreements.createGroupAgreements(
          {
            ...d,
            description: d.description || '',
            requestId: ctx.operationId,
            groupId: ctx.id,
            buyers: d.buyers.map((b: any) => ({
              ...b,
              schedule: b.schedule.map((s: any, i: number) => ({
                ...s,
                id: `M${i + 1}`,
              })),
            })),
          },
          actor(ctx),
        ),
    ),
    action(
      'agreement.payment',
      'Enregistrer le règlement d’un accord',
      [
        agreementId(),
        ...payment,
        select('receivedBy', 'Fonds reçus par', ['CREDITOR', 'KARA']),
        fileField('proof', 'Preuve', false),
      ],
      async (ctx, d) => {
        const proof = await upload(ctx, 'proof')
        return ctx.services.agreements.recordAgreementPayment(
          ctx.id,
          d.agreementId,
          {
            id: ctx.operationId,
            amount: d.amount,
            date: d.date,
            mode: d.source,
            receivedBy: d.receivedBy,
            reference: d.reference,
            note: d.note,
            proofUrl: proof?.url,
          },
          actor(ctx),
        )
      },
    ),
    action(
      'agreement.remittance',
      'Remettre les fonds au bénéficiaire',
      [agreementId(), ...payment, fileField('proof', 'Preuve', false)],
      async (ctx, d) => {
        const proof = await upload(ctx, 'proof')
        return ctx.services.agreements.recordAgreementRemittance(
          ctx.id,
          d.agreementId,
          {
            id: ctx.operationId,
            amount: d.amount,
            date: d.date,
            mode: d.source,
            reference: d.reference,
            note: d.note,
            proofUrl: proof?.url,
          },
          actor(ctx),
        )
      },
    ),
    action(
      'agreement.payment.void',
      'Annuler un règlement pour correction',
      [
        agreementId(),
        idField('paymentId', 'Règlement', 'agreementPayments'),
        reasonField(),
      ],
      (ctx, d) =>
        ctx.services.agreements.voidAgreementPayment(
          ctx.id,
          d.agreementId,
          d.paymentId,
          d.reason,
          actor(ctx),
        ),
    ),
    action(
      'agreement.remittance.void',
      'Annuler une remise pour correction',
      [
        agreementId(),
        idField('remittanceId', 'Remise', 'agreementRemittances'),
        reasonField(),
      ],
      (ctx, d) =>
        ctx.services.agreements.voidAgreementRemittance(
          ctx.id,
          d.agreementId,
          d.remittanceId,
          d.reason,
          actor(ctx),
        ),
    ),
    action(
      'agreement.cancel',
      'Annuler un accord',
      [agreementId(), reasonField()],
      (ctx, d) =>
        ctx.services.agreements.cancelGroupAgreement(
          ctx.id,
          d.agreementId,
          d.reason,
          actor(ctx),
        ),
    ),
    action(
      'agreement.reminder',
      'Enregistrer une relance',
      [
        agreementId(),
        select('channel', 'Canal', ['PHONE', 'WHATSAPP', 'NOTE']),
        select('outcome', 'Résultat', [
          'CONTACTED',
          'UNREACHABLE',
          'PROMISE',
          'MESSAGE_OPENED',
          'PLANNED',
        ]),
        textArea('note', 'Compte rendu', true),
        field('plannedDate', 'Date de suivi', 'date', z.string().optional()),
        field('promiseDate', 'Date promise', 'date', z.string().optional()),
      ],
      (ctx, d) =>
        ctx.services.agreements.recordAgreementReminder(
          ctx.id,
          d.agreementId,
          {
            id: ctx.operationId,
            channel: d.channel,
            outcome: d.outcome,
            note: d.note || '',
            plannedDate: d.plannedDate,
            promiseDate: d.promiseDate,
          },
          actor(ctx),
        ),
    ),
  ]
}
