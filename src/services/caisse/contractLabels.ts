/**
 * Libellés dérivés d'un contrat de Caisse Spéciale, partagés par les trois
 * vues de détail (Standard, Libre, Journalière).
 */

import { resolveContractEndAt } from './contractDates'
import { computeContractBonus } from './bonus'

/** Premier mois ouvrant droit au bonus (cf. `computeBonus` : index 3). */
export const BONUS_FIRST_MONTH = 4

type ContractLike = {
  contractStartAt?: Date | null
  contractEndAt?: Date | null
  firstPaymentDate?: string | Date | null
  monthsPlanned?: number | null
  currentMonthIndex?: number | null
  caisseType?: string | null
}

function toDate(value: unknown): Date | null {
  if (!value) return null
  const date =
    typeof (value as { toDate?: () => Date })?.toDate === 'function'
      ? (value as { toDate: () => Date }).toDate()
      : new Date(value as string | number | Date)
  return Number.isNaN(date.getTime()) ? null : date
}

/** « du 10/01/2026 au 09/01/2027 », ou `undefined` si une borne manque. */
export function formatContractPeriod(contract: ContractLike): string | undefined {
  const start = toDate(contract?.contractStartAt ?? contract?.firstPaymentDate)
  const end = resolveContractEndAt(contract)
  if (!start || !end) return undefined
  return `du ${start.toLocaleDateString('fr-FR')} au ${end.toLocaleDateString('fr-FR')}`
}

/**
 * Période sur laquelle le bonus court.
 *
 * Le mois retenu n'est pas le nombre d'échéances soldées mais
 * `min(mois écoulés depuis le premier versement, mois soldés)` — cf.
 * `computeContractBonus`. Payer douze mois d'avance ne donne pas le taux du
 * douzième mois, et cesser de payer fige le taux au lieu de le laisser monter.
 */
export function formatBonusPeriod(contract: ContractLike): string | undefined {
  const start = toDate(contract?.contractStartAt ?? contract?.firstPaymentDate)
  // Seul le mois retenu est lu ici : le taux, lui, dépend des paramètres actifs
  // qui ne sont pas disponibles côté libellé.
  const { monthCount } = computeContractBonus({
    contractStartAt: start,
    paidMonthsCount: contract?.currentMonthIndex ?? 0,
    totalPaid: 0,
  })

  const since = start ? ` depuis le ${start.toLocaleDateString('fr-FR')}` : ''
  const retained = `${monthCount} mois retenu${monthCount > 1 ? 's' : ''}${since}`

  // Le premier taux de la table est M4, appliqué le mois suivant : le bonus
  // n'apparaît donc qu'au 5ᵉ mois retenu.
  if (monthCount < BONUS_FIRST_MONTH + 1) {
    return `${retained} · bonus dès le mois ${BONUS_FIRST_MONTH + 1}`
  }
  return `${retained} · taux M${monthCount - 1}`
}
