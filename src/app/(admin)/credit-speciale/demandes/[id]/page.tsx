'use client'

import React from 'react'
import { useParams } from 'next/navigation'
import { useCreditDemand } from '@/hooks/useCreditSpeciale'
import { Loader2 } from 'lucide-react'
import CreditDemandDetail from '@/components/credit-speciale/CreditDemandDetail'

export default function CreditDemandDetailPage() {
  const params = useParams()
  const demandId = params.id as string
  
  const { data: demand, isLoading, error } = useCreditDemand(demandId)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-[#234D65]" />
      </div>
    )
  }

  if (error || !demand) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">Erreur lors du chargement de la demande</p>
          <p className="text-gray-500">{error?.message || 'Demande introuvable'}</p>
        </div>
      </div>
    )
  }

  return <CreditDemandDetail demand={demand} />
}

