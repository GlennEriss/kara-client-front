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
} from 'lucide-react'
import { ContractCI, CONTRACT_CI_STATUS_LABELS } from '@/types/types'
import routes from '@/constantes/routes'
import PaymentCIModal, { PaymentFormData } from './PaymentCIModal'
import PaymentReceiptCIModal from './PaymentReceiptCIModal'
import RequestSupportCIModal from './RequestSupportCIModal'
import SupportHistoryCIModal from './SupportHistoryCIModal'
import { toast } from 'sonner'
import { usePaymentsCI, useCreateVersement, useActiveSupport, useCheckEligibilityForSupport } from '@/hooks/caisse-imprevue'
import { useAuth } from '@/hooks/useAuth'

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

  // Récupérer les paiements depuis Firestore
  const { data: payments = [], isLoading: isLoadingPayments } = usePaymentsCI(contract.id)
  const createVersementMutation = useCreateVersement()

  // Récupérer le support actif et l'éligibilité
  const { data: activeSupport } = useActiveSupport(contract.id)
  const { data: isEligible } = useCheckEligibilityForSupport(contract.id)

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
      // Ouvrir le modal de reçu pour consulter les détails
      setShowReceiptModal(true)
    } else {
      // Ouvrir le modal de paiement
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
      </div>
    </div>
  )
}

