import { describe, expect, it } from 'vitest'
import type { CreditContract, CreditPayment, GuarantorRemuneration } from '@/types/types'
import {
  buildGuarantorCommissionBalance,
  buildGuarantorCommissionRows,
  buildGuarantorRemunerationDocId,
  dedupeGuarantorRemunerations,
  getGuarantorRemunerationCycleNumber,
} from '@/utils/guarantor-commission'

const contract = {
  id: 'credit-1',
  creditType: 'SPECIALE',
  amount: 600_000,
  interestRate: 5,
  monthlyPaymentAmount: 150_000,
  totalAmount: 630_000,
  duration: 7,
  guarantorRemunerationPercentage: 2,
  firstPaymentDate: new Date('2026-05-01'),
  createdAt: new Date('2026-01-01'),
  restMonths: [],
  creditCycles: [
    {
      cycleNumber: 1,
      type: 'INITIAL',
      amount: 500_000,
      interestRate: 5,
      monthlyPaymentAmount: 100_000,
      totalAmount: 525_000,
      duration: 7,
      firstPaymentDate: new Date('2026-01-01'),
      startedAt: new Date('2026-01-01'),
      restMonths: [],
    },
    {
      cycleNumber: 2,
      type: 'AUGMENTATION',
      amount: 600_000,
      interestRate: 5,
      monthlyPaymentAmount: 150_000,
      totalAmount: 630_000,
      duration: 7,
      firstPaymentDate: new Date('2026-05-01'),
      startedAt: new Date('2026-04-15'),
      restMonths: [],
    },
  ],
} as unknown as CreditContract

const payment = (id: string, amount: number, date: string) =>
  ({ id, creditId: 'credit-1', amount, paymentDate: new Date(date) }) as CreditPayment

const payments = [
  payment('M1_credit-1', 100_000, '2026-01-01'),
  payment('M2_credit-1', 100_000, '2026-02-01'),
  payment('C2_M1_credit-1', 150_000, '2026-05-01'),
]

const remuneration = (overrides: Partial<GuarantorRemuneration>) =>
  ({
    id: 'r',
    creditId: 'credit-1',
    guarantorId: 'g-1',
    paymentId: 'M1_credit-1',
    amount: 10_000,
    month: 1,
    createdAt: new Date('2026-01-01T10:00:00'),
    updatedAt: new Date('2026-01-01T10:00:00'),
    createdBy: 'admin',
    ...overrides,
  }) as GuarantorRemuneration

describe('guarantor commission', () => {
  it('identifie une commission par crédit, cycle et mois', () => {
    expect(buildGuarantorRemunerationDocId('credit-1', 2, 3)).toBe('credit-1_C2_M3')
  })

  it('retrouve le cycle des anciennes commissions via le paiement déclencheur', () => {
    expect(getGuarantorRemunerationCycleNumber(contract, remuneration({ paymentId: 'M1_credit-1' }))).toBe(1)
    expect(getGuarantorRemunerationCycleNumber(contract, remuneration({ paymentId: 'C2_M1_credit-1' }))).toBe(2)
    expect(
      getGuarantorRemunerationCycleNumber(contract, remuneration({ paymentId: 'M1_credit-1', cycleNumber: 2 }))
    ).toBe(2)
  })

  it('ne garde que la première commission de chaque mois, sans confondre M1 initial et M1 après rajout', () => {
    const { kept, duplicates } = dedupeGuarantorRemunerations(contract, [
      remuneration({ id: 'c1-m1-bis', createdAt: new Date('2026-01-03') }),
      remuneration({ id: 'c1-m1' }),
      remuneration({ id: 'c2-m1', paymentId: 'C2_M1_credit-1', amount: 12_000 }),
    ])

    expect(kept.map((item) => item.id).sort()).toEqual(['c1-m1', 'c2-m1'])
    expect(duplicates.map((item) => item.id)).toEqual(['c1-m1-bis'])
  })

  it('construit les lignes par cycle avec le capital du bon cycle et le montant enregistré', () => {
    const rows = buildGuarantorCommissionRows(
      contract,
      [
        remuneration({ id: 'c2-m1', paymentId: 'C2_M1_credit-1', amount: 12_000, cycleNumber: 2 }),
        remuneration({ id: 'c1-m2', paymentId: 'M2_credit-1', month: 2, amount: 8_500 }),
        remuneration({ id: 'c1-m1' }),
        remuneration({ id: 'c1-m1-bis', createdAt: new Date('2026-01-03') }),
      ],
      payments
    )

    expect(rows.map((row) => [row.monthLabel, row.capitalAtStartOfMonth, row.commissionAmount])).toEqual([
      ['M1 · janvier 2026', 500_000, 10_000],
      ['M2 · février 2026', 425_000, 8_500],
      ['Après rajout 1 · M1 · mai 2026', 600_000, 12_000],
    ])
  })

  it('calcule le reste à verser au garant sans jamais passer en négatif', () => {
    const rows = [{ commissionAmount: 10_000 }, { commissionAmount: 8_500 }]

    expect(buildGuarantorCommissionBalance(rows, [{ amount: 10_000 }])).toEqual({
      totalEarned: 18_500,
      totalPaid: 10_000,
      remaining: 8_500,
    })
    expect(buildGuarantorCommissionBalance(rows, [{ amount: 20_000 }]).remaining).toBe(0)
  })
})
