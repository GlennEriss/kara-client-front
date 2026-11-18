import { describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { CreditContract } from '@/types/types'
const mocked = vi.hoisted(() => ({ payments: vi.fn() }))
vi.mock('@/factories/ServiceFactory', () => ({
  ServiceFactory: {
    getCreditSpecialeService: () => ({
      getPaymentsByCreditId: mocked.payments,
    }),
  },
}))
import { useCreditCardSummaries } from '../useCreditCardSummaries'
const contract = {
  id: 'credit',
  creditType: 'SPECIALE',
  status: 'PARTIAL',
  amount: 250000,
  monthlyPaymentAmount: 100000,
  interestRate: 10,
  totalAmount: 301925,
  amountPaid: 100000,
  amountRemaining: 192500,
  duration: 4,
  firstPaymentDate: new Date('2026-05-03T12:00:00Z'),
  createdAt: new Date('2026-05-03T12:00:00Z'),
} as CreditContract
function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
describe('montants des cartes web', () => {
  it('affiche le solde issu des versements sans modifier les termes du contrat utilisé pour le PDF', async () => {
    mocked.payments.mockResolvedValueOnce([
      { id: 'M1_test', amount: 100000, paymentDate: new Date('2026-05-05') },
    ])
    const { result } = renderHook(() => useCreditCardSummaries([contract]), {
      wrapper,
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.get('credit')).toMatchObject({
      amountRemaining: 201925,
      amountPaid: 100000,
      totalAmount: 301925,
    })
    expect(contract.amountRemaining).toBe(192500)
  })
  it('signale une lecture impossible au lieu de présenter le solde stocké comme recalculé', async () => {
    mocked.payments.mockRejectedValueOnce(new Error('Lecture impossible'))
    const { result } = renderHook(() => useCreditCardSummaries([contract]), {
      wrapper,
    })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.data).toBeUndefined()
  })
})
