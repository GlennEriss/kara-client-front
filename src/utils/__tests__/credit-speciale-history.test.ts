import { describe, expect, it } from 'vitest'
import type { CreditContract, CreditPayment } from '@/types/types'
import { buildCreditSpecialeHistory } from '@/utils/credit-speciale-history'

const contract = {
  id: 'credit-r',
  creditType: 'SPECIALE',
  durationUnit: 'MONTHS',
  status: 'ACTIVE',
  amount: 1_603_500,
  interestRate: 10,
  monthlyPaymentAmount: 400_000,
  totalAmount: 2_085_158,
  duration: 5,
  guarantorRemunerationPercentage: 2,
  firstPaymentDate: new Date('2026-07-10'),
  createdAt: new Date('2026-07-01'),
  restMonths: [{ monthNumber: 1, reason: 'Repos accordé' }],
} as unknown as CreditContract

const payment = (id: string, amount: number, date: string) =>
  ({ id, creditId: 'credit-r', amount, paymentDate: new Date(date) }) as CreditPayment

describe('mois de repos d’un crédit spécial', () => {
  it('ne génère ni intérêt ni commission : le capital reste inchangé', () => {
    const [rest] = buildCreditSpecialeHistory(contract, [], { projectUntilZero: false })

    expect(rest).toMatchObject({
      month: 1,
      status: 'REST',
      capitalStart: 1_603_500,
      interest: 0,
      commission: 0,
      amountDue: 1_603_500,
      nextCapitalActual: 1_603_500,
    })
  })

  it('reprend les intérêts le mois suivant, sur le capital inchangé', () => {
    const history = buildCreditSpecialeHistory(contract, [payment('M2_credit-r', 400_000, '2026-08-10')], {
      projectUntilZero: false,
    })

    expect(history[1]).toMatchObject({ month: 2, capitalStart: 1_603_500, interest: 160_350, amountDue: 1_763_850 })
  })
})
