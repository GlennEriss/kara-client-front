'use client'

import React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCreditContract } from '@/hooks/useCreditSpeciale'
import routes from '@/constantes/routes'
import { CreditFixeContractDetailSection } from '@/domains/financial/credit-speciale/fixe/contrats/components/CreditFixeContractDetailSection'

export default function CreditFixeContractDetailPage() {
  const params = useParams()
  const router = useRouter()
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
        <div className="text-center space-y-3">
          <p className="text-red-600">Erreur lors du chargement du contrat</p>
          <p className="text-gray-500">{error?.message || 'Contrat introuvable'}</p>
          <Button onClick={() => router.push(routes.admin.creditFixeContrats)} variant="outline">
            Retour aux contrats crédit fixe
          </Button>
        </div>
      </div>
    )
  }

  if (contract.creditType !== 'FIXE') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-3">
          <p className="text-red-600">Ce contrat ne correspond pas à un crédit fixe.</p>
          <Button onClick={() => router.push(routes.admin.creditFixeContrats)} variant="outline">
            Retour aux contrats crédit fixe
          </Button>
        </div>
      </div>
    )
  }

  return <CreditFixeContractDetailSection contract={contract} />
}
