import { CreditContract, CreditPayment } from '@/types/types'
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

interface BuildCreditSpecialeHistoryOptions {
  endMonth?: number
  maxMonths?: number
  projectUntilZero?: boolean
}

const isPenaltyOnlyPayment = (payment: CreditPayment): boolean =>
  payment.comment?.includes('Paiement de pénalités uniquement') ?? false

const isRecordedMonthlyPayment = (payment: CreditPayment): boolean =>
  payment.amount > 0 || payment.comment?.includes('Paiement de 0 FCFA') || !isPenaltyOnlyPayment(payment)

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
  contract: Pick<CreditContract, 'firstPaymentDate'>,
  payment: Pick<CreditPayment, 'id' | 'paymentDate'>
): number {
  if (payment.id) {
    const match = payment.id.match(/^M(\d+)_/)
    if (match) {
      return parseInt(match[1], 10)
    }
  }

  return getContractCalendarMonthFromDate(contract, new Date(payment.paymentDate))
}

export function getCreditSpecialeLastRecordedMonth(
  contract: Pick<CreditContract, 'firstPaymentDate' | 'restMonths'>,
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
    | 'firstPaymentDate'
    | 'guarantorRemunerationPercentage'
    | 'interestRate'
    | 'monthlyPaymentAmount'
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
