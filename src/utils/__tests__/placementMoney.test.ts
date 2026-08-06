import {
  calculateMonthlyCommission,
  calculateTotalCommissions,
  roundFcfa,
  sumCommissionAmounts,
  sumPaidCommissionAmounts,
} from '@/utils/placementMoney'
import { describe, expect, it } from 'vitest'

describe('placementMoney', () => {
  describe('roundFcfa', () => {
    it('arrondit les montants à l’entier FCFA le plus proche', () => {
      expect(roundFcfa(500.49)).toBe(500)
      expect(roundFcfa(500.5)).toBe(501)
      expect(roundFcfa('1250.6')).toBe(1251)
    })

    it('refuse les montants non finis', () => {
      expect(() => roundFcfa(Number.NaN)).toThrow('nombre fini')
      expect(() => roundFcfa(Number.POSITIVE_INFINITY)).toThrow('nombre fini')
    })
  })

  it('calcule une commission mensuelle entière', () => {
    expect(calculateMonthlyCommission(1_000_000, 5)).toBe(50_000)
    expect(calculateMonthlyCommission(50_050, 1)).toBe(501)
  })

  it('calcule le total depuis la mensualité déjà arrondie', () => {
    expect(calculateTotalCommissions(1_000_000, 5, 3)).toBe(150_000)
    expect(calculateTotalCommissions(50_050, 1, 7)).toBe(3_507)
  })

  it('refuse une durée fractionnaire ou négative', () => {
    expect(() => calculateTotalCommissions(100_000, 2, 1.5)).toThrow('nombre entier')
    expect(() => calculateTotalCommissions(100_000, 2, -1)).toThrow('nombre entier')
  })

  it('agrège tous les statuts ou seulement ceux demandés', () => {
    const commissions = [
      { amount: 500.5, status: 'Due' as const },
      { amount: 1000, status: 'Paid' as const },
      { amount: 700, status: 'Canceled' as const },
    ]

    expect(sumCommissionAmounts(commissions)).toBe(2_201)
    expect(sumCommissionAmounts(commissions, ['Due', 'Paid'])).toBe(1_501)
    expect(sumCommissionAmounts(commissions, ['Paid'])).toBe(1_000)
    expect(sumCommissionAmounts(commissions, [])).toBe(0)
  })

  it('agrège les montants réellement payés avec compatibilité historique', () => {
    const commissions = [
      { amount: 1_000, paidAmount: 1_001, status: 'Paid' as const },
      { amount: 2_000, status: 'Paid' as const },
      { amount: 3_000, paidAmount: 3_000, status: 'Due' as const },
      { amount: 4_000, paidAmount: 4_000, status: 'Canceled' as const },
    ]

    expect(sumPaidCommissionAmounts(commissions)).toBe(3_001)
  })
})
