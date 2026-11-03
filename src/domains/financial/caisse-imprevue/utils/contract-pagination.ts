import type { ContractCI } from '@/types/types'
import type { ContractCIFilters } from '../entities/contract-filters.types'

export type ContractListScope = 'all' | 'open' | 'closed'
export interface ContractCIPage {
  items: ContractCI[]
  total: number
  nextCursor: string | null
}

/** Les filtres calculés gardent leur parcours complet : aucun filtre après un limit Firestore. */
export function canPaginateContractsCI(filters: ContractCIFilters, scope: ContractListScope): boolean {
  const serverKeys = new Set(['status', 'paymentFrequency', 'subscriptionCIID', 'createdAtFrom', 'createdAtTo'])
  const hasDerivedFilter = Object.entries(filters).some(([key, value]) =>
    !serverKeys.has(key) && value !== undefined && value !== null && value !== '' && value !== false && value !== 'all',
  )
  // Le parcours historique « ouverts » inclut aussi d'éventuels statuts manquants.
  // Une requête not-in les exclurait : ce cas reste donc sur le parcours complet.
  return !hasDerivedFilter && (scope !== 'open' || (!!filters.status && filters.status !== 'all'))
}

export function applyContractListScope(contracts: ContractCI[], scope: ContractListScope): ContractCI[] {
  if (scope === 'all') return contracts
  return contracts.filter((contract) => {
    const closed = contract.status === 'CANCELED' || contract.status === 'FINISHED'
    return scope === 'closed' ? closed : !closed
  })
}
