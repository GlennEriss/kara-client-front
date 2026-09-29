import { describe, expect, it } from 'vitest'
import type { CreditContract, CreditPayment } from '@/types/types'
import { getCreditPaymentDeletionBlocker } from '@/utils/credit-payment-deletion'

const baseContract = {
  id: 'credit-1',
  creditType: 'SPECIALE',
  status: 'PARTIAL',
  amount: 500_000,
  interestRate: 5,
  monthlyPaymentAmount: 100_000,
  totalAmount: 525_000,
  duration: 7,
  firstPaymentDate: new Date('2026-01-01'),
  createdAt: new Date('2026-01-01'),
  restMonths: [],
} as unknown as CreditContract

const payment = (id: string, date: string) =>
  ({ id, creditId: 'credit-1', amount: 100_000, paymentDate: new Date(date) }) as CreditPayment

const m1 = payment('M1_credit-1', '2026-01-01')
const m2 = payment('M2_credit-1', '2026-02-01')

describe('getCreditPaymentDeletionBlocker', () => {
  it('autorise la suppression du dernier mois enregistré', () => {
    expect(getCreditPaymentDeletionBlocker(baseContract, [m1, m2], m2)).toBeNull()
  })

  it('refuse un mois qui n’est pas le dernier', () => {
    expect(getCreditPaymentDeletionBlocker(baseContract, [m1, m2], m1)).toMatch(/dernier mois enregistré \(M2\)/)
  })

  it('refuse si un mois de repos a été enregistré après le paiement', () => {
    const contract = {
      ...baseContract,
      restMonths: [{ monthNumber: 3, reason: 'Maladie' }],
    } as unknown as CreditContract
    expect(getCreditPaymentDeletionBlocker(contract, [m1, m2], m2)).toMatch(/M3/)
  })

  it('refuse sur un contrat soldé ou clôturé', () => {
    for (const status of ['DISCHARGED', 'CLOSED', 'TRANSFORMED'] as const) {
      const contract = { ...baseContract, status } as CreditContract
      expect(getCreditPaymentDeletionBlocker(contract, [m1, m2], m2)).toMatch(/soldé, clôturé ou transformé/)
    }
  })

  it('refuse un paiement d’un cycle antérieur au rajout', () => {
    const contract = {
      ...baseContract,
      creditCycles: [
        { cycleNumber: 1, type: 'INITIAL', amount: 500_000, interestRate: 5, monthlyPaymentAmount: 100_000, totalAmount: 525_000, duration: 7, firstPaymentDate: new Date('2026-01-01'), startedAt: new Date('2026-01-01'), restMonths: [] },
        { cycleNumber: 2, type: 'AUGMENTATION', amount: 600_000, interestRate: 5, monthlyPaymentAmount: 150_000, totalAmount: 630_000, duration: 7, firstPaymentDate: new Date('2026-05-01'), startedAt: new Date('2026-04-15'), restMonths: [] },
      ],
    } as unknown as CreditContract
    expect(getCreditPaymentDeletionBlocker(contract, [m1, m2], m2)).toMatch(/cycle antérieur/)
  })
})
