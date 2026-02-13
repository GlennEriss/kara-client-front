import { customRound } from '@/utils/credit-speciale-calculations'
import type {
  FixedCustomSimulationInput,
  FixedMonthlyPaymentInput,
  FixedSimulationOptions,
  FixedSimulationResult,
  FixedSimulationScheduleRow,
  FixedStandardSimulationInput,
} from '../entities/fixed-simulation.types'

const MAX_FIXED_DURATION = 14
const MAX_FIXED_INTEREST_RATE = 50

export class CreditFixeSimulationService {
  private static instance: CreditFixeSimulationService

  private constructor() {}

  static getInstance(): CreditFixeSimulationService {
    if (!CreditFixeSimulationService.instance) {
      CreditFixeSimulationService.instance = new CreditFixeSimulationService()
    }

    return CreditFixeSimulationService.instance
  }

  calculateStandardSimulation(
    input: FixedStandardSimulationInput,
    options?: FixedSimulationOptions
  ): FixedSimulationResult {
    const config = this.getConfig(options)
    const amount = Math.round(input.amount)
    const interestRate = input.interestRate
    if (interestRate > config.maxInterestRate) {
      throw new Error(`Le taux du crédit ${config.creditLabel} ne peut pas dépasser ${config.maxInterestRate}%`)
    }
    const interestAmount = this.calculateInterestAmount(amount, interestRate)
    const totalAmount = amount + interestAmount

    const monthlyFloor = Math.floor(totalAmount / config.maxDuration)
    const schedule: FixedSimulationScheduleRow[] = []
    let cumulativePaid = 0

    for (let index = 0; index < config.maxDuration; index += 1) {
      const month = index + 1
      const date = this.getScheduleDate(input.firstPaymentDate, month)
      const isLastMonth = month === config.maxDuration
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
      maxDuration: config.maxDuration,
      isValid: true,
      summary: {
        amount,
        interestRate,
        interestAmount,
        totalAmount,
        firstPaymentDate: new Date(input.firstPaymentDate),
        duration: config.maxDuration,
        averageMonthlyPayment: customRound(totalAmount / config.maxDuration),
        totalPlanned: totalAmount,
        remaining: 0,
        excess: 0,
      },
      schedule,
    }
  }

  calculateCustomSimulation(
    input: FixedCustomSimulationInput,
    options?: FixedSimulationOptions
  ): FixedSimulationResult {
    const config = this.getConfig(options)
    const amount = Math.round(input.amount)
    const interestRate = input.interestRate
    if (interestRate > config.maxInterestRate) {
      throw new Error(`Le taux du crédit ${config.creditLabel} ne peut pas dépasser ${config.maxInterestRate}%`)
    }
    const interestAmount = this.calculateInterestAmount(amount, interestRate)
    const totalAmount = amount + interestAmount
    const requestedDuration = input.monthlyPayments.length
    const monthlyPayments = this.normalizeMonthlyPayments(input.monthlyPayments, config.maxDuration)

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
    const durationValid = requestedDuration <= config.maxDuration
    const isValid = durationValid && remaining <= 0

    return {
      mode: 'CUSTOM',
      maxDuration: config.maxDuration,
      isValid,
      validationMessage: this.buildValidationMessage(durationValid, remaining, config),
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

  private normalizeMonthlyPayments(
    monthlyPayments: FixedMonthlyPaymentInput[],
    maxDuration: number
  ): FixedMonthlyPaymentInput[] {
    return monthlyPayments
      .map((payment, index) => ({
        month: index + 1,
        amount: payment.amount,
      }))
      .slice(0, maxDuration)
  }

  private buildValidationMessage(
    durationValid: boolean,
    remaining: number,
    config: { maxDuration: number; creditLabel: string }
  ): string | undefined {
    if (!durationValid) {
      return `Le crédit ${config.creditLabel} ne peut pas dépasser ${config.maxDuration} mois.`
    }

    if (remaining > 0) {
      return `Il reste ${remaining.toLocaleString('fr-FR')} FCFA à planifier.`
    }

    return undefined
  }

  private getConfig(options?: FixedSimulationOptions): {
    maxDuration: number
    maxInterestRate: number
    creditLabel: string
  } {
    return {
      maxDuration: options?.maxDuration ?? MAX_FIXED_DURATION,
      maxInterestRate: options?.maxInterestRate ?? MAX_FIXED_INTEREST_RATE,
      creditLabel: options?.creditLabel ?? 'fixe',
    }
  }
}
