'use client'

import React, { useState, useEffect, useRef } from 'react'
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
  User,
  Shield,
  FileText,
  Receipt,
  Upload,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CreditContract, CreditPayment, CreditPenalty, CreditInstallment, CreditContractStatus } from '@/types/types'
import routes from '@/constantes/routes'
import { toast } from 'sonner'
import { useCreditPaymentsByCreditId, useCreditPenaltiesByCreditId, useCreditInstallmentsByCreditId, useCreditContractMutations } from '@/hooks/useCreditSpeciale'
import CreditPaymentModal from './CreditPaymentModal'
import PaymentReceiptModal from './PaymentReceiptModal'
import CreditHistoryTimeline from './CreditHistoryTimeline'
import { useAuth } from '@/hooks/useAuth'
import { useQueryClient } from '@tanstack/react-query'
import { ServiceFactory } from '@/factories/ServiceFactory'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface CreditContractDetailProps {
  contract: CreditContract
}

// Fonction d'arrondi personnalisée
const customRound = (num: number): number => {
  const decimal = num - Math.floor(num)
  if (decimal < 0.5) {
    return Math.floor(num)
  }
  return Math.ceil(num)
}

// Interface pour une échéance
interface DueItem {
  month: number
  date: Date
  payment: number
  interest: number
  principal: number
  remaining: number
  status: 'PAID' | 'DUE' | 'FUTURE'
  paidAmount?: number
  paymentDate?: Date
}

// Composant pour les statistiques modernes (même design que StatisticsCreditDemandes)
const StatsCard = ({
  title,
  value,
  subtitle,
  color,
  icon: Icon
}: {
  title: string
  value: number | string
  subtitle?: string
  color: string
  icon: React.ComponentType<any>
}) => {
  return (
    <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-white to-gray-50/50 border-0 shadow-md">
      <CardContent className="p-4">
        <div className="flex items-center space-x-3">
          <div className={`p-2.5 rounded-xl bg-gradient-to-br transition-transform duration-300 group-hover:scale-110`} style={{ backgroundColor: `${color}15`, color: color }}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-600 uppercase tracking-wider">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
            {subtitle && (
              <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Hook personnalisé pour le carousel avec drag/swipe (même que StatisticsCreditDemandes)
const useCarouselStats = (itemCount: number, itemsPerView: number = 1) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [startPos, setStartPos] = useState(0)
  const [translateX, setTranslateX] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

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

  const handleTouchStart = (e: React.TouchEvent) => { handleStart(e.touches[0].clientX) }
  const handleTouchMove = (e: React.TouchEvent) => { handleMove(e.touches[0].clientX) }
  const handleTouchEnd = () => { handleEnd() }

  useEffect(() => {
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
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    isDragging,
  }
}

// Carrousel de statistiques (même design que StatisticsCreditDemandes)
const ContractStatsCarousel = ({ contract, penalties = [] }: { contract: CreditContract; penalties?: CreditPenalty[] }) => {
  const [itemsPerView, setItemsPerView] = useState(1)
  
  useEffect(() => {
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

  // Calculer la somme des pénalités impayées
  const unpaidPenaltiesTotal = penalties
    .filter(p => !p.paid)
    .reduce((sum, p) => sum + p.amount, 0)
  const unpaidPenaltiesCount = penalties.filter(p => !p.paid).length

  const statsData = [
    {
      title: 'Montant emprunté',
      value: contract.amount.toLocaleString('fr-FR'),
      color: '#3b82f6',
      icon: DollarSign
    },
    {
      title: 'Montant versé',
      value: contract.amountPaid.toLocaleString('fr-FR'),
      color: '#10b981',
      icon: CheckCircle
    },
    {
      title: 'Montant restant',
      value: Math.round(contract.amountRemaining).toLocaleString('fr-FR'),
      color: '#f59e0b',
      icon: Clock
    },
    {
      title: 'Pourcentage remboursé',
      value: contract.totalAmount > 0 
        ? `${((contract.amountPaid / contract.totalAmount) * 100).toFixed(1)}%`
        : '0%',
      subtitle: contract.totalAmount > 0 
        ? `${contract.amountPaid.toLocaleString('fr-FR')} / ${Math.round(contract.totalAmount).toLocaleString('fr-FR')} FCFA`
        : 'Aucun paiement enregistré',
      color: '#8b5cf6',
      icon: TrendingUp
    },
    {
      title: 'Pénalités impayées',
      value: Math.round(unpaidPenaltiesTotal).toLocaleString('fr-FR'),
      subtitle: unpaidPenaltiesTotal > 0 
        ? `${unpaidPenaltiesCount} pénalité${unpaidPenaltiesCount > 1 ? 's' : ''}`
        : 'Aucune pénalité impayée',
      color: '#ef4444',
      icon: AlertCircle
    },
  ]

  const { 
    currentIndex, 
    goNext, 
    goPrev, 
    canGoPrev, 
    canGoNext, 
    translateX, 
    containerRef, 
    handleTouchStart, 
    handleTouchMove, 
    handleTouchEnd, 
    isDragging 
  } = useCarouselStats(statsData.length, itemsPerView)

  return (
    <div className="relative">
      <div className="absolute top-1/2 -translate-y-1/2 left-0 z-10">
        <Button 
          variant="outline" 
          size="icon" 
          className={cn(
            'h-10 w-10 rounded-full bg-white/90 backdrop-blur-sm shadow-lg border-0 transition-all duration-300',
            canGoPrev ? 'hover:bg-white hover:scale-110 text-gray-700' : 'opacity-50 cursor-not-allowed'
          )} 
          onClick={goPrev} 
          disabled={!canGoPrev}
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
      </div>
      <div className="absolute top-1/2 -translate-y-1/2 right-0 z-10">
        <Button 
          variant="outline" 
          size="icon" 
          className={cn(
            'h-10 w-10 rounded-full bg-white/90 backdrop-blur-sm shadow-lg border-0 transition-all duration-300',
            canGoNext ? 'hover:bg-white hover:scale-110 text-gray-700' : 'opacity-50 cursor-not-allowed'
          )} 
          onClick={goNext} 
          disabled={!canGoNext}
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>
      <div 
        ref={containerRef} 
        className="ml-8 mr-8 overflow-hidden py-2" 
        onTouchStart={handleTouchStart} 
        onTouchMove={handleTouchMove} 
        onTouchEnd={handleTouchEnd}
      >
        <div 
          className={cn('flex transition-transform duration-300 ease-out gap-4', isDragging && 'transition-none')} 
          style={{ 
            transform: `translateX(${translateX}%)`, 
            cursor: isDragging ? 'grabbing' : 'grab' 
          }}
        >
          {statsData.map((stat, index) => (
            <div 
              key={index} 
              className="flex-shrink-0" 
              style={{ width: `calc(${100 / itemsPerView}% - ${(4 * (itemsPerView - 1)) / itemsPerView}rem)` }}
            >
              <StatsCard {...stat} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Fonction pour obtenir la configuration du statut
const getStatusConfig = (status: CreditContractStatus) => {
  const configs: Record<CreditContractStatus, { label: string; color: string; bgColor: string }> = {
    DRAFT: { label: 'Brouillon', color: 'text-gray-600', bgColor: 'bg-gray-100' },
    PENDING: { label: 'En attente', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
    APPROVED: { label: 'Approuvé', color: 'text-blue-600', bgColor: 'bg-blue-100' },
    SIMULATED: { label: 'Simulé', color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
    ACTIVE: { label: 'Actif', color: 'text-green-600', bgColor: 'bg-green-100' },
    OVERDUE: { label: 'En retard', color: 'text-orange-600', bgColor: 'bg-orange-100' },
    PARTIAL: { label: 'Partiel', color: 'text-amber-600', bgColor: 'bg-amber-100' },
    TRANSFORMED: { label: 'Transformé', color: 'text-purple-600', bgColor: 'bg-purple-100' },
    BLOCKED: { label: 'Bloqué', color: 'text-red-600', bgColor: 'bg-red-100' },
    DISCHARGED: { label: 'Déchargé', color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
    CLOSED: { label: 'Clos', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  }
  return configs[status] || configs.DRAFT
}

export default function CreditContractDetail({ contract }: CreditContractDetailProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<CreditPayment | null>(null)
  const [selectedDueIndex, setSelectedDueIndex] = useState<number | null>(null)
  const [selectedDueIndexForReceipt, setSelectedDueIndexForReceipt] = useState<number | null>(null)
  const [penaltyOnlyMode, setPenaltyOnlyMode] = useState(false)
  const [showUploadContractModal, setShowUploadContractModal] = useState(false)
  const [contractFile, setContractFile] = useState<File | undefined>()
  const [isCompressing, setIsCompressing] = useState(false)
  const { generateContractPDF, uploadSignedContract } = useCreditContractMutations()

  // Récupérer les paiements, pénalités et échéances
  const { data: payments = [], isLoading: isLoadingPayments } = useCreditPaymentsByCreditId(contract.id)
  const { data: penalties = [], isLoading: isLoadingPenalties } = useCreditPenaltiesByCreditId(contract.id)
  const { data: installments = [], isLoading: isLoadingInstallments } = useCreditInstallmentsByCreditId(contract.id)
  const queryClient = useQueryClient()

  // Vérifier et créer les pénalités manquantes au chargement
  useEffect(() => {
    if (!isLoadingPayments && payments.length > 0) {
      const service = ServiceFactory.getCreditSpecialeService()
      service.checkAndCreateMissingPenalties(contract.id)
        .then(() => {
          // Rafraîchir les pénalités après vérification
          queryClient.invalidateQueries({ queryKey: ['creditPenalties', contract.id] })
        })
        .catch((error: unknown) => {
          console.error('Erreur lors de la vérification des pénalités:', error)
        })
    }
  }, [contract.id, payments.length, isLoadingPayments, queryClient])

  const statusConfig = getStatusConfig(contract.status)
  const progressPercentage = contract.totalAmount > 0 
    ? (contract.amountPaid / contract.totalAmount) * 100 
    : 0

  const formatDate = (date: Date | undefined) => {
    if (!date) return 'N/A'
    const dateObj = new Date(date)
    if (isNaN(dateObj.getTime())) return 'N/A'
    return format(dateObj, 'dd MMMM yyyy', { locale: fr })
  }

  const formatDateTime = (date: Date, time: string) => {
    const dateObj = new Date(date)
    if (isNaN(dateObj.getTime())) return 'N/A'
    return `${format(dateObj, 'dd MMMM yyyy', { locale: fr })} à ${time}`
  }

  // Calculer les échéances - utiliser les installments réels si disponibles, sinon calculer
  const calculateDueItems = (): DueItem[] => {
    // Si on a des installments réels, les utiliser
    if (installments.length > 0 && !isLoadingInstallments) {
      return installments.map((installment) => {
        let status: 'PAID' | 'DUE' | 'FUTURE' = 'FUTURE'
        
        if (installment.status === 'PAID') {
          status = 'PAID'
        } else if (installment.status === 'DUE' || installment.status === 'OVERDUE') {
          status = 'DUE'
        } else {
          status = 'FUTURE'
        }

        return {
          month: installment.installmentNumber,
          date: new Date(installment.dueDate),
          payment: installment.totalAmount, // Montant total (principal + intérêts)
          interest: installment.interestAmount,
          principal: installment.principalAmount,
          remaining: installment.remainingAmount,
          status,
          paidAmount: installment.paidAmount > 0 ? installment.paidAmount : undefined,
          paymentDate: installment.paidAt ? new Date(installment.paidAt) : undefined,
        }
      })
    }

    // Fallback : calculer manuellement si pas d'installments
    const monthlyRate = contract.interestRate / 100
    const firstDate = new Date(contract.firstPaymentDate)
    const paymentAmount = contract.monthlyPaymentAmount
    const maxDuration = contract.duration
    
    let remaining = contract.amount
    const items: DueItem[] = []

    // Trier les paiements par date (exclure les paiements de pénalités uniquement du calcul)
    const sortedPayments = [...payments]
      .filter(p => p.amount > 0 || !p.comment?.includes('Paiement de pénalités uniquement'))
      .sort((a, b) => 
        new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime()
      )

    // Calculer le total payé (uniquement les paiements de mensualités, pas les pénalités)
    const totalPaid = sortedPayments.reduce((sum, p) => sum + p.amount, 0)
    let accumulatedPaid = 0

    for (let i = 0; i < maxDuration; i++) {
      if (remaining <= 0) break

      const date = new Date(firstDate)
      date.setMonth(date.getMonth() + i)
      
      const interest = remaining * monthlyRate
      const balanceWithInterest = remaining + interest
      
      // paymentAmount représente le capital (mensualité de base), le montant total à payer = capital + intérêts
      let payment: number
      let principalPart: number
      
      if (remaining < paymentAmount) {
        // Dernière échéance : payer le solde complet avec intérêts
        payment = balanceWithInterest
        principalPart = remaining
        remaining = 0
      } else {
        // Le montant total à payer = capital (paymentAmount) + intérêts
        const totalPaymentAmount = paymentAmount + interest
        // S'assurer qu'on ne dépasse pas balanceWithInterest
        payment = Math.min(totalPaymentAmount, balanceWithInterest)
        principalPart = paymentAmount // Le capital est toujours paymentAmount
        remaining = Math.max(0, balanceWithInterest - payment)
      }

      // Déterminer le statut de cette échéance
      let status: 'PAID' | 'DUE' | 'FUTURE' = 'FUTURE'
      let paidAmount = 0
      let paymentDate: Date | undefined

      // Vérifier si cette échéance est payée
      // Utiliser une tolérance pour les arrondis (1 FCFA)
      const expectedTotalForThisDue = accumulatedPaid + payment
      const tolerance = 1
      
      // Arrondir les valeurs pour la comparaison
      const roundedTotalPaid = Math.round(totalPaid)
      const roundedExpectedTotal = Math.round(expectedTotalForThisDue)
      const roundedAccumulatedPaid = Math.round(accumulatedPaid)
      
      if (roundedTotalPaid >= roundedExpectedTotal - tolerance) {
        status = 'PAID'
        paidAmount = payment
        // Trouver le paiement qui correspond à cette échéance
        let tempAccumulated = accumulatedPaid
        for (const p of sortedPayments) {
          tempAccumulated += p.amount
          if (tempAccumulated >= expectedTotalForThisDue - tolerance) {
            paymentDate = new Date(p.paymentDate)
            break
          }
        }
        accumulatedPaid += payment
      } else {
        // Cette échéance n'est pas encore payée
        // Vérifier si toutes les échéances précédentes sont payées
        // Si totalPaid >= accumulatedPaid, cela signifie que toutes les échéances précédentes sont payées
        // (car accumulatedPaid contient la somme de toutes les échéances précédentes qui sont payées)
        if (roundedTotalPaid >= roundedAccumulatedPaid - tolerance) {
          // Toutes les précédentes sont payées, cette échéance est DUE
          status = 'DUE'
        } else {
          // Au moins une échéance précédente n'est pas payée, cette échéance est FUTURE
          status = 'FUTURE'
        }
      }

      items.push({
        month: i + 1,
        date,
        payment: customRound(payment), // Montant total à payer (principal + intérêts)
        interest: customRound(interest),
        principal: customRound(principalPart), // Partie principale du paiement
        remaining: customRound(remaining),
        status,
        paidAmount: status === 'PAID' ? paidAmount : undefined,
        paymentDate,
      })
    }

    return items
  }

  const dueItems = calculateDueItems()
  const nextDueIndex = dueItems.findIndex(item => item.status === 'DUE')
  
  // Debug: log pour comprendre le problème
  useEffect(() => {
    if (dueItems.length > 0) {
      console.log('Due items calculés:', dueItems.map((item, idx) => ({
        month: item.month,
        status: item.status,
        payment: item.payment,
        index: idx,
        date: formatDate(item.date)
      })))
      console.log('Next due index:', nextDueIndex)
      console.log('Total payé:', payments.filter(p => p.amount > 0 || !p.comment?.includes('Pénalités')).reduce((sum, p) => sum + p.amount, 0))
    }
  }, [dueItems, nextDueIndex, payments])

  // Fonction pour récupérer le paiement sélectionné pour le reçu
  const getSelectedPaymentForReceipt = (): CreditPayment | null => {
    if (selectedDueIndexForReceipt === null) return null
    
    const dueItem = dueItems[selectedDueIndexForReceipt]
    if (!dueItem || !dueItem.paymentDate) return null

    // Utiliser la date de paiement stockée dans l'échéance pour trouver le paiement correspondant
    const duePaymentDate = new Date(dueItem.paymentDate)
    duePaymentDate.setHours(0, 0, 0, 0)

    // Trouver le paiement qui correspond à cette date
    const matchingPayment = payments.find(p => {
      const paymentDate = new Date(p.paymentDate)
      paymentDate.setHours(0, 0, 0, 0)
      // Comparer les dates (tolérance de 1 jour pour les différences d'heure)
      return Math.abs(paymentDate.getTime() - duePaymentDate.getTime()) <= 24 * 60 * 60 * 1000
    })

    return matchingPayment || null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => router.push(routes.admin.creditSpecialeContrats)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux contrats
          </Button>
          <Badge className={cn('px-4 py-1.5 text-sm font-medium', statusConfig.bgColor, statusConfig.color)}>
            {statusConfig.label}
          </Badge>
        </div>

        {/* Statistiques */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Statistiques</h3>
          <ContractStatsCarousel contract={contract} penalties={penalties} />
        </div>

        {/* Informations principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Informations du contrat */}
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Informations du contrat
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Type de crédit</p>
                <p className="text-lg font-semibold">{contract.creditType}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Taux d'intérêt</p>
                <p className="text-lg font-semibold">{contract.interestRate}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Durée</p>
                <p className="text-lg font-semibold">{contract.duration} mois</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Mensualité</p>
                <p className="text-lg font-semibold">{contract.monthlyPaymentAmount.toLocaleString('fr-FR')} FCFA</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Premier versement</p>
                <p className="text-lg font-semibold">{formatDate(contract.firstPaymentDate)}</p>
              </div>
              {contract.nextDueAt && (
                <div>
                  <p className="text-sm text-gray-600">Prochaine échéance</p>
                  <p className="text-lg font-semibold">{formatDate(contract.nextDueAt)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Informations client et garant */}
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Client et garant
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Client</p>
                <p className="text-lg font-semibold">{contract.clientFirstName} {contract.clientLastName}</p>
                <p className="text-sm text-gray-500">{contract.clientContacts.join(', ')}</p>
              </div>
              {contract.guarantorId && (
                <div>
                  <p className="text-sm text-gray-600 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Garant
                  </p>
                  <p className="text-lg font-semibold">
                    {contract.guarantorFirstName} {contract.guarantorLastName}
                  </p>
                  {contract.guarantorRelation && (
                    <p className="text-sm text-gray-500">Relation : {contract.guarantorRelation}</p>
                  )}
                  <div className="flex gap-2 mt-2">
                    {contract.guarantorIsMember && (
                      <Badge variant="outline" className="text-xs">Membre</Badge>
                    )}
                    {contract.guarantorIsParrain && (
                      <Badge variant="outline" className="text-xs">Parrain</Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Barre de progression */}
        <Card className="border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Progression du remboursement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Remboursé</span>
                <span className="font-semibold">{progressPercentage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#234D65] to-[#2c5a73] transition-all duration-500 rounded-full"
                  style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>{contract.amountPaid.toLocaleString('fr-FR')} FCFA</span>
                <span>{contract.totalAmount.toLocaleString('fr-FR')} FCFA</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Échéancier de paiement */}
        <Card className="border-0 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-indigo-100/50 border-b">
            <CardTitle className="flex items-center gap-2 text-indigo-700">
              <CalendarDays className="h-5 w-5" />
              Échéancier de paiement
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {isLoadingPayments ? (
              <div className="text-center py-8 text-gray-500">Chargement...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dueItems.map((item, index) => {
                  // Désactiver si le contrat n'est pas actif ou partiel, si l'échéance est future, ou si ce n'est pas la prochaine échéance à payer
                  // nextDueIndex peut être -1 si aucune échéance DUE n'est trouvée, donc on vérifie >= 0
                  // Permettre les paiements si le contrat est ACTIVE ou PARTIAL
                  const canMakePayments = contract.status === 'ACTIVE' || contract.status === 'PARTIAL'
                  const isDisabled = !canMakePayments || 
                                   item.status === 'FUTURE' || 
                                   (item.status === 'DUE' && nextDueIndex >= 0 && index !== nextDueIndex) ||
                                   (item.status === 'PAID')
                  
                  const statusConfig = item.status === 'PAID' 
                    ? { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', icon: CheckCircle, label: 'Payé' }
                    : item.status === 'DUE'
                    ? { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', icon: Clock, label: 'À payer' }
                    : { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', icon: XCircle, label: 'À venir' }
                  const StatusIcon = statusConfig.icon

                  return (
                    <Card
                      key={index}
                      className={cn(
                        'transition-all duration-300 border-2',
                        isDisabled
                          ? 'border-gray-200 bg-gray-100 cursor-not-allowed opacity-60'
                          : item.status === 'PAID'
                          ? 'border-green-200 bg-green-50/50 cursor-pointer hover:shadow-lg hover:-translate-y-1'
                          : 'border-gray-200 hover:border-[#224D62] cursor-pointer hover:shadow-lg hover:-translate-y-1'
                      )}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="bg-[#224D62] text-white rounded-lg px-3 py-1 text-sm font-bold">
                              Échéance {item.month}
                            </div>
                          </div>
                          <Badge className={`${statusConfig.bg} ${statusConfig.text} ${statusConfig.border} border`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig.label}
                          </Badge>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Date:</span>
                            <span className="font-semibold text-gray-900">
                              {formatDate(item.date)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Montant à payer:</span>
                            <span className="font-semibold text-gray-900">
                              {item.payment.toLocaleString('fr-FR')} FCFA
                            </span>
                          </div>
                          
                          {/* Détail principal + intérêts */}
                          <div className="flex items-center justify-between text-xs text-gray-500 mt-1 pt-1 border-t border-gray-200">
                            <span>Capital: {item.principal.toLocaleString('fr-FR')} FCFA</span>
                            <span>Intérêts: {item.interest.toLocaleString('fr-FR')} FCFA</span>
                          </div>

                          {item.status === 'PAID' && item.paymentDate && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Payé le:</span>
                              <span className="font-semibold text-green-600">
                                {formatDate(item.paymentDate)}
                              </span>
                            </div>
                          )}

                          {item.status === 'DUE' && (
                            <Button
                              onClick={() => {
                                setSelectedDueIndex(index)
                                setShowPaymentModal(true)
                              }}
                              className="w-full bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65]"
                              disabled={isDisabled}
                            >
                              <HandCoins className="h-4 w-4 mr-2" />
                              Payer cette échéance
                            </Button>
                          )}

                          {item.status === 'PAID' && (
                            <Button
                              variant="outline"
                              onClick={() => {
                                setSelectedDueIndexForReceipt(index)
                                setShowReceiptModal(true)
                              }}
                              className="w-full border-green-300 text-green-700 hover:bg-green-50"
                            >
                              <Receipt className="h-4 w-4 mr-2" />
                              Voir le reçu
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}

            {/* Information */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>ℹ️ Information :</strong> Les échéances doivent être payées dans l'ordre. Vous ne pouvez payer une échéance que si toutes les précédentes sont payées.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Historique des versements */}
        <Card className="border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Historique des versements
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingPayments ? (
              <div className="text-center py-8 text-gray-500">Chargement...</div>
            ) : payments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">Aucun versement enregistré</div>
            ) : (
              <div className="space-y-3">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => {
                      setSelectedPayment(payment)
                      setShowReceiptModal(true)
                    }}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="font-semibold">
                          {formatDateTime(payment.paymentDate, payment.paymentTime)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        {payment.amount === 0 && payment.comment?.includes('Paiement de pénalités uniquement') ? (
                          <>
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                              Pénalités uniquement
                            </Badge>
                            <span>Mode : {payment.mode}</span>
                            {payment.note !== undefined && (
                              <span>Note pénalités : {payment.note}/10</span>
                            )}
                          </>
                        ) : (
                          <>
                            <span>Montant : {payment.amount.toLocaleString('fr-FR')} FCFA</span>
                            <span>Mode : {payment.mode}</span>
                            {payment.note !== undefined && (
                              <span>Note : {payment.note}/10</span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <Receipt className="h-5 w-5 text-gray-400" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pénalités */}
        {penalties.length > 0 && (
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  Pénalités
                </CardTitle>
                {penalties.filter(p => !p.paid).length > 0 && (
                  <Button
                    onClick={() => {
                      setSelectedDueIndex(null) // Pas d'échéance spécifique pour les pénalités
                      setPenaltyOnlyMode(true) // Activer le mode pénalités uniquement
                      setShowPaymentModal(true)
                    }}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    <HandCoins className="h-4 w-4 mr-2" />
                    Payer les pénalités
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {penalties.map((penalty) => (
                  <div
                    key={penalty.id}
                    className={cn(
                      'flex items-center justify-between p-4 border rounded-lg',
                      penalty.paid ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'
                    )}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">
                          {penalty.amount.toLocaleString('fr-FR')} FCFA
                        </span>
                        {penalty.paid ? (
                          <Badge className="bg-green-100 text-green-700">Payée</Badge>
                        ) : (
                          <Badge className="bg-orange-100 text-orange-700">Impayée</Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        <span>Retard : {penalty.daysLate} jours</span>
                        <span className="ml-4">Échéance : {formatDate(penalty.dueDate)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Historique complet */}
        <CreditHistoryTimeline contractId={contract.id} />

        {/* Documents */}
        <Card className="border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSignature className="h-5 w-5" />
              Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Actions pour générer/uploader contrat */}
              {contract.status === 'PENDING' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <Button
                    variant="outline"
                    className="justify-start bg-white hover:bg-blue-50"
                    onClick={async () => {
                      try {
                        const result = await generateContractPDF.mutateAsync({
                          contractId: contract.id,
                          blank: true,
                        })
                        if (result.url) {
                          window.open(result.url, '_blank')
                        } else {
                          toast.info('Contrat PDF généré. Le téléchargement va commencer.')
                        }
                      } catch (error: any) {
                        toast.error(error?.message || 'Erreur lors de la génération du contrat')
                      }
                    }}
                    disabled={generateContractPDF.isPending}
                  >
                    {generateContractPDF.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Génération...
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4 mr-2" />
                        Générer contrat vierge
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start bg-white hover:bg-blue-50"
                    onClick={() => setShowUploadContractModal(true)}
                    disabled={uploadSignedContract.isPending}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Uploader contrat signé
                  </Button>
                </div>
              )}

              {/* Documents existants */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {contract.contractUrl && (
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => window.open(contract.contractUrl, '_blank')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Contrat PDF
                  </Button>
                )}
                {contract.signedContractUrl && (
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => window.open(contract.signedContractUrl, '_blank')}
                  >
                    <FileSignature className="h-4 w-4 mr-2" />
                    Contrat signé
                  </Button>
                )}
                {contract.dischargeUrl && (
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => window.open(contract.dischargeUrl, '_blank')}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Décharge
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <CreditPaymentModal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false)
          setSelectedDueIndex(null)
          setPenaltyOnlyMode(false)
        }}
        creditId={contract.id}
        defaultAmount={selectedDueIndex !== null ? dueItems[selectedDueIndex]?.payment : contract.monthlyPaymentAmount}
        defaultPaymentDate={selectedDueIndex !== null ? dueItems[selectedDueIndex]?.date : undefined}
        defaultPenaltyOnlyMode={penaltyOnlyMode}
        onSuccess={() => {
          // Invalider explicitement le cache des pénalités pour rafraîchir l'affichage
          queryClient.invalidateQueries({ queryKey: ['creditPenalties', contract.id] })
          queryClient.invalidateQueries({ queryKey: ['creditContract', contract.id] })
          queryClient.invalidateQueries({ queryKey: ['creditPayments', contract.id] })
          setSelectedDueIndex(null)
          setPenaltyOnlyMode(false)
        }}
      />
      {getSelectedPaymentForReceipt() && (
        <PaymentReceiptModal
          isOpen={showReceiptModal}
          onClose={() => {
            setShowReceiptModal(false)
            setSelectedDueIndexForReceipt(null)
          }}
          contract={contract}
          payment={getSelectedPaymentForReceipt()!}
        />
      )}

      {/* Modal upload contrat signé */}
      <Dialog open={showUploadContractModal} onOpenChange={setShowUploadContractModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Uploader le contrat signé
            </DialogTitle>
            <DialogDescription>
              Téléversez le contrat signé par le client. Le contrat sera automatiquement activé après l'upload.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="contractFile" className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Fichier du contrat signé (PDF) *
              </Label>
              <Input
                id="contractFile"
                type="file"
                accept="application/pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    setContractFile(file)
                  }
                }}
                disabled={isCompressing || uploadSignedContract.isPending}
                required
              />
              {contractFile && (
                <div className="mt-2 text-sm text-gray-600">
                  Fichier sélectionné : {contractFile.name} ({(contractFile.size / 1024).toFixed(2)} KB)
                </div>
              )}
            </div>

            {contract.status === 'PENDING' && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note :</strong> Après l'upload, le contrat sera automatiquement activé et les fonds seront considérés comme remis au client.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowUploadContractModal(false)
                setContractFile(undefined)
              }}
              disabled={uploadSignedContract.isPending}
            >
              Annuler
            </Button>
            <Button
              onClick={async () => {
                if (!contractFile) {
                  toast.error('Veuillez sélectionner un fichier')
                  return
                }

                try {
                  await uploadSignedContract.mutateAsync({
                    contractId: contract.id,
                    signedContractFile: contractFile,
                  })
                  setShowUploadContractModal(false)
                  setContractFile(undefined)
                  toast.success('Contrat signé uploadé et contrat activé avec succès')
                } catch (error: any) {
                  toast.error(error?.message || 'Erreur lors de l\'upload du contrat signé')
                }
              }}
              disabled={!contractFile || uploadSignedContract.isPending}
              className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65]"
            >
              {uploadSignedContract.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Upload en cours...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Uploader et activer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

