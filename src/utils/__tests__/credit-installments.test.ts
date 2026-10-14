import { describe, expect, it } from 'vitest'
import type { CreditContract, CreditPayment } from '@/types/types'
import { computeCreditInstallments } from '@/utils/credit-installments'

const contract = {
  id: 'spec-cal',
  creditType: 'SPECIALE',
  durationUnit: 'MONTHS',
  status: 'ACTIVE',
  amount: 100_000,
  totalAmount: 130_000,
  monthlyPaymentAmount: 40_000,
  duration: 3,
  interestRate: 10,
  firstPaymentDate: new Date('2026-08-10'),
  createdAt: new Date('2026-08-01'),
  restMonths: [{ monthNumber: 2, reason: 'Repos' }],
} as unknown as CreditContract

const payment = (id: string, amount: number, date: string) =>
  ({ id, creditId: 'spec-cal', amount, paymentDate: new Date(date), comment: '' }) as CreditPayment

describe('échéances du calendrier crédit', () => {
  it('calcule les échéances sans échéances enregistrées : payée, en retard, à venir, sans les mois de repos', () => {
    const today = new Date('2026-10-14')
    const installments = computeCreditInstallments(contract, [payment('M1_spec-cal', 15_000, '2026-08-10')], today)

    expect(installments.map((i) => i.installmentNumber).slice(0, 3)).toEqual([1, 3, 4])
    expect(installments[0]).toMatchObject({ status: 'PAID', paidAmount: 15_000, remainingAmount: 0 })
    expect(installments[1]).toMatchObject({ status: 'OVERDUE', totalAmount: 40_000, remainingAmount: 40_000 })
    expect(installments[2]).toMatchObject({ status: 'DUE' })
  })
})

describe.each(['FIXE', 'AIDE'] as const)('échéances du calendrier — crédit %s', (creditType) => {
  const simple = {
    id: `simple-${creditType}`,
    creditType,
    status: 'ACTIVE',
    amount: 100_000,
    totalAmount: 120_000,
    monthlyPaymentAmount: 40_000,
    duration: 3,
    interestRate: 20,
    firstPaymentDate: new Date('2026-07-10'),
    createdAt: new Date('2026-07-01'),
    restMonths: [],
  } as unknown as CreditContract
  const pay = (month: number, amount: number, date: string) =>
    ({ id: `M${month}_${simple.id}`, creditId: simple.id, amount, paymentDate: new Date(date), comment: '' }) as CreditPayment

  it('suit les versements réels puis les échéances prévues, au-delà de la durée s’il reste à payer', () => {
    const today = new Date('2026-09-20')
    const installments = computeCreditInstallments(simple, [pay(1, 40_000, '2026-07-10'), pay(2, 20_000, '2026-08-12')], today)

    expect(installments.map((i) => [i.installmentNumber, i.status, i.totalAmount, i.remainingAmount])).toEqual([
      [1, 'PAID', 40_000, 0],
      [2, 'PAID', 20_000, 0],
      [3, 'OVERDUE', 40_000, 40_000],
      [4, 'DUE', 20_000, 20_000],
    ])
  })
})

