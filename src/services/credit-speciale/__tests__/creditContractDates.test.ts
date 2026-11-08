import { describe, expect, it } from 'vitest'
import { getCreditContractEndDate, getCreditContractRemainingMonths, getCreditContractStartDates } from '../creditContractDates'
import type { CreditContractCycle } from '@/types/types'

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

describe('getCreditContractEndDate — crédit en semaines', () => {
  it('retourne l’échéance unique', () => {
    const end = getCreditContractEndDate({ firstPaymentDate: '2026-05-17', duration: 2, durationUnit: 'WEEKS' })
    expect(end?.getFullYear()).toBe(2026)
    expect(end?.getMonth()).toBe(4)
    expect(end?.getDate()).toBe(17)
  })
})

describe('dates de départ après rajout', () => {
  const initialDate = new Date('2026-01-01T12:00:00')
  const extensionDate = new Date('2026-11-20T12:00:00')

  it('conserve le départ initial quand il n’y a pas de rajout', () => {
    expect(getCreditContractStartDates({ createdAt: initialDate })).toEqual({
      startDate: initialDate, initialStartDate: initialDate, hasExtension: false,
    })
  })

  it('prend le départ du dernier cycle, même si les cycles sont désordonnés', () => {
    const creditCycles = [
      { cycleNumber: 2, type: 'AUGMENTATION', startedAt: extensionDate },
      { cycleNumber: 1, type: 'INITIAL', startedAt: initialDate },
    ] as CreditContractCycle[]
    expect(getCreditContractStartDates({ createdAt: initialDate, creditCycles })).toEqual({
      startDate: extensionDate, initialStartDate: initialDate, hasExtension: true,
    })
    expect(creditCycles[0].cycleNumber).toBe(2)
  })

  it('utilise la date du rajout des anciens contrats sans cycles', () => {
    expect(getCreditContractStartDates({ createdAt: initialDate, extendedAt: extensionDate })).toEqual({
      startDate: extensionDate, initialStartDate: initialDate, hasExtension: true,
    })
  })
})

describe('mois restants du cycle courant', () => {
  const contract = {
    createdAt: new Date('2026-01-01'),
    extendedAt: new Date('2026-11-20'),
    firstPaymentDate: '2026-12-05',
    duration: 7,
  }

  it('repart sur les sept nouvelles échéances après le rajout', () => {
    expect(getCreditContractRemainingMonths(contract, new Date('2026-11-20T12:00:00'))).toBe(7)
    expect(localDate(getCreditContractEndDate(contract))).toBe('2027-06-05')
  })

  it('inclut l’échéance du jour et ne décompte que les dates passées', () => {
    expect(getCreditContractRemainingMonths(contract, new Date('2026-12-05T18:00:00'))).toBe(7)
    expect(getCreditContractRemainingMonths(contract, new Date('2026-12-06T12:00:00'))).toBe(6)
    expect(getCreditContractRemainingMonths(contract, new Date('2027-06-06T12:00:00'))).toBe(0)
  })

  it('respecte les échéances en fin de mois', () => {
    expect(getCreditContractRemainingMonths({ firstPaymentDate: '2026-01-31', duration: 3 }, new Date('2026-02-28T12:00:00'))).toBe(2)
  })

  it('renvoie zéro pour un contrat terminé et aucun compteur si l’échéancier est inconnu ou en semaines', () => {
    expect(getCreditContractRemainingMonths({ ...contract, status: 'CLOSED' }, new Date('2026-11-20'))).toBe(0)
    expect(getCreditContractRemainingMonths({ ...contract, durationUnit: 'WEEKS' })).toBeNull()
    expect(getCreditContractRemainingMonths({ duration: 7 })).toBeNull()
  })
})
