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
  getCountFromServer,
  Timestamp,
} from '@/firebase/firestore'
import { firebaseCollectionNames } from '@/constantes/firebase-collection-names'
import type { CaisseContract } from '@/types/types'
import { subscribe } from '@/services/caisse/mutations'
import { listPayments } from '@/db/caisse/payments.db'
import { updateContractPdf } from '@/db/caisse/contracts.db'
import { createFile } from '@/db/upload-image.db'
import type { ICaisseContractsRepository } from './ICaisseContractsRepository'
import type { ContractFilters, PaginationParams, PaginatedContracts, ContractStats } from '../entities/contract-filters.types'
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
    if (filters.caisseType && filters.caisseType !== 'all') {
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
    const clientSideNextDueFilter = hasCreatedAtRange && hasNextDueRange

    const fetchLimit = Math.min(100, pagination.limit * 3)

    const buildConstraints = (searchField: string) => {
      const c: any[] = []
      c.push(...this.buildBaseConstraints(normalizedFilters, { excludeNextDueAt: clientSideNextDueFilter }))
      c.push(where(searchField, '>=', normalizedQuery))
      c.push(where(searchField, '<=', normalizedQuery + '\uf8ff'))
      c.push(orderBy(searchField, 'asc'))
      c.push(orderBy('createdAt', 'desc'))
      return c
    }

    const [snap1, snap2, snap3] = await Promise.all(
      searchFields.map((field) =>
        getDocs(query(collectionRef, ...buildConstraints(field), fbLimit(fetchLimit)))
      )
    )

    const seen = new Set<string>()
    const merged: CaisseContract[] = []
    for (const snap of [snap1, snap2, snap3]) {
      snap.forEach((docSnap) => {
        if (!seen.has(docSnap.id)) {
          seen.add(docSnap.id)
          merged.push(this.transformDocument(docSnap))
        }
      })
    }

    let filtered = this.applyOverdueFilter(merged, normalizedFilters.overdueOnly)
    if (clientSideNextDueFilter) {
      filtered = this.applyNextDueRangeFilter(filtered, normalizedFilters)
    }

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
      nextCursor: clientSideNextDueFilter ? null : nextCursor,
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
    const clientSideNextDueFilter = hasCreatedAtRange && hasNextDueRange

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

    const fetchLimit = clientSideNextDueFilter ? pagination.limit * 3 : pagination.limit + 1
    constraints.push(fbLimit(fetchLimit))

    const q = query(collectionRef, ...constraints)
    const snapshot = await getDocs(q)

    const items: CaisseContract[] = []
    snapshot.forEach((docSnap) => items.push(this.transformDocument(docSnap)))

    let filtered = this.applyOverdueFilter(items, normalizedFilters.overdueOnly)
    if (clientSideNextDueFilter) {
      filtered = this.applyNextDueRangeFilter(filtered, normalizedFilters)
    }
    const hasNextPage = filtered.length > pagination.limit
    if (hasNextPage) filtered.pop()

    const lastItem = filtered[filtered.length - 1]

    let total = filtered.length
    if (!clientSideNextDueFilter) {
      const countSnap = await getCountFromServer(query(collectionRef, ...this.buildBaseConstraints(normalizedFilters)))
      total = countSnap.data().count
    }

    return {
      items: filtered,
      total,
      nextCursor: clientSideNextDueFilter ? null : hasNextPage && lastItem?.id ? lastItem.id : null,
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

    return {
      total,
      draft,
      active,
      late: lateNoPenalty + lateWithPenalty,
      closed,
      group,
      individual,
      byCaisseType,
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
}
