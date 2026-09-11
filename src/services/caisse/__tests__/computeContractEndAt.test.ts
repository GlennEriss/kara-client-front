import { describe, expect, it } from 'vitest'
import { addContractMonths, computeContractEndAt, resolveContractEndAt } from '@/services/caisse/contractDates'

const start = new Date(2025, 0, 15) // 15 janvier 2025
// Formatage en heure locale : `toISOString()` repasse en UTC et décalerait
// la date d'un jour selon le fuseau de la machine de test.
const iso = (d: Date | null) =>
  d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : null

describe('computeContractEndAt', () => {
  it('journalier : dernier jour de la dernière période de 30 jours', () => {
    // 12 × 30 = 360 jours, dernier jour inclus → start + 359
    expect(iso(computeContractEndAt(start, 12, 'JOURNALIERE'))).toBe('2026-01-09')
    expect(iso(computeContractEndAt(start, 12, 'JOURNALIERE_CHARITABLE'))).toBe('2026-01-09')
  })

  it('journalier : cohérent avec le dueAt de la dernière échéance', () => {
    // Les échéances sont créées avec dueAt = start + (i + 1) * 30 - 1
    const monthsPlanned = 6
    const lastDueAt = new Date(start)
    lastDueAt.setDate(lastDueAt.getDate() + monthsPlanned * 30 - 1)

    expect(iso(computeContractEndAt(start, monthsPlanned, 'JOURNALIERE'))).toBe(iso(lastDueAt))
  })

  it('mensuel : durée en mois calendaires', () => {
    expect(iso(computeContractEndAt(start, 12, 'STANDARD'))).toBe('2026-01-15')
    expect(iso(computeContractEndAt(start, 6, 'LIBRE'))).toBe('2025-07-15')
    expect(iso(computeContractEndAt(start, 6, 'STANDARD_CHARITABLE'))).toBe('2025-07-15')
  })

  it('retourne null sans date de début ou sans durée', () => {
    expect(computeContractEndAt(null, 12, 'STANDARD')).toBeNull()
    expect(computeContractEndAt(undefined, 12, 'STANDARD')).toBeNull()
    expect(computeContractEndAt(start, 0, 'STANDARD')).toBeNull()
    expect(computeContractEndAt(start, null, 'STANDARD')).toBeNull()
  })

  it('ne modifie pas la date de début passée en argument', () => {
    const original = new Date(start)
    computeContractEndAt(start, 12, 'JOURNALIERE')
    expect(start.getTime()).toBe(original.getTime())
  })
})

describe('resolveContractEndAt', () => {
  it('privilégie la valeur stockée', () => {
    const stored = new Date(2030, 5, 1)
    const resolved = resolveContractEndAt({
      contractEndAt: stored,
      contractStartAt: start,
      monthsPlanned: 12,
      caisseType: 'STANDARD',
    })
    expect(resolved).toBe(stored)
  })

  it('recalcule pour un contrat antérieur, sans versement', () => {
    // Cas réel : contractEndAt n'était écrit qu'au premier versement.
    expect(
      iso(resolveContractEndAt({ contractStartAt: start, monthsPlanned: 12, caisseType: 'STANDARD' }))
    ).toBe('2026-01-15')
    expect(
      iso(resolveContractEndAt({ contractStartAt: start, monthsPlanned: 12, caisseType: 'JOURNALIERE' }))
    ).toBe('2026-01-09')
  })

  it('retombe sur firstPaymentDate si contractStartAt est absent', () => {
    expect(
      iso(resolveContractEndAt({ firstPaymentDate: '2025-01-15T00:00:00', monthsPlanned: 6, caisseType: 'STANDARD' }))
    ).toBe('2025-07-15')
  })

  it('accepte un Timestamp Firestore', () => {
    const timestamp = { toDate: () => new Date(start) } as unknown as Date
    expect(
      iso(resolveContractEndAt({ contractStartAt: timestamp, monthsPlanned: 6, caisseType: 'STANDARD' }))
    ).toBe('2025-07-15')
  })

  it('retourne null quand rien ne permet de conclure', () => {
    expect(resolveContractEndAt({ monthsPlanned: 12, caisseType: 'STANDARD' })).toBeNull()
    expect(resolveContractEndAt({ contractStartAt: start, caisseType: 'STANDARD' })).toBeNull()
    expect(resolveContractEndAt({ contractStartAt: new Date('invalide'), monthsPlanned: 12 })).toBeNull()
  })
})

describe('addContractMonths — règle « dernier jour du mois »', () => {
  const jan31 = new Date(2025, 0, 31)

  it('plafonne au dernier jour quand le mois d’arrivée est plus court', () => {
    expect(iso(addContractMonths(jan31, 1))).toBe('2025-02-28')
    expect(iso(addContractMonths(jan31, 3))).toBe('2025-04-30')
    expect(iso(addContractMonths(jan31, 5))).toBe('2025-06-30')
  })

  it('ne déborde jamais sur le mois suivant', () => {
    // L'ancien `setMonth` donnait 03/03, 01/05, 01/07 : un mois sans échéance
    // puis deux échéances dans le suivant.
    for (let i = 1; i <= 12; i++) {
      const due = addContractMonths(jan31, i)
      const expectedMonth = (jan31.getMonth() + i) % 12
      expect(due.getMonth()).toBe(expectedMonth)
    }
  })

  it('garde le quantième quand le mois d’arrivée est assez long', () => {
    expect(iso(addContractMonths(jan31, 2))).toBe('2025-03-31')
    expect(iso(addContractMonths(new Date(2025, 0, 15), 1))).toBe('2025-02-15')
  })

  it('gère le 29 février d’une année bissextile', () => {
    expect(iso(addContractMonths(new Date(2024, 0, 29), 1))).toBe('2024-02-29')
    expect(iso(addContractMonths(new Date(2025, 0, 29), 1))).toBe('2025-02-28')
  })

  it('applique la règle à la fin de contrat mensuelle', () => {
    expect(iso(computeContractEndAt(jan31, 1, 'STANDARD'))).toBe('2025-02-28')
    expect(iso(computeContractEndAt(jan31, 12, 'LIBRE'))).toBe('2026-01-31')
  })
})
