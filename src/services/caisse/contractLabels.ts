/**
 * Libellés dérivés d'un contrat de Caisse Spéciale, partagés par les trois
 * vues de détail (Standard, Libre, Journalière).
 */

import { resolveContractEndAt } from './contractDates'
import { computeContractBonus, countOnTimeMonthsBeforeFirstUnpaid, sumContractPenalties } from './bonus'

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
 * Le mois retenu est `min(mois complets écoulés depuis le premier versement,
 * mois soldés)` — cf. `computeContractBonus` — et son taux s'applique : après
 * 12 mois complets, le taux M12. Payer douze mois d'avance ne donne pas le taux
 * du douzième mois, et cesser de payer fige le taux.
 */
export function formatBonusPeriod(contract: ContractLike, payments?: Parameters<typeof countOnTimeMonthsBeforeFirstUnpaid>[0]): string | undefined {
  const start = toDate(contract?.contractStartAt ?? contract?.firstPaymentDate)
  // Seul le mois retenu est lu ici : le taux, lui, dépend des paramètres actifs
  // qui ne sont pas disponibles côté libellé.
  const onTimeMonthsCount = payments ? countOnTimeMonthsBeforeFirstUnpaid(payments) : undefined
  const { monthCount } = computeContractBonus({
    contractStartAt: start,
    paidMonthsCount: contract?.currentMonthIndex ?? 0,
    totalPaid: 0,
    onTimeMonthsCount,
  })
  const paidCount = contract?.currentMonthIndex ?? 0
  const frozen = onTimeMonthsCount !== undefined && onTimeMonthsCount < paidCount

  const since = start ? ` depuis le ${start.toLocaleDateString('fr-FR')}` : ''
  const retained = `${monthCount} mois complet${monthCount > 1 ? 's' : ''} retenu${monthCount > 1 ? 's' : ''}${since}`

  // Le premier taux de la table est M4 : le bonus court dès 4 mois complets.
  // Impayé : le bonus est figé au dernier mois payé à l'heure.
  const frozenNote = frozen ? ` (figé au dernier mois payé à l'heure, M${onTimeMonthsCount})` : ''
  if (monthCount < BONUS_FIRST_MONTH) {
    return frozen ? `${retained}${frozenNote} · pas de bonus` : `${retained} · bonus dès ${BONUS_FIRST_MONTH} mois complets`
  }
  return `${retained}${frozenNote} · taux M${monthCount}`
}

/**
 * Bonus affiché sur la fiche : même calcul que le remboursement final
 * (total versé × taux du mois complet retenu, barème actif), et non le cumul
 * enregistré versement par versement, qui reste à 0 pour une caisse Libre
 * payée en une fois par mois.
 */
export function contractBonusSummary(
  contract: ContractLike & { nominalPaid?: number | null },
  settings?: Parameters<typeof computeContractBonus>[0]['settings'],
  payments?: Parameters<typeof countOnTimeMonthsBeforeFirstUnpaid>[0],
): { amount: number; subtitle?: string } {
  const start = toDate(contract?.contractStartAt ?? contract?.firstPaymentDate)
  const { amount, ratePercent, rateLabel, grossAmount, penaltiesDeducted } = computeContractBonus({
    contractStartAt: start,
    paidMonthsCount: contract?.currentMonthIndex ?? 0,
    totalPaid: contract?.nominalPaid ?? 0,
    settings,
    onTimeMonthsCount: payments ? countOnTimeMonthsBeforeFirstUnpaid(payments) : undefined,
    penaltiesTotal: payments ? sumContractPenalties(payments as never) : 0,
  })
  const period = formatBonusPeriod(contract, payments)
  const rate = ratePercent > 0 && rateLabel && period ? `${period} : ${ratePercent} %` : period
  const subtitle =
    penaltiesDeducted > 0 && rate
      ? `${rate} · ${grossAmount.toLocaleString('fr-FR')} FCFA moins ${penaltiesDeducted.toLocaleString('fr-FR')} FCFA de pénalités`
      : rate
  return { amount, subtitle }
}
