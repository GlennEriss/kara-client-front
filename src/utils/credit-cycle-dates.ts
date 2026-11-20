import type { CreditContractCycle } from '@/types/types'
import { addContractMonths } from './contract-months'
import { getWeeklyCreditStartDate, WEEKLY_CREDIT_MAX_WEEKS } from './credit-weekly'

type DateInput = Date | string | null | undefined

export function validCreditDate(value: DateInput): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/** Départ effectif d'un rajout : première échéance du nouveau cycle moins un mois. */
export function getCreditExtensionStartDate(
  firstPaymentDate: DateInput,
): Date | null {
  const first = validCreditDate(firstPaymentDate)
  return first ? addContractMonths(first, -1) : null
}

/** Le calendrier peut démarrer à une date différente de la remise réelle des fonds. */
export function getCreditInitialStartDate(contract: {
  disbursementDate?: DateInput
  initialStartAt?: DateInput
  createdAt?: DateInput
  firstPaymentDate?: DateInput
  duration?: number
  durationUnit?: 'MONTHS' | 'WEEKS'
  creditCycles?: readonly Pick<
    CreditContractCycle,
    'cycleNumber' | 'type' | 'startedAt'
  >[]
}): Date | null {
  // Le forfait hebdomadaire et ses échéances partagent le même départ.
  // La remise réelle peut avoir eu lieu un autre jour et reste conservée.
  const first = validCreditDate(contract.firstPaymentDate)
  if (contract.durationUnit === 'WEEKS' && first) {
    const weeks = Math.min(WEEKLY_CREDIT_MAX_WEEKS, Math.max(1, contract.duration || 1))
    return getWeeklyCreditStartDate(first, weeks)
  }
  const initialCycle = [...(contract.creditCycles ?? [])]
    .sort((a, b) => a.cycleNumber - b.cycleNumber)
    .find((cycle) => cycle.type === 'INITIAL' || cycle.cycleNumber === 1)
  return (
    validCreditDate(contract.initialStartAt) ??
    validCreditDate(contract.disbursementDate) ??
    validCreditDate(initialCycle?.startedAt) ??
    validCreditDate(contract.createdAt)
  )
}
