/**
 * Calculs de dates d'un contrat Caisse Spéciale.
 *
 * Module volontairement pur (aucune dépendance Firebase) : il est importé
 * aussi bien par les mutations que par les exports PDF, qui ne doivent pas
 * embarquer `mutations.ts` dans leur bundle.
 */
import { addContractMonths } from '@/utils/contract-months'

// Réexporté pour que les appelants Caisse Spéciale n'aient qu'un import.
export { addContractMonths }

/** Une échéance journalière couvre 30 jours pleins. */
export const PERIOD_DAYS_JOURNALIER = 30

const isJournalier = (caisseType: string | null | undefined): boolean =>
  caisseType === 'JOURNALIERE' || caisseType === 'JOURNALIERE_CHARITABLE'

/**
 * Fin théorique d'un contrat.
 *
 * Journalier : `monthsPlanned` périodes de 30 jours, donc dernier jour de la
 * dernière période — c'est exactement le `dueAt` de la dernière échéance.
 * Autres types : `monthsPlanned` mois calendaires.
 */
export function computeContractEndAt(
  startAt: Date | null | undefined,
  monthsPlanned: number | null | undefined,
  caisseType: string | null | undefined
): Date | null {
  if (!startAt || !monthsPlanned) return null
  if (!isJournalier(caisseType)) return addContractMonths(new Date(startAt), monthsPlanned)
  const end = new Date(startAt)
  end.setDate(end.getDate() + monthsPlanned * PERIOD_DAYS_JOURNALIER - 1)
  return end
}

/**
 * Fin de contrat à afficher : la valeur stockée si elle existe, sinon un
 * recalcul. Les contrats créés avant que `contractEndAt` ne soit écrit à la
 * création n'ont ce champ qu'après leur premier versement ; sans ce repli, la
 * ligne « FIN CAISSE.S » des PDF sort à « - ».
 */
export function resolveContractEndAt(contract: {
  contractEndAt?: Date | null
  contractStartAt?: Date | null
  firstPaymentDate?: string | Date | null
  monthsPlanned?: number | null
  caisseType?: string | null
}): Date | null {
  if (contract?.contractEndAt) return contract.contractEndAt

  const rawStart = contract?.contractStartAt ?? contract?.firstPaymentDate
  if (!rawStart) return null
  // Les dates Firestore arrivent parfois en Timestamp plutôt qu'en Date.
  const start =
    typeof (rawStart as unknown as { toDate?: () => Date })?.toDate === 'function'
      ? (rawStart as unknown as { toDate: () => Date }).toDate()
      : new Date(rawStart)
  if (Number.isNaN(start.getTime())) return null

  return computeContractEndAt(start, contract.monthsPlanned, contract.caisseType)
}
