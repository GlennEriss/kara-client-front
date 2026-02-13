'use client'

import React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCreditDemand } from '@/hooks/useCreditSpeciale'
import routes from '@/constantes/routes'
import { CreditAideDemandDetailSection } from '@/domains/financial/credit-speciale/aide/demandes/components/CreditAideDemandDetailSection'

export default function CreditAideDemandDetailPage() {
  const params = useParams()
  const router = useRouter()
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
        <div className="text-center space-y-3">
          <p className="text-red-600">Erreur lors du chargement de la demande</p>
          <p className="text-gray-500">{error?.message || 'Demande introuvable'}</p>
          <Button onClick={() => router.push(routes.admin.creditAideDemandes)} variant="outline">
            Retour aux demandes crédit aide
          </Button>
        </div>
      </div>
    )
  }

  if (demand.creditType !== 'AIDE') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-3">
          <p className="text-red-600">Cette demande ne correspond pas à un crédit aide.</p>
          <Button onClick={() => router.push(routes.admin.creditAideDemandes)} variant="outline">
            Retour aux demandes crédit aide
          </Button>
        </div>
      </div>
    )
  }

  return <CreditAideDemandDetailSection demand={demand} />
}
