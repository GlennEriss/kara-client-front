// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { firebaseCollectionNames as names } from '@/constantes/firebase-collection-names'
import { FirestoreReadScope } from '@/domains/financial/reports/services/FirestoreReadScope'
import { getDashboardSnapshot } from '../services/DashboardAggregationService'
import { DASHBOARD_TAB_KEYS } from '../entities/dashboard-tabs.types'
import { DEFAULT_DASHBOARD_FILTERS } from '../entities/dashboard.types'

const fixture = vi.hoisted(() => {
  const collections = new Map<string, Record<string, unknown>[]>()
  const groups = new Map<string, { id: string; parent: string; parentId: string; data: Record<string, unknown> }[]>()
  const read = vi.fn(async (kind: string, name: string) => {
    const docs = kind === 'collection'
      ? (collections.get(name) ?? []).map(data => ({ id: data.id, data: () => data }))
      : (groups.get(name) ?? []).map(row => ({ id: row.id, data: () => row.data, ref: { parent: { parent: { id: row.parentId, parent: { id: row.parent } } } } }))
    return { docs }
  })
  const db = {
    collection: (name: string) => ({ get: () => read('collection', name) }),
    collectionGroup: (name: string) => ({ get: () => read('group', name) }),
  }
  return { collections, groups, read, db }
})
vi.mock('@/firebase/adminFirestore', () => ({ adminFirestore: fixture.db }))

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-03T12:00:00'))
  fixture.collections.clear(); fixture.groups.clear(); fixture.read.mockClear()
  const date = new Date('2026-10-10T12:00:00')
  fixture.collections.set(names.users, [
    { id: 'M1', firstName: 'Jeanne', lastName: 'MBOUMBA', roles: ['Adherant'], address: { province: 'Estuaire', city: 'Libreville' }, isActive: true, createdAt: date },
    { id: 'M2', firstName: 'Nestor', lastName: 'MENGUE', roles: ['Adherant'], address: { province: 'Haut-Ogooué', city: 'Franceville' }, isActive: true, createdAt: date },
  ])
  fixture.collections.set(names.caisseContracts, [{ id: 'cs-1', memberId: 'M1', status: 'ACTIVE', nominalPaid: 100_000, monthlyAmount: 100_000, monthsPlanned: 12, contractStartAt: date, createdAt: date }])
  fixture.collections.set(names.contractsCI, [{ id: 'ci-1', memberId: 'M2', status: 'ACTIVE', subscriptionCIAmountPerMonth: 30_000, subscriptionCINominal: 360_000, subscriptionCIDuration: 12, firstPaymentDate: '2026-10-10', paymentFrequency: 'MONTHLY', createdAt: date }])
  fixture.groups.set('payments', [
    { id: 'cs-pay-1', parent: names.caisseContracts, parentId: 'cs-1', data: { status: 'PAID', amount: 100_000, dueAt: date, paidAt: date, createdAt: date } },
    { id: 'ci-pay-1', parent: names.contractsCI, parentId: 'ci-1', data: { status: 'PAID', targetAmount: 30_000, accumulatedAmount: 30_000, versements: [{ amount: 30_000, createdAt: date }], createdAt: date } },
  ])
})
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers() })

describe('dashboard : parité avec les lectures indépendantes', () => {
  it.each(DASHBOARD_TAB_KEYS)('conserve exactement la réponse de l’onglet %s', async (tab) => {
    const collectionSpy = vi.spyOn(FirestoreReadScope.prototype, 'collection').mockImplementation(name => fixture.db.collection(name).get() as never)
    const groupSpy = vi.spyOn(FirestoreReadScope.prototype, 'collectionGroup').mockImplementation(name => fixture.db.collectionGroup(name).get() as never)
    const reference = await getDashboardSnapshot(tab, DEFAULT_DASHBOARD_FILTERS)
    const readsBefore = fixture.read.mock.calls.length
    collectionSpy.mockRestore(); groupSpy.mockRestore(); fixture.read.mockClear()
    const actual = await getDashboardSnapshot(tab, DEFAULT_DASHBOARD_FILTERS)
    expect(actual).toEqual(reference)
    const keys = fixture.read.mock.calls.map(([kind, name]) => `${kind}:${name}`)
    expect(new Set(keys).size).toBe(keys.length)
    const savedReads: Partial<Record<typeof tab, number>> = { executive: 2, caisse_speciale: 3, caisse_imprevue: 3, credit_speciale: 4, credit_fixe: 4, caisse_aide: 4, placements: 3 }
    expect(readsBefore - keys.length).toBe(savedReads[tab] ?? 0)
  })

  it('conserve les filtres de membres et de zone pour les chiffres financiers', async () => {
    const filters = { ...DEFAULT_DASHBOARD_FILTERS, zoneProvince: 'Estuaire' }
    const collectionSpy = vi.spyOn(FirestoreReadScope.prototype, 'collection').mockImplementation(name => fixture.db.collection(name).get() as never)
    const groupSpy = vi.spyOn(FirestoreReadScope.prototype, 'collectionGroup').mockImplementation(name => fixture.db.collectionGroup(name).get() as never)
    const reference = await getDashboardSnapshot('executive', filters)
    collectionSpy.mockRestore(); groupSpy.mockRestore()
    expect(await getDashboardSnapshot('executive', filters)).toEqual(reference)
  })

  it('relit les montants modifiés à la requête suivante', async () => {
    await getDashboardSnapshot('caisse_speciale', DEFAULT_DASHBOARD_FILTERS)
    fixture.groups.get('payments')![0].data.amount = 200_000
    const changed = await getDashboardSnapshot('caisse_speciale', DEFAULT_DASHBOARD_FILTERS)
    expect(fixture.read.mock.calls.filter(([kind, name]) => kind === 'group' && name === 'payments')).toHaveLength(2)
    expect(JSON.stringify(changed)).toContain('200000')
  })
})
