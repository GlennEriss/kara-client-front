import { describe, expect, it } from 'vitest'
import { creditContractSummary } from '../credit-contract-summary'
import type { CreditContract, CreditPayment } from '@/types/types'
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
  guarantorRemunerationPercentage: 2,
} as CreditContract
const payment = {
  id: 'M1_test',
  amount: 100000,
  paymentDate: new Date('2026-05-05T12:00:00Z'),
} as CreditPayment

describe('solde partagé entre fiche web et API native', () => {
  it('déduit les versements du calendrier évolutif au lieu du solde stocké obsolète', () => {
    expect(creditContractSummary(contract, [payment])).toMatchObject({
      total: 301925,
      paid: 100000,
      remaining: 201925,
    })
  })
  it('préserve le versement explicite à zéro et exclut un paiement de pénalités uniquement', () => {
    const zero = { ...payment, amount: 0, comment: 'Paiement de 0 FCFA' }
    const totals = creditContractSummary(contract, [
      zero,
      {
        ...payment,
        id: 'penalty',
        amount: 0,
        comment: 'Paiement de pénalités uniquement',
      },
    ])
    expect(totals.paid).toBe(0)
    expect(totals.history.filter((r) => r.hasPaymentRecord)).toHaveLength(1)
  })
  it('conserve le total contractuel du crédit fixe et le total à intérêt unique des achats', () => {
    expect(
      creditContractSummary(
        { ...contract, creditType: 'FIXE', totalAmount: 275000 },
        [payment],
      ),
    ).toMatchObject({ total: 275000, paid: 100000, remaining: 175000 })
    expect(
      creditContractSummary(
        { ...contract, repaymentModel: 'FLAT', duration: 3 },
        [payment],
      ),
    ).toMatchObject({ total: 275000, paid: 100000, remaining: 175000 })
  })
})
