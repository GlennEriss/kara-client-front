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

  it('classe les versements de la période même sur un ancien contrat, en respectant zone et matricule', async () => {
    fixture.collections.get(names.users)![0].matricule = 'MAT1'
    fixture.collections.get(names.caisseContracts)![0].memberId = 'MAT1'
    fixture.collections.get(names.caisseContracts)!.push({ id: 'cs-other', memberId: 'M2', status: 'ACTIVE', createdAt: new Date('2026-01-01') })
    fixture.groups.get('payments')!.push(
      { id: 'recent', parent: names.caisseContracts, parentId: 'cs-1', data: { status: 'PAID', amount: 50_000, paidAt: new Date('2026-11-03T10:00:00+01:00') } },
      { id: 'other', parent: names.caisseContracts, parentId: 'cs-other', data: { status: 'PAID', amount: 900_000, paidAt: new Date('2026-11-03T10:00:00+01:00') } },
    )
    const result = await getDashboardSnapshot('caisse_speciale', {
      ...DEFAULT_DASHBOARD_FILTERS, period: 'custom', customFrom: '2026-11-03', customTo: '2026-11-03', zoneProvince: 'Estuaire',
    })
    expect(result.snapshot.rankings?.find(r => r.key === 'top_received')?.items).toMatchObject([
      { id: 'M1', label: 'MBOUMBA Jeanne', subLabel: 'MAT1', value: 50_000, href: '/memberships/M1' },
    ])
    const keys = fixture.read.mock.calls.map(([kind, name]) => `${kind}:${name}`)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('utilise le jour de Libreville quand le serveur est encore au jour précédent en UTC', async () => {
    vi.setSystemTime(new Date('2026-11-02T23:15:00Z'))
    fixture.groups.get('payments')!.push(
      { id: 'local-today', parent: names.caisseContracts, parentId: 'cs-1', data: { status: 'PAID', amount: 1000, paidAt: new Date('2026-11-02T23:05:00Z') } },
      { id: 'local-yesterday', parent: names.caisseContracts, parentId: 'cs-1', data: { status: 'PAID', amount: 9000, paidAt: new Date('2026-11-02T22:59:59Z') } },
    )
    const result = await getDashboardSnapshot('caisse_speciale', { ...DEFAULT_DASHBOARD_FILTERS, period: 'today' })
    const received = result.snapshot.rankings?.find(r => r.key === 'top_received')
    expect(received?.items[0].value).toBe(1000)
    expect(received?.description).toContain('03/11/2026')
  })

  it('affiche les nouveaux membres dans l’Exécutif et les souscriptions récentes dans leur section', async () => {
    fixture.collections.get(names.users)![0].dossier = 'req-m1'
    fixture.collections.set(names.membershipRequests, [
      { id: 'req-m1', status: 'approved', approvedAt: new Date('2026-11-02T10:00:00+01:00') },
    ])
    fixture.collections.get(names.caisseContracts)!.push({ id: 'cs-new', memberId: 'M1', status: 'ACTIVE', createdAt: new Date('2026-11-02T11:00:00+01:00') })
    const filters = { ...DEFAULT_DASHBOARD_FILTERS, period: 'custom' as const, customFrom: '2026-11-01', customTo: '2026-11-03', zoneProvince: 'Estuaire' }
    const executive = await getDashboardSnapshot('executive', filters)
    expect(executive.snapshot.rankings?.find(r => r.key === 'recent_members')).toMatchObject({
      kind: 'recent', items: [{ id: 'M1', date: '2026-11-02T09:00:00.000Z', subLabel: 'M1 · Adhésion approuvée' }],
    })
    fixture.read.mockClear()
    const caisse = await getDashboardSnapshot('caisse_speciale', filters)
    expect(caisse.snapshot.rankings?.find(r => r.key === 'recent_subscribers')).toMatchObject({
      kind: 'recent', items: [{ id: 'M1', date: '2026-11-02T10:00:00.000Z', subLabel: 'M1 · Dossier cs-new' }],
    })
    const keys = fixture.read.mock.calls.map(([kind, name]) => `${kind}:${name}`)
    expect(new Set(keys).size).toBe(keys.length)
  })
})
