import { firebaseCollectionNames } from '@/constantes/firebase-collection-names'
import type {
  DashboardDistributionBlock,
  DashboardFilterOptions,
  DashboardFilters,
  DashboardKpiItem,
  DashboardRankingBlock,
  DashboardSnapshot,
  DashboardTabPayload,
  DashboardMemberTypeFilter,
} from '../entities/dashboard.types'
import type { DashboardTabKey } from '../entities/dashboard-tabs.types'

type FirestoreRecord = Record<string, unknown> & { id: string }

const MEMBER_ROLES = new Set(['Adherant', 'Bienfaiteur', 'Sympathisant'])

interface DashboardMemberRecord extends FirestoreRecord {
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
  const { db, collection, getDocs } = await import('@/firebase/firestore')
  const snap = await getDocs(collection(db, collectionName))

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

function sumValues(items: Array<{ value: number }>): number {
  return items.reduce((sum, item) => sum + item.value, 0)
}

function createDistribution(key: string, title: string, items: Array<{ label: string; value: number }>, chartType: 'bar' | 'pie' = 'bar'): DashboardDistributionBlock {
  return {
    key,
    title,
    chartType,
    items,
  }
}

function createRanking(key: string, title: string, items: Array<{ label: string; value: number; subLabel?: string }>, unit?: string): DashboardRankingBlock {
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

function currencyKpi(key: string, label: string, value: number, subtitle?: string, tone: DashboardKpiItem['tone'] = 'primary'): DashboardKpiItem {
  return {
    key,
    label,
    value,
    format: 'currency',
    subtitle,
    tone,
  }
}

function numberKpi(key: string, label: string, value: number, subtitle?: string, tone: DashboardKpiItem['tone'] = 'neutral'): DashboardKpiItem {
  return {
    key,
    label,
    value,
    format: 'number',
    subtitle,
    tone,
  }
}

function percentKpi(key: string, label: string, value: number, subtitle?: string): DashboardKpiItem {
  return {
    key,
    label,
    value,
    format: 'percent',
    subtitle,
    tone: 'neutral',
  }
}

function statusCount(records: FirestoreRecord[], expectedStatus: string): number {
  return records.filter((record) => getStatus(record) === expectedStatus).length
}

function buildCaisseSpecialePayload(
  demandsRaw: FirestoreRecord[],
  contractsRaw: FirestoreRecord[]
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
    ],
    distributions: [
      createDistribution('demand_status', 'Demandes par statut', [
        { label: 'Pending', value: pending },
        { label: 'Approved', value: approved },
        { label: 'Rejected', value: rejected },
        { label: 'Converted', value: converted },
      ]),
      createDistribution('caisse_type', 'Contrats par categorie', topNFromMap(byCaisseTypeMap, 6), 'pie'),
    ],
  }
}

function buildCaisseImprevuePayload(
  demandsRaw: FirestoreRecord[],
  contractsRaw: FirestoreRecord[]
): DashboardTabPayload {
  const pending = statusCount(demandsRaw, 'PENDING')
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

  const byFrequencyMap = new Map<string, number>()
  for (const contract of contractsRaw) {
    const frequency = typeof contract.paymentFrequency === 'string' ? contract.paymentFrequency : 'UNKNOWN'
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
    ],
    distributions: [
      createDistribution('demand_status', 'Demandes par statut', [
        { label: 'Pending', value: pending },
        { label: 'Approved', value: approved },
        { label: 'Rejected', value: rejected },
        { label: 'Converted', value: converted },
        { label: 'Reopened', value: reopened },
      ]),
      createDistribution('frequency', 'Contrats par frequence', topNFromMap(byFrequencyMap, 4), 'pie'),
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
  contractsRaw: FirestoreRecord[]
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

  const totalRemaining = contracts.reduce((sum, contract) => {
    const remaining = safeNumber(contract.amountRemaining)
    if (remaining > 0) return sum + remaining

    const totalAmount = safeNumber(contract.totalAmount) || safeNumber(contract.amount)
    const totalPaid = safeNumber(contract.amountPaid)
    return sum + Math.max(totalAmount - totalPaid, 0)
  }, 0)

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
    ],
    distributions: [
      createDistribution('demand_status', 'Demandes par statut', [
        { label: 'Pending', value: pending },
        { label: 'Approved', value: approved },
        { label: 'Rejected', value: rejected },
      ]),
      createDistribution('contract_status', 'Contrats par statut', topNFromMap(contractStatusMap, 8), 'bar'),
    ],
    notes: creditType === 'AIDE'
      ? ['Rappel metier: les reliquats a 3 mois doivent etre transformes en credit speciale.']
      : undefined,
  }
}

function buildPlacementsPayload(demandsRaw: FirestoreRecord[], placementsRaw: FirestoreRecord[]): DashboardTabPayload {
  const pending = statusCount(demandsRaw, 'PENDING')
  const approved = statusCount(demandsRaw, 'APPROVED')
  const rejected = statusCount(demandsRaw, 'REJECTED')
  const converted = statusCount(demandsRaw, 'CONVERTED')

  const activePlacements = placementsRaw.filter((placement) => String(placement.status || '').toLowerCase() === 'active')
  const totalAmountActive = activePlacements.reduce((sum, placement) => sum + safeNumber(placement.amount), 0)

  const overdueCommissionCount = activePlacements.filter((placement) => placement.hasOverdueCommission === true).length

  const payoutModeMap = new Map<string, number>()
  const placementStatusMap = new Map<string, number>()
  for (const placement of placementsRaw) {
    const mode = typeof placement.payoutMode === 'string' ? placement.payoutMode : 'UNKNOWN'
    payoutModeMap.set(mode, (payoutModeMap.get(mode) || 0) + 1)

    const status = typeof placement.status === 'string' ? placement.status : 'UNKNOWN'
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
    ],
    distributions: [
      createDistribution('demand_status', 'Demandes par statut', [
        { label: 'Pending', value: pending },
        { label: 'Approved', value: approved },
        { label: 'Rejected', value: rejected },
        { label: 'Converted', value: converted },
      ]),
      createDistribution('payout_mode', 'Repartition mode de paiement', topNFromMap(payoutModeMap, 4), 'pie'),
      createDistribution('placement_status', 'Repartition statut placements', topNFromMap(placementStatusMap, 6), 'bar'),
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
      createDistribution('roles', 'Repartition par role', topNFromMap(rolesMap, 6), 'pie'),
    ],
    rankings: [
      createRanking('top_admins', 'Top admins traiteurs', topAdmins, 'actions'),
    ],
  }
}

function buildRecouvrementPayload(
  agentsRaw: FirestoreRecord[],
  paymentsRaw: FirestoreRecord[],
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

  return {
    title: 'Recouvrement',
    subtitle: 'Performance des agents et repartition des encaissements par agent.',
    kpis: [
      numberKpi('agents_total', 'Total agents', totalAgents, 'Agents recouvrement', 'primary'),
      numberKpi('agents_active', 'Agents actifs', activeAgents.length, 'Disponibles', 'success'),
      numberKpi('birthdays', 'Anniversaires du mois', birthdaysThisMonth, 'Agents actifs concernes', 'neutral'),
      percentKpi('without_agent_rate', 'Paiements sans agent', tauxSansAgent, `${countWithoutAgent} paiements`),
    ],
    distributions: [
      createDistribution('gender', 'Repartition H/F', [
        { label: 'Hommes', value: menCount },
        { label: 'Femmes', value: womenCount },
      ], 'pie'),
      createDistribution('activity', 'Statut activite', [
        { label: 'Actifs', value: activeAgents.length },
        { label: 'Inactifs', value: inactiveAgentsCount },
      ]),
    ],
    rankings: [
      createRanking('top_collectors', 'Top collecteurs', topCollectors, 'FCFA'),
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
      ], 'pie'),
    ],
    rankings: [
      createRanking('top_groups', 'Top groupes par effectif', topGroups, 'membres'),
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
      ], 'pie'),
    ],
    rankings: [
      createRanking('top_professions', 'Top metiers', topProfessions, 'membres'),
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
      createRanking('top_provinces', 'Top provinces', topNFromMap(provinceMap, 10), 'membres'),
      createRanking('top_cities', 'Top villes', topNFromMap(cityMap, 10), 'membres'),
      createRanking('top_districts', 'Top quartiers', topNFromMap(districtMap, 10), 'membres'),
      createRanking('top_arrondissements', 'Top arrondissements', topNFromMap(arrondissementMap, 10), 'membres'),
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
  filters: DashboardFilters
): DashboardTabPayload {
  const membersActive = memberScope.scopedMembers.filter((member) => member.isActive !== false).length

  const pendingMembershipRequests = membershipRequests.filter((request) => {
    const status = normalizeText(request.status)
    return status === 'pending'
  }).length

  const pendingCaisseSpeciale = statusCount(caisseSpecialeDemands, 'PENDING')
  const pendingCaisseImprevue = statusCount(caisseImprevueDemands, 'PENDING')
  const pendingCredit = statusCount(creditDemands, 'PENDING')
  const pendingPlacement = statusCount(placementDemands, 'PENDING')

  const pendingGlobal = pendingMembershipRequests + pendingCaisseSpeciale + pendingCaisseImprevue + pendingCredit + pendingPlacement

  const csEncours = caisseSpecialeContracts.reduce((sum, contract) => {
    const status = getStatus(contract)
    if (status !== 'ACTIVE' && status !== 'LATE_NO_PENALTY' && status !== 'LATE_WITH_PENALTY') return sum
    const totalExpected = safeNumber(contract.monthlyAmount) * safeNumber(contract.monthsPlanned)
    const paid = safeNumber(contract.nominalPaid)
    return sum + Math.max(totalExpected - paid, 0)
  }, 0)

  const ciEncours = caisseImprevueContracts.reduce((sum, contract) => {
    if (getStatus(contract) !== 'ACTIVE') return sum
    const nominal = safeNumber(contract.subscriptionCINominal)
    return sum + nominal
  }, 0)

  const creditEncours = creditContracts.reduce((sum, contract) => {
    const remaining = safeNumber(contract.amountRemaining)
    if (remaining > 0) return sum + remaining

    const totalAmount = safeNumber(contract.totalAmount) || safeNumber(contract.amount)
    const paid = safeNumber(contract.amountPaid)
    return sum + Math.max(totalAmount - paid, 0)
  }, 0)

  const placementEncours = placements.reduce((sum, placement) => {
    if (String(placement.status || '').toLowerCase() !== 'active') return sum
    return sum + safeNumber(placement.amount)
  }, 0)

  const encoursByFamily = {
    caisse: csEncours + ciEncours,
    credit: creditEncours,
    placement: placementEncours,
  }

  const impayesByFamily = {
    caisse:
      caisseSpecialeContracts.filter((contract) => {
        const status = getStatus(contract)
        return status === 'LATE_NO_PENALTY' || status === 'LATE_WITH_PENALTY'
      }).length,
    credit: creditContracts.filter((contract) => getStatus(contract) === 'OVERDUE').length,
    placement: placements.filter((placement) => placement.hasOverdueCommission === true).length,
  }

  const moduleSummaries = [
    {
      label: 'Caisse',
      pending: pendingCaisseSpeciale + pendingCaisseImprevue,
      encours: encoursByFamily.caisse,
      impayes: impayesByFamily.caisse,
    },
    {
      label: 'Credit',
      pending: pendingCredit,
      encours: encoursByFamily.credit,
      impayes: impayesByFamily.credit,
    },
    {
      label: 'Placements',
      pending: pendingPlacement,
      encours: encoursByFamily.placement,
      impayes: impayesByFamily.placement,
    },
  ]

  const selectedModule = filters.moduleCompare
  const selectedSummaries =
    selectedModule === 'all'
      ? moduleSummaries
      : moduleSummaries.filter((summary) => normalizeText(summary.label) === selectedModule)

  const selectedEncours = selectedSummaries.reduce((sum, summary) => sum + summary.encours, 0)
  const selectedImpayes = selectedSummaries.reduce((sum, summary) => sum + summary.impayes, 0)

  const moduleDistribution = selectedSummaries.map((summary) => ({ label: summary.label, value: summary.pending }))
  const encoursDistribution = selectedSummaries.map((summary) => ({ label: summary.label, value: Math.round(summary.encours) }))

  return {
    title: 'Executive',
    subtitle: 'Vue de pilotage transversale avec filtres globaux et comparaison modules.',
    kpis: [
      numberKpi('members_active', 'Membres actifs', membersActive, 'Membres scopes actifs', 'primary'),
      numberKpi('pending_global', 'Demandes en attente', pendingGlobal, 'Tous modules confondus', 'warning'),
      currencyKpi('encours_global', 'Encours global', selectedEncours, selectedModule === 'all' ? 'Tous modules' : `Module ${selectedModule}`, 'primary'),
      numberKpi('impayes_global', 'Impayes', selectedImpayes, 'Contrats/placements en retard', 'danger'),
    ],
    distributions: [
      createDistribution('pending_by_module', 'Demandes en attente par module', moduleDistribution),
      createDistribution('encours_by_module', 'Encours par module', encoursDistribution, 'pie'),
    ],
    rankings: [
      createRanking(
        'module_health',
        'Sante par module',
        selectedSummaries.map((summary) => ({
          label: summary.label,
          value: summary.impayes,
          subLabel: `Pending ${summary.pending} | Encours ${Math.round(summary.encours).toLocaleString('fr-FR')} FCFA`,
        })),
        'risques'
      ),
    ],
  }
}

export async function getDashboardFilterOptions(): Promise<DashboardFilterOptions> {
  const memberScope = await getMemberScope({
    period: 'month',
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
    const [
      membershipRequestsRaw,
      caisseSpecialeDemandsRaw,
      caisseSpecialeContractsRaw,
      caisseImprevueDemandsRaw,
      caisseImprevueContractsRaw,
      creditDemandsRaw,
      creditContractsRaw,
      placementDemandsRaw,
      placementsRaw,
    ] = await Promise.all([
      readCollectionDocs(firebaseCollectionNames.membershipRequests),
      readCollectionDocs(firebaseCollectionNames.caisseSpecialeDemands),
      readCollectionDocs(firebaseCollectionNames.caisseContracts),
      readCollectionDocs(firebaseCollectionNames.caisseImprevueDemands),
      readCollectionDocs(firebaseCollectionNames.contractsCI),
      readCollectionDocs(firebaseCollectionNames.creditDemands),
      readCollectionDocs(firebaseCollectionNames.creditContracts),
      readCollectionDocs(firebaseCollectionNames.placementDemands),
      readCollectionDocs(firebaseCollectionNames.placements),
    ])

    const membershipRequests = filterRecordsByDate(membershipRequestsRaw, dateRange, ['createdAt'])

    const caisseSpecialeDemands = filterRecordsByMemberScope(
      filterRecordsByDate(caisseSpecialeDemandsRaw, dateRange, ['createdAt', 'desiredDate']),
      memberScope,
      (record) => getMemberIdFrom(record, ['memberId'])
    )

    const caisseSpecialeContracts = filterRecordsByMemberScope(
      filterRecordsByDate(caisseSpecialeContractsRaw, dateRange, ['createdAt']),
      memberScope,
      (record) => getMemberIdFrom(record, ['memberId'])
    )

    const caisseImprevueDemands = filterRecordsByMemberScope(
      filterRecordsByDate(caisseImprevueDemandsRaw, dateRange, ['createdAt', 'desiredDate']),
      memberScope,
      (record) => getMemberIdFrom(record, ['memberId'])
    )

    const caisseImprevueContracts = filterRecordsByMemberScope(
      filterRecordsByDate(caisseImprevueContractsRaw, dateRange, ['createdAt', 'firstPaymentDate']),
      memberScope,
      (record) => getMemberIdFrom(record, ['memberId'])
    )

    const creditDemands = filterRecordsByMemberScope(
      filterRecordsByDate(creditDemandsRaw, dateRange, ['createdAt', 'desiredDate']),
      memberScope,
      (record) => getMemberIdFrom(record, ['clientId'])
    )

    const creditContracts = filterRecordsByMemberScope(
      filterRecordsByDate(creditContractsRaw, dateRange, ['createdAt', 'firstPaymentDate']),
      memberScope,
      (record) => getMemberIdFrom(record, ['clientId'])
    )

    const placementDemands = filterRecordsByMemberScope(
      filterRecordsByDate(placementDemandsRaw, dateRange, ['createdAt', 'desiredDate']),
      memberScope,
      (record) => getMemberIdFrom(record, ['benefactorId'])
    )

    const placements = filterRecordsByMemberScope(
      filterRecordsByDate(placementsRaw, dateRange, ['createdAt', 'startDate']),
      memberScope,
      (record) => getMemberIdFrom(record, ['benefactorId'])
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
      filters
    )
  } else if (activeTab === 'caisse_speciale') {
    const [demandsRaw, contractsRaw] = await Promise.all([
      readCollectionDocs(firebaseCollectionNames.caisseSpecialeDemands),
      readCollectionDocs(firebaseCollectionNames.caisseContracts),
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

    snapshot = buildCaisseSpecialePayload(demands, contracts)
  } else if (activeTab === 'caisse_imprevue') {
    const [demandsRaw, contractsRaw] = await Promise.all([
      readCollectionDocs(firebaseCollectionNames.caisseImprevueDemands),
      readCollectionDocs(firebaseCollectionNames.contractsCI),
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

    snapshot = buildCaisseImprevuePayload(demands, contracts)
  } else if (activeTab === 'credit_speciale' || activeTab === 'credit_fixe' || activeTab === 'caisse_aide') {
    const [demandsRaw, contractsRaw] = await Promise.all([
      readCollectionDocs(firebaseCollectionNames.creditDemands),
      readCollectionDocs(firebaseCollectionNames.creditContracts),
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
    snapshot = buildCreditPayload(creditType, demands, contracts)
  } else if (activeTab === 'placements') {
    const [demandsRaw, placementsRaw] = await Promise.all([
      readCollectionDocs(firebaseCollectionNames.placementDemands),
      readCollectionDocs(firebaseCollectionNames.placements),
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

    snapshot = buildPlacementsPayload(demands, placements)
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
    const [agentsRaw, paymentsRaw] = await Promise.all([
      readCollectionDocs(firebaseCollectionNames.agentsRecouvrement),
      readCollectionDocs(firebaseCollectionNames.payments),
    ])

    snapshot = buildRecouvrementPayload(agentsRaw, paymentsRaw, dateRange)
  } else if (activeTab === 'groupes') {
    const [groupsRaw] = await Promise.all([readCollectionDocs(firebaseCollectionNames.groups)])
    snapshot = buildGroupesPayload(groupsRaw, memberScope)
  } else if (activeTab === 'metiers') {
    const [professionsRaw] = await Promise.all([readCollectionDocs(firebaseCollectionNames.professions)])
    snapshot = buildMetiersPayload(professionsRaw, memberScope)
  } else {
    snapshot = buildGeographiePayload(memberScope)
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
