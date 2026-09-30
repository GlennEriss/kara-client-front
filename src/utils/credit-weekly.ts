import type { CreditDurationUnit, StandardSimulation } from '@/types/types'
import { customRound } from './credit-speciale-calculations'

/**
 * Crédit spécial court terme : 1 à 3 semaines, une seule échéance.
 *
 * Règles (validées métier) :
 * - le taux saisi par l'admin s'applique une fois, sur toute la durée ;
 * - le membre rembourse capital + intérêts en une seule fois, à la date de fin ;
 * - en retard : pénalités (3 jours de tolérance), sans intérêts supplémentaires ;
 * - un paiement partiel laisse le reste dû sur la même échéance ;
 * - commission du garant : taux du garant × montant, une seule fois ;
 * - ni partie fixe, ni mois de repos, ni rajout.
 */

export const WEEKLY_CREDIT_MAX_WEEKS = 3

export const isWeeklyCredit = (contract?: { durationUnit?: CreditDurationUnit } | null): boolean =>
  contract?.durationUnit === 'WEEKS'

/** « 2 semaines », « 1 semaine », « 5 mois ». */
export const formatCreditDuration = (duration: number | undefined, unit?: CreditDurationUnit): string => {
  const value = Number(duration) || 0
  if (unit === 'WEEKS') return `${value} semaine${value > 1 ? 's' : ''}`
  return `${value} mois`
}

/** Date de l'échéance unique : date de début + N semaines. */
export const computeWeeklyDueDate = (startDate: Date, weeks: number): Date => {
  const due = new Date(startDate)
  due.setDate(due.getDate() + weeks * 7)
  return due
}

/** Date de début d'un crédit en semaines, déduite de son échéance unique. */
export const getWeeklyCreditStartDate = (dueDate: Date | string, weeks: number): Date => {
  const start = new Date(dueDate)
  start.setDate(start.getDate() - weeks * 7)
  return start
}

export const computeWeeklyCreditTotals = (amount: number, interestRate: number) => {
  const capital = customRound(amount)
  const interest = customRound(capital * (interestRate / 100))
  return { capital, interest, totalAmount: customRound(capital + interest) }
}

/** Simulation d'un crédit en semaines, au format des simulations standard. */
export const buildWeeklyCreditSimulation = (params: {
  amount: number
  interestRate: number
  weeks: number
  startDate: Date
}): StandardSimulation => {
  const weeks = Math.min(Math.max(1, Math.round(params.weeks)), WEEKLY_CREDIT_MAX_WEEKS)
  const { totalAmount } = computeWeeklyCreditTotals(params.amount, params.interestRate)
  return {
    amount: params.amount,
    interestRate: params.interestRate,
    // Une seule échéance : la « mensualité » est le montant total dû.
    monthlyPayment: totalAmount,
    firstPaymentDate: computeWeeklyDueDate(params.startDate, weeks),
    duration: weeks,
    durationUnit: 'WEEKS',
    totalAmount,
    isValid: params.amount > 0 && params.interestRate >= 0,
  }
}
