import type { ContributionFrequency } from './types/group'

export const groupContributionFrequency = (
  value: unknown,
): ContributionFrequency =>
  value === 'DAILY' || value === 'WEEKLY' ? value : 'MONTHLY'
export function isGroupPeriod(
  value: unknown,
  frequency?: ContributionFrequency,
): value is string {
  if (typeof value !== 'string') return false
  if (frequency === 'MONTHLY' || (!frequency && value.length === 7))
    return /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T12:00:00Z`)
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  )
}
export function groupPeriodLabel(
  period: string,
  frequency?: ContributionFrequency,
): string {
  if (!isGroupPeriod(period)) return 'Période à préciser'
  const monthly = period.length === 7
  const date = new Date(`${period}${monthly ? '-01' : ''}T12:00:00Z`)
  const label = date.toLocaleDateString('fr-FR', {
    timeZone: 'Africa/Libreville',
    ...(monthly ? {} : { day: 'numeric' as const }),
    month: 'long',
    year: 'numeric',
  })
  return frequency === 'WEEKLY' ? `Semaine du ${label}` : label
}
