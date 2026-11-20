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
  ]
}
