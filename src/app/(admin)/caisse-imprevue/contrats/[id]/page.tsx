'use client'

import DailyCIContract from '@/components/caisse-imprevue/DailyCIContract'
import MonthlyCIContract from '@/components/caisse-imprevue/MonthlyCIContract'
import ContractCIDetailsSkeleton from '@/components/caisse-imprevue/ContractCIDetailsSkeleton'
import ValidateMemberSignedModal from '@/components/caisse-imprevue/ValidateMemberSignedModal'
import ValidateSupportDocumentModal from '@/components/caisse-imprevue/ValidateSupportDocumentModal'
import ValidateRefundCIModal from '@/components/caisse-imprevue/ValidateRefundCIModal'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import routes from '@/constantes/routes'
import { useCaisseImprevueContractRealtimeSync } from '@/hooks/caisse-imprevue/useCaisseImprevueContractRealtimeSync'
import { useContractCI } from '@/hooks/caisse-imprevue/useContractCI'
import { useDocumentCI } from '@/hooks/caisse-imprevue/useDocumentCI'
import { useActiveSupport } from '@/hooks/caisse-imprevue/useActiveSupport'
import { useRefundsCI } from '@/hooks/caisse-imprevue/useRefundsCI'
import {
    AlertTriangle,
    ArrowLeft,
    CheckCircle2,
    FileText,
    HandHeart,
    RotateCcw,
    Upload,
} from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

export default function ContractCIDetailsPage() {
  const params = useParams() as { id: string }
  const id = params.id
  const router = useRouter()
  const [validateModalOpen, setValidateModalOpen] = useState(false)
  const [validateSupportModalOpen, setValidateSupportModalOpen] = useState(false)
  const [validateRefundModalOpen, setValidateRefundModalOpen] = useState(false)
  useCaisseImprevueContractRealtimeSync(id, true)

  // Fetch du contrat
  const { data: contract, isLoading: isLoadingContract, isError: isErrorContract, error: errorContract } = useContractCI(id)

  // Fetch du document si contractStartId existe
  const { data: document, isLoading: isLoadingDocument } = useDocumentCI(contract?.contractStartId)

  // Fetch du support actif (pour détection PENDING_ADMIN)
  const { data: activeSupport } = useActiveSupport(id)

  // Fetch des remboursements pour détecter une demande PENDING
  const { data: refunds = [] } = useRefundsCI(id)
  const pendingRefund = useMemo(() => refunds.find((r: any) => r.status === 'PENDING') ?? null, [refunds])

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

  // Support membre en attente de validation
  const hasPendingSupport = activeSupport?.status === 'PENDING_ADMIN'
  const hasPendingRefund = !!pendingRefund

  // Afficher le bon composant selon la fréquence de paiement
  const renderContractComponent = () => {
    if (contract.paymentFrequency === 'MONTHLY') {
      return <MonthlyCIContract contract={contract} document={document} isLoadingDocument={isLoadingDocument} />
    } else {
      return <DailyCIContract contract={contract} document={document} isLoadingDocument={isLoadingDocument} />
    }
  }

  return (
    <>
      {/* Bannière d'alerte si un support membre est en attente de validation */}
      {hasPendingSupport && activeSupport && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-100 p-2 shrink-0">
                <HandHeart className="h-4 w-4 text-amber-700" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-900">
                  Demande d'aide en attente de validation
                </p>
                <p className="text-xs text-amber-700">
                  Le membre a soumis un document signé pour une aide de{' '}
                  <strong>{new Intl.NumberFormat('fr-FR').format(activeSupport.amount)} FCFA</strong>.
                  Veuillez vérifier et valider ou refuser.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => setValidateSupportModalOpen(true)}
              className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              Traiter la demande
            </Button>
          </div>
        </div>
      )}

      {/* Bannière d'alerte si une demande de remboursement est en attente de validation */}
      {hasPendingRefund && pendingRefund && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-3">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2 shrink-0">
                <RotateCcw className="h-4 w-4 text-blue-700" />
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-900">
                  Demande de remboursement en attente de validation
                </p>
                <p className="text-xs text-blue-700">
                  Le membre a soumis une demande de{' '}
                  <strong>{pendingRefund.type === 'FINAL' ? 'remboursement final' : 'retrait anticipé'}</strong>
                  {pendingRefund.withdrawalAmount
                    ? <> pour <strong>{new Intl.NumberFormat('fr-FR').format(pendingRefund.withdrawalAmount)} FCFA</strong></>
                    : null
                  }. Veuillez vérifier et valider ou refuser.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => setValidateRefundModalOpen(true)}
              className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              Traiter la demande
            </Button>
          </div>
        </div>
      )}

      {renderContractComponent()}

      {hasPendingSupport && activeSupport && (
        <ValidateSupportDocumentModal
          open={validateSupportModalOpen}
          onClose={() => setValidateSupportModalOpen(false)}
          support={activeSupport}
          contractId={id}
        />
      )}

      {/* Bannière remboursement en attente */}
      {hasPendingRefund && pendingRefund && (
        <ValidateRefundCIModal
          open={validateRefundModalOpen}
          onClose={() => setValidateRefundModalOpen(false)}
          contractId={id}
          refund={pendingRefund}
        />
      )}
    </>
  )
}
