import { describe, expect, it } from 'vitest'
import type { CreditContract, CreditPayment } from '@/types/types'
import { getMonthPenaltyReferenceDate, getPenaltyReferenceDate } from '@/utils/credit-penalty-due-date'

const day = (value: string) => new Date(`${value}T00:00:00`)

const contract = { firstPaymentDate: day('2025-10-05'), restMonths: [] } as unknown as CreditContract
const payment = (month: number, amount: number, date: string) =>
  ({
    id: `M${month}_c`,
    amount,
    comment: amount === 0 ? 'Paiement de 0 FCFA' : undefined,
    paymentDate: day(date),
  }) as CreditPayment

describe('échéance glissante des pénalités', () => {
  it('décale la date prévue du retard déjà toléré', () => {
    expect(getPenaltyReferenceDate(day('2025-11-05'), 5)).toEqual(day('2025-11-10'))
    expect(getPenaltyReferenceDate(day('2025-11-05'))).toEqual(day('2025-11-05'))
  })

  it('M1 versé avec 5 jours de retard : M2 est attendu 5 jours plus tard', () => {
    const payments = [payment(1, 300_000, '2025-10-10')]

    expect(getMonthPenaltyReferenceDate(contract, payments, 2)).toEqual(day('2025-11-10'))
  })

  it.each([0, 1, 2, 3])('ne décale pas l’échéance après un retard de %i jour(s) sans pénalité', (daysLate) => {
    const payments = [payment(1, 110_000, `2025-10-${String(5 + daysLate).padStart(2, '0')}`)]

    expect(getMonthPenaltyReferenceDate(contract, payments, 2)).toEqual(day('2025-11-05'))
  })

  it('acquiert le décalage dès le quatrième jour de retard', () => {
    const payments = [payment(1, 110_000, '2025-10-09')]

    expect(getMonthPenaltyReferenceDate(contract, payments, 2)).toEqual(day('2025-11-09'))
  })

  it.each([1, 2, 3])('conserve le décalage acquis avec %i jour(s) de retard supplémentaire toléré', (daysLate) => {
    const payments = [
      payment(1, 110_000, '2025-10-10'),
      payment(2, 110_000, `2025-11-${10 + daysLate}`),
    ]

    expect(getMonthPenaltyReferenceDate(contract, payments, 3)).toEqual(day('2025-12-10'))
  })

  it('augmente le décalage dès le quatrième jour après la référence glissante', () => {
    const payments = [payment(1, 110_000, '2025-10-10'), payment(2, 110_000, '2025-11-14')]

    expect(getMonthPenaltyReferenceDate(contract, payments, 3)).toEqual(day('2025-12-14'))
  })

  it('ne cumule pas les retards tolérés avant un premier retard pénalisable', () => {
    const payments = [
      payment(1, 110_000, '2025-10-07'),
      payment(2, 110_000, '2025-11-08'),
      payment(3, 110_000, '2025-12-09'),
    ]

    expect(getMonthPenaltyReferenceDate(contract, payments, 3)).toEqual(day('2025-12-05'))
    expect(getMonthPenaltyReferenceDate(contract, payments, 4)).toEqual(day('2026-01-09'))
  })

  it('un retard acquis reste toléré, même après un mois payé à l’heure', () => {
    // Contrat réel : M1 déclaré à 0, M2 versé avec 9 jours de retard, M3 avec 1 jour, M4 avec 10.
    const payments = [
      payment(1, 0, '2025-10-04'),
      payment(2, 110_000, '2025-11-14'),
      payment(3, 110_000, '2025-12-06'),
      payment(4, 110_000, '2026-01-15'),
    ]

    // Une déclaration à 0 FCFA ne décale rien.
    expect(getMonthPenaltyReferenceDate(contract, payments, 2)).toEqual(day('2025-11-05'))
    expect(getMonthPenaltyReferenceDate(contract, payments, 3)).toEqual(day('2025-12-14'))
    // Les 9 jours de M2 restent acquis malgré M3 payé avec 1 jour : M4 attendu le 14/01.
    expect(getMonthPenaltyReferenceDate(contract, payments, 4)).toEqual(day('2026-01-14'))
    // M4 versé 1 jour après la référence glissante : les 9 jours restent acquis.
    expect(getMonthPenaltyReferenceDate(contract, payments, 5)).toEqual(day('2026-02-14'))
  })

  it('payer en avance ne réduit pas le décalage et n’avance pas l’échéance', () => {
    expect(getMonthPenaltyReferenceDate(contract, [payment(1, 300_000, '2025-10-01')], 2)).toEqual(day('2025-11-05'))
    const payments = [payment(1, 300_000, '2025-10-10'), payment(2, 300_000, '2025-11-01')]

    expect(getMonthPenaltyReferenceDate(contract, payments, 3)).toEqual(day('2025-12-10'))
  })
})
