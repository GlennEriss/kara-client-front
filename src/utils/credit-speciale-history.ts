import { CreditContract, CreditContractCycle, CreditPayment } from '@/types/types'
import { customRound } from './credit-speciale-calculations'
import { getLogicalMonthIndex, isRestMonth } from './credit-speciale-rest-months'

export const SPECIAL_CREDIT_MAX_LOGICAL_MONTHS = 7
export const SPECIAL_CREDIT_MAX_HISTORY_MONTHS = 60

export interface CreditSpecialeHistoryMonth {
  month: number
  logicalMonth: number
  date: Date
  phase: 'SPECIALE' | 'FIXE'
  isRest: boolean
  capitalStart: number
  commission: number
  interest: number
  amountDue: number
  expectedPayment: number
  actualPayment: number
  hasPaymentRecord: boolean
  paymentDate?: Date
  paymentTime?: string
  nextCapitalActual: number
  nextCapitalProjected: number
  status: 'PAID' | 'DUE' | 'FUTURE' | 'REST'
  restReason?: string
  restRecordedByName?: string
  restRecordedAt?: Date
}

export interface CreditSpecialeTimelineMonth extends CreditSpecialeHistoryMonth {
  cycleNumber: number
  cycleMonth: number
  cycleType: 'INITIAL' | 'AUGMENTATION'
  cycleTitle: string
  cycleStartedAt: Date
  key: string
}

interface BuildCreditSpecialeHistoryOptions {
  endMonth?: number
  maxMonths?: number
  projectUntilZero?: boolean
}

const isPenaltyOnlyPayment = (payment: CreditPayment): boolean =>
  payment.comment?.includes('Paiement de pénalités uniquement') ?? false

const isRecordedMonthlyPayment = (payment: CreditPayment): boolean =>
  payment.amount > 0 || payment.comment?.includes('Paiement de 0 FCFA') || !isPenaltyOnlyPayment(payment)

const toDateValue = (value: Date | string | undefined): Date => {
  if (value instanceof Date) return new Date(value)
  return value ? new Date(value) : new Date()
}

const parsePaymentId = (paymentId?: string): { cycleNumber?: number; monthNumber?: number } => {
  if (!paymentId) return {}

  const cycleMatch = paymentId.match(/^C(\d+)_M(\d+)_/)
  if (cycleMatch) {
    return {
      cycleNumber: parseInt(cycleMatch[1], 10),
      monthNumber: parseInt(cycleMatch[2], 10),
    }
  }

  const legacyMatch = paymentId.match(/^M(\d+)_/)
  if (legacyMatch) {
    return {
      cycleNumber: 1,
      monthNumber: parseInt(legacyMatch[1], 10),
    }
  }

  return {}
}

export function getCreditContractCycles(
  contract: Pick<
    CreditContract,
    | 'amount'
    | 'createdAt'
    | 'creditCycles'
    | 'customSchedule'
    | 'duration'
    | 'firstPaymentDate'
    | 'interestRate'
    | 'monthlyPaymentAmount'
    | 'restMonths'
    | 'totalAmount'
  >
): CreditContractCycle[] {
  if (contract.creditCycles && contract.creditCycles.length > 0) {
    return [...contract.creditCycles]
      .map((cycle, index) => ({
        ...cycle,
        cycleNumber: cycle.cycleNumber ?? index + 1,
        type: cycle.type ?? (index === 0 ? 'INITIAL' : 'AUGMENTATION'),
        firstPaymentDate: toDateValue(cycle.firstPaymentDate),
        startedAt: toDateValue(cycle.startedAt ?? cycle.firstPaymentDate),
      }))
      .sort((left, right) => left.cycleNumber - right.cycleNumber)
  }

  return [
    {
      cycleNumber: 1,
      type: 'INITIAL',
      amount: contract.amount,
      interestRate: contract.interestRate,
      monthlyPaymentAmount: contract.monthlyPaymentAmount,
      totalAmount: contract.totalAmount,
      duration: contract.duration,
      firstPaymentDate: toDateValue(contract.firstPaymentDate),
      startedAt: toDateValue(contract.createdAt ?? contract.firstPaymentDate),
      customSchedule: contract.customSchedule,
      restMonths: contract.restMonths ?? [],
    },
  ]
}

export function getCurrentCreditContractCycle(
  contract: Pick<
    CreditContract,
    | 'amount'
    | 'createdAt'
    | 'creditCycles'
    | 'customSchedule'
    | 'duration'
    | 'firstPaymentDate'
    | 'interestRate'
    | 'monthlyPaymentAmount'
    | 'restMonths'
    | 'totalAmount'
  >
): CreditContractCycle {
  const cycles = getCreditContractCycles(contract)
  return cycles[cycles.length - 1]
}

export function getCreditPaymentCycleNumber(
  contract: Pick<
    CreditContract,
    | 'amount'
    | 'createdAt'
    | 'creditCycles'
    | 'customSchedule'
    | 'duration'
    | 'extendedAt'
    | 'firstPaymentDate'
    | 'interestRate'
    | 'monthlyPaymentAmount'
    | 'rajoutEffectue'
    | 'restMonths'
    | 'totalAmount'
  >,
  payment: Pick<CreditPayment, 'id' | 'paymentDate'>
): number {
  const parsed = parsePaymentId(payment.id)
  if (parsed.cycleNumber) {
    return parsed.cycleNumber
  }

  const cycles = getCreditContractCycles(contract)
  if (cycles.length <= 1) {
    return 1
  }

  const paymentTime = new Date(payment.paymentDate).getTime()
  let matchedCycle = 1

  for (const cycle of cycles) {
    if (paymentTime >= new Date(cycle.startedAt).getTime()) {
      matchedCycle = cycle.cycleNumber
    }
  }

  return matchedCycle
}

export function getContractCalendarMonthFromDate(
  contract: Pick<CreditContract, 'firstPaymentDate'>,
  date: Date
): number {
  const firstDate = new Date(contract.firstPaymentDate)
  const currentDate = new Date(date)
  const monthsDiff =
    (currentDate.getFullYear() - firstDate.getFullYear()) * 12 +
    (currentDate.getMonth() - firstDate.getMonth())

  return Math.max(1, monthsDiff + 1)
}

export function getCreditPaymentMonthNumber(
  contract: Pick<
    CreditContract,
    | 'amount'
    | 'createdAt'
    | 'creditCycles'
    | 'customSchedule'
    | 'duration'
    | 'extendedAt'
    | 'firstPaymentDate'
    | 'interestRate'
    | 'monthlyPaymentAmount'
    | 'rajoutEffectue'
    | 'restMonths'
    | 'totalAmount'
  >,
  payment: Pick<CreditPayment, 'id' | 'paymentDate'>
): number {
  const parsed = parsePaymentId(payment.id)
  if (parsed.monthNumber) {
    return parsed.monthNumber
  }

  const cycleNumber = getCreditPaymentCycleNumber(contract, payment)
  const cycle = getCreditContractCycles(contract).find((entry) => entry.cycleNumber === cycleNumber)

  return getContractCalendarMonthFromDate(
    { firstPaymentDate: cycle?.firstPaymentDate ?? contract.firstPaymentDate },
    new Date(payment.paymentDate)
  )
}

export function buildCreditPaymentId(
  contract: Pick<
    CreditContract,
    | 'amount'
    | 'createdAt'
    | 'creditCycles'
    | 'customSchedule'
    | 'duration'
    | 'firstPaymentDate'
    | 'interestRate'
    | 'monthlyPaymentAmount'
    | 'restMonths'
    | 'totalAmount'
    | 'id'
  >,
  monthNumber: number
): string {
  const currentCycle = getCurrentCreditContractCycle(contract)
  if (currentCycle.cycleNumber > 1) {
    return `C${currentCycle.cycleNumber}_M${monthNumber}_${contract.id}`
  }

  return `M${monthNumber}_${contract.id}`
}

export function getCreditPaymentDisplayMonthLabel(
  contract: Pick<
    CreditContract,
    | 'amount'
    | 'createdAt'
    | 'creditCycles'
    | 'customSchedule'
    | 'duration'
    | 'extendedAt'
    | 'firstPaymentDate'
    | 'interestRate'
    | 'monthlyPaymentAmount'
    | 'rajoutEffectue'
    | 'restMonths'
    | 'totalAmount'
  >,
  payment: Pick<CreditPayment, 'id' | 'paymentDate'>
): string {
  const monthNumber = getCreditPaymentMonthNumber(contract, payment)
  const cycleNumber = getCreditPaymentCycleNumber(contract, payment)

  if (cycleNumber > 1) {
    return `Apres augmentation - M${monthNumber}`
  }

  return `M${monthNumber}`
}

export function getCreditPaymentsForCurrentCycle(
  contract: Pick<
    CreditContract,
    | 'amount'
    | 'createdAt'
    | 'creditCycles'
    | 'customSchedule'
    | 'duration'
    | 'extendedAt'
    | 'firstPaymentDate'
    | 'interestRate'
    | 'monthlyPaymentAmount'
    | 'rajoutEffectue'
    | 'restMonths'
    | 'totalAmount'
  >,
  payments: CreditPayment[]
): CreditPayment[] {
  const currentCycle = getCurrentCreditContractCycle(contract)
  return payments.filter((payment) => getCreditPaymentCycleNumber(contract, payment) === currentCycle.cycleNumber)
}

export function getCreditSpecialeLastRecordedMonth(
  contract: Pick<
    CreditContract,
    | 'amount'
    | 'createdAt'
    | 'creditCycles'
    | 'customSchedule'
    | 'duration'
    | 'extendedAt'
    | 'firstPaymentDate'
    | 'interestRate'
    | 'monthlyPaymentAmount'
    | 'rajoutEffectue'
    | 'restMonths'
    | 'totalAmount'
  >,
  payments: CreditPayment[]
): number {
  const paymentMonths = payments
    .filter(isRecordedMonthlyPayment)
    .map((payment) => getCreditPaymentMonthNumber(contract, payment))
  const restMonths = (contract.restMonths ?? []).map((restMonth) => restMonth.monthNumber)

  return Math.max(0, ...paymentMonths, ...restMonths)
}

export function buildCreditSpecialeHistory(
  contract: Pick<
    CreditContract,
    | 'amount'
    | 'creditType'
    | 'createdAt'
    | 'creditCycles'
    | 'firstPaymentDate'
    | 'guarantorRemunerationPercentage'
    | 'interestRate'
    | 'monthlyPaymentAmount'
    | 'totalAmount'
    | 'duration'
    | 'restMonths'
  >,
  payments: CreditPayment[],
  options: BuildCreditSpecialeHistoryOptions = {}
): CreditSpecialeHistoryMonth[] {
  if (contract.creditType !== 'SPECIALE') {
    return []
  }

  const firstDate = new Date(contract.firstPaymentDate)
  const monthlyRate = contract.interestRate / 100
  const guarantorRate = (contract.guarantorRemunerationPercentage ?? 0) / 100
  const restMonths = contract.restMonths ?? []
  const maxMonths = options.maxMonths ?? SPECIAL_CREDIT_MAX_HISTORY_MONTHS
  const projectUntilZero = options.projectUntilZero ?? true
  const lastRecordedMonth = getCreditSpecialeLastRecordedMonth(contract, payments)
  const minimumMonthCount = Math.max(1, options.endMonth ?? 0, lastRecordedMonth)

  const paymentTotalsByMonth = new Map<number, number>()
  const paymentRecordsByMonth = new Map<number, CreditPayment[]>()

  for (const payment of payments.filter(isRecordedMonthlyPayment)) {
    const month = getCreditPaymentMonthNumber(contract, payment)
    const existingAmount = paymentTotalsByMonth.get(month) ?? 0
    paymentTotalsByMonth.set(month, existingAmount + payment.amount)

    const records = paymentRecordsByMonth.get(month) ?? []
    records.push(payment)
    records.sort(
      (left, right) =>
        new Date(left.paymentDate).getTime() - new Date(right.paymentDate).getTime()
    )
    paymentRecordsByMonth.set(month, records)
  }

  const history: CreditSpecialeHistoryMonth[] = []
  let capital = customRound(contract.amount)
  let nextDueAssigned = false

  for (let month = 1; month <= maxMonths; month++) {
    if (capital <= 0 && month > minimumMonthCount) {
      break
    }

    const date = new Date(firstDate)
    date.setMonth(date.getMonth() + month - 1)

    const restEntry = restMonths.find((restMonth) => restMonth.monthNumber === month)
    const logicalMonth = getLogicalMonthIndex(month, restMonths)
    const isFixedPhase = logicalMonth > SPECIAL_CREDIT_MAX_LOGICAL_MONTHS
    const phase: CreditSpecialeHistoryMonth['phase'] = isFixedPhase ? 'FIXE' : 'SPECIALE'

    const capitalStart = customRound(capital)
    const interest = isFixedPhase ? 0 : customRound(capitalStart * monthlyRate)
    const commission = restEntry || isFixedPhase ? 0 : customRound(capitalStart * guarantorRate)
    const amountDue = customRound(capitalStart + interest)
    const expectedPayment = restEntry
      ? 0
      : Math.min(Math.max(customRound(contract.monthlyPaymentAmount), 0), amountDue)
    const actualPayment = paymentTotalsByMonth.get(month) ?? 0
    const monthPayments = paymentRecordsByMonth.get(month) ?? []
    const firstPayment = monthPayments[0]
    const hasPaymentRecord = paymentTotalsByMonth.has(month)

    let nextCapitalActual = capitalStart
    let nextCapitalProjected = capitalStart
    let status: CreditSpecialeHistoryMonth['status']

    if (restEntry) {
      status = 'REST'
    } else {
      nextCapitalActual = Math.max(0, customRound(amountDue - actualPayment))
      nextCapitalProjected = Math.max(0, customRound(amountDue - expectedPayment))

      if (hasPaymentRecord) {
        status = 'PAID'
      } else if (!nextDueAssigned) {
        status = 'DUE'
        nextDueAssigned = true
      } else {
        status = 'FUTURE'
      }
    }

    history.push({
      month,
      logicalMonth,
      date,
      phase,
      isRest: !!restEntry,
      capitalStart,
      commission,
      interest,
      amountDue,
      expectedPayment,
      actualPayment,
      hasPaymentRecord,
      paymentDate: firstPayment ? new Date(firstPayment.paymentDate) : undefined,
      paymentTime: firstPayment?.paymentTime,
      nextCapitalActual,
      nextCapitalProjected,
      status,
      restReason: restEntry?.reason,
      restRecordedByName: restEntry?.recordedByName,
      restRecordedAt: restEntry?.recordedAt,
    })

    if (restEntry) {
      capital = capitalStart
    } else if (month <= lastRecordedMonth) {
      capital = hasPaymentRecord ? nextCapitalActual : amountDue
    } else {
      capital = nextCapitalProjected
    }

    if (month >= minimumMonthCount && (!projectUntilZero || capital <= 0)) {
      break
    }
  }

  return history
}

export function getNextDueFromCreditSpecialeHistory(
  history: CreditSpecialeHistoryMonth[]
): CreditSpecialeHistoryMonth | undefined {
  return history.find((month) => month.status === 'DUE')
}

export function buildCreditSpecialeTimelineHistory(
  contract: Pick<
    CreditContract,
    | 'amount'
    | 'createdAt'
    | 'creditCycles'
    | 'creditType'
    | 'customSchedule'
    | 'duration'
    | 'extendedAt'
    | 'firstPaymentDate'
    | 'guarantorRemunerationPercentage'
    | 'interestRate'
    | 'monthlyPaymentAmount'
    | 'rajoutEffectue'
    | 'restMonths'
    | 'totalAmount'
  >,
  payments: CreditPayment[]
): CreditSpecialeTimelineMonth[] {
  const cycles = getCreditContractCycles(contract)
  const recordedPayments = payments.filter(isRecordedMonthlyPayment)

  return cycles.flatMap((cycle) => {
    const cyclePayments = recordedPayments.filter(
      (payment) => getCreditPaymentCycleNumber(contract, payment) === cycle.cycleNumber
    )
    const cycleContract = {
      amount: cycle.amount,
      creditType: contract.creditType,
      createdAt: cycle.startedAt,
      creditCycles: undefined,
      firstPaymentDate: cycle.firstPaymentDate,
      guarantorRemunerationPercentage: contract.guarantorRemunerationPercentage,
      interestRate: cycle.interestRate,
      monthlyPaymentAmount: cycle.monthlyPaymentAmount,
      totalAmount: cycle.totalAmount,
      duration: cycle.duration,
      restMonths: cycle.restMonths ?? [],
    }
    const lastRecordedMonth = getCreditSpecialeLastRecordedMonth(cycleContract, cyclePayments)
    const cycleHistory = buildCreditSpecialeHistory(cycleContract, cyclePayments, {
      endMonth: lastRecordedMonth,
      projectUntilZero: false,
    }).filter((row) => row.month <= lastRecordedMonth)

    const cycleTitle =
      cycle.cycleNumber === 1
        ? 'Cycle initial'
        : `Apres augmentation de credit - reprise a M1`

    return cycleHistory.map((row) => ({
      ...row,
      cycleNumber: cycle.cycleNumber,
      cycleMonth: row.month,
      cycleType: cycle.type,
      cycleTitle,
      cycleStartedAt: cycle.startedAt,
      key: `cycle-${cycle.cycleNumber}-month-${row.month}`,
    }))
  })
}
