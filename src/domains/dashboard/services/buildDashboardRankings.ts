import routes from '@/constantes/routes'
import { buildFinancialReportContracts } from '@/domains/financial/reports/builders/buildFinancialReportDetails'
import type { FinancialReportSources, SourceRecord } from '@/domains/financial/reports/entities/financial-report-sources.types'
import type { FinancialReport } from '@/domains/financial/reports/entities/financial-report.types'
import type { CreditType } from '@/types/types'
import { toReportDate } from '@/domains/financial/reports/utils/report-months'
import type { DashboardRankingBlock, DashboardRankingItem } from '../entities/dashboard.types'

type FinancialTab = 'caisse_speciale' | 'caisse_imprevue' | 'credit_speciale' | 'credit_fixe' | 'credit_aide' | 'placements'
type Member = { id: string; matricule?: string; firstName?: string; lastName?: string; createdAt?: unknown; dossier?: unknown }
type Range = { from: Date; to: Date } | null
const text = (value: unknown) => typeof value === 'string' ? value.trim() : ''
const amount = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0
const objects = (value: unknown): Record<string, unknown>[] => Array.isArray(value)
  ? value.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object') : []

function recentRanking(key: string, title: string, description: string, entries: { item: DashboardRankingItem; date: Date }[], range: Range, now: Date): DashboardRankingBlock {
  const latest = new Map<string, { item: DashboardRankingItem; date: Date }>()
  for (const entry of entries) {
    if (!entry.item.id || entry.date > now || (range && (entry.date < range.from || entry.date > range.to))) continue
    const previous = latest.get(entry.item.id)
    if (!previous || entry.date > previous.date) latest.set(entry.item.id, entry)
  }
  return {
    key, title, description, kind: 'recent',
    items: [...latest.values()]
      .sort((a, b) => b.date.getTime() - a.date.getTime() || a.item.id!.localeCompare(b.item.id!))
      .slice(0, 10)
      .map(({ item, date }) => ({ ...item, value: 0, date: date.toISOString() })),
  }
}

/** New members, rather than new requests still awaiting validation. */
export function buildRecentMembersRanking(members: Member[], requests: SourceRecord[], range: Range, now: Date): DashboardRankingBlock {
  const approved = requests.filter(request => text(request.status).toLowerCase() === 'approved')
  const byId = new Map(approved.map(request => [request.id, request]))
  const byMatricule = new Map(approved.map(request => [text(request.matricule), request]))
  const entries = members.flatMap(member => {
    const request = byId.get(text(member.dossier)) ?? byMatricule.get(member.matricule || member.id)
    const approvedAt = toReportDate(request?.approvedAt)
    const date = approvedAt ?? toReportDate(member.createdAt)
    if (!date) return []
    return [{
      item: {
        id: member.id, label: [member.lastName, member.firstName].filter(Boolean).join(' ') || member.matricule || member.id,
        value: 0, subLabel: `${member.matricule || member.id} · ${approvedAt ? 'Adhésion approuvée' : 'Fiche membre créée'}`,
        href: routes.admin.membershipDetails(encodeURIComponent(member.id)),
      }, date,
    }]
  })
  return recentRanking('recent_members', 'Les 10 membres les plus récents',
    'Dans la période et le périmètre sélectionnés. Date d’approbation de l’adhésion si disponible, sinon date de création de la fiche membre.', entries, range, now)
}

/** Reads the already-loaded sources. Flow rankings use actual payment dates;
 * stocks use the same per-contract engines as the financial report. */
export function buildDashboardFinancialRankings(
  sources: FinancialReportSources,
  report: FinancialReport,
  module: FinancialTab,
  members: Member[],
  range: Range,
  now: Date,
): DashboardRankingBlock[] {
  const memberById = new Map<string, Member>()
  for (const member of members) {
    memberById.set(member.id, member)
    if (member.matricule) memberById.set(member.matricule, member)
  }
  const creditTypes: Partial<Record<FinancialTab, CreditType>> = { credit_speciale: 'SPECIALE', credit_fixe: 'FIXE', credit_aide: 'AIDE' }
  const creditType = creditTypes[module]
  const contracts: SourceRecord[] = module === 'caisse_speciale' ? sources.caisseSpecialeContracts
    : module === 'caisse_imprevue' ? sources.caisseImprevueContracts
      : module === 'placements' ? sources.placements
        : sources.creditContracts.filter(c => c.creditType === creditType) as unknown as SourceRecord[]
  const byContract = new Map(contracts.map(contract => [contract.id, contract]))
  const identity = (contract: SourceRecord): DashboardRankingItem | null => {
    const groupId = text(contract.groupeId ?? contract.groupId)
    if (groupId || text(contract.contractType).toUpperCase() === 'GROUP') return null
    const id = text(contract.clientId ?? contract.memberId ?? contract.benefactorId)
    if (!id) return null
    const member = memberById.get(id)
    const label = member ? [member.lastName, member.firstName].filter(Boolean).join(' ') : ''
    const fallback = [contract.clientLastName ?? contract.memberLastName, contract.clientFirstName ?? contract.memberFirstName].map(text).filter(Boolean).join(' ')
    return {
      id: member?.id || id || `contract:${contract.id}`,
      label: label || fallback || text(contract.benefactorName ?? contract.memberName) || id || 'Personne non identifiée',
      subLabel: member?.matricule || id || contract.id,
      href: id ? routes.admin.membershipDetails(encodeURIComponent(member?.id || id)) : undefined,
      value: 0,
    }
  }
  const incoming = new Map<string, DashboardRankingItem>()
  const add = (id: string, value: unknown, date: unknown) => {
    const contract = byContract.get(id)
    const paidAt = toReportDate(date)
    const paid = amount(value)
    if (!contract || !paidAt || paidAt > now || paid <= 0 || (range && (paidAt < range.from || paidAt > range.to))) return
    const party = identity(contract)
    if (!party?.id) return
    const previous = incoming.get(party.id!)
    incoming.set(party.id!, { ...party, value: (previous?.value ?? 0) + paid })
  }
  if (module === 'caisse_speciale') {
    for (const payment of sources.caisseSpecialePayments) {
      const contributions = [...objects(payment.contribs), ...objects(payment.groupContributions)]
      if (contributions.length) {
        for (const row of contributions) add(payment.parentId, row.amount, row.paidAt ?? row.createdAt ?? payment.paidAt)
      } else if (payment.status === 'PAID') add(payment.parentId, payment.amount, payment.paidAt)
    }
  } else if (module === 'caisse_imprevue') {
    for (const payment of sources.caisseImprevuePayments) {
      const contributions = objects(payment.versements)
      if (contributions.length) {
        for (const row of contributions) add(payment.parentId, row.amount, row.date ?? row.createdAt)
      } else add(payment.parentId, payment.accumulatedAmount, payment.updatedAt ?? payment.createdAt)
    }
  } else if (module === 'placements') {
    for (const placement of contracts) {
      if (!['Draft', 'Canceled'].includes(String(placement.status)))
        add(placement.id, placement.amount, placement.handoverDate ?? placement.startDate ?? placement.createdAt)
    }
  } else {
    for (const payment of sources.creditPayments) {
      if (!['DRAFT', 'PENDING', 'APPROVED', 'SIMULATED'].includes(text(byContract.get(payment.creditId)?.status)))
        add(payment.creditId, payment.amount, payment.paymentDate)
    }
  }

  // Do not run every financial module's per-contract calculations for one tab.
  const scoped: FinancialReportSources = {
    caisseSpecialeContracts: [], caisseSpecialePayments: [], caisseSpecialeRefunds: [],
    caisseImprevueContracts: [], caisseImprevuePayments: [], caisseImprevueSupports: [], caisseImprevueRefunds: [],
    creditContracts: [], creditPayments: [], creditPenalties: [], guarantorPayments: [],
    placements: [], placementCommissions: [], placementEarlyExits: [], membershipRequests: [],
  }
  const keys: (keyof FinancialReportSources)[] = module === 'caisse_speciale'
    ? ['caisseSpecialeContracts', 'caisseSpecialePayments', 'caisseSpecialeRefunds']
    : module === 'caisse_imprevue'
      ? ['caisseImprevueContracts', 'caisseImprevuePayments', 'caisseImprevueSupports', 'caisseImprevueRefunds']
      : module === 'placements' ? ['placements', 'placementCommissions', 'placementEarlyExits']
        : ['creditContracts', 'creditPayments', 'creditPenalties', 'guarantorPayments']
  for (const key of keys) Object.assign(scoped, { [key]: sources[key] })
  if (creditType) scoped.creditContracts = sources.creditContracts.filter(c => c.creditType === creditType)
  const dossiers = buildFinancialReportContracts(scoped, report).filter(c => c.module === module)
  const stock = new Map<string, DashboardRankingItem>()
  const late = new Map<string, DashboardRankingItem>()
  const lateCount = new Map<string, number>()
  for (const dossier of dossiers) {
    const contract = byContract.get(dossier.sourceId)
    if (!contract) continue
    const read = (block: string, line: string) => dossier.blocks.find(b => b.key === block)?.lines.find(l => l.key === line)?.total ?? 0
    const held = read('outstanding', module === 'placements' ? 'capital_to_return' : creditType ? 'receivables' : 'funds_held')
    const party = identity(contract)
    if (!party?.id) continue
    if (held > 0) stock.set(party.id!, { ...party, value: (stock.get(party.id!)?.value ?? 0) + held })
    const overdue = read('risks', 'late_amount')
    if (overdue > 0) {
      const count = (lateCount.get(party.id) ?? 0) + 1
      lateCount.set(party.id, count)
      late.set(party.id, { ...party, value: (late.get(party.id)?.value ?? 0) + overdue,
        subLabel: `${party.subLabel} · ${count} contrat(s) en retard`,
      })
    }
  }
  const top = (items: DashboardRankingItem[]) => items
    .map(item => ({ ...item, value: Math.round(item.value) }))
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'fr') || (a.id ?? '').localeCompare(b.id ?? ''))
    .slice(0, 10)
  const periodDescription = range
    ? `Versements du ${range.from.toLocaleDateString('fr-FR', { timeZone: 'Africa/Libreville' })} au ${range.to.toLocaleDateString('fr-FR', { timeZone: 'Africa/Libreville' })}, regroupés par membre.`
    : 'Versements enregistrés depuis le début, regroupés par membre.'
  const ranking = (key: string, title: string, items: DashboardRankingItem[], description: string): DashboardRankingBlock => ({
    key, title, description, unit: 'FCFA', items: top(items),
  })
  const flowTitle = module === 'placements' ? 'Top 10 des membres — Capitaux confiés' : creditType ? 'Top 10 des membres — Remboursements reçus' : 'Top 10 des membres — Versements reçus'
  const stockTitle = module === 'placements' ? 'Top 10 des membres — Capitaux à restituer' : creditType ? 'Top 10 des membres — Restes à rembourser' : 'Top 10 des membres — Épargne détenue'
  const rankings = [
    ranking('top_received', flowTitle, [...incoming.values()], periodDescription),
    ranking('top_outstanding', stockTitle, [...stock.values()], 'Situation à ce jour, tous contrats confondus. Les filtres de type de membre et de zone sont appliqués ; la période ne limite pas ce stock.'),
  ]
  if (creditType) rankings.push({ ...ranking('top_late', 'Top 10 des membres — Retards les plus importants', [...late.values()],
    'Montants exigibles encore impayés à ce jour, regroupés par membre avec le nombre de contrats concernés. Un retard est une priorité de suivi, pas une perte définitive.'), tone: 'danger' })
  const recent = contracts.flatMap(contract => {
    const party = identity(contract)
    const date = toReportDate(contract.createdAt ?? contract.disbursementDate ?? contract.handoverDate ?? contract.startDate)
    const status = text(contract.status).toUpperCase()
    if (!party || !date || ['DRAFT', 'PENDING', 'APPROVED', 'SIMULATED', 'CANCELED', 'CANCELLED', 'REJECTED', 'REFUSED'].includes(status)) return []
    return [{ item: { ...party, subLabel: `${party.subLabel} · Dossier ${contract.id}` }, date }]
  })
  rankings.push(recentRanking('recent_subscribers', 'Les 10 dernières souscriptions de membres',
    'Derniers dossiers créés dans cette section et la période choisie, hors brouillons et demandes non finalisées. Un membre apparaît une seule fois, avec sa souscription la plus récente.', recent, range, now))
  return rankings
}
