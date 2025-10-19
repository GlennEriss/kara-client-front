'use client'

import React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useContractCI } from '@/hooks/caisse-imprevue/useContractCI'
import { useDocumentCI } from '@/hooks/caisse-imprevue/useDocumentCI'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowLeft,
  AlertTriangle,
  Upload,
  FileText,
} from 'lucide-react'
import routes from '@/constantes/routes'
import MonthlyCIContract from '@/components/caisse-imprevue/MonthlyCIContract'
import DailyCIContract from '@/components/caisse-imprevue/DailyCIContract'

export default function ContractCIDetailsPage() {
  const params = useParams() as { id: string }
  const id = params.id
  const router = useRouter()
  
  // Fetch du contrat
  const { data: contract, isLoading: isLoadingContract, isError: isErrorContract, error: errorContract } = useContractCI(id)
  
  // Fetch du document si contractStartId existe
  const { data: document, isLoading: isLoadingDocument } = useDocumentCI(contract?.contractStartId)

  // États de chargement
  if (isLoadingContract) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-96" />
            <Skeleton className="h-96 lg:col-span-2" />
          </div>
        </div>
      </div>
    )
  }

  // Gestion des erreurs
  if (isErrorContract) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="max-w-md border-0 shadow-2xl">
          <CardContent className="p-8 text-center">
            <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
              <AlertTriangle className="h-10 w-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Erreur de chargement</h2>
            <p className="text-gray-600 mb-6">
              {errorContract instanceof Error ? errorContract.message : 'Une erreur est survenue'}
            </p>
            <Button
              onClick={() => router.push(routes.admin.caisseImprevue)}
              className="bg-gradient-to-r from-[#234D65] to-[#2c5a73]"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Retour à la liste
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Contrat non trouvé
  if (!contract) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="max-w-md border-0 shadow-2xl">
          <CardContent className="p-8 text-center">
            <div className="mx-auto w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mb-6">
              <FileText className="h-10 w-10 text-orange-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Contrat introuvable</h2>
            <p className="text-gray-600 mb-6">
              Le contrat avec l'ID <span className="font-mono font-semibold">{id}</span> n'existe pas.
            </p>
            <Button
              onClick={() => router.push(routes.admin.caisseImprevue)}
              className="bg-gradient-to-r from-[#234D65] to-[#2c5a73]"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Retour à la liste
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Vérifier si le contrat a un document uploadé
  const hasDocument = !!contract.contractStartId

  // Si pas de document, afficher un message d'avertissement
  if (!hasDocument) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="max-w-md border-0 shadow-2xl">
          <CardContent className="p-8 text-center">
            <div className="mx-auto w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mb-6">
              <Upload className="h-10 w-10 text-orange-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Document PDF requis</h2>
            <p className="text-gray-600 mb-6">
              Vous devez d'abord téléverser le document PDF signé du contrat avant d'accéder aux détails complets.
            </p>
            <Button
              onClick={() => router.push(routes.admin.caisseImprevue)}
              className="bg-gradient-to-r from-[#234D65] to-[#2c5a73]"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Retour à la liste
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Afficher le bon composant selon la fréquence de paiement
  const renderContractComponent = () => {
    if (contract.paymentFrequency === 'MONTHLY') {
      return <MonthlyCIContract contract={contract} document={document} isLoadingDocument={isLoadingDocument} />
    } else {
      return <DailyCIContract contract={contract} document={document} isLoadingDocument={isLoadingDocument} />
    }
  }

  return renderContractComponent()
}
