import type { DashboardFilters, DashboardRankingBlock, DashboardRankingItem, DashboardTabPayload } from '../entities/dashboard.types'

export interface DashboardExportContext {
  title: string
  generatedAt: string
  filters: DashboardFilters
  baseUrl?: string
}
export interface DashboardExportData {
  context: DashboardExportContext
  payload: DashboardTabPayload
  rankingOnly?: boolean
  search?: string
}

export const fullRankingTitle = (title: string) => title.replace(/^Top 10 des /i, '').replace(/^Les 10 /i, 'Les ')
const dayLabel = (date: Date) => date.toLocaleDateString('fr-FR', { timeZone: 'Africa/Libreville' })
export function dashboardPeriodLabel(context: DashboardExportContext): string {
  const { filters } = context
  if (filters.period === 'all') return 'Depuis le début'
  if (filters.period === 'custom') return `Du ${filters.customFrom || '…'} au ${filters.customTo || '…'}`
  const local = new Date(new Date(context.generatedAt).getTime() + 3_600_000)
  const end = local.toISOString().slice(0, 10)
  const first = new Date(local)
  if (filters.period === '7d') first.setUTCDate(first.getUTCDate() - 6)
  if (filters.period === '30d') first.setUTCDate(first.getUTCDate() - 29)
  if (filters.period === 'month') first.setUTCDate(1)
  return `Du ${dayLabel(new Date(`${first.toISOString().slice(0, 10)}T12:00:00+01:00`))} au ${dayLabel(new Date(`${end}T12:00:00+01:00`))}`
}
export function dashboardScopeLabel(filters: DashboardFilters): string {
  const types = { all: 'Tous les membres', adherant: 'Adhérents', bienfaiteur: 'Bienfaiteurs', sympathisant: 'Sympathisants' }
  const comparison = { all: 'Tous les modules', caisse: 'Caisses', credit: 'Crédits', placement: 'Placements' }
  return [types[filters.memberType], filters.zoneProvince === 'all' ? 'Toutes les provinces' : filters.zoneProvince,
    filters.zoneCity === 'all' ? 'Toutes les villes' : filters.zoneCity, comparison[filters.moduleCompare]].join(' · ')
}
export function dashboardExportMetadata(data: DashboardExportData): string[] {
  return [data.context.title, `Filtre de période : ${dashboardPeriodLabel(data.context)}`,
    dashboardScopeLabel(data.context.filters),
    `Données générées le ${new Date(data.context.generatedAt).toLocaleString('fr-FR', { timeZone: 'Africa/Libreville' })} (Libreville)`,
    ...(data.search?.trim() ? [`Recherche : ${data.search.trim()}`] : []),
    'Les stocks et les mentions « ce mois » suivent la date du calcul ; la description de chaque classement précise sa base.']
}
export function rankingValue(item: DashboardRankingItem, ranking: DashboardRankingBlock): string | number {
  return ranking.kind === 'recent' ? item.date ? dayLabel(new Date(item.date)) : '' : item.value
}
export function rankingValueLabel(ranking: DashboardRankingBlock): string {
  return ranking.kind === 'recent' ? 'Date (Libreville)' : ranking.unit === 'FCFA' ? 'Montant (FCFA)' : `Nombre${ranking.unit ? ` (${ranking.unit})` : ''}`
}
export function exportLink(href: string | undefined, origin: string | undefined): string | undefined {
  if (!href || !origin) return undefined
  try {
    const url = new URL(href, origin)
    return url.origin === new URL(origin).origin ? url.href : undefined
  } catch { return undefined }
}
export function dashboardOverviewRows(payload: DashboardTabPayload): Array<[string, string, number | string, string]> {
  return [
    ...payload.kpis.map(k => ['Indicateur', [k.label, k.subtitle].filter(Boolean).join(' — '), k.value, k.format === 'currency' ? 'FCFA' : k.format === 'percent' ? '%' : 'Nombre'] as [string, string, number, string]),
    ...(payload.financialSections || []).flatMap(section => section.lines.map(line => [section.title, [line.label, line.description].filter(Boolean).join(' — '), line.value, line.format === 'currency' ? 'FCFA' : line.format === 'percent' ? '%' : 'Nombre'] as [string, string, number, string])),
    ...(payload.distributions || []).flatMap(block => block.items.map(item => [block.title, item.label, item.value, block.unit || 'Nombre'] as [string, string, number, string])),
    ...(payload.notes || []).map(note => ['Note de lecture', note, '', ''] as [string, string, string, string]),
  ]
}
