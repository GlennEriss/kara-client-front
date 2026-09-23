import { getPayoutDueAt } from '@/hooks/useUpcomingPayouts'
import { describe, expect, it } from 'vitest'

describe('getPayoutDueAt', () => {
  it('prévoit la remise finale exactement à la fin du contrat', () => {
    const contractEnd = new Date('2026-11-10T15:30:00')

    expect(getPayoutDueAt(contractEnd, 'FINAL')).toEqual(
      new Date('2026-11-10T00:00:00'),
    )
  })

  it('conserve le délai de 30 jours pour un retrait anticipé', () => {
    const requestDate = new Date('2026-11-10T15:30:00')

    expect(getPayoutDueAt(requestDate, 'EARLY')).toEqual(
      new Date('2026-12-10T00:00:00'),
    )
  })
})
