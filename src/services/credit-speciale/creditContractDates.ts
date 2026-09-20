/**
 * Fin théorique d'un contrat de crédit.
 *
 * Contrairement à la Caisse Spéciale, aucun champ `contractEndAt` n'est stocké
 * sur les contrats de crédit : la date doit être dérivée de l'échéancier.
 *
 * On reprend exactement la règle qui génère les mensualités dans
 * `CreditSpecialeService` — `addContractMonths(firstPaymentDate, i)` pour i de 0
 * à durée-1 — afin que la date affichée coïncide avec la dernière échéance
 * réellement créée, et non avec un « +durée mois » approximatif.
 */

import { addContractMonths } from '@/services/caisse/contractDates'

export interface CreditContractDatesInput {
  firstPaymentDate?: Date | string | null
  duration?: number | null
}

/** Date de la dernière mensualité, ou `null` si l'échéancier est inconnu. */
export function getCreditContractEndDate(contract: CreditContractDatesInput): Date | null {
  const duration = Number(contract?.duration ?? 0)
  if (!duration || duration <= 0) return null
  if (!contract.firstPaymentDate) return null

  const first = new Date(contract.firstPaymentDate)
  if (Number.isNaN(first.getTime())) return null
  first.setHours(0, 0, 0, 0)

  return addContractMonths(first, duration - 1)
}
