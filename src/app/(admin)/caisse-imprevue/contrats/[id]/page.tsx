'use client'

import DailyCIContract from '@/components/caisse-imprevue/DailyCIContract'
import MonthlyCIContract from '@/components/caisse-imprevue/MonthlyCIContract'
import ContractCIDetailsSkeleton from '@/components/caisse-imprevue/ContractCIDetailsSkeleton'
import ValidateMemberSignedModal from '@/components/caisse-imprevue/ValidateMemberSignedModal'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import routes from '@/constantes/routes'
import { useCaisseImprevueContractRealtimeSync } from '@/hooks/caisse-imprevue/useCaisseImprevueContractRealtimeSync'
import { useContractCI } from '@/hooks/caisse-imprevue/useContractCI'
import { useDocumentCI } from '@/hooks/caisse-imprevue/useDocumentCI'
import {
    AlertTriangle,
    ArrowLeft,
    CheckCircle2,
    FileText,
    Upload,
} from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'

export default function ContractCIDetailsPage() {
  const params = useParams() as { id: string }
  const id = params.id
  const router = useRouter()
  const [validateModalOpen, setValidateModalOpen] = useState(false)
  useCaisseImprevueContractRealtimeSync(id, true)

  // Fetch du contrat
  const { data: contract, isLoading: isLoadingContract, isError: isErrorContract, error: errorContract } = useContractCI(id)

  // Fetch du document si contractStartId existe
  const { data: document, isLoading: isLoadingDocument } = useDocumentCI(contract?.contractStartId)

  // États de chargement
  if (isLoadingContract) {
    return <ContractCIDetailsSkeleton />
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
  const hasMemberSigned = contract.memberSignedStatus === 'PENDING_ADMIN' && !!contract.memberSignedDocumentId

  // Si pas de document et signature membre en attente → interface de validation
  if (!hasDocument && hasMemberSigned) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
          <Card className="max-w-md border-0 shadow-2xl">
            <CardContent className="p-8 text-center space-y-4">
              <div className="mx-auto w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Signature membre reçue</h2>
              <p className="text-gray-600">
                Le membre a téléversé son contrat signé. Téléchargez-le, signez-le à votre tour,
                puis téléversez le document doublement signé pour finaliser le contrat.
              </p>
              <div className="flex flex-col gap-2 pt-2">
                <Button
                  onClick={() => setValidateModalOpen(true)}
                  className="w-full bg-gradient-to-r from-[#234D65] to-[#2c5a73] gap-2"
                >
                  <CheckCircle2 className="h-5 w-5" />
                  Valider la signature
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => router.push(routes.admin.caisseImprevue)}
                  className="text-gray-500"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour à la liste
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <ValidateMemberSignedModal
          open={validateModalOpen}
          onOpenChange={setValidateModalOpen}
          contract={contract}
        />
      </>
    )
  }

  // Si pas de document et aucune signature membre → message standard
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
