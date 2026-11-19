import { describe, it, expect } from 'vitest'
import { filterRows } from '../server/read-model'
import { listSchema } from '../server/gateway'
import { HELP_TOPICS } from '@/domains/help/content'
describe('filtres des sections natives', () => {
  it('sépare les abonnements valides des absents ou expirés', () => {
    const rows = [
      { id: 'active', isSubscriptionValid: true },
      { id: 'expired', isSubscriptionValid: false },
    ]
    expect(
      filterRows(rows, { isSubscriptionValid: 'true' }, 'members').map(
        (r) => r.id,
      ),
    ).toEqual(['active'])
    expect(
      filterRows(rows, { isSubscriptionValid: 'false' }, 'members').map(
        (r) => r.id,
      ),
    ).toEqual(['expired'])
  })
  it('retrouve les anniversaires récents et accepte plusieurs mois', () => {
    const rows = [
      { id: 'recent', daysUntil: 360, birthDate: '1990-01-01' },
      { id: 'upcoming', daysUntil: 14, birthDate: '1990-02-01' },
    ]
    expect(
      filterRows(rows, { birthdayPeriod: 'recent' }, 'birthdays').map(
        (r) => r.id,
      ),
    ).toEqual(['recent'])
    expect(
      filterRows(rows, { birthdayMonths: '1,2' }, 'birthdays'),
    ).toHaveLength(2)
    expect(listSchema.safeParse({ birthdayMonths: '13' }).success).toBe(false)
  })
  it('limite la vue anniversaire initiale aux groupes visibles du site et borne la pagination', () => {
    const rows = [0, 1, 7, 8, 30, 31, 357, 358, 364].map((daysUntil) => ({
      id: String(daysUntil),
      daysUntil,
    }))
    expect(
      filterRows(rows, { birthdayPeriod: 'nearby' }, 'birthdays').map(
        (r) => r.daysUntil,
      ),
    ).toEqual([0, 1, 7, 8, 30, 358, 364])
    expect(listSchema.parse({ limit: '10' }).limit).toBe(10)
    expect(listSchema.safeParse({ limit: '201' }).success).toBe(false)
    expect(listSchema.safeParse({ limit: '0' }).success).toBe(false)
  })
  it('filtre les appels sur leur date prévue au lieu de leur date de création', () => {
    expect(
      filterRows(
        [{ scheduledDate: '2027-01-01', createdAt: '2026-01-01' }],
        { from: '2026-12-31', to: '2027-01-02' },
        'calls',
      ),
    ).toHaveLength(1)
  })
  it('cherche les termes de l’aide dans les procédures avec le moteur du site', () => {
    const rows = HELP_TOPICS.map((t) => ({ ...t, id: t.key }))
    const results = filterRows(rows, { search: 'paiement pénalité' }, 'help')
    expect(results.length).toBeGreaterThan(0)
    expect(results.every((r) => r.sections.length > 0)).toBe(true)
  })
})

describe('groupes et projets', () => {
  it('recherche le projet et filtre le type sans supprimer les autres projets du groupe', () => {
    const group = {
      id: 'G',
      name: 'Quartier',
      projects: [
        { name: 'Réfrigérateur', kind: 'PURCHASE' },
        { name: 'Épargne', kind: 'TONTINE' },
      ],
    }
    expect(
      filterRows(
        [group],
        listSchema.parse({ search: 'refrigerateur', projectKind: 'PURCHASE' }),
        'groups',
      ),
    ).toHaveLength(1)
    expect(
      filterRows([group], { projectKind: 'OTHER' }, 'groups'),
    ).toHaveLength(0)
    expect(listSchema.safeParse({ projectKind: 'invalid' }).success).toBe(false)
  })
})
