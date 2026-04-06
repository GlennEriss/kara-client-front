'use client'

import CreditContractDetail from '@/components/credit-speciale/CreditContractDetail'
import { Button } from '@/components/ui/button'
import { useCreditContract } from '@/hooks/useCreditSpeciale'
import { AlertCircle, Loader2 } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'

export default function CreditContractDetailPage() {
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
        <div className="text-center">
          <p className="text-red-600 mb-4">Erreur lors du chargement du contrat</p>
          <p className="text-gray-500">{error?.message || 'Contrat introuvable'}</p>
        </div>
      </div>
    )
  }

  if (!contract.signedContractUrl) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="max-w-lg rounded-2xl border border-orange-200 bg-orange-50 p-6 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-600">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold text-[#234D65]">Accès bloqué</h1>
          <p className="mt-3 text-sm leading-6 text-slate-700">
            Ce contrat reste inaccessible tant que le contrat signé n’a pas été téléversé.
            Retournez dans la liste des contrats pour utiliser le bouton
            {' '}
            <span className="font-medium">Téléverser contrat signé</span>.
          </p>
          <Button
            onClick={() => router.push('/credit-speciale/contrats')}
            className="mt-5 bg-[#234D65] hover:bg-[#1b3b4d]"
          >
            Retourner à la liste des contrats
          </Button>
        </div>
      </div>
    )
  }

  return <CreditContractDetail contract={contract} />
}
