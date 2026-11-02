import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useUpcomingPayouts } from '@/hooks/useUpcomingPayouts'
import { getAllContracts } from '@/db/caisse/contracts.db'
import { listPayments } from '@/db/caisse/payments.db'
import { listRefunds } from '@/db/caisse/refunds.db'
import { getActiveSettings } from '@/db/caisse/settings.db'

vi.mock('@/db/caisse/contracts.db', () => ({ getAllContracts: vi.fn() }))
vi.mock('@/db/caisse/payments.db', () => ({ listPayments: vi.fn() }))
vi.mock('@/db/caisse/refunds.db', () => ({ listRefunds: vi.fn(), listRefundsCI: vi.fn() }))
vi.mock('@/db/caisse/settings.db', () => ({ getActiveSettings: vi.fn() }))
vi.mock('@/db/user.db', () => ({ getUserById: async () => ({ firstName: 'IMELDA', lastName: 'EMBENET' }) }))
vi.mock('@/db/group.db', () => ({ getGroupById: vi.fn() }))
vi.mock('@/factories/ServiceFactory', () => ({
  ServiceFactory: {
    getCaisseImprevueService: () => ({ getContractsCIPaginated: async () => [] }),
    getPlacementService: () => ({ listPlacements: async () => [] }),
  },
}))

const contract = {
  id: 'contract-imelda', memberId: 'member-imelda', contractType: 'INDIVIDUAL',
  caisseType: 'STANDARD_CHARITABLE', status: 'LATE_WITH_PENALTY',
  nominalPaid: 900_000, bonusAccrued: 46_000, currentMonthIndex: 9, monthsPlanned: 12,
  contractStartAt: new Date('2025-12-22T00:00:00'), contractEndAt: new Date('2026-12-22T00:00:00'),
}
const payments = Array.from({ length: 12 }, (_, index) => ({
  dueMonthIndex: index, dueAt: new Date(2025, 11 + index, 22),
  status: index < 9 ? 'PAID' : 'DUE', paidAt: index < 9 ? new Date(2025, 11 + index, 22) : undefined,
}))

function renderPayouts() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  return renderHook(() => useUpcomingPayouts(), {
    wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
  })
}

describe('bonus des remises de caisse spéciale du calendrier', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-03T12:00:00'))
    vi.clearAllMocks()
    vi.mocked(getAllContracts).mockResolvedValue([contract] as any)
    vi.mocked(listPayments).mockResolvedValue(payments)
    vi.mocked(listRefunds).mockResolvedValue([])
    vi.mocked(getActiveSettings).mockResolvedValue({ bonusTable: { M8: 10, M9: 12 } } as any)
  })
  afterEach(() => vi.useRealTimers())

  it('affiche 1 008 000 FCFA pour Imelda sans modifier le contrat en base', async () => {
    const { result } = renderPayouts()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([expect.objectContaining({
      contractId: contract.id, name: 'IMELDA EMBENET', amount: 1_008_000,
      dueAt: new Date('2026-12-22T00:00:00'), isProjected: true,
    })])
    expect(contract.bonusAccrued).toBe(46_000)
  })

  it('réutilise le barème actif entre contrats du même type', async () => {
    vi.mocked(getAllContracts).mockResolvedValue([contract, { ...contract, id: 'second-contract' }] as any)
    const { result } = renderPayouts()
    await waitFor(() => expect(result.current.data).toHaveLength(2))
    expect(getActiveSettings).toHaveBeenCalledOnce()
  })

  it('conserve le montant d’un remboursement approuvé sans le recalculer', async () => {
    vi.mocked(getActiveSettings).mockRejectedValue(new Error('Barème indisponible'))
    vi.mocked(listRefunds).mockResolvedValue([{
      type: 'EARLY', status: 'APPROVED', withdrawalAmount: 930_000,
      approvedAt: new Date('2026-10-30T12:00:00'), payoutDueAt: new Date('2026-11-29T12:00:00'),
    }] as any)
    const { result } = renderPayouts()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.[0]).toMatchObject({ amount: 930_000, kind: 'EARLY', isProjected: false })
    expect(getActiveSettings).not.toHaveBeenCalled()
  })

  it('signale un barème manquant au lieu de sous-évaluer silencieusement la remise', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      vi.mocked(getActiveSettings).mockResolvedValue(null)
      const { result } = renderPayouts()
      await waitFor(() => expect(result.current.isError).toBe(true))
      expect(result.current.data).toBeUndefined()
    } finally {
      log.mockRestore()
    }
  })

  it('exclut toujours les remboursements déjà payés', async () => {
    vi.mocked(listRefunds).mockResolvedValue([{ type: 'EARLY', status: 'PAID' }] as any)
    const { result } = renderPayouts()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
  })
})
