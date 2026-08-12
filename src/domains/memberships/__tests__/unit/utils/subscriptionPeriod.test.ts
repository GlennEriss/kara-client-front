import { computeSubscriptionPeriod } from '@/domains/memberships/utils/subscriptionPeriod'
import { describe, expect, it } from 'vitest'

describe('computeSubscriptionPeriod', () => {
  it('fait courir l’abonnement depuis la date saisie, pas depuis aujourd’hui', () => {
    const { start, end } = computeSubscriptionPeriod('2026-09-01')

    // C'était le défaut : la période démarrait à `new Date()` quelle que soit
    // la saisie de l'admin.
    expect(start.getFullYear()).toBe(2026)
    expect(start.getMonth()).toBe(8) // septembre
    expect(start.getDate()).toBe(1)
    expect(end.getFullYear()).toBe(2027)
    expect(end.getMonth()).toBe(8)
    expect(end.getDate()).toBe(1)
  })

  it('accepte une date passée', () => {
    const { start, end } = computeSubscriptionPeriod('2024-03-15')

    expect(start.getFullYear()).toBe(2024)
    expect(end.getFullYear()).toBe(2025)
  })

  it('interprète la date en heure locale, sans décalage de fuseau', () => {
    const { start } = computeSubscriptionPeriod('2026-01-01')

    // `new Date('2026-01-01')` serait lu en UTC et basculerait au 31/12/2025
    // dans un fuseau négatif.
    expect(start.getDate()).toBe(1)
    expect(start.getMonth()).toBe(0)
  })

  it('accepte directement un objet Date sans le muter', () => {
    const source = new Date('2026-05-10T00:00:00')
    const { start, end } = computeSubscriptionPeriod(source)

    expect(start.getTime()).toBe(source.getTime())
    expect(end.getFullYear()).toBe(2027)
    // La date fournie ne doit pas être décalée par le calcul de la fin.
    expect(source.getFullYear()).toBe(2026)
  })

  it('reporte le 29 février sur une année non bissextile', () => {
    const { start, end } = computeSubscriptionPeriod('2028-02-29')

    expect(start.getDate()).toBe(29)
    // 2029 n'est pas bissextile : JavaScript reporte au 1er mars.
    expect(end.getMonth()).toBe(2)
    expect(end.getDate()).toBe(1)
  })

  it('refuse une date absente ou illisible plutôt que de retomber sur aujourd’hui', () => {
    expect(() => computeSubscriptionPeriod('')).toThrow('invalide')
    expect(() => computeSubscriptionPeriod('pas-une-date')).toThrow('invalide')
  })
})
