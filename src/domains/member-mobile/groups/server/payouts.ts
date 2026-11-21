// Source métier : kara-members-front/features/groups/server/payouts.ts
import type { Firestore, DocumentData } from 'firebase-admin/firestore'
import type { MemberProject } from '../types/group'
import { groupContributionFrequency, isGroupPeriod } from '../periods'
/** Only verified viewers' own remittances. No actor, administrative note, reference or other beneficiary is exposed. */
export async function withMyPayouts(
  db: Firestore,
  projects: MemberProject[],
  rawProjects: DocumentData[],
  groupId: string,
  viewerIds: Set<string>,
): Promise<MemberProject[]> {
  if (!projects.some((p) => p.kind === 'TONTINE')) return projects
  const snapshots = await Promise.all(
    [...viewerIds].map((id) =>
      db
        .collection('groupPayouts')
        .where('beneficiaryId', '==', id)
        .select(
          'groupId',
          'projectId',
          'period',
          'frequency',
          'date',
          'grossAmount',
          'feeAmount',
          'netAmount',
        )
        .get(),
    ),
  )
  const records = [
    ...new Map(
      snapshots.flatMap((s) => s.docs.map((d) => [d.id, d.data()] as const)),
    ).values(),
  ].filter((d) => d.groupId === groupId)
  return projects.map((project) => {
    if (project.kind !== 'TONTINE') return project
    const raw = rawProjects.find((p) => p?.id === project.id)
    const fee = raw?.payoutFee
    const amount =
      fee?.enabled && Number.isSafeInteger(fee.amount) && fee.amount > 0
        ? fee.amount
        : 0
    return {
      ...project,
      contributionFrequency: groupContributionFrequency(
        raw?.contributionPlan?.frequency,
      ),
      payoutFee: { enabled: amount > 0, amount },
      myPayouts: records
        .filter(
          (d) =>
            d.projectId === project.id &&
            [d.grossAmount, d.feeAmount, d.netAmount].every(
              (n) => Number.isSafeInteger(n) && n >= 0,
            ) &&
            d.grossAmount - d.feeAmount === d.netAmount &&
            isGroupPeriod(d.period) &&
            isGroupPeriod(d.date, 'DAILY'),
        )
        .map((d) => ({
          period: d.period,
          ...(d.frequency === 'DAILY' ||
          d.frequency === 'WEEKLY' ||
          d.frequency === 'MONTHLY'
            ? { frequency: d.frequency }
            : {}),
          date: d.date,
          grossAmount: d.grossAmount,
          feeAmount: d.feeAmount,
          netAmount: d.netAmount,
        }))
        .sort((a, b) => b.period.localeCompare(a.period)),
    }
  })
}
