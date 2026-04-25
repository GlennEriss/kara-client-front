import {
  db,
  collection,
  query,
  where,
  orderBy,
  limit as fbLimit,
  startAfter,
  getDocs,
  getDoc,
  doc,
  deleteDoc,
  getCountFromServer,
  Timestamp,
} from '@/firebase/firestore'
import { firebaseCollectionNames } from '@/constantes/firebase-collection-names'
import type { CaisseContract } from '@/types/types'
import { subscribe } from '@/services/caisse/mutations'
import { listPayments, deleteAllPayments, deletePayment as deletePaymentDoc } from '@/db/caisse/payments.db'
import { deleteAllRefunds } from '@/db/caisse/refunds.db'
import { updateContractPdf } from '@/db/caisse/contracts.db'
import { createFile } from '@/db/upload-image.db'
import type { ICaisseContractsRepository } from './ICaisseContractsRepository'
import type {
  ContractFilters,
  PaginationParams,
  PaginatedContracts,
  ContractStats,
  SpecificCaisseTypeFilter,
} from '../entities/contract-filters.types'
import type { ContractPayment, CreateCaisseContractInput, ContractPdfMetadata, UploadContractPdfInput } from '../entities/contract.types'

export class CaisseContractsRepository implements ICaisseContractsRepository {
  private static instance: CaisseContractsRepository
  private readonly collectionName = firebaseCollectionNames.caisseContracts

  private constructor() {}

  static getInstance(): CaisseContractsRepository {
    if (!CaisseContractsRepository.instance) {
      CaisseContractsRepository.instance = new CaisseContractsRepository()
    }
    return CaisseContractsRepository.instance
  }

  private normalizeSearchQuery(q: string): string {
    return String(q)
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
  }

  private toTimestamp(date?: Date): any {
    if (!date) return undefined
    return Timestamp.fromDate(date)
  }

  private transformDocument(docSnap: any): CaisseContract {
    const data = docSnap.data()
    const toDate = (ts: any): Date | undefined => {
      if (!ts) return undefined
      if (ts instanceof Date) return ts
      if (ts?.toDate) return ts.toDate()
      return new Date(ts)
    }

    return {
      id: docSnap.id,
      ...data,
      createdAt: toDate(data.createdAt) as Date,
      updatedAt: toDate(data.updatedAt) as Date,
      contractStartAt: toDate(data.contractStartAt),
      contractEndAt: toDate(data.contractEndAt),
      nextDueAt: toDate(data.nextDueAt),
    } as CaisseContract
  }

  private buildBaseConstraints(
    filters?: ContractFilters,
    options: { excludeCreatedAt?: boolean; excludeNextDueAt?: boolean } = {}
  ) {
    const constraints: any[] = []
    if (!filters) return constraints

    if (filters.status && filters.status !== 'all') {
      constraints.push(where('status', '==', filters.status))
    }
    if (filters.contractType && filters.contractType !== 'all') {
      constraints.push(where('contractType', '==', filters.contractType))
    }
    const groupedCaisseTypes = Array.from(
      new Set((filters.caisseTypes || []).filter(Boolean))
    ) as SpecificCaisseTypeFilter[]
    if (groupedCaisseTypes.length > 1) {
      constraints.push(where('caisseType', 'in', groupedCaisseTypes.slice(0, 10)))
    } else if (groupedCaisseTypes.length === 1) {
      constraints.push(where('caisseType', '==', groupedCaisseTypes[0]))
    } else if (filters.caisseType && filters.caisseType !== 'all') {
      constraints.push(where('caisseType', '==', filters.caisseType))
    }
    if (filters.memberId) {
      constraints.push(where('memberId', '==', filters.memberId))
    }
    if (filters.groupeId) {
      constraints.push(where('groupeId', '==', filters.groupeId))
    }

    if (filters.createdAtFrom && !options.excludeCreatedAt) {
      constraints.push(where('createdAt', '>=', this.toTimestamp(filters.createdAtFrom)))
    }
    if (filters.createdAtTo && !options.excludeCreatedAt) {
      constraints.push(where('createdAt', '<=', this.toTimestamp(filters.createdAtTo)))
    }

    if (filters.nextDueAtFrom && !options.excludeNextDueAt) {
      constraints.push(where('nextDueAt', '>=', this.toTimestamp(filters.nextDueAtFrom)))
    }
    if (filters.nextDueAtTo && !options.excludeNextDueAt) {
      constraints.push(where('nextDueAt', '<=', this.toTimestamp(filters.nextDueAtTo)))
    }

    return constraints
  }

  private applyNextDueRangeFilter(contracts: CaisseContract[], filters?: ContractFilters): CaisseContract[] {
    if (!filters?.nextDueAtFrom && !filters?.nextDueAtTo) return contracts

    const from = filters.nextDueAtFrom ? new Date(filters.nextDueAtFrom) : null
    const to = filters.nextDueAtTo ? new Date(filters.nextDueAtTo) : null
    if (from) from.setHours(0, 0, 0, 0)
    if (to) to.setHours(23, 59, 59, 999)

    return contracts.filter((c) => {
      if (!c.nextDueAt) return false
      const nextDue = c.nextDueAt instanceof Date ? c.nextDueAt : new Date(c.nextDueAt)
      if (from && nextDue < from) return false
      if (to && nextDue > to) return false
      return true
    })
  }

  private normalizeDateRanges(filters: ContractFilters): ContractFilters {
    const hasCreatedRange = Boolean(filters.createdAtFrom || filters.createdAtTo)
    const hasNextDueRange = Boolean(filters.nextDueAtFrom || filters.nextDueAtTo)
    if (hasCreatedRange && hasNextDueRange) {
      return {
        ...filters,
        createdAtFrom: undefined,
        createdAtTo: undefined,
      }
    }
    return filters
  }

  private applyOverdueFilter(contracts: CaisseContract[], overdueOnly?: boolean): CaisseContract[] {
    if (!overdueOnly) return contracts

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return contracts.filter((c) => {
      if (c.status === 'LATE_NO_PENALTY' || c.status === 'LATE_WITH_PENALTY') return true
      if (c.status === 'ACTIVE' && c.nextDueAt) {
        const nextDue = c.nextDueAt instanceof Date ? c.nextDueAt : new Date(c.nextDueAt)
        nextDue.setHours(0, 0, 0, 0)
        return nextDue < today
      }
      return false
    })
  }

  private hasAmountFilters(filters?: ContractFilters): boolean {
    if (!filters) return false
    const amountKeys: (keyof ContractFilters)[] = [
      'monthlyAmountMin',
      'monthlyAmountMax',
      'contractAmountMin',
      'contractAmountMax',
      'bonusAmountMin',
      'bonusAmountMax',
      'penaltiesAmountMin',
      'penaltiesAmountMax',
      'paidAmountMin',
      'paidAmountMax',
      'durationMonthsMin',
      'durationMonthsMax',
    ]
    return amountKeys.some((key) => typeof filters[key] === 'number')
  }

  private hasPaymentCountFilters(filters?: ContractFilters): boolean {
    if (!filters) return false
    return typeof filters.paymentCountMin === 'number' || typeof filters.paymentCountMax === 'number'
  }

  private applyAmountFilters(contracts: CaisseContract[], filters?: ContractFilters): CaisseContract[] {
    if (!this.hasAmountFilters(filters)) return contracts

    const inRange = (value: number, min?: number, max?: number) => {
      if (typeof min === 'number' && value < min) return false
      if (typeof max === 'number' && value > max) return false
      return true
    }

    const asNumber = (value: unknown, fallback = 0) => {
      const n = Number(value)
      return Number.isFinite(n) ? n : fallback
    }

    return contracts.filter((c) => {
      const anyContract = c as any
      const monthlyAmount = asNumber(anyContract.monthlyAmount)
      const contractAmount = monthlyAmount * asNumber(anyContract.monthsPlanned)
      const bonusAmount = asNumber(anyContract.bonusAccrued ?? anyContract.bonuses)
      const penaltiesAmount = asNumber(anyContract.penaltiesTotal ?? anyContract.penalties)
      const paidAmount = asNumber(anyContract.nominalPaid)
      const durationMonths = asNumber(anyContract.monthsPlanned)

      return (
        inRange(monthlyAmount, filters?.monthlyAmountMin, filters?.monthlyAmountMax) &&
        inRange(contractAmount, filters?.contractAmountMin, filters?.contractAmountMax) &&
        inRange(bonusAmount, filters?.bonusAmountMin, filters?.bonusAmountMax) &&
        inRange(penaltiesAmount, filters?.penaltiesAmountMin, filters?.penaltiesAmountMax) &&
        inRange(paidAmount, filters?.paidAmountMin, filters?.paidAmountMax) &&
        inRange(durationMonths, filters?.durationMonthsMin, filters?.durationMonthsMax)
      )
    })
  }

  private async applyPaymentCountFilters(
    contracts: CaisseContract[],
    filters?: ContractFilters
  ): Promise<CaisseContract[]> {
    if (!this.hasPaymentCountFilters(filters)) return contracts

    const inRange = (value: number, min?: number, max?: number) => {
      if (typeof min === 'number' && value < min) return false
      if (typeof max === 'number' && value > max) return false
      return true
    }

    const withCounts = await Promise.all(
      contracts.map(async (contract) => {
        if (!contract.id) return { contract, paymentCount: 0 }

        const payments = await listPayments(contract.id)
        const paymentCount = payments.reduce((sum: number, p: any) => {
          if (Array.isArray(p.contribs) && p.contribs.length > 0) return sum + p.contribs.length
          if ((p.status === 'PAID' || p.status === 'PARTIAL') && (Number(p.amount) > 0 || Number(p.accumulatedAmount) > 0 || p.paidAt)) return sum + 1
          return sum
        }, 0)
        return { contract, paymentCount }
      })
    )

    return withCounts
      .filter(({ paymentCount }) => inRange(paymentCount, filters?.paymentCountMin, filters?.paymentCountMax))
      .map(({ contract }) => contract)
  }

  private getContractSearchWords(c: CaisseContract): string[] {
    const anyContract = c as any
    if (Array.isArray(anyContract.searchableWords) && anyContract.searchableWords.length > 0) {
      return anyContract.searchableWords
    }
    const raw = anyContract.searchableText || ''
    const normalized = raw
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
    return normalized.split(/\s+/).filter(Boolean)
  }

  private async getPaginatedWithSearchMerge(
    filters: ContractFilters,
    pagination: PaginationParams,
    normalizedQuery: string
  ): Promise<PaginatedContracts> {
    const normalizedFilters = this.normalizeDateRanges(filters)
    const collectionRef = collection(db, this.collectionName)
    const searchFields = [
      'searchableText',
      'searchableTextFirstNameFirst',
      'searchableTextMatriculeFirst',
    ] as const

    const hasCreatedAtRange = Boolean(normalizedFilters.createdAtFrom || normalizedFilters.createdAtTo)
    const hasNextDueRange = Boolean(normalizedFilters.nextDueAtFrom || normalizedFilters.nextDueAtTo)
    const hasAmountFilters = this.hasAmountFilters(normalizedFilters)
    const hasPaymentCountFilters = this.hasPaymentCountFilters(normalizedFilters)
    const clientSideNextDueFilter = hasCreatedAtRange && hasNextDueRange
    const needsClientSideFiltering = clientSideNextDueFilter || hasAmountFilters || hasPaymentCountFilters

    const fetchLimit = needsClientSideFiltering ? 1000 : Math.min(100, pagination.limit * 3)
    const searchWords = normalizedQuery.split(/\s+/).filter(Boolean)

    const buildPrefixConstraints = (searchField: string) => {
      const c: any[] = []
      c.push(...this.buildBaseConstraints(normalizedFilters, { excludeNextDueAt: clientSideNextDueFilter }))
      c.push(where(searchField, '>=', normalizedQuery))
      c.push(where(searchField, '<=', normalizedQuery + '\uf8ff'))
      c.push(orderBy(searchField, 'asc'))
      c.push(orderBy('createdAt', 'desc'))
      return c
    }

    const queries: Promise<any>[] = searchFields.map((field) =>
      getDocs(query(collectionRef, ...buildPrefixConstraints(field), fbLimit(fetchLimit)))
    )

    if (searchWords.length >= 1) {
      const baseForWords = this.buildBaseConstraints(normalizedFilters, { excludeNextDueAt: clientSideNextDueFilter })
      queries.push(
        getDocs(
          query(
            collectionRef,
            ...baseForWords,
            where('searchableWords', 'array-contains', searchWords[0]),
            orderBy('createdAt', 'desc'),
            fbLimit(fetchLimit)
          )
        )
      )
    }

    const results = await Promise.all(queries)

    const seen = new Set<string>()
    const merged: CaisseContract[] = []
    for (const snap of results) {
      snap.forEach((docSnap: any) => {
        if (!seen.has(docSnap.id)) {
          seen.add(docSnap.id)
          merged.push(this.transformDocument(docSnap))
        }
      })
    }

    const byWords =
      searchWords.length <= 1
        ? merged
        : merged.filter((c) => {
            const contractWords = this.getContractSearchWords(c)
            return searchWords.every((w) => contractWords.includes(w))
          })

    let filtered = this.applyOverdueFilter(byWords, normalizedFilters.overdueOnly)
    if (clientSideNextDueFilter) {
      filtered = this.applyNextDueRangeFilter(filtered, normalizedFilters)
    }
    filtered = this.applyAmountFilters(filtered, normalizedFilters)
    filtered = await this.applyPaymentCountFilters(filtered, normalizedFilters)

    let startIndex = 0
    if (pagination.cursor) {
      const idx = filtered.findIndex((c) => c.id === pagination.cursor)
      startIndex = idx >= 0 ? idx + 1 : 0
    }

    const pageItems = filtered.slice(startIndex, startIndex + pagination.limit)
    const nextCursor = pageItems.length === pagination.limit ? pageItems[pageItems.length - 1].id || null : null

    return {
      items: pageItems,
      total: filtered.length,
      nextCursor: needsClientSideFiltering ? null : nextCursor,
    }
  }

  async getContractsWithFilters(
    filters: ContractFilters = {},
    pagination: PaginationParams = { limit: 12 }
  ): Promise<PaginatedContracts> {
    const search = filters.search?.trim()
    if (search && search.length >= 2) {
      const normalized = this.normalizeSearchQuery(search)
      return this.getPaginatedWithSearchMerge(filters, pagination, normalized)
    }

    const normalizedFilters = this.normalizeDateRanges(filters)
    const collectionRef = collection(db, this.collectionName)
    const constraints: any[] = []

    const hasCreatedAtRange = Boolean(normalizedFilters.createdAtFrom || normalizedFilters.createdAtTo)
    const hasNextDueRange = Boolean(normalizedFilters.nextDueAtFrom || normalizedFilters.nextDueAtTo)
    const hasAmountFilters = this.hasAmountFilters(normalizedFilters)
    const hasPaymentCountFilters = this.hasPaymentCountFilters(normalizedFilters)
    const clientSideNextDueFilter = hasCreatedAtRange && hasNextDueRange
    const needsClientSideFiltering = clientSideNextDueFilter || hasAmountFilters || hasPaymentCountFilters

    constraints.push(...this.buildBaseConstraints(normalizedFilters, { excludeNextDueAt: clientSideNextDueFilter }))
    if (hasNextDueRange && !hasCreatedAtRange) {
      constraints.push(orderBy('nextDueAt', 'asc'))
      constraints.push(orderBy('createdAt', 'desc'))
    } else {
      constraints.push(orderBy('createdAt', 'desc'))
    }

    if (pagination.cursor) {
      const cursorDoc = await getDoc(doc(db, this.collectionName, pagination.cursor))
      if (cursorDoc.exists()) {
        constraints.push(startAfter(cursorDoc))
      }
    }

    const fetchLimit = needsClientSideFiltering ? 1000 : pagination.limit + 1
    constraints.push(fbLimit(fetchLimit))

    const q = query(collectionRef, ...constraints)
    const snapshot = await getDocs(q)

    const items: CaisseContract[] = []
    snapshot.forEach((docSnap) => items.push(this.transformDocument(docSnap)))

    let filtered = this.applyOverdueFilter(items, normalizedFilters.overdueOnly)
    if (clientSideNextDueFilter) {
      filtered = this.applyNextDueRangeFilter(filtered, normalizedFilters)
    }
    filtered = this.applyAmountFilters(filtered, normalizedFilters)
    filtered = await this.applyPaymentCountFilters(filtered, normalizedFilters)
    const hasNextPage = !needsClientSideFiltering && filtered.length > pagination.limit
    if (hasNextPage) filtered.pop()

    const lastItem = filtered[filtered.length - 1]

    let total = filtered.length
    if (!needsClientSideFiltering) {
      const countSnap = await getCountFromServer(query(collectionRef, ...this.buildBaseConstraints(normalizedFilters)))
      total = countSnap.data().count
    }

    return {
      items: filtered,
      total,
      nextCursor: needsClientSideFiltering ? null : hasNextPage && lastItem?.id ? lastItem.id : null,
    }
  }

  async getContractsStats(filters: ContractFilters = {}): Promise<ContractStats> {
    const collectionRef = collection(db, this.collectionName)
    const base = this.buildBaseConstraints(filters)

    const count = async (extra: any[] = []) => {
      const snap = await getCountFromServer(query(collectionRef, ...base, ...extra))
      return snap.data().count
    }

    const [
      total,
      draft,
      active,
      lateNoPenalty,
      lateWithPenalty,
      closed,
      group,
      individual,
    ] = await Promise.all([
      count(),
      count([where('status', '==', 'DRAFT')]),
      count([where('status', '==', 'ACTIVE')]),
      count([where('status', '==', 'LATE_NO_PENALTY')]),
      count([where('status', '==', 'LATE_WITH_PENALTY')]),
      count([where('status', '==', 'CLOSED')]),
      count([where('contractType', '==', 'GROUP')]),
      count([where('contractType', '==', 'INDIVIDUAL')]),
    ])

    const caisseTypes = [
      'STANDARD',
      'JOURNALIERE',
      'LIBRE',
      'STANDARD_CHARITABLE',
      'JOURNALIERE_CHARITABLE',
      'LIBRE_CHARITABLE',
    ]

    const caisseCounts = await Promise.all(
      caisseTypes.map((type) => count([where('caisseType', '==', type)]))
    )

    const byCaisseType: Record<string, number> = {}
    caisseTypes.forEach((type, idx) => {
      byCaisseType[type] = caisseCounts[idx]
    })

    // Somme des nominalPaid pour tous les contrats (carte "Montant Total"), tous statuts confondus
    let totalPaidSum = 0
    try {
      const allQuery = query(collectionRef, ...base)
      const allSnap = await getDocs(allQuery)
      allSnap.forEach((docSnap) => {
        const data = docSnap.data()
        totalPaidSum += Number(data?.nominalPaid ?? 0)
      })
    } catch (err) {
      console.error('[CaisseContractsRepository] getContractsStats totalPaidSum:', err)
    }

    return {
      total,
      draft,
      active,
      late: lateNoPenalty + lateWithPenalty,
      closed,
      group,
      individual,
      byCaisseType,
      totalPaidSum,
    }
  }

  async getContractById(id: string): Promise<CaisseContract | null> {
    const ref = doc(db, this.collectionName, id)
    const snap = await getDoc(ref)
    if (!snap.exists()) return null
    return this.transformDocument(snap)
  }

  async createContract(input: CreateCaisseContractInput): Promise<string> {
    return subscribe({
      memberId: input.memberId,
      groupeId: input.groupeId,
      monthlyAmount: input.monthlyAmount,
      monthsPlanned: input.monthsPlanned,
      caisseType: input.caisseType,
      firstPaymentDate: input.firstPaymentDate,
      emergencyContact: input.emergencyContact,
      settingsVersion: input.settingsVersion,
      createdBy: input.createdBy,
    })
  }

  async uploadContractPdf(input: UploadContractPdfInput): Promise<ContractPdfMetadata> {
    const uploadResult = await createFile(input.file, input.contractId, `contracts/${input.contractId}`)
    const contractPdfData: ContractPdfMetadata = {
      fileSize: input.fileSize,
      path: uploadResult.path,
      originalFileName: input.originalFileName,
      uploadedAt: new Date(),
      url: uploadResult.url,
    }

    await updateContractPdf(input.contractId, contractPdfData, input.uploadedBy)

    return contractPdfData
  }

  async getContractPayments(contractId: string): Promise<ContractPayment[]> {
    return listPayments(contractId)
  }

  async deletePayment(contractId: string, paymentId: string): Promise<void> {
    await deletePaymentDoc(contractId, paymentId)
  }

  async deletePayments(contractId: string): Promise<void> {
    await deleteAllPayments(contractId)
  }

  async deleteRefunds(contractId: string): Promise<void> {
    await deleteAllRefunds(contractId)
  }

  async deleteContract(contractId: string): Promise<void> {
    const ref = doc(db, this.collectionName, contractId)
    await deleteDoc(ref)
  }
}
