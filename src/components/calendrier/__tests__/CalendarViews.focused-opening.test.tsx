import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CalendarViewCI } from '../CalendarViewCI'
import { CalendarViewCreditSpeciale } from '../CalendarViewCreditSpeciale'
import { CalendarViewPlacement } from '../CalendarViewPlacement'

const queries = vi.hoisted(() => ({ ci: vi.fn(), credit: vi.fn(), placement: vi.fn() }))
vi.mock('@/hooks/useCalendarCaisseImprevue', () => ({ useCalendarCaisseImprevue: queries.ci }))
vi.mock('@/hooks/useCalendarCreditSpeciale', () => ({ useCalendarCreditSpeciale: queries.credit }))
vi.mock('@/hooks/useCalendarPlacement', () => ({ useCalendarPlacement: queries.placement }))
vi.mock('@/hooks/useMyAccess', () => ({ useMyAccess: () => ({ canSeeAmounts: true }) }))
vi.mock('../PaymentSidebarCI', () => ({ PaymentSidebarCI: ({ payment }: { payment: { contract: { id: string }; monthIndex: number } }) => <div role="dialog">{payment.contract.id}:{payment.monthIndex}</div> }))
vi.mock('../PaymentSidebarCreditSpeciale', () => ({ PaymentSidebarCreditSpeciale: ({ payment }: { payment: { contract: { id: string }; installment: { installmentNumber: number } } }) => <div role="dialog">{payment.contract.id}:{payment.installment.installmentNumber}</div> }))
vi.mock('../CommissionSidebarPlacement', () => ({ CommissionSidebarPlacement: ({ commission }: { commission: { placement: { id: string }; id: string } }) => <div role="dialog">{commission.placement.id}:{commission.id}</div> }))
vi.mock('../DayPaymentsModalCI', () => ({ DayPaymentsModalCI: () => null }))
vi.mock('../DayPaymentsModalCreditSpeciale', () => ({ DayPaymentsModalCreditSpeciale: () => null }))
vi.mock('../DayCommissionsModalPlacement', () => ({ DayCommissionsModalPlacement: () => null }))

const month = new Date('2026-11-01T12:00:00')

beforeEach(() => vi.resetAllMocks())

describe('ouverture ciblée indépendante du chargement mensuel', () => {
  it('ouvre une échéance CI pendant le chargement du mois', async () => {
    queries.ci.mockReturnValue({ data: [{ payments: [{ contract: { id: 'ci-1' }, monthIndex: 2 }] }], isFetching: false })
    render(<CalendarViewCI month={month} onMonthChange={vi.fn()} daysPayments={[]} isLoading focusedPaymentKey="ci:ci-1:2" />)
    expect(await screen.findByRole('dialog')).toHaveTextContent('ci-1:2')
    expect(queries.ci).toHaveBeenCalledWith(month, [], true, 'ci-1')
  })

  it.each(['SPECIALE', 'FIXE', 'AIDE'] as const)('ouvre une échéance %s pendant le chargement du mois', async (creditType) => {
    queries.credit.mockReturnValue({ data: [{ payments: [{ contract: { id: 'credit-1' }, installment: { installmentNumber: 3 } }] }], isFetching: false })
    render(<CalendarViewCreditSpeciale month={month} creditType={creditType} onMonthChange={vi.fn()} daysPayments={[]} isLoading focusedPaymentKey="credit:credit-1:3" />)
    expect(await screen.findByRole('dialog')).toHaveTextContent('credit-1:3')
    expect(queries.credit).toHaveBeenCalledWith(month, creditType, true, 'credit-1')
  })

  it('ouvre la commission du placement sélectionné pendant le chargement du mois', async () => {
    queries.placement.mockReturnValue({ data: [{ commissions: [{ placement: { id: 'pl-1' }, id: 'commission-1' }] }], isFetching: false })
    render(<CalendarViewPlacement month={month} onMonthChange={vi.fn()} daysCommissions={[]} isLoading focusedPaymentKey="placement:pl-1:commission-1" />)
    expect(await screen.findByRole('dialog')).toHaveTextContent('pl-1:commission-1')
    expect(queries.placement).toHaveBeenCalledWith(month, [], true, 'pl-1')
  })
})
