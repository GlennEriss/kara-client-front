'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  CheckCircle,
  Clock,
  XCircle,
  History,
  HandCoins,
  AlertCircle,
  FileSignature,
  Download,
  RefreshCw,
  TrendingUp,
} from 'lucide-react'
import { ContractCI, CONTRACT_CI_STATUS_LABELS } from '@/types/types'
import routes from '@/constantes/routes'
import PaymentCIModal, { PaymentFormData } from './PaymentCIModal'
import PaymentReceiptCIModal from './PaymentReceiptCIModal'
import RequestSupportCIModal from './RequestSupportCIModal'
import SupportHistoryCIModal from './SupportHistoryCIModal'
import RepaySupportCIModal from './RepaySupportCIModal'
import { toast } from 'sonner'
import { usePaymentsCI, useCreateVersement, useActiveSupport, useCheckEligibilityForSupport, useSupportHistory } from '@/hooks/caisse-imprevue'
import { useAuth } from '@/hooks/useAuth'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import dynamic from 'next/dynamic'
import { requestFinalRefund, requestEarlyRefund } from '@/services/caisse/mutations'
import { listRefunds } from '@/db/caisse/refunds.db'
import RemboursementCIPDFModal from './RemboursementCIPDFModal'

const SupportRecognitionPDFModal = dynamic(() => import('./SupportRecognitionPDFModal'), {
  ssr: false,
})

interface MonthlyCIContractProps {
  contract: ContractCI
  document: any | null
  isLoadingDocument: boolean
}

export default function MonthlyCIContract({ contract, document, isLoadingDocument }: MonthlyCIContractProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [showRequestSupportModal, setShowRequestSupportModal] = useState(false)
  const [showSupportHistoryModal, setShowSupportHistoryModal] = useState(false)
  const [showRepaySupportModal, setShowRepaySupportModal] = useState(false)
  const [showRecognitionModal, setShowRecognitionModal] = useState(false)
  const [showRemboursementPdf, setShowRemboursementPdf] = useState(false)
  const [showReasonModal, setShowReasonModal] = useState(false)
  const [refundType, setRefundType] = useState<'FINAL' | 'EARLY' | null>(null)
  const [refundReasonInput, setRefundReasonInput] = useState('')
  const [isRefunding, setIsRefunding] = useState(false)
  const [refunds, setRefunds] = useState<any[]>([])

  // Récupérer les paiements depuis Firestore
  const { data: payments = [], isLoading: isLoadingPayments } = usePaymentsCI(contract.id)
  const createVersementMutation = useCreateVersement()

  // Récupérer le support actif et l'éligibilité
  const { data: activeSupport, refetch: refetchActiveSupport } = useActiveSupport(contract.id)
  const { data: isEligible, refetch: refetchEligibility } = useCheckEligibilityForSupport(contract.id)
  const { data: supportsHistory = [] } = useSupportHistory(contract.id)

  // Fonction pour recharger les remboursements
  const reloadRefunds = React.useCallback(async () => {
    if (contract.id) {
      try {
        const refundsData = await listRefunds(contract.id)
        setRefunds(refundsData)
      } catch (error) {
        console.error('Error loading refunds:', error)
      }
    }
  }, [contract.id])

  // Load refunds from subcollection
  React.useEffect(() => {
    reloadRefunds()
  }, [reloadRefunds])

  // Fermer automatiquement le modal de remboursement si le support n'est plus actif
  React.useEffect(() => {
    if (showRepaySupportModal && (!activeSupport || activeSupport.status !== 'ACTIVE')) {
      setShowRepaySupportModal(false)
      setSelectedMonthIndex(null)
    }
  }, [activeSupport, showRepaySupportModal])

  const getMonthStatus = (monthIndex: number) => {
    const payment = payments.find((p: any) => p.monthIndex === monthIndex)
    return payment?.status || 'DUE'
  }

  const getMonthTotal = (monthIndex: number) => {
    const payment = payments.find((p: any) => p.monthIndex === monthIndex)
    return payment?.accumulatedAmount || 0
  }

  const handleMonthClick = (monthIndex: number) => {
    const status = getMonthStatus(monthIndex)
    
    setSelectedMonthIndex(monthIndex)
    
    if (status === 'PAID') {
      // 1. Si le mois est payé → Modal de reçu/facture
      setShowReceiptModal(true)
    } else if (activeSupport && activeSupport.status === 'ACTIVE') {
      // 2. Si support actif → Modal de remboursement du support (PRIORITAIRE)
      setShowRepaySupportModal(true)
    } else {
      // 3. Sinon → Modal de versement normal
      setShowPaymentModal(true)
    }
  }

  const getSelectedPayment = () => {
    if (selectedMonthIndex === null) return null
    return payments.find((p: any) => p.monthIndex === selectedMonthIndex)
  }

  const handlePaymentSubmit = async (data: PaymentFormData) => {
    if (selectedMonthIndex === null || !user?.uid) return

    try {
      await createVersementMutation.mutateAsync({
        contractId: contract.id,
        monthIndex: selectedMonthIndex,
        versementData: {
          date: data.date,
          time: data.time,
          amount: data.amount,
          mode: data.mode,
        },
        proofFile: data.proofFile,
        userId: user.uid,
      })

      setShowPaymentModal(false)
      setSelectedMonthIndex(null)
    } catch (error) {
      console.error('Erreur lors du paiement:', error)
      // L'erreur est déjà gérée par le hook
      throw error
    }
  }

  const handleRepaySupportSubmit = async (data: {
    date: string
    time: string
    amount: number
    proofFile: File
  }) => {
    if (selectedMonthIndex === null || !user?.uid || !activeSupport) return

    const isFullyRepaid = data.amount >= activeSupport.amountRemaining
    const surplus = data.amount - activeSupport.amountRemaining

    try {
      await createVersementMutation.mutateAsync({
        contractId: contract.id,
        monthIndex: selectedMonthIndex,
        versementData: {
          date: data.date,
          time: data.time,
          amount: data.amount,
          mode: 'airtel_money', // Par défaut pour le remboursement
        },
        proofFile: data.proofFile,
        userId: user.uid,
      })

      // Fermer le modal immédiatement
      setShowRepaySupportModal(false)
      setSelectedMonthIndex(null)

      // Forcer le refetch immédiat des données de support
      await Promise.all([
        refetchActiveSupport(),
        refetchEligibility()
      ])

      // Message personnalisé en fonction du remboursement
      if (isFullyRepaid) {
        toast.success('🎉 Support entièrement remboursé !', {
          description: surplus > 0 
            ? `${activeSupport.amountRemaining.toLocaleString('fr-FR')} FCFA remboursés + ${surplus.toLocaleString('fr-FR')} FCFA versés pour le mois`
            : `${activeSupport.amountRemaining.toLocaleString('fr-FR')} FCFA remboursés. Vous pouvez maintenant effectuer des versements normaux.`
        })
      } else {
        toast.success('Remboursement partiel enregistré')
      }
    } catch (error) {
      console.error('Erreur lors du remboursement:', error)
      throw error
    }
  }

  // Fonction pour ouvrir le modal de reconnaissance
  const handleGenerateRecognitionPDF = () => {
    // Utiliser le support actif ou le dernier support de l'historique
    const supportToUse = activeSupport || (supportsHistory.length > 0 ? supportsHistory[0] : null)
    
    if (!supportToUse) {
      toast.error('Aucune information de support disponible pour générer la reconnaissance')
      return
    }

    setShowRecognitionModal(true)
  }

  // Calculer les conditions pour les remboursements
  const paidCount = payments.filter((p: any) => p.status === 'PAID').length
  const allPaid = payments.length > 0 && paidCount === payments.length
  const canEarly = paidCount >= 1 && !allPaid
  const hasFinalRefund = refunds.some((r: any) => r.type === 'FINAL' && r.status !== 'ARCHIVED')
  const hasEarlyRefund = refunds.some((r: any) => r.type === 'EARLY' && r.status !== 'ARCHIVED')

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'DUE':
        return {
          bg: 'bg-orange-100',
          text: 'text-orange-700',
          border: 'border-orange-200',
          icon: Clock
        }
      case 'PAID':
        return {
          bg: 'bg-green-100',
          text: 'text-green-700',
          border: 'border-green-200',
          icon: CheckCircle
        }
      default:
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-700',
          border: 'border-gray-200',
          icon: XCircle
        }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* En-tête avec bouton retour */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              variant="outline"
              onClick={() => router.push(routes.admin.caisseImprevue)}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour à la liste
            </Button>
            
            <Button
              variant="outline"
              onClick={() => router.push(routes.admin.caisseImprevueContractPayments(contract.id))}
              className="gap-2 border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              <History className="h-4 w-4" />
              Historique des versements
            </Button>

            {/* Bouton Demander une aide */}
            {isEligible && !activeSupport && (
              <Button
                variant="outline"
                onClick={() => setShowRequestSupportModal(true)}
                className="gap-2 border-green-300 text-green-700 hover:bg-green-50"
              >
                <HandCoins className="h-4 w-4" />
                Demander une aide
              </Button>
            )}

            {/* Bouton Historique des aides */}
            <Button
              variant="outline"
              onClick={() => setShowSupportHistoryModal(true)}
              className="gap-2 border-orange-300 text-orange-700 hover:bg-orange-50"
            >
              <History className="h-4 w-4" />
              Historique des aides
            </Button>

            {/* Bouton Reconnaissance */}
            <Button
              variant="outline"
              onClick={handleGenerateRecognitionPDF}
              className="gap-2 border-green-300 text-green-700 hover:bg-green-50"
            >
              <FileSignature className="h-4 w-4" />
              <Download className="h-4 w-4" />
              Reconnaissance
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Badge Support Actif */}
            {activeSupport && activeSupport.status === 'ACTIVE' && (
              <Badge className="bg-orange-600 text-white px-3 py-1.5 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Support en cours
              </Badge>
            )}
            
            <Badge className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] text-white text-lg px-4 py-2">
              {CONTRACT_CI_STATUS_LABELS[contract.status]}
            </Badge>
          </div>
        </div>

        {/* Titre principal */}
        <Card className="border-0 shadow-xl bg-gradient-to-r from-[#234D65] to-[#2c5a73]">
          <CardHeader>
            <CardTitle className="text-2xl lg:text-3xl font-black text-white flex items-center gap-3">
              <DollarSign className="h-7 w-7 lg:h-8 lg:w-8" />
              Gestion des Versements - Paiement Mensuel
            </CardTitle>
            <div className="space-y-1 text-blue-100">
              <p className="text-base lg:text-lg">
                Contrat #{contract.id}
              </p>
              <p className="text-sm">
                {contract.memberFirstName} {contract.memberLastName} - Forfait {contract.subscriptionCICode}
              </p>
            </div>
          </CardHeader>
        </Card>

        {/* Résumé du contrat */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Montant mensuel</p>
                  <p className="font-bold text-lg text-green-600">
                    {contract.subscriptionCIAmountPerMonth.toLocaleString('fr-FR')} FCFA
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Durée du contrat</p>
                  <p className="font-bold text-lg text-gray-900">
                    {contract.subscriptionCIDuration} mois
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <DollarSign className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Nominal total</p>
                  <p className="font-bold text-lg text-purple-600">
                    {contract.subscriptionCINominal.toLocaleString('fr-FR')} FCFA
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Support à rembourser */}
          {activeSupport && activeSupport.status === 'ACTIVE' && (
            <Card className="border-0 shadow-lg border-2 border-orange-300 bg-orange-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs text-orange-700 font-medium">Support à rembourser</p>
                    <p className="font-bold text-lg text-orange-600">
                      {activeSupport.amountRemaining.toLocaleString('fr-FR')} FCFA
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Échéancier de Paiement Mensuel */}
        <Card className="border-0 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-indigo-100/50 border-b">
            <CardTitle className="flex items-center gap-2 text-indigo-700">
              <Calendar className="h-5 w-5" />
              Échéancier de Paiement Mensuel
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: contract.subscriptionCIDuration }).map((_, monthIndex) => {
                    const status = getMonthStatus(monthIndex)
                    const total = getMonthTotal(monthIndex)
                    const target = contract.subscriptionCIAmountPerMonth
                    const percentage = target > 0 ? Math.min(100, (total / target) * 100) : 0
                    const statusConfig = getStatusConfig(status)
                    const StatusIcon = statusConfig.icon

                    return (
                      <Card
                        key={monthIndex}
                        className={`cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-2 ${
                          status === 'PAID' 
                            ? 'border-green-200 bg-green-50/50' 
                            : 'border-gray-200 hover:border-[#224D62]'
                        }`}
                        onClick={() => handleMonthClick(monthIndex)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="bg-[#224D62] text-white rounded-lg px-3 py-1 text-sm font-bold">
                                M{monthIndex + 1}
                              </div>
                            </div>
                            <Badge className={`${statusConfig.bg} ${statusConfig.text} ${statusConfig.border} border`}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {status === 'DUE' ? 'À payer' : status === 'PAID' ? 'Payé' : status}
                            </Badge>
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Objectif:</span>
                              <span className="font-semibold text-gray-900">
                                {target.toLocaleString('fr-FR')} FCFA
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Versé:</span>
                              <span className="font-semibold text-green-600">
                                {total.toLocaleString('fr-FR')} FCFA
                              </span>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span>Progression</span>
                                <span>{percentage.toFixed(1)}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full transition-all duration-300 ${
                                    percentage >= 100 
                                      ? 'bg-green-500' 
                                      : percentage >= 50 
                                      ? 'bg-yellow-500' 
                                      : 'bg-red-500'
                                  }`}
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>

            {/* Information */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>ℹ️ Information :</strong> Cliquez sur un mois pour enregistrer un versement.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Modal de paiement */}
        <PaymentCIModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false)
            setSelectedMonthIndex(null)
          }}
          onSubmit={handlePaymentSubmit}
          title={`Versement pour le mois M${(selectedMonthIndex ?? 0) + 1}`}
          description={`Enregistrer le versement mensuel de ${contract.subscriptionCIAmountPerMonth.toLocaleString('fr-FR')} FCFA`}
          defaultAmount={contract.subscriptionCIAmountPerMonth}
          isMonthly={true}
          contractId={contract.id}
        />

        {/* Modal de reçu */}
        {getSelectedPayment() && (
          <PaymentReceiptCIModal
            isOpen={showReceiptModal}
            onClose={() => {
              setShowReceiptModal(false)
              setSelectedMonthIndex(null)
            }}
            contract={contract}
            payment={getSelectedPayment()!}
            isMonthly={true}
          />
        )}

        {/* Modal de demande de support */}
        <RequestSupportCIModal
          isOpen={showRequestSupportModal}
          onClose={() => setShowRequestSupportModal(false)}
          contract={contract}
        />

        {/* Modal d'historique des supports */}
        <SupportHistoryCIModal
          isOpen={showSupportHistoryModal}
          onClose={() => setShowSupportHistoryModal(false)}
          contractId={contract.id}
        />

        {/* Modal de remboursement du support */}
        {activeSupport && (
          <RepaySupportCIModal
            isOpen={showRepaySupportModal}
            onClose={() => {
              setShowRepaySupportModal(false)
              setSelectedMonthIndex(null)
            }}
            onSubmit={handleRepaySupportSubmit}
            activeSupport={activeSupport}
            monthOrDayLabel={selectedMonthIndex !== null ? `Mois M${selectedMonthIndex + 1}` : ''}
          />
        )}

        {/* Section Remboursements */}
        <Card className="border-0 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-indigo-500 to-indigo-600">
            <CardTitle className="flex items-center gap-2 text-white">
              <RefreshCw className="h-5 w-5" />
              Remboursements
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {/* Boutons d'action */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <Button
                variant="outline"
                className="flex items-center justify-center gap-2 border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                disabled={isRefunding || !allPaid || hasFinalRefund}
                onClick={() => {
                  setRefundType('FINAL')
                  setRefundReasonInput('')
                  setShowReasonModal(true)
                }}
              >
                <TrendingUp className="h-5 w-5" />
                Demander remboursement final
              </Button>
              
              <Button
                variant="outline"
                className="flex items-center justify-center gap-2 border-orange-300 text-orange-700 hover:bg-orange-50"
                disabled={isRefunding || !canEarly || hasEarlyRefund}
                onClick={() => {
                  setRefundType('EARLY')
                  setRefundReasonInput('')
                  setShowReasonModal(true)
                }}
              >
                <Download className="h-5 w-5" />
                Demander retrait anticipé
              </Button>

              <Button
                variant="outline"
                className="flex items-center justify-center gap-2 border-green-300 text-green-700 hover:bg-green-50"
                onClick={() => setShowRemboursementPdf(true)}
              >
                <FileSignature className="h-5 w-5" />
                PDF Remboursement
              </Button>
            </div>
            
            {/* Liste des remboursements */}
            <div className="grid grid-cols-1 gap-6">
              {refunds.length === 0 ? (
                <div className="text-center py-12">
                  <div className="bg-gray-100 rounded-full p-6 w-24 h-24 mx-auto mb-4 flex items-center justify-center">
                    <RefreshCw className="h-12 w-12 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun remboursement</h3>
                  <p className="text-gray-600">Aucune demande de remboursement n'a été effectuée</p>
                </div>
              ) : (
                refunds.map((r: any) => {
                  const getRefundStatusConfig = (status: string) => {
                    switch (status) {
                      case 'PENDING':
                        return { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200', icon: Clock }
                      case 'APPROVED':
                        return { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', icon: CheckCircle }
                      case 'PAID':
                        return { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', icon: CheckCircle }
                      default:
                        return { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', icon: XCircle }
                    }
                  }

                  const statusConfig = getRefundStatusConfig(r.status)
                  const StatusIcon = statusConfig.icon

                  return (
                    <div key={r.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-all duration-200">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-indigo-100 rounded-lg p-2">
                            <RefreshCw className="h-5 w-5 text-indigo-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {r.type === 'FINAL' ? 'Remboursement Final' : r.type === 'EARLY' ? 'Retrait Anticipé' : 'Remboursement par Défaut'}
                            </h3>
                            <Badge className={`${statusConfig.bg} ${statusConfig.text} ${statusConfig.border} border mt-1`}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {r.status === 'PENDING' ? 'En attente' : r.status === 'APPROVED' ? 'Approuvé' : r.status === 'PAID' ? 'Payé' : 'Archivé'}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Montant nominal:</span>
                          <span className="font-semibold">{(r.amountNominal || 0).toLocaleString('fr-FR')} FCFA</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Bonus:</span>
                          <span className="font-semibold">{(r.amountBonus || 0).toLocaleString('fr-FR')} FCFA</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Échéance:</span>
                          <span className="font-semibold">{r.deadlineAt ? new Date(r.deadlineAt).toLocaleDateString('fr-FR') : '—'}</span>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Modale de saisie de la cause du retrait */}
        {showReasonModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="bg-blue-50 border-b border-blue-100 p-6">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 rounded-full p-2">
                    <FileSignature className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-bold text-blue-900">
                    {refundType === 'FINAL' ? 'Demande de remboursement final' : 'Demande de retrait anticipé'}
                  </h3>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cause du retrait *</label>
                    <textarea
                      placeholder="Expliquez la raison du retrait..."
                      className="w-full resize-none rounded-lg border border-gray-300 p-3 text-sm focus:ring-2 focus:ring-[#234D65]/20 focus:border-[#234D65]"
                      rows={4}
                      value={refundReasonInput}
                      onChange={(e) => setRefundReasonInput(e.target.value)}
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Cette information sera incluse dans le document de remboursement
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowReasonModal(false)
                      setRefundType(null)
                      setRefundReasonInput('')
                    }}
                  >
                    Annuler
                  </Button>
                  <Button
                    className="flex-1 bg-gradient-to-r from-[#234D65] to-[#2c5a73] text-white hover:shadow-lg"
                    disabled={!refundReasonInput.trim() || isRefunding}
                    onClick={async () => {
                      try {
                        setIsRefunding(true)
                        
                        if (refundType === 'FINAL') {
                          await requestFinalRefund(contract.id, refundReasonInput)
                          toast.success('Remboursement final demandé')
                        } else {
                          await requestEarlyRefund(contract.id, { reason: refundReasonInput })
                          toast.success('Retrait anticipé demandé')
                        }

                        await reloadRefunds()
                        
                        setShowReasonModal(false)
                        setRefundType(null)
                        setRefundReasonInput('')
                        
                        // Afficher le PDF de remboursement
                        setShowRemboursementPdf(true)
                      } catch (e: any) {
                        toast.error(e?.message || 'Action impossible')
                      } finally {
                        setIsRefunding(false)
                      }
                    }}
                  >
                    {isRefunding ? 'Traitement...' : 'Confirmer et voir le PDF'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal PDF Remboursement */}
        <RemboursementCIPDFModal
          isOpen={showRemboursementPdf}
          onClose={() => setShowRemboursementPdf(false)}
          contractId={contract.id}
          contractData={contract}
        />

        {/* Modal de reconnaissance de souscription */}
        {showRecognitionModal && (() => {
          const supportToUse = activeSupport || (supportsHistory.length > 0 ? supportsHistory[0] : null)
          if (!supportToUse) return null
          
          return (
            <SupportRecognitionPDFModal
              isOpen={showRecognitionModal}
              onClose={() => setShowRecognitionModal(false)}
              contract={{
                memberFirstName: contract.memberFirstName,
                memberLastName: contract.memberLastName,
                subscriptionCICode: contract.subscriptionCICode,
                subscriptionCIAmountPerMonth: contract.subscriptionCIAmountPerMonth,
              }}
              support={{
                approvedAt: supportToUse.approvedAt,
              }}
            />
          )
        })()}
      </div>
    </div>
  )
}

