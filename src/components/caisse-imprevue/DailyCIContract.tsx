'use client'

import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertCircle,
  History,
  HandCoins,
} from 'lucide-react'
import { ContractCI, CONTRACT_CI_STATUS_LABELS, PaymentCI } from '@/types/types'
import routes from '@/constantes/routes'
import PaymentCIModal, { PaymentFormData } from './PaymentCIModal'
import PaymentReceiptCIModal from './PaymentReceiptCIModal'
import RequestSupportCIModal from './RequestSupportCIModal'
import SupportHistoryCIModal from './SupportHistoryCIModal'
import RepaySupportCIModal from './RepaySupportCIModal'
import { toast } from 'sonner'
import { usePaymentsCI, useCreateVersement, useActiveSupport, useCheckEligibilityForSupport } from '@/hooks/caisse-imprevue'
import { useAuth } from '@/hooks/useAuth'

interface DailyCIContractProps {
  contract: ContractCI
  document: any | null
  isLoadingDocument: boolean
}

export default function DailyCIContract({ contract, document, isLoadingDocument }: DailyCIContractProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [showRequestSupportModal, setShowRequestSupportModal] = useState(false)
  const [showSupportHistoryModal, setShowSupportHistoryModal] = useState(false)
  const [showRepaySupportModal, setShowRepaySupportModal] = useState(false)

  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

  // Récupérer les paiements depuis Firestore
  const { data: payments = [], isLoading: isLoadingPayments } = usePaymentsCI(contract.id)
  const createVersementMutation = useCreateVersement()

  // Récupérer le support actif et l'éligibilité
  const { data: activeSupport } = useActiveSupport(contract.id)
  const { data: isEligible } = useCheckEligibilityForSupport(contract.id)

  // Calculer l'index du mois actuel du calendrier par rapport à firstPaymentDate
  const currentMonthIndex = useMemo(() => {
    const firstPaymentDate = new Date(contract.firstPaymentDate)
    const yearDiff = currentMonth.getFullYear() - firstPaymentDate.getFullYear()
    const monthDiff = currentMonth.getMonth() - firstPaymentDate.getMonth()
    return yearDiff * 12 + monthDiff
  }, [currentMonth, contract.firstPaymentDate])

  // Fonctions utilitaires pour le calendrier
  const getMonthDays = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())

    const days = []
    const currentDate = new Date(startDate)

    while (currentDate <= lastDay || days.length < 42) {
      days.push(new Date(currentDate))
      currentDate.setDate(currentDate.getDate() + 1)
    }

    return days
  }

  const monthDays = getMonthDays(currentMonth)

  const getPaymentForDate = (date: Date) => {
    // Récupérer le paiement du mois correspondant
    const payment = payments.find((p: any) => p.monthIndex === currentMonthIndex)
    if (!payment) return null

    // Chercher un versement pour cette date spécifique
    const dateString = date.toISOString().split('T')[0]
    return payment.versements?.find((v: any) => v.date === dateString) || null
  }

  const onDateClick = (date: Date) => {
    // Vérifier si la date est avant le premier versement
    const firstPaymentDate = new Date(contract.firstPaymentDate)
    firstPaymentDate.setHours(0, 0, 0, 0)
    const dateToCheck = new Date(date)
    dateToCheck.setHours(0, 0, 0, 0)

    if (dateToCheck < firstPaymentDate) {
      toast.error('Impossible de verser sur une date antérieure au premier versement')
      return
    }

    // Vérifier si un paiement existe déjà pour cette date
    const existingPayment = getPaymentForDate(date)
    
    setSelectedDate(date)
    
    if (existingPayment) {
      // 1. Si le jour est payé → Modal de reçu/facture
      setShowReceiptModal(true)
    } else if (activeSupport && activeSupport.status === 'ACTIVE') {
      // 2. Si support actif → Modal de remboursement du support (PRIORITAIRE)
      setShowRepaySupportModal(true)
    } else {
      // 3. Sinon → Modal de versement normal
      setShowPaymentModal(true)
    }
  }

  const getSelectedPaymentWithVersement = (): PaymentCI | null => {
    if (!selectedDate) return null
    
    const payment = payments.find((p: any) => p.monthIndex === currentMonthIndex)
    if (!payment) return null

    // Créer une copie du paiement avec uniquement le versement de la date sélectionnée
    const dateString = selectedDate.toISOString().split('T')[0]
    const versement = payment.versements?.find((v: any) => v.date === dateString)
    
    if (!versement) return null

    return {
      ...payment,
      versements: [versement],
      accumulatedAmount: versement.amount
    }
  }

  const handlePaymentSubmit = async (paymentData: PaymentFormData) => {
    if (!selectedDate || !user?.uid) return

    try {
      await createVersementMutation.mutateAsync({
        contractId: contract.id,
        monthIndex: currentMonthIndex,
        versementData: {
          date: paymentData.date,
          time: paymentData.time,
          amount: paymentData.amount,
          mode: paymentData.mode,
        },
        proofFile: paymentData.proofFile,
        userId: user.uid,
      })

      setShowPaymentModal(false)
      setSelectedDate(null)
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
    if (!selectedDate || !user?.uid || !activeSupport) return

    const isFullyRepaid = data.amount >= activeSupport.amountRemaining
    const surplus = data.amount - activeSupport.amountRemaining

    try {
      await createVersementMutation.mutateAsync({
        contractId: contract.id,
        monthIndex: currentMonthIndex,
        versementData: {
          date: data.date,
          time: data.time,
          amount: data.amount,
          mode: 'airtel_money', // Par défaut pour le remboursement
        },
        proofFile: data.proofFile,
        userId: user.uid,
      })

      // Message personnalisé en fonction du remboursement
      if (isFullyRepaid) {
        toast.success('🎉 Support entièrement remboursé !', {
          description: surplus > 0 
            ? `${activeSupport.amountRemaining.toLocaleString('fr-FR')} FCFA remboursés + ${surplus.toLocaleString('fr-FR')} FCFA versés pour le jour`
            : `${activeSupport.amountRemaining.toLocaleString('fr-FR')} FCFA remboursés. Vous pouvez maintenant effectuer des versements normaux.`
        })
      } else {
        toast.success('Remboursement partiel enregistré')
      }

      setShowRepaySupportModal(false)
      setSelectedDate(null)
    } catch (error) {
      console.error('Erreur lors du remboursement:', error)
      throw error
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
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
              Gestion des Versements - Paiement Quotidien
            </CardTitle>
            <div className="space-y-1 text-blue-100">
              <p className="text-base lg:text-lg">
                Contrat #{contract.id}
              </p>
              <p className="text-sm">
                {contract.memberFirstName} {contract.memberLastName} - Forfait {contract.subscriptionCICode}
              </p>
              <p className="text-sm">
                Objectif mensuel: {contract.subscriptionCIAmountPerMonth.toLocaleString('fr-FR')} FCFA
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

        {/* Calendrier quotidien */}
        <Card className="border-0 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-indigo-100/50 border-b">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <CardTitle className="flex items-center gap-2 text-indigo-700">
                <Calendar className="h-5 w-5" />
                Calendrier des Versements Quotidiens
              </CardTitle>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const prevMonth = new Date(currentMonth)
                    prevMonth.setMonth(prevMonth.getMonth() - 1)
                    setCurrentMonth(prevMonth)
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <h3 className="text-lg font-bold text-gray-900 min-w-[160px] text-center">
                  {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </h3>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const nextMonth = new Date(currentMonth)
                    nextMonth.setMonth(nextMonth.getMonth() + 1)
                    setCurrentMonth(nextMonth)
                  }}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
              <CardContent className="p-6">
                {/* Grille du calendrier */}
                <div className="grid grid-cols-7 gap-1">
                  {/* En-têtes des jours */}
                  {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map(day => (
                    <div key={day} className="p-2 text-center text-xs font-medium text-gray-500 bg-gray-50 rounded-lg">
                      {day}
                    </div>
                  ))}

                  {/* Jours du mois */}
                  {monthDays.map((date, index) => {
                    const isCurrentMonth = date.getMonth() === currentMonth.getMonth()
                    const isToday = date.toDateString() === new Date().toDateString()
                    
                    // Vérifier si la date est avant le premier versement
                    const firstPaymentDate = new Date(contract.firstPaymentDate)
                    firstPaymentDate.setHours(0, 0, 0, 0)
                    const dateToCheck = new Date(date)
                    dateToCheck.setHours(0, 0, 0, 0)
                    const isBeforeFirstPayment = dateToCheck < firstPaymentDate

                    // Vérifier si un paiement existe pour cette date
                    const hasPayment = !!getPaymentForDate(date)

                    // Déterminer le style
                    let dayStyle = ''
                    let dayContent = null

                    if (!isCurrentMonth) {
                      dayStyle = 'bg-gray-50 text-gray-400 cursor-not-allowed'
                    } else if (isBeforeFirstPayment) {
                      dayStyle = 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                      dayContent = (
                        <div className="flex items-center justify-center gap-1 text-xs text-gray-500">
                          <XCircle className="h-3 w-3" />
                        </div>
                      )
                    } else if (hasPayment) {
                      dayStyle = 'bg-green-50 border-green-200 hover:bg-green-100 cursor-pointer'
                      dayContent = (
                        <div className="flex items-center justify-center gap-1 text-xs text-green-600">
                          <CheckCircle className="h-3 w-3" />
                        </div>
                      )
                    } else {
                      const today = new Date()
                      today.setHours(0, 0, 0, 0)
                      const isPastDay = dateToCheck < today

                      if (isPastDay) {
                        dayStyle = 'bg-red-50 border-red-200 hover:bg-red-100 cursor-pointer'
                        dayContent = (
                          <div className="flex items-center justify-center gap-1 text-xs text-red-600">
                            <AlertCircle className="h-3 w-3" />
                          </div>
                        )
                      } else {
                        dayStyle = 'bg-white border-gray-200 hover:bg-gray-50 cursor-pointer'
                        dayContent = (
                          <div className="flex items-center justify-center gap-1 text-xs text-gray-500">
                            <Calendar className="h-3 w-3" />
                          </div>
                        )
                      }
                    }

                    if (isToday && isCurrentMonth && !isBeforeFirstPayment) {
                      if (hasPayment) {
                        dayStyle = 'bg-green-100 border-green-300 hover:bg-green-200 cursor-pointer ring-2 ring-blue-400'
                      } else {
                        dayStyle = 'bg-red-100 border-red-300 hover:bg-red-200 cursor-pointer ring-2 ring-blue-400'
                      }
                    }

                    return (
                      <div
                        key={index}
                        className={`p-2 min-h-[60px] border rounded-lg transition-all duration-200 ${dayStyle}`}
                        onClick={() => isCurrentMonth && !isBeforeFirstPayment && onDateClick(date)}
                      >
                        <div className="text-xs font-medium mb-1">
                          {date.getDate()}
                        </div>
                        {isCurrentMonth && dayContent}
                      </div>
                    )
                  })}
                </div>

                {/* Légende */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <div className="text-xs font-medium text-gray-700 mb-3">Légende :</div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-50 border-2 border-green-200 rounded"></div>
                      <span className="text-green-700">Versé</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-red-50 border-2 border-red-200 rounded"></div>
                      <span className="text-red-700">À verser (passé)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-white border-2 border-gray-200 rounded"></div>
                      <span className="text-gray-700">À venir</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-gray-100 border-2 border-gray-200 rounded"></div>
                      <span className="text-gray-600">Indisponible</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-red-100 border-2 border-red-300 rounded ring-2 ring-blue-400"></div>
                      <span className="text-blue-700">Aujourd'hui</span>
                    </div>
                  </div>
                </div>
          </CardContent>
        </Card>

        {/* Modal de paiement */}
        <PaymentCIModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false)
            setSelectedDate(null)
          }}
          onSubmit={handlePaymentSubmit}
          title={`Versement quotidien`}
          description={selectedDate ? `Enregistrer le versement du ${selectedDate.toLocaleDateString('fr-FR')}` : ''}
          defaultDate={selectedDate?.toISOString().split('T')[0]}
          isMonthly={false}
          isDateFixed={true}
          contractId={contract.id}
        />

        {/* Modal de reçu */}
        {getSelectedPaymentWithVersement() && (
          <PaymentReceiptCIModal
            isOpen={showReceiptModal}
            onClose={() => {
              setShowReceiptModal(false)
              setSelectedDate(null)
            }}
            contract={contract}
            payment={getSelectedPaymentWithVersement()!}
            isMonthly={false}
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
        {activeSupport && selectedDate && (
          <RepaySupportCIModal
            isOpen={showRepaySupportModal}
            onClose={() => {
              setShowRepaySupportModal(false)
              setSelectedDate(null)
            }}
            onSubmit={handleRepaySupportSubmit}
            activeSupport={activeSupport}
            defaultDate={selectedDate.toISOString().split('T')[0]}
            isDateFixed={true}
            monthOrDayLabel={`Jour du ${selectedDate.toLocaleDateString('fr-FR')}`}
          />
        )}
      </div>
    </div>
  )
}

