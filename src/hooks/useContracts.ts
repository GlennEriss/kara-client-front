import { useState, useEffect } from 'react'
import { getAllContracts } from '@/db/caisse/contracts.db'

export interface Contract {
  id: string
  status: string
  contractType: 'INDIVIDUAL' | 'GROUP'
  memberId?: string
  groupeId?: string
  monthlyAmount: number
  monthsPlanned: number
  nextDueAt?: Date
  nominalPaid: number
  contractStartAt?: Date
  contractEndAt?: Date
  createdAt?: Date
  updatedAt?: Date
}

export function useContracts() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchContracts = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const contractsData = await getAllContracts()
        setContracts(contractsData)
      } catch (err) {
        console.error('Erreur lors de la récupération des contrats:', err)
        setError('Impossible de récupérer les contrats')
      } finally {
        setIsLoading(false)
      }
    }

    fetchContracts()
  }, [])

  const refetch = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const contractsData = await getAllContracts()
      setContracts(contractsData)
    } catch (err) {
      console.error('Erreur lors de la récupération des contrats:', err)
      setError('Impossible de récupérer les contrats')
    } finally {
      setIsLoading(false)
    }
  }

  return {
    contracts,
    isLoading,
    error,
    refetch
  }
}
