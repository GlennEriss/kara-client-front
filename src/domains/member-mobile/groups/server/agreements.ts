// Source métier : kara-members-front/features/groups/server/agreements.ts
import type { DocumentData, Firestore } from 'firebase-admin/firestore'
import type { MyGroupAgreement } from '../types/agreement'

const text = (v: unknown) => (typeof v === 'string' ? v : '')
const positive = (v: unknown): v is number =>
  typeof v === 'number' && Number.isSafeInteger(v) && v > 0
function validDate(v: unknown): v is string {
  return (
    typeof v === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(v) &&
    !Number.isNaN(new Date(`${v}T12:00:00Z`).getTime()) &&
    new Date(`${v}T12:00:00Z`).toISOString().slice(0, 10) === v
  )
}
const rows = (v: unknown): DocumentData[] =>
  Array.isArray(v) ? v.filter((r) => r && typeof r === 'object') : []

/** Explicit private projection. partyIds is only a query index; it never grants
 * access without checking the actual two identities against the session. */
export function projectMyAgreement(
  id: string,
  groupId: string,
  data: DocumentData,
  viewerIds: Set<string>,
  today = new Date(Date.now() + 3_600_000).toISOString().slice(0, 10),
): MyGroupAgreement | null {
  const payer = [data.debtorId, data.debtorMatricule].some(
    (value) => !!value && viewerIds.has(value),
  )
  const receiver = [data.creditorId, data.creditorMatricule].some(
    (value) => !!value && viewerIds.has(value),
  )
  if (
    payer === receiver ||
    data.groupId !== groupId ||
    !validDate(data.agreementDate) ||
    !positive(data.totalAmount) ||
    !['ACTIVE', 'CANCELLED'].includes(data.status)
  )
    return null
  const schedule = rows(data.schedule)
  if (
    !schedule.length ||
    schedule.some(
      (r) => !text(r.id) || !validDate(r.dueDate) || !positive(r.amount),
    ) ||
    schedule.reduce((sum, r) => sum + r.amount, 0) !== data.totalAmount
  )
    return null
  const payments = rows(data.payments)
    .filter(
      (p) =>
        !p.voidedAt &&
        positive(p.amount) &&
        validDate(p.date) &&
        p.date <= today &&
        ['KARA', 'CREDITOR'].includes(p.receivedBy),
    )
    .map((p) => ({
      id: text(p.id),
      date: p.date as string,
      amount: p.amount as number,
      receivedBy: p.receivedBy as 'KARA' | 'CREDITOR',
    }))
  const remittances = rows(data.remittances)
    .filter(
      (p) =>
        !p.voidedAt &&
        positive(p.amount) &&
        validDate(p.date) &&
        p.date <= today,
    )
    .map((p) => ({
      id: text(p.id),
      date: p.date as string,
      amount: p.amount as number,
    }))
  const paid = payments.reduce((s, p) => s + p.amount, 0)
  const collected = payments
    .filter((p) => p.receivedBy === 'KARA')
    .reduce((s, p) => s + p.amount, 0)
  const remitted = remittances.reduce((s, p) => s + p.amount, 0)
  const heldByKara = Math.max(0, collected - remitted)
  const receivedByCreditor = paid - collected + remitted
  let unallocated = paid
  const installments = schedule.map((row) => {
    const allocated = Math.min(row.amount, Math.max(0, unallocated))
    unallocated -= allocated
    return {
      id: text(row.id),
      dueDate: row.dueDate as string,
      amount: row.amount as number,
      paid: allocated,
      remaining: row.amount - allocated,
    }
  })
  const cancelled = data.status === 'CANCELLED'
  const remaining = cancelled ? 0 : Math.max(0, data.totalAmount - paid)
  const overdue = cancelled
    ? 0
    : installments
        .filter((r) => r.dueDate < today)
        .reduce((s, r) => s + r.remaining, 0)
  return {
    id,
    groupId,
    title: text(data.title),
    description: text(data.description),
    agreementDate: data.agreementDate,
    role: payer ? 'PAYER' : 'RECEIVER',
    counterpartyName:
      text(payer ? data.creditorName : data.debtorName) || 'Membre du groupe',
    quantity: positive(data.quantity) ? data.quantity : 1,
    unitAmount: positive(data.unitAmount) ? data.unitAmount : data.totalAmount,
    totalAmount: data.totalAmount,
    status: cancelled
      ? 'CANCELLED'
      : remaining === 0
        ? heldByKara > 0
          ? 'PENDING_REMITTANCE'
          : 'SETTLED'
        : overdue > 0
          ? 'OVERDUE'
          : paid > 0
            ? 'PARTIAL'
            : 'ACTIVE',
    paid,
    remaining,
    overdue,
    heldByKara,
    receivedByCreditor,
    receivable: cancelled
      ? 0
      : Math.max(0, data.totalAmount - receivedByCreditor),
    schedule: installments,
    payments,
    remittances,
  }
}

export async function myGroupAgreements(
  db: Firestore,
  groupId: string,
  viewerIds: Set<string>,
): Promise<MyGroupAgreement[]> {
  const snapshots = await Promise.all(
    [...viewerIds].map((id) =>
      db
        .collection('groups')
        .doc(groupId)
        .collection('agreements')
        .where('partyIds', 'array-contains', id)
        .select(
          'groupId',
          'title',
          'description',
          'agreementDate',
          'creditorId',
          'creditorMatricule',
          'creditorName',
          'debtorId',
          'debtorMatricule',
          'debtorName',
          'quantity',
          'unitAmount',
          'totalAmount',
          'status',
          'schedule',
          'payments',
          'remittances',
        )
        .get(),
    ),
  )
  const documents = new Map(
    snapshots.flatMap((s) => s.docs).map((d) => [d.id, d]),
  )
  return [...documents.values()]
    .flatMap((doc) => {
      const projection = projectMyAgreement(
        doc.id,
        groupId,
        doc.data(),
        viewerIds,
      )
      return projection ? [projection] : []
    })
    .sort(
      (a, b) =>
        b.agreementDate.localeCompare(a.agreementDate) ||
        a.id.localeCompare(b.id),
    )
}
