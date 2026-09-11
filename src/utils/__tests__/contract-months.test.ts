import { describe, expect, it } from 'vitest'
import { addContractMonths } from '@/utils/contract-months'

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

describe('addContractMonths — règle commune aux quatre produits', () => {
  const jan31 = new Date(2025, 0, 31)

  it('plafonne au dernier jour quand le mois d’arrivée est plus court', () => {
    expect(iso(addContractMonths(jan31, 1))).toBe('2025-02-28')
    expect(iso(addContractMonths(jan31, 3))).toBe('2025-04-30')
    expect(iso(addContractMonths(jan31, 5))).toBe('2025-06-30')
  })

  it('ne déborde jamais sur le mois suivant', () => {
    for (let i = 1; i <= 24; i++) {
      expect(addContractMonths(jan31, i).getMonth()).toBe((jan31.getMonth() + i) % 12)
    }
  })

  it('garde le quantième quand le mois d’arrivée est assez long', () => {
    expect(iso(addContractMonths(jan31, 2))).toBe('2025-03-31')
    expect(iso(addContractMonths(new Date(2025, 0, 15), 1))).toBe('2025-02-15')
  })

  it('gère le 29 février', () => {
    expect(iso(addContractMonths(new Date(2024, 0, 29), 1))).toBe('2024-02-29')
    expect(iso(addContractMonths(new Date(2025, 0, 29), 1))).toBe('2025-02-28')
  })

  it('accepte une chaîne ISO, comme les contrats qui stockent des strings', () => {
    expect(iso(addContractMonths('2025-01-31T00:00:00', 1))).toBe('2025-02-28')
    expect(iso(addContractMonths('2025-01-15T00:00:00', 6))).toBe('2025-07-15')
  })

  it('ne modifie pas la date passée en argument', () => {
    const original = jan31.getTime()
    addContractMonths(jan31, 5)
    expect(jan31.getTime()).toBe(original)
  })

  it('accepte un décalage nul ou négatif', () => {
    expect(iso(addContractMonths(jan31, 0))).toBe('2025-01-31')
    expect(iso(addContractMonths(new Date(2025, 2, 31), -1))).toBe('2025-02-28')
  })
})
