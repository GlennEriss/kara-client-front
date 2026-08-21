import {
  buildMemberFormSummary,
  daysBetween,
  MEMBER_FORM_LENGTH,
  resolveOutcome,
  type MemberFormEntry,
} from '@/domains/community/member-form/entities/member-form.types'
import { describe, expect, it } from 'vitest'

const NOW = new Date('2026-08-12T10:00:00')
const at = (iso: string) => new Date(`${iso}T00:00:00`)

const entry = (overrides: Partial<MemberFormEntry> & { dueAt: Date }): MemberFormEntry => ({
  key: `k-${overrides.dueAt.getTime()}`,
  product: 'Caisse Spéciale',
  paidAt: null,
  amount: 10_000,
  outcome: 'onTime',
  daysLate: 0,
  ...overrides,
})

describe('resolveOutcome', () => {
  it('compte un versement le jour de l’échéance comme à l’heure', () => {
    const result = resolveOutcome({ dueAt: at('2026-05-10'), paidAt: at('2026-05-10'), now: NOW })

    expect(result.outcome).toBe('onTime')
    expect(result.daysLate).toBe(0)
  })

  it('ignore l’heure du versement', () => {
    // Payé à 23 h le jour de l'échéance : toujours à l'heure.
    const result = resolveOutcome({
      dueAt: at('2026-05-10'),
      paidAt: new Date('2026-05-10T23:59:00'),
      now: NOW,
    })

    expect(result.outcome).toBe('onTime')
  })

  it('signale un retard dès un jour de dépassement', () => {
    const result = resolveOutcome({ dueAt: at('2026-05-10'), paidAt: at('2026-05-11'), now: NOW })

    expect(result.outcome).toBe('late')
    expect(result.daysLate).toBe(1)
  })

  it('marque impayée une échéance passée sans versement', () => {
    const result = resolveOutcome({ dueAt: at('2026-07-01'), paidAt: null, now: NOW })

    expect(result.outcome).toBe('missed')
    expect(result.daysLate).toBe(42)
  })

  it('ne juge pas une échéance du jour encore impayée', () => {
    // L'échéance tombe aujourd'hui : le membre a jusqu'à ce soir.
    const result = resolveOutcome({ dueAt: at('2026-08-12'), paidAt: null, now: NOW })

    expect(result.outcome).toBe('onTime')
  })

  it('neutralise un report accordé', () => {
    const result = resolveOutcome({
      dueAt: at('2026-01-01'),
      paidAt: null,
      isExcused: true,
      now: NOW,
    })

    expect(result.outcome).toBe('excused')
    expect(result.daysLate).toBe(0)
  })
})

describe('buildMemberFormSummary', () => {
  it('garde les plus récentes en premier et tronque à la longueur demandée', () => {
    const entries = Array.from({ length: 15 }, (_, i) =>
      entry({ dueAt: at(`2026-0${(i % 9) + 1}-01`), key: `k-${i}` })
    )

    const summary = buildMemberFormSummary({ memberId: 'm1', entries })

    expect(summary.entries).toHaveLength(MEMBER_FORM_LENGTH)
    const dates = summary.entries.map((e) => e.dueAt.getTime())
    expect(dates).toEqual([...dates].sort((a, b) => b - a))
  })

  it('calcule la ponctualité sur les seules échéances jugées', () => {
    const summary = buildMemberFormSummary({
      memberId: 'm1',
      entries: [
        entry({ dueAt: at('2026-01-01'), outcome: 'onTime' }),
        entry({ dueAt: at('2026-02-01'), outcome: 'onTime' }),
        entry({ dueAt: at('2026-03-01'), outcome: 'late', daysLate: 3 }),
        entry({ dueAt: at('2026-04-01'), outcome: 'missed', daysLate: 30 }),
        // Un report accordé ne doit ni aider ni pénaliser.
        entry({ dueAt: at('2026-05-01'), outcome: 'excused' }),
      ],
    })

    expect(summary.ratedCount).toBe(4)
    expect(summary.onTimeCount).toBe(2)
    expect(summary.excusedCount).toBe(1)
    expect(summary.punctualityRate).toBe(0.5)
  })

  it('renvoie une ponctualité nulle plutôt que zéro sans échéance jugée', () => {
    const summary = buildMemberFormSummary({
      memberId: 'm1',
      entries: [entry({ dueAt: at('2026-05-01'), outcome: 'excused' })],
    })

    // `null` se distingue d'un 0 % : un membre sans historique n'est pas
    // un mauvais payeur.
    expect(summary.punctualityRate).toBeNull()
  })

  it('traite un membre sans échéance', () => {
    const summary = buildMemberFormSummary({ memberId: 'm1', entries: [] })

    expect(summary.entries).toEqual([])
    expect(summary.punctualityRate).toBeNull()
  })
})

describe('daysBetween', () => {
  it('ignore les heures', () => {
    expect(daysBetween(new Date('2026-05-10T23:00:00'), new Date('2026-05-11T01:00:00'))).toBe(1)
  })
})
