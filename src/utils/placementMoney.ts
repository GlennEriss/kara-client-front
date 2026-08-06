import type { CommissionStatus } from '@/types/types'

type CommissionAmount = {
  amount: number
  paidAmount?: number
  status: CommissionStatus
}

const toFiniteNumber = (value: unknown, label: string): number => {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} doit être un nombre fini`)
  }
  return parsed
}

/**
 * Normalise un montant en francs CFA. Le FCFA ne comporte pas de sous-unité :
 * tous les montants persistés par le module Placement sont donc des entiers.
 */
export const roundFcfa = (value: unknown): number =>
  Math.round(toFiniteNumber(value, 'Le montant'))

/** Calcule la commission d'un mois, le taux étant un taux mensuel en pourcentage. */
export const calculateMonthlyCommission = (capital: number, rate: number): number => {
  const normalizedCapital = toFiniteNumber(capital, 'Le capital')
  const normalizedRate = toFiniteNumber(rate, 'Le taux')

  if (normalizedCapital < 0) throw new Error('Le capital doit être positif ou nul')
  if (normalizedRate < 0) throw new Error('Le taux doit être positif ou nul')

  return roundFcfa((normalizedCapital * normalizedRate) / 100)
}

/** Calcule le total contractuel des commissions à partir de la commission mensuelle arrondie. */
export const calculateTotalCommissions = (
  capital: number,
  rate: number,
  periodMonths: number
): number => {
  const normalizedPeriod = toFiniteNumber(periodMonths, 'La durée')
  if (!Number.isInteger(normalizedPeriod) || normalizedPeriod < 0) {
    throw new Error('La durée doit être un nombre entier positif ou nul')
  }

  return roundFcfa(calculateMonthlyCommission(capital, rate) * normalizedPeriod)
}

/**
 * Additionne les montants de commissions, après normalisation FCFA. Lorsque
 * `statuses` est fourni, seules les commissions portant l'un de ces statuts
 * sont agrégées.
 */
export const sumCommissionAmounts = (
  commissions: CommissionAmount[],
  statuses?: CommissionStatus[]
): number => {
  const acceptedStatuses = statuses ? new Set(statuses) : null
  return roundFcfa(
    commissions.reduce((sum, commission) => {
      if (acceptedStatuses && !acceptedStatuses.has(commission.status)) return sum
      return sum + roundFcfa(commission.amount)
    }, 0)
  )
}

/**
 * Additionne uniquement les commissions effectivement payées. `paidAmount`
 * est prioritaire, avec repli sur `amount` pour les écritures historiques.
 */
export const sumPaidCommissionAmounts = (commissions: CommissionAmount[]): number =>
  roundFcfa(
    commissions.reduce((sum, commission) => {
      if (commission.status !== 'Paid') return sum
      return sum + roundFcfa(commission.paidAmount ?? commission.amount)
    }, 0)
  )
