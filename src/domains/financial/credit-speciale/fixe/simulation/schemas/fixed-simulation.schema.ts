import { z } from 'zod'

interface FixedSimulationSchemaConfig {
  maxDuration?: number
  maxInterestRate?: number
  creditLabel?: string
}

export function buildFixedSimulationSchemas(config: FixedSimulationSchemaConfig = {}) {
  const maxDuration = config.maxDuration ?? 14
  const maxInterestRate = config.maxInterestRate ?? 50
  const creditLabel = config.creditLabel ?? 'fixe'

  const amountSchema = z
    .number()
    .min(1000, 'Le montant minimum est de 1 000 FCFA')
    .max(10000000, 'Le montant maximum est de 10 000 000 FCFA')

  const interestRateSchema = z
    .number()
    .min(0, "Le taux d'intérêt ne peut pas être négatif")
    .max(maxInterestRate, `Le taux d'intérêt ne peut pas dépasser ${maxInterestRate}%`)

  const standardSchema = z.object({
    amount: amountSchema,
    interestRate: interestRateSchema,
    firstPaymentDate: z.date(),
  })

  const customSchema = z
    .object({
      amount: amountSchema,
      interestRate: interestRateSchema,
      firstPaymentDate: z.date(),
      monthlyPayments: z
        .array(
          z.object({
            month: z.number().int().min(1, 'Le mois doit être au moins 1'),
            amount: z.number().min(0, 'Le montant ne peut pas être négatif'),
          })
        )
        .min(1, 'Au moins un mois est requis')
        .max(maxDuration, `Le crédit ${creditLabel} ne peut pas dépasser ${maxDuration} mois`),
    })
    .superRefine((data, ctx) => {
      const months = data.monthlyPayments.map((payment) => payment.month)
      for (let i = 0; i < months.length; i += 1) {
        if (months[i] !== i + 1) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Les mois doivent être consécutifs et commencer à 1',
            path: ['monthlyPayments'],
          })
          break
        }
      }
    })

  return {
    standardSchema,
    customSchema,
  }
}

const defaultSchemas = buildFixedSimulationSchemas()

export const fixedStandardSimulationSchema = defaultSchemas.standardSchema
export const fixedCustomSimulationSchema = defaultSchemas.customSchema

export type FixedStandardSimulationFormInput = z.infer<typeof fixedStandardSimulationSchema>
export type FixedCustomSimulationFormInput = z.infer<typeof fixedCustomSimulationSchema>
