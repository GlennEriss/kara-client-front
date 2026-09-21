import { describe, expect, it } from 'vitest'
import { computeContractBonus } from '../bonus'

/** Table de taux : M4 = 4 %, M5 = 5 %… M10 = 10 %. */
const settings = {
  bonusTable: Object.fromEntries(
    Array.from({ length: 12 }, (_, i) => [`M${i + 1}`, i + 1 >= 4 ? i + 1 : 0]),
  ),
} as any

const start = new Date('2026-01-10T00:00:00')
/** Date de référence située `months` mois après le début. */
const after = (months: number) => new Date(2026, 0 + months, 10)

describe('computeContractBonus', () => {
  it("n'accorde rien avant le seuil", () => {
    const r = computeContractBonus({
      contractStartAt: start, paidMonthsCount: 2, totalPaid: 20000, settings, now: after(2),
    })
    expect(r.amount).toBe(0)
    expect(r.ratePercent).toBe(0)
  })

  it("plafonne par le temps : payer d'avance ne donne pas le taux du dernier mois", () => {
    // 10 mois versés, mais l'argent n'est détenu que depuis 2 mois.
    const r = computeContractBonus({
      contractStartAt: start, paidMonthsCount: 10, totalPaid: 100000, settings, now: after(2),
    })
    expect(r.monthCount).toBe(3)
    expect(r.amount).toBe(0)
  })

  it('plafonne par les versements : cesser de payer fige le taux', () => {
    // 5 mois soldés, mais 10 mois se sont écoulés.
    const r = computeContractBonus({
      contractStartAt: start, paidMonthsCount: 5, totalPaid: 50000, settings, now: after(10),
    })
    expect(r.monthCount).toBe(5)
    expect(r.rateLabel).toBe('M4')
    expect(r.ratePercent).toBe(4)
    expect(r.amount).toBe(2000)
  })

  it('applique le taux du mois précédent', () => {
    const r = computeContractBonus({
      contractStartAt: start, paidMonthsCount: 10, totalPaid: 100000, settings, now: after(9),
    })
    expect(r.monthCount).toBe(10)
    expect(r.rateLabel).toBe('M9')
    expect(r.ratePercent).toBe(9)
    expect(r.amount).toBe(9000)
  })

  it('arrondit le montant à l\'unité', () => {
    const r = computeContractBonus({
      contractStartAt: start, paidMonthsCount: 5, totalPaid: 33333, settings, now: after(10),
    })
    expect(Number.isInteger(r.amount)).toBe(true)
  })

  it('retombe sur les mois soldés sans date de début', () => {
    const r = computeContractBonus({
      contractStartAt: null, paidMonthsCount: 5, totalPaid: 50000, settings,
    })
    expect(r.monthCount).toBe(5)
    expect(r.rateLabel).toBe('M4')
  })

  it('ne rend rien sans table de taux', () => {
    const r = computeContractBonus({
      contractStartAt: start, paidMonthsCount: 10, totalPaid: 100000, settings: null, now: after(10),
    })
    expect(r.amount).toBe(0)
  })
})
