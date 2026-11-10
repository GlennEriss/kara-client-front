import { describe, expect, it } from 'vitest'
import { findCreditPenaltyHistoryRow, parseCreditInstallmentReference } from '@/utils/credit-penalty-history'

describe('rattachement des pénalités à l’historique', () => {
  it.each([
    ['C1_M1', 1, 1],
    ['C2_M3_credit', 2, 3],
    ['M4', 1, 4],
    ['M4_credit', 1, 4],
  ])('reconnaît la référence %s', (ref, cycleNumber, monthNumber) => {
    expect(parseCreditInstallmentReference(ref)).toEqual({ cycleNumber, monthNumber })
  })

  it.each([undefined, '', 'C0_M1', 'C1_M0', 'C1_M1autre', 'M1autre'])('ne déduit aucun numéro de la référence invalide %s', ref => {
    expect(parseCreditInstallmentReference(ref)).toEqual({})
  })

  it('retrouve M1 malgré l’ancien décalage de date du contrat d’Eugénie', () => {
    const row = { key: 'C1_M1', cycleNumber: 1, cycleMonth: 1, date: new Date('2026-05-10T00:00:00Z') }
    const penalty = { installmentId: 'C1_M1', dueDate: new Date('2026-05-09T22:00:00Z'), amount: 160_000, paid: true }
    const match = findCreditPenaltyHistoryRow(penalty, [row])
    expect(match).toBe(row)
    expect(new Map(match ? [[match.key, penalty.amount]] : []).get('C1_M1')).toBe(160_000)
  })

  it('distingue le même mois de deux cycles après un rajout', () => {
    const initial = { cycleNumber: 1, cycleMonth: 1, date: new Date('2026-05-10') }
    const added = { cycleNumber: 2, cycleMonth: 1, date: new Date('2026-08-10') }
    expect(findCreditPenaltyHistoryRow({ installmentId: 'C2_M1', dueDate: initial.date }, [initial, added])).toBe(added)
  })

  it('ne réaffecte pas par la date une référence explicite dont le cycle est absent', () => {
    const row = { cycleNumber: 1, cycleMonth: 1, date: new Date('2026-05-10') }
    expect(findCreditPenaltyHistoryRow({ installmentId: 'C2_M1', dueDate: row.date }, [row])).toBeUndefined()
  })

  it('reconnaît les anciennes pénalités sans référence sur le même jour de Libreville', () => {
    const row = { cycleNumber: 1, cycleMonth: 1, date: new Date('2026-05-10T00:00:00Z') }
    expect(findCreditPenaltyHistoryRow({ dueDate: new Date('2026-05-09T23:00:00Z') }, [row])).toBe(row)
    expect(findCreditPenaltyHistoryRow({ dueDate: new Date('2026-05-09T22:00:00Z') }, [row])).toBeUndefined()
    expect(findCreditPenaltyHistoryRow({ dueDate: new Date('invalide') }, [row])).toBeUndefined()
  })
})
