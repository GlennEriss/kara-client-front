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

function addMonths(base: Date, months: number): Date {
  const next = new Date(base)
  next.setMonth(next.getMonth() + months)
  return next
}

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
      ]),
      createDistribution('caisse_type', 'Contrats par categorie', topNFromMap(byCaisseTypeMap, 6), 'pie'),
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
      ]),
      createDistribution('contract_status', 'Contrats par statut', topNFromMap(contractStatusMap, 8), 'bar'),
      ...(isRestTrackedModule
        ? [
            createDistribution('recouvrement_post_repos', 'Recouvrement apres repos (cumule)', [
              { label: '<= 30 jours', value: Math.round(recovered30) },
              { label: '<= 60 jours', value: Math.round(recovered60) },
              { label: '<= 90 jours', value: Math.round(recovered90) },
            ]),
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
      createRanking('top_admins', 'Principaux admins traiteurs', topAdmins, 'actions'),
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
      ], 'pie'),
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
      ], 'pie'),
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
  creditPenalties: FirestoreRecord[],
  creditPayments: FirestoreRecord[],
  caissePayments: FirestoreRecord[],
  placementDemands: FirestoreRecord[],
  placements: FirestoreRecord[],
  placementCommissions: FirestoreRecord[],
  filters: DashboardFilters
): DashboardTabPayload {
  const creditTypeOf = (record: FirestoreRecord): 'SPECIALE' | 'FIXE' | 'AIDE' | 'UNKNOWN' => {
    const normalized = String(record.creditType || '').toUpperCase()
    if (normalized === 'SPECIALE' || normalized === 'FIXE' || normalized === 'AIDE') return normalized
    return 'UNKNOWN'
  }

  const computeCreditEncours = (contracts: FirestoreRecord[]) =>
    contracts.reduce((sum, contract) => {
      const remaining = safeNumber(contract.amountRemaining)
      if (remaining > 0) return sum + remaining

      const totalAmount = safeNumber(contract.totalAmount) || safeNumber(contract.amount)
      const paid = safeNumber(contract.amountPaid)
      return sum + Math.max(totalAmount - paid, 0)
    }, 0)

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

  const creditSpecialeContracts = creditContracts.filter((contract) => creditTypeOf(contract) === 'SPECIALE')
  const creditFixeContracts = creditContracts.filter((contract) => creditTypeOf(contract) === 'FIXE')
  const creditAideContracts = creditContracts.filter((contract) => creditTypeOf(contract) === 'AIDE')

  const creditSpecialeEncours = computeCreditEncours(creditSpecialeContracts)
  const creditFixeEncours = computeCreditEncours(creditFixeContracts)
  const creditAideEncours = computeCreditEncours(creditAideContracts)
  const placementEncours = placements.reduce((sum, placement) => {
    if (String(placement.status || '').toLowerCase() !== 'active') return sum
    return sum + safeNumber(placement.amount)
  }, 0)

  const csPenaltiesTotal = caisseSpecialeContracts.reduce((sum, contract) => sum + safeNumber(contract.penaltiesTotal), 0)
  const csLossesAtRisk = caisseSpecialeContracts.reduce((sum, contract) => {
    const status = getStatus(contract)
    if (status !== 'LATE_NO_PENALTY' && status !== 'LATE_WITH_PENALTY') return sum
    const monthly = safeNumber(contract.monthlyAmount)
    const months = safeNumber(contract.monthsPlanned)
    const paid = safeNumber(contract.nominalPaid)
    return sum + Math.max(monthly * months - paid, 0)
  }, 0)

  const creditExpectedInterest = creditContracts.reduce((sum, contract) => {
    const totalAmount = safeNumber(contract.totalAmount)
    const principal = safeNumber(contract.amount)
    if (totalAmount > 0 && principal > 0) return sum + Math.max(totalAmount - principal, 0)
    return sum + Math.max(principal * safeNumber(contract.interestRate) / 100, 0)
  }, 0)
  const creditPenaltiesTotal = creditPenalties.reduce((sum, penalty) => sum + safeNumber(penalty.amount), 0)
  const creditLossesAtRisk = creditContracts
    .filter((contract) => getStatus(contract) === 'OVERDUE')
    .reduce((sum, contract) => sum + Math.max(safeNumber(contract.amountRemaining), 0), 0)

  const placementProjectedCommissions = placements
    .filter((placement) => String(placement.status || '').toLowerCase() === 'active')
    .reduce((sum, placement) => {
      const amount = safeNumber(placement.amount)
      const rate = safeNumber(placement.rate)
      const months = safeNumber(placement.periodMonths)
      return sum + ((amount * rate) / 100) * Math.max(months, 0)
    }, 0)
  const placementWeightedRateDenominator = placements
    .filter((placement) => String(placement.status || '').toLowerCase() === 'active')
    .reduce((sum, placement) => sum + safeNumber(placement.amount), 0)
  const placementWeightedRateNumerator = placements
    .filter((placement) => String(placement.status || '').toLowerCase() === 'active')
    .reduce((sum, placement) => sum + (safeNumber(placement.amount) * safeNumber(placement.rate)), 0)
  const placementCommissionRate = placementWeightedRateDenominator > 0 ? placementWeightedRateNumerator / placementWeightedRateDenominator : 0
  const placementLossesAtRisk = placements
    .filter((placement) => placement.hasOverdueCommission === true)
    .reduce((sum, placement) => {
      const amount = safeNumber(placement.amount)
      const rate = safeNumber(placement.rate)
      return sum + ((amount * rate) / 100)
    }, 0)
  const creditContractIds = new Set(creditContracts.map((contract) => contract.id))
  const interestPaidCredits = creditPayments
    .filter((payment) => {
      const creditId = typeof payment.creditId === 'string' ? payment.creditId : ''
      return creditId && creditContractIds.has(creditId)
    })
    .reduce((sum, payment) => sum + safeNumber(payment.interestAmount), 0)
  const creditPenaltiesPaidFromPayments = creditPayments
    .filter((payment) => {
      const creditId = typeof payment.creditId === 'string' ? payment.creditId : ''
      return creditId && creditContractIds.has(creditId)
    })
    .reduce((sum, payment) => sum + safeNumber(payment.penaltyAmount), 0)

  const caisseContractIds = new Set(caisseSpecialeContracts.map((contract) => contract.id))
  const caissePenaltiesPaid = caissePayments.reduce((sum, payment) => {
    const contractId = typeof payment.contractId === 'string' ? payment.contractId : ''
    if (contractId && !caisseContractIds.has(contractId)) return sum
    return sum + extractPenaltyAmountFromPaymentRecord(payment)
  }, 0)

  const placementIds = new Set(placements.map((placement) => placement.id))
  const placementCommissionsPaid = placementCommissions
    .filter((commission) => {
      const placementId = typeof commission.placementId === 'string' ? commission.placementId : ''
      if (!placementId || !placementIds.has(placementId)) return false
      return String(commission.status || '').toUpperCase() === 'PAID'
    })
    .reduce((sum, commission) => sum + safeNumber(commission.amount), 0)

  const financialBenefitsEstimated = creditExpectedInterest + placementProjectedCommissions + csPenaltiesTotal
  const financialPenaltiesTotal = csPenaltiesTotal + creditPenaltiesTotal
  const financialLossesAtRisk = csLossesAtRisk + creditLossesAtRisk + placementLossesAtRisk
  const financialBenefitsPaid = interestPaidCredits + creditPenaltiesPaidFromPayments + placementCommissionsPaid + caissePenaltiesPaid
  const financialPenaltiesPaid = creditPenaltiesPaidFromPayments + caissePenaltiesPaid
  const restCreditContracts = [...creditSpecialeContracts, ...creditFixeContracts]
  const restMonthsGlobal = restCreditContracts.reduce((sum, contract) => sum + extractRestMonthEntries(contract).length, 0)
  const restImpactGlobal = restCreditContracts.reduce((sum, contract) => {
    const entries = extractRestMonthEntries(contract)
    return sum + entries.reduce((acc, entry) => acc + Math.max(entry.monthlyAmount, 0), 0)
  }, 0)

  const detailedModuleSummaries = [
    {
      label: 'Caisse speciale',
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
      family: 'caisse' as const,
      pending: pendingCaisseImprevue,
      encours: ciEncours,
      impayes: computeCiEstimatedOverdue(caisseImprevueContracts),
    },
    {
      label: 'Caisse aide',
      family: 'credit' as const,
      pending: pendingCreditAide,
      encours: creditAideEncours,
      impayes: creditAideContracts.filter((contract) => getStatus(contract) === 'OVERDUE').length,
    },
    {
      label: 'Credit speciale',
      family: 'credit' as const,
      pending: pendingCreditSpeciale,
      encours: creditSpecialeEncours,
      impayes: creditSpecialeContracts.filter((contract) => getStatus(contract) === 'OVERDUE').length,
    },
    {
      label: 'Credit fixe',
      family: 'credit' as const,
      pending: pendingCreditFixe,
      encours: creditFixeEncours,
      impayes: creditFixeContracts.filter((contract) => getStatus(contract) === 'OVERDUE').length,
    },
    {
      label: 'Placements',
      family: 'placement' as const,
      pending: pendingPlacement,
      encours: placementEncours,
      impayes: placements.filter((placement) => placement.hasOverdueCommission === true).length,
    },
  ]

  const moduleSummaries = [
    {
      label: 'Caisse',
      family: 'caisse' as const,
      pending: detailedModuleSummaries
        .filter((summary) => summary.family === 'caisse')
        .reduce((sum, summary) => sum + summary.pending, 0),
      encours: detailedModuleSummaries
        .filter((summary) => summary.family === 'caisse')
        .reduce((sum, summary) => sum + summary.encours, 0),
      impayes: detailedModuleSummaries
        .filter((summary) => summary.family === 'caisse')
        .reduce((sum, summary) => sum + summary.impayes, 0),
    },
    {
      label: 'Credit',
      family: 'credit' as const,
      pending: detailedModuleSummaries
        .filter((summary) => summary.family === 'credit')
        .reduce((sum, summary) => sum + summary.pending, 0),
      encours: detailedModuleSummaries
        .filter((summary) => summary.family === 'credit')
        .reduce((sum, summary) => sum + summary.encours, 0),
      impayes: detailedModuleSummaries
        .filter((summary) => summary.family === 'credit')
        .reduce((sum, summary) => sum + summary.impayes, 0),
    },
    {
      label: 'Placements',
      family: 'placement' as const,
      pending: detailedModuleSummaries
        .filter((summary) => summary.family === 'placement')
        .reduce((sum, summary) => sum + summary.pending, 0),
      encours: detailedModuleSummaries
        .filter((summary) => summary.family === 'placement')
        .reduce((sum, summary) => sum + summary.encours, 0),
      impayes: detailedModuleSummaries
        .filter((summary) => summary.family === 'placement')
        .reduce((sum, summary) => sum + summary.impayes, 0),
    },
  ]

  const selectedModule = filters.moduleCompare
  const selectedSummaries =
    selectedModule === 'all'
      ? moduleSummaries
      : moduleSummaries.filter((summary) => summary.family === selectedModule)

  const selectedDetailedSummaries =
    selectedModule === 'all'
      ? detailedModuleSummaries
      : detailedModuleSummaries.filter((summary) => summary.family === selectedModule)

  const selectedEncours = selectedSummaries.reduce((sum, summary) => sum + summary.encours, 0)
  const selectedImpayes = selectedSummaries.reduce((sum, summary) => sum + summary.impayes, 0)
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
    title: 'Executif',
    subtitle: 'Vue direction avec detail des sous-modules et alertes operationnelles.',
    kpis: [
      numberKpi('members_active', 'Membres actifs', membersActive, 'Membres scopes actifs', 'primary'),
      numberKpi('members_with_active_contracts', 'Membres avec contrats actifs', membersWithActiveContracts.length, 'Tous modules confondus', 'primary'),
      numberKpi('pending_global', 'Demandes en attente', pendingGlobal, 'Tous modules confondus', 'warning'),
      currencyKpi('encours_global', 'Encours global', selectedEncours, selectedModule === 'all' ? 'Tous modules' : `Module ${selectedModule}`, 'primary'),
      numberKpi('impayes_global', 'Impayes', selectedImpayes, 'Contrats/placements en retard', 'danger'),
      currencyKpi('benefits_estimated', 'Benefices estimes', financialBenefitsEstimated, 'Interets, commissions et penalites', 'success'),
      currencyKpi('penalties_total', 'Penalites (FCFA)', financialPenaltiesTotal, 'Caisse speciale + credits', 'warning'),
      currencyKpi('benefits_paid', 'Benefices encaisses', financialBenefitsPaid, 'Flux effectivement encaisses', 'success'),
      currencyKpi('penalties_paid', 'Penalites encaissees', financialPenaltiesPaid, 'Penalites effectivement payees', 'warning'),
      currencyKpi('losses_at_risk', 'Pertes a risque', financialLossesAtRisk, 'Exposition en retard et commissions dues', 'danger'),
      percentKpi('placement_commission_rate', 'Taux commissions placement', safePercent(placementCommissionRate), 'Moyenne ponderee des placements actifs'),
      numberKpi('rest_months_credit', 'Mois repos credits', restMonthsGlobal, 'Credits speciale + fixe', 'neutral'),
      currencyKpi('rest_impact_credit', 'Impact repos credits', restImpactGlobal, 'Revenu decale sur mois de repos', 'warning'),
    ],
    distributions: [
      createDistribution('pending_by_module', 'Demandes en attente par module detaille', moduleDistribution),
      createDistribution('encours_by_module', 'Encours par sous-module', encoursDistribution, 'pie'),
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
        })),
        'alertes'
      ),
    ],
    notes: [
      `Benefices estimes = interets credits (${Math.round(creditExpectedInterest).toLocaleString('fr-FR')} FCFA) + commissions placement (${Math.round(placementProjectedCommissions).toLocaleString('fr-FR')} FCFA) + penalites caisse (${Math.round(csPenaltiesTotal).toLocaleString('fr-FR')} FCFA).`,
      `Benefices encaisses = interets credits payes (${Math.round(interestPaidCredits).toLocaleString('fr-FR')} FCFA) + penalites payees credits (${Math.round(creditPenaltiesPaidFromPayments).toLocaleString('fr-FR')} FCFA) + commissions placement payees (${Math.round(placementCommissionsPaid).toLocaleString('fr-FR')} FCFA) + penalites caisse payees (${Math.round(caissePenaltiesPaid).toLocaleString('fr-FR')} FCFA).`,
      `Pertes a risque = caisse (${Math.round(csLossesAtRisk).toLocaleString('fr-FR')} FCFA) + credits (${Math.round(creditLossesAtRisk).toLocaleString('fr-FR')} FCFA) + placements (${Math.round(placementLossesAtRisk).toLocaleString('fr-FR')} FCFA).`,
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
    const [
      membershipRequestsRaw,
      caisseSpecialeDemandsRaw,
      caisseSpecialeContractsRaw,
      caisseImprevueDemandsRaw,
      caisseImprevueContractsRaw,
      creditDemandsRaw,
      creditContractsRaw,
      creditPenaltiesRaw,
      creditPaymentsRaw,
      caissePaymentsRaw,
      placementDemandsRaw,
      placementsRaw,
      placementCommissionsRaw,
    ] = await Promise.all([
      readCollectionDocs(firebaseCollectionNames.membershipRequests),
      readCollectionDocs(firebaseCollectionNames.caisseSpecialeDemands),
      readCollectionDocs(firebaseCollectionNames.caisseContracts),
      readCollectionDocs(firebaseCollectionNames.caisseImprevueDemands),
      readCollectionDocs(firebaseCollectionNames.contractsCI),
      readCollectionDocs(firebaseCollectionNames.creditDemands),
      readCollectionDocs(firebaseCollectionNames.creditContracts),
      readCollectionDocs(firebaseCollectionNames.creditPenalties),
      readCollectionDocs(firebaseCollectionNames.creditPayments),
      readCollectionGroupDocs('payments'),
      readCollectionDocs(firebaseCollectionNames.placementDemands),
      readCollectionDocs(firebaseCollectionNames.placements),
      readCollectionGroupDocs('commissions'),
    ])

    const creditPayments = filterRecordsByDate(creditPaymentsRaw, dateRange, ['paymentDate', 'createdAt'])
    const caissePayments = filterRecordsByDate(caissePaymentsRaw, dateRange, ['date', 'recordedAt', 'createdAt', 'updatedAt'])
    const placementCommissions = filterRecordsByDate(placementCommissionsRaw, dateRange, ['paidAt', 'dueDate', 'createdAt'])

    // Executive: "en attente" est un stock actuel a traiter, pas un flux lie a la periode.
    const membershipRequests = membershipRequestsRaw

    const caisseSpecialeDemands = filterRecordsByMemberScope(
      caisseSpecialeDemandsRaw,
      memberScope,
      (record) => getMemberIdFrom(record, ['memberId'])
    )

    const caisseSpecialeContracts = filterRecordsByMemberScope(
      filterRecordsByDate(caisseSpecialeContractsRaw, dateRange, ['createdAt']),
      memberScope,
      (record) => getMemberIdFrom(record, ['memberId'])
    )

    const caisseImprevueDemands = filterRecordsByMemberScope(
      caisseImprevueDemandsRaw,
      memberScope,
      (record) => getMemberIdFrom(record, ['memberId'])
    )

    const caisseImprevueContracts = filterRecordsByMemberScope(
      filterRecordsByDate(caisseImprevueContractsRaw, dateRange, ['createdAt', 'firstPaymentDate']),
      memberScope,
      (record) => getMemberIdFrom(record, ['memberId'])
    )

    const creditDemands = filterRecordsByMemberScope(
      creditDemandsRaw,
      memberScope,
      (record) => getMemberIdFrom(record, ['clientId'])
    )

    const creditContracts = filterRecordsByMemberScope(
      filterRecordsByDate(creditContractsRaw, dateRange, ['createdAt', 'firstPaymentDate']),
      memberScope,
      (record) => getMemberIdFrom(record, ['clientId'])
    )

    const placementDemands = filterRecordsByMemberScope(
      placementDemandsRaw,
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
      creditPenaltiesRaw,
      creditPayments,
      caissePayments,
      placementDemands,
      placements,
      placementCommissions,
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
