import { settingsActions } from './operations/settings'
import { contractActions } from './operations/contracts'
import { paymentActions } from './operations/payments'
import { demandActions } from './operations/demands'
import type { FinanceModule } from './actions'
export function financeActions(module: FinanceModule) {
  return [
    ...demandActions(module),
    ...paymentActions(module),
    ...contractActions(module),
    ...settingsActions(module),
  ].filter(
    (action) =>
      !['credit-fixe', 'caisse-aide'].includes(module) ||
      !['rest.create', 'guarantor.pay', 'guarantor.delete'].includes(action.id),
  )
}
