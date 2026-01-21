import { describe, it, expect } from 'vitest'
import { formatDateDetailed } from '../../../../utils/details/formatDateDetailed'

describe('formatDateDetailed', () => {
  it('should format Date object to French format', () => {
    const date = new Date('2024-01-15T14:30:00')
    const result = formatDateDetailed(date)
    expect(result).toMatch(/15 janvier 2024/)
    expect(result).toMatch(/14:30/)
  })

  it('should format Firestore Timestamp (mock)', () => {
    const mockTimestamp = {
      toDate: () => new Date('2024-03-20T10:15:00')
    }
    const result = formatDateDetailed(mockTimestamp)
    expect(result).toMatch(/20 mars 2024/)
    expect(result).toMatch(/10:15/)
  })

  it('should format string date to French format', () => {
    const result = formatDateDetailed('2024-06-10T08:45:00')
    expect(result).toMatch(/10 juin 2024/)
    expect(result).toMatch(/08:45/)
  })

  it('should return "Non définie" for null', () => {
    expect(formatDateDetailed(null)).toBe('Non définie')
  })

  it('should return "Non définie" for undefined', () => {
    expect(formatDateDetailed(undefined)).toBe('Non définie')
  })

  it('should return "Date invalide" for invalid string', () => {
    expect(formatDateDetailed('invalid-date')).toBe('Date invalide')
  })

  it('should return "Date invalide" for invalid number', () => {
    expect(formatDateDetailed(NaN)).toBe('Date invalide')
  })
})
