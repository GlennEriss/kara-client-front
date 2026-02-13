import { z } from 'zod'

const fixedAmountSchema = z
  .number()
  .min(1000, 'Le montant minimum est de 1 000 FCFA')
  .max(10000000, 'Le montant maximum est de 10 000 000 FCFA')

const fixedInterestRateSchema = z
  .number()
  .min(0, "Le taux d'intérêt ne peut pas être négatif")
  .max(50, "Le taux d'intérêt ne peut pas dépasser 50%")

export const fixedStandardSimulationSchema = z.object({
  amount: fixedAmountSchema,
  interestRate: fixedInterestRateSchema,
  firstPaymentDate: z.date(),
})

export const fixedCustomSimulationSchema = z
  .object({
    amount: fixedAmountSchema,
    interestRate: fixedInterestRateSchema,
    firstPaymentDate: z.date(),
    monthlyPayments: z
      .array(
        z.object({
          month: z.number().int().min(1, 'Le mois doit être au moins 1'),
          amount: z.number().min(0, 'Le montant ne peut pas être négatif'),
        })
      )
      .min(1, 'Au moins un mois est requis')
      .max(14, 'Le Crédit Fixe ne peut pas dépasser 14 mois'),
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

export type FixedStandardSimulationFormInput = z.infer<typeof fixedStandardSimulationSchema>
export type FixedCustomSimulationFormInput = z.infer<typeof fixedCustomSimulationSchema>
