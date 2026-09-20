import { describe, expect, it } from 'vitest'
import { findOverdueMonths, hasOverdueMonths, summarizeOverdue } from '../overdueDetection'

/** Contrat mensuel de 12 mois à 30 000, première échéance le 10 janvier 2026. */
const contract = {
  firstPaymentDate: '2026-01-10',
  paymentFrequency: 'MONTHLY',
  subscriptionCIDuration: 12,
  subscriptionCIAmountPerMonth: 30000,
}

const today = new Date('2026-09-20T12:00:00')

describe('findOverdueMonths', () => {
  it('signale un contrat sans aucun document de versement', () => {
    // Le cas que l'ancien filtre laissait passer : rien n'a jamais été payé,
    // donc la sous-collection est vide.
    const overdue = findOverdueMonths(contract, [], { today })
    expect(overdue.length).toBeGreaterThan(0)
    expect(overdue[0].monthIndex).toBe(0)
    expect(overdue[0].remaining).toBe(30000)
  })

  it('ignore les échéances non encore échues', () => {
    const overdue = findOverdueMonths(contract, [], { today })
    // Échéances de janvier à septembre 2026 échues ; octobre et après, non.
    expect(overdue.every((o) => o.dueAt <= today)).toBe(true)
    expect(overdue.some((o) => o.monthIndex >= 9)).toBe(false)
  })

  it('exclut les mois soldés, par statut ou par cumul', () => {
    const overdue = findOverdueMonths(
      contract,
      [
        { monthIndex: 0, status: 'PAID', accumulatedAmount: 30000 },
        { monthIndex: 1, status: 'PARTIAL', accumulatedAmount: 30000 },
      ],
      { today },
    )
    expect(overdue.some((o) => o.monthIndex === 0)).toBe(false)
    expect(overdue.some((o) => o.monthIndex === 1)).toBe(false)
    expect(overdue.some((o) => o.monthIndex === 2)).toBe(true)
  })

  it('retient un mois partiellement payé, avec le reste à devoir', () => {
    const overdue = findOverdueMonths(
      contract,
      [{ monthIndex: 0, status: 'PARTIAL', accumulatedAmount: 12000 }],
      { today },
    )
    const month0 = overdue.find((o) => o.monthIndex === 0)
    expect(month0?.remaining).toBe(18000)
  })

  it('ignore les impayés antérieurs à la fenêtre de douze mois', () => {
    const vieuxContrat = { ...contract, firstPaymentDate: '2023-01-10', subscriptionCIDuration: 48 }
    const overdue = findOverdueMonths(vieuxContrat, [], { today })
    const limite = new Date('2025-09-20T00:00:00')
    expect(overdue.every((o) => o.dueAt >= limite)).toBe(true)
    // ...mais l'année écoulée est bien couverte.
    expect(overdue.length).toBeGreaterThan(0)
  })

  it('respecte une fenêtre personnalisée', () => {
    const large = findOverdueMonths(contract, [], { today, monthsBack: 12 })
    const etroite = findOverdueMonths(contract, [], { today, monthsBack: 3 })
    expect(etroite.length).toBeLessThan(large.length)
  })

  it('calcule le nombre de jours de retard', () => {
    const overdue = findOverdueMonths(contract, [], { today })
    const month0 = overdue.find((o) => o.monthIndex === 0)
    // Échéance du 10 janvier, référence au 20 septembre 2026.
    expect(month0?.daysLate).toBe(253)
  })

  it('ne renvoie rien sans durée exploitable', () => {
    expect(findOverdueMonths({ ...contract, subscriptionCIDuration: 0 }, [], { today })).toEqual([])
  })
})

describe('hasOverdueMonths', () => {
  it('résume la détection en booléen', () => {
    expect(hasOverdueMonths(contract, [], { today })).toBe(true)
    const soldes = Array.from({ length: 12 }, (_, monthIndex) => ({
      monthIndex,
      status: 'PAID',
      accumulatedAmount: 30000,
    }))
    expect(hasOverdueMonths(contract, soldes, { today })).toBe(false)
  })
})

describe('summarizeOverdue', () => {
  it('additionne le dû et retient le retard le plus ancien', () => {
    const summary = summarizeOverdue(
      findOverdueMonths(contract, [{ monthIndex: 0, accumulatedAmount: 10000 }], { today }),
    )
    expect(summary).not.toBeNull()
    // M0 partiel (20 000 restants) + les mois suivants échus à 30 000.
    expect(summary!.totalDue).toBe(20000 + summary!.count * 30000 - 30000)
    expect(summary!.maxDaysLate).toBe(253)
    expect(summary!.count).toBeGreaterThan(1)
  })

  it('renvoie null pour un contrat à jour', () => {
    expect(summarizeOverdue([])).toBeNull()
  })
})
