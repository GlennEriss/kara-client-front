import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PaymentSidebarContent } from '../PaymentSidebarContent'
import type { CalendarPaymentItem } from '@/hooks/useCalendarCaisseSpeciale'

vi.mock('@/hooks/useMyAccess', () => ({ useMyAccess: () => ({ canSeeAmounts: true, canDownloadDocuments: false }) }))
vi.mock('@/hooks/useCaisseSettings', () => ({
  useActiveCaisseSettingsByType: () => ({ data: { bonusTable: { M9: 12 } }, isLoading: false }),
}))
vi.mock('@/hooks/useContractPayments', () => ({
  useContractPayments: () => ({
    isLoading: false,
    payments: Array.from({ length: 12 }, (_, i) => ({
      id: `payment-${i}`, dueMonthIndex: i, dueAt: new Date(2025, 11 + i, 22),
      status: i < 9 ? 'PAID' : 'DUE', paidAt: i < 9 ? new Date(2025, 11 + i, 22) : undefined,
    })),
  }),
}))

describe('bonus affiché dans le panneau d’un versement', () => {
  afterEach(() => vi.useRealTimers())

  it('affiche le bonus global de 108 000 FCFA au lieu du cumul historique de 46 000', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-03T12:00:00'))
    const payment = {
      id: 'payment-8', dueMonthIndex: 8, dueAt: new Date(2026, 7, 22),
      status: 'PAID', amount: 100_000, color: 'green',
      contract: {
        id: 'contract-imelda', contractStartAt: new Date('2025-12-22T00:00:00'),
        caisseType: 'STANDARD_CHARITABLE', nominalPaid: 900_000,
        currentMonthIndex: 9, monthsPlanned: 12, bonusAccrued: 46_000, penaltiesTotal: 0,
      },
    } as CalendarPaymentItem
    render(<PaymentSidebarContent payment={payment} showReceipt={false} />)
    expect(screen.getByText('108 000')).toBeInTheDocument()
    expect(screen.queryByText('46 000')).not.toBeInTheDocument()
  })
})
