import { describe, it, expect } from 'vitest'
import { financeActions } from '../registry'
describe('opérations propres aux crédits fixe et aide', () => {
  it.each(['credit-fixe', 'caisse-aide'] as const)(
    'ne propose pas les repos, rajouts, phase fixe et commissions du garant pour %s',
    (module) => {
      const actions = financeActions(module)
      expect(actions.some((a) => a.id === 'payment.create')).toBe(true)
      expect(
        actions.some((a) =>
          [
            'rest.create',
            'contract.rest',
            'contract.extend',
            'contract.fixed',
            'guarantor.pay',
            'guarantor.delete',
          ].includes(a.id),
        ),
      ).toBe(false)
      expect(actions.some((a) => a.id === 'contract.writeoff')).toBe(true)
    },
  )
  it.each([
    ['credit-fixe', 50, 14],
    ['caisse-aide', 5, 3],
  ] as const)(
    'applique les bornes du type %s au formulaire de conversion',
    (module, maxRate, maxMonths) => {
      const action = financeActions(module).find(
        (a) => a.id === 'demand.convert',
      )!
      const rate = action.fields.find((f) => f.key === 'interestRate')!,
        duration = action.fields.find((f) => f.key === 'duration')!
      expect(rate.schema.safeParse(maxRate).success).toBe(true)
      expect(rate.schema.safeParse(maxRate + 1).success).toBe(false)
      expect(duration.schema.safeParse(maxMonths + 1).success).toBe(false)
      expect(
        action.fields.some((f) => f.key === 'guarantorRemunerationPercentage'),
      ).toBe(false)
    },
  )
})
