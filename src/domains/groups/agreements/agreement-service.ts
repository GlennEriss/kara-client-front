import {
  collection,
  doc,
  getDocs,
  runTransaction,
  serverTimestamp,
  type DocumentData,
  type Transaction,
} from 'firebase/firestore'
import { db } from '@/firebase/firestore'
import type { User } from '@/types/types'
import type { GroupActor } from '../group-service'
import { isIdentifiedGroupMember } from '../group-guarantor'
import { memberName } from '../group-model'
import {
  agreementBalance,
  agreementBatchSignature,
  agreementId,
  agreementToday,
  validateAgreementBatch,
  validAgreementDate,
  AGREEMENT_PAYMENT_MODES,
  validateAgreementCashTimeline,
  type AgreementBatchDraft,
  type AgreementPayment,
  type AgreementReminder,
  type GroupAgreement,
} from './agreement-model'

const groupRef = (id: string) => doc(db, 'groups', agreementId(id))
const agreementRef = (groupId: string, id: string) =>
  doc(db, 'groups', agreementId(groupId), 'agreements', agreementId(id))
export const agreementLedgerRef = (groupId: string) =>
  doc(db, 'groupAgreementLedgers', agreementId(groupId))
const checkActor = (actor: GroupActor) => {
  if (!actor.id) throw new Error('Connectez-vous pour gérer les accords entre membres.')
}
const event = (description: string, actor: GroupActor) => ({
  id: crypto.randomUUID(),
  description,
  at: new Date().toISOString(),
  byId: actor.id,
  byName: actor.name,
})
function ledgerOf(data: DocumentData | undefined) {
  return {
    agreementCount: Number(data?.agreementCount || 0),
    openByMember: { ...(data?.openByMember || {}) } as Record<string, number>,
  }
}
function bump(counts: Record<string, number>, ids: string[], delta: number) {
  for (const id of new Set(ids)) counts[id] = Math.max(0, (counts[id] || 0) + delta)
}
function identity(
  snapshot: { exists(): boolean; id: string; data(): DocumentData | undefined },
  groupId: string,
): User {
  const member = { ...snapshot.data(), id: snapshot.id } as User
  if (
    !snapshot.exists() ||
    !isIdentifiedGroupMember(member) ||
    !(member.groupIds || []).includes(groupId)
  )
    throw new Error(
      'Chaque partie doit être un membre identifié appartenant encore au groupe. INCONNU ne peut pas être acheteur ou vendeur.',
    )
  return member
}
export async function listGroupAgreements(groupId: string): Promise<GroupAgreement[]> {
  const snapshot = await getDocs(collection(db, 'groups', agreementId(groupId), 'agreements'))
  return snapshot.docs
    .map((d) => ({ ...d.data(), id: d.id }) as GroupAgreement)
    .sort((a, b) => b.agreementDate.localeCompare(a.agreementDate) || a.id.localeCompare(b.id))
}

/** One atomic agreement per buyer. A stable request ID makes network retries safe. */
export async function createGroupAgreements(
  input: AgreementBatchDraft,
  actor: GroupActor,
): Promise<string[]> {
  checkActor(actor)
  validateAgreementBatch(input)
  const signature = agreementBatchSignature(input)
  const operationRef = doc(
    db,
    'groups',
    agreementId(input.groupId),
    'agreementOperations',
    agreementId(input.requestId),
  )
  const refs = input.buyers.map((buyer) =>
    agreementRef(input.groupId, `${input.requestId}_${buyer.debtorId}`),
  )
  return runTransaction(db, async (tx) => {
    const group = await tx.get(groupRef(input.groupId))
    const operation = await tx.get(operationRef)
    if (!group.exists()) throw new Error('Le groupe n’existe plus.')
    if (operation.exists()) {
      if (operation.data().signature !== signature)
        throw new Error(
          'Cette création existe déjà avec d’autres conditions. Actualisez les accords.',
        )
      return refs.map((ref) => ref.id)
    }
    const [creditorDoc, ledgerDoc, existing, buyerDocs] = await Promise.all([
      tx.get(doc(db, 'users', agreementId(input.creditorId))),
      tx.get(agreementLedgerRef(input.groupId)),
      Promise.all(refs.map((ref) => tx.get(ref))),
      Promise.all(input.buyers.map((b) => tx.get(doc(db, 'users', agreementId(b.debtorId))))),
    ])
    if (existing.some((d) => d.exists()))
      throw new Error('Un accord possède déjà cette référence. Actualisez avant de recommencer.')
    const creditor = identity(creditorDoc, input.groupId)
    const debtors = buyerDocs.map((d) => identity(d, input.groupId))
    if (
      debtors.some(
        (d) => d.id === creditor.id || (!!d.matricule && d.matricule === creditor.matricule),
      ) ||
      new Set(debtors.map((d) => d.matricule || d.id)).size !== debtors.length
    )
      throw new Error('Choisissez des membres distincts pour chaque accord.')
    const ledger = ledgerOf(ledgerDoc.data())
    const activity = event('Accord entre membres créé sous la supervision de LE KARA.', actor)
    refs.forEach((ref, index) => {
      const buyer = input.buyers[index],
        debtor = debtors[index]
      const agreement: Omit<GroupAgreement, 'id'> = {
        groupId: input.groupId,
        groupName: String(group.data().name || group.data().label || 'Groupe'),
        batchId: input.requestId,
        kind: input.kind,
        title: input.title.trim(),
        description: input.description.trim(),
        agreementDate: input.agreementDate,
        creditorId: creditor.id,
        creditorMatricule: creditor.matricule || creditor.id,
        creditorName: memberName(creditor),
        debtorId: debtor.id,
        debtorMatricule: debtor.matricule || debtor.id,
        debtorName: memberName(debtor),
        partyIds: [
          ...new Set(
            [creditor.id, creditor.matricule, debtor.id, debtor.matricule].filter(Boolean),
          ),
        ],
        quantity: buyer.quantity,
        unitAmount: buyer.unitAmount,
        totalAmount: buyer.quantity * buyer.unitAmount,
        schedule: buyer.schedule,
        status: 'ACTIVE',
        payments: [],
        remittances: [],
        reminders: [],
        history: [activity],
        createdBy: actor.id,
      }
      tx.set(ref, { ...agreement, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
      bump(ledger.openByMember, [creditor.id, debtor.id], 1)
    })
    ledger.agreementCount += refs.length
    tx.set(agreementLedgerRef(input.groupId), {
      ...ledger,
      groupId: input.groupId,
      updatedAt: serverTimestamp(),
    })
    tx.set(operationRef, {
      signature,
      agreementIds: refs.map((ref) => ref.id),
      createdAt: serverTimestamp(),
      createdBy: actor.id,
    })
    tx.update(group.ref, { updatedAt: serverTimestamp(), updatedBy: actor.id })
    return refs.map((ref) => ref.id)
  })
}

type AgreementChange = { next: GroupAgreement; description: string } | null
async function updateAgreement(
  groupId: string,
  id: string,
  actor: GroupActor,
  change: (current: GroupAgreement, tx: Transaction) => Promise<AgreementChange> | AgreementChange,
) {
  checkActor(actor)
  await runTransaction(db, async (tx) => {
    const [group, document, ledgerDoc] = await Promise.all([
      tx.get(groupRef(groupId)),
      tx.get(agreementRef(groupId, id)),
      tx.get(agreementLedgerRef(groupId)),
    ])
    if (!group.exists() || !document.exists())
      throw new Error('Le groupe ou l’accord n’existe plus.')
    const current = { ...document.data(), id: document.id } as GroupAgreement
    if (current.groupId !== groupId) throw new Error('Cet accord n’appartient pas à ce groupe.')
    const result = await change(current, tx)
    if (!result) return
    validateAgreementCashTimeline(result.next)
    const beforeOpen = current.status === 'ACTIVE' && agreementBalance(current).status !== 'SETTLED'
    const afterOpen =
      result.next.status === 'ACTIVE' && agreementBalance(result.next).status !== 'SETTLED'
    const ledger = ledgerOf(ledgerDoc.data())
    if (afterOpen && !beforeOpen) {
      const parties = await Promise.all(
        [current.creditorId, current.debtorId].map((memberId) =>
          tx.get(doc(db, 'users', memberId)),
        ),
      )
      for (const party of parties) identity(party, groupId)
    }
    if (beforeOpen !== afterOpen)
      bump(ledger.openByMember, [current.creditorId, current.debtorId], afterOpen ? 1 : -1)
    const record = { ...result.next } as Partial<GroupAgreement>
    delete record.id
    tx.update(document.ref, {
      ...record,
      history: [...current.history, event(result.description, actor)],
      updatedAt: serverTimestamp(),
    })
    tx.set(agreementLedgerRef(groupId), { ...ledger, groupId, updatedAt: serverTimestamp() })
    tx.update(group.ref, { updatedAt: serverTimestamp(), updatedBy: actor.id })
  })
}

export type AgreementPaymentInput = Pick<
  AgreementPayment,
  'id' | 'amount' | 'date' | 'mode' | 'receivedBy'
> &
  Partial<Pick<AgreementPayment, 'reference' | 'note' | 'proofUrl'>>
export async function recordAgreementPayment(
  groupId: string,
  id: string,
  input: AgreementPaymentInput,
  actor: GroupActor,
) {
  agreementId(input.id)
  if (
    !Number.isSafeInteger(input.amount) ||
    input.amount <= 0 ||
    !Object.hasOwn(AGREEMENT_PAYMENT_MODES, input.mode)
  )
    throw new Error('Indiquez un montant entier positif et un mode de règlement.')
  if (!['CREDITOR', 'KARA'].includes(input.receivedBy))
    throw new Error(
      'Précisez si le bénéficiaire a reçu le versement directement ou si LE KARA l’a encaissé.',
    )
  if (!validAgreementDate(input.date) || input.date > agreementToday())
    throw new Error('La date du versement est invalide ou future.')
  if (
    (input.reference?.length || 0) > 120 ||
    (input.note?.length || 0) > 500 ||
    (input.proofUrl?.length || 0) > 2000
  )
    throw new Error('La référence, la note ou le justificatif est trop long.')
  if (input.proofUrl && !/^https:\/\//.test(input.proofUrl))
    throw new Error('Le lien du justificatif doit utiliser HTTPS.')
  const normalized = {
    id: input.id,
    amount: input.amount,
    date: input.date,
    mode: input.mode,
    receivedBy: input.receivedBy,
    ...(input.reference?.trim() ? { reference: input.reference.trim() } : {}),
    ...(input.note?.trim() ? { note: input.note.trim() } : {}),
    ...(input.proofUrl ? { proofUrl: input.proofUrl } : {}),
  }
  await updateAgreement(groupId, id, actor, (current) => {
    const previous = current.payments.find((p) => p.id === input.id)
    if (previous) {
      for (const key of [
        'amount',
        'date',
        'mode',
        'receivedBy',
        'reference',
        'note',
        'proofUrl',
      ] as const)
        if ((previous[key] || '') !== (normalized[key] || ''))
          throw new Error('Cette référence de versement existe déjà avec d’autres informations.')
      return null
    }
    if (current.status !== 'ACTIVE' || input.date < current.agreementDate)
      throw new Error('Le versement doit concerner un accord actif et être daté après sa création.')
    if (input.amount > agreementBalance(current).remaining)
      throw new Error('Le montant dépasse le solde restant. Actualisez l’accord.')
    const payment = {
      ...normalized,
      recordedAt: new Date().toISOString(),
      byId: actor.id,
      byName: actor.name,
    }
    return {
      next: { ...current, payments: [...current.payments, payment] },
      description: `Versement de ${input.amount.toLocaleString('fr-FR')} FCFA ${input.receivedBy === 'KARA' ? 'encaissé par LE KARA' : 'reçu directement par le bénéficiaire'} le ${input.date}.`,
    }
  })
}
export async function voidAgreementPayment(
  groupId: string,
  id: string,
  paymentId: string,
  reason: string,
  actor: GroupActor,
) {
  if (reason.trim().length < 3 || reason.length > 500)
    throw new Error('Indiquez un motif de correction de 3 à 500 caractères.')
  await updateAgreement(groupId, id, actor, (current) => {
    const payment = current.payments.find((p) => p.id === paymentId)
    if (!payment) throw new Error('Versement introuvable.')
    if (payment.voidedAt) return null
    return {
      next: {
        ...current,
        payments: current.payments.map((p) =>
          p.id === paymentId
            ? {
                ...p,
                voidedAt: new Date().toISOString(),
                voidedById: actor.id,
                voidedByName: actor.name,
                voidReason: reason.trim(),
              }
            : p,
        ),
      },
      description: `Versement de ${payment.amount.toLocaleString('fr-FR')} FCFA annulé pour correction : ${reason.trim()}`,
    }
  })
}
export async function cancelGroupAgreement(
  groupId: string,
  id: string,
  reason: string,
  actor: GroupActor,
) {
  if (reason.trim().length < 3 || reason.length > 500)
    throw new Error('Indiquez le motif d’annulation (3 à 500 caractères).')
  await updateAgreement(groupId, id, actor, (current) => {
    if (current.status === 'CANCELLED') return null
    if (current.payments.some((p) => !p.voidedAt) || current.remittances.some((p) => !p.voidedAt))
      throw new Error(
        'Cet accord possède des versements ou reversements. Conservez son suivi ; une annulation ne constitue pas un remboursement.',
      )
    return {
      next: { ...current, status: 'CANCELLED' },
      description: `Accord annulé : ${reason.trim()}`,
    }
  })
}
export async function recordAgreementRemittance(
  groupId: string,
  id: string,
  input: Omit<AgreementPaymentInput, 'receivedBy'>,
  actor: GroupActor,
) {
  agreementId(input.id)
  if (
    !Number.isSafeInteger(input.amount) ||
    input.amount <= 0 ||
    !Object.hasOwn(AGREEMENT_PAYMENT_MODES, input.mode)
  )
    throw new Error('Vérifiez le montant entier et le mode de remise.')
  if (!validAgreementDate(input.date) || input.date > agreementToday())
    throw new Error('La date du reversement est invalide ou future.')
  if (
    (input.reference?.length || 0) > 120 ||
    (input.note?.length || 0) > 500 ||
    (input.proofUrl?.length || 0) > 2000 ||
    (input.proofUrl && !/^https:\/\//.test(input.proofUrl))
  )
    throw new Error('Vérifiez la référence, la note et le justificatif du reversement.')
  const normalized = {
    id: input.id,
    amount: input.amount,
    date: input.date,
    mode: input.mode,
    ...(input.reference?.trim() ? { reference: input.reference.trim() } : {}),
    ...(input.note?.trim() ? { note: input.note.trim() } : {}),
    ...(input.proofUrl ? { proofUrl: input.proofUrl } : {}),
  }
  await updateAgreement(groupId, id, actor, (current) => {
    const previous = current.remittances.find((p) => p.id === input.id)
    if (previous) {
      for (const key of ['amount', 'date', 'mode', 'reference', 'note', 'proofUrl'] as const)
        if ((previous[key] || '') !== (normalized[key] || ''))
          throw new Error('Cette référence de reversement existe avec d’autres informations.')
      return null
    }
    if (
      current.status !== 'ACTIVE' ||
      input.date < current.agreementDate ||
      input.amount > agreementBalance(current).heldByKara
    )
      throw new Error(
        'Le reversement dépasse les fonds détenus pour cet accord ou l’accord n’est plus actif.',
      )
    return {
      next: {
        ...current,
        remittances: [
          ...current.remittances,
          {
            ...normalized,
            recordedAt: new Date().toISOString(),
            byId: actor.id,
            byName: actor.name,
          },
        ],
      },
      description: `Reversement de ${input.amount.toLocaleString('fr-FR')} FCFA au bénéficiaire confirmé le ${input.date}.`,
    }
  })
}
export async function voidAgreementRemittance(
  groupId: string,
  id: string,
  remittanceId: string,
  reason: string,
  actor: GroupActor,
) {
  if (reason.trim().length < 3 || reason.length > 500)
    throw new Error('Indiquez un motif de correction de 3 à 500 caractères.')
  await updateAgreement(groupId, id, actor, (current) => {
    const remittance = current.remittances.find((p) => p.id === remittanceId)
    if (!remittance) throw new Error('Reversement introuvable.')
    if (remittance.voidedAt) return null
    return {
      next: {
        ...current,
        remittances: current.remittances.map((p) =>
          p.id === remittanceId
            ? {
                ...p,
                voidedAt: new Date().toISOString(),
                voidedById: actor.id,
                voidedByName: actor.name,
                voidReason: reason.trim(),
              }
            : p,
        ),
      },
      description: `Saisie d’un reversement annulée pour correction : ${reason.trim()}`,
    }
  })
}
export async function recordAgreementReminder(
  groupId: string,
  id: string,
  input: Omit<AgreementReminder, 'recordedAt' | 'byId' | 'byName'>,
  actor: GroupActor,
) {
  agreementId(input.id)
  if (
    !['PHONE', 'WHATSAPP', 'NOTE'].includes(input.channel) ||
    !['CONTACTED', 'UNREACHABLE', 'PROMISE', 'MESSAGE_OPENED', 'PLANNED'].includes(input.outcome) ||
    input.note.length > 500
  )
    throw new Error('Vérifiez le canal, le résultat et la note de relance.')
  for (const date of [input.plannedDate, input.promiseDate].filter(Boolean))
    if (!validAgreementDate(date) || date! < agreementToday())
      throw new Error('Choisissez une date de suivi à partir d’aujourd’hui.')
  if (
    (input.outcome === 'PLANNED' && !input.plannedDate) ||
    (input.outcome === 'PROMISE' && !input.promiseDate)
  )
    throw new Error('Précisez la date prévue pour ce suivi.')
  await updateAgreement(groupId, id, actor, (current) => {
    const previous = current.reminders.find((r) => r.id === input.id)
    if (previous) {
      for (const key of ['channel', 'outcome', 'note', 'plannedDate', 'promiseDate'] as const) {
        const value = key === 'note' ? input.note.trim() : input[key]
        if ((previous[key] || '') !== (value || ''))
          throw new Error('Cette référence de suivi existe déjà avec d’autres informations. Actualisez avant de saisir un nouveau suivi.')
      }
      return null
    }
    if (current.status !== 'ACTIVE' || agreementBalance(current).remaining === 0)
      throw new Error('Cet accord est annulé ou déjà réglé.')
    return {
      next: {
        ...current,
        reminders: [
          ...current.reminders,
          {
            ...input,
            note: input.note.trim(),
            recordedAt: new Date().toISOString(),
            byId: actor.id,
            byName: actor.name,
          },
        ],
      },
      description: 'Suivi de règlement enregistré.',
    }
  })
}
