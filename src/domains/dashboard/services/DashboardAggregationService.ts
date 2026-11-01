import { firebaseCollectionNames } from '@/constantes/firebase-collection-names'
import routes from '@/constantes/routes'
import type { Firestore } from 'firebase-admin/firestore'
import type { DashboardTabKey } from '../entities/dashboard-tabs.types'
import type {
    DashboardDistributionBlock,
    ExecutiveActiveMembersPage,
    DashboardFilterOptions,
    DashboardFilters,
    DashboardKpiItem,
    DashboardMemberTypeFilter,
    DashboardRankingBlock,
    DashboardSnapshot,
    DashboardTabPayload,
} from '../entities/dashboard.types'
import { addContractMonths } from '@/utils/contract-months'
import { buildFinancialReport } from '@/domains/financial/reports/builders/buildFinancialReport'
import type { FinancialReport, FinancialReportModuleKey } from '@/domains/financial/reports/entities/financial-report.types'
import type { FinancialReportSources } from '@/domains/financial/reports/entities/financial-report-sources.types'
import { loadFinancialReportSources } from '@/domains/financial/reports/services/loadFinancialReportSources'
import { currentMonthKey } from '@/domains/financial/reports/utils/report-months'

type FirestoreRecord = Record<string, unknown> & { id: string }

const MEMBER_ROLES = new Set(['Adherant', 'Bienfaiteur', 'Sympathisant'])

interface DashboardMemberRecord extends FirestoreRecord {
  firstName?: string
  lastName?: string
  matricule?: string
  roles: string[]
  membershipType?: string
  profession?: string
  address?: {
    province?: string
    city?: string
    district?: string
    arrondissement?: string
    additionalInfo?: string
  }
  groupIds?: string[]
  isActive?: boolean
  createdAt?: unknown
}

interface MemberScopeContext {
  allMembers: DashboardMemberRecord[]
  scopedMembers: DashboardMemberRecord[]
  scopedMemberIds: Set<string>
  hasMemberScope: boolean
}

interface DateRange {
  from: Date
  to: Date
}

interface ActiveMemberSummary {
  modules: Set<string>
  contractsActive: number
  encours: number
}

interface CallActivityMetrics {
  weekPlans: FirestoreRecord[]
  periodLogs: FirestoreRecord[]
  plannedToday: number
  completedToday: number
  overduePlans: number
  completionRate: number
  promises: number
  unreachable: number
  reachRate: number
}

function safeNumber(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/\s/g, '').replace(',', '.'))
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function toDate(value: unknown): Date | null {
  if (!value) return null

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  if (typeof value === 'object') {
    const maybeTimestamp = value as { toDate?: () => Date; seconds?: number; _seconds?: number }
    if (typeof maybeTimestamp.toDate === 'function') {
      const converted = maybeTimestamp.toDate()
      return Number.isNaN(converted.getTime()) ? null : converted
    }

    const seconds = maybeTimestamp.seconds ?? maybeTimestamp._seconds
    if (typeof seconds === 'number') {
      const fromSeconds = new Date(seconds * 1000)
      return Number.isNaN(fromSeconds.getTime()) ? null : fromSeconds
    }
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  return null
}

function normalizeText(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function getDateFromRecord(record: FirestoreRecord, keys: string[]): Date | null {
  for (const key of keys) {
    if (!(key in record)) continue
    const parsed = toDate(record[key])
    if (parsed) return parsed
  }
  return null
}

function isInDateRange(date: Date | null, range: DateRange | null): boolean {
  if (!range || !date) return !range
  return date >= range.from && date <= range.to
}

function resolveDateRange(filters: DashboardFilters): DateRange | null {
  if (filters.period === 'all') {
    return null
  }

  const now = new Date()

  if (filters.period === 'custom') {
    if (!filters.customFrom || !filters.customTo) {
      return null
    }

    const from = new Date(`${filters.customFrom}T00:00:00`)
    const to = new Date(`${filters.customTo}T23:59:59`)

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      return null
    }

    return { from, to }
  }

  if (filters.period === 'today') {
    const from = new Date(now)
    from.setHours(0, 0, 0, 0)

    const to = new Date(now)
    to.setHours(23, 59, 59, 999)
    return { from, to }
  }

  if (filters.period === '7d' || filters.period === '30d') {
    const days = filters.period === '7d' ? 6 : 29
    const from = new Date(now)
    from.setHours(0, 0, 0, 0)
    from.setDate(from.getDate() - days)

    const to = new Date(now)
    to.setHours(23, 59, 59, 999)
    return { from, to }
  }

  if (filters.period === 'month') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1)
    from.setHours(0, 0, 0, 0)

    const to = new Date(now)
    to.setHours(23, 59, 59, 999)
    return { from, to }
  }

  return null
}

async function readCollectionDocs(collectionName: string): Promise<FirestoreRecord[]> {
  // Côté serveur/API, privilégier Admin SDK pour éviter les refus de règles Firestore.
  if (typeof window === 'undefined') {
    const { adminFirestore } = await import('@/firebase/adminFirestore')
    if (adminFirestore) {
      const snap = await adminFirestore.collection(collectionName).get()
      return snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Record<string, unknown>),
      }))
    }
  }

  // Fallback client (historique).
  const { db, collection, getDocs } = await import('@/firebase/firestore')
  const snap = await getDocs(collection(db, collectionName))
  return snap.docs.map((docSnap) => ({
    id: docSnap.id,
    ...(docSnap.data() as Record<string, unknown>),
  }))
}

async function readCollectionGroupDocs(groupName: string): Promise<FirestoreRecord[]> {
  if (typeof window === 'undefined') {
    const { adminFirestore } = await import('@/firebase/adminFirestore')
    if (adminFirestore) {
      const snap = await adminFirestore.collectionGroup(groupName).get()
      return snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Record<string, unknown>),
      }))
    }
  }

  const { db, collectionGroup, getDocs } = await import('@/firebase/firestore')
  const snap = await getDocs(collectionGroup(db, groupName))
  return snap.docs.map((docSnap) => ({
    id: docSnap.id,
    ...(docSnap.data() as Record<string, unknown>),
  }))
}

function toMemberRecord(record: FirestoreRecord): DashboardMemberRecord | null {
  const roles = Array.isArray(record.roles)
    ? (record.roles.filter((role): role is string => typeof role === 'string'))
    : []

  const hasMemberRole = roles.some((role) => MEMBER_ROLES.has(role))
  if (!hasMemberRole) return null

  const addressRaw = record.address
  const address =
    typeof addressRaw === 'object' && addressRaw !== null
      ? {
          province: typeof (addressRaw as Record<string, unknown>).province === 'string' ? String((addressRaw as Record<string, unknown>).province) : undefined,
          city: typeof (addressRaw as Record<string, unknown>).city === 'string' ? String((addressRaw as Record<string, unknown>).city) : undefined,
          district: typeof (addressRaw as Record<string, unknown>).district === 'string' ? String((addressRaw as Record<string, unknown>).district) : undefined,
          arrondissement: typeof (addressRaw as Record<string, unknown>).arrondissement === 'string' ? String((addressRaw as Record<string, unknown>).arrondissement) : undefined,
          additionalInfo: typeof (addressRaw as Record<string, unknown>).additionalInfo === 'string' ? String((addressRaw as Record<string, unknown>).additionalInfo) : undefined,
        }
      : undefined

  const groupIds = Array.isArray(record.groupIds)
    ? record.groupIds.filter((id): id is string => typeof id === 'string')
    : undefined

  return {
    ...record,
    roles,
    membershipType: typeof record.membershipType === 'string' ? record.membershipType : undefined,
    profession: typeof record.profession === 'string' ? record.profession : undefined,
    address,
    groupIds,
    isActive: typeof record.isActive === 'boolean' ? record.isActive : undefined,
  }
}

function mapMemberTypeFilter(user: DashboardMemberRecord): DashboardMemberTypeFilter | 'unknown' {
  const membershipType = normalizeText(user.membershipType)
  if (membershipType === 'adherant') return 'adherant'
  if (membershipType === 'bienfaiteur') return 'bienfaiteur'
  if (membershipType === 'sympathisant') return 'sympathisant'

  if (user.roles.includes('Adherant')) return 'adherant'
  if (user.roles.includes('Bienfaiteur')) return 'bienfaiteur'
  if (user.roles.includes('Sympathisant')) return 'sympathisant'

  return 'unknown'
}

function matchesMemberFilter(user: DashboardMemberRecord, filters: DashboardFilters): boolean {
  if (filters.memberType !== 'all' && mapMemberTypeFilter(user) !== filters.memberType) {
    return false
  }

  if (filters.zoneProvince !== 'all') {
    const province = normalizeText(user.address?.province)
    if (province !== normalizeText(filters.zoneProvince)) {
      return false
    }
  }

  if (filters.zoneCity !== 'all') {
    const city = normalizeText(user.address?.city)
    if (city !== normalizeText(filters.zoneCity)) {
      return false
    }
  }

  return true
}

function filterRecordsByDate(recordList: FirestoreRecord[], range: DateRange | null, dateKeys: string[]): FirestoreRecord[] {
  if (!range) return recordList
  return recordList.filter((record) => isInDateRange(getDateFromRecord(record, dateKeys), range))
}

function filterRecordsByMemberScope(
  recordList: FirestoreRecord[],
  memberScope: MemberScopeContext,
  memberIdGetter: (record: FirestoreRecord) => string | null
): FirestoreRecord[] {
  if (!memberScope.hasMemberScope) return recordList

  return recordList.filter((record) => {
    const memberId = memberIdGetter(record)
    if (!memberId) return false
    return memberScope.scopedMemberIds.has(memberId)
  })
}

function scopeFinancialSources(
  sources: FinancialReportSources,
  memberScope: MemberScopeContext
): FinancialReportSources {
  if (!memberScope.hasMemberScope) return sources

  const memberIds = memberScope.scopedMemberIds
  const caisseSpecialeContracts = sources.caisseSpecialeContracts.filter(
    (contract) => typeof contract.memberId === 'string' && memberIds.has(contract.memberId)
  )
  const caisseSpecialeIds = new Set(caisseSpecialeContracts.map((contract) => contract.id))
  const caisseImprevueContracts = sources.caisseImprevueContracts.filter(
    (contract) => typeof contract.memberId === 'string' && memberIds.has(contract.memberId)
  )
  const caisseImprevueIds = new Set(caisseImprevueContracts.map((contract) => contract.id))
  const creditContracts = sources.creditContracts.filter((contract) => memberIds.has(contract.clientId))
  const creditIds = new Set(creditContracts.map((contract) => contract.id))
  const placements = sources.placements.filter(
    (placement) => typeof placement.benefactorId === 'string' && memberIds.has(placement.benefactorId)
  )
  const placementIds = new Set(placements.map((placement) => placement.id))

  return {
    caisseSpecialeContracts,
    caisseSpecialePayments: sources.caisseSpecialePayments.filter((payment) => caisseSpecialeIds.has(payment.parentId)),
    caisseSpecialeRefunds: sources.caisseSpecialeRefunds.filter((refund) => caisseSpecialeIds.has(refund.parentId)),
    caisseImprevueContracts,
    caisseImprevuePayments: sources.caisseImprevuePayments.filter((payment) => caisseImprevueIds.has(payment.parentId)),
    caisseImprevueSupports: sources.caisseImprevueSupports.filter((support) => caisseImprevueIds.has(support.parentId)),
    caisseImprevueRefunds: sources.caisseImprevueRefunds.filter((refund) => caisseImprevueIds.has(refund.parentId)),
    creditContracts,
    creditPayments: sources.creditPayments.filter((payment) => creditIds.has(payment.creditId)),
    creditPenalties: sources.creditPenalties.filter((penalty) => creditIds.has(penalty.creditId)),
    guarantorPayments: sources.guarantorPayments.filter((payment) => creditIds.has(payment.creditId)),
    placements,
    placementCommissions: sources.placementCommissions.filter((commission) => placementIds.has(commission.parentId)),
    placementEarlyExits: sources.placementEarlyExits.filter((exit) => placementIds.has(exit.parentId)),
    membershipRequests: sources.membershipRequests.filter((request) => {
      const memberId = getMemberIdFrom(request, ['memberId', 'userId', 'uid'])
      return memberId ? memberIds.has(memberId) : false
    }),
  }
}

function buildCurrentFinancialReport(sources: FinancialReportSources): FinancialReport {
  const month = currentMonthKey()
  return buildFinancialReport(sources, { from: month, to: month, now: new Date() })
}

function getFinancialLine(
  report: FinancialReport,
  moduleKey: FinancialReportModuleKey,
  blockKey: 'treasury' | 'result' | 'outstanding' | 'risks',
  lineKey: string
) {
  return report.modules
    .find((module) => module.key === moduleKey)
    ?.blocks.find((block) => block.key === blockKey)
    ?.lines.find((line) => line.key === lineKey)
}

function financialLine(
  report: FinancialReport,
  moduleKey: FinancialReportModuleKey,
  blockKey: 'treasury' | 'result' | 'outstanding' | 'risks',
  lineKey: string,
  options: {
    key?: string
    label?: string
    description?: string
    tone?: DashboardKpiItem['tone']
    href?: string
  } = {}
) {
  const line = getFinancialLine(report, moduleKey, blockKey, lineKey)
  return {
    key: options.key || `${moduleKey}_${blockKey}_${lineKey}`,
    label: options.label || line?.label || lineKey,
    value: line?.values.at(-1) || 0,
    format: line?.unit === 'count' ? ('number' as const) : ('currency' as const),
    description: options.description || line?.description,
    tone: options.tone,
    href: options.href,
  }
}

function buildExecutiveFinancialSections(report: FinancialReport): NonNullable<DashboardTabPayload['financialSections']> {
  const toneForPositiveRisk = (lineKey: string): DashboardKpiItem['tone'] =>
    (getFinancialLine(report, 'synthesis', 'risks', lineKey)?.values.at(-1) || 0) > 0 ? 'danger' : 'success'
  const treasuryNet = getFinancialLine(report, 'synthesis', 'treasury', 'net')?.values.at(-1) || 0
  const resultNet = getFinancialLine(report, 'synthesis', 'result', 'net')?.values.at(-1) || 0

  return [
    {
      key: 'receivables',
      title: 'Sommes dues à l’association',
      description: 'Créances encore dues à la date du calcul. Elles ne sont pas mélangées avec l’épargne à restituer.',
      lines: [
        financialLine(report, 'credit_speciale', 'outstanding', 'receivables', { href: routes.admin.creditSpecialeContrats }),
        financialLine(report, 'credit_fixe', 'outstanding', 'receivables', { href: routes.admin.creditFixeContrats }),
        financialLine(report, 'credit_aide', 'outstanding', 'receivables', { href: routes.admin.creditAideContrats }),
        financialLine(report, 'caisse_imprevue', 'outstanding', 'supports_outstanding', { href: routes.admin.caisseImprevue }),
        financialLine(report, 'synthesis', 'outstanding', 'receivables_total', { tone: 'primary', href: routes.admin.financialReports }),
      ],
    },
    {
      key: 'funds_to_return',
      title: 'Fonds détenus à restituer',
      description: 'Épargne et capitaux confiés à l’association. Ce sont des fonds à rendre, pas des bénéfices.',
      lines: [
        financialLine(report, 'caisse_speciale', 'outstanding', 'funds_held', { href: routes.admin.caisseSpeciale }),
        financialLine(report, 'caisse_imprevue', 'outstanding', 'funds_held', { href: routes.admin.caisseImprevue }),
        financialLine(report, 'placements', 'outstanding', 'capital_to_return', { href: routes.admin.placements }),
        financialLine(report, 'synthesis', 'outstanding', 'payables_total', { tone: 'primary', href: routes.admin.financialReports }),
      ],
    },
    {
      key: 'credit_risks',
      title: 'Retards et risques de crédit',
      description: 'Montants exigibles, pénalités non payées et pertes réellement constatées dans les crédits.',
      lines: [
        financialLine(report, 'credit_speciale', 'risks', 'late_amount', { href: routes.admin.calendrier }),
        financialLine(report, 'credit_fixe', 'risks', 'late_amount', { href: routes.admin.calendrier }),
        financialLine(report, 'synthesis', 'risks', 'late_contracts', { tone: toneForPositiveRisk('late_contracts'), href: routes.admin.calendrier }),
        financialLine(report, 'synthesis', 'risks', 'unpaid_penalties', { tone: (getFinancialLine(report, 'synthesis', 'risks', 'unpaid_penalties')?.values.at(-1) || 0) > 0 ? 'warning' : 'success', href: routes.admin.creditSpecialeContrats }),
        financialLine(report, 'synthesis', 'risks', 'losses', { tone: toneForPositiveRisk('losses'), href: routes.admin.financialReports }),
      ],
    },
    {
      key: 'current_month',
      title: 'Mouvements du mois en cours',
      description: 'Argent réellement entré et sorti depuis le début du mois, toutes activités confondues.',
      lines: [
        financialLine(report, 'synthesis', 'treasury', 'in_total', { tone: 'success', href: routes.admin.financialReports }),
        financialLine(report, 'synthesis', 'treasury', 'out_total', { href: routes.admin.financialReports }),
        financialLine(report, 'synthesis', 'treasury', 'net', { tone: treasuryNet >= 0 ? 'success' : 'danger', href: routes.admin.financialReports }),
        financialLine(report, 'synthesis', 'result', 'net', { label: 'Résultat net du mois', tone: resultNet >= 0 ? 'success' : 'danger', href: routes.admin.financialReports }),
      ],
    },
  ]
}

function moduleHref(moduleKey: FinancialReportModuleKey): string {
  if (moduleKey === 'caisse_speciale') return routes.admin.caisseSpeciale
  if (moduleKey === 'caisse_imprevue') return routes.admin.caisseImprevue
  if (moduleKey === 'credit_speciale') return routes.admin.creditSpeciale
  if (moduleKey === 'credit_fixe') return routes.admin.creditFixe
  if (moduleKey === 'credit_aide') return routes.admin.creditAide
  if (moduleKey === 'placements') return routes.admin.placements
  return routes.admin.financialReports
}

function buildModuleFinancialSections(
  report: FinancialReport,
  moduleKey: FinancialReportModuleKey
): NonNullable<DashboardTabPayload['financialSections']> {
  const module = report.modules.find((entry) => entry.key === moduleKey)
  if (!module) return []

  const descriptions = {
    treasury: 'Entrées et sorties réellement enregistrées depuis le début du mois.',
    result: 'Produits moins charges du mois. L’épargne et les capitaux confiés ne sont pas des produits.',
    outstanding: 'Situation actuelle : sommes encore dues ou fonds que l’association devra restituer.',
    risks: 'Échéances dépassées, pénalités impayées et pertes réellement constatées.',
  }

  return module.blocks.map((block) => ({
    key: `${moduleKey}_${block.key}`,
    title: block.title === 'Trésorerie' || block.title === 'Résultat' ? `${block.title} — mois en cours` : block.title,
    description: descriptions[block.key],
    lines: block.lines.map((line) => ({
      key: `${moduleKey}_${block.key}_${line.key}`,
      label: line.label,
      value: line.values.at(-1) || 0,
      format: line.unit === 'count' ? ('number' as const) : ('currency' as const),
      description: line.description,
      tone:
        block.key === 'risks' && (line.values.at(-1) || 0) > 0
          ? line.key === 'unpaid_penalties' ? ('warning' as const) : ('danger' as const)
          : line.level === 'total' ? ('primary' as const) : undefined,
      href: moduleHref(moduleKey),
    })),
  }))
}

function financialKpi(
  report: FinancialReport,
  moduleKey: FinancialReportModuleKey,
  blockKey: 'treasury' | 'result' | 'outstanding' | 'risks',
  lineKey: string,
  options: { label?: string; subtitle?: string; tone?: DashboardKpiItem['tone']; href?: string } = {}
): DashboardKpiItem {
  const line = getFinancialLine(report, moduleKey, blockKey, lineKey)
  const value = line?.values.at(-1) || 0
  return {
    key: `verified_${moduleKey}_${blockKey}_${lineKey}`,
    label: options.label || line?.label || lineKey,
    value,
    format: line?.unit === 'count' ? 'number' : 'currency',
    subtitle: options.subtitle || (blockKey === 'treasury' || blockKey === 'result' ? 'Mois en cours' : 'Situation actuelle'),
    tone: options.tone || 'neutral',
    href: options.href || moduleHref(moduleKey),
  }
}

function applyAuthoritativeModuleFinancials(
  payload: DashboardTabPayload,
  report: FinancialReport,
  moduleKey: 'caisse_speciale' | 'caisse_imprevue' | 'credit_speciale' | 'credit_fixe' | 'credit_aide' | 'placements'
): DashboardTabPayload {
  const keepKeys: Record<typeof moduleKey, Set<string>> = {
    caisse_speciale: new Set(['demands_pending', 'contracts_active', 'late_contracts']),
    caisse_imprevue: new Set(['demands_pending', 'contracts_active', 'due_vs_paid', 'estimated_overdue', 'collection_rate']),
    credit_speciale: new Set(['demands_pending', 'contracts_active']),
    credit_fixe: new Set(['demands_pending', 'contracts_active']),
    credit_aide: new Set(['demands_pending', 'contracts_active']),
    placements: new Set(['demands_pending', 'placements_active', 'overdue_commissions', 'commission_rate']),
  }
  const operationalKpis = payload.kpis.filter(
    (kpi) => keepKeys[moduleKey].has(kpi.key) || kpi.key.startsWith('rest_') || kpi.key.startsWith('post_rest_')
  )

  let verifiedKpis: DashboardKpiItem[] = []
  if (moduleKey === 'caisse_speciale') {
    verifiedKpis = [
      financialKpi(report, moduleKey, 'outstanding', 'funds_held', { tone: 'primary' }),
      financialKpi(report, moduleKey, 'treasury', 'in_contributions', { tone: 'success' }),
      financialKpi(report, moduleKey, 'treasury', 'out_refunds'),
      financialKpi(report, moduleKey, 'result', 'income_penalties', { tone: 'success' }),
      financialKpi(report, moduleKey, 'result', 'net', { label: 'Résultat net du mois', tone: 'primary' }),
    ]
  } else if (moduleKey === 'caisse_imprevue') {
    verifiedKpis = [
      financialKpi(report, moduleKey, 'outstanding', 'funds_held', { tone: 'primary' }),
      financialKpi(report, moduleKey, 'outstanding', 'supports_outstanding', { tone: 'warning' }),
      financialKpi(report, moduleKey, 'treasury', 'in_contributions', { tone: 'success' }),
      financialKpi(report, moduleKey, 'treasury', 'in_supports_repaid', { tone: 'success' }),
      financialKpi(report, moduleKey, 'result', 'net', { label: 'Résultat net du mois', tone: 'primary' }),
    ]
  } else if (moduleKey === 'placements') {
    verifiedKpis = [
      financialKpi(report, moduleKey, 'outstanding', 'capital_to_return', { tone: 'primary' }),
      financialKpi(report, moduleKey, 'treasury', 'in_capital', { tone: 'success' }),
      financialKpi(report, moduleKey, 'treasury', 'out_commissions', { label: 'Commissions versées ce mois' }),
      financialKpi(report, moduleKey, 'treasury', 'out_capital', { label: 'Capitaux restitués ce mois' }),
      financialKpi(report, moduleKey, 'result', 'net', { label: 'Résultat net du mois', tone: 'primary' }),
    ]
  } else {
    const lateContracts = getFinancialLine(report, moduleKey, 'risks', 'late_contracts')?.values.at(-1) || 0
    const lateAmount = getFinancialLine(report, moduleKey, 'risks', 'late_amount')?.values.at(-1) || 0
    const penalties = getFinancialLine(report, moduleKey, 'risks', 'unpaid_penalties')?.values.at(-1) || 0
    const losses = getFinancialLine(report, moduleKey, 'risks', 'losses')?.values.at(-1) || 0
    verifiedKpis = [
      financialKpi(report, moduleKey, 'outstanding', 'receivables', { tone: 'primary' }),
      financialKpi(report, moduleKey, 'risks', 'late_contracts', { tone: lateContracts > 0 ? 'danger' : 'success', href: routes.admin.calendrier }),
      financialKpi(report, moduleKey, 'risks', 'late_amount', { tone: lateAmount > 0 ? 'danger' : 'success', href: routes.admin.calendrier }),
      financialKpi(report, moduleKey, 'risks', 'unpaid_penalties', { tone: penalties > 0 ? 'warning' : 'success' }),
      financialKpi(report, moduleKey, 'risks', 'losses', { tone: losses > 0 ? 'danger' : 'success' }),
      financialKpi(report, moduleKey, 'result', 'income_interest', { label: 'Intérêts perçus ce mois', tone: 'success' }),
      financialKpi(report, moduleKey, 'result', 'net', { label: 'Résultat net du mois', tone: 'primary' }),
    ]
  }

  return {
    ...payload,
    kpis: [...operationalKpis, ...verifiedKpis],
    financialSections: buildModuleFinancialSections(report, moduleKey),
    notes: [
      ...(payload.notes || []),
      'Les montants financiers de cet onglet utilisent le même calcul que les bilans financiers.',
    ],
  }
}

function createDistribution(
  key: string,
  title: string,
  items: Array<{ label: string; value: number }>,
  chartType: 'bar' | 'pie' = 'bar',
  unit?: string
): DashboardDistributionBlock {
  return {
    key,
    title,
    chartType,
    unit,
    items,
  }
}

function createRanking(key: string, title: string, items: DashboardRankingBlock['items'], unit?: string): DashboardRankingBlock {
  return {
    key,
    title,
    unit,
    items,
  }
}

async function getMemberScope(filters: DashboardFilters): Promise<MemberScopeContext> {
  const rawUsers = await readCollectionDocs(firebaseCollectionNames.users)
  const allMembers = rawUsers.map(toMemberRecord).filter((user): user is DashboardMemberRecord => user !== null)

  const scopedMembers = allMembers.filter((member) => matchesMemberFilter(member, filters))
  const scopedMemberIds = new Set(scopedMembers.map((member) => member.id))

  const hasMemberScope = filters.memberType !== 'all' || filters.zoneProvince !== 'all' || filters.zoneCity !== 'all'

  return {
    allMembers,
    scopedMembers,
    scopedMemberIds,
    hasMemberScope,
  }
}

function topNFromMap(map: Map<string, number>, size = 5): Array<{ label: string; value: number }> {
  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, size)
}

function getStatus(record: FirestoreRecord): string {
  return typeof record.status === 'string' ? record.status.toUpperCase() : 'UNKNOWN'
}

function getMemberIdFrom(record: FirestoreRecord, keys: string[]): string | null {
  for (const key of keys) {
    const raw = record[key]
    if (typeof raw === 'string' && raw.trim()) {
      return raw
    }
  }
  return null
}

function currencyKpi(
  key: string,
  label: string,
  value: number,
  subtitle?: string,
  tone: DashboardKpiItem['tone'] = 'primary',
  href?: string
): DashboardKpiItem {
  return {
    key,
    label,
    value,
    format: 'currency',
    subtitle,
    tone,
    href,
  }
}

function numberKpi(
  key: string,
  label: string,
  value: number,
  subtitle?: string,
  tone: DashboardKpiItem['tone'] = 'neutral',
  href?: string
): DashboardKpiItem {
  return {
    key,
    label,
    value,
    format: 'number',
    subtitle,
    tone,
    href,
  }
}

function percentKpi(
  key: string,
  label: string,
  value: number,
  subtitle?: string,
  tone: DashboardKpiItem['tone'] = 'neutral',
  href?: string
): DashboardKpiItem {
  return {
    key,
    label,
    value,
    format: 'percent',
    subtitle,
    tone,
    href,
  }
}

function safePercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  if (value < 0) return 0
  if (value > 100) return 100
  return value
}

function statusCount(records: FirestoreRecord[], expectedStatus: string): number {
  return records.filter((record) => getStatus(record) === expectedStatus).length
}

function pendingCount(records: FirestoreRecord[], options?: { includeReopened?: boolean }): number {
  const statuses = new Set<string>(['PENDING'])
  if (options?.includeReopened) {
    statuses.add('REOPENED')
  }

  return records.filter((record) => statuses.has(getStatus(record))).length
}

function extractPenaltyAmountFromPaymentRecord(record: FirestoreRecord): number {
  const directPenalty = safeNumber(record.penaltyApplied) + safeNumber(record.penaltyAmount) + safeNumber(record.penalty)
  const versementsPenalty = Array.isArray(record.versements)
    ? record.versements.reduce((sum, versement) => {
        if (typeof versement !== 'object' || versement === null) return sum
        return sum + safeNumber((versement as Record<string, unknown>).penalty)
      }, 0)
    : 0

  return directPenalty + versementsPenalty
}

function extractRestMonthEntries(record: FirestoreRecord): Array<{ monthlyAmount: number; monthNumber?: number; source: 'contract' | 'cycle' }> {
  const entries: Array<{ monthlyAmount: number; monthNumber?: number; source: 'contract' | 'cycle' }> = []
  const contractMonthly = safeNumber(record.monthlyPaymentAmount)

  const contractRestMonths = Array.isArray(record.restMonths) ? record.restMonths : []
  for (const restMonth of contractRestMonths) {
    if (typeof restMonth !== 'object' || restMonth === null) continue
    entries.push({
      monthlyAmount: contractMonthly,
      monthNumber: safeNumber((restMonth as Record<string, unknown>).monthNumber) || undefined,
      source: 'contract',
    })
  }

  const cycles = Array.isArray(record.creditCycles) ? record.creditCycles : []
  for (const cycle of cycles) {
    if (typeof cycle !== 'object' || cycle === null) continue
    const cycleRecord = cycle as Record<string, unknown>
    const cycleMonthly = safeNumber(cycleRecord.monthlyPaymentAmount) || contractMonthly
    const cycleRestMonths = Array.isArray(cycleRecord.restMonths) ? cycleRecord.restMonths : []
    for (const restMonth of cycleRestMonths) {
      if (typeof restMonth !== 'object' || restMonth === null) continue
      entries.push({
        monthlyAmount: cycleMonthly,
        monthNumber: safeNumber((restMonth as Record<string, unknown>).monthNumber) || undefined,
        source: 'cycle',
      })
    }
  }

  return entries
}

function addDays(base: Date, days: number): Date {
  const next = new Date(base)
  next.setDate(next.getDate() + days)
  return next
}

// Règle commune : plafonnement au dernier jour du mois d'arrivée.
const addMonths = (base: Date, months: number): Date => addContractMonths(base, months)

function extractRestMonthEvents(record: FirestoreRecord): Array<{ contractId: string; memberId: string | null; restDate: Date | null; monthlyAmount: number }> {
  const contractId = typeof record.id === 'string' ? record.id : ''
  const memberId = typeof record.clientId === 'string' && record.clientId.trim() ? record.clientId : null
  const events: Array<{ contractId: string; memberId: string | null; restDate: Date | null; monthlyAmount: number }> = []
  const contractFirstPaymentDate = toDate(record.firstPaymentDate)
  const contractMonthly = safeNumber(record.monthlyPaymentAmount)

  const pushFromRestMonth = (restMonth: Record<string, unknown>, monthlyAmount: number, baseDate: Date | null) => {
    const recordedAt = toDate(restMonth.recordedAt)
    const monthNumber = safeNumber(restMonth.monthNumber)
    const computedDate =
      recordedAt ||
      (baseDate && monthNumber > 0 ? addMonths(baseDate, monthNumber - 1) : null)

    events.push({
      contractId,
      memberId,
      restDate: computedDate,
      monthlyAmount: Math.max(monthlyAmount, 0),
    })
  }

  const contractRestMonths = Array.isArray(record.restMonths) ? record.restMonths : []
  for (const restMonth of contractRestMonths) {
    if (typeof restMonth !== 'object' || restMonth === null) continue
    pushFromRestMonth(restMonth as Record<string, unknown>, contractMonthly, contractFirstPaymentDate)
  }

  const cycles = Array.isArray(record.creditCycles) ? record.creditCycles : []
  for (const cycle of cycles) {
    if (typeof cycle !== 'object' || cycle === null) continue
    const cycleRecord = cycle as Record<string, unknown>
    const cycleMonthly = safeNumber(cycleRecord.monthlyPaymentAmount) || contractMonthly
    const cycleFirstPaymentDate = toDate(cycleRecord.firstPaymentDate) || contractFirstPaymentDate
    const cycleRestMonths = Array.isArray(cycleRecord.restMonths) ? cycleRecord.restMonths : []
    for (const restMonth of cycleRestMonths) {
      if (typeof restMonth !== 'object' || restMonth === null) continue
      pushFromRestMonth(restMonth as Record<string, unknown>, cycleMonthly, cycleFirstPaymentDate)
    }
  }

  return events
}

function buildCaisseSpecialePayload(
  demandsRaw: FirestoreRecord[],
  contractsRaw: FirestoreRecord[],
  paymentsRaw: FirestoreRecord[]
): DashboardTabPayload {
  const demands = demandsRaw
  const contracts = contractsRaw

  const pending = statusCount(demands, 'PENDING')
  const approved = statusCount(demands, 'APPROVED')
  const rejected = statusCount(demands, 'REJECTED')
  const converted = statusCount(demands, 'CONVERTED')

  const activeContracts = contracts.filter((contract) => {
    const status = getStatus(contract)
    return status === 'ACTIVE' || status === 'LATE_NO_PENALTY' || status === 'LATE_WITH_PENALTY'
  })

  const lateContracts = contracts.filter((contract) => {
    const status = getStatus(contract)
    return status === 'LATE_NO_PENALTY' || status === 'LATE_WITH_PENALTY'
  })

  const remainingAmount = activeContracts.reduce((sum, contract) => {
    const monthly = safeNumber(contract.monthlyAmount)
    const months = safeNumber(contract.monthsPlanned)
    const paid = safeNumber(contract.nominalPaid)
    const remaining = Math.max(monthly * months - paid, 0)
    return sum + remaining
  }, 0)

  const penaltiesTotal = contracts.reduce((sum, contract) => sum + safeNumber(contract.penaltiesTotal), 0)
  const contractIds = new Set(contracts.map((contract) => contract.id))
  const penaltiesPaid = paymentsRaw.reduce((sum, payment) => {
    const contractId = typeof payment.contractId === 'string' ? payment.contractId : ''
    if (contractId && !contractIds.has(contractId)) return sum
    return sum + extractPenaltyAmountFromPaymentRecord(payment)
  }, 0)
  const lossesAtRisk = lateContracts.reduce((sum, contract) => {
    const monthly = safeNumber(contract.monthlyAmount)
    const months = safeNumber(contract.monthsPlanned)
    const paid = safeNumber(contract.nominalPaid)
    return sum + Math.max(monthly * months - paid, 0)
  }, 0)

  const byCaisseTypeMap = new Map<string, number>()
  for (const contract of contracts) {
    const type = typeof contract.caisseType === 'string' && contract.caisseType.trim() ? contract.caisseType : 'NON_RENSEIGNE'
    byCaisseTypeMap.set(type, (byCaisseTypeMap.get(type) || 0) + 1)
  }

  return {
    title: 'Caisse speciale',
    subtitle: 'Suivi des demandes, contrats et impayes du module Caisse speciale.',
    kpis: [
      numberKpi('demands_pending', 'Demandes en attente', pending, 'Demandes a traiter', 'warning'),
      numberKpi('contracts_active', 'Contrats actifs', activeContracts.length, 'Actifs + en retard', 'primary'),
      currencyKpi('remaining_amount', 'Montant encours', remainingAmount, 'Reste theorique a encaisser', 'primary'),
      numberKpi('late_contracts', 'Impayes module', lateContracts.length, 'Contrats en retard', 'danger'),
      currencyKpi('penalties_total', 'Penalites cumulees', penaltiesTotal, 'Penalites comptabilisees sur contrats', 'warning'),
      currencyKpi('penalties_paid', 'Penalites encaissees', penaltiesPaid, 'Paiements effectivement enregistres', 'success'),
      currencyKpi('losses_at_risk', 'Pertes a risque', lossesAtRisk, 'Exposition sur contrats en retard', 'danger'),
    ],
    distributions: [
      createDistribution('demand_status', 'Demandes par statut', [
        { label: 'En attente', value: pending },
        { label: 'Approuvees', value: approved },
        { label: 'Rejetees', value: rejected },
        { label: 'Converties', value: converted },
      ], 'bar', 'demandes'),
      createDistribution('caisse_type', 'Contrats par catégorie', topNFromMap(byCaisseTypeMap, 6), 'pie', 'contrats'),
    ],
  }
}

function buildCaisseImprevuePayload(
  demandsRaw: FirestoreRecord[],
  contractsRaw: FirestoreRecord[],
  paymentsRaw: FirestoreRecord[]
): DashboardTabPayload {
  const pending = pendingCount(demandsRaw, { includeReopened: true })
  const approved = statusCount(demandsRaw, 'APPROVED')
  const rejected = statusCount(demandsRaw, 'REJECTED')
  const converted = statusCount(demandsRaw, 'CONVERTED')
  const reopened = statusCount(demandsRaw, 'REOPENED')

  const activeContracts = contractsRaw.filter((contract) => getStatus(contract) === 'ACTIVE')
  const finishedContracts = contractsRaw.filter((contract) => getStatus(contract) === 'FINISHED')

  const totalNominalActive = activeContracts.reduce((sum, contract) => sum + safeNumber(contract.subscriptionCINominal), 0)

  const dueMonths = contractsRaw.reduce((sum, contract) => sum + safeNumber(contract.subscriptionCIDuration), 0)
  const paidMonths = contractsRaw.reduce((sum, contract) => sum + safeNumber(contract.totalMonthsPaid), 0)

  const today = new Date()
  const estimatedOverdueContracts = activeContracts.filter((contract) => {
    const firstPaymentDate = toDate(contract.firstPaymentDate)
    if (!firstPaymentDate) return false

    const monthsElapsed = Math.max(
      0,
      (today.getFullYear() - firstPaymentDate.getFullYear()) * 12 +
        (today.getMonth() - firstPaymentDate.getMonth()) +
        (today.getDate() >= firstPaymentDate.getDate() ? 1 : 0)
    )

    const expectedPaid = Math.min(monthsElapsed, safeNumber(contract.subscriptionCIDuration))
    const actualPaid = safeNumber(contract.totalMonthsPaid)
    return expectedPaid > 0 && actualPaid < expectedPaid
  })

  const contractIds = new Set(contractsRaw.map((contract) => contract.id))
  const ciPayments = paymentsRaw.filter((payment) => {
    const contractId = typeof payment.contractId === 'string' ? payment.contractId : ''
    if (!contractId || !contractIds.has(contractId)) return false
    return Array.isArray(payment.versements) || safeNumber(payment.accumulatedAmount) > 0
  })

  const totalCollected = ciPayments.reduce((sum, payment) => {
    if (Array.isArray(payment.versements)) {
      return sum + payment.versements.reduce((acc, versement) => {
        if (typeof versement !== 'object' || versement === null) return acc
        return acc + safeNumber((versement as Record<string, unknown>).amount)
      }, 0)
    }
    return sum + safeNumber(payment.accumulatedAmount)
  }, 0)

  const penaltiesPaid = ciPayments.reduce((sum, payment) => {
    if (Array.isArray(payment.versements)) {
      return sum + payment.versements.reduce((acc, versement) => {
        if (typeof versement !== 'object' || versement === null) return acc
        return acc + safeNumber((versement as Record<string, unknown>).penalty)
      }, 0)
    }
    return sum + safeNumber(payment.penalty) + safeNumber(payment.penaltyAmount)
  }, 0)

  const supportRepaymentCollected = ciPayments.reduce((sum, payment) => {
    let value = safeNumber(payment.supportRepaymentAmount)
    if (Array.isArray(payment.versements)) {
      value += payment.versements.reduce((acc, versement) => {
        if (typeof versement !== 'object' || versement === null) return acc
        return acc + safeNumber((versement as Record<string, unknown>).supportRepaymentAmount)
      }, 0)
    }
    return sum + value
  }, 0)

  const amountDueBySchedule = activeContracts.reduce((sum, contract) => {
    const firstPaymentDate = toDate(contract.firstPaymentDate)
    if (!firstPaymentDate) return sum
    const monthsElapsed = Math.max(
      0,
      (today.getFullYear() - firstPaymentDate.getFullYear()) * 12 +
        (today.getMonth() - firstPaymentDate.getMonth()) +
        (today.getDate() >= firstPaymentDate.getDate() ? 1 : 0)
    )
    const expectedMonths = Math.min(monthsElapsed, safeNumber(contract.subscriptionCIDuration))
    return sum + (expectedMonths * safeNumber(contract.subscriptionCIAmountPerMonth))
  }, 0)
  const amountPaidByMonths = activeContracts.reduce((sum, contract) => {
    return sum + (safeNumber(contract.totalMonthsPaid) * safeNumber(contract.subscriptionCIAmountPerMonth))
  }, 0)
  const collectionRate = amountDueBySchedule > 0 ? (Math.min(amountPaidByMonths, amountDueBySchedule) / amountDueBySchedule) * 100 : 0
  const lossesAtRisk = Math.max(amountDueBySchedule - amountPaidByMonths, 0)

  const byFrequencyMap = new Map<string, number>()
  for (const contract of contractsRaw) {
    const frequency = typeof contract.paymentFrequency === 'string' ? contract.paymentFrequency : 'NON_RENSEIGNE'
    byFrequencyMap.set(frequency, (byFrequencyMap.get(frequency) || 0) + 1)
  }

  return {
    title: 'Caisse imprevue',
    subtitle: 'Pilotage des demandes, contrats CI et suivi des versements attendus.',
    kpis: [
      numberKpi('demands_pending', 'Demandes en attente', pending, 'Demandes a traiter', 'warning'),
      numberKpi('contracts_active', 'Contrats actifs', activeContracts.length, 'Contrats en cours', 'primary'),
      numberKpi('due_vs_paid', 'Versements dus / payes', dueMonths, `${paidMonths} mois soldes`, 'neutral'),
      numberKpi('estimated_overdue', 'Impayes module', estimatedOverdueContracts.length, 'Estimation basee sur echeances', 'danger'),
      currencyKpi('benefits_paid', 'Encaissements reels', totalCollected, 'Versements effectivement enregistres', 'success'),
      currencyKpi('penalties_paid', 'Penalites encaissees', penaltiesPaid, 'Penalites effectivement payees', 'warning'),
      currencyKpi('support_repaid', 'Supports rembourses', supportRepaymentCollected, 'Montants deduits pour supports', 'primary'),
      percentKpi('collection_rate', 'Taux encaissement echeancier', safePercent(collectionRate), 'Respect du plan de versement'),
      currencyKpi('losses_at_risk', 'Manque a encaisser', lossesAtRisk, 'Retard cumule estime sur echeancier', 'danger'),
    ],
    distributions: [
      createDistribution('demand_status', 'Demandes par statut', [
        { label: 'En attente', value: pending },
        { label: 'Approuvees', value: approved },
        { label: 'Rejetees', value: rejected },
        { label: 'Converties', value: converted },
        { label: 'Reouvertes', value: reopened },
      ], 'bar', 'demandes'),
      createDistribution('frequency', 'Contrats par fréquence', topNFromMap(byFrequencyMap, 4), 'pie', 'contrats'),
    ],
    notes: [
      `Montant nominal actif: ${Math.round(totalNominalActive).toLocaleString('fr-FR')} FCFA`,
      `Contrats termines: ${finishedContracts.length}`,
    ],
  }
}

function buildCreditPayload(
  creditType: 'SPECIALE' | 'FIXE' | 'AIDE',
  demandsRaw: FirestoreRecord[],
  contractsRaw: FirestoreRecord[],
  penaltiesRaw: FirestoreRecord[],
  creditPaymentsRaw: FirestoreRecord[]
): DashboardTabPayload {
  const demands = demandsRaw.filter((demand) => String(demand.creditType || '').toUpperCase() === creditType)
  const contracts = contractsRaw.filter((contract) => String(contract.creditType || '').toUpperCase() === creditType)

  const pending = statusCount(demands, 'PENDING')
  const approved = statusCount(demands, 'APPROVED')
  const rejected = statusCount(demands, 'REJECTED')

  const activeContracts = contracts.filter((contract) => {
    const status = getStatus(contract)
    return status === 'ACTIVE' || status === 'OVERDUE' || status === 'PARTIAL'
  })

  const overdueContracts = contracts.filter((contract) => getStatus(contract) === 'OVERDUE')
  const contractIds = new Set(contracts.map((contract) => contract.id))
  const penalties = penaltiesRaw.filter((penalty) => {
    const creditId = typeof penalty.creditId === 'string' ? penalty.creditId : ''
    return creditId && contractIds.has(creditId)
  })

  const totalRemaining = contracts.reduce((sum, contract) => {
    const remaining = safeNumber(contract.amountRemaining)
    if (remaining > 0) return sum + remaining

    const totalAmount = safeNumber(contract.totalAmount) || safeNumber(contract.amount)
    const totalPaid = safeNumber(contract.amountPaid)
    return sum + Math.max(totalAmount - totalPaid, 0)
  }, 0)

  const expectedInterest = contracts.reduce((sum, contract) => {
    const totalAmount = safeNumber(contract.totalAmount)
    const principal = safeNumber(contract.amount)
    if (totalAmount > 0 && principal > 0) {
      return sum + Math.max(totalAmount - principal, 0)
    }
    const fallbackFromRate = principal * safeNumber(contract.interestRate) / 100
    return sum + Math.max(fallbackFromRate, 0)
  }, 0)

  const penaltiesPaid = penalties
    .filter((penalty) => penalty.paid === true)
    .reduce((sum, penalty) => sum + safeNumber(penalty.amount), 0)

  const penaltiesPending = penalties
    .filter((penalty) => penalty.paid !== true)
    .reduce((sum, penalty) => sum + safeNumber(penalty.amount), 0)

  const lossesAtRisk = overdueContracts.reduce((sum, contract) => {
    const remaining = safeNumber(contract.amountRemaining)
    if (remaining > 0) return sum + remaining
    const totalAmount = safeNumber(contract.totalAmount) || safeNumber(contract.amount)
    const totalPaid = safeNumber(contract.amountPaid)
    return sum + Math.max(totalAmount - totalPaid, 0)
  }, 0)

  const paidCreditFlows = creditPaymentsRaw.filter((payment) => {
    const creditId = typeof payment.creditId === 'string' ? payment.creditId : ''
    return creditId && contractIds.has(creditId)
  })
  const interestPaid = paidCreditFlows.reduce((sum, payment) => sum + safeNumber(payment.interestAmount), 0)
  const penaltiesPaidFromPayments = paidCreditFlows.reduce((sum, payment) => sum + safeNumber(payment.penaltyAmount), 0)
  const paidCreditFlowEvents = paidCreditFlows
    .map((payment) => {
      const creditId = typeof payment.creditId === 'string' ? payment.creditId : ''
      return {
        creditId,
        paymentDate: getDateFromRecord(payment, ['paymentDate', 'createdAt', 'updatedAt']),
        amount: safeNumber(payment.amount),
      }
    })
    .filter((event) => event.paymentDate !== null && event.amount > 0)

  const restMonthStats = contracts.reduce(
    (acc, contract) => {
      const entries = extractRestMonthEntries(contract)
      if (entries.length === 0) return acc

      acc.contractsWithRest += 1
      if (typeof contract.clientId === 'string' && contract.clientId.trim()) {
        acc.membersWithRest.add(contract.clientId)
      }
      acc.totalRestMonths += entries.length
      acc.revenueImpact += entries.reduce((sum, entry) => sum + Math.max(entry.monthlyAmount, 0), 0)
      return acc
    },
    {
      contractsWithRest: 0,
      membersWithRest: new Set<string>(),
      totalRestMonths: 0,
      revenueImpact: 0,
    }
  )
  const allMembersInContracts = new Set(
    contracts
      .map((contract) => (typeof contract.clientId === 'string' ? contract.clientId.trim() : ''))
      .filter((clientId) => clientId.length > 0)
  )
  const restRateContracts = contracts.length > 0 ? (restMonthStats.contractsWithRest / contracts.length) * 100 : 0
  const restRateMembers = allMembersInContracts.size > 0 ? (restMonthStats.membersWithRest.size / allMembersInContracts.size) * 100 : 0
  const isRestTrackedModule = creditType !== 'AIDE'
  const restEvents = contracts.flatMap((contract) => extractRestMonthEvents(contract)).filter((event) => event.restDate !== null)
  const totalRestMonthsForReturn = restEvents.length
  const membersWithRestSet = new Set(restEvents.map((event) => event.memberId).filter((memberId): memberId is string => typeof memberId === 'string' && memberId.length > 0))
  const membersReturned30Set = new Set<string>()
  let recovered30 = 0
  let recovered60 = 0
  let recovered90 = 0

  for (const event of restEvents) {
    if (!event.restDate) continue

    const limit30 = addDays(event.restDate, 30)
    const limit60 = addDays(event.restDate, 60)
    const limit90 = addDays(event.restDate, 90)

    const matchingPayments = paidCreditFlowEvents.filter((paymentEvent) => paymentEvent.creditId === event.contractId && paymentEvent.paymentDate)

    const hasReturnIn30 = matchingPayments.some((paymentEvent) => {
      const paymentDate = paymentEvent.paymentDate as Date
      return paymentDate >= event.restDate! && paymentDate <= limit30
    })
    if (hasReturnIn30 && event.memberId) {
      membersReturned30Set.add(event.memberId)
    }

    recovered30 += matchingPayments
      .filter((paymentEvent) => {
        const paymentDate = paymentEvent.paymentDate as Date
        return paymentDate >= event.restDate! && paymentDate <= limit30
      })
      .reduce((sum, paymentEvent) => sum + paymentEvent.amount, 0)

    recovered60 += matchingPayments
      .filter((paymentEvent) => {
        const paymentDate = paymentEvent.paymentDate as Date
        return paymentDate >= event.restDate! && paymentDate <= limit60
      })
      .reduce((sum, paymentEvent) => sum + paymentEvent.amount, 0)

    recovered90 += matchingPayments
      .filter((paymentEvent) => {
        const paymentDate = paymentEvent.paymentDate as Date
        return paymentDate >= event.restDate! && paymentDate <= limit90
      })
      .reduce((sum, paymentEvent) => sum + paymentEvent.amount, 0)
  }

  const postRestReturnRate = membersWithRestSet.size > 0 ? (membersReturned30Set.size / membersWithRestSet.size) * 100 : 0
  const avgRestMonthsPerMember = membersWithRestSet.size > 0 ? totalRestMonthsForReturn / membersWithRestSet.size : 0

  const contractsWithRestIds = new Set(restEvents.map((event) => event.contractId))
  const overdueWithRest = overdueContracts.filter((contract) => contractsWithRestIds.has(contract.id)).length
  const overdueWithoutRest = overdueContracts.filter((contract) => !contractsWithRestIds.has(contract.id)).length
  const contractsWithRestCount = contracts.filter((contract) => contractsWithRestIds.has(contract.id)).length
  const contractsWithoutRestCount = Math.max(contracts.length - contractsWithRestCount, 0)
  const overdueRateWithRest = contractsWithRestCount > 0 ? (overdueWithRest / contractsWithRestCount) * 100 : 0
  const overdueRateWithoutRest = contractsWithoutRestCount > 0 ? (overdueWithoutRest / contractsWithoutRestCount) * 100 : 0

  const contractStatusMap = new Map<string, number>()
  for (const contract of contracts) {
    const status = getStatus(contract)
    contractStatusMap.set(status, (contractStatusMap.get(status) || 0) + 1)
  }

  const tabTitle = creditType === 'SPECIALE' ? 'Credit speciale' : creditType === 'FIXE' ? 'Credit fixe' : 'Caisse aide'

  const overdueLabel = creditType === 'SPECIALE' ? 'Echeances en retard' : 'Impayes module'
  const remainingLabel = creditType === 'SPECIALE' ? 'Impayes + reste du' : 'Reste a rembourser'

  return {
    title: tabTitle,
    subtitle: `Suivi des demandes et contrats ${tabTitle.toLowerCase()}.`,
    kpis: [
      numberKpi('demands_pending', 'Demandes en attente', pending, 'Demandes a traiter', 'warning'),
      numberKpi('contracts_active', 'Contrats actifs', activeContracts.length, 'Actifs + partiels', 'primary'),
      currencyKpi('remaining', remainingLabel, totalRemaining, 'Encours restant global', 'primary'),
      numberKpi('overdue', overdueLabel, overdueContracts.length, 'Contrats avec retard', 'danger'),
      currencyKpi('benefit_estimated', 'Benefices estimes', expectedInterest + penaltiesPaid, 'Interets attendus + penalites encaissees', 'success'),
      currencyKpi('benefit_paid', 'Benefices encaisses', interestPaid + penaltiesPaidFromPayments, 'Interets et penalites effectivement payes', 'success'),
      currencyKpi('penalties_pending', 'Penalites en attente', penaltiesPending, 'Penalites non reglees', 'warning'),
      currencyKpi('losses_at_risk', 'Pertes a risque', lossesAtRisk, 'Montants en retard exposes', 'danger'),
      numberKpi('rest_months_total', 'Mois de repos', restMonthStats.totalRestMonths, `${restMonthStats.contractsWithRest} contrats concernes`, 'neutral'),
      percentKpi('rest_rate_contracts', 'Taux repos contrats', safePercent(restRateContracts), `${restMonthStats.contractsWithRest}/${contracts.length} contrats`),
      percentKpi('rest_rate_members', 'Taux repos membres', safePercent(restRateMembers), `${restMonthStats.membersWithRest.size}/${allMembersInContracts.size} membres`),
      currencyKpi('rest_revenue_impact', 'Impact mois repos', restMonthStats.revenueImpact, 'Revenu decale/non encaisse pendant repos', 'warning'),
      ...(isRestTrackedModule
        ? [
            percentKpi('post_rest_return_rate', 'Retour post-repos (30j)', safePercent(postRestReturnRate), `${membersReturned30Set.size}/${membersWithRestSet.size} membres`),
            numberKpi('rest_avg_duration', 'Duree moyenne repos', Number(avgRestMonthsPerMember.toFixed(2)), 'Mois de repos par membre concerne', 'neutral'),
            percentKpi('rest_overdue_rate_with', 'Risque repos: impayes (avec)', safePercent(overdueRateWithRest), `${overdueWithRest}/${contractsWithRestCount} contrats`),
            percentKpi('rest_overdue_rate_without', 'Risque repos: impayes (sans)', safePercent(overdueRateWithoutRest), `${overdueWithoutRest}/${contractsWithoutRestCount} contrats`),
          ]
        : []),
    ],
    distributions: [
      createDistribution('demand_status', 'Demandes par statut', [
        { label: 'En attente', value: pending },
        { label: 'Approuvees', value: approved },
        { label: 'Rejetees', value: rejected },
      ], 'bar', 'demandes'),
      createDistribution('contract_status', 'Contrats par statut', topNFromMap(contractStatusMap, 8), 'bar', 'contrats'),
      ...(isRestTrackedModule
        ? [
            createDistribution('recouvrement_post_repos', 'Recouvrement apres repos (cumule)', [
              { label: '<= 30 jours', value: Math.round(recovered30) },
              { label: '<= 60 jours', value: Math.round(recovered60) },
              { label: '<= 90 jours', value: Math.round(recovered90) },
            ], 'bar', 'FCFA'),
          ]
        : []),
    ],
    notes:
      creditType === 'AIDE'
        ? ['Rappel metier: les reliquats a 3 mois doivent etre transformes en credit speciale.']
        : [
            `Cohorte risque repos: impayes avec repos ${overdueWithRest}/${contractsWithRestCount} (${safePercent(overdueRateWithRest).toFixed(1)}%) vs sans repos ${overdueWithoutRest}/${contractsWithoutRestCount} (${safePercent(overdueRateWithoutRest).toFixed(1)}%).`,
            `Recouvrement apres repos: ${Math.round(recovered30).toLocaleString('fr-FR')} FCFA a 30j, ${Math.round(recovered60).toLocaleString('fr-FR')} FCFA a 60j, ${Math.round(recovered90).toLocaleString('fr-FR')} FCFA a 90j.`,
          ],
  }
}

function buildPlacementsPayload(
  demandsRaw: FirestoreRecord[],
  placementsRaw: FirestoreRecord[],
  commissionsRaw: FirestoreRecord[]
): DashboardTabPayload {
  const pending = statusCount(demandsRaw, 'PENDING')
  const approved = statusCount(demandsRaw, 'APPROVED')
  const rejected = statusCount(demandsRaw, 'REJECTED')
  const converted = statusCount(demandsRaw, 'CONVERTED')

  const activePlacements = placementsRaw.filter((placement) => String(placement.status || '').toLowerCase() === 'active')
  const totalAmountActive = activePlacements.reduce((sum, placement) => sum + safeNumber(placement.amount), 0)

  const overdueCommissionCount = activePlacements.filter((placement) => placement.hasOverdueCommission === true).length
  const totalMonthlyCommissionRunRate = activePlacements.reduce((sum, placement) => {
    const amount = safeNumber(placement.amount)
    const rate = safeNumber(placement.rate)
    return sum + ((amount * rate) / 100)
  }, 0)
  const totalProjectedCommissions = activePlacements.reduce((sum, placement) => {
    const amount = safeNumber(placement.amount)
    const rate = safeNumber(placement.rate)
    const periodMonths = safeNumber(placement.periodMonths)
    return sum + ((amount * rate) / 100) * Math.max(periodMonths, 0)
  }, 0)
  const weightedRateDenominator = activePlacements.reduce((sum, placement) => sum + safeNumber(placement.amount), 0)
  const weightedRateNumerator = activePlacements.reduce((sum, placement) => sum + (safeNumber(placement.amount) * safeNumber(placement.rate)), 0)
  const weightedCommissionRate = weightedRateDenominator > 0 ? weightedRateNumerator / weightedRateDenominator : 0
  const lossesAtRisk = activePlacements
    .filter((placement) => placement.hasOverdueCommission === true)
    .reduce((sum, placement) => {
      const amount = safeNumber(placement.amount)
      const rate = safeNumber(placement.rate)
      return sum + ((amount * rate) / 100)
    }, 0)
  const placementIds = new Set(placementsRaw.map((placement) => placement.id))
  const paidCommissions = commissionsRaw
    .filter((commission) => {
      const placementId = typeof commission.placementId === 'string' ? commission.placementId : ''
      if (!placementId || !placementIds.has(placementId)) return false
      return String(commission.status || '').toUpperCase() === 'PAID'
    })
    .reduce((sum, commission) => sum + safeNumber(commission.amount), 0)

  const payoutModeMap = new Map<string, number>()
  const placementStatusMap = new Map<string, number>()
  for (const placement of placementsRaw) {
    const mode = typeof placement.payoutMode === 'string' ? placement.payoutMode : 'NON_RENSEIGNE'
    payoutModeMap.set(mode, (payoutModeMap.get(mode) || 0) + 1)

    const status = typeof placement.status === 'string' ? placement.status : 'NON_RENSEIGNE'
    placementStatusMap.set(status, (placementStatusMap.get(status) || 0) + 1)
  }

  return {
    title: 'Placements',
    subtitle: 'Vision des demandes, placements actifs et risque de commissions en retard.',
    kpis: [
      numberKpi('demands_pending', 'Demandes en attente', pending, 'Demandes a traiter', 'warning'),
      numberKpi('placements_active', 'Placements actifs', activePlacements.length, 'Placements en cours', 'primary'),
      currencyKpi('active_amount', 'Montant total place', totalAmountActive, 'Capital actif', 'primary'),
      numberKpi('overdue_commissions', 'Commissions en retard', overdueCommissionCount, 'Placements avec retard', 'danger'),
      currencyKpi('commissions_monthly', 'Commissions mensuelles', totalMonthlyCommissionRunRate, 'Rythme mensuel theorique', 'success'),
      currencyKpi('benefit_estimated', 'Benefices estimes', totalProjectedCommissions, 'Total commissions theorique sur duree', 'success'),
      currencyKpi('benefit_paid', 'Benefices encaisses', paidCommissions, 'Commissions effectivement payees', 'success'),
      currencyKpi('losses_at_risk', 'Pertes a risque', lossesAtRisk, 'Commissions dues potentiellement perdues', 'danger'),
      percentKpi('commission_rate', 'Taux commissions moyen', safePercent(weightedCommissionRate), `Moyenne ponderee sur ${activePlacements.length} placements`),
    ],
    distributions: [
      createDistribution('demand_status', 'Demandes par statut', [
        { label: 'En attente', value: pending },
        { label: 'Approuvees', value: approved },
        { label: 'Rejetees', value: rejected },
        { label: 'Converties', value: converted },
      ], 'bar', 'demandes'),
      createDistribution('payout_mode', 'Répartition par mode de paiement', topNFromMap(payoutModeMap, 4), 'pie', 'placements'),
      createDistribution('placement_status', 'Répartition des statuts des placements', topNFromMap(placementStatusMap, 6), 'bar', 'placements'),
    ],
  }
}

function buildAdministrationPayload(
  adminsRaw: FirestoreRecord[],
  topActionCounts: Map<string, number>
): DashboardTabPayload {
  const totalAdmins = adminsRaw.length
  const activeAdmins = adminsRaw.filter((admin) => admin.isActive !== false).length
  const inactiveAdmins = totalAdmins - activeAdmins

  const rolesMap = new Map<string, number>()
  const namesById = new Map<string, string>()

  for (const admin of adminsRaw) {
    const adminId = admin.id
    const firstName = typeof admin.firstName === 'string' ? admin.firstName : ''
    const lastName = typeof admin.lastName === 'string' ? admin.lastName : ''
    const fullName = `${firstName} ${lastName}`.trim() || adminId
    namesById.set(adminId, fullName)

    const roles = Array.isArray(admin.roles)
      ? admin.roles.filter((role): role is string => typeof role === 'string')
      : []

    if (roles.length === 0) {
      rolesMap.set('Sans role', (rolesMap.get('Sans role') || 0) + 1)
      continue
    }

    for (const role of roles) {
      rolesMap.set(role, (rolesMap.get(role) || 0) + 1)
    }
  }

  const topAdmins = Array.from(topActionCounts.entries())
    .map(([adminId, count]) => ({
      label: namesById.get(adminId) || adminId,
      value: count,
      subLabel: adminId,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)

  return {
    title: 'Administration',
    subtitle: 'Pilotage des comptes admins et activite de traitement.',
    kpis: [
      numberKpi('admins_total', 'Total admins', totalAdmins, 'Comptes administrateurs', 'primary'),
      numberKpi('admins_active', 'Admins actifs', activeAdmins, 'Comptes actifs', 'success'),
      numberKpi('admins_inactive', 'Admins inactifs', inactiveAdmins, 'Comptes desactives', 'warning'),
      numberKpi('admins_top_processed', 'Admins traiteurs', topAdmins.length, 'Avec activite sur periode', 'neutral'),
    ],
    distributions: [
      createDistribution('roles', 'Répartition par rôle', topNFromMap(rolesMap, 6), 'pie', 'comptes'),
    ],
    rankings: [
      createRanking('top_admins', 'Principaux admins traiteurs', topAdmins, 'actions'),
    ],
  }
}

function toLocalDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getCallActivityMetrics(
  callPlans: FirestoreRecord[],
  callLogs: FirestoreRecord[],
  dateRange: DateRange | null
): CallActivityMetrics {
  const now = new Date()
  const todayKey = toLocalDateKey(now)
  const weekStart = new Date(now)
  const day = weekStart.getDay()
  weekStart.setDate(weekStart.getDate() - (day === 0 ? 6 : day - 1))
  const weekStartKey = toLocalDateKey(weekStart)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  const weekEndKey = toLocalDateKey(weekEnd)

  const scheduledWeekPlans = callPlans.filter((plan) => {
    const scheduledDate = typeof plan.scheduledDate === 'string' ? plan.scheduledDate : ''
    return scheduledDate >= weekStartKey && scheduledDate <= weekEndKey
  })
  // Le taux ne pénalise pas les appels planifiés plus tard dans la semaine.
  const weekPlans = scheduledWeekPlans.filter((plan) => String(plan.scheduledDate || '') <= todayKey)
  const todayPlans = weekPlans.filter((plan) => plan.scheduledDate === todayKey)
  const completedThisWeek = weekPlans.filter((plan) => plan.status === 'completed').length
  const periodLogs = filterRecordsByDate(callLogs, dateRange, ['createdAt'])
  const reachedOutcomes = new Set(['promesse_paiement', 'paiement_effectue', 'refus', 'a_rappeler'])
  const reached = periodLogs.filter((log) => reachedOutcomes.has(String(log.outcome || ''))).length

  return {
    weekPlans,
    periodLogs,
    plannedToday: todayPlans.filter((plan) => plan.status !== 'completed').length,
    completedToday: todayPlans.filter((plan) => plan.status === 'completed').length,
    overduePlans: callPlans.filter((plan) => {
      const scheduledDate = typeof plan.scheduledDate === 'string' ? plan.scheduledDate : ''
      return scheduledDate && scheduledDate < todayKey && plan.status !== 'completed'
    }).length,
    completionRate: weekPlans.length > 0 ? (completedThisWeek / weekPlans.length) * 100 : 0,
    promises: periodLogs.filter((log) => log.outcome === 'promesse_paiement').length,
    unreachable: periodLogs.filter((log) => log.outcome === 'injoignable').length,
    reachRate: periodLogs.length > 0 ? (reached / periodLogs.length) * 100 : 0,
  }
}

function buildRecouvrementPayload(
  agentsRaw: FirestoreRecord[],
  paymentsRaw: FirestoreRecord[],
  callPlansRaw: FirestoreRecord[],
  callLogsRaw: FirestoreRecord[],
  dateRange: DateRange | null
): DashboardTabPayload {
  const agents = agentsRaw
  const totalAgents = agents.length
  const activeAgents = agents.filter((agent) => agent.actif !== false)
  const inactiveAgentsCount = totalAgents - activeAgents.length
  const menCount = agents.filter((agent) => String(agent.sexe || '').toUpperCase() === 'M').length
  const womenCount = agents.filter((agent) => String(agent.sexe || '').toUpperCase() === 'F').length
  const currentMonth = new Date().getMonth() + 1
  const birthdaysThisMonth = activeAgents.filter((agent) => safeNumber(agent.birthMonth) === currentMonth).length

  const periodPayments = filterRecordsByDate(paymentsRaw, dateRange, ['date', 'recordedAt', 'createdAt'])
  const relevantPayments = periodPayments.filter((payment) => safeNumber(payment.amount) > 0)

  const collectedByAgent = new Map<string, number>()
  let amountWithoutAgent = 0
  let countWithoutAgent = 0

  for (const payment of relevantPayments) {
    const amount = safeNumber(payment.amount)
    const agentId = typeof payment.agentRecouvrementId === 'string' ? payment.agentRecouvrementId : null

    if (agentId) {
      collectedByAgent.set(agentId, (collectedByAgent.get(agentId) || 0) + amount)
    } else {
      amountWithoutAgent += amount
      countWithoutAgent += 1
    }
  }

  const agentNameById = new Map<string, string>()
  for (const agent of agents) {
    const name = `${typeof agent.nom === 'string' ? agent.nom : ''} ${typeof agent.prenom === 'string' ? agent.prenom : ''}`.trim()
    agentNameById.set(agent.id, name || agent.id)
  }

  const topCollectors = Array.from(collectedByAgent.entries())
    .map(([agentId, totalAmount]) => ({
      label: agentNameById.get(agentId) || agentId,
      value: Math.round(totalAmount),
      subLabel: agentId,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)

  const totalPaymentCount = relevantPayments.length
  const tauxSansAgent = totalPaymentCount > 0 ? (countWithoutAgent / totalPaymentCount) * 100 : 0
  const callMetrics = getCallActivityMetrics(callPlansRaw, callLogsRaw, dateRange)

  const outcomeLabels: Record<string, string> = {
    promesse_paiement: 'Promesse de paiement',
    paiement_effectue: 'Paiement effectué',
    injoignable: 'Injoignable',
    numero_invalide: 'Numéro invalide',
    refus: 'Refus de payer',
    a_rappeler: 'À rappeler',
    message_envoye: 'Message envoyé',
    autre: 'Autre',
  }
  const outcomes = new Map<string, number>()
  const contactsByAdmin = new Map<string, { name: string; count: number }>()
  for (const log of callMetrics.periodLogs) {
    const outcome = typeof log.outcome === 'string' ? log.outcome : 'autre'
    outcomes.set(outcome, (outcomes.get(outcome) || 0) + 1)

    const adminId = typeof log.adminId === 'string' && log.adminId ? log.adminId : 'non-renseigne'
    const adminName = typeof log.adminName === 'string' && log.adminName ? log.adminName : adminId
    const current = contactsByAdmin.get(adminId)
    contactsByAdmin.set(adminId, { name: adminName, count: (current?.count || 0) + 1 })
  }

  const outcomeDistribution = Array.from(outcomes.entries())
    .map(([outcome, count]) => ({ label: outcomeLabels[outcome] || outcome, value: count }))
    .sort((a, b) => b.value - a.value)
  const contactRanking = Array.from(contactsByAdmin.values())
    .map((contact) => ({ label: contact.name, value: contact.count, href: routes.admin.relances }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)

  return {
    title: 'Recouvrement',
    subtitle: 'Pilotage des appels planifiés, des résultats de relance et des encaissements.',
    kpis: [
      numberKpi('calls_today', "Appels à faire aujourd'hui", callMetrics.plannedToday, `${callMetrics.completedToday} déjà terminé(s)`, callMetrics.plannedToday > 0 ? 'warning' : 'success', routes.admin.calendrier),
      numberKpi('calls_overdue', 'Appels planifiés en retard', callMetrics.overduePlans, 'Lots non terminés avant aujourd’hui', callMetrics.overduePlans > 0 ? 'danger' : 'success', routes.admin.calendrier),
      percentKpi('weekly_completion', 'Réalisation de la semaine', callMetrics.completionRate, `${callMetrics.weekPlans.filter((plan) => plan.status === 'completed').length}/${callMetrics.weekPlans.length} appels`, callMetrics.completionRate >= 80 ? 'success' : callMetrics.weekPlans.length > 0 ? 'warning' : 'neutral', routes.admin.calendrier),
      numberKpi('promises', 'Promesses de paiement', callMetrics.promises, 'Sur la période sélectionnée', 'primary', routes.admin.relances),
      percentKpi('reach_rate', 'Taux de joignabilité', callMetrics.reachRate, `${callMetrics.periodLogs.length} contact(s) enregistré(s)`, callMetrics.reachRate >= 60 ? 'success' : 'neutral', routes.admin.relances),
      numberKpi('unreachable', 'Contacts injoignables', callMetrics.unreachable, 'Sur la période sélectionnée', callMetrics.unreachable > 0 ? 'warning' : 'neutral', routes.admin.relances),
      numberKpi('agents_total', 'Total agents', totalAgents, 'Agents de recouvrement', 'primary', routes.admin.agentsRecouvrement),
      numberKpi('agents_active', 'Agents actifs', activeAgents.length, 'Disponibles', 'success', routes.admin.agentsRecouvrement),
      numberKpi('birthdays', 'Anniversaires du mois', birthdaysThisMonth, 'Agents actifs concernés', 'neutral'),
      percentKpi('without_agent_rate', 'Paiements sans agent', tauxSansAgent, `${countWithoutAgent} paiement(s)`, tauxSansAgent > 0 ? 'warning' : 'success'),
    ],
    distributions: [
      createDistribution('call_outcomes', 'Résultats des relances', outcomeDistribution, 'pie', 'contacts'),
      createDistribution('gender', 'Repartition H/F', [
        { label: 'Hommes', value: menCount },
        { label: 'Femmes', value: womenCount },
      ], 'pie', 'agents'),
      createDistribution('activity', 'Statut activite', [
        { label: 'Actifs', value: activeAgents.length },
        { label: 'Inactifs', value: inactiveAgentsCount },
      ], 'bar', 'agents'),
    ],
    rankings: [
      createRanking('contact_activity', 'Contacts enregistrés par utilisateur', contactRanking, 'contacts'),
      createRanking('top_collectors', 'Principaux collecteurs', topCollectors, 'FCFA'),
      createRanking('without_agent_amount', 'Encaissements hors agent', [
        {
          label: 'Montant sans agent',
          value: Math.round(amountWithoutAgent),
          subLabel: `${countWithoutAgent} paiements`,
        },
      ], 'FCFA'),
    ],
  }
}

function buildGroupesPayload(groupsRaw: FirestoreRecord[], memberScope: MemberScopeContext): DashboardTabPayload {
  const groups = groupsRaw
  const members = memberScope.scopedMembers

  const memberCountByGroup = new Map<string, number>()
  let membersWithoutGroup = 0

  for (const member of members) {
    const groupIds = Array.isArray(member.groupIds) ? member.groupIds : []
    if (groupIds.length === 0) {
      membersWithoutGroup += 1
      continue
    }

    for (const groupId of groupIds) {
      memberCountByGroup.set(groupId, (memberCountByGroup.get(groupId) || 0) + 1)
    }
  }

  const groupsWithMembers = groups.filter((group) => (memberCountByGroup.get(group.id) || 0) > 0).length
  const groupsWithoutMembers = Math.max(groups.length - groupsWithMembers, 0)

  const topGroups = groups
    .map((group) => {
      const count = memberCountByGroup.get(group.id) || 0
      const label = typeof group.name === 'string' && group.name.trim() ? group.name : group.id
      return {
        label,
        value: count,
        subLabel: group.id,
      }
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)

  return {
    title: 'Groupes',
    subtitle: 'Vue structurelle des groupes et repartition des membres.',
    kpis: [
      numberKpi('groups_total', 'Total groupes', groups.length, 'Groupes referencies', 'primary'),
      numberKpi('groups_with_members', 'Groupes avec membres', groupsWithMembers, 'Groupes actifs', 'success'),
      numberKpi('groups_empty', 'Groupes vides', groupsWithoutMembers, 'A consolider', 'warning'),
      numberKpi('members_without_group', 'Membres sans groupe', membersWithoutGroup, 'Membres scopes', 'danger'),
    ],
    distributions: [
      createDistribution('group_coverage', 'Couverture des groupes', [
        { label: 'Groupes avec membres', value: groupsWithMembers },
        { label: 'Groupes vides', value: groupsWithoutMembers },
      ], 'pie', 'groupes'),
    ],
    rankings: [
      createRanking('top_groups', 'Principaux groupes par effectif', topGroups, 'membres'),
    ],
  }
}

function buildMetiersPayload(professionsRaw: FirestoreRecord[], memberScope: MemberScopeContext): DashboardTabPayload {
  const members = memberScope.scopedMembers

  const professionCountMap = new Map<string, number>()
  let withProfession = 0

  for (const member of members) {
    const profession = normalizeText(member.profession)
    if (!profession) continue

    withProfession += 1
    professionCountMap.set(profession, (professionCountMap.get(profession) || 0) + 1)
  }

  const withoutProfession = Math.max(members.length - withProfession, 0)
  const topProfessions = topNFromMap(professionCountMap, 10)
  const mostRepresented = topProfessions[0]

  return {
    title: 'Metiers',
    subtitle: 'Repartition professionnelle des membres et metiers dominants.',
    kpis: [
      numberKpi('professions_ref', 'Metiers references', professionsRaw.length, 'Collection professions', 'primary'),
      numberKpi('members_with_profession', 'Membres avec metier', withProfession, 'Profil renseigne', 'success'),
      numberKpi('members_without_profession', 'Membres sans metier', withoutProfession, 'Profil incomplet', 'warning'),
      numberKpi(
        'most_represented_profession',
        'Metier le plus exerce',
        mostRepresented?.value || 0,
        mostRepresented ? mostRepresented.label : 'Aucun metier domine',
        'neutral'
      ),
    ],
    distributions: [
      createDistribution('profession_completion', 'Completeness metier', [
        { label: 'Avec metier', value: withProfession },
        { label: 'Sans metier', value: withoutProfession },
      ], 'pie', 'membres'),
    ],
    rankings: [
      createRanking('top_professions', 'Principaux metiers', topProfessions, 'membres'),
    ],
  }
}

function buildGeographiePayload(memberScope: MemberScopeContext): DashboardTabPayload {
  const members = memberScope.scopedMembers

  const provinceMap = new Map<string, number>()
  const cityMap = new Map<string, number>()
  const districtMap = new Map<string, number>()
  const arrondissementMap = new Map<string, number>()

  let membersWithProvinceAndCity = 0

  for (const member of members) {
    const province = normalizeText(member.address?.province)
    const city = normalizeText(member.address?.city)
    const district = normalizeText(member.address?.district)
    const arrondissement = normalizeText(member.address?.arrondissement)

    if (province) {
      provinceMap.set(province, (provinceMap.get(province) || 0) + 1)
    }
    if (city) {
      cityMap.set(city, (cityMap.get(city) || 0) + 1)
    }
    if (district) {
      districtMap.set(district, (districtMap.get(district) || 0) + 1)
    }
    if (arrondissement) {
      arrondissementMap.set(arrondissement, (arrondissementMap.get(arrondissement) || 0) + 1)
    }

    if (province && city) {
      membersWithProvinceAndCity += 1
    }
  }

  const coverage = members.length > 0 ? (membersWithProvinceAndCity / members.length) * 100 : 0

  return {
    title: 'Geographie',
    subtitle: 'Repartition territoriale des membres (province, ville, quartier, arrondissement).',
    kpis: [
      numberKpi('province_count', 'Provinces couvertes', provinceMap.size, 'Avec au moins un membre', 'primary'),
      numberKpi('city_count', 'Villes couvertes', cityMap.size, 'Avec au moins un membre', 'primary'),
      numberKpi('district_count', 'Quartiers couverts', districtMap.size, 'Champ district', 'neutral'),
      percentKpi('coverage_rate', 'Taux couverture adresse', coverage, `${membersWithProvinceAndCity}/${members.length} membres`),
    ],
    rankings: [
      createRanking('top_provinces', 'Principales provinces', topNFromMap(provinceMap, 10), 'membres'),
      createRanking('top_cities', 'Principales villes', topNFromMap(cityMap, 10), 'membres'),
      createRanking('top_districts', 'Principaux quartiers', topNFromMap(districtMap, 10), 'membres'),
      createRanking('top_arrondissements', 'Principaux arrondissements', topNFromMap(arrondissementMap, 10), 'membres'),
    ],
  }
}

function buildExecutivePayload(
  memberScope: MemberScopeContext,
  membershipRequests: FirestoreRecord[],
  caisseSpecialeDemands: FirestoreRecord[],
  caisseSpecialeContracts: FirestoreRecord[],
  caisseImprevueDemands: FirestoreRecord[],
  caisseImprevueContracts: FirestoreRecord[],
  creditDemands: FirestoreRecord[],
  creditContracts: FirestoreRecord[],
  placementDemands: FirestoreRecord[],
  placements: FirestoreRecord[],
  callPlans: FirestoreRecord[],
  financialReport: FinancialReport,
  filters: DashboardFilters
): DashboardTabPayload {
  const creditTypeOf = (record: FirestoreRecord): 'SPECIALE' | 'FIXE' | 'AIDE' | 'UNKNOWN' => {
    const normalized = String(record.creditType || '').toUpperCase()
    if (normalized === 'SPECIALE' || normalized === 'FIXE' || normalized === 'AIDE') return normalized
    return 'UNKNOWN'
  }

  const computeCiEstimatedOverdue = (contracts: FirestoreRecord[]) => {
    const today = new Date()
    return contracts.filter((contract) => {
      if (getStatus(contract) !== 'ACTIVE') return false
      const firstPaymentDate = toDate(contract.firstPaymentDate)
      if (!firstPaymentDate) return false

      const monthsElapsed = Math.max(
        0,
        (today.getFullYear() - firstPaymentDate.getFullYear()) * 12 +
          (today.getMonth() - firstPaymentDate.getMonth()) +
          (today.getDate() >= firstPaymentDate.getDate() ? 1 : 0)
      )

      const expectedPaid = Math.min(monthsElapsed, safeNumber(contract.subscriptionCIDuration))
      const actualPaid = safeNumber(contract.totalMonthsPaid)
      return expectedPaid > 0 && actualPaid < expectedPaid
    }).length
  }

  const membersActive = memberScope.scopedMembers.filter((member) => member.isActive !== false).length

  const pendingMembershipRequests = membershipRequests.filter((request) => {
    const status = normalizeText(request.status)
    return status === 'pending' || status === 'under_review'
  }).length

  const pendingCaisseSpeciale = statusCount(caisseSpecialeDemands, 'PENDING')
  const pendingCaisseImprevue = pendingCount(caisseImprevueDemands, { includeReopened: true })
  const creditSpecialeDemands = creditDemands.filter((demand) => creditTypeOf(demand) === 'SPECIALE')
  const creditFixeDemands = creditDemands.filter((demand) => creditTypeOf(demand) === 'FIXE')
  const creditAideDemands = creditDemands.filter((demand) => creditTypeOf(demand) === 'AIDE')

  const pendingCreditSpeciale = statusCount(creditSpecialeDemands, 'PENDING')
  const pendingCreditFixe = statusCount(creditFixeDemands, 'PENDING')
  const pendingCreditAide = statusCount(creditAideDemands, 'PENDING')
  const pendingCredit = pendingCreditSpeciale + pendingCreditFixe + pendingCreditAide
  const pendingPlacement = statusCount(placementDemands, 'PENDING')

  const pendingGlobal = pendingMembershipRequests + pendingCaisseSpeciale + pendingCaisseImprevue + pendingCredit + pendingPlacement

  const csEncours = getFinancialLine(financialReport, 'caisse_speciale', 'outstanding', 'funds_held')?.values.at(-1) || 0
  const ciEncours = getFinancialLine(financialReport, 'caisse_imprevue', 'outstanding', 'funds_held')?.values.at(-1) || 0

  const creditSpecialeContracts = creditContracts.filter((contract) => creditTypeOf(contract) === 'SPECIALE')
  const creditFixeContracts = creditContracts.filter((contract) => creditTypeOf(contract) === 'FIXE')

  const creditSpecialeEncours = getFinancialLine(financialReport, 'credit_speciale', 'outstanding', 'receivables')?.values.at(-1) || 0
  const creditFixeEncours = getFinancialLine(financialReport, 'credit_fixe', 'outstanding', 'receivables')?.values.at(-1) || 0
  const creditAideEncours = getFinancialLine(financialReport, 'credit_aide', 'outstanding', 'receivables')?.values.at(-1) || 0
  const placementEncours = getFinancialLine(financialReport, 'placements', 'outstanding', 'capital_to_return')?.values.at(-1) || 0
  const restCreditContracts = [...creditSpecialeContracts, ...creditFixeContracts]
  const restMonthsGlobal = restCreditContracts.reduce((sum, contract) => sum + extractRestMonthEntries(contract).length, 0)
  const restImpactGlobal = restCreditContracts.reduce((sum, contract) => {
    const entries = extractRestMonthEntries(contract)
    return sum + entries.reduce((acc, entry) => acc + Math.max(entry.monthlyAmount, 0), 0)
  }, 0)
  const callMetrics = getCallActivityMetrics(callPlans, [], null)
  const receivablesTotal = getFinancialLine(financialReport, 'synthesis', 'outstanding', 'receivables_total')?.values.at(-1) || 0
  const fundsToReturnTotal = getFinancialLine(financialReport, 'synthesis', 'outstanding', 'payables_total')?.values.at(-1) || 0
  const lateCreditAmount = getFinancialLine(financialReport, 'synthesis', 'risks', 'late_amount')?.values.at(-1) || 0
  const lateCreditContracts = getFinancialLine(financialReport, 'synthesis', 'risks', 'late_contracts')?.values.at(-1) || 0
  const unpaidCreditPenalties = getFinancialLine(financialReport, 'synthesis', 'risks', 'unpaid_penalties')?.values.at(-1) || 0
  const confirmedLosses = getFinancialLine(financialReport, 'synthesis', 'risks', 'losses')?.values.at(-1) || 0
  const currentMonthIn = getFinancialLine(financialReport, 'synthesis', 'treasury', 'in_total')?.values.at(-1) || 0
  const currentMonthNet = getFinancialLine(financialReport, 'synthesis', 'treasury', 'net')?.values.at(-1) || 0
  const currentMonthResult = getFinancialLine(financialReport, 'synthesis', 'result', 'net')?.values.at(-1) || 0

  const detailedModuleSummaries = [
    {
      label: 'Caisse speciale',
      href: routes.admin.caisseSpeciale,
      family: 'caisse' as const,
      pending: pendingCaisseSpeciale,
      encours: csEncours,
      impayes: caisseSpecialeContracts.filter((contract) => {
        const status = getStatus(contract)
        return status === 'LATE_NO_PENALTY' || status === 'LATE_WITH_PENALTY'
      }).length,
    },
    {
      label: 'Caisse imprevue',
      href: routes.admin.caisseImprevue,
      family: 'caisse' as const,
      pending: pendingCaisseImprevue,
      encours: ciEncours,
      impayes: computeCiEstimatedOverdue(caisseImprevueContracts),
    },
    {
      label: 'Caisse aide',
      href: routes.admin.creditAide,
      family: 'credit' as const,
      pending: pendingCreditAide,
      encours: creditAideEncours,
      impayes: getFinancialLine(financialReport, 'credit_aide', 'risks', 'late_contracts')?.values.at(-1) || 0,
    },
    {
      label: 'Credit speciale',
      href: routes.admin.creditSpeciale,
      family: 'credit' as const,
      pending: pendingCreditSpeciale,
      encours: creditSpecialeEncours,
      impayes: getFinancialLine(financialReport, 'credit_speciale', 'risks', 'late_contracts')?.values.at(-1) || 0,
    },
    {
      label: 'Credit fixe',
      href: routes.admin.creditFixe,
      family: 'credit' as const,
      pending: pendingCreditFixe,
      encours: creditFixeEncours,
      impayes: getFinancialLine(financialReport, 'credit_fixe', 'risks', 'late_contracts')?.values.at(-1) || 0,
    },
    {
      label: 'Placements',
      href: routes.admin.placements,
      family: 'placement' as const,
      pending: pendingPlacement,
      encours: placementEncours,
      impayes: placements.filter((placement) => placement.hasOverdueCommission === true).length,
    },
  ]

  const selectedModule = filters.moduleCompare
  const selectedDetailedSummaries =
    selectedModule === 'all'
      ? detailedModuleSummaries
      : detailedModuleSummaries.filter((summary) => summary.family === selectedModule)

  const activeMemberRows = new Map<string, {
    memberId: string
    name: string
    matricule: string
    modules: Set<string>
    contratsActifs: number
    encours: number
  }>()

  const getMemberDisplayInfo = (memberId: string): { name: string; matricule: string } => {
    const member = memberScope.scopedMembers.find((item) => item.id === memberId)
    if (!member) return { name: memberId, matricule: '-' }

    const firstName = typeof (member as Record<string, unknown>).firstName === 'string'
      ? String((member as Record<string, unknown>).firstName).trim()
      : ''
    const lastName = typeof (member as Record<string, unknown>).lastName === 'string'
      ? String((member as Record<string, unknown>).lastName).trim()
      : ''
    const fullName = `${firstName} ${lastName}`.trim()
    const matricule = typeof (member as Record<string, unknown>).matricule === 'string'
      ? String((member as Record<string, unknown>).matricule).trim()
      : ''

    return {
      name: fullName || memberId,
      matricule: matricule || '-',
    }
  }

  const ensureActiveMemberRow = (memberId: string) => {
    const existing = activeMemberRows.get(memberId)
    if (existing) return existing
    const info = getMemberDisplayInfo(memberId)
    const created = {
      memberId,
      name: info.name,
      matricule: info.matricule,
      modules: new Set<string>(),
      contratsActifs: 0,
      encours: 0,
    }
    activeMemberRows.set(memberId, created)
    return created
  }

  for (const contract of caisseSpecialeContracts) {
    const status = getStatus(contract)
    if (status !== 'ACTIVE' && status !== 'LATE_NO_PENALTY' && status !== 'LATE_WITH_PENALTY') continue
    const memberId = getMemberIdFrom(contract, ['memberId'])
    if (!memberId) continue
    const row = ensureActiveMemberRow(memberId)
    row.modules.add('Caisse speciale')
    row.contratsActifs += 1
    const encours = Math.max((safeNumber(contract.monthlyAmount) * safeNumber(contract.monthsPlanned)) - safeNumber(contract.nominalPaid), 0)
    row.encours += encours
  }

  for (const contract of caisseImprevueContracts) {
    if (getStatus(contract) !== 'ACTIVE') continue
    const memberId = getMemberIdFrom(contract, ['memberId'])
    if (!memberId) continue
    const row = ensureActiveMemberRow(memberId)
    row.modules.add('Caisse imprevue')
    row.contratsActifs += 1
    row.encours += Math.max(safeNumber(contract.subscriptionCINominal), 0)
  }

  for (const contract of creditContracts) {
    const status = getStatus(contract)
    if (status !== 'ACTIVE' && status !== 'OVERDUE' && status !== 'PARTIAL') continue
    const memberId = getMemberIdFrom(contract, ['clientId'])
    if (!memberId) continue
    const row = ensureActiveMemberRow(memberId)
    const creditType = creditTypeOf(contract)
    row.modules.add(
      creditType === 'SPECIALE'
        ? 'Credit speciale'
        : creditType === 'FIXE'
          ? 'Credit fixe'
          : creditType === 'AIDE'
            ? 'Caisse aide'
            : 'Credit'
    )
    row.contratsActifs += 1
    const remaining = safeNumber(contract.amountRemaining)
    if (remaining > 0) {
      row.encours += remaining
    } else {
      row.encours += Math.max((safeNumber(contract.totalAmount) || safeNumber(contract.amount)) - safeNumber(contract.amountPaid), 0)
    }
  }

  for (const placement of placements) {
    if (String(placement.status || '').toLowerCase() !== 'active') continue
    const memberId = getMemberIdFrom(placement, ['benefactorId'])
    if (!memberId) continue
    const row = ensureActiveMemberRow(memberId)
    row.modules.add('Placements')
    row.contratsActifs += 1
    row.encours += Math.max(safeNumber(placement.amount), 0)
  }

  const membersWithActiveContracts = Array.from(activeMemberRows.values())
    .sort((a, b) => {
      const moduleDiff = b.modules.size - a.modules.size
      if (moduleDiff !== 0) return moduleDiff
      const contractDiff = b.contratsActifs - a.contratsActifs
      if (contractDiff !== 0) return contractDiff
      return b.encours - a.encours
    })

  const moduleDistribution = selectedDetailedSummaries.map((summary) => ({ label: summary.label, value: summary.pending }))
  const encoursDistribution = selectedDetailedSummaries.map((summary) => ({ label: summary.label, value: Math.round(summary.encours) }))

  return {
    title: 'Exécutif',
    subtitle: "Les priorités du jour, les risques à surveiller et l'état des principaux modules.",
    kpis: [
      numberKpi('calls_today', "Appels à traiter aujourd'hui", callMetrics.plannedToday, `${callMetrics.completedToday} déjà terminé(s)`, callMetrics.plannedToday > 0 ? 'warning' : 'success', routes.admin.calendrier),
      numberKpi('calls_overdue', 'Appels planifiés en retard', callMetrics.overduePlans, 'Lots des jours précédents non terminés', callMetrics.overduePlans > 0 ? 'danger' : 'success', routes.admin.calendrier),
      numberKpi('pending_global', 'Demandes en attente', pendingGlobal, 'Tous modules confondus', pendingGlobal > 0 ? 'warning' : 'success'),
      numberKpi('late_credit_contracts', 'Contrats de crédit en retard', lateCreditContracts, 'Échéances réellement dépassées', lateCreditContracts > 0 ? 'danger' : 'success', routes.admin.calendrier),
      percentKpi('weekly_call_completion', 'Réalisation des appels', callMetrics.completionRate, 'Semaine en cours', callMetrics.completionRate >= 80 ? 'success' : callMetrics.weekPlans.length > 0 ? 'warning' : 'neutral', routes.admin.calendrier),
      currencyKpi('receivables_total', 'Sommes dues à l’association', receivablesTotal, 'Créances actuelles vérifiées', 'primary', routes.admin.financialReports),
      currencyKpi('funds_to_return_total', 'Fonds à restituer', fundsToReturnTotal, 'Épargne et capitaux détenus', 'primary', routes.admin.financialReports),
      currencyKpi('late_credit_amount', 'Échéances de crédit en retard', lateCreditAmount, 'Montant déjà exigible', lateCreditAmount > 0 ? 'danger' : 'success', routes.admin.calendrier),
      currencyKpi('unpaid_credit_penalties', 'Pénalités de crédit impayées', unpaidCreditPenalties, 'Pénalités créées et non réglées', unpaidCreditPenalties > 0 ? 'warning' : 'success', routes.admin.creditSpecialeContrats),
      currencyKpi('confirmed_losses', 'Pertes réellement constatées', confirmedLosses, 'Créances clôturées en perte', confirmedLosses > 0 ? 'danger' : 'success', routes.admin.financialReports),
      currencyKpi('current_month_in', 'Entrées du mois', currentMonthIn, 'Encaissements réels du mois en cours', 'success', routes.admin.financialReports),
      currencyKpi('current_month_net', 'Solde de trésorerie du mois', currentMonthNet, 'Entrées moins sorties du mois', currentMonthNet >= 0 ? 'success' : 'danger', routes.admin.financialReports),
      currencyKpi('current_month_result', 'Résultat net du mois', currentMonthResult, 'Produits moins charges', currentMonthResult >= 0 ? 'success' : 'danger', routes.admin.financialReports),
      numberKpi('members_active', 'Membres actifs', membersActive, 'Membres du périmètre sélectionné', 'primary', routes.admin.memberships),
      numberKpi('members_with_active_contracts', 'Membres avec contrats actifs', membersWithActiveContracts.length, 'Tous modules confondus', 'primary'),
      numberKpi('rest_months_credit', 'Mois repos credits', restMonthsGlobal, 'Credits speciale + fixe', 'neutral'),
      currencyKpi('rest_impact_credit', 'Impact repos credits', restImpactGlobal, 'Revenu decale sur mois de repos', 'warning'),
    ],
    distributions: [
      createDistribution('pending_by_module', 'Demandes en attente par module détaillé', moduleDistribution, 'bar', 'demandes'),
      createDistribution('financial_position_by_module', 'Créances et fonds détenus par sous-module', encoursDistribution, 'pie', 'FCFA'),
    ],
    rankings: [
      createRanking(
        'members_with_active_contracts',
        'Membres avec contrats actifs (historique en cours)',
        membersWithActiveContracts.map((item) => ({
          label: `${item.name} (${item.matricule})`,
          value: item.modules.size,
          subLabel: `${item.contratsActifs} contrat(s) actif(s) | Modules: ${Array.from(item.modules).join(', ')} | Encours ${Math.round(item.encours).toLocaleString('fr-FR')} FCFA`,
          href: routes.admin.membershipDetails(item.memberId),
        })),
        'modules'
      ),
      createRanking(
        'module_alerts',
        'Alertes operationnelles par sous-module',
        selectedDetailedSummaries.map((summary) => ({
          label: summary.label,
          value: summary.impayes,
          subLabel: `En attente ${summary.pending} | Encours ${Math.round(summary.encours).toLocaleString('fr-FR')} FCFA`,
          href: summary.href,
        })),
        'alertes'
      ),
    ],
    financialSections: buildExecutiveFinancialSections(financialReport),
    notes: [
      'Les montants financiers vérifiés utilisent exactement le moteur des bilans financiers.',
      'Les sommes dues à l’association et les fonds à restituer sont volontairement séparés : ils n’ont pas la même nature comptable.',
      'Une perte n’est affichée que lorsqu’un crédit a réellement été clôturé en perte. Les retards restent présentés comme des créances exigibles.',
    ],
  }
}

export async function getDashboardFilterOptions(): Promise<DashboardFilterOptions> {
  const memberScope = await getMemberScope({
    period: 'all',
    memberType: 'all',
    zoneProvince: 'all',
    zoneCity: 'all',
    moduleCompare: 'all',
  })

  const provincesSet = new Set<string>()
  const citiesByProvinceMap = new Map<string, Set<string>>()

  for (const member of memberScope.allMembers) {
    const provinceRaw = member.address?.province
    const cityRaw = member.address?.city

    if (!provinceRaw || typeof provinceRaw !== 'string') continue

    const province = provinceRaw.trim()
    if (!province) continue

    provincesSet.add(province)

    if (!citiesByProvinceMap.has(province)) {
      citiesByProvinceMap.set(province, new Set<string>())
    }

    if (cityRaw && typeof cityRaw === 'string' && cityRaw.trim()) {
      citiesByProvinceMap.get(province)?.add(cityRaw.trim())
    }
  }

  const provinces = Array.from(provincesSet).sort((a, b) => a.localeCompare(b, 'fr'))
  const citiesByProvince: Record<string, string[]> = {}

  for (const [province, citySet] of citiesByProvinceMap.entries()) {
    citiesByProvince[province] = Array.from(citySet).sort((a, b) => a.localeCompare(b, 'fr'))
  }

  return {
    provinces,
    citiesByProvince,
  }
}

function chunkValues<T>(values: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size))
  }
  return chunks
}

function ensureActiveMemberSummary(map: Map<string, ActiveMemberSummary>, memberId: string): ActiveMemberSummary {
  const current = map.get(memberId)
  if (current) return current
  const created: ActiveMemberSummary = {
    modules: new Set<string>(),
    contractsActive: 0,
    encours: 0,
  }
  map.set(memberId, created)
  return created
}

async function readContractsForMemberIds(
  adminFirestore: Firestore,
  collectionName: string,
  memberField: string,
  memberIds: string[]
): Promise<FirestoreRecord[]> {
  if (memberIds.length === 0) return []

  const idChunks = chunkValues(memberIds, 30)
  const chunkPromises = idChunks.map(async (chunk) => {
    const snap = await adminFirestore.collection(collectionName).where(memberField, 'in', chunk).get()
    return snap.docs.map((docSnap: FirebaseFirestore.QueryDocumentSnapshot) => ({
      id: docSnap.id,
      ...(docSnap.data() as Record<string, unknown>),
    }))
  })

  const docsByChunk = await Promise.all(chunkPromises)
  return docsByChunk.flat()
}

async function loadActiveMemberSummaries(
  adminFirestore: Firestore,
  memberIds: string[]
): Promise<Map<string, ActiveMemberSummary>> {
  const summaries = new Map<string, ActiveMemberSummary>()

  const [caisseSpecialeContracts, caisseImprevueContracts, creditContracts, placements] = await Promise.all([
    readContractsForMemberIds(adminFirestore, firebaseCollectionNames.caisseContracts, 'memberId', memberIds),
    readContractsForMemberIds(adminFirestore, firebaseCollectionNames.contractsCI, 'memberId', memberIds),
    readContractsForMemberIds(adminFirestore, firebaseCollectionNames.creditContracts, 'clientId', memberIds),
    readContractsForMemberIds(adminFirestore, firebaseCollectionNames.placements, 'benefactorId', memberIds),
  ])

  for (const contract of caisseSpecialeContracts) {
    const status = getStatus(contract)
    if (status !== 'ACTIVE' && status !== 'LATE_NO_PENALTY' && status !== 'LATE_WITH_PENALTY') continue
    const memberId = getMemberIdFrom(contract, ['memberId'])
    if (!memberId) continue
    const summary = ensureActiveMemberSummary(summaries, memberId)
    summary.modules.add('Caisse speciale')
    summary.contractsActive += 1
    summary.encours += Math.max((safeNumber(contract.monthlyAmount) * safeNumber(contract.monthsPlanned)) - safeNumber(contract.nominalPaid), 0)
  }

  for (const contract of caisseImprevueContracts) {
    if (getStatus(contract) !== 'ACTIVE') continue
    const memberId = getMemberIdFrom(contract, ['memberId'])
    if (!memberId) continue
    const summary = ensureActiveMemberSummary(summaries, memberId)
    summary.modules.add('Caisse imprevue')
    summary.contractsActive += 1
    summary.encours += Math.max(safeNumber(contract.subscriptionCINominal), 0)
  }

  for (const contract of creditContracts) {
    const status = getStatus(contract)
    if (status !== 'ACTIVE' && status !== 'OVERDUE' && status !== 'PARTIAL') continue
    const memberId = getMemberIdFrom(contract, ['clientId'])
    if (!memberId) continue
    const summary = ensureActiveMemberSummary(summaries, memberId)
    const creditType = String(contract.creditType || '').toUpperCase()
    summary.modules.add(
      creditType === 'SPECIALE'
        ? 'Credit speciale'
        : creditType === 'FIXE'
          ? 'Credit fixe'
          : creditType === 'AIDE'
            ? 'Caisse aide'
            : 'Credit'
    )
    summary.contractsActive += 1
    const remaining = safeNumber(contract.amountRemaining)
    summary.encours += remaining > 0
      ? remaining
      : Math.max((safeNumber(contract.totalAmount) || safeNumber(contract.amount)) - safeNumber(contract.amountPaid), 0)
  }

  for (const placement of placements) {
    if (String(placement.status || '').toLowerCase() !== 'active') continue
    const memberId = getMemberIdFrom(placement, ['benefactorId'])
    if (!memberId) continue
    const summary = ensureActiveMemberSummary(summaries, memberId)
    summary.modules.add('Placements')
    summary.contractsActive += 1
    summary.encours += Math.max(safeNumber(placement.amount), 0)
  }

  return summaries
}

export async function getExecutiveActiveMembersPage(
  filters: DashboardFilters,
  cursor: string | null,
  pageSize = 20
): Promise<ExecutiveActiveMembersPage> {
  const { adminFirestore } = await import('@/firebase/adminFirestore')
  if (!adminFirestore) {
    throw new Error('Firestore admin indisponible')
  }

  const { FieldPath } = await import('firebase-admin/firestore')

  const safePageSize = Number.isFinite(pageSize) ? Math.max(1, Math.min(50, Math.floor(pageSize))) : 20
  const scanBatchSize = Math.max(60, safePageSize * 3)

  const items: ExecutiveActiveMembersPage['items'] = []
  let scanCursor = cursor
  let reachedEnd = false
  let scanGuard = 0

  while (items.length < safePageSize && !reachedEnd && scanGuard < 50) {
    scanGuard += 1

    let query = adminFirestore
      .collection(firebaseCollectionNames.users)
      .orderBy(FieldPath.documentId())
      .limit(scanBatchSize)

    if (scanCursor) {
      query = query.startAfter(scanCursor)
    }

    const usersSnap = await query.get()
    if (usersSnap.empty) {
      reachedEnd = true
      break
    }

    const userDocs = usersSnap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Record<string, unknown>),
    }))

    scanCursor = usersSnap.docs[usersSnap.docs.length - 1]?.id ?? scanCursor
    reachedEnd = usersSnap.docs.length < scanBatchSize

    const scopedMembers = userDocs
      .map((record) => toMemberRecord(record))
      .filter((member): member is DashboardMemberRecord => Boolean(member))
      .filter((member) => matchesMemberFilter(member, filters))

    if (scopedMembers.length === 0) {
      continue
    }

    const summaries = await loadActiveMemberSummaries(adminFirestore, scopedMembers.map((member) => member.id))

    for (const member of scopedMembers) {
      if (items.length >= safePageSize) break
      const summary = summaries.get(member.id)
      if (!summary || summary.contractsActive <= 0) continue

      const firstName = typeof member.firstName === 'string' ? member.firstName.trim() : ''
      const lastName = typeof member.lastName === 'string' ? member.lastName.trim() : ''
      const fullName = `${firstName} ${lastName}`.trim() || member.id
      const matricule = typeof member.matricule === 'string' && member.matricule.trim() ? member.matricule.trim() : '-'
      const modules = Array.from(summary.modules)

      items.push({
        memberId: member.id,
        label: `${fullName} (${matricule})`,
        value: summary.modules.size,
        subLabel: `${summary.contractsActive} contrat(s) actif(s) | Modules: ${modules.join(', ')} | Encours ${Math.round(summary.encours).toLocaleString('fr-FR')} FCFA`,
        href: routes.admin.membershipDetails(member.id),
      })
    }
  }

  return {
    items,
    pageSize: safePageSize,
    nextCursor: reachedEnd ? null : scanCursor,
    hasNextPage: !reachedEnd,
  }
}

function countActionsByAdmin(
  records: FirestoreRecord[],
  dateRange: DateRange | null,
  actorField: string,
  dateKeys: string[]
): Map<string, number> {
  const counter = new Map<string, number>()

  for (const record of records) {
    const actor = record[actorField]
    if (typeof actor !== 'string' || !actor.trim()) continue

    const actionDate = getDateFromRecord(record, dateKeys)
    if (!isInDateRange(actionDate, dateRange)) continue

    counter.set(actor, (counter.get(actor) || 0) + 1)
  }

  return counter
}

function mergeCounters(...counters: Map<string, number>[]): Map<string, number> {
  const merged = new Map<string, number>()
  for (const counter of counters) {
    for (const [key, value] of counter.entries()) {
      merged.set(key, (merged.get(key) || 0) + value)
    }
  }
  return merged
}

export async function getDashboardSnapshot(activeTab: DashboardTabKey, filters: DashboardFilters): Promise<DashboardSnapshot> {
  const dateRange = resolveDateRange(filters)
  const memberScope = await getMemberScope(filters)

  let snapshot: DashboardTabPayload

  if (activeTab === 'executive') {
    const { adminFirestore } = await import('@/firebase/adminFirestore')
    if (!adminFirestore) throw new Error('Firestore admin indisponible pour le calcul financier')

    const [
      financialSourcesRaw,
      membershipRequestsRaw,
      caisseSpecialeDemandsRaw,
      caisseImprevueDemandsRaw,
      creditDemandsRaw,
      placementDemandsRaw,
      callPlansRaw,
    ] = await Promise.all([
      loadFinancialReportSources(adminFirestore),
      readCollectionDocs(firebaseCollectionNames.membershipRequests),
      readCollectionDocs(firebaseCollectionNames.caisseSpecialeDemands),
      readCollectionDocs(firebaseCollectionNames.caisseImprevueDemands),
      readCollectionDocs(firebaseCollectionNames.creditDemands),
      readCollectionDocs(firebaseCollectionNames.placementDemands),
      readCollectionDocs(firebaseCollectionNames.callPlans),
    ])

    const financialSources = scopeFinancialSources(financialSourcesRaw, memberScope)
    const financialReport = buildCurrentFinancialReport(financialSources)
    const caisseSpecialeContracts = financialSources.caisseSpecialeContracts as FirestoreRecord[]
    const caisseImprevueContracts = financialSources.caisseImprevueContracts as FirestoreRecord[]
    const creditContracts = financialSources.creditContracts as unknown as FirestoreRecord[]
    const placements = financialSources.placements as FirestoreRecord[]

    // Executive: "en attente" est un stock actuel a traiter, pas un flux lie a la periode.
    const membershipRequests = membershipRequestsRaw

    const caisseSpecialeDemands = filterRecordsByMemberScope(
      caisseSpecialeDemandsRaw,
      memberScope,
      (record) => getMemberIdFrom(record, ['memberId'])
    )

    const caisseImprevueDemands = filterRecordsByMemberScope(
      caisseImprevueDemandsRaw,
      memberScope,
      (record) => getMemberIdFrom(record, ['memberId'])
    )

    const creditDemands = filterRecordsByMemberScope(
      creditDemandsRaw,
      memberScope,
      (record) => getMemberIdFrom(record, ['clientId'])
    )

    const placementDemands = filterRecordsByMemberScope(
      placementDemandsRaw,
      memberScope,
      (record) => getMemberIdFrom(record, ['benefactorId'])
    )

    const callPlans = filterRecordsByMemberScope(
      callPlansRaw,
      memberScope,
      (record) => getMemberIdFrom(record, ['memberId'])
    )

    snapshot = buildExecutivePayload(
      memberScope,
      membershipRequests,
      caisseSpecialeDemands,
      caisseSpecialeContracts,
      caisseImprevueDemands,
      caisseImprevueContracts,
      creditDemands,
      creditContracts,
      placementDemands,
      placements,
      callPlans,
      financialReport,
      filters
    )
  } else if (activeTab === 'caisse_speciale') {
    const [demandsRaw, contractsRaw, paymentsRaw] = await Promise.all([
      readCollectionDocs(firebaseCollectionNames.caisseSpecialeDemands),
      readCollectionDocs(firebaseCollectionNames.caisseContracts),
      readCollectionGroupDocs('payments'),
    ])

    const demands = filterRecordsByMemberScope(
      filterRecordsByDate(demandsRaw, dateRange, ['createdAt', 'desiredDate']),
      memberScope,
      (record) => getMemberIdFrom(record, ['memberId'])
    )

    const contracts = filterRecordsByMemberScope(
      filterRecordsByDate(contractsRaw, dateRange, ['createdAt']),
      memberScope,
      (record) => getMemberIdFrom(record, ['memberId'])
    )
    const payments = filterRecordsByDate(paymentsRaw, dateRange, ['date', 'recordedAt', 'createdAt', 'updatedAt'])

    snapshot = buildCaisseSpecialePayload(demands, contracts, payments)
  } else if (activeTab === 'caisse_imprevue') {
    const [demandsRaw, contractsRaw, paymentsRaw] = await Promise.all([
      readCollectionDocs(firebaseCollectionNames.caisseImprevueDemands),
      readCollectionDocs(firebaseCollectionNames.contractsCI),
      readCollectionGroupDocs('payments'),
    ])

    const demands = filterRecordsByMemberScope(
      filterRecordsByDate(demandsRaw, dateRange, ['createdAt', 'desiredDate']),
      memberScope,
      (record) => getMemberIdFrom(record, ['memberId'])
    )

    const contracts = filterRecordsByMemberScope(
      filterRecordsByDate(contractsRaw, dateRange, ['createdAt', 'firstPaymentDate']),
      memberScope,
      (record) => getMemberIdFrom(record, ['memberId'])
    )
    const payments = filterRecordsByDate(paymentsRaw, dateRange, ['date', 'recordedAt', 'createdAt', 'updatedAt'])

    snapshot = buildCaisseImprevuePayload(demands, contracts, payments)
  } else if (activeTab === 'credit_speciale' || activeTab === 'credit_fixe' || activeTab === 'caisse_aide') {
    const [demandsRaw, contractsRaw, penaltiesRaw, creditPaymentsRaw] = await Promise.all([
      readCollectionDocs(firebaseCollectionNames.creditDemands),
      readCollectionDocs(firebaseCollectionNames.creditContracts),
      readCollectionDocs(firebaseCollectionNames.creditPenalties),
      readCollectionDocs(firebaseCollectionNames.creditPayments),
    ])

    const demands = filterRecordsByMemberScope(
      filterRecordsByDate(demandsRaw, dateRange, ['createdAt', 'desiredDate']),
      memberScope,
      (record) => getMemberIdFrom(record, ['clientId'])
    )

    const contracts = filterRecordsByMemberScope(
      filterRecordsByDate(contractsRaw, dateRange, ['createdAt', 'firstPaymentDate']),
      memberScope,
      (record) => getMemberIdFrom(record, ['clientId'])
    )

    const creditType = activeTab === 'credit_speciale' ? 'SPECIALE' : activeTab === 'credit_fixe' ? 'FIXE' : 'AIDE'
    const creditPayments = filterRecordsByDate(creditPaymentsRaw, dateRange, ['paymentDate', 'createdAt'])
    snapshot = buildCreditPayload(creditType, demands, contracts, penaltiesRaw, creditPayments)
  } else if (activeTab === 'placements') {
    const [demandsRaw, placementsRaw, commissionsRaw] = await Promise.all([
      readCollectionDocs(firebaseCollectionNames.placementDemands),
      readCollectionDocs(firebaseCollectionNames.placements),
      readCollectionGroupDocs('commissions'),
    ])

    const demands = filterRecordsByMemberScope(
      filterRecordsByDate(demandsRaw, dateRange, ['createdAt', 'desiredDate']),
      memberScope,
      (record) => getMemberIdFrom(record, ['benefactorId'])
    )

    const placements = filterRecordsByMemberScope(
      filterRecordsByDate(placementsRaw, dateRange, ['createdAt', 'startDate']),
      memberScope,
      (record) => getMemberIdFrom(record, ['benefactorId'])
    )
    const commissions = filterRecordsByDate(commissionsRaw, dateRange, ['paidAt', 'dueDate', 'createdAt'])

    snapshot = buildPlacementsPayload(demands, placements, commissions)
  } else if (activeTab === 'administration') {
    const [adminsRaw, membershipRequestsRaw, csDemandsRaw, ciDemandsRaw, creditDemandsRaw, placementDemandsRaw] = await Promise.all([
      readCollectionDocs(firebaseCollectionNames.admins),
      readCollectionDocs(firebaseCollectionNames.membershipRequests),
      readCollectionDocs(firebaseCollectionNames.caisseSpecialeDemands),
      readCollectionDocs(firebaseCollectionNames.caisseImprevueDemands),
      readCollectionDocs(firebaseCollectionNames.creditDemands),
      readCollectionDocs(firebaseCollectionNames.placementDemands),
    ])

    const topActionCounts = mergeCounters(
      countActionsByAdmin(membershipRequestsRaw, dateRange, 'processedBy', ['processedAt', 'updatedAt', 'createdAt']),
      countActionsByAdmin(csDemandsRaw, dateRange, 'decisionMadeBy', ['decisionMadeAt', 'updatedAt', 'createdAt']),
      countActionsByAdmin(ciDemandsRaw, dateRange, 'decisionMadeBy', ['decisionMadeAt', 'updatedAt', 'createdAt']),
      countActionsByAdmin(creditDemandsRaw, dateRange, 'updatedBy', ['updatedAt', 'createdAt']),
      countActionsByAdmin(placementDemandsRaw, dateRange, 'decisionMadeBy', ['decisionMadeAt', 'updatedAt', 'createdAt'])
    )

    snapshot = buildAdministrationPayload(adminsRaw, topActionCounts)
  } else if (activeTab === 'recouvrement') {
    const [agentsRaw, paymentsRaw, callPlansRaw, callLogsRaw] = await Promise.all([
      readCollectionDocs(firebaseCollectionNames.agentsRecouvrement),
      readCollectionDocs(firebaseCollectionNames.payments),
      readCollectionDocs(firebaseCollectionNames.callPlans),
      readCollectionDocs(firebaseCollectionNames.callLogs),
    ])

    const callPlans = filterRecordsByMemberScope(
      callPlansRaw,
      memberScope,
      (record) => getMemberIdFrom(record, ['memberId'])
    )
    const callLogs = filterRecordsByMemberScope(
      callLogsRaw,
      memberScope,
      (record) => getMemberIdFrom(record, ['memberId'])
    )

    snapshot = buildRecouvrementPayload(agentsRaw, paymentsRaw, callPlans, callLogs, dateRange)
  } else if (activeTab === 'groupes') {
    const [groupsRaw] = await Promise.all([readCollectionDocs(firebaseCollectionNames.groups)])
    snapshot = buildGroupesPayload(groupsRaw, memberScope)
  } else if (activeTab === 'metiers') {
    const [professionsRaw] = await Promise.all([readCollectionDocs(firebaseCollectionNames.professions)])
    snapshot = buildMetiersPayload(professionsRaw, memberScope)
  } else {
    snapshot = buildGeographiePayload(memberScope)
  }

  const financialModuleByTab: Partial<Record<DashboardTabKey, Parameters<typeof applyAuthoritativeModuleFinancials>[2]>> = {
    caisse_speciale: 'caisse_speciale',
    caisse_imprevue: 'caisse_imprevue',
    credit_speciale: 'credit_speciale',
    credit_fixe: 'credit_fixe',
    caisse_aide: 'credit_aide',
    placements: 'placements',
  }
  const financialModule = financialModuleByTab[activeTab]
  if (financialModule) {
    const { adminFirestore } = await import('@/firebase/adminFirestore')
    if (!adminFirestore) throw new Error('Firestore admin indisponible pour le calcul financier')
    const sources = scopeFinancialSources(await loadFinancialReportSources(adminFirestore), memberScope)
    snapshot = applyAuthoritativeModuleFinancials(snapshot, buildCurrentFinancialReport(sources), financialModule)
  }

  return {
    generatedAt: new Date().toISOString(),
    activeTab,
    source: 'live',
    stale: false,
    snapshot,
  }
}

export function buildDashboardQueryKey(activeTab: DashboardTabKey, filters: DashboardFilters) {
  return [
    'dashboard',
    activeTab,
    filters.period,
    filters.customFrom || '',
    filters.customTo || '',
    filters.zoneProvince,
    filters.zoneCity,
    filters.memberType,
    filters.moduleCompare,
  ]
}
