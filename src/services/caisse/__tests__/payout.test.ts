import { describe, expect, it } from 'vitest'
import { computeContractBonusFromPayments } from '../bonus'
import { computeCaisseSpecialePayoutAmount } from '../payout'
import type { CaisseSettings } from '../types'

const now = new Date('2026-11-03T12:00:00')
const settings: CaisseSettings = {
  id: 'standard-charitable', effectiveAt: new Date('2025-06-01'), isActive: true,
  bonusTable: { M4: 6, M5: 7, M6: 8, M7: 9, M8: 10, M9: 12, M10: 15, M11: 17, M12: 20 },
  penaltyRules: { day4To12: { perDay: 0 } },
}
const contract = {
  contractStartAt: new Date('2025-12-22T00:00:00'),
  currentMonthIndex: 9,
  nominalPaid: 900_000,
  bonusAccrued: 46_000,
}
const payments = Array.from({ length: 12 }, (_, i) => ({
  dueMonthIndex: i,
  dueAt: new Date(2025, 11 + i, 22),
  status: i < 9 ? 'PAID' : 'DUE',
  paidAt: i < 9 ? new Date(2025, 11 + i, 22) : undefined,
  bonusApplied: [0, 0, 0, 6_000, 6_000, 7_000, 8_000, 9_000, 10_000, 0, 0, 0][i],
}))

describe('remise de caisse spéciale calculée avec le bonus global', () => {
  it('cas Imelda : restitue 1 008 000 FCFA et ignore le cumul historique de 46 000', () => {
    const bonus = computeContractBonusFromPayments(contract, payments, settings, now)
    expect(bonus).toMatchObject({ monthCount: 9, ratePercent: 12, amount: 108_000 })
    expect(computeCaisseSpecialePayoutAmount(contract, payments, settings, undefined, now)).toBe(1_008_000)
  })

  it('compte les mois réellement payés même si currentMonthIndex est trop grand', () => {
    expect(computeContractBonusFromPayments({ ...contract, currentMonthIndex: 12 }, payments, settings, now).monthCount).toBe(9)
  })

  it('ne donne pas le taux M12 à un contrat payé en avance', () => {
    const prepaid = payments.map((p) => ({ ...p, status: 'PAID', paidAt: contract.contractStartAt }))
    const recent = new Date('2026-02-03T12:00:00')
    expect(computeCaisseSpecialePayoutAmount({ ...contract, nominalPaid: 1_200_000 }, prepaid, settings, undefined, recent)).toBe(1_200_000)
  })

  it('retient M6 après un premier retard de plus de 20 jours à M7', () => {
    const late = payments.map((p) => p.dueMonthIndex === 6 ? { ...p, paidAt: new Date(2026, 6, 22) } : p)
    expect(computeContractBonusFromPayments(contract, late, settings, now)).toMatchObject({ monthCount: 6, ratePercent: 8, amount: 72_000 })
  })

  it('retire les pénalités du bonus sans réduire le nominal', () => {
    const penalized = payments.map((p, i) => i === 0 ? { ...p, penaltyApplied: 8_000 } : p)
    expect(computeCaisseSpecialePayoutAmount(contract, penalized, settings, undefined, now)).toBe(1_000_000)
  })

  it('préserve le montant de remise déjà enregistré', () => {
    expect(computeCaisseSpecialePayoutAmount(contract, payments, settings, { withdrawalAmount: 930_000 }, now)).toBe(930_000)
  })

  it('préserve le nominal et le bonus figés dans une demande existante', () => {
    expect(computeCaisseSpecialePayoutAmount(contract, payments, settings, { amountNominal: 900_000, amountBonus: 35_000 }, now)).toBe(935_000)
  })

  it('respecte aussi un bonus enregistré à zéro', () => {
    expect(computeCaisseSpecialePayoutAmount(contract, payments, settings, { amountNominal: 900_000, amountBonus: 0 }, now)).toBe(900_000)
  })
})
