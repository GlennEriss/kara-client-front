import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCalendarCaisseSpeciale, type DayPayments } from '../useCalendarCaisseSpeciale'
import { useCalendarCaisseImprevue, type DayPaymentsCI } from '../useCalendarCaisseImprevue'
import { useCalendarCreditSpeciale, type DayPaymentsCredit } from '../useCalendarCreditSpeciale'
import { useCalendarPlacement, type DayCommissions } from '../useCalendarPlacement'

const mock = vi.hoisted(() => ({
  contract: vi.fn(), contracts: vi.fn(), payments: vi.fn(),
  ciContract: vi.fn(), ciContracts: vi.fn(), ciPayments: vi.fn(),
  credit: vi.fn(), credits: vi.fn(), creditPayments: vi.fn(),
  placement: vi.fn(), placements: vi.fn(), commissions: vi.fn(),
}))
vi.mock('@tanstack/react-query', () => ({ useQuery: (options: unknown) => options }))
vi.mock('@/db/caisse/contracts.db', () => ({ getContract: mock.contract, getAllContracts: mock.contracts }))
vi.mock('@/db/caisse/payments.db', () => ({ listPayments: mock.payments }))
vi.mock('@/db/user.db', () => ({ getUserById: vi.fn().mockResolvedValue({ firstName: 'Jeanne', lastName: 'MBOUMBA' }) }))
vi.mock('@/db/group.db', () => ({ getGroupById: vi.fn() }))
vi.mock('@/factories/ServiceFactory', () => ({ ServiceFactory: {
  getCaisseImprevueService: () => ({ getContractCIById: mock.ciContract, getContractsCIPaginated: mock.ciContracts, getPaymentsByContractId: mock.ciPayments }),
  getCreditSpecialeService: () => ({ getContractById: mock.credit, getContractsWithFilters: mock.credits, getPaymentsByCreditId: mock.creditPayments }),
  getPlacementService: () => ({ getPlacement: mock.placement, listPlacements: mock.placements, listCommissions: mock.commissions }),
} }))

type Query<T> = { queryFn: () => Promise<T>; queryKey: string[] }
const month = new Date('2026-11-01T12:00:00')
const dueDate = new Date('2026-11-10T12:00:00')

beforeEach(() => vi.resetAllMocks())

describe('ouverture d’un seul contrat sans attendre les autres', () => {
  it('lit uniquement le contrat CS demandé et ses versements, avec un cache séparé du mois complet', async () => {
    mock.contract.mockResolvedValue({ id: 'cs-1', status: 'ACTIVE', caisseType: 'STANDARD', contractType: 'INDIVIDUAL' })
    mock.payments.mockResolvedValue([{ id: 'payment-1', dueAt: dueDate, status: 'DUE', amount: 25_000 }])
    const { result } = renderHook(() => useCalendarCaisseSpeciale(month, [], true, 'cs-1'))
    const query = result.current as unknown as Query<DayPayments[]>
    const days = await query.queryFn()
    expect(mock.contract).toHaveBeenCalledWith('cs-1')
    expect(mock.contracts).not.toHaveBeenCalled()
    expect(mock.payments.mock.calls).toEqual([['cs-1']])
    expect(query.queryKey).toEqual(['calendar-caisse-speciale', '2026-11', '', 'contract', 'cs-1'])
    expect(days[0].payments[0]).toMatchObject({ id: 'payment-1', amount: 25_000, contract: { id: 'cs-1' } })
  })

  it('reconstitue l’échéance CI sans document en ne lisant que le contrat sélectionné', async () => {
    mock.ciContract.mockResolvedValue({ id: 'ci-1', status: 'ACTIVE', firstPaymentDate: '2026-11-10', paymentFrequency: 'MONTHLY', subscriptionCIDuration: 3, subscriptionCIAmountPerMonth: 30_000 })
    mock.ciPayments.mockResolvedValue([])
    const { result } = renderHook(() => useCalendarCaisseImprevue(month, [], true, 'ci-1'))
    const days = await (result.current as unknown as Query<DayPaymentsCI[]>).queryFn()
    expect(mock.ciContract).toHaveBeenCalledWith('ci-1')
    expect(mock.ciContracts).not.toHaveBeenCalled()
    expect(mock.ciPayments.mock.calls).toEqual([['ci-1', [0]]])
    expect(days[0].payments[0]).toMatchObject({ contractId: 'ci-1', monthIndex: 0, status: 'DUE', targetAmount: 30_000 })
  })

  it.each(['SPECIALE', 'FIXE', 'AIDE'] as const)('calcule le crédit %s sélectionné sans scanner tous les crédits', async (creditType) => {
    mock.credit.mockResolvedValue({ id: 'credit-1', creditType, status: 'ACTIVE', amount: 100_000, totalAmount: 120_000, monthlyPaymentAmount: 40_000, duration: 3, interestRate: 20, firstPaymentDate: dueDate, createdAt: month, restMonths: [], clientFirstName: 'Jeanne', clientLastName: 'MBOUMBA' })
    mock.creditPayments.mockResolvedValue([])
    const { result } = renderHook(() => useCalendarCreditSpeciale(month, creditType, true, 'credit-1'))
    const days = await (result.current as unknown as Query<DayPaymentsCredit[]>).queryFn()
    expect(mock.credit).toHaveBeenCalledWith('credit-1')
    expect(mock.credits).not.toHaveBeenCalled()
    expect(mock.creditPayments.mock.calls).toEqual([['credit-1']])
    expect(days[0].payments[0]).toMatchObject({ clientDisplayName: 'Jeanne MBOUMBA', installment: { installmentNumber: 1 }, contract: { id: 'credit-1', creditType } })
  })

  it('charge seulement le placement sélectionné avec ses commissions et sa restitution de capital', async () => {
    mock.placement.mockResolvedValue({ id: 'pl-1', status: 'Active', amount: 100_000, payoutMode: 'MonthlyCommission_CapitalEnd', benefactorName: 'Jeanne', endDate: dueDate })
    mock.commissions.mockResolvedValue([{ id: 'commission-1', dueDate, amount: 5_000, status: 'Due' }])
    const { result } = renderHook(() => useCalendarPlacement(month, [], true, 'pl-1'))
    const days = await (result.current as unknown as Query<DayCommissions[]>).queryFn()
    expect(mock.placement).toHaveBeenCalledWith('pl-1')
    expect(mock.placements).not.toHaveBeenCalled()
    expect(mock.commissions.mock.calls).toEqual([['pl-1']])
    expect(days[0].commissions.map((item) => item.kind)).toEqual(['commission', 'capital'])
  })

  it('ne charge aucun versement si le contrat a été clôturé ou supprimé', async () => {
    mock.credit.mockResolvedValue({ id: 'credit-1', creditType: 'SPECIALE', status: 'CLOSED' })
    const { result } = renderHook(() => useCalendarCreditSpeciale(month, 'SPECIALE', true, 'credit-1'))
    expect(await (result.current as unknown as Query<DayPaymentsCredit[]>).queryFn()).toEqual([])
    expect(mock.creditPayments).not.toHaveBeenCalled()
    mock.credit.mockResolvedValue(null)
    expect(await (result.current as unknown as Query<DayPaymentsCredit[]>).queryFn()).toEqual([])
    expect(mock.credits).not.toHaveBeenCalled()
  })
})
