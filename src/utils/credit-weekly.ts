import type { CreditDurationUnit, CreditRepaymentModel, CreditShopPurchase, ShopCreditPartner, StandardSimulation } from '@/types/types'
import { customRound } from './credit-speciale-calculations'

/**
 * Crédit spécial court terme : premier forfait de 1 à 3 semaines, puis
 * échéances hebdomadaires sur le solde non remboursé.
 *
 * Règles (validées métier) :
 * - le taux s'applique au premier forfait, puis au reste dû chaque semaine ;
 * - intérêts et commissions cessent un mois après le départ du calendrier ;
 * - les échéances suivantes remboursent le solde en partie fixe ;
 * - les pénalités gardent la tolérance de 3 jours et leur formule existante ;
 * - les paiements déjà enregistrés conservent leur période et leur identité.
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

/**
 * Achat à crédit en boutique partenaire : même principe que le crédit en
 * semaines (taux appliqué une fois), mais remboursé en 2 ou 3 mensualités
 * égales. Ni partie fixe, ni mois de repos, ni rajout.
 */
export const SHOP_CREDIT_INSTALLMENT_OPTIONS = [2, 3] as const
export const SHOP_CREDIT_MIN_INSTALLMENTS = 2
export const SHOP_CREDIT_MAX_INSTALLMENTS = 3

export const clampShopCreditInstallments = (value: number): number =>
  Math.min(Math.max(SHOP_CREDIT_MIN_INSTALLMENTS, Math.round(Number(value) || 0)), SHOP_CREDIT_MAX_INSTALLMENTS)

type FlatCreditLike = {
  durationUnit?: CreditDurationUnit
  repaymentModel?: CreditRepaymentModel
  duration?: number
  status?: string
} | null | undefined

/** Explicit flat purchases and historical weekly contracts already ended before
 * the recurring model. New/updated weekly contracts store DEGRESSIVE so their
 * history remains recurring after settlement. */
export const isFlatCredit = (contract?: FlatCreditLike): boolean =>
  isWeeklyCredit(contract)
    ? contract?.repaymentModel !== 'DEGRESSIVE' && ['DISCHARGED', 'CLOSED', 'WRITTEN_OFF'].includes(contract?.status || '')
    : contract?.repaymentModel === 'FLAT'

/** Nombre d'échéances d'un crédit à intérêts uniques (1 pour un crédit en semaines). */
export const getFlatInstallmentCount = (contract?: FlatCreditLike): number => {
  if (isWeeklyCredit(contract)) return 1
  return Math.max(1, Math.round(Number(contract?.duration) || 1))
}

/** Découpe un total en N mensualités égales ; la dernière absorbe l'arrondi. */
export const splitFlatInstallments = (total: number, count: number): number[] => {
  const n = Math.max(1, Math.round(count))
  const base = customRound(total / n)
  const amounts = Array.from({ length: n }, () => base)
  amounts[n - 1] = customRound(total - base * (n - 1))
  return amounts
}

/** Simulation d'un achat à crédit en boutique, au format des simulations standard. */
export const buildShopCreditSimulation = (params: {
  amount: number
  interestRate: number
  months: number
  firstPaymentDate: Date
}): StandardSimulation => {
  const months = clampShopCreditInstallments(params.months)
  const { totalAmount } = computeWeeklyCreditTotals(params.amount, params.interestRate)
  return {
    amount: params.amount,
    interestRate: params.interestRate,
    monthlyPayment: splitFlatInstallments(totalAmount, months)[0],
    firstPaymentDate: params.firstPaymentDate,
    duration: months,
    durationUnit: 'MONTHS',
    totalAmount,
    isValid: params.amount > 0 && params.interestRate >= 0,
  }
}

/**
 * Applique à un achat en boutique la remise de la convention en vigueur. Les
 * demandes saisies par les membres arrivent sans remise (la convention leur
 * est illisible) : c'est la convention qui fait foi pour le montant versé au
 * vendeur.
 */
export const applyShopPartnerTerms = (
  purchase: CreditShopPurchase,
  partner?: Pick<ShopCreditPartner, 'enabled' | 'discountPercent'> | null,
): CreditShopPurchase => {
  const discountPercent = partner?.enabled ? partner.discountPercent : purchase.discountPercent
  const vendorAmount = customRound(purchase.price - (purchase.price * discountPercent) / 100)
  return { ...purchase, discountPercent, vendorAmount }
}
