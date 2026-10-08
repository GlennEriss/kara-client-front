import { describe, expect, it } from 'vitest'
import type { CreditContract, CreditPayment } from '@/types/types'
import { buildCreditSpecialeHistory, getNextDueFromCreditSpecialeHistory } from '@/utils/credit-speciale-history'
import { getCreditPaymentDeletionBlocker } from '@/utils/credit-payment-deletion'
import { buildShopCreditSimulation, clampShopCreditInstallments, isFlatCredit, splitFlatInstallments } from '@/utils/credit-weekly'

const shopContract = {
  id: 'credit-b',
  creditType: 'SPECIALE',
  repaymentModel: 'FLAT',
  status: 'ACTIVE',
  amount: 150_000,
  interestRate: 10,
  monthlyPaymentAmount: 55_000,
  totalAmount: 165_000,
  duration: 3,
  guarantorRemunerationPercentage: 2,
  firstPaymentDate: new Date('2026-06-10'),
  createdAt: new Date('2026-05-10'),
  restMonths: [],
} as unknown as CreditContract

const payment = (id: string, amount: number, date: string) =>
  ({ id, creditId: 'credit-b', amount, paymentDate: new Date(date) }) as CreditPayment

describe('simulation d’un achat à crédit en boutique', () => {
  it('applique le taux une fois et découpe en mensualités égales', () => {
    const simulation = buildShopCreditSimulation({
      amount: 150_000,
      interestRate: 10,
      months: 3,
      firstPaymentDate: new Date('2026-06-10'),
    })
    expect(simulation.totalAmount).toBe(165_000)
    expect(simulation.monthlyPayment).toBe(55_000)
    expect(simulation.duration).toBe(3)
  })

  it('limite à 2 ou 3 mensualités', () => {
    expect(clampShopCreditInstallments(1)).toBe(2)
    expect(clampShopCreditInstallments(7)).toBe(3)
  })

  it('la dernière mensualité absorbe l’arrondi', () => {
    const parts = splitFlatInstallments(100_001, 3)
    expect(parts.reduce((a, b) => a + b, 0)).toBe(100_001)
  })

  it('reconnaît le mode à intérêts uniques', () => {
    expect(isFlatCredit(shopContract)).toBe(true)
    expect(isFlatCredit({ duration: 5 })).toBe(false)
  })
})

describe('échéancier d’un achat à crédit en boutique', () => {
  it('3 échéances mensuelles, intérêts répartis, commission une fois', () => {
    const history = buildCreditSpecialeHistory(shopContract, [])
    expect(history).toHaveLength(3)
    expect(history.map((row) => row.status)).toEqual(['DUE', 'FUTURE', 'FUTURE'])
    expect(history.map((row) => row.amountDue)).toEqual([55_000, 55_000, 55_000])
    expect(history.reduce((sum, row) => sum + row.interest, 0)).toBe(15_000)
    expect(history.map((row) => row.commission)).toEqual([3_000, 0, 0])
    expect(history[1].date.getMonth()).toBe(6)
  })

  it('un paiement partiel laisse le reste dû sur la même échéance', () => {
    const history = buildCreditSpecialeHistory(shopContract, [payment('M1_credit-b', 30_000, '2026-06-10')])
    expect(history[0]).toMatchObject({ status: 'DUE', amountDue: 25_000, actualPayment: 30_000 })
    expect(getNextDueFromCreditSpecialeHistory(history)?.month).toBe(1)
  })

  it('un excédent passe à l’échéance suivante', () => {
    const history = buildCreditSpecialeHistory(shopContract, [payment('M1_credit-b', 80_000, '2026-06-10')])
    expect(history[0].status).toBe('PAID')
    expect(history[1]).toMatchObject({ status: 'DUE', amountDue: 30_000, actualPayment: 25_000 })
    expect(history[1].nextCapitalActual).toBe(85_000)
  })

  it('tout est soldé après les 3 mensualités', () => {
    const history = buildCreditSpecialeHistory(shopContract, [
      payment('M1_credit-b', 55_000, '2026-06-10'),
      payment('M2_credit-b', 55_000, '2026-07-10'),
      payment('M3_credit-b', 55_000, '2026-08-10'),
    ])
    expect(history.every((row) => row.status === 'PAID')).toBe(true)
    expect(history[2].nextCapitalActual).toBe(0)
  })

  it('seul le dernier versement peut être supprimé', () => {
    const first = payment('M2_credit-b', 30_000, '2026-07-01')
    const second = payment('M2_credit-b_P2', 10_000, '2026-07-05')
    const payments = [payment('M1_credit-b', 55_000, '2026-06-10'), first, second]
    expect(getCreditPaymentDeletionBlocker(shopContract, payments, first)).not.toBeNull()
    expect(getCreditPaymentDeletionBlocker(shopContract, payments, second)).toBeNull()
  })
})
