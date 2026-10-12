import { describe, expect, it } from 'vitest'
import type { CreditContract, CreditPayment } from '@/types/types'
import { buildSimpleCreditSchedule, computeCreditLossTotal } from '@/utils/credit-losses'

const payment = (id: string, creditId: string, amount: number, date: string) =>
  ({ id, creditId, amount, paymentDate: new Date(date), comment: '' }) as CreditPayment

describe('manque à gagner d’un crédit fixe', () => {
  const contract = {
    id: 'fixe-1',
    creditType: 'FIXE',
    status: 'CLOSED',
    amount: 100_000,
    totalAmount: 120_000,
    monthlyPaymentAmount: 40_000,
    duration: 3,
    interestRate: 20,
    firstPaymentDate: new Date('2026-01-10'),
    createdAt: new Date('2026-01-01'),
    restMonths: [],
  } as unknown as CreditContract

  it('est nul quand tout est remboursé dans la durée', () => {
    const payments = [1, 2, 3].map((m) => payment(`M${m}_fixe-1`, 'fixe-1', 40_000, `2026-0${m}-10`))
    expect(computeCreditLossTotal(contract, payments)).toBe(0)
  })

  it('compte 10 % du reste dû pour chaque mois au-delà de la durée', () => {
    const payments = [
      payment('M1_fixe-1', 'fixe-1', 20_000, '2026-01-10'),
      payment('M2_fixe-1', 'fixe-1', 20_000, '2026-02-10'),
      payment('M3_fixe-1', 'fixe-1', 20_000, '2026-03-10'),
      payment('M4_fixe-1', 'fixe-1', 30_000, '2026-04-10'),
      payment('M5_fixe-1', 'fixe-1', 30_000, '2026-05-10'),
    ]
    const schedule = buildSimpleCreditSchedule(contract, payments)
    expect(schedule.slice(3, 5).map((row) => row.principal)).toEqual([60_000, 30_000])
    // M4 : 10 % de 60 000, M5 : 10 % de 30 000.
    expect(computeCreditLossTotal(contract, payments)).toBe(9_000)
  })
})

describe('manque à gagner d’un crédit spécial', () => {
  const contract = {
    id: 'spec-1',
    creditType: 'SPECIALE',
    durationUnit: 'MONTHS',
    status: 'ACTIVE',
    amount: 100_000,
    totalAmount: 130_000,
    monthlyPaymentAmount: 10_000,
    duration: 7,
    interestRate: 10,
    firstPaymentDate: new Date('2026-01-10'),
    createdAt: new Date('2026-01-01'),
    restMonths: [],
  } as unknown as CreditContract

  it('est nul tant que le contrat n’est pas en partie fixe', () => {
    const payments = [1, 2].map((m) => payment(`M${m}_spec-1`, 'spec-1', 10_000, `2026-0${m}-10`))
    const total = computeCreditLossTotal({ ...contract, monthlyPaymentAmount: 200_000 } as CreditContract, payments)
    expect(total).toBe(0)
  })

  it('compte les intérêts non perçus en partie fixe', () => {
    expect(computeCreditLossTotal(contract, [])).toBeGreaterThan(0)
  })
})
