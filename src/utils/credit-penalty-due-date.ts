import type { CreditContract, CreditPayment } from '@/types/types'
import { addContractMonths } from './contract-months'
import { getCreditPaymentMonthNumber } from './credit-speciale-history'

/**
 * Échéance glissante des pénalités (crédit spécial en mois) : un retard déjà
 * constaté reste acquis. Si un mois a été versé avec 9 jours de retard, les
 * mois suivants sont attendus 9 jours après leur date prévue ; seul un retard
 * plus grand augmente ce décalage. Payer en avance ne le réduit pas et
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

/** Date de référence d'un mois d'un cycle : le plus grand retard des mois précédents reste toléré. */
export function getMonthPenaltyReferenceDate(
  cycleContract: Parameters<typeof getCreditPaymentMonthNumber>[0] & Pick<CreditContract, 'firstPaymentDate'>,
  cyclePayments: CreditPayment[],
  month: number
): Date {
  const firstDueDate = new Date(cycleContract.firstPaymentDate)
  let toleratedDays = 0
  for (let previousMonth = 1; previousMonth < month; previousMonth++) {
    const paymentDate = getMonthFirstPaymentDate(cycleContract, cyclePayments, previousMonth)
    if (!paymentDate) continue
    const plannedDueDate = addContractMonths(firstDueDate, previousMonth - 1)
    toleratedDays = Math.max(toleratedDays, daysBetween(plannedDueDate, paymentDate))
  }
  return getPenaltyReferenceDate(addContractMonths(firstDueDate, month - 1), toleratedDays)
}
