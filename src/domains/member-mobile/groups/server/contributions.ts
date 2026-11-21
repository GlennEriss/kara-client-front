// Source métier : kara-members-front/features/groups/server/contributions.ts
import type { Firestore, DocumentData } from 'firebase-admin/firestore'
import type { MemberProject, MyGroupContribution } from '../types/group'
import { groupContributionFrequency, isGroupPeriod } from '../periods'
const amount = (n: unknown) =>
  Number.isFinite(Number(n)) ? Math.max(0, Number(n)) : 0
/** No member write endpoint. Only the verified viewer's rows are read and
 * administrative references, actors and notes never enter this DTO. */
export async function withMyContributions(
  db: Firestore,
  projects: MemberProject[],
  rawProjects: DocumentData[],
  groupId: string,
  viewerIds: Set<string>,
): Promise<MemberProject[]> {
  const configured = rawProjects.filter(
    (p) =>
      p &&
      typeof p === 'object' &&
      p.kind === 'TONTINE' &&
      Array.isArray(p.contributionPlan?.periods) &&
      Array.isArray(p.contributionPlan?.participants),
  )
  if (!configured.length) return projects
  const lists = await Promise.all(
    [...viewerIds].map((id) =>
      db
        .collection('groups')
        .doc(groupId)
        .collection('contributions')
        .where('memberId', '==', id)
        .select(
          'projectId',
          'period',
          'dueDate',
          'amount',
          'payments',
          'financingDemandId',
          'financingContractId',
        )
        .get(),
    ),
  )
  const records = [
    ...new Map(
      lists.flatMap((q) =>
        q.docs.map((d) => [d.id, { ...d.data(), id: d.id }] as const),
      ),
    ).values(),
  ] as (DocumentData & { id: string })[]
  return projects.map((project) => {
    const raw = configured.find((p) => p.id === project.id)
    if (!raw) return project
    const plan = raw.contributionPlan
    const frequency = groupContributionFrequency(plan.frequency)
    const member = plan.participants.find((p: DocumentData) =>
      viewerIds.has(p.id),
    )
    if (!member) return project
    const myContributions: MyGroupContribution[] = plan.periods
      .filter(
        (p: DocumentData) =>
          isGroupPeriod(p.period, frequency) &&
          isGroupPeriod(p.dueDate, 'DAILY'),
      )
      .map((period: DocumentData) => {
        const row = records.find(
          (r) => r.projectId === project.id && r.period === period.period,
        )
        const payments = (Array.isArray(row?.payments) ? row.payments : [])
          .filter((p: DocumentData) => amount(p.amount) > 0)
          .map((p: DocumentData) => ({
            amount: amount(p.amount),
            date: typeof p.date === 'string' ? p.date : '',
            kind:
              p.source === 'CREDIT_FIXE'
                ? ('SUPPORT' as const)
                : ('DIRECT' as const),
          }))
        const total = amount(row?.amount ?? plan.amount),
          paid = payments.reduce(
            (n: number, p: { amount: number }) => n + p.amount,
            0,
          )
        const support =
          row && project.myCredits?.find((c) => c.contributionId === row?.id)
        const pending =
          row &&
          project.myCreditDemands?.find(
            (d) =>
              d.contributionId === row?.id &&
              !['REJECTED', 'CANCELED'].includes(d.status),
          )
        const status: MyGroupContribution['status'] =
          paid >= total
            ? payments.some((p: { kind: string }) => p.kind === 'SUPPORT')
              ? 'SUPPORTED'
              : 'PAID'
            : support || pending
              ? 'PENDING_SUPPORT'
              : paid > 0
                ? 'PARTIAL'
                : 'DUE'
        return {
          period: period.period,
          dueDate:
            typeof row?.dueDate === 'string' ? row.dueDate : period.dueDate,
          amount: total,
          paidAmount: paid,
          remaining: Math.max(0, total - paid),
          status,
          payments,
          ...(support
            ? {
                support: {
                  status: support.status,
                  amount: support.amount,
                  amountPaid: support.amountPaid,
                  amountRemaining: support.amountRemaining,
                  ...(support.totalAmount !== undefined
                    ? { totalAmount: support.totalAmount }
                    : {}),
                  ...(support.nextDueAt
                    ? { nextDueAt: support.nextDueAt }
                    : {}),
                },
              }
            : {}),
        }
      })
    return {
      ...project,
      myContributions,
      contributionFrequency: frequency,
      myCredits: project.myCredits?.filter((c) => !c.contributionId),
      myCreditDemands: project.myCreditDemands?.filter(
        (d) => !d.contributionId,
      ),
    }
  })
}
