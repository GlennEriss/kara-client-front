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
import type { CreditContract, CreditContractStatus } from '@/types/types'
import { isCreditContractEnded } from '@/utils/credit-write-off'

export interface CreditContractDatesInput {
  firstPaymentDate?: Date | string | null
  duration?: number | null
  /** 'WEEKS' : l'échéance unique est la fin du contrat. */
  durationUnit?: 'MONTHS' | 'WEEKS'
  status?: CreditContractStatus
}

const validDate = (value: Date | string | null | undefined): Date | null => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/** Le rajout devient le départ courant, sans modifier la date initiale enregistrée. */
export function getCreditContractStartDates(
  contract: Partial<Pick<CreditContract, 'createdAt' | 'extendedAt' | 'creditCycles'>>
) {
  const cycles = [...(contract.creditCycles ?? [])].sort((left, right) => left.cycleNumber - right.cycleNumber)
  const initialStartDate = validDate(contract.createdAt) ?? validDate(cycles[0]?.startedAt)
  const currentCycle = cycles.at(-1)
  const extensionStartDate = currentCycle?.type === 'AUGMENTATION'
    ? validDate(currentCycle.startedAt) ?? validDate(contract.extendedAt)
    : validDate(contract.extendedAt)
  return {
    startDate: extensionStartDate ?? initialStartDate,
    initialStartDate,
    hasExtension: extensionStartDate !== null,
  }
}

/** Date de la dernière mensualité, ou `null` si l'échéancier est inconnu. */
export function getCreditContractEndDate(contract: CreditContractDatesInput): Date | null {
  const duration = Number(contract?.duration ?? 0)
  if (!duration || duration <= 0) return null
  if (!contract.firstPaymentDate) return null

  const first = new Date(contract.firstPaymentDate)
  if (Number.isNaN(first.getTime())) return null
  first.setHours(0, 0, 0, 0)

  // Crédit en semaines : une seule échéance, qui est la fin du contrat.
  if (contract.durationUnit === 'WEEKS') return first

  return addContractMonths(first, duration - 1)
}

/**
 * Mensualités prévues aujourd'hui ou à venir dans l'échéancier du cycle courant.
 * Ce compteur calendaire ne représente pas le nombre de mensualités impayées.
 */
export function getCreditContractRemainingMonths(
  contract: CreditContractDatesInput,
  today: Date = new Date()
): number | null {
  if (contract.durationUnit === 'WEEKS' || !getCreditContractEndDate(contract)) return null
  if (contract.status && isCreditContractEnded(contract.status)) return 0
  const currentDay = validDate(today)
  const first = validDate(contract.firstPaymentDate)
  if (!currentDay || !first) return null
  currentDay.setHours(0, 0, 0, 0)
  first.setHours(0, 0, 0, 0)
  let remaining = 0
  for (let index = 0; index < Number(contract.duration); index++) {
    if (addContractMonths(first, index) >= currentDay) remaining++
  }
  return remaining
}
