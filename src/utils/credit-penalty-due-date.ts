import type { CreditContract, CreditPayment } from '@/types/types'
import { getCreditPeriodDueDate } from './credit-periods'
import { getCreditPaymentMonthNumber } from './credit-speciale-history'
import { LATE_TOLERANCE_DAYS } from './credit-payment-punctuality'

/**
 * Échéance glissante des pénalités (crédit spécial en mois) : un retard
 * pénalisable reste acquis. Le décalage ne commence ou n'augmente qu'à partir
 * du 4e jour de retard par rapport à la référence en vigueur. Si un mois a
 * été versé avec 9 jours de retard pénalisable, les mois suivants sont attendus
 * 9 jours après leur date prévue. Payer en avance ne réduit pas le décalage et
 * n'avance jamais une échéance. Les dates affichées dans l'échéancier ne
 * changent pas : cette date ne sert qu'à compter les jours de retard.
 */

const MS_PER_DAY = 1000 * 60 * 60 * 24

const startOfDay = (value: Date | string): Date => {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}

const daysBetween = (from: Date | string, to: Date | string): number =>
  Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / MS_PER_DAY)

/** Date à partir de laquelle on compte les jours de retard : date prévue + retard déjà toléré. */
export function getPenaltyReferenceDate(plannedDueDate: Date | string, toleratedDays = 0): Date {
  const reference = startOfDay(plannedDueDate)
  reference.setDate(reference.getDate() + Math.max(0, toleratedDays))
  return reference
}

/** Premier versement réel (> 0 FCFA) d'un mois : une déclaration à 0 FCFA ne décale rien. */
export function getMonthFirstPaymentDate(
  contract: Parameters<typeof getCreditPaymentMonthNumber>[0],
  payments: CreditPayment[],
  month: number
): Date | undefined {
  const dates = payments
    .filter((payment) => payment.amount > 0 && getCreditPaymentMonthNumber(contract, payment) === month)
    .map((payment) => new Date(payment.paymentDate))
    .sort((left, right) => left.getTime() - right.getTime())
  return dates[0]
}

/** Date de référence d'un mois : seuls les retards pénalisables font évoluer le décalage. */
export function getMonthPenaltyReferenceDate(
  cycleContract: Parameters<typeof getCreditPaymentMonthNumber>[0] & Pick<CreditContract, 'firstPaymentDate'>,
  cyclePayments: CreditPayment[],
  month: number
): Date {
  let toleratedDays = 0
  for (let previousMonth = 1; previousMonth < month; previousMonth++) {
    const paymentDate = getMonthFirstPaymentDate(cycleContract, cyclePayments, previousMonth)
    if (!paymentDate) continue
    const plannedDueDate = getCreditPeriodDueDate(cycleContract, previousMonth)
    const referenceDate = getPenaltyReferenceDate(plannedDueDate, toleratedDays)
    if (daysBetween(referenceDate, paymentDate) > LATE_TOLERANCE_DAYS) {
      toleratedDays = daysBetween(plannedDueDate, paymentDate)
    }
  }
  return getPenaltyReferenceDate(getCreditPeriodDueDate(cycleContract, month), toleratedDays)
}
