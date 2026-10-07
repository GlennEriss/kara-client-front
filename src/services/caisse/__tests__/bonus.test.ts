import { describe, expect, it } from 'vitest'
import { computeContractBonus, countOnTimeMonthsBeforeFirstUnpaid, sumContractPenalties } from '../bonus'

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
    // 10 mois versés, mais l'argent n'est détenu que depuis 2 mois complets.
    const r = computeContractBonus({
      contractStartAt: start, paidMonthsCount: 10, totalPaid: 100000, settings, now: after(2),
    })
    expect(r.monthCount).toBe(2)
    expect(r.amount).toBe(0)
  })

  it('plafonne par les versements : cesser de payer fige le taux', () => {
    // 5 mois soldés, mais 10 mois se sont écoulés : 5 mois complets retenus.
    const r = computeContractBonus({
      contractStartAt: start, paidMonthsCount: 5, totalPaid: 50000, settings, now: after(10),
    })
    expect(r.monthCount).toBe(5)
    expect(r.rateLabel).toBe('M5')
    expect(r.ratePercent).toBe(5)
    expect(r.amount).toBe(2500)
  })

  it('applique le taux du dernier mois complet (au 10e mois en cours : M9)', () => {
    const r = computeContractBonus({
      contractStartAt: start, paidMonthsCount: 10, totalPaid: 100000, settings, now: after(9),
    })
    expect(r.monthCount).toBe(9)
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
    expect(r.monthCount).toBe(4)
    expect(r.rateLabel).toBe('M4')
  })

  it('ne rend rien sans table de taux', () => {
    const r = computeContractBonus({
      contractStartAt: start, paidMonthsCount: 10, totalPaid: 100000, settings: null, now: after(10),
    })
    expect(r.amount).toBe(0)
  })

  it('au terme d\u2019un contrat de 12 mois payé en entier : taux M12', () => {
    // Contrat du 05/10/2025, 12 mois soldés, consulté le 07/10/2026 (13e mois).
    const table = { bonusTable: { M4: 6, M5: 7, M6: 8, M7: 9, M8: 10, M9: 12, M10: 15, M11: 17, M12: 20 } } as any
    const r = computeContractBonus({
      contractStartAt: new Date('2025-10-05T00:00:00'),
      paidMonthsCount: 12,
      totalPaid: 4_450_000,
      settings: table,
      now: new Date('2026-10-07T12:00:00'),
    })
    expect(r.monthCount).toBe(12)
    expect(r.rateLabel).toBe('M12')
    expect(r.ratePercent).toBe(20)
    expect(r.amount).toBe(890_000)
  })
})

describe('bonus après un impayé', () => {
  const table = { bonusTable: { M4: 6, M5: 7, M6: 8, M7: 9, M8: 10, M9: 12, M10: 15, M11: 17, M12: 20 } } as any
  const startAt = new Date('2026-01-05T00:00:00')
  const dueAt = (i: number) => new Date(2026, i, 5)
  const paidOn = (i: number, paidAt: Date) => ({ dueMonthIndex: i, dueAt: dueAt(i), status: 'PAID', paidAt })

  it('compte les mois payés à l\u2019heure jusqu\u2019au premier impayé (tolérance 20 jours)', () => {
    expect(countOnTimeMonthsBeforeFirstUnpaid([
      paidOn(0, new Date(2026, 0, 5)),
      paidOn(1, new Date(2026, 1, 25)), // 20 jours de retard : toléré
      paidOn(2, new Date(2026, 2, 26)), // 21 jours : impayé
      paidOn(3, new Date(2026, 3, 1)),
    ])).toBe(2)
  })

  it('M1 payé, puis rattrapage de M2 à M5 au 5e mois : pas de bonus', () => {
    const catchUp = new Date(2026, 4, 10)
    const payments = [paidOn(0, new Date(2026, 0, 5)), ...[1, 2, 3, 4].map((i) => paidOn(i, catchUp))]
    const r = computeContractBonus({
      contractStartAt: startAt, paidMonthsCount: 5, totalPaid: 500_000, settings: table,
      onTimeMonthsCount: countOnTimeMonthsBeforeFirstUnpaid(payments), now: catchUp,
    })
    expect(r.amount).toBe(0)
  })

  it('M1 à M6 à l\u2019heure, M7 payé plus de 20 jours en retard : figé à M6 (8 %)', () => {
    const payments = [
      ...[0, 1, 2, 3, 4, 5].map((i) => paidOn(i, dueAt(i))),
      paidOn(6, new Date(2026, 7, 30)), // échéance le 05/08 : 25 jours de retard
      ...[7, 8, 9, 10, 11].map((i) => paidOn(i, dueAt(i))),
    ]
    const r = computeContractBonus({
      contractStartAt: startAt, paidMonthsCount: 12, totalPaid: 1_200_000, settings: table,
      onTimeMonthsCount: countOnTimeMonthsBeforeFirstUnpaid(payments), now: new Date('2027-01-07T12:00:00'),
    })
    expect(r.rateLabel).toBe('M6')
    expect(r.ratePercent).toBe(8)
    expect(r.amount).toBe(96_000)
  })

  it('tout payé d\u2019avance : aucun impayé, taux M12 au terme', () => {
    const payments = Array.from({ length: 12 }, (_, i) => paidOn(i, new Date(2025, 11, 20)))
    expect(countOnTimeMonthsBeforeFirstUnpaid(payments)).toBe(12)
  })
})

describe('pénalités retirées du bonus', () => {
  const table = { bonusTable: { M4: 6, M5: 7, M6: 8, M7: 9, M8: 10, M9: 12, M10: 15, M11: 17, M12: 20 } } as any
  const base = {
    contractStartAt: new Date('2025-10-05T00:00:00'),
    paidMonthsCount: 12,
    totalPaid: 4_450_000,
    settings: table,
    now: new Date('2026-10-07T12:00:00'),
  }

  it('retire les pénalités du bonus, pas du nominal', () => {
    const r = computeContractBonus({ ...base, penaltiesTotal: 40_000 })
    expect(r.grossAmount).toBe(890_000)
    expect(r.penaltiesDeducted).toBe(40_000)
    expect(r.amount).toBe(850_000)
  })

  it('ne rend jamais un bonus négatif', () => {
    const r = computeContractBonus({ ...base, totalPaid: 100_000, penaltiesTotal: 50_000 })
    expect(r.grossAmount).toBe(20_000)
    expect(r.penaltiesDeducted).toBe(20_000)
    expect(r.amount).toBe(0)
  })

  it('additionne les pénalités des versements de chaque échéance', () => {
    expect(
      sumContractPenalties([
        { contribs: [{ penalty: 1_000 }, { penalty: 2_500 }] },
        { penaltyApplied: 4_000 },
        { contribs: [], penaltyApplied: 0 },
      ]),
    ).toBe(7_500)
  })
})
