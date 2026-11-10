import type { CreditContractCycle } from '@/types/types'
import { addContractMonths } from './contract-months'

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
  creditCycles?: readonly Pick<
    CreditContractCycle,
    'cycleNumber' | 'type' | 'startedAt'
  >[]
}): Date | null {
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
