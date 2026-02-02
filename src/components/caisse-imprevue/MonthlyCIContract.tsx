'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Calendar,
  CalendarDays,
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
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ContractCI } from '@/types/types'
import { getContractStatusConfig } from '@/utils/contract-status'
import routes from '@/constantes/routes'
import PaymentCIModal, { PaymentFormData } from './PaymentCIModal'
import PaymentReceiptCIModal from './PaymentReceiptCIModal'
import RequestSupportCIModal from './RequestSupportCIModal'
import SupportHistoryCIModal from './SupportHistoryCIModal'
import RepaySupportCIModal from './RepaySupportCIModal'
import EarlyRefundCIModal from './EarlyRefundCIModal'
import FinalRefundCIModal from './FinalRefundCIModal'
import MarkAsPaidRefundCIModal from './MarkAsPaidRefundCIModal'
import { toast } from 'sonner'
import { usePaymentsCI, useCreateVersement, useActiveSupport, useCheckEligibilityForSupport, useSupportHistory, useContractPaymentStats } from '@/hooks/caisse-imprevue'
import { useAuth } from '@/hooks/useAuth'
import { requestFinalRefund, requestEarlyRefund } from '@/services/caisse/mutations'
import { listRefundsCI, updateRefundCI } from '@/db/caisse/refunds.db'
import RemboursementCIPDFModal from './RemboursementCIPDFModal'
import SupportRecognitionPDFModal from './SupportRecognitionPDFModal'
import EmergencyContact from '@/components/contract/standard/EmergencyContact'

interface MonthlyCIContractProps {
  contract: ContractCI
  document?: any | null
  isLoadingDocument?: boolean
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
  }, [isDragging, startPos, currentIndex, itemsPerView, translateX, handleEnd, handleMove])

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

  const { goNext, goPrev, canGoPrev, canGoNext, translateX, containerRef, handleMouseDown, handleTouchStart, handleTouchMove, handleTouchEnd, isDragging } = useCarousel(statsData.length, itemsPerView)

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
          {statsData.map((stat, _index) => (
            <div key={_index} className="flex-shrink-0 h-full" style={{ width: `calc(${100 / itemsPerView}% - ${(4 * (itemsPerView - 1)) / itemsPerView}rem)` }}>
              <StatsCard {...stat} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function MonthlyCIContract({ contract, document: _document, isLoadingDocument: _isLoadingDocument }: MonthlyCIContractProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [showRequestSupportModal, setShowRequestSupportModal] = useState(false)
  const [showSupportHistoryModal, setShowSupportHistoryModal] = useState(false)
  const [showRepaySupportModal, setShowRepaySupportModal] = useState(false)
  const [showRemboursementPdf, setShowRemboursementPdf] = useState(false)
  const [showReasonModal, setShowReasonModal] = useState(false)
  const [refundType, setRefundType] = useState<'FINAL' | 'EARLY' | null>(null)
  const [refundReasonInput, setRefundReasonInput] = useState('')
  const [isRefunding, setIsRefunding] = useState(false)
  const [refunds, setRefunds] = useState<any[]>([])
  const [showEarlyRefundModal, setShowEarlyRefundModal] = useState(false)
  const [showFinalRefundModal, setShowFinalRefundModal] = useState(false)
  const [showReconnaissanceAccompagnement, setShowReconnaissanceAccompagnement] = useState(false)
  const [confirmApproveRefundId, setConfirmApproveRefundId] = useState<string | null>(null)
  const [refundToMarkAsPaid, setRefundToMarkAsPaid] = useState<{ id: string; label: string } | null>(null)

  // Récupérer les paiements depuis Firestore
  const { data: payments = [] } = usePaymentsCI(contract.id)
  const createVersementMutation = useCreateVersement()

  // Récupérer le support actif et l'éligibilité
  const { data: activeSupport, refetch: refetchActiveSupport } = useActiveSupport(contract.id)
  const { data: isEligible, refetch: refetchEligibility } = useCheckEligibilityForSupport(contract.id)
  const { data: supportHistory = [] } = useSupportHistory(contract.id)
  
  // Récupérer les statistiques de paiement
  const { data: paymentStats } = useContractPaymentStats(contract.id)

  // Fonction pour recharger les remboursements
  const reloadRefunds = React.useCallback(async () => {
    if (contract.id) {
      try {
        const refundsData = await listRefundsCI(contract.id)
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
    
    // Si le contrat est résilié ou terminé, bloquer les nouveaux versements mais permettre l'accès aux reçus
    if (isContractTerminated) {
      if (status === 'PAID') {
        // Autoriser l'accès au reçu pour les mois payés
        setSelectedMonthIndex(monthIndex)
        setShowReceiptModal(true)
      } else {
        // Bloquer les versements sur les mois non payés
        toast.error(`Ce contrat est ${isContractCanceled ? 'résilié' : 'terminé'}. Les nouveaux versements ne sont plus autorisés.`)
      }
      return
    }
    
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
          agentRecouvrementId: data.agentRecouvrementId,
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

  // Calculer les conditions pour les remboursements
  const paidCount = payments.filter((p: any) => p.status === 'PAID').length
  const totalMonths = contract.subscriptionCIDuration || 0
  const allPaid = totalMonths > 0 && paidCount >= totalMonths
  const canEarly = paidCount >= 1 && !allPaid && contract.status !== 'CANCELED' && contract.status !== 'FINISHED'
  const canFinal = allPaid && contract.status !== 'CANCELED' && contract.status !== 'FINISHED'

  // Calculer la progression des mois payés
  const progress = totalMonths > 0 ? Math.min(100, (paidCount / totalMonths) * 100) : 0
  const hasFinalRefund = refunds.some((r: any) => r.type === 'FINAL' && r.status !== 'ARCHIVED')
  const hasEarlyRefund = refunds.some((r: any) => r.type === 'EARLY' && r.status !== 'ARCHIVED')
  const isContractCanceled = contract.status === 'CANCELED'
  const isContractFinished = contract.status === 'FINISHED'
  const isContractTerminated = isContractCanceled || isContractFinished
  const headerStatusConfig = getContractStatusConfig(contract.status)
  const HeaderStatusIcon = headerStatusConfig.icon
  const headerBadges = (
    <>
      <Badge className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] text-white text-lg px-4 py-2">
        Contrat Mensuel CI
      </Badge>
      <Badge className={`${headerStatusConfig.bg} ${headerStatusConfig.text} text-lg px-4 py-2 flex items-center gap-1.5`}>
        <HeaderStatusIcon className="h-4 w-4" />
        {headerStatusConfig.label}
      </Badge>
      {activeSupport && activeSupport.status === 'ACTIVE' && (
        <Badge className="bg-orange-600 text-white px-3 py-1.5 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Support en cours
        </Badge>
      )}
    </>
  )

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 lg:p-8 overflow-x-hidden">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* En-tête avec bouton retour */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
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

            {/* Bouton Contact d'urgence */}
            <EmergencyContact emergencyContact={(contract as any)?.emergencyContact} />
          </div>

          <div className="hidden lg:flex flex-wrap gap-2">
            {headerBadges}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 lg:hidden">
          {headerBadges}
        </div>

        {/* Titre principal */}
        <Card className="border-0 shadow-xl bg-gradient-to-r from-[#234D65] to-[#2c5a73] overflow-hidden">
          <CardHeader className="overflow-hidden">
            <CardTitle className="text-xl sm:text-2xl lg:text-3xl font-black text-white flex items-center gap-3 break-words">
              <DollarSign className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 shrink-0" />
              <span className="break-words">{contract.memberFirstName} {contract.memberLastName}</span>
            </CardTitle>
            <div className="space-y-1 text-blue-100 break-words">
              <p className="text-sm sm:text-base lg:text-lg break-words">
                Contrat <span className="font-mono text-xs sm:text-sm break-all">#{contract.id}</span>
              </p>
              <p className="text-sm break-words">
                {contract.memberFirstName} {contract.memberLastName} - Forfait <span className="font-mono text-xs break-all">{contract.subscriptionCICode}</span>
              </p>
            </div>
          </CardHeader>
        </Card>

        {/* Statistiques de paiement - Carrousel */}
        <PaymentStatsCarousel contract={contract} paymentStats={paymentStats} />

        {/* Barre de progression */}
        <Card className="border-0 shadow-md">
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-[#234D65]" />
                <span>
                  Mois payés&nbsp;: <b>{paidCount}</b> / {totalMonths || '—'}
                </span>
              </div>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#234D65] to-[#2c5a73] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-sm text-slate-700">
              Montant payé&nbsp;: <b>{(paymentStats?.totalAmountPaid || 0).toLocaleString('fr-FR')} FCFA</b>
            </div>
          </CardContent>
        </Card>

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

                    const isDisabled = isContractTerminated && status !== 'PAID'
                    
                    return (
                      <Card
                        key={monthIndex}
                        className={`transition-all duration-300 border-2 ${
                          isDisabled
                            ? 'border-gray-200 bg-gray-100 cursor-not-allowed opacity-60'
                            : status === 'PAID' 
                            ? 'border-green-200 bg-green-50/50 cursor-pointer hover:shadow-lg hover:-translate-y-1' 
                            : 'border-gray-200 hover:border-[#224D62] cursor-pointer hover:shadow-lg hover:-translate-y-1'
                        }`}
                        onClick={() => !isDisabled && handleMonthClick(monthIndex)}
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
                            {/* Date d'échéance */}
                            {(() => {
                              const firstPaymentDate = contract.firstPaymentDate ? new Date(contract.firstPaymentDate) : null
                              const dueDate = firstPaymentDate ? new Date(firstPaymentDate) : null
                              if (dueDate) {
                                dueDate.setMonth(dueDate.getMonth() + monthIndex)
                              }
                              return dueDate ? (
                                <div className="flex items-center justify-between text-sm pb-2 border-b border-gray-200">
                                  <span className="text-gray-600 flex items-center gap-1">
                                    <CalendarDays className="h-3 w-3" />
                                    Date d'échéance:
                                  </span>
                                  <span className="font-semibold text-gray-900">
                                    {dueDate.toLocaleDateString('fr-FR', { 
                                      day: 'numeric', 
                                      month: 'long', 
                                      year: 'numeric' 
                                    })}
                                  </span>
                                </div>
                              ) : null
                            })()}

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
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-6">
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

              <Button
                variant="outline"
                className="flex items-center justify-center gap-2 border-teal-300 text-teal-700 hover:bg-teal-50"
                onClick={() => setShowReconnaissanceAccompagnement(true)}
              >
                <FileSignature className="h-5 w-5" />
                Reconnaissance d&apos;accompagnement
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
                            {r.status === 'PENDING' && (
                              <p className="text-xs text-amber-600 mt-1.5">
                                En attente d&apos;approbation par l&apos;administrateur
                              </p>
                            )}
                            {r.status === 'APPROVED' && (
                              <p className="text-xs text-blue-600 mt-1.5">
                                En attente du versement effectif au membre
                              </p>
                            )}
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
                        {r.status === 'PAID' && r.paymentProofUrl && (
                          <div className="pt-3 border-t border-gray-100">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-gray-600">Preuve de paiement:</span>
                              <a
                                href={r.paymentProofUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-600 hover:underline font-medium flex items-center gap-1"
                              >
                                <Download className="h-4 w-4" />
                                Télécharger
                              </a>
                            </div>
                          </div>
                        )}
                        {r.status === 'PAID' && (r.paidByName || r.paidAt) && (
                          <div className="pt-2 space-y-1 text-xs text-gray-500">
                            {r.paidByName && <p>Marqué par: {r.paidByName}</p>}
                            {r.paidAt && <p>Le {new Date(r.paidAt).toLocaleDateString('fr-FR')} à {new Date(r.paidAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>}
                          </div>
                        )}
                      </div>

                      {(r.status === 'PENDING' || r.status === 'APPROVED') && (
                        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-2">
                          {r.status === 'PENDING' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-green-300 text-green-600 hover:bg-green-50"
                                onClick={() => setConfirmApproveRefundId(r.id)}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approuver
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-indigo-300 text-indigo-600 hover:bg-indigo-50"
                                onClick={() => setShowRemboursementPdf(true)}
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Document de remboursement
                              </Button>
                            </>
                          )}
                          {r.status === 'APPROVED' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-green-300 text-green-600 hover:bg-green-50"
                              onClick={() => setRefundToMarkAsPaid({ id: r.id, label: r.type === 'FINAL' ? 'Remboursement Final' : 'Retrait Anticipé' })}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Marquer comme payé
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Modal de confirmation d'approbation du remboursement */}
        {confirmApproveRefundId && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
            <div className="w-full max-w-sm rounded-2xl border bg-white p-5 shadow-xl">
              <div className="text-base font-semibold">Confirmer l&apos;approbation</div>
              <p className="mt-1 text-sm text-slate-600">Voulez-vous approuver ce remboursement ?</p>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setConfirmApproveRefundId(null)}>
                  Annuler
                </Button>
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] text-white"
                  onClick={async () => {
                    if (!confirmApproveRefundId) return
                    try {
                      await updateRefundCI(contract.id, confirmApproveRefundId, { status: 'APPROVED' })
                      setConfirmApproveRefundId(null)
                      await reloadRefunds()
                      toast.success('Remboursement approuvé')
                    } catch (err: any) {
                      toast.error(err?.message || 'Erreur lors de l\'approbation')
                    }
                  }}
                >
                  Confirmer
                </Button>
              </div>
            </div>
          </div>
        )}

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

        {/* Modal Reconnaissance d'accompagnement */}
        <SupportRecognitionPDFModal
          isOpen={showReconnaissanceAccompagnement}
          onClose={() => setShowReconnaissanceAccompagnement(false)}
          contract={{
            memberFirstName: contract.memberFirstName,
            memberLastName: contract.memberLastName,
            subscriptionCICode: contract.subscriptionCICode,
            subscriptionCIAmountPerMonth: contract.subscriptionCIAmountPerMonth,
            firstPaymentDate: contract.firstPaymentDate,
            createdAt: contract.createdAt,
          }}
          support={
            activeSupport || supportHistory[0]
              ? { approvedAt: (activeSupport || supportHistory[0]).approvedAt }
              : null
          }
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
          onSuccess={reloadRefunds}
        />

        {/* Modal Marquer comme payé */}
        {refundToMarkAsPaid && user?.uid && (
          <MarkAsPaidRefundCIModal
            isOpen={!!refundToMarkAsPaid}
            onClose={() => setRefundToMarkAsPaid(null)}
            contractId={contract.id}
            refundId={refundToMarkAsPaid.id}
            refundLabel={refundToMarkAsPaid.label}
            onSuccess={reloadRefunds}
            userId={user.uid}
          />
        )}
      </div>
    </div>
  )
}

