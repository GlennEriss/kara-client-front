import { startOfDay } from 'date-fns'
import type { CreditContract, CreditInstallment, CreditPayment } from '@/types/types'
import { buildSimpleCreditSchedule } from './credit-losses'
import { buildCreditSpecialeHistory, getCreditPaymentsForCurrentCycle } from './credit-speciale-history'

interface ScheduleRow {
  month: number
  date: Date
  interest: number
  amount: number
  paidAmount: number
  isPaid: boolean
}

/**
 * Échéances d'un contrat, calculées comme sur sa fiche (versements réels puis
 * échéances prévues) : l'application n'enregistre pas d'échéances en base.
 * Crédit spécial : un versement, même partiel, honore le mois.
 */
function buildContractScheduleRows(contract: CreditContract, payments: CreditPayment[]): ScheduleRow[] {
  const cyclePayments = getCreditPaymentsForCurrentCycle(contract, payments)

  if (contract.creditType === 'SPECIALE') {
    return buildCreditSpecialeHistory(contract, cyclePayments, { projectUntilZero: true })
      .filter((row) => !row.isRest)
      .map((row) => ({
        month: row.month,
        date: row.date,
        interest: row.interest,
        amount: row.hasPaymentRecord ? Math.max(row.expectedPayment, row.actualPayment) : row.expectedPayment,
        paidAmount: row.actualPayment,
        isPaid: row.hasPaymentRecord,
      }))
  }

  return buildSimpleCreditSchedule(contract, cyclePayments).map((row) => ({
    month: row.month,
    date: row.date,
    interest: row.interest,
    amount: row.payment,
    paidAmount: row.paidAmount ?? 0,
    isPaid: row.status === 'PAID',
  }))
}

function toInstallment(contract: CreditContract, row: ScheduleRow, today: Date): CreditInstallment {
  const remainingAmount = row.isPaid ? 0 : Math.max(0, row.amount - row.paidAmount)
  const status: CreditInstallment['status'] = row.isPaid
    ? 'PAID'
    : startOfDay(row.date) < startOfDay(today)
      ? 'OVERDUE'
      : 'DUE'
  return {
    id: `${contract.id}-M${row.month}`,
    creditId: contract.id,
    installmentNumber: row.month,
    dueDate: row.date,
    principalAmount: Math.max(0, row.amount - row.interest),
    interestAmount: row.interest,
    totalAmount: row.amount,
    paidAmount: row.paidAmount,
    remainingAmount,
    status,
    createdAt: contract.createdAt,
    updatedAt: contract.updatedAt,
    createdBy: contract.createdBy,
  }
}

/**
 * Échéances (hors mois de repos) d'un contrat de crédit, au format
 * CreditInstallment, pour le calendrier et la liste des retards.
 */
export function computeCreditInstallments(
  contract: CreditContract,
  payments: CreditPayment[],
  today: Date = new Date(),
): CreditInstallment[] {
  return buildContractScheduleRows(contract, payments).map((row) => toInstallment(contract, row, today))
}
