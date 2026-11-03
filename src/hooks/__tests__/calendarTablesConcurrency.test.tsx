import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as concurrency from '@/utils/mapWithConcurrency'
import { useOverduePayments } from '../useOverduePayments'
import { useUpcomingPayments } from '../useUpcomingPayments'
import { useUpcomingPayouts } from '../useUpcomingPayouts'

const mock = vi.hoisted(() => ({ contracts: vi.fn(), payments: vi.fn(), refunds: vi.fn(), settings: vi.fn(), user: vi.fn() }))
vi.mock('@tanstack/react-query', () => ({ useQuery: (options: unknown) => options }))
vi.mock('@/db/caisse/contracts.db', () => ({ getAllContracts: mock.contracts }))
vi.mock('@/db/caisse/payments.db', () => ({ listPayments: mock.payments }))
vi.mock('@/db/caisse/refunds.db', () => ({ listRefunds: mock.refunds, listRefundsCI: vi.fn().mockResolvedValue([]) }))
vi.mock('@/db/caisse/settings.db', () => ({ getActiveSettings: mock.settings }))
vi.mock('@/db/user.db', () => ({ getUserById: mock.user }))
vi.mock('@/db/group.db', () => ({ getGroupById: vi.fn() }))
vi.mock('@/factories/ServiceFactory', () => ({ ServiceFactory: {
  getCaisseImprevueService: () => ({ getContractsCIPaginated: vi.fn().mockResolvedValue([]) }),
  getPlacementService: () => ({ listPlacements: vi.fn().mockResolvedValue([]) }),
} }))

let active = 0, peak = 0
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-11-03T12:00:00'))
  active = 0; peak = 0
  mock.user.mockResolvedValue({ firstName: 'Jeanne', lastName: 'MBOUMBA', matricule: 'M1', contacts: ['+24100000000'] })
  mock.contracts.mockImplementation(async () => Array.from({ length: 20 }, (_, index) => ({
    id: `cs-${index}`, memberId: 'M1', contractType: 'INDIVIDUAL', caisseType: 'STANDARD_CHARITABLE', status: 'LATE_WITH_PENALTY',
    nominalPaid: 900_000, bonusAccrued: 46_000, currentMonthIndex: 9, monthsPlanned: 12,
    contractStartAt: new Date('2025-12-22T00:00:00'), contractEndAt: new Date('2026-12-22T00:00:00'),
  })))
  mock.payments.mockImplementation(async () => {
    active++; peak = Math.max(peak, active)
    await new Promise(resolve => setTimeout(resolve, 1)); active--
    return Array.from({ length: 12 }, (_, index) => ({
      id: `payment-${index}`, amount: 100_000, dueMonthIndex: index, dueAt: new Date(2025, 11 + index, 22),
      status: index < 9 ? 'PAID' : 'DUE', paidAt: index < 9 ? new Date(2025, 11 + index, 22) : undefined,
    }))
  })
  mock.refunds.mockResolvedValue([])
  mock.settings.mockResolvedValue({ bonusTable: { M8: 10, M9: 12 } })
})
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers() })

describe('tableaux du calendrier : résultats identiques avec concurrence bornée', () => {
  const cases = [
    ['retards', () => useOverduePayments(['Caisse Spéciale'])],
    ['versements à venir', () => useUpcomingPayments('Caisse Spéciale', 60)],
    ['remises d’argent', () => useUpcomingPayouts()],
  ] as const
  it.each(cases)('conserve les montants, identités, dates et liens : %s', async (_name, hook) => {
    const { result } = renderHook(() => hook())
    const query = result.current as unknown as { queryFn: () => Promise<unknown[]> }
    // Ancien ordonnancement : tous les contrats démarrent simultanément.
    const spy = vi.spyOn(concurrency, 'mapWithConcurrency').mockImplementation((items, _limit, mapper) => Promise.all(items.map(mapper)))
    const reference = await query.queryFn()
    expect(peak).toBe(20)
    spy.mockRestore(); active = 0; peak = 0
    const actual = await query.queryFn()
    expect(actual).toEqual(reference)
    expect(actual.length).toBeGreaterThan(0)
    expect(peak).toBe(6)
  })
})
