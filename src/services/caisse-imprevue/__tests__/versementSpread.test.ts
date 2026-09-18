import { describe, expect, it } from 'vitest'
import { planVersementSpread } from '../versementSpread'

const base = { duration: 12, monthlyTarget: 30000, months: [] as any[], startMonthIndex: 0 }

describe('planVersementSpread', () => {
  it('reste sur un seul mois quand le montant y tient', () => {
    const r = planVersementSpread({ ...base, amount: 20000 })
    expect(r.slices).toEqual([{ monthIndex: 0, amount: 20000 }])
    expect(r.overflow).toBe(0)
  })

  it('déborde sur le mois suivant en tenant compte du déjà-versé', () => {
    const r = planVersementSpread({
      ...base,
      months: [{ monthIndex: 0, accumulatedAmount: 25000 }],
      amount: 50000,
    })
    expect(r.slices).toEqual([
      { monthIndex: 0, amount: 5000 },
      { monthIndex: 1, amount: 30000 },
      { monthIndex: 2, amount: 15000 },
    ])
    expect(r.overflow).toBe(0)
  })

  it('cascade sur plusieurs mois jusqu\'à épuisement', () => {
    const r = planVersementSpread({ ...base, amount: 100000 })
    expect(r.slices).toEqual([
      { monthIndex: 0, amount: 30000 },
      { monthIndex: 1, amount: 30000 },
      { monthIndex: 2, amount: 30000 },
      { monthIndex: 3, amount: 10000 },
    ])
  })

  it('saute les mois déjà soldés', () => {
    const r = planVersementSpread({
      ...base,
      months: [
        { monthIndex: 0, accumulatedAmount: 30000 },
        { monthIndex: 1, accumulatedAmount: 30000 },
      ],
      amount: 10000,
    })
    expect(r.slices).toEqual([{ monthIndex: 2, amount: 10000 }])
  })

  it('signale le reliquat que le contrat ne peut pas absorber', () => {
    const r = planVersementSpread({ ...base, duration: 1, amount: 50000 })
    expect(r.slices).toEqual([{ monthIndex: 0, amount: 30000 }])
    expect(r.overflow).toBe(20000)
    expect(r.capacity).toBe(30000)
  })

  it('respecte un objectif propre au mois plutôt que le forfait courant', () => {
    const r = planVersementSpread({
      ...base,
      months: [{ monthIndex: 0, targetAmount: 10000 }],
      amount: 25000,
    })
    expect(r.slices).toEqual([
      { monthIndex: 0, amount: 10000 },
      { monthIndex: 1, amount: 15000 },
    ])
  })

  it('n\'écrit rien quand le contrat est entièrement soldé', () => {
    const r = planVersementSpread({
      ...base,
      duration: 2,
      months: [
        { monthIndex: 0, accumulatedAmount: 30000 },
        { monthIndex: 1, accumulatedAmount: 30000 },
      ],
      amount: 5000,
    })
    expect(r.slices).toEqual([])
    expect(r.overflow).toBe(5000)
    expect(r.capacity).toBe(0)
  })
})
