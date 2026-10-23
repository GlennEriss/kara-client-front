import { describe, expect, it } from 'vitest'
import type { CreditContract, CreditPayment } from '@/types/types'
import {
  buildCreditSpecialeHistory,
  buildCreditSpecialeTimelineHistory,
  getCreditSpecialeInterestCollected,
} from '@/utils/credit-speciale-history'

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

describe('intérêts perçus d’un crédit spécial', () => {
  // Contrat réel : 1 000 000 à 10 %, des mois payés à 0 ou seulement en intérêts.
  const realContract = {
    ...contract,
    id: 'credit-f',
    amount: 1_000_000,
    monthlyPaymentAmount: 300_000,
    totalAmount: 1_750_000,
    firstPaymentDate: new Date('2025-10-05'),
    createdAt: new Date('2025-09-20'),
    restMonths: [],
  } as unknown as CreditContract
  const amounts = [0, 110_000, 110_000, 110_000, 210_000, 0, 0, 100_000, 0, 200_000, 200_000, 0, 300_000]
  const realPayments = amounts.map((amount, index) => ({
    id: `M${index + 1}_credit-f`,
    creditId: 'credit-f',
    amount,
    comment: amount === 0 ? 'Paiement de 0 FCFA' : undefined,
    paymentDate: new Date(2025, 9 + index, 4),
  })) as CreditPayment[]

  it('un versement paie au plus les intérêts de son mois', () => {
    const rows = buildCreditSpecialeTimelineHistory(realContract, realPayments)

    expect(rows.reduce((sum, row) => sum + row.interest, 0)).toBe(750_000)
    // M2 à M5 : 110 000 chacun ; M1, M6 et M7 impayés ; rien en partie fixe.
    expect(getCreditSpecialeInterestCollected(rows, false)).toBe(440_000)
  })

  it('crédit à intérêts uniques : rattrape les intérêts dus jusqu’à l’échéance', () => {
    const rows = [
      { interest: 30_000, actualPayment: 10_000 },
      { interest: 30_000, actualPayment: 100_000 },
    ]

    expect(getCreditSpecialeInterestCollected(rows, true)).toBe(60_000)
    expect(getCreditSpecialeInterestCollected(rows, false)).toBe(40_000)
  })
})
