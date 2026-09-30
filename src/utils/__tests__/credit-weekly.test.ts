import { describe, expect, it } from 'vitest'
import type { CreditContract, CreditPayment } from '@/types/types'
import { buildCreditSpecialeHistory, getNextDueFromCreditSpecialeHistory } from '@/utils/credit-speciale-history'
import { getCreditPaymentDeletionBlocker } from '@/utils/credit-payment-deletion'
import { buildWeeklyCreditSimulation, formatCreditDuration } from '@/utils/credit-weekly'

const weeklyContract = {
  id: 'credit-w',
  creditType: 'SPECIALE',
  durationUnit: 'WEEKS',
  status: 'ACTIVE',
  amount: 100_000,
  interestRate: 10,
  monthlyPaymentAmount: 110_000,
  totalAmount: 110_000,
  duration: 2,
  guarantorRemunerationPercentage: 2,
  firstPaymentDate: new Date('2026-05-15'),
  createdAt: new Date('2026-05-01'),
  restMonths: [],
} as unknown as CreditContract

const payment = (id: string, amount: number, date: string) =>
  ({ id, creditId: 'credit-w', amount, paymentDate: new Date(date) }) as CreditPayment

describe('simulation d’un crédit en semaines', () => {
  it('fixe l’échéance unique à la date de début + N semaines, intérêts appliqués une fois', () => {
    const simulation = buildWeeklyCreditSimulation({
      amount: 100_000,
      interestRate: 10,
      weeks: 2,
      startDate: new Date('2026-05-01'),
    })

    expect(simulation.durationUnit).toBe('WEEKS')
    expect(simulation.duration).toBe(2)
    expect(simulation.totalAmount).toBe(110_000)
    expect(simulation.monthlyPayment).toBe(110_000)
    expect(simulation.firstPaymentDate.getDate()).toBe(15)
  })

  it('limite la durée à 3 semaines', () => {
    expect(buildWeeklyCreditSimulation({ amount: 1, interestRate: 0, weeks: 9, startDate: new Date() }).duration).toBe(3)
  })

  it('affiche la durée dans la bonne unité', () => {
    expect(formatCreditDuration(1, 'WEEKS')).toBe('1 semaine')
    expect(formatCreditDuration(3, 'WEEKS')).toBe('3 semaines')
    expect(formatCreditDuration(5, undefined)).toBe('5 mois')
  })
})

describe('échéance d’un crédit en semaines', () => {
  it('une seule échéance due tant que rien n’est payé', () => {
    const history = buildCreditSpecialeHistory(weeklyContract, [])

    expect(history).toHaveLength(1)
    expect(history[0]).toMatchObject({ month: 1, status: 'DUE', interest: 10_000, amountDue: 110_000, capitalStart: 100_000 })
  })

  it('un paiement partiel laisse le reste dû sur la même échéance, sans intérêts supplémentaires', () => {
    // Paiement en retard : aucun mois supplémentaire, aucun intérêt en plus.
    const history = buildCreditSpecialeHistory(weeklyContract, [payment('M1_credit-w', 60_000, '2026-06-20')])

    expect(history).toHaveLength(1)
    expect(history[0]).toMatchObject({ status: 'DUE', actualPayment: 60_000, amountDue: 50_000, expectedPayment: 50_000 })
    expect(getNextDueFromCreditSpecialeHistory(history)?.amountDue).toBe(50_000)
  })

  it('est soldée quand le total dû est versé, en un ou plusieurs versements', () => {
    const history = buildCreditSpecialeHistory(weeklyContract, [
      payment('M1_credit-w', 60_000, '2026-05-15'),
      payment('M1_credit-w_P2', 50_000, '2026-05-20'),
    ])

    expect(history[0]).toMatchObject({ status: 'PAID', actualPayment: 110_000 })
    expect(getNextDueFromCreditSpecialeHistory(history)).toBeUndefined()
  })
})

describe('suppression d’un versement d’un crédit en semaines', () => {
  const first = payment('M1_credit-w', 60_000, '2026-05-15')
  const complement = payment('M1_credit-w_P2', 20_000, '2026-05-20')

  it('autorise le dernier versement de l’échéance', () => {
    expect(getCreditPaymentDeletionBlocker(weeklyContract, [first, complement], complement)).toBeNull()
  })

  it('refuse un versement antérieur tant qu’un complément existe', () => {
    expect(getCreditPaymentDeletionBlocker(weeklyContract, [first, complement], first)).toMatch(/dernier versement/)
  })
})
