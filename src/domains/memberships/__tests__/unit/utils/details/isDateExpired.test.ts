import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { isDateExpired } from '../../../../utils/details/isDateExpired'

describe('isDateExpired', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return true for past date', () => {
    vi.setSystemTime(new Date('2024-01-15T12:00:00'))
    const pastDate = new Date('2024-01-14T12:00:00')
    expect(isDateExpired(pastDate)).toBe(true)
  })

  it('should return false for today', () => {
    const today = new Date('2024-01-15T12:00:00')
    vi.setSystemTime(today)
    expect(isDateExpired(today)).toBe(false)
  })

  it('should return false for future date', () => {
    vi.setSystemTime(new Date('2024-01-15T12:00:00'))
    const futureDate = new Date('2024-01-16T12:00:00')
    expect(isDateExpired(futureDate)).toBe(false)
  })

  it('should handle Firestore Timestamp (mock)', () => {
    vi.setSystemTime(new Date('2024-01-15T12:00:00'))
    const mockTimestamp = {
      toDate: () => new Date('2024-01-14T12:00:00')
    }
    expect(isDateExpired(mockTimestamp)).toBe(true)
  })

  it('should handle string date', () => {
    vi.setSystemTime(new Date('2024-01-15T12:00:00'))
    expect(isDateExpired('2024-01-14')).toBe(true)
    expect(isDateExpired('2024-01-16')).toBe(false)
  })

  it('should return false for null', () => {
    expect(isDateExpired(null)).toBe(false)
  })

  it('should return false for undefined', () => {
    expect(isDateExpired(undefined)).toBe(false)
  })

  it('should return false for invalid date string', () => {
    expect(isDateExpired('invalid-date')).toBe(false)
  })
})
