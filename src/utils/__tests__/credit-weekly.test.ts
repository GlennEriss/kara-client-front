import { describe, expect, it } from 'vitest'
import type { CreditContract, CreditPayment } from '@/types/types'
import { buildCreditSpecialeHistory, getNextDueFromCreditSpecialeHistory } from '@/utils/credit-speciale-history'
import { getCreditPaymentDeletionBlocker } from '@/utils/credit-payment-deletion'
import { buildWeeklyCreditSimulation, formatCreditDuration } from '@/utils/credit-weekly'
import { getCreditPeriodDueDate, getCreditPeriodIndex, getWeeklyInterestEndDate } from '@/utils/credit-periods'
import { getMonthPenaltyReferenceDate } from '@/utils/credit-penalty-due-date'

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

  it('un paiement partiel reporte le solde sur la semaine suivante avec des intérêts recalculés', () => {
    // Paiement en retard : aucun mois supplémentaire, aucun intérêt en plus.
    const history = buildCreditSpecialeHistory(weeklyContract, [payment('M1_credit-w', 60_000, '2026-06-20')])

    expect(history).toHaveLength(2)
    expect(history[0]).toMatchObject({ status: 'PAID', actualPayment: 60_000, nextCapitalActual: 50_000 })
    expect(history[1]).toMatchObject({ status: 'DUE', capitalStart: 50_000, interest: 5_000, amountDue: 55_000, date: new Date('2026-05-22') })
    expect(getNextDueFromCreditSpecialeHistory(history)?.amountDue).toBe(55_000)
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

describe('rythme hebdomadaire et passage en fixe après un mois calendaire', () => {
  const contract = { ...weeklyContract, repaymentModel: 'DEGRESSIVE' as const, guarantorId: 'identified-guarantor', firstPaymentDate: new Date('2026-01-08'), duration: 1 }
  it('recalcule à sept jours pour les forfaits initiaux de 1, 2 et 3 semaines', () => {
    for (const duration of [1, 2, 3]) {
      const c = { ...contract, duration, firstPaymentDate: new Date(`2026-01-${String(1 + 7 * duration).padStart(2, '0')}`) }
      const rows = buildCreditSpecialeHistory(c, [payment('M1_credit-w', 60_000, c.firstPaymentDate.toISOString())])
      expect(rows[1].date.getTime() - rows[0].date.getTime()).toBe(7 * 86400000)
      expect(rows[1]).toMatchObject({ capitalStart: 50000, interest: 5000, commission: 1000, amountDue: 55000 })
      expect(getWeeklyInterestEndDate(c)).toEqual(new Date('2026-02-01'))
    }
  })
  it('arrête les intérêts et commissions à la limite d’un mois, puis conserve le solde', () => {
    const paidInterest = [8, 15, 22, 29].map((day, i) => payment(`M${i + 1}_credit-w`, 10000, `2026-01-${day}`))
    const rows = buildCreditSpecialeHistory(contract, paidInterest)
    expect(rows.slice(0, 4).map(row => row.interest)).toEqual([10000, 10000, 10000, 10000])
    expect(rows[4]).toMatchObject({ date: new Date('2026-02-05'), phase: 'FIXE', capitalStart: 100000, interest: 0, commission: 0, amountDue: 100000 })
    const stillPartial = [...paidInterest, payment('M5_credit-w', 50000, '2026-02-05')]
    expect(buildCreditSpecialeHistory(contract, stillPartial).at(-1)).toMatchObject({ date: new Date('2026-02-12'), phase: 'FIXE', interest: 0, capitalStart: 50000, amountDue: 50000 })
  })
  it('attend tout le solde de la nouvelle semaine, sans ajouter d’intérêts sur des semaines futures', () => {
    const rows = buildCreditSpecialeHistory(contract, [{ ...payment('M1_credit-w', 0, '2026-01-08'), comment: 'Paiement de 0 FCFA' }])
    expect(rows).toHaveLength(2)
    expect(rows[1]).toMatchObject({ amountDue: 121000, expectedPayment: 121000, interest: 11000 })
  })
  it('utilise un mois calendaire, y compris un départ au 31 janvier', () => {
    const c = { ...contract, firstPaymentDate: new Date('2026-02-07') }
    expect(getWeeklyInterestEndDate(c)).toEqual(new Date('2026-02-28'))
    expect(buildCreditSpecialeHistory(c, [], { endMonth: 4, projectUntilZero: false }).at(-1)).toMatchObject({ phase: 'FIXE', interest: 0, date: new Date('2026-02-28') })
  })
  it('conserve les remboursements complets et l’historique des anciens contrats terminés', () => {
    expect(buildCreditSpecialeHistory(contract, [payment('M1_credit-w', 110000, '2026-01-08')])).toHaveLength(1)
    const oldClosed = { ...weeklyContract, status: 'CLOSED' as const }
    expect(buildCreditSpecialeHistory(oldClosed, [payment('M1_credit-w', 60000, '2026-05-15')])).toHaveLength(1)
    const closedNew = { ...contract, status: 'DISCHARGED' as const }
    const history = buildCreditSpecialeHistory(closedNew, [payment('M1_credit-w', 60000, '2026-01-08'), payment('M2_credit-w', 55000, '2026-01-15')])
    expect(history).toHaveLength(2)
    expect(history.map(r => r.interest)).toEqual([10000, 5000])
  })
  it('utilise des semaines pour les dates sans identifiant et les références glissantes', () => {
    expect(getCreditPeriodIndex(contract, new Date('2026-01-22'))).toBe(3)
    expect(getCreditPeriodDueDate(contract, 3)).toEqual(new Date('2026-01-22'))
    expect(getMonthPenaltyReferenceDate(contract, [payment('M1_credit-w', 60000, '2026-01-12')], 2)).toEqual(new Date(2026, 0, 19))
    expect(getMonthPenaltyReferenceDate(contract, [payment('M1_credit-w', 60000, '2026-01-11')], 2)).toEqual(new Date(2026, 0, 15))
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
