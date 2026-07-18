'use client'

import { Button } from '@/components/ui/button'
import routes from '@/constantes/routes'
import { CreditFixeDemandDetailSection } from '@/domains/financial/credit-speciale/fixe/demandes/components/CreditFixeDemandDetailSection'
import { useCreditDemand } from '@/hooks/useCreditSpeciale'
import { Loader2 } from 'lucide-react'
import { backOr } from '@/lib/backNavigation'
import { useParams, useRouter } from 'next/navigation'

export default function CreditFixeDemandDetailPage() {
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
          <Button onClick={() => backOr(router, routes.admin.creditFixeDemandes)} variant="outline">
            Retour
          </Button>
        </div>
      </div>
    )
  }

  if (demand.creditType !== 'FIXE') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-3">
          <p className="text-red-600">Cette demande ne correspond pas à un crédit fixe.</p>
          <Button onClick={() => backOr(router, routes.admin.creditFixeDemandes)} variant="outline">
            Retour
          </Button>
        </div>
      </div>
    )
  }

  return <CreditFixeDemandDetailSection demand={demand} />
}
