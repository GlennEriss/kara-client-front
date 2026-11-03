import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { endOfMonth, startOfDay, startOfMonth } from 'date-fns'
import type { ContractCI, PaymentCI } from '@/types/types'
import { getPaymentDueDate } from '@/utils/caisse-imprevue-utils'
import { getCalendarPeriodsCI } from '@/domains/financial/caisse-imprevue/utils/calendar-periods'
import { useCalendarCaisseImprevue, type DayPaymentsCI } from '../useCalendarCaisseImprevue'

const service = vi.hoisted(() => ({ getContractsCIPaginated: vi.fn(), getPaymentsByContractId: vi.fn() }))
vi.mock('@/factories/ServiceFactory', () => ({ ServiceFactory: { getCaisseImprevueService: () => service } }))
vi.mock('@tanstack/react-query', () => ({ useQuery: (options: unknown) => options }))

const contract = (overrides: Partial<ContractCI> = {}) => ({
  id: 'ci-1', firstPaymentDate: '2026-01-31', paymentFrequency: 'MONTHLY', subscriptionCIDuration: 12,
  subscriptionCIAmountPerMonth: 30_000, memberFirstName: 'Jeanne', memberLastName: 'MBOUMBA', status: 'ACTIVE', ...overrides,
}) as ContractCI

/** Sélection de périodes de l'ancien parcours : construire tout, puis filtrer. */
function legacyPeriods(c: ContractCI, month: Date) {
  return Array.from({ length: c.subscriptionCIDuration || 0 }, (_, monthIndex) => ({
    monthIndex, dueDate: getPaymentDueDate(c, monthIndex) ?? new Date(c.firstPaymentDate),
  })).filter(p => startOfDay(p.dueDate) >= startOfMonth(month) && startOfDay(p.dueDate) <= endOfMonth(month))
}

afterEach(() => { vi.useRealTimers(); vi.clearAllMocks() })

describe('calendrier CI : parité et volume des lectures', () => {
  it('conserve les périodes mensuelles, les fins de mois et les cycles quotidiens de 30 jours', () => {
    for (const firstPaymentDate of ['2024-01-31', '2024-02-29', '2026-01-01', '2026-01-31', '2026-10-25']) {
      for (const paymentFrequency of ['DAILY', 'MONTHLY'] as const) {
        const c = contract({ firstPaymentDate, paymentFrequency, subscriptionCIDuration: 35 })
        for (let index = -1; index < 39; index++) {
          const month = new Date(new Date(firstPaymentDate).getFullYear(), index, 1)
          expect(getCalendarPeriodsCI(c, month)).toEqual(legacyPeriods(c, month))
        }
      }
    }
  })

  it('conserve les montants partiels, les identités et les échéances sans document, et ignore les contrats hors mois', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-03T12:00:00'))
    const contracts = [contract(), contract({ id: 'ci-2', memberFirstName: 'Nestor', memberLastName: 'MENGUE' }), contract({ id: 'ci-old', firstPaymentDate: '2023-01-01' })]
    service.getContractsCIPaginated.mockResolvedValue(contracts)
    service.getPaymentsByContractId.mockImplementation(async (id: string, indexes: number[]) => id === 'ci-1' ? [
      { id: 'legacy-payment-10', contractId: id, monthIndex: indexes[0], status: 'PARTIAL', accumulatedAmount: 12_000, targetAmount: 30_000, versements: [] } as unknown as PaymentCI,
    ] : [])
    const { result } = renderHook(() => useCalendarCaisseImprevue(new Date('2026-11-01'), [], true))
    const query = result.current as unknown as { queryFn: () => Promise<DayPaymentsCI[]> }
    let days!: DayPaymentsCI[]
    await act(async () => { days = await query.queryFn() })
    expect(service.getPaymentsByContractId.mock.calls).toEqual([['ci-1', [10]], ['ci-2', [10]]])
    expect(days).toHaveLength(1)
    expect(days[0]).toMatchObject({ totalAmount: 60_000, paidAmount: 0, remainingAmount: 48_000, count: 2, color: 'yellow' })
    expect(days[0].payments.map(p => [p.contract.id, p.id, p.memberDisplayName, p.status])).toEqual([
      ['ci-1', 'legacy-payment-10', 'Jeanne MBOUMBA', 'PARTIAL'], ['ci-2', 'month-10', 'Nestor MENGUE', 'DUE'],
    ])
    expect(days[0].date.getDate()).toBe(30)
  })
})
