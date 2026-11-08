import { describe, expect, it } from 'vitest'
import { callPlanDateShortcuts, callPlanToday, isValidCallPlanDate } from '../call-plan-dates'

describe('dates du planning', () => {
  it('utilise le jour au Gabon même près de minuit UTC', () => {
    expect(callPlanToday(new Date('2026-11-08T23:30:00Z'))).toBe('2026-11-09')
  })
  it('propose demain et le lundi de la semaine suivante', () => {
    expect(callPlanDateShortcuts('2026-11-10').map((item) => item.value)).toEqual(['2026-11-10', '2026-11-11', '2026-11-16'])
  })
  it('accepte une date éloignée et refuse les dates impossibles et passées', () => {
    expect(isValidCallPlanDate('2027-05-20', '2026-11-08')).toBe(true)
    expect(isValidCallPlanDate('2026-11-07', '2026-11-08')).toBe(false)
    expect(isValidCallPlanDate('2027-02-30', '2026-11-08')).toBe(false)
  })
})
