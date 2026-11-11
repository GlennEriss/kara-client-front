import routes from '@/constantes/routes'
import { UNKNOWN_USER_ID } from '@/domains/financial/caisse-imprevue/import/unknownUser'
import { toReportDate } from '@/domains/financial/reports/utils/report-months'
import type { DashboardRankingItem } from '../entities/dashboard.types'

export type RankingMember = { id: string; matricule?: string; firstName?: string; lastName?: string }
export type RankingRange = { from: Date; to: Date } | null
export const rankingText = (value: unknown) => typeof value === 'string' ? value.trim() : ''
export const rankingMoney = (value: unknown) => Number.isFinite(Number(value)) ? Math.max(0, Math.round(Number(value))) : 0

export function rankingDate(value: unknown, range: RankingRange, now: Date): Date | null {
  const date = toReportDate(value)
  return date && date <= now && (!range || (date >= range.from && date <= range.to)) ? date : null
}

export function rankingIdentity(members: RankingMember[]) {
  const byId = new Map<string, RankingMember>()
  for (const member of members) {
    byId.set(member.id, member)
    if (member.matricule) byId.set(member.matricule, member)
  }
  return (rawId: unknown, fallback = '', alternateId?: unknown): DashboardRankingItem | null => {
    const id = rankingText(rawId) || rankingText(alternateId)
    const member = byId.get(id) ?? byId.get(rankingText(alternateId))
    if (!id || id === UNKNOWN_USER_ID || member?.id === UNKNOWN_USER_ID || member?.matricule === UNKNOWN_USER_ID) return null
    return {
      id: member?.id || id,
      label: member ? [member.lastName, member.firstName].filter(Boolean).join(' ') || fallback || id : fallback || id,
      subLabel: member?.matricule || id,
      value: 0,
      href: routes.admin.membershipDetails(encodeURIComponent(member?.id || id)),
    }
  }
}

/** All rows are retained. Only the card preview is limited to ten. */
export const sortedRanking = (items: DashboardRankingItem[]) => items
  .filter(item => Number.isFinite(item.value) && item.value > 0)
  .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'fr') || (a.id || '').localeCompare(b.id || ''))

export function addRankingValue(map: Map<string, DashboardRankingItem>, item: DashboardRankingItem | null, value: number) {
  if (!item?.id || !Number.isFinite(value)) return
  map.set(item.id, { ...item, value: (map.get(item.id)?.value || 0) + value })
}
