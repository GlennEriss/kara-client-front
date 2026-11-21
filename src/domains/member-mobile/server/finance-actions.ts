import { z } from 'zod'
import { FieldValue, type Firestore } from 'firebase-admin/firestore'
import { mobileDateKey } from '@/domains/mobile/contracts'
import type { MemberCaller, MemberData } from './access'
import { MemberError, memberIds } from './data'
import {
  financeCollections,
  financePolicy,
  memberContractEnd,
  number,
  type FinanceChildren,
  type MemberFinanceModule,
} from './finance-model'

const civilDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const d = new Date(v + 'T12:00:00Z')
    return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === v
  }, 'Date invalide.')
const identifier = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(/^[^/\\]+$/)
const modes = z.enum([
  'airtel_money',
  'mobicash',
  'cash',
  'bank_transfer',
  'other',
])
const money = z.number().finite().positive().max(1_000_000_000)
export const memberDemandSchema = z
  .object({
    contactIsMember: z.boolean(),
    contactMatricule: identifier.optional(),
    relationship: z.string().trim().max(100).optional(),
    caisseType: z
      .enum([
        'STANDARD',
        'JOURNALIERE',
        'LIBRE',
        'STANDARD_CHARITABLE',
        'JOURNALIERE_CHARITABLE',
        'LIBRE_CHARITABLE',
      ])
      .optional(),
    monthlyAmount: money.min(100).optional(),
    monthsPlanned: z.number().int().min(1).max(12).optional(),
    desiredDate: civilDate,
    cause: z.string().trim().max(500).optional(),
    subscriptionCIID: identifier.optional(),
    paymentFrequency: z.enum(['DAILY', 'MONTHLY']).optional(),
  })
  .strict()
  .superRefine((p, ctx) => {
    if (p.contactIsMember && (!p.contactMatricule || !p.relationship))
      ctx.addIssue({
        code: 'custom',
        message: 'Renseignez le matricule et le lien de parenté du contact.',
      })
    if (p.caisseType?.startsWith('LIBRE') && number(p.monthlyAmount) < 100000)
      ctx.addIssue({
        code: 'custom',
        message: 'Le montant minimum d’une caisse libre est de 100 000 FCFA.',
      })
  })
export const memberOperationSchema = z
  .discriminatedUnion('action', [
    z.object({ action: z.literal('cancel-demand') }).strict(),
    z.object({ action: z.literal('upload-signed') }).strict(),
    z
      .object({
        action: z.literal('declare'),
        monthIndex: z.number().int().min(0).max(59),
        amount: money.min(100),
        mode: modes,
        withFees: z.boolean().optional(),
        paymentMethodOther: z.string().trim().max(100).optional(),
        date: civilDate,
        time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
        comment: z.string().trim().max(300).optional(),
      })
      .strict(),
    z
      .object({
        action: z.literal('refund'),
        type: z.enum(['EARLY', 'FINAL']),
        reason: z.string().trim().min(10).max(500),
        withdrawalAmount: money,
        withdrawalMode: modes,
        withFees: z.boolean().optional(),
        paymentMethodOther: z.string().trim().max(100).optional(),
        withdrawalDate: civilDate.optional(),
        withdrawalTime: z
          .string()
          .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
          .optional(),
      })
      .strict(),
    z
      .object({
        action: z.literal('support'),
        amount: money,
        motif: z.string().trim().min(10).max(500),
      })
      .strict(),
    z
      .object({ action: z.literal('support-document'), supportId: identifier })
      .strict(),
  ])
  .superRefine((p, ctx) => {
    if (
      ((p.action === 'declare' && p.mode === 'other') ||
        (p.action === 'refund' && p.withdrawalMode === 'other')) &&
      !('paymentMethodOther' in p && p.paymentMethodOther)
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Précisez le moyen de paiement.',
      })
  })
export const operationIdSchema = z.string().regex(/^[a-zA-Z0-9_-]{16,80}$/)
export type MemberOperation = z.infer<typeof memberOperationSchema>
export type UploadedMemberFiles = Record<
  string,
  { url: string; path: string; mime: string; size: number; name: string }
>

function emergencyContact(
  p: z.infer<typeof memberDemandSchema>,
  module: MemberFinanceModule,
  caller: MemberCaller,
) {
  if (p.contactIsMember) {
    if (memberIds(caller).includes(p.contactMatricule!))
      throw new MemberError(
        'Le contact d’urgence doit être une autre personne.',
      )
    return {
      lastName: p.contactMatricule!,
      firstName: '',
      phone1: '000000000',
      phone2: '',
      relationship: p.relationship!,
      idNumber: p.contactMatricule!,
      typeId: 'MEMBRE_KARA',
      ...(module === 'caisse-imprevue'
        ? { documentPhotoUrl: 'MEMBRE_KARA' }
        : {}),
    }
  }
  return {
    lastName: 'INCONNU',
    firstName: '',
    phone1: '000000000',
    phone2: '',
    relationship: module === 'caisse-speciale' ? 'N/A' : 'INCONNU',
    idNumber: 'INCONNU',
    typeId: module === 'caisse-speciale' ? 'OTHER' : 'Autre',
    ...(module === 'caisse-imprevue' ? { documentPhotoUrl: 'INCONNU' } : {}),
  }
}
const requiredFile = (files: UploadedMemberFiles, key: string) => {
  if (!files[key]) throw new MemberError('Joignez tous les documents demandés.')
  return files[key]
}
/** Écrit seulement les demandes personnelles. Aucun appel aux mutations d’administration. */
export async function createMemberFinanceDemand(
  db: Firestore,
  caller: MemberCaller,
  module: MemberFinanceModule,
  input: unknown,
  operationId: string,
  _now = new Date(),
) {
  if (!operationIdSchema.safeParse(operationId).success)
    throw new MemberError('Référence d’opération invalide.')
  const parsed = memberDemandSchema.safeParse(input)
  if (!parsed.success)
    throw new MemberError(
      parsed.error.issues[0]?.message || 'Demande invalide.',
    )
  const p = parsed.data,
    names = financeCollections(module),
    contact = emergencyContact(p, module, caller)
  const id = `MK_DEMANDE_${module === 'caisse-speciale' ? 'CS' : 'CI'}_${caller.matricule.split('.')[0]}_${operationId}`
  const identity = caller.dossier.identity || {}
  const stamp = FieldValue.serverTimestamp()
  const base = {
    memberId: caller.matricule,
    memberMatricule: caller.matricule,
    memberFirstName: identity.firstName || '',
    memberLastName: identity.lastName || '',
    memberPhone: identity.contacts?.[0] || null,
    cause: p.cause || null,
    emergencyContact: contact,
    status: 'PENDING',
    _submittedByMember: true,
    createdBy: caller.matricule,
    createdAt: stamp,
    updatedAt: stamp,
  }
  let configuration: MemberData
  if (module === 'caisse-speciale') {
    if (
      !p.caisseType ||
      !p.monthlyAmount ||
      !p.monthsPlanned ||
      p.subscriptionCIID ||
      p.paymentFrequency
    )
      throw new MemberError(
        'Renseignez le type, le montant et la durée de la caisse spéciale.',
      )
    configuration = {
      contractType: 'INDIVIDUAL',
      caisseType: p.caisseType,
      monthlyAmount: p.monthlyAmount,
      monthsPlanned: p.monthsPlanned,
      desiredDate: p.desiredDate,
    }
  } else {
    if (
      !p.subscriptionCIID ||
      !p.paymentFrequency ||
      !p.cause ||
      p.cause.length < 10 ||
      p.caisseType ||
      p.monthlyAmount ||
      p.monthsPlanned
    )
      throw new MemberError(
        'Sélectionnez un forfait, une fréquence et un motif d’au moins 10 caractères.',
      )
    const plan = (
      await db.collection('subscriptionsCI').doc(p.subscriptionCIID).get()
    ).data()
    if (!plan || plan.status !== 'ACTIVE')
      throw new MemberError('Ce forfait n’est plus disponible.')
    configuration = {
      subscriptionCIID: p.subscriptionCIID,
      subscriptionCICode: plan.code || '',
      subscriptionCILabel: plan.label || null,
      subscriptionCIAmountPerMonth: number(plan.amountPerMonth),
      subscriptionCINominal: number(plan.nominal),
      subscriptionCIDuration: number(plan.durationInMonths),
      subscriptionCISupportMin: number(plan.supportMin),
      subscriptionCISupportMax: number(plan.supportMax),
      paymentFrequency: p.paymentFrequency,
      desiredStartDate: p.desiredDate,
      priority: 1,
      memberEmail: caller.email,
      memberContacts: identity.contacts || [],
    }
  }
  const requestRef = db.collection(names.demands).doc(id)
  return db.runTransaction(async (tx) => {
    if ((await tx.get(requestRef)).exists) return { id }
    tx.set(requestRef, { ...base, ...configuration })
    // Même notification que le portail membre ; ID stable, pas de doublon lors d’un retry.
    tx.set(db.collection('notifications').doc(`member-demand-${id}`), {
      module:
        module === 'caisse-speciale' ? 'caisse_speciale' : 'caisse_imprevue',
      type:
        module === 'caisse-speciale'
          ? 'demand_created'
          : 'caisse_imprevue_demand_created',
      entityId: id,
      title:
        module === 'caisse-speciale'
          ? 'Nouvelle demande Caisse Spéciale'
          : 'Nouvelle demande Caisse Imprévue',
      message: `${[identity.firstName, identity.lastName].filter(Boolean).join(' ') || caller.matricule} a soumis une nouvelle demande (${id}).`,
      isRead: false,
      createdAt: stamp,
      metadata: {
        demandId: id,
        memberId: caller.matricule,
        memberMatricule: caller.matricule,
        status: 'PENDING',
      },
    })
    return { id }
  })
}

export async function applyMemberFinanceOperation(
  db: Firestore,
  caller: MemberCaller,
  module: MemberFinanceModule,
  id: string,
  input: unknown,
  files: UploadedMemberFiles,
  operationId: string,
  now = new Date(),
) {
  if (
    !operationIdSchema.safeParse(operationId).success ||
    !identifier.safeParse(id).success
  )
    throw new MemberError('Référence d’opération invalide.')
  const parsed = memberOperationSchema.safeParse(input)
  if (!parsed.success)
    throw new MemberError(
      parsed.error.issues[0]?.message || 'Opération invalide.',
    )
  const p = parsed.data,
    names = financeCollections(module),
    root = db
      .collection(
        p.action === 'cancel-demand' ? names.demands : names.contracts,
      )
      .doc(id)
  const marker = db
    .collection('memberMobileOperations')
    .doc(`${caller.uid}_${operationId}`)
  return db.runTransaction(async (tx) => {
    const [snap, old] = await Promise.all([tx.get(root), tx.get(marker)])
    const c = snap.data()
    if (!c || !memberIds(caller).includes(c.memberId))
      throw new MemberError('Dossier introuvable.', 404)
    if (old.exists) {
      const previous = old.data()!
      if (
        previous.module !== module ||
        previous.entityId !== id ||
        previous.action !== p.action
      )
        throw new MemberError('Référence d’opération déjà utilisée.', 409)
      return { id: previous.resultId as string, replayed: true }
    }
    const stamp = FieldValue.serverTimestamp(),
      resultId = `MEMBER_${operationId}`
    const complete = () => {
      tx.set(marker, {
        uid: caller.uid,
        module,
        entityId: id,
        action: p.action,
        resultId,
        createdAt: stamp,
      })
      return { id: resultId, replayed: false }
    }
    if (p.action === 'cancel-demand') {
      if (c.status !== 'PENDING')
        throw new MemberError(
          'Seule une demande en attente peut être annulée.',
          409,
        )
      tx.update(root, { status: 'CANCELED', updatedAt: stamp })
      return complete()
    }
    const read = async (name: string) =>
      (await tx.get(root.collection(name))).docs.map(
        (d) => ({ ...d.data(), id: d.id }) as MemberData,
      )
    const [payments, refunds, supports] = await Promise.all([
      read('payments'),
      read(names.refunds),
      module === 'caisse-imprevue' ? read('supports') : Promise.resolve([]),
    ])
    const children: FinanceChildren = {
      payments,
      refunds,
      supports,
      declarations: [],
    }
    const policy = financePolicy(module, c, children, now)
    if (p.action === 'upload-signed') {
      if (!policy.uploadSigned)
        throw new MemberError(
          'Le document est déjà finalisé ou en cours de validation.',
          409,
        )
      const f = requiredFile(files, 'signedDocument')
      tx.set(db.collection('documents').doc(resultId), {
        contractId: id,
        memberId: caller.matricule,
        type:
          module === 'caisse-speciale'
            ? 'MEMBER_SIGNED_CS'
            : 'MEMBER_SIGNED_CI',
        url: f.url,
        path: f.path,
        size: f.size,
        format: f.mime === 'application/pdf' ? 'pdf' : 'image',
        originalFileName: f.name,
        createdAt: stamp,
      })
      tx.update(root, {
        memberSignedDocumentId: resultId,
        memberSignedStatus: 'PENDING_ADMIN',
        memberSignedAt: stamp,
      })
    } else if (p.action === 'declare') {
      if (!policy.declare)
        throw new MemberError(
          'Ce contrat n’accepte plus de nouvelles déclarations.',
          409,
        )
      const payment = payments.find(
        (v) => number(v.dueMonthIndex ?? v.monthIndex) === p.monthIndex,
      )
      if (!payment || payment.status === 'PAID')
        throw new MemberError(
          'Cette échéance est introuvable ou déjà payée.',
          409,
        )
      if (p.date > mobileDateKey(now))
        throw new MemberError(
          'La date de versement ne peut pas être dans le futur.',
        )
      const proof = requiredFile(files, 'proof')
      const values: Record<string, unknown> = { ...p }
      delete values.action
      tx.set(root.collection('declaredVersements').doc(resultId), {
        ...values,
        contractId: id,
        memberId: caller.matricule,
        proofUrl: proof.url,
        status: 'PENDING_MEMBER',
        _submittedByMember: true,
        declaredAt: stamp,
        createdAt: stamp,
      })
      // Les vrais paiements, capitaux et montants remboursés restent intacts.
      tx.update(root, { memberActivityAt: stamp })
    } else if (p.action === 'refund') {
      if (!(p.type === 'FINAL' ? policy.finalRefund : policy.earlyRefund))
        throw new MemberError(
          policy.refundReason || 'Ce retrait n’est pas disponible.',
          409,
        )
      const paid = payments.reduce(
        (sum, v) =>
          sum +
          number(v.accumulatedAmount ?? (v.status === 'PAID' ? v.amount : 0)),
        0,
      )
      const capital = number(c.nominalPaid) || paid
      if (p.withdrawalAmount > capital)
        throw new MemberError(
          'Le montant demandé dépasse le capital réellement versé.',
        )
      const signed = requiredFile(files, 'signedDocument')
      const proof =
        module === 'caisse-speciale' ? requiredFile(files, 'proofPhoto') : null
      if (
        module === 'caisse-speciale' &&
        (!p.withdrawalDate || !p.withdrawalTime)
      )
        throw new MemberError('Précisez la date et l’heure du retrait.')
      const values: Record<string, unknown> = { ...p }
      delete values.action
      tx.set(root.collection(names.refunds).doc(resultId), {
        ...values,
        contractId: id,
        documentUrl: signed.url,
        proofUrl: proof?.url ?? null,
        ...(p.withdrawalDate
          ? { withdrawalDate: new Date(p.withdrawalDate + 'T12:00:00Z') }
          : {}),
        amountNominal: p.withdrawalAmount,
        amountBonus: 0,
        status: 'PENDING',
        _submittedByMember: true,
        createdBy: caller.matricule,
        createdAt: stamp,
        updatedAt: stamp,
        ...(p.type === 'FINAL'
          ? { deadlineAt: new Date(memberContractEnd(module, c)) }
          : {}),
      })
      tx.update(root, { memberActivityAt: stamp })
    } else if (p.action === 'support') {
      if (!policy.support)
        throw new MemberError(
          policy.supportReason || 'L’aide n’est pas disponible.',
          409,
        )
      if (
        p.amount < number(c.subscriptionCISupportMin) ||
        p.amount > number(c.subscriptionCISupportMax)
      )
        throw new MemberError('Le montant ne respecte pas la plage du forfait.')
      const signed = requiredFile(files, 'signedDocument')
      tx.set(root.collection('supports').doc(resultId), {
        contractId: id,
        amount: p.amount,
        motif: p.motif,
        status: 'PENDING_ADMIN',
        documentUrl: signed.url,
        amountRepaid: 0,
        amountRemaining: p.amount,
        deductions: [],
        repayments: [],
        requestedAt: stamp,
        createdBy: caller.matricule,
        createdAt: stamp,
        updatedAt: stamp,
      })
      tx.update(root, { currentSupportId: resultId, updatedAt: stamp })
    } else {
      const support = supports.find((s) => s.id === p.supportId)
      if (
        supports.some(
          (s) =>
            s.id !== p.supportId &&
            ['ACTIVE', 'PENDING_ADMIN'].includes(s.status),
        )
      )
        throw new MemberError(
          'Une autre aide est déjà en cours ou en attente de validation.',
          409,
        )
      if (
        module !== 'caisse-imprevue' ||
        !support ||
        support.status !== 'REJECTED'
      )
        throw new MemberError(
          'Seul un document d’aide refusé peut être soumis de nouveau.',
          409,
        )
      const signed = requiredFile(files, 'signedDocument')
      tx.update(root.collection('supports').doc(p.supportId), {
        documentUrl: signed.url,
        status: 'PENDING_ADMIN',
        rejectionReason: null,
        rejectedAt: null,
        rejectedBy: null,
        updatedAt: stamp,
      })
      tx.update(root, {
        currentSupportId: p.supportId,
        memberActivityAt: stamp,
      })
    }
    return complete()
  })
}
