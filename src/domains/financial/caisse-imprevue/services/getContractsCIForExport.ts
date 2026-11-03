import type { ContractCIFilters } from '../entities/contract-filters.types'
import { applyContractListScope, type ContractListScope } from '../utils/contract-pagination'
import { CaisseImprevueContractsService } from './CaisseImprevueContractsService'

/** Un export complet conserve tous les filtres et remonte les erreurs de lecture. */
export async function getContractsCIForExport(filters: ContractCIFilters, scope: ContractListScope) {
  const contracts = await CaisseImprevueContractsService.getInstance().getContractsWithFilters(filters, { throwOnError: true })
  return applyContractListScope(contracts, scope)
}
