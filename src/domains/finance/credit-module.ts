import type { FinanceModule } from './actions'
export type NativeCreditModule =
  'credit-speciale' | 'credit-fixe' | 'caisse-aide'
export const isCreditModule = (module: string): module is NativeCreditModule =>
  ['credit-speciale', 'credit-fixe', 'caisse-aide'].includes(module)
export const creditTypeForModule = (module: FinanceModule) =>
  module === 'credit-fixe'
    ? ('FIXE' as const)
    : module === 'caisse-aide'
      ? ('AIDE' as const)
      : ('SPECIALE' as const)
