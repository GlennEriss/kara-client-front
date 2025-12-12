'use client'

import React from 'react'
import { useParams } from 'next/navigation'
import CreditContractDetail from '@/components/credit-speciale/CreditContractDetail'
import { useCreditContract } from '@/hooks/useCreditSpeciale'
import { Loader2 } from 'lucide-react'

export default function CreditContractDetailPage() {
  const params = useParams()
  const contractId = params.id as string
  
  const { data: contract, isLoading, error } = useCreditContract(contractId)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-[#234D65]" />
      </div>
    )
  }

  if (error || !contract) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">Erreur lors du chargement du contrat</p>
          <p className="text-gray-500">{error?.message || 'Contrat introuvable'}</p>
        </div>
      </div>
    )
  }

  return <CreditContractDetail contract={contract} />
}

