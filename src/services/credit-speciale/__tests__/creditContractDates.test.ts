import { describe, expect, it } from 'vitest'
import { getCreditContractEndDate } from '../creditContractDates'

/**
 * Formate en date locale : `toISOString()` bascule sur le jour précédent dès que
 * le fuseau est en avance sur UTC, ce qui n'a rien à voir avec le calcul testé.
 */
function localDate(date: Date | null): string | null {
  if (!date) return null
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

describe('getCreditContractEndDate', () => {
  it('renvoie la date de la dernière mensualité', () => {
    // 12 mensualités à partir du 10/01/2026 → la dernière tombe le 10/12/2026.
    const end = getCreditContractEndDate({ firstPaymentDate: '2026-01-10', duration: 12 })
    expect(localDate(end)).toBe('2026-12-10')
  })

  it('gère un crédit d\'une seule mensualité', () => {
    const end = getCreditContractEndDate({ firstPaymentDate: '2026-01-10', duration: 1 })
    expect(localDate(end)).toBe('2026-01-10')
  })

  it('reporte correctement sur un mois plus court', () => {
    // 31 janvier + 1 mois : février n'a pas de 31.
    const end = getCreditContractEndDate({ firstPaymentDate: '2026-01-31', duration: 2 })
    expect(end).not.toBeNull()
    expect(end!.getMonth()).toBe(1) // février
  })

  it('renvoie null quand l\'échéancier est inconnu', () => {
    expect(getCreditContractEndDate({ firstPaymentDate: '2026-01-10', duration: 0 })).toBeNull()
    expect(getCreditContractEndDate({ duration: 12 })).toBeNull()
    expect(getCreditContractEndDate({ firstPaymentDate: 'pas une date', duration: 12 })).toBeNull()
  })
})
