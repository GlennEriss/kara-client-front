import {
  CHARITY_STAR_LIFETIME_YEARS,
  computeCharityStars,
  MAX_CHARITY_STARS,
} from '@/domains/community/charity-stars/entities/charity-stars.types'
import { describe, expect, it } from 'vitest'

const NOW = new Date('2026-08-12T00:00:00')

/** Date située `years` années avant la référence, décalée de `days`. */
const yearsAgo = (years: number, days = 0) => {
  const date = new Date(NOW)
  date.setFullYear(date.getFullYear() - years)
  date.setDate(date.getDate() + days)
  return date
}

const star = (eventId: string, earnedAt: Date) => ({ eventId, earnedAt })

describe('computeCharityStars', () => {
  it('ne compte que les œuvres soutenues dans la fenêtre de six ans', () => {
    const result = computeCharityStars({
      memberId: 'member-1',
      starredEvents: [
        star('event-expire', yearsAgo(7)),
        star('event-recent', yearsAgo(2)),
        star('event-tres-recent', yearsAgo(0, -30)),
      ],
      now: NOW,
    })

    expect(result.stars).toBe(2)
    expect(result.activeStars.map((s) => s.eventId)).toEqual(['event-recent', 'event-tres-recent'])
  })

  it('garde une étoile la veille de ses six ans et la perd le lendemain', () => {
    const justInside = computeCharityStars({
      memberId: 'member-1',
      starredEvents: [star('event-1', yearsAgo(CHARITY_STAR_LIFETIME_YEARS, 1))],
      now: NOW,
    })
    const justOutside = computeCharityStars({
      memberId: 'member-1',
      starredEvents: [star('event-1', yearsAgo(CHARITY_STAR_LIFETIME_YEARS, -1))],
      now: NOW,
    })

    expect(justInside.stars).toBe(1)
    expect(justOutside.stars).toBe(0)
  })

  it('ne compte qu’une étoile par œuvre même si la liste comporte un doublon', () => {
    const result = computeCharityStars({
      memberId: 'member-1',
      starredEvents: [star('event-1', yearsAgo(1)), star('event-1', yearsAgo(3))],
      now: NOW,
    })

    expect(result.stars).toBe(1)
  })

  it('retranche les retraits encore dans la fenêtre, ignore ceux qui ont expiré', () => {
    const result = computeCharityStars({
      memberId: 'member-1',
      starredEvents: [star('a', yearsAgo(1)), star('b', yearsAgo(2)), star('c', yearsAgo(3))],
      // Un retrait récent pèse ; un retrait de 7 ans ne pèse plus, comme
      // l'étoile qu'il visait.
      deductions: [yearsAgo(1), yearsAgo(7)],
      now: NOW,
    })

    expect(result.deductedStars).toBe(1)
    expect(result.stars).toBe(2)
  })

  it('ne descend jamais sous zéro', () => {
    const result = computeCharityStars({
      memberId: 'member-1',
      starredEvents: [star('a', yearsAgo(1))],
      deductions: [yearsAgo(1), yearsAgo(1)],
      now: NOW,
    })

    expect(result.stars).toBe(0)
  })

  it('plafonne le solde à douze étoiles', () => {
    const result = computeCharityStars({
      memberId: 'member-1',
      starredEvents: Array.from({ length: 20 }, (_, i) => star(`event-${i}`, yearsAgo(1))),
      now: NOW,
    })

    expect(result.stars).toBe(MAX_CHARITY_STARS)
    expect(result.isCapped).toBe(true)
  })

  it('annonce l’expiration de la plus ancienne étoile encore active', () => {
    const result = computeCharityStars({
      memberId: 'member-1',
      starredEvents: [star('recent', yearsAgo(1)), star('ancienne', yearsAgo(5))],
      now: NOW,
    })

    // La plus ancienne, acquise il y a 5 ans, tombera dans un an.
    expect(result.nextExpiryAt?.getFullYear()).toBe(NOW.getFullYear() + 1)
  })

  it('traite un membre sans données comme n’ayant aucune étoile', () => {
    const result = computeCharityStars({ memberId: 'member-1', now: NOW })

    expect(result.stars).toBe(0)
    expect(result.activeStars).toEqual([])
    expect(result.nextExpiryAt).toBeNull()
  })

  it('ignore les entrées mal formées plutôt que de planter', () => {
    const result = computeCharityStars({
      memberId: 'member-1',
      starredEvents: [
        star('valide', yearsAgo(1)),
        { eventId: 'sans-date', earnedAt: null },
        { eventId: null, earnedAt: yearsAgo(1) },
      ] as any,
      deductions: ['pas-une-date', null],
      now: NOW,
    })

    expect(result.stars).toBe(1)
    expect(result.deductedStars).toBe(0)
  })
})
