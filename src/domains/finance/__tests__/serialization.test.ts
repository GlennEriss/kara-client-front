import { describe, expect, it } from 'vitest'
import {
  normalizeFinanceDates,
  serializeFinanceValue,
} from '../server/serialization'
describe('dates imbriquées des contrats', () => {
  it('préserve le jour et l’heure du Timestamp d’une contribution et des remboursements d’aide', () => {
    const paidAt = new Date('2026-05-23T23:15:00.000Z')
    const timestamp = { toDate: () => paidAt, _seconds: 1, _nanoseconds: 0 }
    const input = {
      contributions: [{ paidAt: timestamp }],
      supports: [{ repayments: [{ createdAt: timestamp }] }],
    }
    expect(normalizeFinanceDates(input).contributions[0].paidAt).toEqual(paidAt)
    expect(serializeFinanceValue(input)).toEqual({
      contributions: [{ paidAt: paidAt.toISOString() }],
      supports: [{ repayments: [{ createdAt: paidAt.toISOString() }] }],
    })
  })
})
