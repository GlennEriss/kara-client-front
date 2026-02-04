import { useMemo } from 'react'
import { useContracts, type Contract } from '@/hooks/useContracts'

/** Type minimal pour le calcul de la somme (status + nominalPaid). */
type ContractForSum = Pick<Contract, 'status' | 'nominalPaid'> & { id?: string }

/**
 * Calcule la somme des nominalPaid pour les contrats avec statut CLOSED.
 * - Si un tableau de contrats est fourni, il est utilisé directement (pas de refetch).
 * - Sinon, le hook récupère tous les contrats via useContracts().
 */
export function useClosedNominalSum(contractsFromProps?: ContractForSum[]) {
  const contractsHook = useContracts()

  const contracts: ContractForSum[] = contractsFromProps ?? contractsHook.contracts
  const isLoading = contractsFromProps ? false : contractsHook.isLoading
  const error = contractsFromProps ? null : contractsHook.error
  const refetch = contractsHook.refetch

  const sum = useMemo(() => {
    if (!contracts || contracts.length === 0) return 0
    return contracts
      .filter((c) => (c.status || '').toUpperCase() === 'CLOSED')
      .reduce((acc, c) => acc + (c.nominalPaid || 0), 0)
  }, [contracts])

  return { sum, isLoading, error, refetch }
}


