import {
  contributionId,
  plannedContribution,
  type GroupContribution,
} from '@/domains/groups/contribution-model'
import type { GroupProject } from '@/types/types'
/** Resolve a scheduled row before its first payment, just as the web workspace does. */
export function findPlannedContribution(
  project: GroupProject,
  id: string,
): GroupContribution | undefined {
  const plan = project.contributionPlan
  if (!plan) return undefined
  for (const period of plan.periods)
    for (const member of plan.participants) {
      if (contributionId(project.id, period.period, member.id) === id)
        return plannedContribution(project, period.period, member.id)
    }
}
