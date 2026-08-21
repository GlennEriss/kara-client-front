import type { ContractPayment } from '@/domains/financial/caisse-speciale/contrats/entities/contract.types'
import type {
  CaisseContract,
  ContractCI,
  CreditContract,
  CreditContractCycle,
  CreditPayment,
  PaymentCI,
} from '@/types/types'
import {
  buildCreditSpecialeHistory,
  getCreditContractCycles,
  getCreditPaymentCycleNumber,
  getCreditPaymentMonthNumber,
} from '@/utils/credit-speciale-history'
import {
  buildMemberFormSummary,
  resolveOutcome,
  type MemberFormEntry,
  type MemberFormProduct,
  type MemberFormSummary,
} from '../entities/member-form.types'

type DateLike = Date | string | number | { toDate?: () => Date } | null | undefined

export interface CaisseSpecialeFormSource {
  contract: CaisseContract & { id: string }
  payments: ContractPayment[]
}

export interface CaisseImprevueFormSource {
  contract: ContractCI
  payments: PaymentCI[]
}

export interface CreditFormSource {
  contract: CreditContract
  payments: CreditPayment[]
}

const CREDIT_PRODUCT: Record<CreditContract['creditType'], MemberFormProduct> = {
  SPECIALE: 'Crédit Spéciale',
  FIXE: 'Crédit Fixe',
  AIDE: 'Crédit Aide',
}

function toDate(value: DateLike): Date | null {
  if (value == null) return null
  if (typeof value === 'object' && !(value instanceof Date) && typeof value.toDate === 'function') {
    return toDate(value.toDate())
  }
  if (typeof value === 'string') {
    const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (dateOnly) {
      const [, year, month, day] = dateOnly
      return new Date(Number(year), Number(month) - 1, Number(day))
    }
  }
  const parsed = value instanceof Date ? new Date(value) : new Date(value as string | number)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function startOfDay(value: Date): Date {
  const day = new Date(value)
  day.setHours(0, 0, 0, 0)
  return day
}

function addDays(value: Date, days: number): Date {
  const result = new Date(value)
  result.setDate(result.getDate() + days)
  return result
}

function addMonths(value: Date, months: number): Date {
  const result = new Date(value)
  result.setMonth(result.getMonth() + months)
  return result
}

function latestDate(values: DateLike[]): Date | null {
  return values.reduce<Date | null>((latest, value) => {
    const date = toDate(value)
    if (!date) return latest
    return !latest || date.getTime() > latest.getTime() ? date : latest
  }, null)
}

function isHistorical(dueAt: Date, paidAt: Date | null, now: Date): boolean {
  // Une échéance payée aujourd'hui est déjà un résultat. Une échéance encore
  // impayée aujourd'hui ne le devient qu'à partir du lendemain.
  return paidAt !== null || startOfDay(dueAt).getTime() < startOfDay(now).getTime()
}

function createEntry(params: {
  key: string
  product: MemberFormProduct
  dueAt: Date
  paidAt: Date | null
  amount: number
  isExcused?: boolean
  now: Date
  contractId: string
  contractHref: string
  label: string
}): MemberFormEntry | null {
  if (!isHistorical(params.dueAt, params.paidAt, params.now) && !params.isExcused) return null
  if (params.isExcused && startOfDay(params.dueAt).getTime() >= startOfDay(params.now).getTime()) {
    return null
  }

  const result = resolveOutcome({
    dueAt: params.dueAt,
    paidAt: params.paidAt,
    isExcused: params.isExcused,
    now: params.now,
  })

  return {
    key: params.key,
    product: params.product,
    dueAt: params.dueAt,
    paidAt: params.paidAt,
    amount: Math.max(0, Number(params.amount) || 0),
    outcome: result.outcome,
    daysLate: result.daysLate,
    contractId: params.contractId,
    contractHref: params.contractHref,
    label: params.label,
  }
}

/** Transforme les échéances Firestore de Caisse Spéciale en résultats comparables. */
export function buildCaisseSpecialeEntries(
  sources: CaisseSpecialeFormSource[],
  now: Date = new Date(),
): MemberFormEntry[] {
  return sources.flatMap(({ contract, payments }) =>
    payments.flatMap((payment) => {
      const dueAt = toDate(payment.dueAt)
      if (!dueAt) return []

      const paidAt = payment.status === 'PAID'
        ? toDate(payment.paidAt) ?? latestDate((payment.contribs ?? []).map((item) => item.paidAt))
        : null
      const entry = createEntry({
        key: `cs-${contract.id}-${payment.id}`,
        product: 'Caisse Spéciale',
        dueAt,
        paidAt,
        amount: payment.amount ?? contract.monthlyAmount,
        now,
        contractId: contract.id,
        contractHref: `/caisse-speciale/contrats/${contract.id}`,
        label: `Échéance ${(payment.dueMonthIndex ?? 0) + 1}`,
      })
      return entry ? [entry] : []
    }),
  )
}

/** Reconstruit aussi les échéances CI sans document de paiement (donc impayées). */
export function buildCaisseImprevueEntries(
  sources: CaisseImprevueFormSource[],
  now: Date = new Date(),
): MemberFormEntry[] {
  return sources.flatMap(({ contract, payments }) => {
    const firstPaymentDate = toDate(contract.firstPaymentDate)
    const duration = Math.max(0, Number(contract.subscriptionCIDuration) || 0)
    if (!firstPaymentDate || duration === 0) return []

    const paymentsByMonth = new Map(payments.map((payment) => [payment.monthIndex, payment]))
    const entries: MemberFormEntry[] = []

    for (let monthIndex = 0; monthIndex < duration; monthIndex++) {
      const payment = paymentsByMonth.get(monthIndex)
      const target = Number(payment?.targetAmount ?? contract.subscriptionCIAmountPerMonth) || 0
      const accumulated = Number(payment?.accumulatedAmount) || 0
      const isPaid = payment?.status === 'PAID' || (target > 0 && accumulated >= target)
      const paidAt = isPaid
        ? latestDate((payment?.versements ?? []).map((item) => toDate(item.date) ?? item.createdAt))
        : null
      const dueAt = contract.paymentFrequency === 'DAILY'
        ? addDays(firstPaymentDate, monthIndex)
        : addMonths(firstPaymentDate, monthIndex)
      const entry = createEntry({
        key: `ci-${contract.id}-${monthIndex}`,
        product: 'Caisse Imprévue',
        dueAt,
        paidAt,
        amount: target,
        now,
        contractId: contract.id,
        contractHref: `/caisse-imprevue/contrats/${contract.id}`,
        label: `Échéance ${monthIndex + 1}`,
      })
      if (entry) entries.push(entry)
    }

    return entries
  })
}

function isMonthlyCreditPayment(payment: CreditPayment): boolean {
  return !payment.comment?.includes('Paiement de pénalités uniquement')
}

function paymentCompletionDate(payments: CreditPayment[], target: number): Date | null {
  const ordered = [...payments]
    .filter(isMonthlyCreditPayment)
    .sort((left, right) => left.paymentDate.getTime() - right.paymentDate.getTime())
  let total = 0

  for (const payment of ordered) {
    total += Math.max(0, Number(payment.amount) || 0)
    if (target <= 0 || total >= target) return toDate(payment.paymentDate)
  }

  return null
}

function cyclePayments(
  contract: CreditContract,
  cycle: CreditContractCycle,
  payments: CreditPayment[],
): CreditPayment[] {
  return payments.filter(
    (payment) =>
      isMonthlyCreditPayment(payment) &&
      getCreditPaymentCycleNumber(contract, payment) === cycle.cycleNumber,
  )
}

function buildSpecialCreditCycleEntries(params: {
  contract: CreditContract
  cycle: CreditContractCycle
  nextCycle?: CreditContractCycle
  payments: CreditPayment[]
  now: Date
}): MemberFormEntry[] {
  const { contract, cycle, nextCycle, now } = params
  const payments = cyclePayments(contract, cycle, params.payments)
  const cycleContract = {
    amount: cycle.amount,
    creditType: contract.creditType,
    createdAt: cycle.startedAt,
    creditCycles: undefined,
    firstPaymentDate: cycle.firstPaymentDate,
    fixedTransitionAt: cycle.fixedTransitionAt,
    fixedTransitionBy: cycle.fixedTransitionBy,
    fixedTransitionMode: cycle.fixedTransitionMode,
    fixedTransitionReason: cycle.fixedTransitionReason,
    fixedTransitionStartMonth: cycle.fixedTransitionStartMonth,
    guarantorRemunerationPercentage: contract.guarantorRemunerationPercentage,
    interestRate: cycle.interestRate,
    monthlyPaymentAmount: cycle.monthlyPaymentAmount,
    totalAmount: cycle.totalAmount,
    duration: cycle.duration,
    restMonths: cycle.restMonths ?? [],
  }
  const history = buildCreditSpecialeHistory(cycleContract, payments, { projectUntilZero: true })

  return history.flatMap((row) => {
    if (nextCycle && row.date.getTime() >= nextCycle.startedAt.getTime()) return []
    const paymentsForMonth = payments.filter(
      (payment) => getCreditPaymentMonthNumber(contract, payment) === row.month,
    )
    const paidAt = row.isRest ? null : paymentCompletionDate(paymentsForMonth, row.expectedPayment)
    const entry = createEntry({
      key: `credit-${contract.id}-c${cycle.cycleNumber}-m${row.month}`,
      product: CREDIT_PRODUCT[contract.creditType],
      dueAt: row.date,
      paidAt,
      amount: row.expectedPayment,
      isExcused: row.isRest,
      now,
      contractId: contract.id,
      contractHref: `/credit-speciale/contrats/${contract.id}`,
      label: cycle.cycleNumber > 1
        ? `Cycle ${cycle.cycleNumber} · Échéance ${row.month}`
        : `Échéance ${row.month}`,
    })
    return entry ? [entry] : []
  })
}

function buildSimpleCreditCycleEntries(params: {
  contract: CreditContract
  cycle: CreditContractCycle
  nextCycle?: CreditContractCycle
  payments: CreditPayment[]
  now: Date
}): MemberFormEntry[] {
  const { contract, cycle, nextCycle, now } = params
  const payments = cyclePayments(contract, cycle, params.payments)
  const product = CREDIT_PRODUCT[contract.creditType]
  const duration = Math.max(
    1,
    Number(cycle.duration) || 0,
    ...(cycle.customSchedule ?? []).map((item, index) => item.month || index + 1),
  )
  const totalAmount = Math.max(0, Math.round(Number(cycle.totalAmount) || 0))
  const plannedByMonth = new Map<number, number>()

  if (cycle.customSchedule?.length) {
    cycle.customSchedule.forEach((item, index) => {
      plannedByMonth.set(item.month || index + 1, Math.max(0, Math.round(item.amount)))
    })
  } else {
    const base = Math.floor(totalAmount / duration)
    for (let month = 1; month <= duration; month++) {
      plannedByMonth.set(month, month === duration ? totalAmount - base * (duration - 1) : base)
    }
  }

  const entries: MemberFormEntry[] = []
  for (let month = 1; month <= duration; month++) {
    const dueAt = addMonths(cycle.firstPaymentDate, month - 1)
    if (nextCycle && dueAt.getTime() >= nextCycle.startedAt.getTime()) continue
    const rest = (cycle.restMonths ?? []).some((item) => item.monthNumber === month)
    const target = rest ? 0 : plannedByMonth.get(month) ?? cycle.monthlyPaymentAmount
    const paymentsForMonth = payments.filter(
      (payment) => getCreditPaymentMonthNumber(contract, payment) === month,
    )
    const paidAt = rest ? null : paymentCompletionDate(paymentsForMonth, target)
    const href = contract.creditType === 'FIXE'
      ? `/credit-fixe/contrats/${contract.id}`
      : `/credit-aide/contrats/${contract.id}`
    const entry = createEntry({
      key: `credit-${contract.id}-c${cycle.cycleNumber}-m${month}`,
      product,
      dueAt,
      paidAt,
      amount: target,
      isExcused: rest,
      now,
      contractId: contract.id,
      contractHref: href,
      label: cycle.cycleNumber > 1
        ? `Cycle ${cycle.cycleNumber} · Échéance ${month}`
        : `Échéance ${month}`,
    })
    if (entry) entries.push(entry)
  }

  return entries
}

/** Construit la forme récente pour Crédit Spéciale, Fixe et Aide. */
export function buildCreditEntries(
  sources: CreditFormSource[],
  now: Date = new Date(),
): MemberFormEntry[] {
  return sources.flatMap(({ contract, payments }) => {
    const cycles = getCreditContractCycles(contract)
    return cycles.flatMap((cycle, index) => {
      const params = { contract, cycle, nextCycle: cycles[index + 1], payments, now }
      return contract.creditType === 'SPECIALE'
        ? buildSpecialCreditCycleEntries(params)
        : buildSimpleCreditCycleEntries(params)
    })
  })
}

export function buildCompleteMemberFormSummary(params: {
  memberId: string
  caisseSpeciale: CaisseSpecialeFormSource[]
  caisseImprevue: CaisseImprevueFormSource[]
  credits: CreditFormSource[]
  now?: Date
}): MemberFormSummary {
  const now = params.now ?? new Date()
  const entries = [
    ...buildCaisseSpecialeEntries(params.caisseSpeciale, now),
    ...buildCaisseImprevueEntries(params.caisseImprevue, now),
    ...buildCreditEntries(params.credits, now),
  ]

  return buildMemberFormSummary({ memberId: params.memberId, entries })
}
