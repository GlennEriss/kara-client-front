// Source métier : kara-members-front/features/groups/server/projectCredits.ts
import type {
  Firestore,
  DocumentData,
  QueryDocumentSnapshot,
} from 'firebase-admin/firestore'
import type { MemberProject } from '../types/group'

const isProjectCreditType = (value: unknown) =>
  value === 'FIXE' || value === 'SPECIALE'

const number = (value: unknown) =>
  Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0

const dateOf = (value: unknown): string | undefined => {
  const raw = value as { toDate?: () => Date } | null
  const date =
    typeof raw?.toDate === 'function'
      ? raw.toDate()
      : value instanceof Date
        ? value
        : typeof value === 'string'
          ? new Date(value)
          : null
  return date && Number.isFinite(date.getTime())
    ? date.toISOString()
    : undefined
}

/** Query by the verified viewer's identity, never by a group-wide finance
 * filter. Other participants' contracts and debts cannot enter this DTO. */
export async function withMyProjectCredits(
  db: Firestore,
  projects: MemberProject[],
  groupId: string,
  viewerIds: Set<string>,
): Promise<MemberProject[]> {
  if (!projects.length) return projects
  const ids = [...viewerIds]
  const record = (
    doc: QueryDocumentSnapshot,
  ): DocumentData & { id: string } => ({ ...doc.data(), id: doc.id })
  const [credits, demands] = await Promise.all([
    Promise.all(
      ids.map((id) =>
        db
          .collection('creditContracts')
          .where('clientId', '==', id)
          .select(
            'creditType',
            'groupProject',
            'status',
            'amount',
            'amountPaid',
            'amountRemaining',
            'totalAmount',
            'nextDueAt',
          )
          .get(),
      ),
    ),
    Promise.all(
      ids.map((id) =>
        db
          .collection('creditDemands')
          .where('clientId', '==', id)
          .select(
            'creditType',
            'groupProject',
            'status',
            'amount',
            'contractId',
          )
          .get(),
      ),
    ),
  ])
  const contracts = [
    ...new Map(
      credits.flatMap((q) =>
        q.docs.map((doc) => [doc.id, record(doc)] as const),
      ),
    ).values(),
  ].filter(
    (c) =>
      isProjectCreditType(c.creditType) && c.groupProject?.groupId === groupId,
  )
  const requests = [
    ...new Map(
      demands.flatMap((q) =>
        q.docs.map((doc) => [doc.id, record(doc)] as const),
      ),
    ).values(),
  ].filter(
    (d) =>
      isProjectCreditType(d.creditType) && d.groupProject?.groupId === groupId,
  )
  return projects.map((project) => {
    const mine = contracts.filter(
      (c) => c.groupProject.projectId === project.id,
    )
    return {
      ...project,
      myCredits: mine.map((c) => ({
        id: c.id,
        status: typeof c.status === 'string' ? c.status : '',
        amount: number(c.amount),
        amountPaid: number(c.amountPaid),
        amountRemaining: number(c.amountRemaining),
        ...(typeof c.groupProject?.contributionId === 'string'
          ? { contributionId: c.groupProject.contributionId }
          : {}),
        ...(typeof c.totalAmount === 'number' &&
        Number.isFinite(c.totalAmount) &&
        c.totalAmount >= 0
          ? { totalAmount: c.totalAmount }
          : {}),
        ...(dateOf(c.nextDueAt) ? { nextDueAt: dateOf(c.nextDueAt) } : {}),
      })),
      myCreditDemands: requests
        .filter(
          (d) =>
            d.groupProject.projectId === project.id &&
            !mine.some((c) => c.id === d.contractId),
        )
        .map((d) => ({
          id: d.id,
          status: typeof d.status === 'string' ? d.status : '',
          amount: number(d.amount),
          ...(typeof d.groupProject?.contributionId === 'string'
            ? { contributionId: d.groupProject.contributionId }
            : {}),
        })),
    }
  })
}
