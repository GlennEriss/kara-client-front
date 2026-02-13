import { describe, expect, it } from 'vitest'
import { CreditFixeSimulationService } from '../../services/CreditFixeSimulationService'
import {
  fixedCustomSimulationSchema,
  fixedStandardSimulationSchema,
} from '../../schemas/fixed-simulation.schema'

describe('CreditFixeSimulationService', () => {
  const service = CreditFixeSimulationService.getInstance()

  it('calcule une simulation standard sur 14 echeances avec interet unique', () => {
    const result = service.calculateStandardSimulation({
      amount: 2_000_000,
      interestRate: 30,
      firstPaymentDate: new Date('2026-01-15'),
    })

    expect(result.mode).toBe('STANDARD')
    expect(result.summary.interestAmount).toBe(600_000)
    expect(result.summary.totalAmount).toBe(2_600_000)
    expect(result.summary.duration).toBe(14)
    expect(result.schedule).toHaveLength(14)

    const totalPlanned = result.schedule.reduce((sum, row) => sum + row.payment, 0)
    expect(totalPlanned).toBe(2_600_000)
    expect(result.schedule[13]?.payment).toBe(185_718)
  })

  it('retourne une simulation personnalisee invalide si le total planifie est incomplet', () => {
    const result = service.calculateCustomSimulation({
      amount: 2_000_000,
      interestRate: 30,
      firstPaymentDate: new Date('2026-01-15'),
      monthlyPayments: [
        { month: 1, amount: 300_000 },
        { month: 2, amount: 400_000 },
      ],
    })

    expect(result.mode).toBe('CUSTOM')
    expect(result.isValid).toBe(false)
    expect(result.summary.totalAmount).toBe(2_600_000)
    expect(result.summary.totalPlanned).toBe(700_000)
    expect(result.summary.remaining).toBe(1_900_000)
    expect(result.validationMessage).toContain('Il reste')
  })

  it('retourne une simulation invalide si la personnalisation depasse 14 mois', () => {
    const result = service.calculateCustomSimulation({
      amount: 1_000_000,
      interestRate: 10,
      firstPaymentDate: new Date('2026-01-15'),
      monthlyPayments: Array.from({ length: 15 }, (_, index) => ({
        month: index + 1,
        amount: 100_000,
      })),
    })

    expect(result.isValid).toBe(false)
    expect(result.schedule).toHaveLength(14)
    expect(result.validationMessage).toContain('14 mois')
  })
})

describe('fixed-simulation.schema', () => {
  it('accepte les taux fixes 0, 30 et 50', () => {
    const baseData = {
      amount: 1_000_000,
      firstPaymentDate: new Date('2026-01-15'),
    }

    expect(fixedStandardSimulationSchema.safeParse({ ...baseData, interestRate: 0 }).success).toBe(true)
    expect(fixedStandardSimulationSchema.safeParse({ ...baseData, interestRate: 30 }).success).toBe(true)
    expect(fixedStandardSimulationSchema.safeParse({ ...baseData, interestRate: 50 }).success).toBe(true)
  })

  it('rejette un taux > 50%', () => {
    const result = fixedStandardSimulationSchema.safeParse({
      amount: 1_000_000,
      interestRate: 50.01,
      firstPaymentDate: new Date('2026-01-15'),
    })

    expect(result.success).toBe(false)
  })

  it('rejette une simulation personnalisee au-dela de 14 mois', () => {
    const result = fixedCustomSimulationSchema.safeParse({
      amount: 1_000_000,
      interestRate: 10,
      firstPaymentDate: new Date('2026-01-15'),
      monthlyPayments: Array.from({ length: 15 }, (_, index) => ({
        month: index + 1,
        amount: 100_000,
      })),
    })

    expect(result.success).toBe(false)
  })
})
