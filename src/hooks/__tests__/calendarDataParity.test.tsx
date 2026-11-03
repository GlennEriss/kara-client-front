import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useCalendarCaisseSpeciale, type DayPayments } from '../useCalendarCaisseSpeciale'
import { useCalendarCreditSpeciale, type DayPaymentsCredit } from '../useCalendarCreditSpeciale'
import { useCalendarPlacement, type DayCommissions } from '../useCalendarPlacement'
import { computeCreditInstallments } from '@/utils/credit-installments'
import type { CreditContract, CreditPayment } from '@/types/types'

const mock = vi.hoisted(() => ({ contracts: vi.fn(), payments: vi.fn(), credits: vi.fn(), creditPayments: vi.fn(), placements: vi.fn(), commissions: vi.fn() }))
vi.mock('@tanstack/react-query', () => ({ useQuery: (options: unknown) => options }))
vi.mock('@/db/caisse/contracts.db', () => ({ getAllContracts: mock.contracts }))
vi.mock('@/db/caisse/payments.db', () => ({ listPayments: mock.payments }))
vi.mock('@/db/user.db', () => ({ getUserById: vi.fn().mockResolvedValue({ firstName: 'Jeanne', lastName: 'MBOUMBA' }) }))
vi.mock('@/db/group.db', () => ({ getGroupById: vi.fn().mockResolvedValue({ name: 'Groupe A' }) }))
vi.mock('@/factories/ServiceFactory', () => ({ ServiceFactory: {
  getCreditSpecialeService: () => ({ getContractsWithFilters: mock.credits, getPaymentsByCreditId: mock.creditPayments }),
  getPlacementService: () => ({ listPlacements: mock.placements, listCommissions: mock.commissions }),
} }))
afterEach(() => { vi.useRealTimers(); vi.clearAllMocks() })

describe('calendrier CS et crédits : conservation des dates et montants', () => {
  it('utilise la date décalée enregistrée et conserve les contrats en retard et les groupes', async () => {
    vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-11-03T12:00:00'))
    mock.contracts.mockResolvedValue([
      { id: 'cs-1', status: 'ACTIVE', contractType: 'INDIVIDUAL', memberId: 'M1', caisseType: 'STANDARD', contractStartAt: new Date('2026-01-01') },
      { id: 'cs-2', status: 'LATE_WITH_PENALTY', contractType: 'GROUP', groupeId: 'G1', caisseType: 'JOURNALIERE' },
      { id: 'cs-closed', status: 'CLOSED' },
    ])
    mock.payments.mockImplementation(async (id: string) => [
      { id: `${id}-old`, dueMonthIndex: 0, dueAt: new Date('2026-10-01'), amount: 1_000_000, status: 'DUE' },
      { id: `${id}-shifted`, dueMonthIndex: 1, dueAt: new Date('2026-11-15'), amount: 100_000, status: id === 'cs-1' ? 'PAID' : 'DUE' },
    ])
    const { result } = renderHook(() => useCalendarCaisseSpeciale(new Date('2026-11-01'), []))
    const days = await (result.current as unknown as { queryFn: () => Promise<DayPayments[]> }).queryFn()
    expect(mock.contracts).toHaveBeenCalledWith({ statuses: ['ACTIVE', 'LATE_NO_PENALTY', 'LATE_WITH_PENALTY'] })
    expect(mock.payments.mock.calls.map(([id]) => id)).toEqual(['cs-1', 'cs-2'])
    expect(days).toHaveLength(1)
    expect(days[0]).toMatchObject({ totalAmount: 200_000, paidAmount: 100_000, remainingAmount: 100_000, count: 2 })
    expect(days[0].date).toEqual(new Date('2026-11-15'))
    expect(days[0].payments[0]).toMatchObject({ id: 'cs-1-shifted', memberDisplayName: 'Jeanne MBOUMBA' })
    expect(days[0].payments[1]).toMatchObject({ id: 'cs-2-shifted', groupDisplayName: 'Groupe A' })
  })

  it.each(['SPECIALE', 'FIXE', 'AIDE'] as const)('conserve l’échéancier %s et le rattachement du paiement au bon contrat', async (creditType) => {
    vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-09-20T12:00:00'))
    const contract = { id: `credit-${creditType}`, creditType, status: 'ACTIVE', amount: 100_000, totalAmount: 120_000, monthlyPaymentAmount: 40_000, duration: 3, interestRate: 20, firstPaymentDate: new Date('2026-07-10'), createdAt: new Date('2026-07-01'), restMonths: [], clientFirstName: 'Jeanne', clientLastName: 'MBOUMBA' } as unknown as CreditContract
    const payments = [{ id: `M1_${contract.id}`, creditId: contract.id, amount: 40_000, paymentDate: new Date('2026-07-10'), comment: '' }] as CreditPayment[]
    mock.credits.mockResolvedValue([contract, { ...contract, id: 'closed', status: 'CLOSED' }, { ...contract, id: 'other-type', creditType: 'OTHER' }])
    mock.creditPayments.mockResolvedValue(payments)
    const { result } = renderHook(() => useCalendarCreditSpeciale(new Date('2026-09-01'), creditType))
    const days = await (result.current as unknown as { queryFn: () => Promise<DayPaymentsCredit[]> }).queryFn()
    const reference = computeCreditInstallments(contract, payments, new Date()).filter(i => i.dueDate.getMonth() === 8 && i.dueDate.getFullYear() === 2026)
    expect(mock.credits).toHaveBeenCalledWith({ creditType })
    expect(mock.creditPayments).toHaveBeenCalledTimes(1)
    expect(days.flatMap(d => d.payments).map(p => p.installment)).toEqual(reference)
    expect(days.flatMap(d => d.payments).every(p => p.contract.id === contract.id && p.clientDisplayName === 'Jeanne MBOUMBA')).toBe(true)
  })

  it('conserve l’ordre des placements, les commissions partielles et la restitution du capital avec six chargements simultanés', async () => {
    vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-11-03T12:00:00'))
    const placements = Array.from({ length: 20 }, (_, index) => ({ id: `pl-${index}`, benefactorId: 'M1', benefactorName: 'Jeanne MBOUMBA', amount: 1_000_000, status: 'Active', payoutMode: 'MonthlyCommission_CapitalEnd', endDate: new Date('2026-11-10'), createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-11-01'), createdBy: 'admin-1' }))
    mock.placements.mockResolvedValue(placements)
    let active = 0, peak = 0
    mock.commissions.mockImplementation(async (id: string) => {
      active++; peak = Math.max(peak, active)
      await new Promise(resolve => setTimeout(resolve, Number(id.slice(3)) % 3))
      active--
      return [{ id: `${id}-commission`, placementId: id, amount: 50_000, paidAmount: 10_000, status: 'Partial', dueDate: new Date('2026-11-10') }]
    })
    const { result } = renderHook(() => useCalendarPlacement(new Date('2026-11-01'), []))
    const days = await (result.current as unknown as { queryFn: () => Promise<DayCommissions[]> }).queryFn()
    expect(peak).toBe(6)
    expect(days).toHaveLength(1)
    expect(days[0]).toMatchObject({ totalAmount: 21_000_000, paidAmount: 200_000, remainingAmount: 20_800_000, capitalAmount: 20_000_000, count: 40 })
    expect(days[0].commissions.map(c => c.placementId)).toEqual(placements.flatMap(p => [p.id, p.id]))
  })
})
