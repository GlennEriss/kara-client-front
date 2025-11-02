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
  FileSignature,
  Download,
  RefreshCw,
  TrendingUp,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ContractCI, CONTRACT_CI_STATUS_LABELS, PaymentCI } from '@/types/types'
import routes from '@/constantes/routes'
import PaymentCIModal, { PaymentFormData } from './PaymentCIModal'
import PaymentReceiptCIModal from './PaymentReceiptCIModal'
import RequestSupportCIModal from './RequestSupportCIModal'
import SupportHistoryCIModal from './SupportHistoryCIModal'
import RepaySupportCIModal from './RepaySupportCIModal'
import EarlyRefundCIModal from './EarlyRefundCIModal'
import FinalRefundCIModal from './FinalRefundCIModal'
import { toast } from 'sonner'
import { usePaymentsCI, useCreateVersement, useActiveSupport, useCheckEligibilityForSupport, useSupportHistory, useContractPaymentStats } from '@/hooks/caisse-imprevue'
import { useAuth } from '@/hooks/useAuth'
import { calculateMonthIndex, isDateInMonthIndex } from '@/utils/caisse-imprevue-utils'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import dynamic from 'next/dynamic'
import { requestFinalRefund, requestEarlyRefund } from '@/services/caisse/mutations'
import { listRefunds } from '@/db/caisse/refunds.db'
import RemboursementCIPDFModal from './RemboursementCIPDFModal'

const SupportRecognitionPDFModal = dynamic(() => import('./SupportRecognitionPDFModal'), {
  ssr: false,
})

interface DailyCIContractProps {
  contract: ContractCI
  document: any | null
  isLoadingDocument: boolean
}

// Hook personnalisé pour le carousel avec drag/swipe
const useCarousel = (itemCount: number, itemsPerView: number = 1) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [startPos, setStartPos] = useState(0)
  const [translateX, setTranslateX] = useState(0)
  const containerRef = React.useRef<HTMLDivElement>(null)

  const maxIndex = Math.max(0, itemCount - itemsPerView)

  const goTo = (index: number) => {
    const clampedIndex = Math.max(0, Math.min(index, maxIndex))
    setCurrentIndex(clampedIndex)
    setTranslateX(-clampedIndex * (100 / itemsPerView))
  }

  const goNext = () => goTo(currentIndex + 1)
  const goPrev = () => goTo(currentIndex - 1)

  const handleStart = (clientX: number) => {
    setIsDragging(true)
    setStartPos(clientX)
  }
  const handleMove = (clientX: number) => {
    if (!isDragging || !containerRef.current) return
    const diff = clientX - startPos
    const containerWidth = containerRef.current.offsetWidth
    const percentage = (diff / containerWidth) * 100
    const maxDrag = 30
    const clampedPercentage = Math.max(-maxDrag, Math.min(maxDrag, percentage))
    setTranslateX(-currentIndex * (100 / itemsPerView) + clampedPercentage)
  }
  const handleEnd = () => {
    if (!isDragging || !containerRef.current) return
    const dragDistance = translateX + currentIndex * (100 / itemsPerView)
    const threshold = 15
    if (dragDistance > threshold && currentIndex > 0) {
      goPrev()
    } else if (dragDistance < -threshold && currentIndex < maxIndex) {
      goNext()
    } else {
      setTranslateX(-currentIndex * (100 / itemsPerView))
    }
    setIsDragging(false)
  }

  const handleMouseDown = (e: React.MouseEvent) => { e.preventDefault(); handleStart(e.clientX) }
  const handleMouseMove = (e: React.MouseEvent) => { handleMove(e.clientX) }
  const handleMouseUp = () => { handleEnd() }
  const handleTouchStart = (e: React.TouchEvent) => { handleStart(e.touches[0].clientX) }
  const handleTouchMove = (e: React.TouchEvent) => { handleMove(e.touches[0].clientX) }
  const handleTouchEnd = () => { handleEnd() }

  React.useEffect(() => {
    if (!isDragging) return
    const handleGlobalMouseMove = (e: MouseEvent) => handleMove(e.clientX)
    const handleGlobalMouseUp = () => handleEnd()
    document.addEventListener('mousemove', handleGlobalMouseMove)
    document.addEventListener('mouseup', handleGlobalMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove)
      document.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [isDragging, startPos, currentIndex, itemsPerView, translateX])

  return {
    currentIndex,
    goTo,
    goNext,
    goPrev,
    canGoPrev: currentIndex > 0,
    canGoNext: currentIndex < maxIndex,
    translateX,
    containerRef,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    isDragging,
  }
}

// Composant pour les statistiques modernes
const StatsCard = ({
  title,
  value,
  subtitle,
  iconBgClass,
  iconColorClass,
  valueColorClass,
  icon: Icon
}: {
  title: string
  value: number | string
  subtitle?: string
  iconBgClass: string
  iconColorClass: string
  valueColorClass: string
  icon: React.ComponentType<any>
}) => {
  return (
    <Card className="border-0 shadow-lg h-full">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${iconBgClass}`}>
            <Icon className={`h-5 w-5 ${iconColorClass}`} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className={`font-bold text-lg ${valueColorClass}`}>
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Composant Carrousel des statistiques avec drag/swipe
const PaymentStatsCarousel = ({ contract, paymentStats }: { contract: ContractCI; paymentStats?: { totalAmountPaid: number; paymentCount: number; supportCount: number } }) => {
  const totalTarget = contract.subscriptionCINominal || 0
  const amountPaid = paymentStats?.totalAmountPaid || 0
  const progressPercentage = totalTarget > 0 ? Math.min(100, (amountPaid / totalTarget) * 100) : 0

  const statsData = [
    {
      title: 'Montant mensuel',
      value: `${contract.subscriptionCIAmountPerMonth.toLocaleString('fr-FR')} FCFA`,
      iconBgClass: 'bg-green-100',
      iconColorClass: 'text-green-600',
      valueColorClass: 'text-green-600',
      icon: DollarSign
    },
    {
      title: 'Durée du contrat',
      value: `${contract.subscriptionCIDuration} mois`,
      iconBgClass: 'bg-blue-100',
      iconColorClass: 'text-blue-600',
      valueColorClass: 'text-gray-900',
      icon: Calendar
    },
    {
      title: 'Nominal total',
      value: `${contract.subscriptionCINominal.toLocaleString('fr-FR')} FCFA`,
      iconBgClass: 'bg-purple-100',
      iconColorClass: 'text-purple-600',
      valueColorClass: 'text-purple-600',
      icon: DollarSign
    },
    {
      title: 'Versements effectués',
      value: paymentStats?.paymentCount || 0,
      iconBgClass: 'bg-indigo-100',
      iconColorClass: 'text-indigo-600',
      valueColorClass: 'text-indigo-600',
      icon: CheckCircle
    },
    {
      title: 'Montant actuel versé',
      value: `${(paymentStats?.totalAmountPaid || 0).toLocaleString('fr-FR')} FCFA`,
      iconBgClass: 'bg-teal-100',
      iconColorClass: 'text-teal-600',
      valueColorClass: 'text-teal-600',
      icon: DollarSign,
      subtitle: `${progressPercentage.toFixed(1)}% du total`
    },
    {
      title: 'Aides reçues',
      value: paymentStats?.supportCount || 0,
      iconBgClass: 'bg-amber-100',
      iconColorClass: 'text-amber-600',
      valueColorClass: 'text-amber-600',
      icon: HandCoins
    },
  ]

  const [itemsPerView, setItemsPerView] = useState(1)
  React.useEffect(() => {
    const update = () => {
      const w = window.innerWidth
      if (w >= 1280) setItemsPerView(4)
      else if (w >= 1024) setItemsPerView(3)
      else if (w >= 768) setItemsPerView(2)
      else setItemsPerView(1)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const { currentIndex, goTo, goNext, goPrev, canGoPrev, canGoNext, translateX, containerRef, handleMouseDown, handleTouchStart, handleTouchMove, handleTouchEnd, isDragging } = useCarousel(statsData.length, itemsPerView)

  return (
    <div className="relative">
      <div className="absolute top-1/2 -translate-y-1/2 left-0 z-10">
        <Button variant="outline" size="icon" className={cn('h-10 w-10 rounded-full bg-white/90 backdrop-blur-sm shadow-lg border-0 transition-all duration-300', canGoPrev ? 'hover:bg-white hover:scale-110 text-gray-700' : 'opacity-50 cursor-not-allowed')} onClick={goPrev} disabled={!canGoPrev}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
      </div>
      <div className="absolute top-1/2 -translate-y-1/2 right-0 z-10">
        <Button variant="outline" size="icon" className={cn('h-10 w-10 rounded-full bg-white/90 backdrop-blur-sm shadow-lg border-0 transition-all duration-300', canGoNext ? 'hover:bg-white hover:scale-110 text-gray-700' : 'opacity-50 cursor-not-allowed')} onClick={goNext} disabled={!canGoNext}>
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>
      <div ref={containerRef} className="ml-8 overflow-hidden py-2" onMouseDown={handleMouseDown} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
        <div className={cn('flex transition-transform duration-300 ease-out gap-4', isDragging && 'transition-none')} style={{ transform: `translateX(${translateX}%)`, cursor: isDragging ? 'grabbing' : 'grab' }}>
          {statsData.map((stat, index) => (
            <div key={index} className="flex-shrink-0 h-full" style={{ width: `calc(${100 / itemsPerView}% - ${(4 * (itemsPerView - 1)) / itemsPerView}rem)` }}>
              <StatsCard {...stat} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
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
  const [showRecognitionModal, setShowRecognitionModal] = useState(false)
  const [showRemboursementPdf, setShowRemboursementPdf] = useState(false)
  const [showReasonModal, setShowReasonModal] = useState(false)
  const [refundType, setRefundType] = useState<'FINAL' | 'EARLY' | null>(null)
  const [refundReasonInput, setRefundReasonInput] = useState('')
  const [isRefunding, setIsRefunding] = useState(false)
  const [refunds, setRefunds] = useState<any[]>([])
  const [showEarlyRefundModal, setShowEarlyRefundModal] = useState(false)
  const [showFinalRefundModal, setShowFinalRefundModal] = useState(false)

  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

  // Récupérer les paiements depuis Firestore
  const { data: payments = [], isLoading: isLoadingPayments } = usePaymentsCI(contract.id)
  const createVersementMutation = useCreateVersement()

  // Récupérer le support actif et l'éligibilité
  const { data: activeSupport, refetch: refetchActiveSupport } = useActiveSupport(contract.id)
  const { data: isEligible, refetch: refetchEligibility } = useCheckEligibilityForSupport(contract.id)
  const { data: supportsHistory = [] } = useSupportHistory(contract.id)
  
  // Récupérer les statistiques de paiement
  const { data: paymentStats } = useContractPaymentStats(contract.id)

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
      setSelectedDate(null)
    }
  }, [activeSupport, showRepaySupportModal])

  // Calculer l'index du mois actuel du calendrier par rapport à firstPaymentDate
  // Le mois est calculé en utilisant des cycles de 30 jours à partir de firstPaymentDate
  const currentMonthIndex = useMemo(() => {
    // Calculer le monthIndex basé sur le premier jour du mois calendaire affiché
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
    return calculateMonthIndex(firstDayOfMonth, contract.firstPaymentDate)
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
    // Calculer le monthIndex correct pour cette date spécifique
    const dateMonthIndex = calculateMonthIndex(date, contract.firstPaymentDate)
    
    // Récupérer le paiement du mois correspondant
    const payment = payments.find((p: any) => p.monthIndex === dateMonthIndex)
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
    
    // Si le contrat est résilié ou terminé, bloquer les nouveaux versements mais permettre l'accès aux reçus
    if (isContractTerminated) {
      if (existingPayment) {
        // Autoriser l'accès au reçu pour les jours payés
        setSelectedDate(date)
        setShowReceiptModal(true)
      } else {
        // Bloquer les versements sur les jours non payés
        toast.error(`Ce contrat est ${isContractCanceled ? 'résilié' : 'terminé'}. Les nouveaux versements ne sont plus autorisés.`)
      }
      return
    }
    
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
    
    // Calculer le monthIndex correct pour la date sélectionnée
    const dateMonthIndex = calculateMonthIndex(selectedDate, contract.firstPaymentDate)
    
    const payment = payments.find((p: any) => p.monthIndex === dateMonthIndex)
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

    // Calculer le monthIndex correct pour la date sélectionnée
    const dateMonthIndex = calculateMonthIndex(selectedDate, contract.firstPaymentDate)

    try {
      await createVersementMutation.mutateAsync({
        contractId: contract.id,
        monthIndex: dateMonthIndex,
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

    // Calculer le monthIndex correct pour la date sélectionnée
    const dateMonthIndex = calculateMonthIndex(selectedDate, contract.firstPaymentDate)

    const isFullyRepaid = data.amount >= activeSupport.amountRemaining
    const surplus = data.amount - activeSupport.amountRemaining

    try {
      await createVersementMutation.mutateAsync({
        contractId: contract.id,
        monthIndex: dateMonthIndex,
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
      setSelectedDate(null)

      // Forcer le refetch immédiat des données de support
      await Promise.all([
        refetchActiveSupport(),
        refetchEligibility()
      ])

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
  const canEarly = paidCount >= 1 && !allPaid && contract.status !== 'CANCELED' && contract.status !== 'FINISHED'
  const canFinal = allPaid && contract.status !== 'CANCELED' && contract.status !== 'FINISHED'
  const hasFinalRefund = refunds.some((r: any) => r.type === 'FINAL' && r.status !== 'ARCHIVED')
  const hasEarlyRefund = refunds.some((r: any) => r.type === 'EARLY' && r.status !== 'ARCHIVED')
  const isContractCanceled = contract.status === 'CANCELED'
  const isContractFinished = contract.status === 'FINISHED'
  const isContractTerminated = isContractCanceled || isContractFinished

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
            {isEligible && !activeSupport && !isContractTerminated && (
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

        {/* Statistiques de paiement - Carrousel */}
        <PaymentStatsCarousel contract={contract} paymentStats={paymentStats} />

        {/* Banner d'alerte si contrat résilié */}
        {isContractCanceled && (
          <Card className="border-0 shadow-lg border-2 border-red-300 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-red-900 mb-1">Contrat résilié</p>
                  <p className="text-sm text-red-700">
                    Ce contrat a été résilié suite à une demande de retrait anticipé. 
                    Les nouveaux versements ne sont plus autorisés. Vous pouvez toujours consulter 
                    les reçus des versements déjà effectués.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Banner d'alerte si contrat terminé */}
        {isContractFinished && (
          <Card className="border-0 shadow-lg border-2 border-blue-300 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-blue-900 mb-1">Contrat terminé</p>
                  <p className="text-sm text-blue-700">
                    Ce contrat a été terminé suite à une demande de remboursement final. 
                    Les nouveaux versements ne sont plus autorisés. Vous pouvez toujours consulter 
                    les reçus des versements déjà effectués.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Support à rembourser */}
        {activeSupport && activeSupport.status === 'ACTIVE' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
          </div>
        )}

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

                    // Si contrat résilié ou terminé, désactiver les jours non payés
                    const isDisabled = isContractTerminated && !hasPayment && isCurrentMonth && !isBeforeFirstPayment

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

                      if (isDisabled) {
                        // Style désactivé pour les jours non payés si contrat résilié
                        dayStyle = 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200 opacity-60'
                        dayContent = (
                          <div className="flex items-center justify-center gap-1 text-xs text-gray-400">
                            <XCircle className="h-3 w-3" />
                          </div>
                        )
                      } else if (isPastDay) {
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

                    if (isToday && isCurrentMonth && !isBeforeFirstPayment && !isDisabled) {
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
                        onClick={() => isCurrentMonth && !isBeforeFirstPayment && !isDisabled && onDateClick(date)}
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
                disabled={isRefunding || !canFinal || hasFinalRefund}
                onClick={() => setShowFinalRefundModal(true)}
              >
                <TrendingUp className="h-5 w-5" />
                Demander remboursement final
              </Button>
              
              <Button
                variant="outline"
                className="flex items-center justify-center gap-2 border-orange-300 text-orange-700 hover:bg-orange-50"
                disabled={isRefunding || !canEarly || hasEarlyRefund}
                onClick={() => setShowEarlyRefundModal(true)}
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

        {/* Modal de demande de retrait anticipé */}
        <EarlyRefundCIModal
          isOpen={showEarlyRefundModal}
          onClose={() => setShowEarlyRefundModal(false)}
          contract={contract}
        />

        {/* Modal de demande de remboursement final */}
        <FinalRefundCIModal
          isOpen={showFinalRefundModal}
          onClose={() => setShowFinalRefundModal(false)}
          contract={contract}
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

