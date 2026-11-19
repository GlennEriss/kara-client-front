import { computeShopCreditStats } from '@/utils/shop-credit-stats'
import type { AdminServices } from './context'
type Row = Record<string, any>
export function shopMatchesTab(row: Row, tab: string) {
  const status = row.status ?? 'approved'
  if (tab === 'pending') return status === 'pending' || !!row.pendingChanges
  if (tab === 'published') return status === 'approved' && !!row.isActive
  if (tab === 'hidden') return status !== 'pending' && !row.isActive
  return true
}
export function eventMatchesTab(row: Row, tab: string, now = new Date()) {
  if (tab === 'upcoming')
    return (
      ['published', 'poll_open', 'location_confirmed'].includes(row.status) &&
      new Date(row.startDate) >= now
    )
  if (tab === 'past')
    return (
      ['completed', 'published', 'location_confirmed'].includes(row.status) &&
      new Date(row.startDate) <= now
    )
  return !tab || row.status === tab
}
export function communityMatches(row: Row, input: Row, module: string) {
  if (
    module === 'shops' &&
    input.shopTab &&
    !shopMatchesTab(row, input.shopTab)
  )
    return false
  if (module === 'events') {
    if (input.eventTab && !eventMatchesTab(row, input.eventTab)) return false
    if (input.type && row.type !== input.type) return false
  }
  return true
}
export async function communityRows(
  services: AdminServices,
  module: string,
  dataset: string,
  rows: Row[],
): Promise<Row[]> {
  if (module === 'shops' && dataset === 'shops') {
    const [articles, partners, contracts] = await Promise.all([
      services.shops.listShopArticles(),
      services.shops.listShopCreditPartners(),
      services.creditSpeciale.getContractsWithFilters({
        creditType: 'SPECIALE',
      }),
    ])
    const stats = computeShopCreditStats(contracts)
    return rows.map((row) => ({
      ...row,
      shopView: {
        articleCount: articles.filter((a) => a.shopId === row.id).length,
        publishedArticles: articles.filter(
          (a) => a.shopId === row.id && a.status === 'approved',
        ).length,
        pendingArticles: articles.filter(
          (a) => a.shopId === row.id && a.status === 'pending',
        ).length,
        partner: partners.find((p) => p.shopId === row.id) || null,
        credit: stats.find((s) => s.shopId === row.id) || null,
      },
    }))
  }
  if (module === 'events')
    return rows.map((row) => {
      const time = (date: any) =>
        date
          ? new Intl.DateTimeFormat('fr-FR', {
              timeZone: 'Africa/Libreville',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            }).format(new Date(date))
          : ''
      return {
        ...row,
        startTime: time(row.startDate),
        endTime: time(row.endDate),
        pollCloseTime: time(row.pollClosesAt),
        pollResults: services.events.computePollResults(row as any),
      }
    })
  return rows
}
export function communityMetrics(module: string, dataset: string, rows: Row[]) {
  const metric = (label: string, value: number) => ({ label, value })
  if (module === 'shops' && dataset === 'shops')
    return [
      metric('Total', rows.length),
      metric('À valider', rows.filter((r) => r.status === 'pending').length),
      metric(
        'Publiées',
        rows.filter((r) => shopMatchesTab(r, 'published')).length,
      ),
      metric(
        'Masquées',
        rows.filter(
          (r) => !shopMatchesTab(r, 'published') && r.status !== 'pending',
        ).length,
      ),
      metric(
        'Catégories',
        new Set(rows.map((r) => r.category?.trim()).filter(Boolean)).size,
      ),
      metric(
        'Avec articles',
        rows.filter((r) => r.shopView?.publishedArticles > 0).length,
      ),
      metric(
        'Modifications à valider',
        rows.filter((r) => r.pendingChanges).length,
      ),
    ]
  if (module === 'events')
    return [
      metric('Total', rows.length),
      ...[
        ['upcoming', 'À venir'],
        ['poll_open', 'Sondages'],
        ['draft', 'Brouillons'],
        ['past', 'Passés'],
        ['cancelled', 'Annulés'],
      ].map(([tab, label]) =>
        metric(label, rows.filter((r) => eventMatchesTab(r, tab)).length),
      ),
    ]
  return null
}
export function communityInsights(module: string, rows: Row[]) {
  const groups: {
    title: string
    money?: boolean
    items: { label: string; value: number }[]
  }[] = []
  if (module === 'shops') {
    groups.push({
      title: 'Visibilité dans l’annuaire',
      items: [
        ['published', 'Publiées'],
        ['pending', 'À valider'],
        ['hidden', 'Masquées'],
      ].map(([tab, label]) => ({
        label,
        value: rows.filter((r) => shopMatchesTab(r, tab)).length,
      })),
    })
    for (const row of rows)
      if (row.shopView?.credit) {
        const stats = row.shopView.credit
        groups.push({
          title: `Achats à crédit — ${row.name}`,
          money: true,
          items: [
            ['financed', 'Financé'],
            ['paidToVendors', 'Versé aux vendeurs'],
            ['dueToVendors', 'À verser aux vendeurs'],
            ['discountEarned', 'Remises'],
            ['interest', 'Intérêts prévus'],
            ['repaid', 'Remboursé'],
          ].map(([key, label]) => ({ label, value: stats[key] })),
        })
      }
  }
  return {
    groups,
    upcoming:
      module === 'events'
        ? rows
            .filter((r) => eventMatchesTab(r, 'upcoming'))
            .sort((a, b) =>
              String(a.startDate).localeCompare(String(b.startDate)),
            )
            .slice(0, 5)
            .map((r) => ({ id: r.id, label: r.title, date: r.startDate }))
        : [],
  }
}
