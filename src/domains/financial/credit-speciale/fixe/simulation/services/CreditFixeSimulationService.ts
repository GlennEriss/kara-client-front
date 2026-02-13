import { customRound } from '@/utils/credit-speciale-calculations'
import type {
  FixedCustomSimulationInput,
  FixedMonthlyPaymentInput,
  FixedSimulationResult,
  FixedSimulationScheduleRow,
  FixedStandardSimulationInput,
} from '../entities/fixed-simulation.types'

const MAX_FIXED_DURATION = 14

export class CreditFixeSimulationService {
  private static instance: CreditFixeSimulationService

  private constructor() {}

  static getInstance(): CreditFixeSimulationService {
    if (!CreditFixeSimulationService.instance) {
      CreditFixeSimulationService.instance = new CreditFixeSimulationService()
    }

    return CreditFixeSimulationService.instance
  }

  calculateStandardSimulation(input: FixedStandardSimulationInput): FixedSimulationResult {
    const amount = Math.round(input.amount)
    const interestRate = input.interestRate
    const interestAmount = this.calculateInterestAmount(amount, interestRate)
    const totalAmount = amount + interestAmount

    const monthlyFloor = Math.floor(totalAmount / MAX_FIXED_DURATION)
    const schedule: FixedSimulationScheduleRow[] = []
    let cumulativePaid = 0

    for (let index = 0; index < MAX_FIXED_DURATION; index += 1) {
      const month = index + 1
      const date = this.getScheduleDate(input.firstPaymentDate, month)
      const isLastMonth = month === MAX_FIXED_DURATION
      const payment = isLastMonth ? totalAmount - cumulativePaid : monthlyFloor

      cumulativePaid += payment
      schedule.push({
        month,
        date,
        payment,
        cumulativePaid,
        remaining: Math.max(0, totalAmount - cumulativePaid),
      })
    }

    return {
      mode: 'STANDARD',
      maxDuration: MAX_FIXED_DURATION,
      isValid: true,
      summary: {
        amount,
        interestRate,
        interestAmount,
        totalAmount,
        firstPaymentDate: new Date(input.firstPaymentDate),
        duration: MAX_FIXED_DURATION,
        averageMonthlyPayment: customRound(totalAmount / MAX_FIXED_DURATION),
        totalPlanned: totalAmount,
        remaining: 0,
        excess: 0,
      },
      schedule,
    }
  }

  calculateCustomSimulation(input: FixedCustomSimulationInput): FixedSimulationResult {
    const amount = Math.round(input.amount)
    const interestRate = input.interestRate
    const interestAmount = this.calculateInterestAmount(amount, interestRate)
    const totalAmount = amount + interestAmount
    const requestedDuration = input.monthlyPayments.length
    const monthlyPayments = this.normalizeMonthlyPayments(input.monthlyPayments)

    const schedule: FixedSimulationScheduleRow[] = []
    let cumulativePaid = 0

    for (const paymentItem of monthlyPayments) {
      const payment = Math.max(0, Math.round(paymentItem.amount))
      cumulativePaid += payment

      schedule.push({
        month: paymentItem.month,
        date: this.getScheduleDate(input.firstPaymentDate, paymentItem.month),
        payment,
        cumulativePaid,
        remaining: Math.max(0, totalAmount - cumulativePaid),
      })
    }

    const duration = schedule.length
    const remaining = Math.max(0, totalAmount - cumulativePaid)
    const excess = Math.max(0, cumulativePaid - totalAmount)
    const durationValid = requestedDuration <= MAX_FIXED_DURATION
    const isValid = durationValid && remaining <= 0

    return {
      mode: 'CUSTOM',
      maxDuration: MAX_FIXED_DURATION,
      isValid,
      validationMessage: this.buildValidationMessage(durationValid, remaining),
      summary: {
        amount,
        interestRate,
        interestAmount,
        totalAmount,
        firstPaymentDate: new Date(input.firstPaymentDate),
        duration,
        averageMonthlyPayment: duration > 0 ? customRound(totalAmount / duration) : totalAmount,
        totalPlanned: cumulativePaid,
        remaining,
        excess,
      },
      schedule,
    }
  }

  private calculateInterestAmount(amount: number, interestRate: number): number {
    return Math.round(amount * (interestRate / 100))
  }

  private getScheduleDate(firstPaymentDate: Date, month: number): Date {
    const date = new Date(firstPaymentDate)
    date.setMonth(date.getMonth() + (month - 1))
    return date
  }

  private normalizeMonthlyPayments(monthlyPayments: FixedMonthlyPaymentInput[]): FixedMonthlyPaymentInput[] {
    return monthlyPayments
      .map((payment, index) => ({
        month: index + 1,
        amount: payment.amount,
      }))
      .slice(0, MAX_FIXED_DURATION)
  }

  private buildValidationMessage(durationValid: boolean, remaining: number): string | undefined {
    if (!durationValid) {
      return 'Le Crédit Fixe ne peut pas dépasser 14 mois.'
    }

    if (remaining > 0) {
      return `Il reste ${remaining.toLocaleString('fr-FR')} FCFA à planifier.`
    }

    return undefined
  }
}
