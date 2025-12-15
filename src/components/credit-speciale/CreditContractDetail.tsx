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
import { useCreditPaymentsByCreditId, useCreditPenaltiesByCreditId, useCreditInstallmentsByCreditId, useCreditContractMutations, useGuarantorRemunerationsByCreditId } from '@/hooks/useCreditSpeciale'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

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
  installmentId?: string // ID de l'échéance pour lier les paiements
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
const ContractStatsCarousel = ({ contract, penalties = [], realRemainingAmount }: { contract: CreditContract; penalties?: CreditPenalty[]; realRemainingAmount: number }) => {
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
      value: Math.round(realRemainingAmount).toLocaleString('fr-FR'),
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
  const [activeTab, setActiveTab] = useState<'payments' | 'simulations' | 'guarantor'>('payments')
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

  // Récupérer les paiements, pénalités, échéances et rémunérations du garant
  const { data: payments = [], isLoading: isLoadingPayments } = useCreditPaymentsByCreditId(contract.id)
  const { data: penalties = [], isLoading: isLoadingPenalties } = useCreditPenaltiesByCreditId(contract.id)
  const { data: installments = [], isLoading: isLoadingInstallments } = useCreditInstallmentsByCreditId(contract.id)
  const { data: guarantorRemunerations = [], isLoading: isLoadingRemunerations } = useGuarantorRemunerationsByCreditId(contract.id)
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

  // Mapper les paiements aux échéances (mois) pour savoir combien a été versé pour chaque échéance
  const getPaymentsByMonth = (): Map<number, number> => {
    const paymentsByMonth = new Map<number, number>()
    
    // Filtrer les paiements de mensualités
    const realPayments = payments.filter(p => 
      p.amount > 0 || !p.comment?.includes('Paiement de pénalités uniquement')
    )

    // Si on a des installments, utiliser leur relation avec les paiements
    if (installments.length > 0 && !isLoadingInstallments) {
      // Pour chaque paiement, trouver l'installment correspondant
      for (const payment of realPayments) {
        // Chercher l'installment qui a été payé par ce paiement
        // Priorité 1: utiliser payment.installmentId si disponible
        // Priorité 2: utiliser inst.paymentId
        // Priorité 3: utiliser la date la plus proche
        let installment = payment.installmentId 
          ? installments.find(inst => inst.id === payment.installmentId)
          : undefined
        
        if (!installment) {
          installment = installments.find(inst => inst.paymentId === payment.id)
        }
        
        if (!installment) {
          installment = installments.find(inst =>
            inst.status === 'PAID' && Math.abs(new Date(inst.paidAt || 0).getTime() - new Date(payment.paymentDate).getTime()) < 24 * 60 * 60 * 1000
          )
        }
        
        if (installment) {
          // Utiliser le numéro d'échéance de l'installment
          const month = installment.installmentNumber
          const currentAmount = paymentsByMonth.get(month) || 0
          paymentsByMonth.set(month, currentAmount + payment.amount)
        } else {
          // Si pas d'installment trouvé, utiliser la logique de fallback
          // Trouver l'installment le plus proche en date
          const paymentDate = new Date(payment.paymentDate)
          let closestInstallment = installments[0]
          let minDiff = Infinity
          
          for (const inst of installments) {
            const diff = Math.abs(new Date(inst.dueDate).getTime() - paymentDate.getTime())
            if (diff < minDiff) {
              minDiff = diff
              closestInstallment = inst
            }
          }
          
          if (closestInstallment && minDiff < 30 * 24 * 60 * 60 * 1000) { // Dans les 30 jours
            const month = closestInstallment.installmentNumber
            const currentAmount = paymentsByMonth.get(month) || 0
            paymentsByMonth.set(month, currentAmount + payment.amount)
          }
        }
      }
    } else {
      // Fallback : utiliser la logique basée sur les dates
      const firstDate = new Date(contract.firstPaymentDate)
      
      for (const payment of realPayments) {
        const paymentDate = new Date(payment.paymentDate)
        
        // Calculer le mois correspondant (1-based) en fonction de la date de première échéance
        const monthsDiff = (paymentDate.getFullYear() - firstDate.getFullYear()) * 12 + 
                          (paymentDate.getMonth() - firstDate.getMonth())
        const month = Math.max(1, monthsDiff + 1)
        
        // Accumuler le montant versé pour ce mois
        const currentAmount = paymentsByMonth.get(month) || 0
        paymentsByMonth.set(month, currentAmount + payment.amount)
      }
    }

    return paymentsByMonth
  }

  // Calculer les échéances - utiliser les installments réels si disponibles, sinon calculer
  const calculateDueItems = (): DueItem[] => {
    // Si on a des installments réels, recalculer selon la formule correcte
    if (installments.length > 0 && !isLoadingInstallments) {
      const monthlyRate = contract.interestRate / 100
      // Calcul selon la formule : montantGlobal = montantGlobal * taux + montantGlobal
      // Mois 1: montantGlobal = Montant emprunté * taux + montant emprunté
      let resteDuPrecedent = contract.amount // Pour calculer les intérêts
      let montantGlobal = contract.amount * monthlyRate + contract.amount
      
      // Utiliser contract.monthlyPaymentAmount pour recalculer avec la bonne logique
      const monthlyPayment = contract.monthlyPaymentAmount
      
      const items: DueItem[] = []
      const firstDate = new Date(contract.firstPaymentDate)
      
      // Traiter les installments existants
      for (const installment of installments) {
        // Déterminer le statut : si un paiement a été fait, l'échéance est PAYÉE
        let finalStatus: 'PAID' | 'DUE' | 'FUTURE' = 'FUTURE'
        
        // Si l'échéance a reçu un paiement (même partiel), elle est considérée comme PAYÉE
        if (installment.status === 'PAID' || installment.paidAmount > 0) {
          finalStatus = 'PAID'
        } else if (installment.status === 'DUE' || installment.status === 'OVERDUE') {
          finalStatus = 'DUE'
        } else {
          // Vérifier si toutes les échéances précédentes sont payées (ont reçu un paiement)
          const previousInstallments = installments.filter(inst => 
            inst.installmentNumber < installment.installmentNumber
          )
          // Une échéance précédente est considérée comme "payée" si elle a reçu un paiement
          const allPreviousPaid = previousInstallments.every(inst => 
            inst.status === 'PAID' || inst.paidAmount > 0
          )
          finalStatus = allPreviousPaid ? 'DUE' : 'FUTURE'
        }

        // Calculer selon la formule (même logique que la simulation)
        // montantGlobal est déjà calculé pour ce mois (avant paiement)
        const currentMontantGlobal = montantGlobal
        
        // À partir du 8ème mois (installmentNumber >= 8), plus d'intérêts
        const isAfterMonth7 = installment.installmentNumber >= 8
        const interest = isAfterMonth7 ? 0 : resteDuPrecedent * monthlyRate
        
        // Calculer le paiement selon la même logique que la simulation
        let payment: number
        let resteDu: number
        
        if (monthlyPayment > currentMontantGlobal) {
          // Si la mensualité prédéfinie est supérieure au montant global,
          // la mensualité affichée doit être le montant global (capital + intérêts)
          payment = currentMontantGlobal
          resteDu = 0
        } else if (resteDuPrecedent < monthlyPayment && !isAfterMonth7) {
          // Le reste dû est inférieur à la mensualité souhaitée (seulement avant le 8ème mois)
          // La mensualité affichée = reste dû (sans intérêts)
          payment = resteDuPrecedent
          resteDu = 0
        } else {
          // Le reste dû est supérieur ou égal à la mensualité souhaitée
          payment = monthlyPayment
          // Reste dû = MontantGlobal - Mensualité
          resteDu = currentMontantGlobal - payment
        }
        
        // Pour le mois suivant
        if (isAfterMonth7) {
          // Après le 7ème mois : plus d'intérêts, montantGlobal = resteDu (sans intérêts)
          montantGlobal = resteDu
          resteDuPrecedent = resteDu
        } else {
          // Jusqu'au 7ème mois : appliquer les intérêts
          montantGlobal = resteDu * monthlyRate + resteDu
          resteDuPrecedent = resteDu
        }
        
        items.push({
          month: installment.installmentNumber,
          date: new Date(installment.dueDate),
          payment: customRound(payment), // Mensualité recalculée avec la bonne logique
          interest: customRound(interest),
          principal: customRound(currentMontantGlobal), // Montant global (avant paiement)
          remaining: customRound(resteDu), // Reste dû = MontantGlobal - Mensualité
          status: finalStatus,
          paidAmount: installment.paidAmount > 0 ? installment.paidAmount : undefined,
          paymentDate: installment.paidAt ? new Date(installment.paidAt) : undefined,
          installmentId: installment.id, // Lier à l'installment pour trouver les paiements
        })
      }
      
      // Si le dernier item a un reste dû > 0, créer des échéances supplémentaires
      // On utilisera le reste dû calculé directement (pas besoin de recalculer l'échéancier actuel)
      const lastItem = items[items.length - 1]
      if (lastItem && lastItem.remaining > 0) {
        let monthIndex = installments.length
        const monthlyPayment = contract.monthlyPaymentAmount
        const paymentsByMonthMap = getPaymentsByMonth()
        
        // Utiliser le reste dû du dernier item comme point de départ
        let currentResteDu = lastItem.remaining
        
        // Continuer jusqu'à ce que le reste dû soit 0 ou qu'on atteigne une limite raisonnable
        while (currentResteDu > 0 && monthIndex < 20) {
          const date = new Date(firstDate)
          date.setMonth(date.getMonth() + monthIndex)
          
          // Après le 7ème mois, plus d'intérêts
          const isAfterMonth7 = monthIndex >= 7
          const interest = isAfterMonth7 ? 0 : 0 // Plus d'intérêts après le 7ème mois
          
          // Après le 7ème mois : montantGlobal = resteDu du mois précédent (sans intérêts)
          // Avant le 8ème mois : on ne devrait pas arriver ici car on a déjà traité tous les installments
          const montantGlobalForMonth = currentResteDu
          
          // Récupérer le montant réellement payé pour ce mois
          const actualPayment = paymentsByMonthMap.get(monthIndex + 1) || 0
          
          // Calculer le paiement
          let payment: number
          let resteDu: number
          
          if (actualPayment > 0) {
            // Utiliser le montant réellement payé
            payment = actualPayment
            resteDu = Math.max(0, montantGlobalForMonth - payment)
          } else {
            // Pas de paiement réel, utiliser la logique théorique
            if (monthlyPayment > montantGlobalForMonth) {
              payment = montantGlobalForMonth
              resteDu = 0
            } else {
              payment = monthlyPayment
              resteDu = montantGlobalForMonth - payment
            }
          }
          
          // Déterminer le statut
          let status: 'PAID' | 'DUE' | 'FUTURE' = 'FUTURE'
          let paymentDate: Date | undefined
          
          if (actualPayment > 0) {
            status = 'PAID'
            // Chercher la date du paiement
            const sortedPayments = [...payments]
              .filter(p => p.amount > 0 || !p.comment?.includes('Paiement de pénalités uniquement'))
              .sort((a, b) => 
                new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime()
              )
            const paymentForThisMonth = sortedPayments.find(p => {
              const paymentDateObj = new Date(p.paymentDate)
              const monthsDiff = (paymentDateObj.getFullYear() - firstDate.getFullYear()) * 12 +
                                (paymentDateObj.getMonth() - firstDate.getMonth())
              const paymentMonth = Math.max(1, monthsDiff + 1)
              return paymentMonth === monthIndex + 1
            })
            if (paymentForThisMonth) {
              paymentDate = new Date(paymentForThisMonth.paymentDate)
            }
          } else {
            // Vérifier si toutes les échéances précédentes ont reçu un paiement
            let allPreviousPaid = true
            for (let j = 0; j < monthIndex; j++) {
              if ((paymentsByMonthMap.get(j + 1) || 0) === 0) {
                allPreviousPaid = false
                break
              }
            }
            status = allPreviousPaid ? 'DUE' : 'FUTURE'
          }
          
          items.push({
            month: monthIndex + 1,
            date,
            payment: customRound(payment),
            interest: customRound(interest),
            principal: customRound(montantGlobalForMonth),
            remaining: customRound(resteDu),
            status,
            paidAmount: actualPayment > 0 ? actualPayment : undefined,
            paymentDate,
          })
          
          // Mettre à jour pour le mois suivant
          currentResteDu = resteDu
          monthIndex++
          
          // Arrêter si le reste dû est 0
          if (resteDu <= 0) break
        }
      }
      
      return items
    }

    // Fallback : calculer manuellement si pas d'installments
    const monthlyRate = contract.interestRate / 100
    const firstDate = new Date(contract.firstPaymentDate)
    const paymentAmount = contract.monthlyPaymentAmount
    const maxDuration = contract.duration
    
    // Calcul selon la formule : montantGlobal = montantGlobal * taux + montantGlobal
    // Mois 1: montantGlobal = Montant emprunté * taux + montant emprunté
    // Mois 2+: montantGlobal = resteDu * taux + resteDu
    let resteDuPrecedent = contract.amount // Pour calculer les intérêts
    let montantGlobal = contract.amount * monthlyRate + contract.amount // Mois 1
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
    const paymentsByMonthMap = getPaymentsByMonth()

    let monthIndex = 0
    // Continuer jusqu'à ce que le reste dû soit 0 ou qu'on atteigne une limite raisonnable (ex: 20 mois)
    while (montantGlobal > 0 && monthIndex < 20) {
      const date = new Date(firstDate)
      date.setMonth(date.getMonth() + monthIndex)
      
      // À partir du 8ème mois (index 7), plus d'intérêts
      const isAfterMonth7 = monthIndex >= 7
      
      // Calculer les intérêts pour l'affichage
      // Après le 7ème mois, les intérêts sont à 0
      const interest = isAfterMonth7 ? 0 : resteDuPrecedent * monthlyRate
      
      // Calculer le paiement selon la même logique que la simulation
      let payment: number
      let resteDu: number
      
      if (paymentAmount > montantGlobal) {
        // Si la mensualité prédéfinie est supérieure au montant global,
        // la mensualité affichée doit être le montant global (capital + intérêts)
        payment = montantGlobal
        resteDu = 0
      } else if (resteDuPrecedent < paymentAmount && !isAfterMonth7) {
        // Le reste dû est inférieur à la mensualité souhaitée (seulement avant le 8ème mois)
        // La mensualité affichée = reste dû (sans intérêts)
        payment = resteDuPrecedent
        resteDu = 0
      } else {
        // Le reste dû est supérieur ou égal à la mensualité souhaitée
        payment = paymentAmount
        // Reste dû = MontantGlobal - Mensualité
        resteDu = montantGlobal - paymentAmount
      }
      
      // Pour le mois suivant
      if (isAfterMonth7) {
        // Après le 7ème mois : plus d'intérêts, montantGlobal = resteDu (sans intérêts)
        montantGlobal = resteDu
        resteDuPrecedent = resteDu
      } else {
        // Jusqu'au 7ème mois : appliquer les intérêts
        montantGlobal = resteDu * monthlyRate + resteDu
        resteDuPrecedent = resteDu
      }

      // Déterminer le statut : si un paiement a été fait pour cette échéance, elle est PAYÉE
      let status: 'PAID' | 'DUE' | 'FUTURE' = 'FUTURE'
      let paidAmount = 0
      let paymentDate: Date | undefined

      // Vérifier si un paiement a été fait pour cette échéance
      // Utiliser une tolérance pour les arrondis (1 FCFA)
      const expectedTotalForThisDue = accumulatedPaid + payment
      const tolerance = 1
      
      // Arrondir les valeurs pour la comparaison
      const roundedTotalPaid = Math.round(totalPaid)
      const roundedExpectedTotal = Math.round(expectedTotalForThisDue)
      const roundedAccumulatedPaid = Math.round(accumulatedPaid)
      
      // Si un paiement a été fait pour cette échéance (même partiel), elle est PAYÉE
      if (roundedTotalPaid > roundedAccumulatedPaid + tolerance) {
        // Un paiement a été fait pour cette échéance
        status = 'PAID'
        // Calculer le montant payé pour cette échéance
        paidAmount = Math.min(roundedTotalPaid - roundedAccumulatedPaid, payment)
        // Trouver le paiement qui correspond à cette échéance
        let tempAccumulated = accumulatedPaid
        for (const p of sortedPayments) {
          if (tempAccumulated >= roundedAccumulatedPaid) {
            paymentDate = new Date(p.paymentDate)
            break
          }
          tempAccumulated += p.amount
          if (tempAccumulated > roundedTotalPaid) break
        }
        accumulatedPaid = roundedTotalPaid // Mettre à jour pour la prochaine échéance
      } else {
        // Aucun paiement n'a été fait pour cette échéance
        // Vérifier si toutes les échéances précédentes sont payées
        if (roundedTotalPaid >= roundedAccumulatedPaid - tolerance) {
          // Toutes les précédentes sont payées, cette échéance est DUE
          status = 'DUE'
        } else {
          // Au moins une échéance précédente n'est pas payée, cette échéance est FUTURE
          status = 'FUTURE'
        }
      }

      items.push({
        month: monthIndex + 1,
        date,
        payment: customRound(payment), // Mensualité
        interest: customRound(interest),
        principal: customRound(montantGlobal), // Montant global
        remaining: customRound(resteDu), // Reste dû = MontantGlobal - Mensualité
        status,
        paidAmount: status === 'PAID' && paidAmount > 0 ? paidAmount : undefined,
        paymentDate,
      })
      
      monthIndex++
      
      // Arrêter si le reste dû est 0 et qu'on a dépassé la durée initiale
      if (resteDu <= 0 && monthIndex >= maxDuration) {
        break
      }
    }

    return items
  }

  // Calculer les échéances pour l'affichage
  // actualSchedule sera calculé après et utilisé pour déterminer les mois supplémentaires
  const dueItems = calculateDueItems()
  // Trouver la prochaine échéance payable : DUE
  const nextDueIndex = dueItems.findIndex(item => item.status === 'DUE')

  // Calculer le montant restant basé sur les paiements réels
  // nouveauMontantRestant = MontantRestant - montantVerser
  // MontantRestant = nouveauMontantRestant * taux + nouveauMontantRestant
  const calculateRealRemainingAmount = (): number => {
    // Filtrer les paiements de mensualités (exclure les pénalités uniquement)
    const realPayments = payments.filter(p => 
      p.amount > 0 || !p.comment?.includes('Paiement de pénalités uniquement')
    )
    
    if (realPayments.length === 0) {
      // Pas de paiement, le montant restant est le montant initial avec intérêts
      const monthlyRate = contract.interestRate / 100
      return contract.amount * (1 + monthlyRate)
    }

    // Trier les paiements par date
    const sortedPayments = [...realPayments].sort((a, b) => 
      new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime()
    )

    // Calculer le montant restant en appliquant la formule pour chaque paiement
    let remaining = contract.amount
    const monthlyRate = contract.interestRate / 100

    for (const payment of sortedPayments) {
      // Calculer les intérêts sur le montant restant avant le paiement
      const interest = remaining * monthlyRate
      const totalWithInterest = remaining + interest
      
      // Soustraire le montant versé
      remaining = Math.max(0, totalWithInterest - payment.amount)
    }

    // Appliquer les intérêts sur le montant restant actuel
    const currentInterest = remaining * monthlyRate
    return remaining + currentInterest
  }

  const realRemainingAmount = calculateRealRemainingAmount()

  const paymentsByMonth = getPaymentsByMonth()

  // Calculer l'échéancier actuel basé sur les versements réels
  const calculateActualSchedule = (): DueItem[] => {
    const monthlyRate = contract.interestRate / 100
    const firstDate = new Date(contract.firstPaymentDate)
    const maxDuration = contract.duration
    
    // Calcul selon la formule : montantGlobal = montantGlobal * taux + montantGlobal
    let resteDuPrecedent = contract.amount // Pour calculer les intérêts
    let montantGlobal = contract.amount * monthlyRate + contract.amount // Mois 1
    const items: DueItem[] = []

    // Créer un map des paiements par mois
    const paymentsByMonthMap = getPaymentsByMonth()

    // Trier les paiements par date pour trouver les dates de paiement
    const sortedPayments = [...payments]
      .filter(p => p.amount > 0 || !p.comment?.includes('Paiement de pénalités uniquement'))
      .sort((a, b) => 
        new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime()
      )

    const monthlyPayment = contract.monthlyPaymentAmount
    let monthIndex = 0
    let previousResteDu = 0 // Pour stocker le reste dû du mois précédent
    
    // Continuer jusqu'à ce que le reste dû soit 0 ou qu'on atteigne une limite raisonnable (ex: 20 mois)
    while (montantGlobal > 0 && monthIndex < 20) {
      const date = new Date(firstDate)
      date.setMonth(date.getMonth() + monthIndex)
      
      // À partir du 8ème mois (index 7), plus d'intérêts
      const isAfterMonth7 = monthIndex >= 7
      
      // Après le 7ème mois : montantGlobal = resteDu du mois précédent (sans intérêts)
      if (isAfterMonth7 && previousResteDu > 0) {
        montantGlobal = previousResteDu
        resteDuPrecedent = previousResteDu
      }
      
      // Calculer les intérêts pour l'affichage
      // Après le 7ème mois, les intérêts sont à 0
      const interest = isAfterMonth7 ? 0 : resteDuPrecedent * monthlyRate
      
      // Récupérer le montant réellement payé pour ce mois
      const actualPayment = paymentsByMonthMap.get(monthIndex + 1) || 0
      
      // Si un paiement réel a été fait, utiliser ce montant
      // Sinon, utiliser la mensualité théorique
      let payment: number
      let resteDu: number
      
      if (actualPayment > 0) {
        // Utiliser le montant réellement payé
        payment = actualPayment
        // Calculer le reste dû après ce paiement réel
        if (payment >= montantGlobal) {
          resteDu = 0
        } else {
          resteDu = montantGlobal - payment
        }
      } else {
        // Pas de paiement réel, utiliser la logique théorique
        if (monthlyPayment > montantGlobal) {
          payment = montantGlobal
          resteDu = 0
        } else if (resteDuPrecedent < monthlyPayment && !isAfterMonth7) {
          payment = resteDuPrecedent
          resteDu = 0
        } else {
          payment = monthlyPayment
          resteDu = montantGlobal - payment
        }
      }
      
      // Déterminer le statut : si un paiement a été fait, l'échéance est PAYÉE
      let status: 'PAID' | 'DUE' | 'FUTURE' = 'FUTURE'
      let paymentDate: Date | undefined

      if (actualPayment > 0) {
        status = 'PAID'
        // Trouver la date du paiement pour ce mois
        // Chercher dans les installments d'abord
        const installmentForMonth = installments.find(inst => inst.installmentNumber === monthIndex + 1)
        if (installmentForMonth && installmentForMonth.paidAt) {
          paymentDate = new Date(installmentForMonth.paidAt)
        } else {
          // Sinon, chercher dans les paiements
          const paymentForThisMonth = sortedPayments.find(p => {
            const paymentDateObj = new Date(p.paymentDate)
            const monthsDiff = (paymentDateObj.getFullYear() - firstDate.getFullYear()) * 12 +
                              (paymentDateObj.getMonth() - firstDate.getMonth())
            const paymentMonth = Math.max(1, monthsDiff + 1)
            return paymentMonth === monthIndex + 1
          })
          if (paymentForThisMonth) {
            paymentDate = new Date(paymentForThisMonth.paymentDate)
          }
        }
      } else {
        // Vérifier si toutes les échéances précédentes ont reçu un paiement
        let allPreviousPaid = true
        for (let j = 0; j < monthIndex; j++) {
          if ((paymentsByMonthMap.get(j + 1) || 0) === 0) {
            allPreviousPaid = false
            break
          }
        }
        status = allPreviousPaid ? 'DUE' : 'FUTURE'
      }

      items.push({
        month: monthIndex + 1,
        date,
        payment: customRound(payment),
        interest: customRound(interest),
        principal: customRound(montantGlobal), // Montant global avant paiement
        remaining: customRound(resteDu),
        status,
        paidAmount: actualPayment > 0 ? actualPayment : undefined,
        paymentDate,
      })
      
      // Stocker le reste dû pour le mois suivant
      previousResteDu = resteDu
      
      // Pour le mois suivant
      if (isAfterMonth7) {
        // Après le 7ème mois : plus d'intérêts, montantGlobal = resteDu du mois actuel (sans intérêts)
        // On ne calcule pas ici, on utilisera previousResteDu au début du prochain tour
        resteDuPrecedent = resteDu
      } else {
        // Jusqu'au 7ème mois : appliquer les intérêts
        montantGlobal = resteDu * monthlyRate + resteDu
        resteDuPrecedent = resteDu
      }
      
      monthIndex++
      
      // Arrêter si le reste dû est 0 et qu'on a dépassé la durée initiale
      if (resteDu <= 0 && monthIndex >= maxDuration) {
        break
      }
    }

    return items.filter(item => item.payment > 0) // Filtrer les lignes avec paiement à 0
  }

  const actualSchedule = calculateActualSchedule()
  
  // Créer un map de l'échéancier actuel par mois pour accès rapide
  const actualScheduleByMonth = new Map<number, DueItem>()
  actualSchedule.forEach(item => {
    actualScheduleByMonth.set(item.month, item)
  })

  // Calculer l'échéancier référence (pour crédit spéciale uniquement, 7 mois)
  const calculateReferenceSchedule = () => {
    if (contract.creditType !== 'SPECIALE') return []
    
    const monthlyRate = contract.interestRate / 100
    const firstDate = new Date(contract.firstPaymentDate)
    
    // Calculer le montant global avec intérêts composés sur exactement 7 mois
    let lastMontant = contract.amount
    for (let i = 1; i <= 7; i++) {
      lastMontant = lastMontant * monthlyRate + lastMontant
    }
    
    // Le montant global après 7 mois d'intérêts composés
    const montantGlobal = lastMontant
    
    // Diviser ce montant global par 7 pour obtenir la mensualité
    const monthlyPaymentRaw = montantGlobal / 7
    
    // Arrondir : si décimal >= 0.5, arrondir à l'entier supérieur, sinon à l'entier inférieur
    const monthlyPaymentRef = monthlyPaymentRaw % 1 >= 0.5 
      ? Math.ceil(monthlyPaymentRaw) 
      : Math.floor(monthlyPaymentRaw)
    
    // Générer l'échéancier avec cette mensualité (identique pour les 7 mois)
    const referenceSchedule: Array<{
      month: number
      date: Date
      payment: number
    }> = []

    for (let i = 0; i < 7; i++) {
      const date = new Date(firstDate)
      date.setMonth(date.getMonth() + i)
      
      referenceSchedule.push({
        month: i + 1,
        date,
        payment: monthlyPaymentRef,
      })
    }
    return referenceSchedule
  }

  const referenceSchedule = calculateReferenceSchedule()
  
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
    if (!dueItem) return null

    // Si on a un installmentId, utiliser celui-ci pour trouver le paiement
    if (dueItem.installmentId) {
      // Trouver le paiement qui correspond à cet installment
      const matchingPayment = payments.find(p => p.installmentId === dueItem.installmentId)
      if (matchingPayment) return matchingPayment
    }

    // Fallback : utiliser la date de paiement si disponible
    if (dueItem.paymentDate) {
      const duePaymentDate = new Date(dueItem.paymentDate)
      duePaymentDate.setHours(0, 0, 0, 0)

      // Trouver le paiement qui correspond à cette date et à cet installment si possible
      const matchingPayment = payments.find(p => {
        const paymentDate = new Date(p.paymentDate)
        paymentDate.setHours(0, 0, 0, 0)
        // Si le paiement a un installmentId, vérifier qu'il correspond
        if (p.installmentId && dueItem.installmentId) {
          return p.installmentId === dueItem.installmentId
        }
        // Sinon, comparer les dates (tolérance de 1 jour)
        return Math.abs(paymentDate.getTime() - duePaymentDate.getTime()) <= 24 * 60 * 60 * 1000
      })

      if (matchingPayment) return matchingPayment
    }

    // Dernier fallback : trouver le premier paiement qui pourrait correspondre à cette échéance
    // en utilisant les installments
    if (dueItem.installmentId && installments.length > 0) {
      const installment = installments.find(inst => inst.id === dueItem.installmentId)
      if (installment) {
        // Trouver les paiements qui ont été appliqués à cet installment
        const paymentsForInstallment = payments.filter(p => p.installmentId === installment.id)
        if (paymentsForInstallment.length > 0) {
          // Retourner le dernier paiement pour cet installment
          return paymentsForInstallment.sort((a, b) => 
            new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
          )[0]
        }
      }
    }

    return null
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
          <ContractStatsCarousel contract={contract} penalties={penalties} realRemainingAmount={realRemainingAmount} />
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

        {/* Onglets */}
        <Card className="border-0 shadow-xl">
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'payments' | 'simulations' | 'guarantor')} className="w-full">
              <TabsList className="grid w-full grid-cols-3 rounded-none border-b">
                <TabsTrigger value="payments" className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Versements
                </TabsTrigger>
                <TabsTrigger value="simulations" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Simulations
                </TabsTrigger>
                <TabsTrigger value="guarantor" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Commission du garant
                </TabsTrigger>
              </TabsList>

              {/* Onglet Versements */}
              <TabsContent value="payments" className="p-6 space-y-6 m-0">
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <CalendarDays className="h-5 w-5" />
                    Échéancier de paiement
                  </h3>
                  {isLoadingPayments ? (
                    <div className="text-center py-8 text-gray-500">Chargement...</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dueItems.map((item, index) => {
                  // Permettre les paiements si le contrat est ACTIVE ou PARTIAL
                  const canMakePayments = contract.status === 'ACTIVE' || contract.status === 'PARTIAL'
                  // Permettre de payer si :
                  // - L'échéance est DUE
                  // - C'est la prochaine échéance payable (nextDueIndex)
                  const isPayable = item.status === 'DUE' && 
                                   (nextDueIndex >= 0 && index === nextDueIndex)
                  const isDisabled = !canMakePayments || 
                                   item.status === 'FUTURE' || 
                                   item.status === 'PAID' ||
                                   !isPayable
                  
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
                              {(() => {
                                // Utiliser l'échéancier actuel pour le montant à payer
                                const actualItem = actualScheduleByMonth.get(item.month)
                                const amountToPay = actualItem?.payment ?? item.payment
                                return amountToPay.toLocaleString('fr-FR') + ' FCFA'
                              })()}
                            </span>
                          </div>

                          {/* Afficher montant versé si différent du montant à payer (sur échéances payées) */}
                          {(() => {
                            // Utiliser l'échéancier actuel pour le montant à payer
                            const actualItem = actualScheduleByMonth.get(item.month)
                            const amountToPay = actualItem?.payment ?? item.payment
                            const paidForMonth = paymentsByMonth.get(item.month) || item.paidAmount || 0
                            // Afficher "Montant versé" si l'échéance est payée et le montant versé est différent du montant à payer
                            if (item.status === 'PAID' && paidForMonth > 0 && Math.abs(paidForMonth - amountToPay) > 1) {
                              return (
                                <div className="flex items-center justify-between text-sm mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                                  <span className="text-yellow-700 font-medium">Montant versé:</span>
                                  <span className="font-semibold text-yellow-800">
                                    {paidForMonth.toLocaleString('fr-FR')} FCFA
                                  </span>
                                </div>
                              )
                            }
                            return null
                          })()}
                          
                          {/* Détail principal + intérêts - utiliser l'échéancier actuel */}
                          {(() => {
                            // Récupérer les valeurs de l'échéancier actuel pour ce mois
                            const actualItem = actualScheduleByMonth.get(item.month)
                            const principal = actualItem?.principal ?? item.principal
                            const interest = actualItem?.interest ?? item.interest
                            
                            return (
                              <div className="flex items-center justify-between text-xs text-gray-500 mt-1 pt-1 border-t border-gray-200">
                                <span>Capital: {principal.toLocaleString('fr-FR')} FCFA</span>
                                <span>Intérêts: {interest.toLocaleString('fr-FR')} FCFA</span>
                              </div>
                            )
                          })()}

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
                                console.log('[CreditContractDetail] Clic sur "Payer cette échéance" - Échéance:', {
                                  month: item.month,
                                  installmentId: item.installmentId,
                                  index: index,
                                  payment: item.payment,
                                  status: item.status
                                });
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
                </div>

                {/* Historique des versements */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Historique des versements
                  </h3>
                  {isLoadingPayments ? (
                    <div className="text-center py-8 text-gray-500">Chargement...</div>
                  ) : payments.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">Aucun versement enregistré</div>
                  ) : (
                    <div className="space-y-3">
                      {payments.map((payment) => {
                        // Trouver l'échéance correspondante à ce paiement
                        const relatedDueItem = payment.installmentId 
                          ? dueItems.find(item => item.installmentId === payment.installmentId)
                          : null
                        
                        return (
                        <div
                          key={payment.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => {
                            setSelectedPayment(payment)
                            setSelectedDueIndexForReceipt(relatedDueItem ? dueItems.findIndex(item => item.month === relatedDueItem.month) : null)
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
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Pénalités */}
                {penalties.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-orange-600" />
                        Pénalités
                      </h3>
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
                  </div>
                )}

                {/* Historique complet */}
                <CreditHistoryTimeline contractId={contract.id} />
              </TabsContent>

              {/* Onglet Simulations */}
              <TabsContent value="simulations" className="p-6 space-y-6 m-0">
                <div className="space-y-6">
                  {/* Échéancier actuel */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Échéancier actuel ({actualSchedule.length} mois)
                      </h3>
                    </div>
                    {/* Légende de coloration */}
                    <div className="mb-3 flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-green-50 border border-green-200 rounded"></div>
                        <span className="text-gray-600">Échéance payée</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-white border border-gray-200 rounded"></div>
                        <span className="text-gray-600">Échéance non payée</span>
                      </div>
                    </div>
                    <div className="border rounded-lg overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Mois</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Mensualité</TableHead>
                            <TableHead className="text-right">Intérêts</TableHead>
                            <TableHead className="text-right">Montant global</TableHead>
                            <TableHead className="text-right">Reste dû</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {actualSchedule.map((row) => {
                            // Vert si l'échéance est payée
                            const rowColor = row.status === 'PAID'
                              ? 'bg-green-50 hover:bg-green-100'
                              : ''
                            
                            return (
                              <TableRow key={row.month} className={rowColor}>
                                <TableCell className="font-medium">M{row.month}</TableCell>
                                <TableCell>{formatDate(row.date)}</TableCell>
                                <TableCell className="text-right">{row.payment.toLocaleString('fr-FR')} FCFA</TableCell>
                                <TableCell className="text-right">{row.interest.toLocaleString('fr-FR')} FCFA</TableCell>
                                <TableCell className="text-right">{row.principal.toLocaleString('fr-FR')} FCFA</TableCell>
                                <TableCell className="text-right">{row.remaining.toLocaleString('fr-FR')} FCFA</TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {/* Échéancier calculé */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Échéancier calculé ({dueItems.filter(row => row.payment > 0).length} mois)
                      </h3>
                    </div>
                    {/* Légende de coloration */}
                    <div className="mb-3 flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-green-50 border border-green-200 rounded"></div>
                        <span className="text-gray-600">Montant versé ≥ mensualité</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-red-50 border border-red-200 rounded"></div>
                        <span className="text-gray-600">0 &lt; montant versé &lt; mensualité</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-white border border-gray-200 rounded"></div>
                        <span className="text-gray-600">Aucun versement</span>
                      </div>
                    </div>
                    <div className="border rounded-lg overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Mois</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Mensualité</TableHead>
                            <TableHead className="text-right">Intérêts</TableHead>
                            <TableHead className="text-right">Montant global</TableHead>
                            <TableHead className="text-right">Reste dû</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dueItems
                            .filter(row => row.payment > 0) // Filtrer les lignes avec mensualité à 0
                            .map((row) => {
                            // Utiliser le montant payé de l'échéance si disponible, sinon utiliser paymentsByMonth
                            const paidForMonth = row.paidAmount !== undefined 
                              ? row.paidAmount 
                              : (paymentsByMonth.get(row.month) || 0)
                            
                            // Vert si montant versé >= mensualité, rouge sinon (reste vert si > mensualité)
                            const rowColor = paidForMonth >= row.payment 
                              ? 'bg-green-50 hover:bg-green-100' 
                              : paidForMonth > 0 
                              ? 'bg-red-50 hover:bg-red-100' 
                              : ''
                            
                            return (
                              <TableRow key={row.month} className={rowColor}>
                                <TableCell className="font-medium">M{row.month}</TableCell>
                                <TableCell>{formatDate(row.date)}</TableCell>
                                <TableCell className="text-right">{row.payment.toLocaleString('fr-FR')} FCFA</TableCell>
                                <TableCell className="text-right">{row.interest.toLocaleString('fr-FR')} FCFA</TableCell>
                                <TableCell className="text-right">{row.principal.toLocaleString('fr-FR')} FCFA</TableCell>
                                <TableCell className="text-right">{row.remaining.toLocaleString('fr-FR')} FCFA</TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {/* Échéancier référence (pour crédit spéciale uniquement) */}
                  {contract.creditType === 'SPECIALE' && referenceSchedule.length > 0 && (
                    <div className="lg:max-w-md">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Échéancier référence (7 mois)
                      </h3>
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Mois</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead className="text-right">Mensualité</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {referenceSchedule.map((row) => (
                              <TableRow key={row.month}>
                                <TableCell className="font-medium">M{row.month}</TableCell>
                                <TableCell>{formatDate(row.date)}</TableCell>
                                <TableCell className="text-right">{row.payment.toLocaleString('fr-FR')} FCFA</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Onglet Commission du garant */}
              <TabsContent value="guarantor" className="p-6 m-0">
                {contract.guarantorId && contract.guarantorIsMember && contract.guarantorRemunerationPercentage !== undefined && contract.guarantorRemunerationPercentage > 0 ? (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Commission du garant
                      </h3>
                      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-700">
                          <strong>Garant :</strong> {contract.guarantorFirstName} {contract.guarantorLastName}
                        </p>
                        {contract.guarantorRemunerationPercentage !== undefined && (
                          <p className="text-sm text-blue-700 mt-1">
                            <strong>Taux de commission :</strong> {contract.guarantorRemunerationPercentage}% par mensualité versée
                          </p>
                        )}
                      </div>
                    </div>

                    {isLoadingRemunerations ? (
                      <div className="text-center py-8 text-gray-500">Chargement...</div>
                    ) : guarantorRemunerations.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">Aucune commission enregistrée</div>
                    ) : (
                      <div className="space-y-4">
                        <div className="border rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Mois</TableHead>
                                <TableHead>Montant versé</TableHead>
                                <TableHead className="text-right">Pourcentage de commission</TableHead>
                                <TableHead className="text-right">Somme due</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {[...guarantorRemunerations]
                                .sort((a, b) => a.month - b.month) // Trier par numéro de mois (M1, M2, M3, etc.)
                                .map((remuneration) => {
                                // Trouver le paiement associé pour obtenir le montant
                                const associatedPayment = payments.find(p => p.id === remuneration.paymentId)
                                const paymentAmount = associatedPayment?.amount || 0
                                const commissionPercentage = contract.guarantorRemunerationPercentage || 0

                                return (
                                  <TableRow key={remuneration.id}>
                                    <TableCell className="font-medium">M{remuneration.month}</TableCell>
                                    <TableCell>{paymentAmount.toLocaleString('fr-FR')} FCFA</TableCell>
                                    <TableCell className="text-right">{commissionPercentage}%</TableCell>
                                    <TableCell className="text-right font-semibold">{remuneration.amount.toLocaleString('fr-FR')} FCFA</TableCell>
                                  </TableRow>
                                )
                              })}
                            </TableBody>
                          </Table>
                        </div>
                        <div className="p-4 bg-gray-50 border rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold">Total des commissions :</span>
                            <span className="text-xl font-bold text-[#234D65]">
                              {guarantorRemunerations.reduce((sum, r) => sum + r.amount, 0).toLocaleString('fr-FR')} FCFA
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {!contract.guarantorId ? (
                      <div className="text-center py-8">
                        <Shield className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-600 font-medium">Aucun garant associé à ce contrat</p>
                        <p className="text-sm text-gray-500 mt-2">Aucune commission n'est applicable</p>
                      </div>
                    ) : !contract.guarantorIsMember ? (
                      <div className="text-center py-8">
                        <Shield className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-600 font-medium mb-2">
                          Garant : {contract.guarantorFirstName} {contract.guarantorLastName}
                        </p>
                        <div className="max-w-md mx-auto p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm text-blue-800 mb-2">
                            <strong>ℹ️ Pourquoi aucune commission ?</strong>
                          </p>
                          <p className="text-sm text-blue-700 text-left">
                            Le garant n'est pas un membre de la mutuelle. Seuls les garants qui sont des membres de la mutuelle peuvent recevoir une commission.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Shield className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-600 font-medium mb-2">
                          Garant : {contract.guarantorFirstName} {contract.guarantorLastName}
                        </p>
                        <div className="max-w-md mx-auto p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm text-blue-800 mb-2">
                            <strong>ℹ️ Pourquoi aucune commission ?</strong>
                          </p>
                          <p className="text-sm text-blue-700 text-left">
                            Le garant est un membre mais aucune commission n'a été configurée pour ce contrat (taux de commission : 0%).
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

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
        installmentId={(() => {
          const installmentId = selectedDueIndex !== null ? dueItems[selectedDueIndex]?.installmentId : undefined;
          console.log('[CreditContractDetail] Ouverture du modal de paiement - selectedDueIndex:', selectedDueIndex, 'installmentId:', installmentId, 'dueItem:', selectedDueIndex !== null ? dueItems[selectedDueIndex] : null);
          return installmentId;
        })()}
        onSuccess={async () => {
          console.log('[CreditContractDetail] onSuccess du paiement - Invalidation des queries...')
          // Invalider explicitement le cache pour rafraîchir l'affichage
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['creditPenalties', 'creditId', contract.id] }),
            queryClient.invalidateQueries({ queryKey: ['creditContract', contract.id] }),
            queryClient.invalidateQueries({ queryKey: ['creditPayments', 'creditId', contract.id] }),
            queryClient.invalidateQueries({ queryKey: ['creditInstallments', 'creditId', contract.id] }),
            queryClient.invalidateQueries({ queryKey: ['guarantorRemunerations', 'creditId', contract.id] }),
            queryClient.invalidateQueries({ queryKey: ['creditContracts'] }),
            queryClient.invalidateQueries({ queryKey: ['creditContractsStats'] }),
          ])
          console.log('[CreditContractDetail] Refetch des queries...')
          // Refetch explicite pour mettre à jour immédiatement
          const [paymentsResult, installmentsResult, contractResult] = await Promise.all([
            queryClient.refetchQueries({ queryKey: ['creditPayments', 'creditId', contract.id] }),
            queryClient.refetchQueries({ queryKey: ['creditInstallments', 'creditId', contract.id] }),
            queryClient.refetchQueries({ queryKey: ['creditContract', contract.id] }),
            queryClient.refetchQueries({ queryKey: ['creditPenalties', 'creditId', contract.id] }),
            queryClient.refetchQueries({ queryKey: ['guarantorRemunerations', 'creditId', contract.id] }),
          ])
          console.log('[CreditContractDetail] Refetch terminé - Payments:', paymentsResult, 'Installments:', installmentsResult, 'Contract:', contractResult)
          setSelectedDueIndex(null)
          setPenaltyOnlyMode(false)
        }}
      />
      {((getSelectedPaymentForReceipt() && selectedDueIndexForReceipt !== null) || selectedPayment) && (
        <PaymentReceiptModal
          isOpen={showReceiptModal}
          onClose={() => {
            setShowReceiptModal(false)
            setSelectedDueIndexForReceipt(null)
            setSelectedPayment(null)
          }}
          contract={contract}
          payment={selectedPayment || getSelectedPaymentForReceipt()!}
          installmentNumber={
            selectedPayment && selectedPayment.installmentId
              ? (installments.find(inst => inst.id === selectedPayment.installmentId)?.installmentNumber)
              : (selectedDueIndexForReceipt !== null ? dueItems[selectedDueIndexForReceipt]?.month : undefined)
          }
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

