import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
// eslint-disable-next-line no-restricted-imports -- Référence historique pour vérifier la parité de la pagination.
import { ContractCIRepository } from '@/repositories/caisse-imprevu/ContractCIRepository'
import { readContractsCIPage } from '../../repositories/readContractsCIPage'
import { applyContractListScope, canPaginateContractsCI } from '../../utils/contract-pagination'
import type { ContractCIFilters } from '../../entities/contract-filters.types'

// Modèle de requêtes : ordre createdAt + id, filtres avant limit, curseurs et comptage séparé.
const memory = vi.hoisted(() => {
  type RecordData = Record<string, any>
  type Query = { base?: Query; path?: string; constraints?: RecordData[] }
  const state = { records: [] as RecordData[], transferred: 0 }
  const snapshot = (record: RecordData) => ({ id: record.id, data: () => record, exists: (): boolean => true })
  const value = (v: any) => v?.toDate ? v.toDate().getTime() : v instanceof Date ? v.getTime() : v
  function evaluate(q: Query): RecordData[] {
    const constraints: RecordData[] = []
    let current: Query | undefined = q
    while (current) { constraints.unshift(...(current.constraints ?? [])); current = current.base }
    let records = state.records.slice()
    for (const c of constraints.filter(c => c.kind === 'where')) {
      records = records.filter(r => {
        const a = value(r[c.field]), b = value(c.value)
        if (c.op === '==') return a === b
        if (c.op === 'in') return c.value.includes(r[c.field])
        if (c.op === '>=') return a !== undefined && a >= b
        if (c.op === '<=') return a !== undefined && a <= b
        throw new Error(`Opérateur non couvert : ${c.op}`)
      })
    }
    for (const c of constraints.filter(c => c.kind === 'order')) {
      records = records.filter(r => r[c.field] !== undefined).sort((a, b) => {
        const av = value(a[c.field]), bv = value(b[c.field])
        const comparison = av === bv ? a.id.localeCompare(b.id) : av > bv ? 1 : -1
        return c.direction === 'desc' ? -comparison : comparison
      })
    }
    for (const c of constraints.filter(c => c.kind === 'after')) records = records.slice(records.findIndex(r => r.id === c.anchor.id) + 1)
    for (const c of constraints.filter(c => c.kind === 'limit')) records = records.slice(0, c.size)
    return records
  }
  const getDocs = vi.fn(async (q: Query) => {
    const rows = evaluate(q)
    state.transferred += rows.length
    const docs = rows.map(snapshot)
    return { docs, size: docs.length, forEach: (fn: (d: ReturnType<typeof snapshot>) => void) => docs.forEach(fn) }
  })
  return {
    state, getDocs,
    api: {
      db: {}, collection: (_db: unknown, ...parts: string[]) => ({ path: parts.join('/') }),
      query: (base: Query, ...constraints: RecordData[]) => ({ base, constraints }),
      where: (field: string, op: string, v: unknown) => ({ kind: 'where', field, op, value: v }),
      orderBy: (field: string, direction: string) => ({ kind: 'order', field, direction }),
      limit: (size: number) => ({ kind: 'limit', size }),
      startAfter: (anchor: unknown) => ({ kind: 'after', anchor }),
      doc: (_ref: unknown, id: string) => ({ id }),
      getDoc: async ({ id }: { id: string }) => {
        const row = state.records.find(r => r.id === id)
        return row ? snapshot(row) : { id, exists: (): boolean => false }
      },
      getDocs, getCountFromServer: async (q: Query) => ({ data: () => ({ count: evaluate(q).length }) }),
    },
  }
})
vi.mock('@/firebase/firestore', () => memory.api)
vi.mock('@/domains/financial/refunds/earlyWithdrawalFilter', () => ({ getEarlyWithdrawalContractIds: vi.fn() }))

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-03T12:00:00'))
  memory.state.transferred = 0
  memory.state.records = Array.from({ length: 75 }, (_, index) => ({
    id: `ci-${String(index).padStart(3, '0')}`, memberFirstName: index % 2 ? 'Jeanne' : 'Nestor', memberLastName: 'MBOUMBA',
    firstPaymentDate: index % 2 ? '2026-01-31T12:00:00' : { toDate: () => new Date('2026-02-28T12:00:00') },
    createdAt: { toDate: () => new Date(2026, 0, Math.floor(index / 3) + 1) },
    updatedAt: { toDate: () => new Date('2026-11-01') }, status: ['ACTIVE', 'FINISHED', 'CANCELED'][index % 3],
    paymentFrequency: index % 2 ? 'DAILY' : 'MONTHLY', subscriptionCIID: 'forfait-1',
    totalMonthsPaid: index % 12, subscriptionCIAmountPerMonth: index % 2 ? '30000' : 20_000,
  }))
})
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

describe('pagination CI : parité avec la liste complète', () => {
  it('renvoie exactement les mêmes contrats sur toutes les pages, y compris les dates identiques', async () => {
    const reference = await new ContractCIRepository().getContractsWithFilters()
    memory.state.transferred = 0
    const all = []
    let cursor: string | null = null
    for (let page = 1; page <= 6; page++) {
      const result = await readContractsCIPage({}, 'all', page, 14, cursor)
      expect(result.total).toBe(75)
      expect(result.items).toEqual(reference.slice((page - 1) * 14, page * 14))
      all.push(...result.items)
      cursor = result.nextCursor
    }
    expect(all).toEqual(reference)
    expect(new Set(all.map(c => c.id)).size).toBe(75)
    expect(memory.state.transferred).toBe(75)
  })

  it('récupère 14 contrats au premier affichage et garde le nombre total', async () => {
    const result = await readContractsCIPage({}, 'all', 1, 14)
    expect(result.items).toHaveLength(14)
    expect(result.total).toBe(75)
    expect(memory.state.transferred).toBe(14)
  })

  it('restaure une page depuis l’URL, même si son curseur a été supprimé', async () => {
    const reference = await new ContractCIRepository().getContractsWithFilters()
    expect((await readContractsCIPage({}, 'all', 4, 14)).items).toEqual(reference.slice(42, 56))
    expect((await readContractsCIPage({}, 'all', 4, 14, 'deleted-contract')).items).toEqual(reference.slice(42, 56))
  })

  it.each([
    [{ status: 'ACTIVE' }, 'all'], [{ paymentFrequency: 'DAILY' }, 'all'], [{ subscriptionCIID: 'forfait-1' }, 'closed'],
    [{ status: 'ACTIVE' }, 'open'], [{ status: 'ACTIVE' }, 'closed'], [{ status: 'CANCELED' }, 'open'],
    [{ createdAtFrom: new Date('2026-01-10'), createdAtTo: new Date('2026-01-20') }, 'all'],
  ] as const)('garde les filtres et le périmètre %j / %s avant pagination', async (filters, scope) => {
    const reference = applyContractListScope(await new ContractCIRepository().getContractsWithFilters(filters), scope)
    const result = await readContractsCIPage(filters, scope, 1, 14)
    expect(result.items).toEqual(reference.slice(0, 14))
    expect(result.total).toBe(reference.length)
  })

  it.each([{ search: 'Jeanne' }, { overdueOnly: true }, { paidAmountMin: 0 }, { nextDueAtFrom: new Date() }, { earlyWithdrawal: 'IN_PROGRESS' }])('ne tronque pas les filtres calculés %j', (filters) => {
    expect(canPaginateContractsCI(filters as ContractCIFilters, 'all')).toBe(false)
  })

  it('conserve les statuts manquants dans le parcours complet des contrats ouverts', () => {
    expect(canPaginateContractsCI({}, 'open')).toBe(false)
    const data = [{ id: 'unknown' }, { id: 'closed', status: 'FINISHED' }] as never[]
    expect(applyContractListScope(data, 'open')).toEqual([{ id: 'unknown' }])
  })

  it('conserve les statistiques globales, le montant versé et les fréquences sans lire une deuxième liste', async () => {
    const reference = await new ContractCIRepository().getContractsWithFilters()
    const stats = await new ContractCIRepository().getContractsStats()
    expect(stats.total).toBe(reference.length)
    expect(stats.totalAmount).toBe(reference.reduce((sum, c) => sum + Number(c.totalMonthsPaid) * Number(c.subscriptionCIAmountPerMonth), 0))
    expect(stats.paymentFrequencyCounts).toEqual({ DAILY: 37, MONTHLY: 38 })
  })

  it('remonte les erreurs de lecture pour les pages et les exports stricts', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    memory.getDocs.mockRejectedValueOnce(new Error('Lecture refusée'))
    await expect(readContractsCIPage({}, 'all', 1, 14)).rejects.toThrow('Lecture refusée')
    memory.getDocs.mockRejectedValueOnce(new Error('Lecture refusée'))
    await expect(new ContractCIRepository().getContractsWithFilters({}, { throwOnError: true })).rejects.toThrow('Lecture refusée')
  })
})
