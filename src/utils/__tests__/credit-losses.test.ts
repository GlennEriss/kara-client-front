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
    expect(computeCreditLossTotal(contract, payments, new Date('2026-05-10T23:59:59'))).toBe(9_000)
  })

  it('ne compte pas les échéances futures', () => {
    const payments = [
      payment('M1_fixe-1', 'fixe-1', 20_000, '2026-01-10'),
      payment('M2_fixe-1', 'fixe-1', 20_000, '2026-02-10'),
      payment('M3_fixe-1', 'fixe-1', 20_000, '2026-03-10'),
    ]
    expect(computeCreditLossTotal(contract, payments, new Date('2026-03-31T23:59:59'))).toBe(0)
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
    expect(computeCreditLossTotal(contract, [], new Date('2026-08-10T23:59:59'))).toBeGreaterThan(0)
  })

  it('ne compte pas la partie fixe avant sa première échéance', () => {
    expect(computeCreditLossTotal(contract, [], new Date('2026-07-31T23:59:59'))).toBe(0)
  })
})

describe('manque à gagner encaissé après la fin du contrat', () => {
  it('déduit les encaissements du manque à gagner restant', async () => {
    const { computeMissedEarningsBalance } = await import('@/utils/credit-losses')
    const contract = {
      id: 'fixe-2',
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
      missedEarningsPayments: [
        { id: 'MAG_1', amount: 4_000, date: new Date('2026-07-01'), mode: 'cash', recordedBy: 'a', recordedAt: new Date('2026-07-01') },
      ],
    } as unknown as CreditContract
    const payments = [
      payment('M1_fixe-2', 'fixe-2', 20_000, '2026-01-10'),
      payment('M2_fixe-2', 'fixe-2', 20_000, '2026-02-10'),
      payment('M3_fixe-2', 'fixe-2', 20_000, '2026-03-10'),
      payment('M4_fixe-2', 'fixe-2', 30_000, '2026-04-10'),
      payment('M5_fixe-2', 'fixe-2', 30_000, '2026-05-10'),
    ]

    expect(computeMissedEarningsBalance(contract, payments, new Date('2026-05-10T23:59:59'))).toEqual({ gross: 9_000, paid: 4_000, net: 5_000 })
  })
})
