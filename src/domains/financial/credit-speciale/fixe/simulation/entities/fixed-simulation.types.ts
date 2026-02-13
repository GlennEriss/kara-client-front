export type FixedSimulationMode = 'STANDARD' | 'CUSTOM'

export interface FixedMonthlyPaymentInput {
  month: number
  amount: number
}

export interface FixedSimulationBaseInput {
  amount: number
  interestRate: number
  firstPaymentDate: Date
}

export interface FixedStandardSimulationInput extends FixedSimulationBaseInput {}

export interface FixedCustomSimulationInput extends FixedSimulationBaseInput {
  monthlyPayments: FixedMonthlyPaymentInput[]
}

export interface FixedSimulationScheduleRow {
  month: number
  date: Date
  payment: number
  cumulativePaid: number
  remaining: number
}

export interface FixedSimulationSummary {
  amount: number
  interestRate: number
  interestAmount: number
  totalAmount: number
  firstPaymentDate: Date
  duration: number
  averageMonthlyPayment: number
  totalPlanned: number
  remaining: number
  excess: number
}

export interface FixedSimulationResult {
  mode: FixedSimulationMode
  maxDuration: number
  isValid: boolean
  validationMessage?: string
  summary: FixedSimulationSummary
  schedule: FixedSimulationScheduleRow[]
}
