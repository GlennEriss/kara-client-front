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
  Percent,
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
const ContractStatsCarousel = ({ contract, penalties = [], realRemainingAmount, totalPaidFromSchedule, totalAmountToRepay, actualSchedule = [] }: { contract: CreditContract; penalties?: CreditPenalty[]; realRemainingAmount: number; totalPaidFromSchedule: number; totalAmountToRepay: number; actualSchedule?: Array<{ interest: number }> }) => {
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

  // Calculer le total des intérêts de l'échéancier actuel
  const totalInterest = actualSchedule.reduce((sum, item) => sum + item.interest, 0)

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
      value: totalAmountToRepay > 0 
        ? `${((totalPaidFromSchedule / totalAmountToRepay) * 100).toFixed(1)}%`
        : '0%',
      subtitle: totalAmountToRepay > 0 
        ? `${Math.round(totalPaidFromSchedule).toLocaleString('fr-FR')} / ${Math.round(totalAmountToRepay).toLocaleString('fr-FR')} FCFA`
        : 'Aucun paiement enregistré',
      color: '#8b5cf6',
      icon: TrendingUp
    },
    {
      title: 'Total intérêts',
      value: Math.round(totalInterest).toLocaleString('fr-FR'),
      subtitle: `Somme des intérêts de l'échéancier`,
      color: '#06b6d4',
      icon: Percent
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
  // Utiliser l'ID du paiement qui contient le numéro du mois (M1, M2, etc.)
  const getPaymentsByMonth = (): Map<number, number> => {
    const paymentsByMonth = new Map<number, number>()
    
    // Filtrer les paiements de mensualités
    // Inclure les paiements de 0 FCFA s'ils ont un commentaire explicite (pas seulement pénalités uniquement)
    const realPayments = payments.filter(p => 
      p.amount > 0 || 
      p.comment?.includes('Paiement de 0 FCFA') ||
      (!p.comment?.includes('Paiement de pénalités uniquement') && p.amount === 0)
    )

    for (const payment of realPayments) {
      // Extraire le numéro du mois depuis l'ID du paiement (format: M{mois}_{idContrat})
      // Exemple: M1_MK_CSP_2663_151225_1510 -> mois = 1
      let month: number | undefined
      
      if (payment.id) {
        const match = payment.id.match(/^M(\d+)_/)
        if (match) {
          month = parseInt(match[1], 10)
        }
      }
      
      // Si on n'a pas pu extraire le mois depuis l'ID, utiliser la date comme fallback
      if (!month || isNaN(month)) {
        const firstDate = new Date(contract.firstPaymentDate)
        const paymentDate = new Date(payment.paymentDate)
        const monthsDiff = (paymentDate.getFullYear() - firstDate.getFullYear()) * 12 + 
                          (paymentDate.getMonth() - firstDate.getMonth())
        month = Math.max(1, monthsDiff + 1)
      }
      
      // Accumuler le montant versé pour ce mois
      const currentAmount = paymentsByMonth.get(month) || 0
      paymentsByMonth.set(month, currentAmount + payment.amount)
    }

    return paymentsByMonth
  }

  // Fonction pour vérifier s'il y a un paiement (même de 0 FCFA) pour un mois donné
  const hasPaymentForMonth = (month: number): boolean => {
    const realPayments = payments.filter(p => 
      p.amount > 0 || 
      p.comment?.includes('Paiement de 0 FCFA') ||
      (!p.comment?.includes('Paiement de pénalités uniquement') && p.amount === 0)
    )

    return realPayments.some(p => {
      let paymentMonth: number | undefined
      
      if (p.id) {
        const match = p.id.match(/^M(\d+)_/)
        if (match) {
          paymentMonth = parseInt(match[1], 10)
        }
      }
      
      if (!paymentMonth || isNaN(paymentMonth)) {
        const firstDate = new Date(contract.firstPaymentDate)
        const paymentDate = new Date(p.paymentDate)
        const monthsDiff = (paymentDate.getFullYear() - firstDate.getFullYear()) * 12 + 
                          (paymentDate.getMonth() - firstDate.getMonth())
        paymentMonth = Math.max(1, monthsDiff + 1)
      }
      
      return paymentMonth === month
    })
  }

  // Calculer les échéances - toujours calculer théoriquement sans utiliser les installments
  const calculateDueItems = (): DueItem[] => {
    // Ne plus utiliser les installments - toujours calculer théoriquement
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

    // Créer un map des paiements par mois pour vérifier le statut de chaque échéance
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

      // Déterminer le statut : utiliser paymentsByMonthMap pour vérifier si un paiement existe pour ce mois spécifique
      let status: 'PAID' | 'DUE' | 'FUTURE' = 'FUTURE'
      let paidAmount = 0
      let paymentDate: Date | undefined

      const currentMonth = monthIndex + 1
      const paidForThisMonth = paymentsByMonthMap.get(currentMonth) || 0

      if (paidForThisMonth > 0) {
        // Un paiement a été fait pour ce mois spécifique
        status = 'PAID'
        paidAmount = paidForThisMonth
        // Trouver le paiement qui correspond à ce mois en utilisant l'ID
        const paymentForThisMonth = sortedPayments.find(p => {
          // Extraire le numéro du mois depuis l'ID du paiement (format: M{mois}_{idContrat})
          if (p.id) {
            const match = p.id.match(/^M(\d+)_/)
            if (match) {
              const paymentMonth = parseInt(match[1], 10)
              return paymentMonth === currentMonth
            }
          }
          return false
        })
        if (paymentForThisMonth) {
          paymentDate = new Date(paymentForThisMonth.paymentDate)
        }
      } else {
        // Aucun paiement pour ce mois
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

  const paymentsByMonth = getPaymentsByMonth()

  // Calculer l'échéancier actuel basé sur les versements réels
  const calculateActualSchedule = (): DueItem[] => {
    const monthlyRate = contract.interestRate / 100
    const firstDate = new Date(contract.firstPaymentDate)
    const maxDuration = contract.duration
    
    // Calcul selon la formule : montantGlobal = montantGlobal * taux + montantGlobal
    // Commencer avec le montant initial
    let currentRemaining = contract.amount // Montant restant avant intérêts
    const items: DueItem[] = []

    // Créer un map des paiements par mois
    const paymentsByMonthMap = getPaymentsByMonth()

    // Trier les paiements par date pour trouver les dates de paiement
    // Inclure les paiements de 0 FCFA s'ils ont un commentaire explicite
    const sortedPayments = [...payments]
      .filter(p => 
        p.amount > 0 || 
        p.comment?.includes('Paiement de 0 FCFA') ||
        (!p.comment?.includes('Paiement de pénalités uniquement') && p.amount === 0)
      )
      .sort((a, b) => 
        new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime()
      )

    const monthlyPayment = contract.monthlyPaymentAmount
    let monthIndex = 0
    
    // Continuer jusqu'à ce que le reste dû soit 0 ou qu'on atteigne une limite raisonnable (ex: 20 mois)
    while (currentRemaining > 0 && monthIndex < 20) {
      const date = new Date(firstDate)
      date.setMonth(date.getMonth() + monthIndex)
      
      // À partir du 8ème mois (index 7), plus d'intérêts
      const isAfterMonth7 = monthIndex >= 7
      
      // Calculer le montant global pour ce mois : currentRemaining + intérêts
      const interest = isAfterMonth7 ? 0 : currentRemaining * monthlyRate
      const montantGlobal = currentRemaining + interest
      
      // Récupérer le montant réellement payé pour ce mois
      const actualPayment = paymentsByMonthMap.get(monthIndex + 1) || 0
      const currentMonth = monthIndex + 1
      const hasPayment = hasPaymentForMonth(currentMonth)
      
      // Calculer la mensualité théorique à payer (indépendante du paiement réel)
      let theoreticalPayment: number
      if (monthlyPayment > montantGlobal) {
        theoreticalPayment = montantGlobal
      } else if (currentRemaining < monthlyPayment && !isAfterMonth7) {
        theoreticalPayment = currentRemaining
      } else {
        theoreticalPayment = monthlyPayment
      }
      
      // Le reste dû est calculé en fonction du montant réellement payé (même 0 FCFA)
      let resteDu: number
      if (hasPayment) {
        // Un paiement a été fait (même de 0 FCFA)
        if (actualPayment >= montantGlobal) {
          resteDu = 0
        } else {
          resteDu = montantGlobal - actualPayment
        }
      } else {
        // Pas de paiement, calculer le reste dû théorique
        if (theoreticalPayment >= montantGlobal) {
          resteDu = 0
        } else {
          resteDu = montantGlobal - theoreticalPayment
        }
      }
      
      // La mensualité affichée dans l'échéancier actuel : le montant réel si payé, sinon théorique
      const displayedPayment = hasPayment ? actualPayment : theoreticalPayment
      
      // Déterminer le statut : si un paiement a été fait (même de 0 FCFA), l'échéance est PAYÉE
      let status: 'PAID' | 'DUE' | 'FUTURE' = 'FUTURE'
      let paymentDate: Date | undefined

      console.log(`[calculateActualSchedule] Mois ${currentMonth}:`, {
        actualPayment,
        hasPayment,
        theoreticalPayment,
        displayedPayment,
        resteDu,
        status: hasPayment ? 'PAID' : 'DUE/FUTURE'
      })

      if (hasPayment) {
        // Il y a un paiement pour ce mois (même de 0 FCFA), l'échéance est payée
        status = 'PAID'
        // Trouver la date du paiement pour ce mois en utilisant l'ID du paiement
        const paymentForThisMonth = sortedPayments.find(p => {
          // Extraire le numéro du mois depuis l'ID du paiement (format: M{mois}_{idContrat})
          if (p.id) {
            const match = p.id.match(/^M(\d+)_/)
            if (match) {
              const paymentMonth = parseInt(match[1], 10)
              return paymentMonth === currentMonth
            }
          }
          // Fallback : utiliser la date si l'ID ne contient pas le format attendu
          const paymentDateObj = new Date(p.paymentDate)
          const monthsDiff = (paymentDateObj.getFullYear() - firstDate.getFullYear()) * 12 +
                            (paymentDateObj.getMonth() - firstDate.getMonth())
          const paymentMonthFromDate = Math.max(1, monthsDiff + 1)
          return paymentMonthFromDate === currentMonth
        })
        if (paymentForThisMonth) {
          paymentDate = new Date(paymentForThisMonth.paymentDate)
        }
      } else {
        // Vérifier si toutes les échéances précédentes ont reçu un paiement
        let allPreviousPaid = true
        for (let j = 0; j < monthIndex; j++) {
          if (!hasPaymentForMonth(j + 1)) {
            allPreviousPaid = false
            break
          }
        }
        status = allPreviousPaid ? 'DUE' : 'FUTURE'
      }

      items.push({
        month: monthIndex + 1,
        date,
        payment: customRound(displayedPayment), // Montant réel si payé, sinon théorique
        interest: customRound(interest),
        principal: customRound(montantGlobal), // Montant global avant paiement
        remaining: customRound(resteDu),
        status,
        paidAmount: hasPayment ? actualPayment : undefined, // Inclure même les paiements de 0 FCFA
        paymentDate,
      })
      
      // Mettre à jour currentRemaining pour le mois suivant : utiliser le reste dû après paiement réel
      currentRemaining = resteDu
      
      monthIndex++
      
      // Arrêter si le reste dû est 0 et qu'on a dépassé la durée initiale
      if (resteDu <= 0 && monthIndex >= maxDuration) {
        break
      }
    }

    // Debug: log pour comprendre le problème
    console.log('[calculateActualSchedule] Échéancier actuel calculé:', items.map(item => ({
      month: item.month,
      payment: item.payment,
      paidAmount: item.paidAmount,
      status: item.status
    })))
    console.log('[calculateActualSchedule] Paiements par mois:', Array.from(paymentsByMonthMap.entries()))

    // Garder les mois payés (même avec 0 FCFA) ET les mois avec mensualité > 0
    return items.filter(item => item.status === 'PAID' || item.payment > 0)
  }

  const actualSchedule = calculateActualSchedule()

  // Trouver la prochaine échéance payable : DUE (utiliser actualSchedule comme source de vérité)
  const nextDueIndex = actualSchedule.findIndex(item => item.status === 'DUE')

  // Créer un map de l'échéancier actuel par mois pour accès rapide
  const actualScheduleByMonth = new Map<number, DueItem>()
  actualSchedule.forEach(item => {
    actualScheduleByMonth.set(item.month, item)
  })

  // Calculer le montant total payé à partir de l'échéancier actuel
  const totalPaidFromSchedule = actualSchedule
    .filter(item => item.status === 'PAID')
    .reduce((sum, item) => sum + (item.paidAmount || item.payment || 0), 0)
  
  // Le montant total à rembourser = somme de toutes les mensualités de l'échéancier actuel
  const totalAmountToRepay = actualSchedule.reduce((sum, item) => sum + item.payment, 0)

  // Calculer le montant restant : valeur totale due - valeur versée
  const realRemainingAmount = totalAmountToRepay - totalPaidFromSchedule

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
    console.log('[getSelectedPaymentForReceipt] Début - selectedDueIndexForReceipt:', selectedDueIndexForReceipt)
    console.log('[getSelectedPaymentForReceipt] Tous les paiements disponibles:', payments.map(p => ({
      id: p.id,
      amount: p.amount,
      paymentDate: p.paymentDate,
      paymentTime: p.paymentTime,
      comment: p.comment,
      reference: p.reference
    })))
    
    if (selectedDueIndexForReceipt === null) {
      console.log('[getSelectedPaymentForReceipt] selectedDueIndexForReceipt est null')
      return null
    }

    const dueItem = actualSchedule[selectedDueIndexForReceipt]
    if (!dueItem) {
      console.log('[getSelectedPaymentForReceipt] dueItem non trouvé pour l\'index:', selectedDueIndexForReceipt)
      return null
    }

    console.log('[getSelectedPaymentForReceipt] Échéance trouvée:', {
      month: dueItem.month,
      status: dueItem.status,
      payment: dueItem.payment,
      paidAmount: dueItem.paidAmount,
      paymentDate: dueItem.paymentDate
    })

    // Trouver TOUS les paiements qui correspondent à ce mois en utilisant l'ID
    const paymentsForThisMonth = payments.filter(p => {
      // Extraire le numéro du mois depuis l'ID du paiement (format: M{mois}_{idContrat})
      if (p.id) {
        const match = p.id.match(/^M(\d+)_/)
        if (match) {
          const paymentMonth = parseInt(match[1], 10)
          return paymentMonth === dueItem.month
        }
      }
      return false
    })

    console.log('[getSelectedPaymentForReceipt] Paiements trouvés pour le mois', dueItem.month, ':', paymentsForThisMonth.map(p => ({
      id: p.id,
      amount: p.amount,
      paymentDate: p.paymentDate,
      paymentTime: p.paymentTime,
      comment: p.comment
    })))

    // Si on a trouvé des paiements pour ce mois, retourner le plus récent (basé sur la date de paiement)
    if (paymentsForThisMonth.length > 0) {
      // Trier par date de paiement (plus récent en premier)
      const sortedPayments = paymentsForThisMonth.sort((a, b) => {
        const dateA = new Date(a.paymentDate).getTime()
        const dateB = new Date(b.paymentDate).getTime()
        // Si les dates sont identiques, comparer par heure
        if (dateA === dateB) {
          const timeA = a.paymentTime || '00:00'
          const timeB = b.paymentTime || '00:00'
          return timeB.localeCompare(timeA) // Plus récent en premier
        }
        return dateB - dateA // Plus récent en premier
      })
      
      const selectedPayment = sortedPayments[0] // Retourner le plus récent
      console.log('[getSelectedPaymentForReceipt] Paiement sélectionné (le plus récent):', {
        id: selectedPayment.id,
        amount: selectedPayment.amount,
        paymentDate: selectedPayment.paymentDate,
        paymentTime: selectedPayment.paymentTime,
        comment: selectedPayment.comment,
        reference: selectedPayment.reference
      })
      return selectedPayment
    }

    // Fallback : utiliser la date de paiement si disponible
    if (dueItem.paymentDate) {
      console.log('[getSelectedPaymentForReceipt] Fallback: utilisation de la date de paiement')
      const duePaymentDate = new Date(dueItem.paymentDate)
      duePaymentDate.setHours(0, 0, 0, 0)

      // Trouver TOUS les paiements qui correspondent à cette date
      const matchingPayments = payments.filter(p => {
        const paymentDate = new Date(p.paymentDate)
        paymentDate.setHours(0, 0, 0, 0)
        // Comparer les dates (tolérance de 1 jour)
        return Math.abs(paymentDate.getTime() - duePaymentDate.getTime()) <= 24 * 60 * 60 * 1000
      })

      console.log('[getSelectedPaymentForReceipt] Paiements trouvés par date:', matchingPayments.map(p => ({
        id: p.id,
        amount: p.amount,
        paymentDate: p.paymentDate,
        paymentTime: p.paymentTime,
        comment: p.comment
      })))

      // Retourner le plus récent
      if (matchingPayments.length > 0) {
        const sortedPayments = matchingPayments.sort((a, b) => {
          const dateA = new Date(a.paymentDate).getTime()
          const dateB = new Date(b.paymentDate).getTime()
          if (dateA === dateB) {
            const timeA = a.paymentTime || '00:00'
            const timeB = b.paymentTime || '00:00'
            return timeB.localeCompare(timeA)
          }
          return dateB - dateA
        })
        const selectedPayment = sortedPayments[0]
        console.log('[getSelectedPaymentForReceipt] Paiement sélectionné (fallback, le plus récent):', {
          id: selectedPayment.id,
          amount: selectedPayment.amount,
          paymentDate: selectedPayment.paymentDate,
          paymentTime: selectedPayment.paymentTime,
          comment: selectedPayment.comment,
          reference: selectedPayment.reference
        })
        return selectedPayment
      }
    }

    console.log('[getSelectedPaymentForReceipt] Aucun paiement trouvé')
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
          <ContractStatsCarousel 
            contract={contract} 
            penalties={penalties} 
            realRemainingAmount={realRemainingAmount}
            totalPaidFromSchedule={totalPaidFromSchedule}
            totalAmountToRepay={totalAmountToRepay}
            actualSchedule={actualSchedule}
          />
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
                {actualSchedule.map((item, index) => {
                  // Permettre les paiements si le contrat est ACTIVE, PARTIAL, ou s'il reste des échéances à payer
                  // Même si le contrat est DISCHARGED, on peut avoir des échéances restantes à payer
                  const hasUnpaidInstallments = actualSchedule.some(i => i.status === 'DUE' || i.status === 'FUTURE')
                  const canMakePayments = contract.status === 'ACTIVE' || contract.status === 'PARTIAL' || hasUnpaidInstallments
                  
                  // Vérifier si toutes les échéances précédentes sont payées
                  let allPreviousPaid = true
                  const previousStatuses: string[] = []
                  for (let j = 0; j < index; j++) {
                    previousStatuses.push(`M${actualSchedule[j].month}:${actualSchedule[j].status}`)
                    if (actualSchedule[j].status !== 'PAID') {
                      allPreviousPaid = false
                    }
                  }
                  
                  // Permettre de payer si :
                  // - L'échéance est DUE
                  // - Toutes les échéances précédentes sont payées
                  const isPayable = item.status === 'DUE' && allPreviousPaid
                  
                  const isDisabled = !canMakePayments || 
                                   item.status === 'FUTURE' || 
                                   item.status === 'PAID' ||
                                   !isPayable
                  
                  // Log de débogage pour l'échéance 8
                  if (item.month === 8) {
                    console.log('[CreditContractDetail] Debug Échéance 8:', {
                      month: item.month,
                      index,
                      status: item.status,
                      canMakePayments,
                      contractStatus: contract.status,
                      hasUnpaidInstallments,
                      allPreviousPaid,
                      previousStatuses,
                      isPayable,
                      isDisabled,
                      reasons: {
                        notCanMakePayments: !canMakePayments,
                        isFuture: item.status === 'FUTURE',
                        isPaid: item.status === 'PAID',
                        notIsPayable: !isPayable
                      },
                      actualScheduleLength: actualSchedule.length,
                      actualScheduleItems: actualSchedule.map(i => ({ month: i.month, status: i.status }))
                    })
                  }
                  
                  // Déterminer si le paiement est suffisant
                  const theoreticalPaymentForCard = Math.min(contract.monthlyPaymentAmount, item.principal)
                  const paidAmountForCard = item.paidAmount !== undefined ? item.paidAmount : null
                  const isPaymentSufficient = paidAmountForCard !== null && paidAmountForCard >= theoreticalPaymentForCard
                  
                  const statusConfig = item.status === 'PAID' 
                    ? isPaymentSufficient
                      ? { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', icon: CheckCircle, label: 'Payé' }
                      : { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', icon: AlertCircle, label: 'Payé (insuffisant)' }
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
                          ? isPaymentSufficient
                            ? 'border-green-200 bg-green-50/50 cursor-pointer hover:shadow-lg hover:-translate-y-1'
                            : 'border-red-200 bg-red-50/50 cursor-pointer hover:shadow-lg hover:-translate-y-1'
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

                          {(() => {
                            // Calculer le montant théorique à payer (mensualité ou montant global si inférieur)
                            const theoreticalPayment = Math.min(contract.monthlyPaymentAmount, item.principal)
                            const paidAmount = item.paidAmount !== undefined ? item.paidAmount : null
                            
                            return (
                              <>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-gray-600">Montant à payer:</span>
                                  <span className="font-semibold text-gray-900">
                                    {theoreticalPayment.toLocaleString('fr-FR')} FCFA
                                  </span>
                                </div>
                                
                                {/* Afficher montant versé si l'échéance est payée */}
                                {item.status === 'PAID' && paidAmount !== null && (
                                  <div className={`flex items-center justify-between text-sm mt-2 p-2 rounded ${
                                    paidAmount >= theoreticalPayment 
                                      ? 'bg-green-50 border border-green-200' 
                                      : 'bg-red-50 border border-red-200'
                                  }`}>
                                    <span className={`font-medium ${
                                      paidAmount >= theoreticalPayment ? 'text-green-700' : 'text-red-700'
                                    }`}>Montant versé:</span>
                                    <span className={`font-semibold ${
                                      paidAmount >= theoreticalPayment ? 'text-green-800' : 'text-red-800'
                                    }`}>
                                      {paidAmount.toLocaleString('fr-FR')} FCFA
                                    </span>
                                  </div>
                                )}
                              </>
                            )
                          })()}
                          
                          {/* Détail principal + intérêts */}
                          <div className="flex items-center justify-between text-sm mt-1 pt-1 border-t border-gray-200">
                            <div className="flex items-center justify-between w-full">
                              <span className="text-gray-600">Capital:</span>
                              <span className="font-semibold text-gray-900">
                                {item.principal.toLocaleString('fr-FR')} FCFA
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Intérêts:</span>
                            <span className="font-semibold text-gray-900">
                              {item.interest.toLocaleString('fr-FR')} FCFA
                            </span>
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
                                console.log('[CreditContractDetail] Clic sur "Voir le reçu" - Échéance:', {
                                  month: item.month,
                                  index: index,
                                  payment: item.payment,
                                  paidAmount: item.paidAmount,
                                  paymentDate: item.paymentDate,
                                  status: item.status
                                })
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
                        // Trouver l'échéance correspondante à ce paiement en utilisant l'ID du paiement
                        let relatedDueItem = null
                        if (payment.id) {
                          // Extraire le numéro du mois depuis l'ID du paiement (format: M{mois}_{idContrat})
                          const match = payment.id.match(/^M(\d+)_/)
                          if (match) {
                            const paymentMonth = parseInt(match[1], 10)
                            relatedDueItem = actualSchedule.find(item => item.month === paymentMonth) || null
                          }
                        }
                        
                        return (
                        <div
                          key={payment.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => {
                            console.log('[CreditContractDetail] Clic sur un paiement dans l\'historique:', {
                              paymentId: payment.id,
                              amount: payment.amount,
                              paymentDate: payment.paymentDate,
                              paymentTime: payment.paymentTime,
                              comment: payment.comment,
                              reference: payment.reference,
                              relatedDueItem: relatedDueItem ? {
                                month: relatedDueItem.month,
                                status: relatedDueItem.status
                              } : null
                            })
                            setSelectedPayment(payment)
                            setSelectedDueIndexForReceipt(relatedDueItem ? actualSchedule.findIndex(item => item.month === relatedDueItem.month) : null)
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
                        <span className="text-gray-600">Payé (montant suffisant)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-red-50 border border-red-200 rounded"></div>
                        <span className="text-gray-600">Payé (montant insuffisant)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-white border border-gray-200 rounded"></div>
                        <span className="text-gray-600">Non payé</span>
                      </div>
                    </div>
                    <div className="border rounded-lg overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Mois</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Montant versé</TableHead>
                            <TableHead className="text-right">Intérêts</TableHead>
                            <TableHead className="text-right">Montant global</TableHead>
                            <TableHead className="text-right">Reste dû</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {actualSchedule.map((row) => {
                            // Calculer si le paiement est suffisant
                            const paidAmount = row.paidAmount !== undefined ? row.paidAmount : null
                            const theoreticalPayment = contract.monthlyPaymentAmount
                            
                            // Vert si payé ET montant suffisant (>= mensualité théorique ou >= montant global)
                            // Rouge si payé MAIS montant insuffisant (< min(mensualité, montant global))
                            // Blanc si pas encore payé
                            let rowColor = ''
                            if (row.status === 'PAID' && paidAmount !== null) {
                              const expectedPayment = Math.min(theoreticalPayment, row.principal)
                              rowColor = paidAmount >= expectedPayment 
                                ? 'bg-green-50 hover:bg-green-100'
                                : 'bg-red-50 hover:bg-red-100'
                            }
                            
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
                        <span className="text-gray-600">0 ≤ montant versé &lt; mensualité</span>
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
                            // Vérifier si un paiement a été fait (même de 0 FCFA)
                            const hasPayment = row.paidAmount !== undefined || hasPaymentForMonth(row.month)
                            // Montant payé (peut être 0 FCFA)
                            const paidForMonth = row.paidAmount !== undefined 
                              ? row.paidAmount 
                              : (paymentsByMonth.get(row.month) ?? null)
                            
                            // Vert si paiement fait ET montant >= mensualité
                            // Rouge si paiement fait MAIS montant < mensualité (inclut 0 FCFA)
                            // Blanc si aucun paiement
                            const rowColor = !hasPayment || paidForMonth === null
                              ? '' // Aucun paiement = blanc
                              : paidForMonth >= row.payment 
                              ? 'bg-green-50 hover:bg-green-100' 
                              : 'bg-red-50 hover:bg-red-100' // Paiement fait mais < mensualité (inclut 0 FCFA)
                            
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
        defaultAmount={selectedDueIndex !== null ? actualSchedule[selectedDueIndex]?.payment : contract.monthlyPaymentAmount}
        defaultPaymentDate={selectedDueIndex !== null ? actualSchedule[selectedDueIndex]?.date : undefined}
        defaultPenaltyOnlyMode={penaltyOnlyMode}
        installmentId={(() => {
          const installmentId = selectedDueIndex !== null ? actualSchedule[selectedDueIndex]?.installmentId : undefined;
          console.log('[CreditContractDetail] Ouverture du modal de paiement - selectedDueIndex:', selectedDueIndex, 'installmentId:', installmentId, 'dueItem:', selectedDueIndex !== null ? actualSchedule[selectedDueIndex] : null);
          return installmentId;
        })()}
        installmentNumber={(() => {
          const month = selectedDueIndex !== null ? actualSchedule[selectedDueIndex]?.month : undefined;
          console.log('[CreditContractDetail] Passage de installmentNumber au modal:', {
            selectedDueIndex,
            month,
            actualScheduleLength: actualSchedule.length,
            actualScheduleItem: selectedDueIndex !== null ? actualSchedule[selectedDueIndex] : null
          });
          return month;
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
            console.log('[CreditContractDetail] Fermeture du modal de reçu')
            setShowReceiptModal(false)
            setSelectedDueIndexForReceipt(null)
            setSelectedPayment(null)
          }}
          contract={contract}
          payment={(() => {
            const finalPayment = selectedPayment || getSelectedPaymentForReceipt()!
            console.log('[CreditContractDetail] Paiement final passé au modal:', {
              id: finalPayment.id,
              amount: finalPayment.amount,
              paymentDate: finalPayment.paymentDate,
              paymentTime: finalPayment.paymentTime,
              comment: finalPayment.comment,
              reference: finalPayment.reference,
              source: selectedPayment ? 'selectedPayment' : 'getSelectedPaymentForReceipt'
            })
            return finalPayment
          })()}
          installmentNumber={
            selectedPayment && selectedPayment.installmentId
              ? (installments.find(inst => inst.id === selectedPayment.installmentId)?.installmentNumber)
              : (selectedDueIndexForReceipt !== null ? actualSchedule[selectedDueIndexForReceipt]?.month : undefined)
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

