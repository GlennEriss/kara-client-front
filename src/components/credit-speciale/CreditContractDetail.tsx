'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import EmergencyContact from '@/components/contract/standard/EmergencyContact'
import routes from '@/constantes/routes'
import { getAdminById } from '@/db/admin.db'
import { ServiceFactory } from '@/factories/ServiceFactory'
import { useAdmin } from '@/hooks/useAdmins'
import { useAuth } from '@/hooks/useAuth'
import { useChildContract, useCreditContractMutations, useCreditInstallmentsByCreditId, useCreditPaymentsByCreditId, useCreditPenaltiesByCreditId, useGuarantorPaymentsByCreditId, useGuarantorRemunerationsByCreditId, useParentContract, useSwitchToFixedPhase } from '@/hooks/useCreditSpeciale'
import { useMember } from '@/hooks/useMembers'
import { cn } from '@/lib/utils'
import {
  buildCreditSpecialFactureData,
  buildCreditSpecialFacturePage1Data,
} from '@/services/credit-speciale/creditSpecialeFactureHelpers'
import { generateGlobalFactureCreditSpecialPDF } from '@/services/credit-speciale/factureCreditSpecialPdfExport'
import { generateCreditSpecialGuarantorCommissionHistoryPDF } from '@/services/credit-speciale/guarantorCommissionHistoryCreditSpecialPdfExport'
import { generateCreditSpecialLossHistoryPDF } from '@/services/credit-speciale/lossHistoryCreditSpecialPdfExport'
import { CreditContract, CreditContractStatus, CreditPayment, CreditPenalty } from '@/types/types'
import {
  getCreditContractCycles,
  buildCreditSpecialeHistory,
  buildCreditSpecialeTimelineHistory,
  getCreditPaymentDisplayMonthLabel,
  getCreditPaymentCycleNumber,
  getCreditPaymentMonthNumber,
  getCreditPaymentsForCurrentCycle,
  getCreditSpecialeLastRecordedMonth,
} from '@/utils/credit-speciale-history'
import { useQueries, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
    AlertCircle,
    ArrowLeft,
    Calendar,
    CalendarDays,
    CheckCircle,
    ChevronLeft,
    ChevronRight,
    Clock,
    DollarSign,
    Download,
    ExternalLink,
    Eye,
    FileSignature,
    FileText,
    HandCoins,
    History,
    Lock,
    Link2,
    Loader2,
    Pencil,
    Percent,
    Plus,
    Shield,
    TrendingUp,
    Upload,
    User,
    XCircle
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import React, { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import CloseContractModal from './CloseContractModal'
import CreditPenaltyPaymentModal from './CreditPenaltyPaymentModal'
import CreditPenaltyReceiptModal from './CreditPenaltyReceiptModal'
import CreditExtensionModal from './CreditExtensionModal'
import CreditPaymentModal from './CreditPaymentModal'
import CreditSpecialeContractPDFModal from './CreditSpecialeContractPDFModal'
import FinalRepaymentModal from './FinalRepaymentModal'
import GuarantorPaymentModal from './GuarantorPaymentModal'
import PaymentReceiptModal from './PaymentReceiptModal'
import PaymentSummaryModal from './PaymentSummaryModal'
import QuittanceCreditSpecialePDFModal from './QuittanceCreditSpecialePDFModal'
import RestMonthModal from './RestMonthModal'
import SignedQuittanceUploadModal from './SignedQuittanceUploadModal'
import SwitchToFixedPhaseModal from './SwitchToFixedPhaseModal'

interface CreditContractDetailProps {
  contract: CreditContract
  listPath?: string
  contractDetailsBasePath?: string
}

// Libellés moyen de paiement (alignés caisse spéciale + rétrocompatibilité + remboursement final)
const CREDIT_PAYMENT_MODE_LABELS: Record<string, string> = {
  airtel_money: 'Airtel Money',
  mobicash: 'Mobicash',
  cash: 'Espèce',
  bank_transfer: 'Virement bancaire',
  other: 'Autre',
  CASH: 'Espèces',
  MOBILE_MONEY: 'Mobile Money',
  BANK_TRANSFER: 'Virement bancaire',
  CHEQUE: 'Chèque',
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
  status: 'PAID' | 'DUE' | 'FUTURE' | 'REST'
  paidAmount?: number
  paymentDate?: Date
  paymentTime?: string // Heure du paiement (HH:mm) pour affichage "Payé à"
  installmentId?: string // ID de l'échéance pour lier les paiements
  /** Ligne « Mois de repos » (pas de paiement, pas de pénalité) */
  isRest?: boolean
  restReason?: string
  restRecordedByName?: string
  restRecordedAt?: Date
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
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    isDragging,
  }
}

// Carrousel de statistiques (même design que StatisticsCreditDemandes)
const ContractStatsCarousel = ({ contract, penalties = [], realRemainingAmount, totalPaidFromSchedule, totalAmountToRepay, actualSchedule = [], totalLosses = 0 }: { contract: CreditContract; penalties?: CreditPenalty[]; realRemainingAmount: number; totalPaidFromSchedule: number; totalAmountToRepay: number; actualSchedule?: Array<{ interest: number }>; totalLosses?: number }) => {
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

  const isSimpleCredit = contract.creditType === 'FIXE' || contract.creditType === 'AIDE'
  // Crédit fixe: intérêt unique appliqué une seule fois
  const totalInterest = isSimpleCredit
    ? Math.max(0, customRound(contract.totalAmount - contract.amount))
    : actualSchedule.reduce((sum, item) => sum + item.interest, 0)

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
      title: isSimpleCredit ? 'Intérêt unique' : 'Total intérêts',
      value: Math.round(totalInterest).toLocaleString('fr-FR'),
      subtitle: isSimpleCredit
        ? 'Appliqué une seule fois au démarrage'
        : `Somme des intérêts de l'échéancier`,
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
    ...(totalLosses > 0 ? [{
      title: 'Manque à gagner',
      value: totalLosses.toLocaleString('fr-FR'),
      subtitle: contract.creditType === 'FIXE'
        ? 'Pertes après la durée contractuelle'
        : 'Manque à gagner en partie fixe',
      color: '#dc2626',
      icon: TrendingUp
    }] : []),
  ]

  const { 
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
    CLOSED: { label: 'Contrat clos', color: 'text-white', bgColor: 'bg-gradient-to-r from-slate-600 to-slate-700 shadow-md ring-1 ring-slate-500/30' },
    EXTENDED: { label: 'Étendu', color: 'text-cyan-600', bgColor: 'bg-cyan-100' },
  }
  return configs[status] || configs.DRAFT
}

const canUploadSignedContract = (contract: CreditContract): boolean => {
  const uploadableStatuses: CreditContractStatus[] = ['PENDING', 'ACTIVE', 'PARTIAL', 'OVERDUE', 'BLOCKED']
  return !contract.signedContractUrl && uploadableStatuses.includes(contract.status)
}

export default function CreditContractDetail({
  contract,
  listPath = routes.admin.creditSpecialeContrats,
  contractDetailsBasePath = routes.admin.creditSpecialeContrats,
}: CreditContractDetailProps) {
  const router = useRouter()
  const { user: _user } = useAuth()
  const [activeTab, setActiveTab] = useState<'payments' | 'penalties' | 'history' | 'losses' | 'guarantor'>('payments')
  const isSimpleCredit = contract.creditType === 'FIXE' || contract.creditType === 'AIDE'
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [showPaymentSummaryModal, setShowPaymentSummaryModal] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<CreditPayment | null>(null)
  const [selectedPenaltyToPay, setSelectedPenaltyToPay] = useState<CreditPenalty | null>(null)
  const [selectedPenaltyForReceipt, setSelectedPenaltyForReceipt] = useState<CreditPenalty | null>(null)
  const [paymentToEdit, setPaymentToEdit] = useState<CreditPayment | null>(null)
  const [selectedDueIndex, setSelectedDueIndex] = useState<number | null>(null)
  const [selectedDueIndexForReceipt, setSelectedDueIndexForReceipt] = useState<number | null>(null)
  const [selectedDueIndexForSummary, setSelectedDueIndexForSummary] = useState<number | null>(null)
  const [showUploadContractModal, setShowUploadContractModal] = useState(false)
  const [contractFile, setContractFile] = useState<File | undefined>()
  const [showReplaceContractModal, setShowReplaceContractModal] = useState(false)
  const [replaceContractFile, setReplaceContractFile] = useState<File | undefined>()
  const [isCompressing] = useState(false)
  const [showExtensionModal, setShowExtensionModal] = useState(false)
  const [showFinalRepaymentModal, setShowFinalRepaymentModal] = useState(false)
  const [showSignedQuittanceUploadModal, setShowSignedQuittanceUploadModal] = useState(false)
  const [showCloseContractModal, setShowCloseContractModal] = useState(false)
  const [showSwitchToFixedModal, setShowSwitchToFixedModal] = useState(false)
  const [showQuittanceModal, setShowQuittanceModal] = useState(false)
  const [showPenaltyPaymentModal, setShowPenaltyPaymentModal] = useState(false)
  const [showPenaltyReceiptModal, setShowPenaltyReceiptModal] = useState(false)
  const [penaltyPaymentModalMode, setPenaltyPaymentModalMode] = useState<'pay' | 'edit'>('pay')
  const [isGeneratingGlobalFacturePdf, setIsGeneratingGlobalFacturePdf] = useState(false)
  const [isGeneratingLossHistoryPdf, setIsGeneratingLossHistoryPdf] = useState(false)
  const [isExportingLossHistoryExcel, setIsExportingLossHistoryExcel] = useState(false)
  const [isGeneratingGuarantorCommissionsPdf, setIsGeneratingGuarantorCommissionsPdf] = useState(false)
  const [isExportingGuarantorCommissionsExcel, setIsExportingGuarantorCommissionsExcel] = useState(false)
  const { uploadSignedContract, replaceSignedContract, validateFinalRepayment, generateQuittancePDF, uploadSignedQuittance, replaceSignedQuittance, closeContract } = useCreditContractMutations()
  const switchToFixedPhase = useSwitchToFixedPhase()

  // États pour les modals
  const [showContractPDFModal, setShowContractPDFModal] = useState(false)
  
  // Récupérer les contrats parent et enfant (pour les extensions)
  const { data: childContract } = useChildContract(contract.id)
  const { data: parentContract } = useParentContract(contract.parentContractId)
  const { data: member } = useMember(contract.clientId)

  // Récupérer les paiements, pénalités, échéances et rémunérations du garant
  const { data: payments = [], isLoading: isLoadingPayments } = useCreditPaymentsByCreditId(contract.id)
  const { data: penalties = [] } = useCreditPenaltiesByCreditId(contract.id)
  const { data: installments = [], isLoading: isLoadingInstallments } = useCreditInstallmentsByCreditId(contract.id)
  const shouldLoadGuarantorTabData =
    activeTab === 'guarantor' &&
    !!contract.guarantorId &&
    !!contract.guarantorIsMember &&
    (contract.guarantorRemunerationPercentage ?? 0) > 0
  const {
    data: guarantorRemunerations = [],
    isLoading: isLoadingRemunerations,
    isError: isGuarantorRemunerationsError,
    error: guarantorRemunerationsError,
  } = useGuarantorRemunerationsByCreditId(contract.id, shouldLoadGuarantorTabData)
  const {
    data: guarantorPayments = [],
    isLoading: isLoadingGuarantorPayments,
    isError: isGuarantorPaymentsError,
    error: guarantorPaymentsError,
  } = useGuarantorPaymentsByCreditId(contract.id, shouldLoadGuarantorTabData)
  const [showGuarantorPaymentModal, setShowGuarantorPaymentModal] = useState(false)
  const [showRestMonthModal, setShowRestMonthModal] = useState(false)
  const [selectedRestMonth, setSelectedRestMonth] = useState<number | null>(null)
  const queryClient = useQueryClient()
  const missingPenaltiesCheckRef = useRef<string | null>(null)

  const penaltyAdminIds = React.useMemo(
    () =>
      Array.from(
        new Set(
          penalties
            .flatMap((penalty) => [
              penalty.createdBy,
              penalty.paymentRecordedBy ?? penalty.updatedBy,
              penalty.paymentUpdatedBy,
            ])
            .filter((value): value is string => !!value)
        )
      ),
    [penalties]
  )

  const penaltyAdminQueries = useQueries({
    queries: penaltyAdminIds.map((adminId) => ({
      queryKey: ['admins', adminId],
      queryFn: () => getAdminById(adminId),
      enabled: !!adminId,
      staleTime: 5 * 60 * 1000,
    })),
  })

  const penaltyAdminNameMap = React.useMemo(() => {
    const entries = penaltyAdminIds.map((adminId, index) => {
      const admin = penaltyAdminQueries[index]?.data
      const fullName = admin ? `${admin.firstName} ${admin.lastName}`.trim() : ''
      return [adminId, fullName || adminId] as const
    })
    return Object.fromEntries(entries) as Record<string, string>
  }, [penaltyAdminIds, penaltyAdminQueries])

  const getPenaltyAdminDisplayName = React.useCallback(
    (adminId?: string) => {
      if (!adminId) return '-'
      return penaltyAdminNameMap[adminId] ?? adminId
    },
    [penaltyAdminNameMap]
  )

  // Vérifier et créer les pénalités manquantes au chargement
  useEffect(() => {
    if (isLoadingPayments || payments.length === 0) {
      return
    }

    const runKey = `${contract.id}:${payments.length}`
    if (missingPenaltiesCheckRef.current === runKey) {
      return
    }
    missingPenaltiesCheckRef.current = runKey

    const service = ServiceFactory.getCreditSpecialeService()
    service.checkAndCreateMissingPenalties(contract.id)
      .then(() => {
        // Rafraîchir les pénalités après vérification
        queryClient.invalidateQueries({ queryKey: ['creditPenalties', 'creditId', contract.id] })
      })
      .catch((error: unknown) => {
        console.error('Erreur lors de la vérification des pénalités:', error)
      })
  }, [contract.id, payments.length, isLoadingPayments, queryClient])

  const statusConfig = getStatusConfig(contract.status)
  const isUploadActivationFlow = contract.status === 'PENDING'
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

  // Le détail du contrat travaille sur le cycle actif ; l’historique complet reste visible plus bas.
  const paymentsForSchedule =
    contract.creditType === 'SPECIALE'
      ? getCreditPaymentsForCurrentCycle(contract, payments)
      : payments
  const specialHistory =
    contract.creditType === 'SPECIALE'
      ? buildCreditSpecialeHistory(contract, paymentsForSchedule, { projectUntilZero: true })
      : []
  const lastRecordedSpecialMonth =
    contract.creditType === 'SPECIALE'
      ? getCreditSpecialeLastRecordedMonth(contract, paymentsForSchedule)
      : 0
  const timelineHistoryRows =
    contract.creditType === 'SPECIALE'
      ? buildCreditSpecialeTimelineHistory(contract, payments)
      : []
  const timelineHistoryByCycle = timelineHistoryRows.reduce((acc, row) => {
    const existing = acc.get(row.cycleNumber) ?? []
    existing.push(row)
    acc.set(row.cycleNumber, existing)
    return acc
  }, new Map<number, typeof timelineHistoryRows>())
  const specialHistoryByMonth =
    contract.creditType === 'SPECIALE'
      ? new Map(specialHistory.map((row) => [row.month, row]))
      : new Map<number, (typeof specialHistory)[number]>()
  const contractCycles = React.useMemo(
    () => getCreditContractCycles(contract),
    [contract]
  )
  const hasCreditAugmentation = contractCycles.length > 1
  const currentCycle = React.useMemo(
    () => contractCycles.at(-1),
    [contractCycles]
  )
  const fixedTransitionMeta = React.useMemo(() => ({
    mode: currentCycle?.fixedTransitionMode ?? contract.fixedTransitionMode,
    at: currentCycle?.fixedTransitionAt ?? contract.fixedTransitionAt,
    by: currentCycle?.fixedTransitionBy ?? contract.fixedTransitionBy,
    reason: currentCycle?.fixedTransitionReason ?? contract.fixedTransitionReason,
    startMonth: currentCycle?.fixedTransitionStartMonth ?? contract.fixedTransitionStartMonth,
  }), [currentCycle, contract.fixedTransitionAt, contract.fixedTransitionBy, contract.fixedTransitionMode, contract.fixedTransitionReason, contract.fixedTransitionStartMonth])
  const contractDocumentsByCycle = React.useMemo(() => {
    const hasAugmentation = contractCycles.length > 1
    const currentCycleNumber = contractCycles.at(-1)?.cycleNumber ?? 1

    return [...contractCycles]
      .sort((left, right) => right.cycleNumber - left.cycleNumber)
      .map((cycle) => {
        const isCurrentCycle = cycle.cycleNumber === currentCycleNumber
        const contractUrl = isCurrentCycle
          ? (contract.contractUrl || cycle.contractUrl || '')
          : (cycle.contractUrl || '')
        const signedContractUrl = isCurrentCycle
          ? (contract.signedContractUrl || cycle.signedContractUrl || '')
          : (cycle.signedContractUrl || '')

        const title = cycle.cycleNumber === 1
          ? (hasAugmentation ? 'Cycle 1 - Contrat initial (avant augmentation)' : 'Cycle 1 - Contrat initial')
          : `Cycle ${cycle.cycleNumber} - Contrat après augmentation`

        return {
          cycleNumber: cycle.cycleNumber,
          startedAt: cycle.startedAt,
          title,
          isCurrentCycle,
          contractUrl,
          signedContractUrl,
        }
      })
  }, [contract, contractCycles])
  const currentCycleDocuments = contractDocumentsByCycle.find((entry) => entry.isCurrentCycle)
  const hasEnteredFixedPhase =
    contract.creditType === 'SPECIALE' &&
    specialHistory.some(
      (row) => row.phase === 'FIXE' && (row.hasPaymentRecord || row.status === 'DUE')
    )
  const { data: fixedTransitionAdmin } = useAdmin(fixedTransitionMeta.by || '')
  const guarantorRemunerationsErrorMessage =
    guarantorRemunerationsError instanceof Error
      ? guarantorRemunerationsError.message
      : 'Impossible de charger les commissions du garant.'
  const guarantorPaymentsErrorMessage =
    guarantorPaymentsError instanceof Error
      ? guarantorPaymentsError.message
      : 'Impossible de charger l’historique des paiements au garant.'
  const penaltiesByTimelineKey = new Map<string, number>()
  if (contract.creditType === 'SPECIALE') {
    timelineHistoryRows.forEach((row) => {
      const rowDay = new Date(row.date)
      rowDay.setHours(0, 0, 0, 0)
      const rowPenaltyAmount = penalties.reduce((sum, penalty) => {
        const penaltyDay = new Date(penalty.dueDate)
        penaltyDay.setHours(0, 0, 0, 0)
        return penaltyDay.getTime() === rowDay.getTime() ? sum + penalty.amount : sum
      }, 0)
      penaltiesByTimelineKey.set(row.key, rowPenaltyAmount)
    })
  }

  // Mapper les paiements aux échéances (mois) pour savoir combien a été versé pour chaque échéance
  // Utiliser l'ID du paiement qui contient le numéro du mois (M1, M2, etc.)
  const getPaymentsByMonth = (): Map<number, number> => {
    const paymentsByMonth = new Map<number, number>()
    
    // Filtrer les paiements de mensualités
    // Inclure les paiements de 0 FCFA s'ils ont un commentaire explicite (pas seulement pénalités uniquement)
    const realPayments = paymentsForSchedule.filter(p => 
      p.amount > 0 || 
      p.comment?.includes('Paiement de 0 FCFA') ||
      (!p.comment?.includes('Paiement de pénalités uniquement') && p.amount === 0)
    )

    for (const payment of realPayments) {
      const month = getCreditPaymentMonthNumber(contract, payment)

      // Accumuler le montant versé pour ce mois
      const currentAmount = paymentsByMonth.get(month) || 0
      paymentsByMonth.set(month, currentAmount + payment.amount)
    }

    return paymentsByMonth
  }

  // Fonction pour vérifier s'il y a un paiement (même de 0 FCFA) pour un mois donné
  const hasPaymentForMonth = (month: number): boolean => {
    const realPayments = paymentsForSchedule.filter(p => 
      p.amount > 0 || 
      p.comment?.includes('Paiement de 0 FCFA') ||
      (!p.comment?.includes('Paiement de pénalités uniquement') && p.amount === 0)
    )

    return realPayments.some((payment) => getCreditPaymentMonthNumber(contract, payment) === month)
  }

  // Calculer les échéances - toujours calculer théoriquement sans utiliser les installments
  const calculateDueItems = (): DueItem[] => {
    const firstDate = new Date(contract.firstPaymentDate)

    // Crédit fixe: intérêt unique, pas d'intérêt mensuel composé
    if (isSimpleCredit) {
      const totalAmount = customRound(contract.totalAmount)
      const hasCustomSchedule = !!contract.customSchedule?.length
      const items: DueItem[] = []
      const paymentsByMonthMap = getPaymentsByMonth()

      const sortedPayments = [...paymentsForSchedule]
        .filter(
          (p) =>
            p.amount > 0 ||
            p.comment?.includes('Paiement de 0 FCFA') ||
            (!p.comment?.includes('Paiement de pénalités uniquement') && p.amount === 0)
        )
        .sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime())

      const plannedPaymentByMonth = new Map<number, number>()
      const plannedDuration = hasCustomSchedule
        ? Math.max(
            contract.duration,
            ...contract.customSchedule!.map((entry, index) => entry.month || index + 1)
          )
        : Math.max(1, contract.duration)

      if (hasCustomSchedule) {
        contract.customSchedule!.forEach((entry, index) => {
          const month = entry.month || index + 1
          plannedPaymentByMonth.set(month, Math.max(0, customRound(entry.amount)))
        })
      } else {
        const basePayment = Math.floor(totalAmount / plannedDuration)
        let cumulative = 0
        for (let month = 1; month <= plannedDuration; month++) {
          const payment = month === plannedDuration ? Math.max(0, totalAmount - cumulative) : basePayment
          plannedPaymentByMonth.set(month, payment)
          cumulative += payment
        }
      }

      let cumulativePlanned = 0
      for (let month = 1; month <= plannedDuration; month++) {
        const date = new Date(firstDate)
        date.setMonth(date.getMonth() + (month - 1))

        const plannedPayment = plannedPaymentByMonth.get(month) ?? 0
        const principalAtStart = Math.max(0, customRound(totalAmount - cumulativePlanned))
        cumulativePlanned += plannedPayment
        const remaining = Math.max(0, customRound(totalAmount - cumulativePlanned))

        const paidForThisMonth = paymentsByMonthMap.get(month) || 0
        const hasPayment = hasPaymentForMonth(month)
        let status: 'PAID' | 'DUE' | 'FUTURE' = 'FUTURE'
        let paymentDate: Date | undefined
        let paymentTime: string | undefined

        if (hasPayment) {
          status = 'PAID'
          const paymentForThisMonth = sortedPayments.find((payment) => getCreditPaymentMonthNumber(contract, payment) === month)
          if (paymentForThisMonth) {
            paymentDate = new Date(paymentForThisMonth.paymentDate)
            paymentTime = (paymentForThisMonth as { paymentTime?: string }).paymentTime
          }
        } else {
          let allPreviousPaid = true
          for (let previousMonth = 1; previousMonth < month; previousMonth++) {
            if (!hasPaymentForMonth(previousMonth)) {
              allPreviousPaid = false
              break
            }
          }
          status = allPreviousPaid ? 'DUE' : 'FUTURE'
        }

        items.push({
          month,
          date,
          payment: plannedPayment,
          interest: 0,
          principal: principalAtStart,
          remaining,
          status,
          paidAmount: status === 'PAID' ? paidForThisMonth : undefined,
          paymentDate,
          paymentTime,
        })
      }

      return items
    }

    return specialHistory.map((row) => ({
      month: row.month,
      date: row.date,
      payment: row.isRest ? 0 : row.expectedPayment,
      interest: row.interest,
      principal: row.amountDue,
      remaining:
        row.status === 'PAID' || row.status === 'REST'
          ? row.nextCapitalActual
          : row.nextCapitalProjected,
      status: row.status,
      paidAmount: row.status === 'PAID' ? row.actualPayment : undefined,
      paymentDate: row.paymentDate,
      paymentTime: row.paymentTime,
      isRest: row.isRest,
      restReason: row.restReason,
      restRecordedByName: row.restRecordedByName,
      restRecordedAt: row.restRecordedAt,
    }))
  }

  // Calculer les échéances pour l'affichage
  // actualSchedule sera calculé après et utilisé pour déterminer les mois supplémentaires
  const dueItems = calculateDueItems()

  // Calculer l'échéancier actuel basé sur les versements réels
  const calculateActualSchedule = (): DueItem[] => {
    const firstDate = new Date(contract.firstPaymentDate)
    const maxDuration = contract.duration
    const defaultMonthlyPayment = contract.monthlyPaymentAmount
    const hasCustomSchedule = contract.customSchedule && contract.customSchedule.length > 0

    const customPaymentByMonth = new Map<number, number>()
    if (hasCustomSchedule) {
      contract.customSchedule!.forEach((entry) => {
        customPaymentByMonth.set(entry.month, entry.amount)
      })
    }

    const items: DueItem[] = []
    const paymentsByMonthMap = getPaymentsByMonth()

    const sortedPayments = [...paymentsForSchedule]
      .filter(
        (p) =>
          p.amount > 0 ||
          p.comment?.includes('Paiement de 0 FCFA') ||
          (!p.comment?.includes('Paiement de pénalités uniquement') && p.amount === 0)
      )
      .sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime())

    // Crédit fixe: intérêt unique, pas d'intérêt mensuel composé
    if (isSimpleCredit) {
      const totalAmount = customRound(contract.totalAmount)
      const plannedDuration = hasCustomSchedule
        ? Math.max(maxDuration, ...contract.customSchedule!.map((entry, index) => entry.month || index + 1))
        : Math.max(1, maxDuration)

      let currentRemaining = totalAmount
      let monthIndex = 0

      while (currentRemaining > 0 && monthIndex < 20) {
        const currentMonth = monthIndex + 1
        const date = new Date(firstDate)
        date.setMonth(date.getMonth() + monthIndex)

        let plannedPayment = hasCustomSchedule
          ? (customPaymentByMonth.get(currentMonth) ?? defaultMonthlyPayment)
          : defaultMonthlyPayment

        if (!hasCustomSchedule && currentMonth <= plannedDuration) {
          const basePayment = Math.floor(totalAmount / plannedDuration)
          if (currentMonth < plannedDuration) {
            plannedPayment = basePayment
          } else if (currentMonth === plannedDuration) {
            const alreadyPlanned = basePayment * (plannedDuration - 1)
            plannedPayment = Math.max(0, totalAmount - alreadyPlanned)
          }
        }

        if (plannedPayment <= 0 && currentRemaining > 0) {
          plannedPayment = currentRemaining
        }

        const theoreticalPayment = Math.min(plannedPayment, currentRemaining)
        const actualPayment = paymentsByMonthMap.get(currentMonth) || 0
        const hasPayment = hasPaymentForMonth(currentMonth)
        const displayedPayment = hasPayment ? actualPayment : theoreticalPayment

        const paymentApplied = hasPayment ? actualPayment : theoreticalPayment
        const remaining = Math.max(0, customRound(currentRemaining - paymentApplied))

        let status: 'PAID' | 'DUE' | 'FUTURE' = 'FUTURE'
        let paymentDate: Date | undefined
        let paymentTime: string | undefined

        if (hasPayment) {
          status = 'PAID'
          const paymentForThisMonth = sortedPayments.find((payment) => getCreditPaymentMonthNumber(contract, payment) === currentMonth)
          if (paymentForThisMonth) {
            paymentDate = new Date(paymentForThisMonth.paymentDate)
            paymentTime = (paymentForThisMonth as { paymentTime?: string }).paymentTime
          }
        } else {
          let allPreviousPaid = true
          for (let previousMonth = 1; previousMonth < currentMonth; previousMonth++) {
            if (!hasPaymentForMonth(previousMonth)) {
              allPreviousPaid = false
              break
            }
          }
          status = allPreviousPaid ? 'DUE' : 'FUTURE'
        }

        items.push({
          month: currentMonth,
          date,
          payment: customRound(displayedPayment),
          interest: 0,
          principal: customRound(currentRemaining),
          remaining,
          status,
          paidAmount: hasPayment ? actualPayment : undefined,
          paymentDate,
          paymentTime,
        })

        currentRemaining = remaining
        monthIndex++

        if (remaining <= 0 && monthIndex >= plannedDuration) {
          break
        }
      }

      return items.filter((item) => item.status === 'PAID' || item.payment > 0)
    }

    return specialHistory.map((row) => ({
      month: row.month,
      date: row.date,
      payment: row.hasPaymentRecord ? row.actualPayment : row.expectedPayment,
      interest: row.interest,
      principal: row.amountDue,
      remaining:
        row.status === 'PAID' || row.status === 'REST'
          ? row.nextCapitalActual
          : row.nextCapitalProjected,
      status: row.status,
      paidAmount: row.hasPaymentRecord ? row.actualPayment : undefined,
      paymentDate: row.paymentDate,
      paymentTime: row.paymentTime,
      isRest: row.isRest,
      restReason: row.restReason,
      restRecordedByName: row.restRecordedByName,
      restRecordedAt: row.restRecordedAt,
    }))
  }

  const actualSchedule = calculateActualSchedule()

  // Trouver la prochaine échéance payable : DUE (utiliser actualSchedule comme source de vérité)
  const nextDueIndex = actualSchedule.findIndex(item => item.status === 'DUE')

  // Calculer le montant total payé
  const totalPaidFromSchedule = isSimpleCredit
    ? payments
        .filter((p) => p.amount > 0 || !p.comment?.includes('Paiement de pénalités uniquement'))
        .reduce((sum, p) => sum + p.amount, 0)
    : actualSchedule
        .filter((item) => item.status === 'PAID')
        .reduce((sum, item) => sum + (item.paidAmount || item.payment || 0), 0)

  // Le montant total à rembourser
  const totalAmountToRepay = isSimpleCredit
    ? customRound(contract.totalAmount)
    : actualSchedule.reduce((sum, item) => sum + item.payment, 0)

  // Calculer le montant restant
  const realRemainingAmount = isSimpleCredit
    ? Math.max(0, totalAmountToRepay - totalPaidFromSchedule)
    : totalAmountToRepay - totalPaidFromSchedule

  const lossHistoryRows = React.useMemo(() => {
    if (contract.creditType === 'FIXE' || contract.creditType === 'AIDE') {
      const FIXED_LOSS_RATE = 0.1

      return actualSchedule
        .filter((row) => row.month > contract.duration && row.principal > 0)
        .map((row) => ({
          month: row.month,
          date: row.date,
          echeance: `M${row.month} - ${format(row.date, 'dd/MM/yyyy')}`,
          lossAmount: customRound(row.principal * FIXED_LOSS_RATE),
        }))
    }

    if (contract.creditType !== 'SPECIALE') return []

    const monthlyRate = contract.interestRate / 100
    const cyclePrefix = currentCycle && currentCycle.cycleNumber > 1 ? 'Apres augmentation - ' : ''

    return specialHistory
      .filter((row) => row.phase === 'FIXE' && !row.isRest && row.capitalStart > 0)
      .map((row) => ({
        month: row.month,
        date: row.date,
        echeance: `${cyclePrefix}M${row.month} - ${format(row.date, 'dd/MM/yyyy')}`,
        lossAmount: customRound(row.capitalStart * monthlyRate),
      }))
  }, [actualSchedule, contract.creditType, contract.duration, contract.interestRate, currentCycle, specialHistory])

  const totalLosses = React.useMemo(
    () => customRound(lossHistoryRows.reduce((sum, row) => sum + row.lossAmount, 0)),
    [lossHistoryRows]
  )
  const shouldShowLossesTab =
    contract.creditType === 'FIXE' || contract.creditType === 'AIDE'
      ? lossHistoryRows.length > 0
      : hasEnteredFixedPhase && lossHistoryRows.length > 0
  const lossesTabDescription =
    contract.creditType === 'FIXE' || contract.creditType === 'AIDE'
      ? 'Manque à gagner généré après la durée contractuelle, tant que le montant restant n’est pas à 0.'
      : 'Manque à gagner généré à partir du passage en partie fixe.'
  const tabsGridClassName = isSimpleCredit
    ? shouldShowLossesTab ? 'grid-cols-4' : 'grid-cols-3'
    : shouldShowLossesTab ? 'grid-cols-5' : 'grid-cols-4'
  const guarantorCommissionRows = React.useMemo(() => {
    if (
      contract.creditType !== 'SPECIALE' ||
      !contract.guarantorId ||
      !contract.guarantorIsMember ||
      (contract.guarantorRemunerationPercentage ?? 0) <= 0
    ) {
      return []
    }

    const commissionPercentage = contract.guarantorRemunerationPercentage || 0
    const cyclePrefix = currentCycle && currentCycle.cycleNumber > 1 ? 'Apres augmentation - ' : ''

    return [...guarantorRemunerations]
      .sort((a, b) => a.month - b.month)
      .map((remuneration) => {
        const remainingAtStartOfMonth = specialHistoryByMonth.get(remuneration.month)?.capitalStart ?? contract.amount
        const commissionAmount = customRound(remainingAtStartOfMonth * commissionPercentage / 100)

        return {
          id: remuneration.id,
          month: remuneration.month,
          monthLabel: `${cyclePrefix}M${remuneration.month}`,
          remainingAtStartOfMonth,
          commissionPercentage,
          commissionAmount,
        }
      })
  }, [
    contract.amount,
    contract.creditType,
    contract.guarantorId,
    contract.guarantorIsMember,
    contract.guarantorRemunerationPercentage,
    currentCycle,
    guarantorRemunerations,
    specialHistoryByMonth,
  ])
  const totalGuarantorCommissions = React.useMemo(
    () => guarantorCommissionRows.reduce((sum, row) => sum + row.commissionAmount, 0),
    [guarantorCommissionRows]
  )

  useEffect(() => {
    if (isSimpleCredit && activeTab === 'guarantor') {
      setActiveTab('payments')
      return
    }

    if (!shouldShowLossesTab && activeTab === 'losses') {
      setActiveTab('history')
    }
  }, [isSimpleCredit, activeTab, shouldShowLossesTab])
  
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
    const paymentsForThisMonth = paymentsForSchedule.filter((payment) => getCreditPaymentMonthNumber(contract, payment) === dueItem.month)

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
      const matchingPayments = paymentsForSchedule.filter(p => {
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

  const buildContractSnapshotForCycle = (cycleNumber: number): CreditContract => {
    const cycle = contract.creditCycles?.find((entry) => entry.cycleNumber === cycleNumber)
    if (!cycle) {
      return contract
    }

    return {
      ...contract,
      amount: cycle.amount,
      interestRate: cycle.interestRate,
      monthlyPaymentAmount: cycle.monthlyPaymentAmount,
      totalAmount: cycle.totalAmount,
      duration: cycle.duration,
      firstPaymentDate: new Date(cycle.firstPaymentDate),
      customSchedule: cycle.customSchedule,
      restMonths: cycle.restMonths ?? [],
    }
  }

  const buildScheduleForCycle = (cycleNumber: number): DueItem[] => {
    if (contract.creditType !== 'SPECIALE') {
      return actualSchedule
    }

    const cycleContract = buildContractSnapshotForCycle(cycleNumber)
    const cyclePayments = payments
      .filter(
        (payment) =>
          getCreditPaymentCycleNumber(contract, payment) === cycleNumber &&
          (
            payment.amount > 0 ||
            payment.comment?.includes('Paiement de 0 FCFA') ||
            (!payment.comment?.includes('Paiement de pénalités uniquement') && payment.amount === 0)
          )
      )
    const cycleHistory = buildCreditSpecialeHistory(cycleContract, cyclePayments, { projectUntilZero: true })

    return cycleHistory.map((row) => ({
      month: row.month,
      date: row.date,
      payment: row.hasPaymentRecord ? row.actualPayment : row.expectedPayment,
      interest: row.interest,
      principal: row.amountDue,
      remaining:
        row.status === 'PAID' || row.status === 'REST'
          ? row.nextCapitalActual
          : row.nextCapitalProjected,
      status: row.status,
      paidAmount: row.hasPaymentRecord ? row.actualPayment : undefined,
      paymentDate: row.paymentDate,
      paymentTime: row.paymentTime,
      isRest: row.isRest,
      restReason: row.restReason,
      restRecordedByName: row.restRecordedByName,
      restRecordedAt: row.restRecordedAt,
    }))
  }

  const getPaymentReceiptContext = (payment: CreditPayment) => {
    const cycleNumber = getCreditPaymentCycleNumber(contract, payment)
    const receiptContract = cycleNumber === 1 && !contract.creditCycles?.length
      ? contract
      : buildContractSnapshotForCycle(cycleNumber)
    const receiptSchedule = cycleNumber === (contract.creditCycles?.at(-1)?.cycleNumber ?? 1)
      ? actualSchedule
      : buildScheduleForCycle(cycleNumber)
    const installmentNumber = getCreditPaymentMonthNumber(contract, payment)
    const dueDate = receiptSchedule.find((item) => item.month === installmentNumber)?.date

    return {
      cycleNumber,
      installmentNumber,
      dueDate,
      receiptContract,
      receiptSchedule,
    }
  }

  const parseCycleAndMonthFromInstallmentRef = (ref?: string): { cycleNumber?: number; monthNumber?: number } => {
    if (!ref) return {}
    const cycleMatch = ref.match(/^C(\d+)_M(\d+)_/)
    if (cycleMatch) {
      return {
        cycleNumber: parseInt(cycleMatch[1], 10),
        monthNumber: parseInt(cycleMatch[2], 10),
      }
    }
    const legacyMatch = ref.match(/^M(\d+)_/)
    if (legacyMatch) {
      return {
        cycleNumber: 1,
        monthNumber: parseInt(legacyMatch[1], 10),
      }
    }
    return {}
  }

  const resolvePenaltyCycleNumber = (penalty: CreditPenalty): number => {
    const cycleHints = parseCycleAndMonthFromInstallmentRef(penalty.installmentId)
    if (cycleHints.cycleNumber) return cycleHints.cycleNumber

    const dueDate = new Date(penalty.dueDate)
    let detected = 1
    for (const cycle of contractCycles) {
      if (dueDate.getTime() >= new Date(cycle.startedAt).getTime()) {
        detected = cycle.cycleNumber
      }
    }
    return detected
  }

  const getPenaltyAugmentationMeta = (
    penalty: CreditPenalty
  ): { label: string; badgeClassName: string } | null => {
    if (!hasCreditAugmentation) return null
    const cycleNumber = resolvePenaltyCycleNumber(penalty)
    if (cycleNumber <= 1) {
      return {
        label: 'Avant augmentation',
        badgeClassName: 'bg-slate-100 text-slate-700 border border-slate-200',
      }
    }
    return {
      label: `Après augmentation · Cycle ${cycleNumber}`,
      badgeClassName: 'bg-indigo-100 text-indigo-700 border border-indigo-200',
    }
  }

  const getPenaltyReceiptContext = (penalty: CreditPenalty) => {
    const dueDate = new Date(penalty.dueDate)
    const cycleHints = parseCycleAndMonthFromInstallmentRef(penalty.installmentId)
    const cycleNumberFromDate = (() => {
      let detected = 1
      for (const cycle of contractCycles) {
        if (dueDate.getTime() >= new Date(cycle.startedAt).getTime()) {
          detected = cycle.cycleNumber
        }
      }
      return detected
    })()
    const cycleNumber = cycleHints.cycleNumber ?? cycleNumberFromDate
    const receiptContract =
      cycleNumber === 1 && !contract.creditCycles?.length
        ? contract
        : buildContractSnapshotForCycle(cycleNumber)
    const receiptSchedule =
      cycleNumber === (contract.creditCycles?.at(-1)?.cycleNumber ?? 1)
        ? actualSchedule
        : buildScheduleForCycle(cycleNumber)

    const scheduleMonth = receiptSchedule.find((item) => {
      const itemDate = new Date(item.date)
      itemDate.setHours(0, 0, 0, 0)
      const penaltyDueDate = new Date(dueDate)
      penaltyDueDate.setHours(0, 0, 0, 0)
      return itemDate.getTime() === penaltyDueDate.getTime()
    })?.month

    const cycleFirstDate = new Date(receiptContract.firstPaymentDate)
    const fallbackMonth = Math.max(
      1,
      (dueDate.getFullYear() - cycleFirstDate.getFullYear()) * 12 +
        (dueDate.getMonth() - cycleFirstDate.getMonth()) +
        1
    )
    const installmentNumber = cycleHints.monthNumber ?? scheduleMonth ?? fallbackMonth
    const resolvedDueDate = receiptSchedule.find((item) => item.month === installmentNumber)?.date ?? dueDate

    return {
      cycleNumber,
      installmentNumber,
      dueDate: resolvedDueDate,
      receiptContract,
      receiptSchedule,
    }
  }

  const getPenaltyTotalForInstallment = (params: {
    installmentNumber?: number
    dueDate?: Date | null
    cycleNumber?: number
  }): number => {
    const { installmentNumber, dueDate, cycleNumber } = params
    const normalizedDueDate = dueDate ? new Date(dueDate) : null
    if (normalizedDueDate) normalizedDueDate.setHours(0, 0, 0, 0)

    return penalties.reduce((sum, penalty) => {
      const parsedInstallment = parseCycleAndMonthFromInstallmentRef(penalty.installmentId)
      const penaltyCycle = parsedInstallment.cycleNumber ?? resolvePenaltyCycleNumber(penalty)
      const penaltyMonth = parsedInstallment.monthNumber

      const sameCycleAndInstallment =
        typeof installmentNumber === 'number' &&
        penaltyMonth === installmentNumber &&
        (typeof cycleNumber === 'number' ? penaltyCycle === cycleNumber : true)

      let sameDueDate = false
      if (normalizedDueDate) {
        const penaltyDueDate = new Date(penalty.dueDate)
        penaltyDueDate.setHours(0, 0, 0, 0)
        sameDueDate = penaltyDueDate.getTime() === normalizedDueDate.getTime()
      }

      if (!sameCycleAndInstallment && !sameDueDate) return sum
      return sum + Math.max(0, Math.round(penalty.amount || 0))
    }, 0)
  }

  const handleOpenGlobalFacturePDF = async () => {
    const canGenerateGlobalFacture =
      contract.creditType === 'SPECIALE' ||
      contract.creditType === 'FIXE' ||
      contract.creditType === 'AIDE'
    if (!canGenerateGlobalFacture) {
      toast.error('La facture globale PDF est disponible pour les contrats de crédit spéciale, crédit fixe et caisse aide')
      return
    }

    const paymentsForGlobalFacture = [...payments]
      .filter(
        (payment) =>
          payment.amount > 0 ||
          payment.penaltyAmount > 0 ||
          payment.comment?.includes('Paiement de pénalités uniquement') ||
          payment.comment?.includes('Paiement de 0 FCFA') ||
          (!payment.comment?.includes('Paiement de pénalités uniquement') && payment.amount === 0)
      )
    const paymentsById = new Map(payments.map((payment) => [payment.id, payment]))
    const penaltiesForGlobalFacture = penalties.filter((penalty) => {
      if (!penalty.paymentId) return true
      const linkedPayment = paymentsById.get(penalty.paymentId)
      if (!linkedPayment) return true
      return !(
        linkedPayment.penaltyAmount > 0 ||
        linkedPayment.comment?.includes('Paiement de pénalités uniquement')
      )
    })

    const paymentEntries = paymentsForGlobalFacture.map((payment) => {
      const paymentContext = getPaymentReceiptContext(payment)
      return {
        kind: 'payment' as const,
        payment,
        ...paymentContext,
      }
    })

    const penaltyEntries = penaltiesForGlobalFacture.map((penalty) => {
      const penaltyContext = getPenaltyReceiptContext(penalty)
      const paymentDate = penalty.paidAt ?? penalty.paymentRecordedAt ?? penalty.updatedAt ?? penalty.createdAt ?? penaltyContext.dueDate
      const syntheticPayment: CreditPayment = {
        id: `PENALTY_${penalty.id}`,
        creditId: contract.id,
        installmentId: penalty.installmentId,
        amount: penalty.paid ? Math.round(penalty.amount) : 0,
        principalAmount: 0,
        interestAmount: 0,
        penaltyAmount: Math.round(penalty.amount),
        paymentDate: new Date(paymentDate),
        paymentTime: penalty.paymentTime || '12H00',
        mode: penalty.paymentMode ?? 'cash',
        withFees: penalty.withFees,
        comment: penalty.paid
          ? `Pénalité payée (${penalty.daysLate} jour(s) de retard)`
          : `Pénalité impayée (${penalty.daysLate} jour(s) de retard)`,
        note: 0,
        reference: penalty.paymentId ? `PENALITE:${penalty.id}` : undefined,
        agentRecouvrementId: penalty.agentRecouvrementId,
        createdAt: penalty.createdAt,
        updatedAt: penalty.updatedAt,
        createdBy: penalty.createdBy,
        updatedBy: penalty.updatedBy,
      }
      return {
        kind: 'penalty' as const,
        penalty,
        syntheticPayment,
        ...penaltyContext,
      }
    })

    const factureEntries = [...paymentEntries, ...penaltyEntries].sort((left, right) => {
      if (left.cycleNumber !== right.cycleNumber) return left.cycleNumber - right.cycleNumber
      if (left.installmentNumber !== right.installmentNumber) return left.installmentNumber - right.installmentNumber
      const leftDate =
        left.kind === 'payment'
          ? new Date(left.payment.paymentDate).getTime()
          : new Date(left.syntheticPayment.paymentDate).getTime()
      const rightDate =
        right.kind === 'payment'
          ? new Date(right.payment.paymentDate).getTime()
          : new Date(right.syntheticPayment.paymentDate).getTime()
      if (leftDate !== rightDate) return leftDate - rightDate
      if (left.kind !== right.kind) return left.kind === 'payment' ? -1 : 1
      return 0
    })

    if (factureEntries.length === 0) {
      toast.error('Aucun versement ni pénalité à inclure dans la facture globale')
      return
    }

    const previewWindow = typeof window !== 'undefined' ? window.open('about:blank', '_blank') : null
    if (previewWindow) {
      try {
        previewWindow.opener = null
      } catch {
        // Ignore les erreurs liées au navigateur
      }
    }

    try {
      setIsGeneratingGlobalFacturePdf(true)
      toast.info('Génération de la facture globale en cours...')

      const page1Data = buildCreditSpecialFacturePage1Data(contract, member)
      const factures = factureEntries.map((entry) => {
        const payment = entry.kind === 'payment' ? entry.payment : entry.syntheticPayment
        const factureData = buildCreditSpecialFactureData({
          contract: entry.receiptContract,
          payment,
          installmentNumber: entry.installmentNumber,
          schedule: entry.receiptSchedule,
          dueDate: entry.dueDate ?? null,
        })

        const titleSuffix =
          entry.kind === 'penalty'
            ? ` - PENALITE ${entry.penalty.paid ? 'PAYEE' : 'IMPAYEE'}`
            : ''

        return {
          factureData,
          titleDate:
            entry.cycleNumber > 1
              ? `${factureData.dateEcheance} - M${entry.installmentNumber} apres augmentation${titleSuffix}`
              : `${factureData.dateEcheance}${titleSuffix}`,
        }
      })

      await generateGlobalFactureCreditSpecialPDF({
        page1Data,
        page1MainTitle:
          contract.creditType === 'FIXE'
            ? 'HISTORIQUE VERSEMENT CREDIT FIXE'
            : contract.creditType === 'AIDE'
              ? 'HISTORIQUE VERSEMENT CAISSE AIDE'
              : 'HISTORIQUE VERSEMENT CREDIT SPECIALE',
        factures,
        outputMode: 'open',
        filename: `facture_globale_${contract.id}.pdf`,
        targetWindow: previewWindow,
      })

      toast.success('Facture globale PDF générée avec succès')
    } catch (error) {
      if (previewWindow && !previewWindow.closed) {
        previewWindow.close()
      }
      console.error('Erreur lors de la génération de la facture globale PDF:', error)
      toast.error('Erreur lors de la génération de la facture globale PDF')
    } finally {
      setIsGeneratingGlobalFacturePdf(false)
    }
  }

  const handleExportLossHistoryExcel = async () => {
    if (!lossHistoryRows.length) {
      toast.error('Aucune perte à exporter')
      return
    }

    try {
      setIsExportingLossHistoryExcel(true)
      const XLSX = await import('xlsx')
      const rows = [
        ...lossHistoryRows.map((row) => ({
          'Echéance': row.echeance,
          'Pertes (FCFA)': row.lossAmount,
        })),
        {
          'Echéance': 'TOTAL DES PERTES',
          'Pertes (FCFA)': totalLosses,
        },
      ]

      const worksheet = XLSX.utils.json_to_sheet(rows)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Pertes')
      XLSX.writeFile(workbook, `historique_pertes_${contract.id}_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`)
      toast.success('Historique du manque à gagner exporté en Excel')
    } catch (error) {
      console.error('Erreur lors de l’export Excel des pertes:', error)
      toast.error('Erreur lors de l’export Excel des pertes')
    } finally {
      setIsExportingLossHistoryExcel(false)
    }
  }

  const handleOpenLossHistoryPdf = async () => {
    if (!lossHistoryRows.length) {
      toast.error('Aucune perte à exporter')
      return
    }

    const previewWindow = typeof window !== 'undefined' ? window.open('about:blank', '_blank') : null
    if (previewWindow) {
      try {
        previewWindow.opener = null
      } catch {
        // Ignore les erreurs liées au navigateur
      }
    }

    try {
      setIsGeneratingLossHistoryPdf(true)
      toast.info('Génération du PDF des pertes en cours...')

      await generateCreditSpecialLossHistoryPDF({
        contractId: contract.id,
        page1Data: buildCreditSpecialFacturePage1Data(contract, member),
        rows: lossHistoryRows.map((row) => ({
          echeance: row.echeance,
          lossAmount: row.lossAmount,
        })),
        totalLosses,
        descriptionText: lossesTabDescription,
        outputMode: 'open',
        filename: `historique_pertes_${contract.id}.pdf`,
        targetWindow: previewWindow,
      })

      toast.success('Historique du manque à gagner PDF généré avec succès')
    } catch (error) {
      if (previewWindow && !previewWindow.closed) {
        previewWindow.close()
      }
      console.error('Erreur lors de la génération du PDF des pertes:', error)
      toast.error('Erreur lors de la génération du PDF des pertes')
    } finally {
      setIsGeneratingLossHistoryPdf(false)
    }
  }

  const handleExportGuarantorCommissionsExcel = async () => {
    if (!guarantorCommissionRows.length) {
      toast.error('Aucune commission du garant à exporter')
      return
    }

    try {
      setIsExportingGuarantorCommissionsExcel(true)
      const XLSX = await import('xlsx')
      const rows = [
        ...guarantorCommissionRows.map((row) => ({
          'Mois': row.monthLabel,
          'Reste dû (FCFA)': row.remainingAtStartOfMonth,
          'Pourcentage de commission': `${row.commissionPercentage}%`,
          'Somme due (FCFA)': row.commissionAmount,
        })),
        {
          'Mois': 'TOTAL DES COMMISSIONS',
          'Reste dû (FCFA)': '',
          'Pourcentage de commission': '',
          'Somme due (FCFA)': totalGuarantorCommissions,
        },
      ]

      const worksheet = XLSX.utils.json_to_sheet(rows)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Commissions garant')
      XLSX.writeFile(
        workbook,
        `commissions_garant_${contract.id}_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`
      )
      toast.success('Historique des commissions du garant exporté en Excel')
    } catch (error) {
      console.error('Erreur lors de l’export Excel des commissions du garant:', error)
      toast.error('Erreur lors de l’export Excel des commissions du garant')
    } finally {
      setIsExportingGuarantorCommissionsExcel(false)
    }
  }

  const handleOpenGuarantorCommissionsPdf = async () => {
    if (!guarantorCommissionRows.length) {
      toast.error('Aucune commission du garant à exporter')
      return
    }

    const previewWindow = typeof window !== 'undefined' ? window.open('about:blank', '_blank') : null
    if (previewWindow) {
      try {
        previewWindow.opener = null
      } catch {
        // Ignore les erreurs liées au navigateur
      }
    }

    try {
      setIsGeneratingGuarantorCommissionsPdf(true)
      toast.info('Génération du PDF des commissions du garant en cours...')

      await generateCreditSpecialGuarantorCommissionHistoryPDF({
        contractId: contract.id,
        page1Data: buildCreditSpecialFacturePage1Data(contract, member),
        rows: guarantorCommissionRows.map((row) => ({
          monthLabel: row.monthLabel,
          remainingAmount: row.remainingAtStartOfMonth,
          commissionPercentage: row.commissionPercentage,
          commissionAmount: row.commissionAmount,
        })),
        totalCommissions: totalGuarantorCommissions,
        outputMode: 'open',
        filename: `commissions_garant_${contract.id}.pdf`,
        targetWindow: previewWindow,
      })

      toast.success('Historique des commissions du garant PDF généré avec succès')
    } catch (error) {
      if (previewWindow && !previewWindow.closed) {
        previewWindow.close()
      }
      console.error('Erreur lors de la génération du PDF des commissions du garant:', error)
      toast.error('Erreur lors de la génération du PDF des commissions du garant')
    } finally {
      setIsGeneratingGuarantorCommissionsPdf(false)
    }
  }

  // Retrouver le paiement associé à une échéance (pour "Voir le résumé" dans l'échéancier)
  const getPaymentForScheduleIndex = (scheduleIndex: number): CreditPayment | null => {
    const dueItem = actualSchedule[scheduleIndex]
    if (!dueItem) return null

    // Même logique que pour le reçu, mais sans dépendre d'un state externe
    const paymentsForThisMonth = payments.filter((payment) => getCreditPaymentMonthNumber(contract, payment) === dueItem.month)

    if (paymentsForThisMonth.length > 0) {
      const sortedPayments = paymentsForThisMonth.sort((a, b) => {
        const dateA = new Date(a.paymentDate).getTime()
        const dateB = new Date(b.paymentDate).getTime()
        if (dateA === dateB) {
          const timeA = a.paymentTime || '00:00'
          const timeB = b.paymentTime || '00:00'
          return timeB.localeCompare(timeA)
        }
        return dateB - dateA
      })
      return sortedPayments[0]
    }

    // Fallback date (tolérance 1 jour) si on n'a pas trouvé via l'ID
    if (dueItem.paymentDate) {
      const duePaymentDate = new Date(dueItem.paymentDate)
      duePaymentDate.setHours(0, 0, 0, 0)

      const matchingPayments = paymentsForSchedule.filter(p => {
        const paymentDate = new Date(p.paymentDate)
        paymentDate.setHours(0, 0, 0, 0)
        return Math.abs(paymentDate.getTime() - duePaymentDate.getTime()) <= 24 * 60 * 60 * 1000
      })

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
        return sortedPayments[0]
      }
    }

    return null
  }

  const selectedPaymentReceiptContext = selectedPayment
    ? getPaymentReceiptContext(selectedPayment)
    : null
  const selectedPaymentForReceipt = selectedPayment ?? getSelectedPaymentForReceipt()
  const selectedReceiptInstallmentNumber =
    selectedPaymentReceiptContext?.installmentNumber
      ?? (selectedDueIndexForReceipt !== null ? actualSchedule[selectedDueIndexForReceipt]?.month : undefined)
  const selectedReceiptDueDate =
    selectedPaymentReceiptContext?.dueDate
      ?? (selectedDueIndexForReceipt !== null && actualSchedule[selectedDueIndexForReceipt]
        ? actualSchedule[selectedDueIndexForReceipt].date
        : undefined)
  const selectedReceiptCycleNumber =
    selectedPaymentReceiptContext?.cycleNumber
      ?? (selectedPaymentForReceipt ? getCreditPaymentCycleNumber(contract, selectedPaymentForReceipt) : undefined)
  const selectedReceiptPenaltyAmount = getPenaltyTotalForInstallment({
    installmentNumber: selectedReceiptInstallmentNumber,
    dueDate: selectedReceiptDueDate ?? null,
    cycleNumber: selectedReceiptCycleNumber,
  })

  const renderPenaltiesContent = () => {
    if (penalties.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500 border rounded-lg">
          Aucune pénalité enregistrée pour le moment
        </div>
      )
    }

    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            Historique des pénalités
          </h3>
        </div>
        <div className="space-y-3">
          {penalties.map((penalty) => {
            const paymentRecordedAt = penalty.paymentRecordedAt ?? (penalty.paid ? penalty.updatedAt : undefined)
            const paymentRecordedBy = penalty.paymentRecordedBy ?? (penalty.paid ? penalty.updatedBy : undefined)
            const paymentUpdatedAt = penalty.paymentUpdatedAt
            const paymentUpdatedBy = penalty.paymentUpdatedBy
            const penaltyAugmentationMeta = getPenaltyAugmentationMeta(penalty)
            const penaltyReceiptContext = getPenaltyReceiptContext(penalty)
            const penaltyInstallmentLabel =
              hasCreditAugmentation && penaltyReceiptContext.cycleNumber > 1
                ? `Échéance ${penaltyReceiptContext.installmentNumber} (Cycle ${penaltyReceiptContext.cycleNumber})`
                : `Échéance ${penaltyReceiptContext.installmentNumber}`
            const hasPaymentUpdate =
              !!paymentUpdatedAt &&
              !!paymentUpdatedBy &&
              (!!paymentRecordedAt || !!paymentRecordedBy) &&
              (
                (paymentRecordedAt ? paymentUpdatedAt.getTime() !== paymentRecordedAt.getTime() : true) ||
                paymentUpdatedBy !== paymentRecordedBy
              )

            return (
              <div
                key={penalty.id}
                className={cn(
                  'rounded-lg border p-4',
                  penalty.paid ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'
                )}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="font-semibold">
                        {penalty.amount.toLocaleString('fr-FR')} FCFA
                      </span>
                      {penalty.paid ? (
                        <Badge className="bg-green-100 text-green-700">Payée</Badge>
                      ) : (
                        <Badge className="bg-orange-100 text-orange-700">Impayée</Badge>
                      )}
                      <Badge className="bg-blue-100 text-blue-700 border border-blue-200">
                        {penaltyInstallmentLabel}
                      </Badge>
                      {penaltyAugmentationMeta && (
                        <Badge className={penaltyAugmentationMeta.badgeClassName}>
                          {penaltyAugmentationMeta.label}
                        </Badge>
                      )}
                    </div>

                    <div className="grid gap-2 text-sm text-gray-600 sm:grid-cols-2 xl:grid-cols-3">
                      <p>
                        Retard : <span className="font-medium text-gray-800">{penalty.daysLate} jours</span>
                      </p>
                      <p>
                        Échéance concernée : <span className="font-medium text-gray-800">{penaltyInstallmentLabel}</span>
                      </p>
                      <p>
                        Date d'échéance : <span className="font-medium text-gray-800">{formatDate(penalty.dueDate)}</span>
                      </p>
                      <p>
                        Créée le : <span className="font-medium text-gray-800">{formatDateTime(penalty.createdAt, format(new Date(penalty.createdAt), 'HH:mm'))}</span>
                      </p>
                      <p className="sm:col-span-2 xl:col-span-1">
                        Enregistrée par :{' '}
                        <span className="font-medium text-gray-800">
                          {getPenaltyAdminDisplayName(penalty.createdBy)}
                        </span>
                      </p>
                      {penaltyAugmentationMeta && (
                        <p className="sm:col-span-2 xl:col-span-1">
                          Cycle crédit :{' '}
                          <span className="font-medium text-gray-800">
                            {penaltyAugmentationMeta.label}
                          </span>
                        </p>
                      )}
                    </div>

                    {penalty.paid && (
                      <div className="mt-3 rounded-md border border-green-200 bg-white/70 p-3 text-sm text-gray-600 space-y-2">
                        {penalty.paidAt && (
                          <p>
                            Payée le :{' '}
                            <span className="font-medium text-gray-800">
                              {penalty.paymentTime
                                ? formatDateTime(penalty.paidAt, penalty.paymentTime)
                                : formatDate(penalty.paidAt)}
                            </span>
                          </p>
                        )}
                        {penalty.paymentMode && (
                          <p>
                            Mode :{' '}
                            <span className="font-medium text-gray-800">
                              {CREDIT_PAYMENT_MODE_LABELS[penalty.paymentMode] ?? penalty.paymentMode}
                              {(penalty.paymentMode === 'airtel_money' || penalty.paymentMode === 'mobicash') &&
                              penalty.withFees !== undefined
                                ? ` (${penalty.withFees ? 'Avec frais' : 'Sans frais'})`
                                : ''}
                            </span>
                          </p>
                        )}
                        {paymentRecordedAt && (
                          <p>
                            Paiement saisi le :{' '}
                            <span className="font-medium text-gray-800">
                              {formatDateTime(
                                paymentRecordedAt,
                                format(new Date(paymentRecordedAt), 'HH:mm')
                              )}
                            </span>
                          </p>
                        )}
                        {paymentRecordedBy && (
                          <p>
                            Paiement saisi par :{' '}
                            <span className="font-medium text-gray-800">
                              {getPenaltyAdminDisplayName(paymentRecordedBy)}
                            </span>
                          </p>
                        )}
                        {hasPaymentUpdate && paymentUpdatedAt && (
                          <p>
                            Dernière modification :{' '}
                            <span className="font-medium text-gray-800">
                              {formatDateTime(
                                paymentUpdatedAt,
                                format(new Date(paymentUpdatedAt), 'HH:mm')
                              )}
                              {' • '}
                              {getPenaltyAdminDisplayName(paymentUpdatedBy)}
                            </span>
                          </p>
                        )}
                        {penalty.paymentComment && (
                          <p>
                            Commentaire : <span className="font-medium text-gray-800">{penalty.paymentComment}</span>
                          </p>
                        )}
                        {penalty.proofUrl && (
                          <a
                            href={penalty.proofUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex text-[#234D65] hover:underline"
                          >
                            Voir la preuve de paiement
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 lg:w-52">
                    {penalty.paid ? (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-[#234D65] text-[#234D65] hover:bg-[#234D65]/10"
                          onClick={() => {
                            setSelectedPenaltyForReceipt(penalty)
                            setShowPenaltyReceiptModal(true)
                          }}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Voir la facture
                        </Button>
                        {!['DISCHARGED', 'CLOSED'].includes(contract.status) && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="border-amber-300 text-amber-700 hover:bg-amber-50"
                            onClick={() => {
                              setPenaltyPaymentModalMode('edit')
                              setSelectedPenaltyToPay(penalty)
                              setShowPenaltyPaymentModal(true)
                            }}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Modifier
                          </Button>
                        )}
                      </>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        className="bg-[#234D65] hover:bg-[#1b3c4f]"
                        onClick={() => {
                          setPenaltyPaymentModalMode('pay')
                          setSelectedPenaltyToPay(penalty)
                          setShowPenaltyPaymentModal(true)
                        }}
                      >
                        <HandCoins className="mr-2 h-4 w-4" />
                        Payer
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push(listPath)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux contrats
          </Button>
          <div className="flex items-center gap-3 flex-wrap">
            <EmergencyContact emergencyContact={contract.emergencyContact} />
            {/* Bouton d'augmentation - un seul rajout autorisé, masqué si déjà fait ou DISCHARGED/CLOSED */}
            {(contract.creditType === 'FIXE' || contract.creditType === 'SPECIALE') &&
              (contract.status === 'ACTIVE' || contract.status === 'PARTIAL') &&
              !contract.rajoutEffectue && (
              <Button
                variant="outline"
                onClick={() => setShowExtensionModal(true)}
                className="flex items-center gap-2 border-cyan-300 text-cyan-700 hover:bg-cyan-50"
              >
                <Plus className="h-4 w-4" />
                Augmenter le crédit
              </Button>
            )}
            {contract.creditType === 'SPECIALE' && (contract.status === 'ACTIVE' || contract.status === 'PARTIAL') && !hasEnteredFixedPhase && (
              <Button
                variant="outline"
                onClick={() => setShowSwitchToFixedModal(true)}
                className="flex items-center gap-2 border-[#234D65] text-[#234D65] hover:bg-[#234D65]/10"
              >
                <Lock className="h-4 w-4" />
                Basculer en fixe
              </Button>
            )}
            <Badge className={cn('px-4 py-1.5 text-sm font-medium', statusConfig.bgColor, statusConfig.color)}>
              {statusConfig.label}
            </Badge>
            {contract.rajoutEffectue && contract.rajoutAmount != null && contract.rajoutAmount > 0 && (
              <span className="text-sm text-cyan-700 bg-cyan-50 px-3 py-1.5 rounded-md border border-cyan-200">
                Augmentation enregistrée : +{contract.rajoutAmount.toLocaleString('fr-FR')} FCFA
              </span>
            )}
          </div>
        </div>
        
        {/* Rappel : même contrat après rajout — tous les versements restent traçables */}
        {contract.rajoutEffectue && (contract.initialAmount != null || contract.rajoutAmount != null) && (
          <Card className="shadow-md bg-slate-50 border border-slate-200">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <History className="h-5 w-5 text-slate-600 shrink-0 mt-0.5" />
                <div className="text-sm text-slate-700 space-y-1">
                  <p className="font-medium text-slate-800">Augmentation de crédit — nouveau cycle dans le meme contrat</p>
                  <p className="text-slate-600">
                    Montant initial : <strong>{(contract.initialAmount ?? (contract.amount - (contract.rajoutAmount ?? 0))).toLocaleString('fr-FR')} FCFA</strong>
                    {contract.rajoutAmount != null && contract.rajoutAmount > 0 && (
                      <> • Rajout : <strong>+{contract.rajoutAmount.toLocaleString('fr-FR')} FCFA</strong></>
                    )}
                    {' '}• Nouveau cycle : <strong>{contract.amount.toLocaleString('fr-FR')} FCFA</strong>
                    {contract.extendedAt && (
                      <> • Augmentation enregistrée le {format(new Date(contract.extendedAt), 'dd/MM/yyyy', { locale: fr })}</>
                    )}
                  </p>
                  <p className="text-slate-600">
                    Tous les versements (avant et après l’augmentation) sont conservés ci-dessous. Apres l’augmentation, l’échéancier repart a M1 sur le nouveau cycle.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {fixedTransitionMeta.mode === 'MANUAL' && fixedTransitionMeta.at && (
          <Card className="shadow-md border border-blue-200 bg-blue-50">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <Lock className="h-5 w-5 text-[#234D65] shrink-0 mt-0.5" />
                <div className="text-sm text-slate-700 space-y-2">
                  <p className="font-medium text-slate-800">Basculement manuel en partie fixe</p>
                  <p>
                    Le contrat a été basculé en partie fixe le
                    {' '}
                    <strong>{format(new Date(fixedTransitionMeta.at), 'dd MMMM yyyy à HH:mm', { locale: fr })}</strong>
                    {' '}par{' '}
                    <strong>
                      {fixedTransitionAdmin ? `${fixedTransitionAdmin.firstName} ${fixedTransitionAdmin.lastName}`.trim() : (fixedTransitionMeta.by || '—')}
                    </strong>.
                  </p>
                  {fixedTransitionMeta.startMonth ? (
                    <p>
                      La partie fixe commence à
                      {' '}
                      <strong>M{fixedTransitionMeta.startMonth}</strong>.
                    </p>
                  ) : null}
                  <p className="text-slate-600 whitespace-pre-line">
                    Raison : <strong>{fixedTransitionMeta.reason || '—'}</strong>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Liens vers contrat parent/enfant (ancienne logique avec contrat enfant) */}
        {(parentContract || childContract) && (
          <Card className="border-0 shadow-lg bg-gradient-to-r from-cyan-50 to-blue-50">
            <CardContent className="py-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Link2 className="h-5 w-5 text-cyan-600" />
                  <span className="font-medium text-cyan-800">Contrats liés :</span>
                </div>
                {parentContract && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`${contractDetailsBasePath.replace(/\/$/, '')}/${parentContract.id}`)}
                    className="flex items-center gap-2 border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    Contrat parent
                    <span className="text-xs font-mono bg-blue-100 px-2 py-0.5 rounded">{parentContract.id.slice(-10)}</span>
                    <Badge variant="outline" className="text-xs">{parentContract.status}</Badge>
                  </Button>
                )}
                {childContract && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`${contractDetailsBasePath.replace(/\/$/, '')}/${childContract.id}`)}
                    className="flex items-center gap-2 border-green-300 text-green-700 hover:bg-green-50"
                  >
                    Nouveau contrat
                    <span className="text-xs font-mono bg-green-100 px-2 py-0.5 rounded">{childContract.id.slice(-10)}</span>
                    <Badge variant="outline" className="text-xs">{childContract.status}</Badge>
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                )}
              </div>
              {contract.status === 'EXTENDED' && contract.extendedAt && (
                <p className="text-xs text-cyan-600 mt-2 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Étendu le {format(new Date(contract.extendedAt), 'dd MMMM yyyy', { locale: fr })}
                  {contract.blockedReason && ` • ${contract.blockedReason}`}
                </p>
              )}
              {/* Indicateur si le contrat enfant est terminé */}
              {childContract && childContract.status === 'DISCHARGED' && (
                <div className="mt-2 flex items-center gap-2 text-green-700">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Crédit terminé</span>
                  <span className="text-xs text-green-600">(Le nouveau contrat a été entièrement remboursé)</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Informations client + contrat (même esprit que la section avant stats en caisse spéciale) */}
        <Card className="border-0 shadow-xl bg-gradient-to-r from-[#234D65] to-[#2c5a73] overflow-hidden">
          <CardHeader className="overflow-hidden">
            <CardTitle className="text-xl sm:text-2xl font-black text-white flex items-center gap-3 break-words">
              <User className="h-6 w-6 sm:h-7 sm:w-7 shrink-0" />
              <span className="break-words">{contract.clientFirstName} {contract.clientLastName}</span>
            </CardTitle>
            <div className="space-y-1.5 text-blue-100 break-words">
              <p className="text-sm sm:text-base break-words">
                Contrat <span className="font-mono text-xs sm:text-sm break-all">#{contract.id}</span>
              </p>
              <p className="text-sm break-words">
                Contacts client: <span className="font-medium">{contract.clientContacts.join(', ') || '—'}</span>
              </p>
              <p className="text-xs break-words">
                Type: <span className="font-mono">{contract.creditType}</span> • Statut: <span className="font-mono">{statusConfig.label}</span>
              </p>
              <p className="text-xs break-words">
                Taux: <span className="font-mono">{contract.interestRate}%</span> • Durée: <span className="font-mono">{contract.duration} mois</span> • Mensualité: <span className="font-mono">{contract.monthlyPaymentAmount.toLocaleString('fr-FR')} FCFA</span>
              </p>
              <p className="text-xs break-words">
                Premier versement: <span className="font-mono">{formatDate(contract.firstPaymentDate)}</span>
                {contract.nextDueAt ? (
                  <>
                    {' '}• Prochaine échéance: <span className="font-mono">{formatDate(contract.nextDueAt)}</span>
                  </>
                ) : null}
              </p>
              {contract.guarantorId && (
                <p className="text-xs break-words">
                  Garant: <span className="font-medium">{contract.guarantorFirstName} {contract.guarantorLastName}</span>
                  {contract.guarantorRelation ? (
                    <>
                      {' '}• Relation: <span className="font-medium">{contract.guarantorRelation}</span>
                    </>
                  ) : null}
                </p>
              )}
            </div>
          </CardHeader>
        </Card>

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
            totalLosses={totalLosses}
          />
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
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'payments' | 'penalties' | 'history' | 'losses' | 'guarantor')} className="w-full">
              <TabsList className={cn(
                'grid w-full rounded-none border-b',
                tabsGridClassName
              )}>
                <TabsTrigger value="payments" className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Versements
                </TabsTrigger>
                <TabsTrigger value="penalties" className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Pénalité
                </TabsTrigger>
                <TabsTrigger value="history" className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Historique
                </TabsTrigger>
                {shouldShowLossesTab && (
                  <TabsTrigger value="losses" className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Manque à gagner
                  </TabsTrigger>
                )}
                {!isSimpleCredit && (
                  <TabsTrigger value="guarantor" className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Commission du garant
                  </TabsTrigger>
                )}
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
                  
                  // Vérifier si toutes les échéances précédentes sont payées ou en repos
                  let allPreviousPaid = true
                  const previousStatuses: string[] = []
                  for (let j = 0; j < index; j++) {
                    previousStatuses.push(`M${actualSchedule[j].month}:${actualSchedule[j].status}`)
                    if (actualSchedule[j].status !== 'PAID' && actualSchedule[j].status !== 'REST') {
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
                                   item.status === 'REST' ||
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
                  
                  // Déterminer si le paiement est suffisant (pour l'échéancier après rajout, seuls les paiements >= extendedAt comptent)
                  const expectedPaymentForCard = dueItems.find((due) => due.month === item.month)?.payment
                    ?? Math.min(contract.monthlyPaymentAmount, item.principal)
                  const paidAmountForCard = item.paidAmount !== undefined ? item.paidAmount : null
                  const isPaymentSufficient = paidAmountForCard !== null && paidAmountForCard >= expectedPaymentForCard
                  
                  const statusConfig = item.status === 'PAID' 
                    ? paidAmountForCard === 0
                      ? { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', icon: XCircle, label: 'Non payé' }
                      : isPaymentSufficient
                        ? { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', icon: CheckCircle, label: 'Payé' }
                        : { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', icon: AlertCircle, label: 'Payé (insuffisant)' }
                    : item.status === 'DUE'
                    ? { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', icon: Clock, label: 'À payer' }
                    : item.status === 'REST' || item.isRest
                    ? { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: Calendar, label: 'Mois de repos' }
                    : { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', icon: XCircle, label: 'À venir' }
                  const StatusIcon = statusConfig.icon

                  return (
                    <Card
                      key={index}
                      className={cn(
                        'transition-all duration-300 border-2 overflow-hidden',
                        isDisabled
                          ? 'border-gray-300 bg-white cursor-not-allowed'
                          : item.status === 'PAID'
                          ? paidAmountForCard === 0
                            ? 'border-gray-300 bg-white hover:shadow-xl hover:-translate-y-1'
                            : isPaymentSufficient
                              ? 'border-green-300 bg-white hover:shadow-xl hover:-translate-y-1'
                              : 'border-red-300 bg-white hover:shadow-xl hover:-translate-y-1'
                          : item.status === 'REST' || item.isRest
                          ? 'border-blue-200 bg-white'
                          : 'border-gray-300 hover:border-[#224D62] bg-white hover:shadow-xl hover:-translate-y-1'
                      )}
                    >
                      {/* En-tête coloré de la carte */}
                      <div className={cn(
                        'p-4 border-b-2',
                        item.status === 'PAID' 
                          ? paidAmountForCard === 0
                            ? 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200'
                            : isPaymentSufficient
                              ? 'bg-gradient-to-r from-green-50 to-green-100 border-green-200' 
                              : 'bg-gradient-to-r from-red-50 to-red-100 border-red-200'
                          : item.status === 'DUE'
                          ? 'bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200'
                          : item.status === 'REST' || item.isRest
                          ? 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200'
                          : 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200'
                      )}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              'rounded-lg px-3 py-1.5 text-sm font-bold shadow-sm',
                              item.status === 'REST' || item.isRest ? 'bg-blue-600 text-white' : 'bg-[#224D62] text-white'
                            )}>
                              {item.status === 'REST' || item.isRest ? `Mois ${item.month} – Repos` : `Échéance ${item.month}`}
                            </div>
                          </div>
                          <Badge className={`${statusConfig.bg} ${statusConfig.text} ${statusConfig.border} border shadow-sm`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig.label}
                          </Badge>
                        </div>
                      </div>

                      {/* Corps de la carte avec fond blanc */}
                      <CardContent className="p-4 bg-white space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Date:</span>
                            <span className="font-semibold text-gray-900">
                              {formatDate(item.date)}
                            </span>
                          </div>

                          {(item.status === 'REST' || item.isRest) ? (
                            <div className="space-y-2 text-sm">
                              <p className="text-blue-700 font-medium">Aucun paiement ce mois (repos)</p>
                              {item.restReason && (
                                <div>
                                  <span className="text-gray-600">Motif:</span>
                                  <span className="ml-1 font-medium text-gray-900">{item.restReason}</span>
                                </div>
                              )}
                              {item.restRecordedByName && (
                                <div className="text-gray-500 text-xs">
                                  Enregistré par {item.restRecordedByName}
                                  {item.restRecordedAt && ` le ${format(item.restRecordedAt, 'dd/MM/yyyy à HH:mm', { locale: fr })}`}
                                </div>
                              )}
                              <div className="flex items-center justify-between text-sm pt-1 border-t border-gray-100">
                                <span className="text-gray-600">Capital après repos:</span>
                                <span className="font-semibold">{item.remaining.toLocaleString('fr-FR')} FCFA</span>
                              </div>
                            </div>
                          ) : (
                          <>
                          {(() => {
                            // Calculer le montant théorique à payer (mensualité ou montant global si inférieur)
                            const expectedPayment = dueItems.find((due) => due.month === item.month)?.payment
                              ?? Math.min(contract.monthlyPaymentAmount, item.principal)
                            const paidAmount = item.paidAmount !== undefined ? item.paidAmount : null
                            
                            return (
                              <>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-gray-600">Montant à payer:</span>
                                  <span className="font-semibold text-gray-900">
                                    {expectedPayment.toLocaleString('fr-FR')} FCFA
                                  </span>
                                </div>
                                
                                {/* Afficher montant versé si l'échéance est payée */}
                                {item.status === 'PAID' && paidAmount !== null && (
                                  <div className={`flex items-center justify-between text-sm mt-2 p-2 rounded ${
                                    paidAmount >= expectedPayment 
                                      ? 'bg-green-50 border border-green-200' 
                                      : 'bg-red-50 border border-red-200'
                                  }`}>
                                    <span className={`font-medium ${
                                      paidAmount >= expectedPayment ? 'text-green-700' : 'text-red-700'
                                    }`}>Montant versé:</span>
                                    <span className={`font-semibold ${
                                      paidAmount >= expectedPayment ? 'text-green-800' : 'text-red-800'
                                    }`}>
                                      {paidAmount.toLocaleString('fr-FR')} FCFA
                                    </span>
                                  </div>
                                )}
                              </>
                            )
                          })()}
                          
                          {/* Détail principal + intérêts (masqué pour mois de repos) */}
                          {!item.isRest && (
                          <>
                          <div className="flex items-center justify-between text-sm mt-1 pt-1 border-t border-gray-200">
                            <div className="flex items-center justify-between w-full">
                              <span className="text-gray-600">Montant global:</span>
                              <span className="font-semibold text-gray-900">
                                {item.principal.toLocaleString('fr-FR')} FCFA
                              </span>
                            </div>
                          </div>
                          {!isSimpleCredit && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Intérêts:</span>
                              <span className="font-semibold text-gray-900">
                                {item.interest.toLocaleString('fr-FR')} FCFA
                              </span>
                            </div>
                          )}
                          </>
                          )}

                          {item.status === 'PAID' && item.paymentDate && (
                            <>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Payé le:</span>
                                <span className="font-semibold text-green-600">
                                  {formatDate(item.paymentDate)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Payé à:</span>
                                <span className="font-semibold text-green-600">
                                  {(item.paymentTime != null && item.paymentTime !== '') ? item.paymentTime : new Date(item.paymentDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </>
                          )}

                          {item.status === 'PAID' && (() => {
                            const paymentForCard = getPaymentForScheduleIndex(index)
                            if (!paymentForCard?.modificationReason && !paymentForCard?.updatedAt) return null
                            return (
                              <div className="pt-2 mt-2 border-t border-gray-100 space-y-1 text-xs text-gray-500">
                                {paymentForCard?.updatedAt && (() => {
                                  const u = paymentForCard.updatedAt
                                  const modDate = u instanceof Date ? u : (typeof (u as { toDate?: () => Date })?.toDate === 'function' ? (u as { toDate: () => Date }).toDate() : u ? new Date(u as string | number) : null)
                                  if (!modDate || isNaN(modDate.getTime())) return null
                                  return (
                                    <div className="flex items-center justify-between">
                                      <span>Modifié le:</span>
                                      <span>{modDate.toLocaleDateString('fr-FR')} à {modDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                  )
                                })()}
                                {paymentForCard?.modificationReason && (
                                  <div>
                                    <span className="font-medium">Motif:</span>
                                    <span className="ml-1">{paymentForCard.modificationReason}</span>
                                  </div>
                                )}
                              </div>
                            )
                          })()}
                          </>
                          )}

                        {/* Boutons d'action */}
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          {item.status === 'DUE' && (
                            <div className="flex flex-col gap-2">
                              <Button
                                onClick={() => {
                                  setSelectedDueIndex(index)
                                  setShowPaymentModal(true)
                                }}
                                className="w-full bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65] text-white h-11 font-semibold shadow-md hover:shadow-lg transition-all"
                                disabled={isDisabled}
                              >
                                <HandCoins className="h-4 w-4 mr-2" />
                                Payer cette échéance
                              </Button>
                              {contract.creditType === 'SPECIALE' &&
                                index === nextDueIndex &&
                                specialHistoryByMonth.get(item.month)?.phase !== 'FIXE' && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
                                  onClick={() => {
                                    setSelectedRestMonth(item.month)
                                    setShowRestMonthModal(true)
                                  }}
                                  disabled={isDisabled}
                                >
                                  <Calendar className="h-4 w-4 mr-2" />
                                  Mois de repos
                                </Button>
                              )}
                            </div>
                          )}

                          {item.status === 'PAID' && (
                            <div className="flex flex-col gap-2">
                              <Button
                                onClick={() => {
                                  setSelectedDueIndexForReceipt(index)
                                  setShowReceiptModal(true)
                                }}
                                className="w-full h-11 font-semibold text-[#234D65] border-[#234D65] hover:bg-[#234D65]/10"
                                variant="outline"
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Voir la facture
                              </Button>
                              {!['DISCHARGED', 'CLOSED'].includes(contract.status) && (
                                <Button
                                  variant="outline"
                                  className="w-full border-amber-300 text-amber-700 hover:bg-amber-50"
                                  onClick={() => {
                                    const paymentForThisDue = getPaymentForScheduleIndex(index)
                                    if (!paymentForThisDue) {
                                      toast.error('Impossible de retrouver le versement pour cette échéance')
                                      return
                                    }
                                    setPaymentToEdit(paymentForThisDue)
                                    setShowPaymentModal(true)
                                  }}
                                >
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Modifier
                                </Button>
                              )}
                            </div>
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
              </TabsContent>

              {/* Onglet Pénalité */}
              <TabsContent value="penalties" className="p-6 space-y-6 m-0">
                {renderPenaltiesContent()}
              </TabsContent>

              {/* Onglet Historique */}
              <TabsContent value="history" className="p-6 space-y-6 m-0">
                <div className="space-y-6">
                  {contract.creditType === 'SPECIALE' && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-semibold flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Historique reconstitué
                          </h3>
                        </div>
                      </div>

                      {timelineHistoryRows.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 border rounded-lg">
                          Aucun mois enregistré pour le moment
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {Array.from(timelineHistoryByCycle.entries()).map(([cycleNumber, rows]) => (
                            <div key={cycleNumber} className="border rounded-lg overflow-x-auto">
                              <div className="px-4 py-3 border-b bg-slate-50 flex items-center justify-between gap-3">
                                <div>
                                  <p className="font-semibold text-slate-800">{rows[0]?.cycleTitle}</p>
                                  <p className="text-sm text-slate-500">
                                    {cycleNumber === 1
                                      ? 'Versements du cycle initial'
                                      : 'Les échéances repartent a M1 apres l’augmentation'}
                                  </p>
                                </div>
                                <Badge variant="outline" className="bg-white text-slate-700 border-slate-200">
                                  Cycle {cycleNumber}
                                </Badge>
                              </div>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Mois</TableHead>
                                    <TableHead>Phase</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Capital</TableHead>
                                    <TableHead className="text-right">Commission</TableHead>
                                    <TableHead className="text-right">Intérêts</TableHead>
                                    <TableHead className="text-right">Montant global</TableHead>
                                    <TableHead className="text-right">Montant remis</TableHead>
                                    <TableHead className="text-right">Pénalité</TableHead>
                                    <TableHead className="text-right">Nouveau capital</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {rows.map((row) => (
                                    <TableRow key={row.key} className={row.isRest ? 'bg-blue-50/50' : ''}>
                                      <TableCell className="font-medium">
                                        {row.isRest ? `M${row.cycleMonth} (repos)` : `M${row.cycleMonth}`}
                                      </TableCell>
                                      <TableCell>
                                        <Badge
                                          variant="outline"
                                          className={
                                            row.phase === 'FIXE'
                                              ? 'bg-slate-50 text-slate-700 border-slate-200'
                                              : 'bg-blue-50 text-blue-700 border-blue-200'
                                          }
                                        >
                                          {row.phase === 'FIXE' ? 'Partie fixe' : 'Spéciale'}
                                        </Badge>
                                      </TableCell>
                                      <TableCell>{formatDate(row.date)}</TableCell>
                                      <TableCell className="text-right">{row.capitalStart.toLocaleString('fr-FR')} FCFA</TableCell>
                                      <TableCell className="text-right">{row.commission.toLocaleString('fr-FR')} FCFA</TableCell>
                                      <TableCell className="text-right">{row.interest.toLocaleString('fr-FR')} FCFA</TableCell>
                                      <TableCell className="text-right font-medium">{row.amountDue.toLocaleString('fr-FR')} FCFA</TableCell>
                                      <TableCell className="text-right">{row.actualPayment.toLocaleString('fr-FR')} FCFA</TableCell>
                                      <TableCell className="text-right">{(penaltiesByTimelineKey.get(row.key) ?? 0).toLocaleString('fr-FR')} FCFA</TableCell>
                                      <TableCell className="text-right font-medium">{row.nextCapitalActual.toLocaleString('fr-FR')} FCFA</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <History className="h-5 w-5" />
                        Versements enregistrés
                      </h3>
                      {(contract.creditType === 'SPECIALE' || contract.creditType === 'FIXE' || contract.creditType === 'AIDE') && payments.length > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          className="border-[#234D65] text-[#234D65] hover:bg-[#234D65]/10"
                          onClick={handleOpenGlobalFacturePDF}
                          disabled={isGeneratingGlobalFacturePdf}
                        >
                          {isGeneratingGlobalFacturePdf ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Génération...
                            </>
                          ) : (
                            <>
                              <Eye className="mr-2 h-4 w-4" />
                              Voir la facture globale PDF
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                    {isLoadingPayments ? (
                      <div className="text-center py-8 text-gray-500">Chargement...</div>
                    ) : payments.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 border rounded-lg">Aucun versement enregistré</div>
                    ) : (
                      <div className="space-y-3">
                        {[...payments]
                          .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
                          .map((payment) => {
                            const paymentLabel = getCreditPaymentDisplayMonthLabel(contract, payment)

                            return (
                              <div
                                key={payment.id}
                                className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow"
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Calendar className="h-4 w-4 text-gray-500" />
                                    <span className="font-semibold">
                                      {formatDateTime(payment.paymentDate, payment.paymentTime)}
                                    </span>
                                    {contract.creditType === 'SPECIALE' && (
                                      <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
                                        {paymentLabel}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-4 text-sm text-gray-600">
                                    {payment.amount === 0 && payment.comment?.includes('Paiement de pénalités uniquement') ? (
                                      <>
                                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                          Pénalités uniquement
                                        </Badge>
                                        <span>Mode : {CREDIT_PAYMENT_MODE_LABELS[payment.mode] ?? payment.mode}{(payment.mode === 'airtel_money' || payment.mode === 'mobicash') && payment.withFees !== undefined ? ` (${payment.withFees ? 'Avec frais' : 'Sans frais'})` : ''}</span>
                                        {payment.note !== undefined && (
                                          <span>Note pénalités : {payment.note}/10</span>
                                        )}
                                      </>
                                    ) : (
                                      <>
                                        <span>Montant : {payment.amount.toLocaleString('fr-FR')} FCFA</span>
                                        <span>Mode : {CREDIT_PAYMENT_MODE_LABELS[payment.mode] ?? payment.mode}{(payment.mode === 'airtel_money' || payment.mode === 'mobicash') && payment.withFees !== undefined ? ` (${payment.withFees ? 'Avec frais' : 'Sans frais'})` : ''}</span>
                                        {payment.note !== undefined && (
                                          <span>Note : {payment.note}/10</span>
                                        )}
                                      </>
                                    )}
                                  </div>
                                  {(payment.modificationReason || !!(payment as { updatedAt?: unknown }).updatedAt) && (
                                    <div className="mt-2 text-xs text-gray-500 space-y-0.5">
                                      {(() => {
                                        const u = (payment as { updatedAt?: unknown }).updatedAt
                                        const modDate = u instanceof Date ? u : (typeof (u as { toDate?: () => Date })?.toDate === 'function' ? (u as { toDate: () => Date }).toDate() : u ? new Date(u as string | number) : null)
                                        if (modDate && !isNaN(modDate.getTime())) {
                                          return (
                                            <div>
                                              <span>Modifié le : {modDate.toLocaleDateString('fr-FR')} à {modDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                          )
                                        }
                                        return null
                                      })()}
                                      {payment.modificationReason && (
                                        <div><span className="font-medium">Motif :</span> {payment.modificationReason}</div>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <div className="flex flex-col gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-[#234D65] border-[#234D65] hover:bg-[#234D65]/10"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setSelectedPayment(payment)
                                      setShowReceiptModal(true)
                                    }}
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    Voir la facture
                                  </Button>
                                  {!['DISCHARGED', 'CLOSED'].includes(contract.status) && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="border-amber-300 text-amber-700 hover:bg-amber-50"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setPaymentToEdit(payment)
                                        setShowPaymentModal(true)
                                      }}
                                    >
                                      <Pencil className="h-4 w-4 mr-1" />
                                      Modifier
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {shouldShowLossesTab && (
                <TabsContent value="losses" className="p-6 space-y-6 m-0">
                  <div className="space-y-6">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <TrendingUp className="h-5 w-5" />
                          Historique du manque à gagner
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                          {lossesTabDescription}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="border-[#234D65] text-[#234D65] hover:bg-[#234D65]/10"
                          onClick={handleExportLossHistoryExcel}
                          disabled={isExportingLossHistoryExcel}
                        >
                          {isExportingLossHistoryExcel ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Export...
                            </>
                          ) : (
                            <>
                              <Download className="mr-2 h-4 w-4" />
                              Exporter Excel
                            </>
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="border-[#234D65] text-[#234D65] hover:bg-[#234D65]/10"
                          onClick={handleOpenLossHistoryPdf}
                          disabled={isGeneratingLossHistoryPdf}
                        >
                          {isGeneratingLossHistoryPdf ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Génération...
                            </>
                          ) : (
                            <>
                              <Eye className="mr-2 h-4 w-4" />
                              Voir le PDF
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-lg border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Echéance</TableHead>
                            <TableHead className="text-right">Pertes (FCFA)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {lossHistoryRows.map((row) => (
                            <TableRow key={`${row.month}-${row.date.toISOString()}`}>
                              <TableCell className="font-medium">{row.echeance}</TableCell>
                              <TableCell className="text-right text-red-700 font-semibold">
                                {row.lossAmount.toLocaleString('fr-FR')}
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="bg-slate-50">
                            <TableCell className="font-semibold">Total du manque à gagner</TableCell>
                            <TableCell className="text-right font-bold text-red-700">
                              {totalLosses.toLocaleString('fr-FR')}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </TabsContent>
              )}

              {/* Onglet Commission du garant */}
              {!isSimpleCredit && (
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
                            <strong>Taux de commission :</strong> {contract.guarantorRemunerationPercentage}% du reste dû (capital restant au début de chaque échéance), calculé sur maximum 7 mois
                          </p>
                        )}
                      </div>
                    </div>

                    {isLoadingRemunerations ? (
                      <div className="text-center py-8 text-gray-500">Chargement...</div>
                    ) : isGuarantorRemunerationsError ? (
                      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {guarantorRemunerationsErrorMessage}
                      </div>
                    ) : guarantorCommissionRows.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">Aucune commission enregistrée</div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="border-[#234D65] text-[#234D65] hover:bg-[#234D65]/10"
                            onClick={handleExportGuarantorCommissionsExcel}
                            disabled={isExportingGuarantorCommissionsExcel}
                          >
                            {isExportingGuarantorCommissionsExcel ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Export...
                              </>
                            ) : (
                              <>
                                <Download className="mr-2 h-4 w-4" />
                                Exporter Excel
                              </>
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="border-[#234D65] text-[#234D65] hover:bg-[#234D65]/10"
                            onClick={handleOpenGuarantorCommissionsPdf}
                            disabled={isGeneratingGuarantorCommissionsPdf}
                          >
                            {isGeneratingGuarantorCommissionsPdf ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Génération...
                              </>
                            ) : (
                              <>
                                <Eye className="mr-2 h-4 w-4" />
                                Voir le PDF
                              </>
                            )}
                          </Button>
                        </div>
                        <div className="border rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Mois</TableHead>
                                <TableHead>Reste dû</TableHead>
                                <TableHead className="text-right">Pourcentage de commission</TableHead>
                                <TableHead className="text-right">Somme due</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {guarantorCommissionRows.map((row) => (
                                <TableRow key={row.id}>
                                  <TableCell className="font-medium">{row.monthLabel}</TableCell>
                                  <TableCell>{row.remainingAtStartOfMonth.toLocaleString('fr-FR')} FCFA</TableCell>
                                  <TableCell className="text-right">{row.commissionPercentage}%</TableCell>
                                  <TableCell className="text-right font-semibold">{row.commissionAmount.toLocaleString('fr-FR')} FCFA</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                        <div className="p-4 bg-gray-50 border rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold">Total des commissions :</span>
                            <span className="text-xl font-bold text-[#234D65]">
                              {totalGuarantorCommissions.toLocaleString('fr-FR')} FCFA
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                      {/* Paiement au garant */}
                      <div className="border-t pt-6 mt-6">
                        <h4 className="font-semibold mb-1">Paiement au garant</h4>
                        {hasEnteredFixedPhase ? (
                          <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
                            <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
                            <div>
                              <p className="text-sm font-semibold text-red-700">
                                Le contrat est déjà passé en partie fixe.
                              </p>
                              <p className="mt-1 text-sm text-red-700">
                                À partir de cette bascule, le garant n&apos;a plus droit à ses commissions.
                                L&apos;enregistrement d&apos;un paiement au garant est donc désactivé.
                              </p>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm text-gray-600 mb-3">Enregistrer la preuve du versement effectué au garant.</p>
                            <Button
                              type="button"
                              variant="outline"
                              className="border-[#234D65] text-[#234D65] hover:bg-[#234D65]/10"
                              onClick={() => setShowGuarantorPaymentModal(true)}
                            >
                              <HandCoins className="h-4 w-4 mr-2" />
                              Enregistrer un paiement au garant
                            </Button>
                          </>
                        )}
                        {/* Historique des paiements au garant */}
                        <div className="mt-4">
                          <h5 className="text-sm font-medium text-gray-700 mb-2">Historique des paiements au garant</h5>
                          {isLoadingGuarantorPayments ? (
                            <p className="text-sm text-gray-500">Chargement...</p>
                          ) : isGuarantorPaymentsError ? (
                            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                              {guarantorPaymentsErrorMessage}
                            </div>
                          ) : guarantorPayments.length === 0 ? (
                            <p className="text-sm text-gray-500">Aucun paiement enregistré</p>
                          ) : (
                            <div className="border rounded-lg overflow-hidden">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Montant</TableHead>
                                    <TableHead>Moyen</TableHead>
                                    <TableHead>Preuve</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {guarantorPayments.map((gp) => (
                                    <TableRow key={gp.id}>
                                      <TableCell>
                                        {format(new Date(gp.paymentDate), 'dd/MM/yyyy', { locale: fr })} à {gp.paymentTime}
                                      </TableCell>
                                      <TableCell className="text-right font-medium">{gp.amount.toLocaleString('fr-FR')} FCFA</TableCell>
                                      <TableCell>{CREDIT_PAYMENT_MODE_LABELS[gp.mode] ?? gp.mode}</TableCell>
                                      <TableCell>
                                        {gp.proofUrl ? (
                                          <a href={gp.proofUrl} target="_blank" rel="noopener noreferrer" className="text-[#234D65] hover:underline text-sm">
                                            Voir
                                          </a>
                                        ) : (
                                          <span className="text-gray-400">—</span>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                        </div>
                      </div>
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
              )}
            </Tabs>
          </CardContent>
        </Card>

        {/* Section Remboursement final - visible quand montant restant = 0 et contrat non déchargé/clos */}
        {realRemainingAmount <= 0.1 &&
          contract.status !== 'DISCHARGED' &&
          contract.status !== 'CLOSED' &&
          (contract.status === 'ACTIVE' || contract.status === 'PARTIAL') && (
            <Card className="border-0 shadow-xl bg-gradient-to-r from-emerald-50 to-green-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-emerald-800">
                  <CheckCircle className="h-5 w-5" />
                  Remboursement final
                </CardTitle>
                <p className="text-sm text-emerald-700">
                  Le montant restant est à 0. Validez le remboursement final pour passer à l&apos;étape de clôture.
                </p>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => setShowFinalRepaymentModal(true)}
                  disabled={validateFinalRepayment.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {validateFinalRepayment.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Remboursement final
                </Button>
              </CardContent>
            </Card>
          )}

        {/* Section Déchargé - visible quand contrat DISCHARGED ou CLOSED */}
        {(contract.status === 'DISCHARGED' || contract.status === 'CLOSED') && (
          <Card className={cn(
            'border-0 shadow-xl',
            contract.status === 'CLOSED'
              ? 'bg-gradient-to-r from-slate-100 to-slate-200 ring-2 ring-slate-300/50'
              : 'bg-gradient-to-r from-blue-50 to-cyan-50'
          )}>
            <CardHeader>
              <CardTitle className={cn(
                'flex items-center gap-2',
                contract.status === 'CLOSED' ? 'text-slate-800' : 'text-blue-800'
              )}>
                <FileSignature className="h-5 w-5" />
                {contract.status === 'CLOSED' ? 'Contrat clos' : 'Déchargé'}
              </CardTitle>
              {contract.dischargeMotif && (
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="font-medium text-gray-700">Motif :</span>{' '}
                    {contract.dischargeMotif}
                  </p>
                  {contract.dischargedAt && (
                    <p>
                      <span className="font-medium text-gray-700">Date :</span>{' '}
                      {format(new Date(contract.dischargedAt), 'dd MMMM yyyy', { locale: fr })}
                    </p>
                  )}
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowQuittanceModal(true)}
                  className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Générer la quittance
                </Button>
                {contract.status !== 'CLOSED' && (
                  <Button
                    variant="outline"
                    onClick={() => setShowSignedQuittanceUploadModal(true)}
                    disabled={uploadSignedQuittance.isPending || replaceSignedQuittance.isPending}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {contract.signedQuittanceUrl ? 'Modifier la quittance signée' : 'Téléverser la quittance signée'}
                  </Button>
                )}
                {contract.signedQuittanceUrl && (
                  <Button
                    variant="default"
                    className="bg-[#234D65] hover:bg-[#1a3a4a] text-white font-semibold shadow-md px-5 py-2.5"
                    onClick={() => {
                      const hasGuarantorCommission = !!(
                        contract.guarantorId &&
                        contract.guarantorIsMember &&
                        (contract.guarantorRemunerationPercentage ?? 0) > 0
                      )
                      if (hasGuarantorCommission && guarantorPayments.length === 0) {
                        toast.error('Veuillez enregistrer d\'abord le paiement du garant')
                        return
                      }
                      setShowCloseContractModal(true)
                    }}
                    disabled={closeContract.isPending || contract.status === 'CLOSED'}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Clôturer le contrat
                  </Button>
                )}
              </div>
              {contract.status === 'CLOSED' && contract.closedAt && (
                <div className="p-4 rounded-lg bg-slate-700 text-white shadow-md ring-1 ring-slate-600/50">
                  <p className="font-semibold">Contrat clôturé</p>
                  <p className="text-sm text-slate-200 mt-1">
                    Le {format(new Date(contract.closedAt), 'dd MMMM yyyy', { locale: fr })}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

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
              {/* Actions pour uploader le contrat signé (activation initiale ou après augmentation) */}
              {canUploadSignedContract(contract) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <Button
                    variant="outline"
                    className="justify-start bg-white hover:bg-blue-50"
                    onClick={() => setShowUploadContractModal(true)}
                    disabled={uploadSignedContract.isPending}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {isUploadActivationFlow ? 'Uploader contrat signé' : 'Uploader nouveau contrat signé'}
                  </Button>
                </div>
              )}

              {/* Actions du cycle en cours */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {!['DISCHARGED', 'CLOSED'].includes(contract.status) && (
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={(currentCycleDocuments?.contractUrl || contract.contractUrl)
                      ? () => window.open(currentCycleDocuments?.contractUrl || contract.contractUrl || '', '_blank')
                      : () => setShowContractPDFModal(true)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Télécharger contrat
                  </Button>
                )}
                {(currentCycleDocuments?.signedContractUrl || contract.signedContractUrl) && (
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      className="justify-start"
                      onClick={() => window.open(currentCycleDocuments?.signedContractUrl || contract.signedContractUrl || '', '_blank')}
                    >
                      <FileSignature className="h-4 w-4 mr-2" />
                      Voir contrat
                    </Button>
                    {!['DISCHARGED', 'CLOSED'].includes(contract.status) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="justify-start border-amber-300 text-amber-700 hover:bg-amber-50"
                        onClick={() => { setReplaceContractFile(undefined); setShowReplaceContractModal(true) }}
                        disabled={replaceSignedContract.isPending}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Modifier contrat signé
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Historique des contrats par cycle (avant/après augmentation) */}
              {contractDocumentsByCycle.length > 0 && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-800">Contrats par cycle</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Visualisez clairement le contrat initial (avant augmentation) et le contrat du cycle augmenté.
                  </p>
                  <div className="mt-3 space-y-3">
                    {contractDocumentsByCycle.map((cycleDocument) => {
                      const canGenerateCurrentCycleContract =
                        cycleDocument.isCurrentCycle && !['DISCHARGED', 'CLOSED'].includes(contract.status)
                      const canOpenCycleContract = Boolean(cycleDocument.contractUrl) || canGenerateCurrentCycleContract

                      return (
                        <div key={cycleDocument.cycleNumber} className="rounded-lg border border-slate-200 bg-white p-3">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium text-slate-800">{cycleDocument.title}</p>
                              <p className="text-xs text-slate-500">
                                Démarré le {format(new Date(cycleDocument.startedAt), 'dd/MM/yyyy', { locale: fr })}
                              </p>
                            </div>
                            {cycleDocument.isCurrentCycle && (
                              <Badge className="w-fit bg-blue-100 text-blue-700 border border-blue-200">
                                Cycle en cours
                              </Badge>
                            )}
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={
                                cycleDocument.contractUrl
                                  ? () => window.open(cycleDocument.contractUrl, '_blank')
                                  : () => setShowContractPDFModal(true)
                              }
                              disabled={!canOpenCycleContract}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              {cycleDocument.contractUrl ? 'Voir contrat généré' : 'Télécharger contrat'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(cycleDocument.signedContractUrl, '_blank')}
                              disabled={!cycleDocument.signedContractUrl}
                            >
                              <FileSignature className="h-4 w-4 mr-2" />
                              Voir contrat signé
                            </Button>
                          </div>

                          {!cycleDocument.signedContractUrl && (
                            <p className="mt-2 text-xs text-amber-700">
                              Aucun contrat signé téléversé pour ce cycle.
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Documents de clôture */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {contract.signedQuittanceUrl && (
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => window.open(contract.signedQuittanceUrl, '_blank')}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Quittance signée
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

        {/* Remboursement final enregistré (données saisies lors du téléversement / modification quittance signée) */}
        {(contract.finalRepaymentPaymentMode ??
          contract.finalRepaymentRepaidAt ??
          contract.finalRepaymentComment ??
          contract.finalRepaymentModifiedBy ??
          contract.finalRepaymentModificationMotif) && (
          <Card className="border-0 shadow-xl bg-slate-50/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-800">
                <HandCoins className="h-5 w-5" />
                Remboursement final enregistré
              </CardTitle>
              <p className="text-sm text-slate-600">
                Informations enregistrées lors du téléversement de la quittance signée
                {contract.finalRepaymentModifiedAt ? ' (dernière modification ci-dessous).' : '.'}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                {contract.finalRepaymentPaymentMode && (
                  <div>
                    <dt className="font-medium text-slate-600">Moyen de paiement</dt>
                    <dd className="mt-0.5 text-slate-900">
                      {CREDIT_PAYMENT_MODE_LABELS[contract.finalRepaymentPaymentMode] ?? contract.finalRepaymentPaymentMode}
                      {contract.finalRepaymentPaymentMode === 'other' && contract.finalRepaymentMethodOther && (
                        <span className="text-slate-600"> — {contract.finalRepaymentMethodOther}</span>
                      )}
                      {(contract.finalRepaymentPaymentMode === 'airtel_money' || contract.finalRepaymentPaymentMode === 'mobicash') &&
                        contract.finalRepaymentWithFees !== undefined && (
                          <span className="text-slate-600">
                            {' '}
                            ({contract.finalRepaymentWithFees ? 'Avec frais' : 'Sans frais'})
                          </span>
                        )}
                    </dd>
                  </div>
                )}
                {contract.finalRepaymentRepaidAt && (
                  <div>
                    <dt className="font-medium text-slate-600">Date et heure du remboursement</dt>
                    <dd className="mt-0.5 text-slate-900">
                      {format(new Date(contract.finalRepaymentRepaidAt), "dd MMMM yyyy 'à' HH:mm", { locale: fr })}
                    </dd>
                  </div>
                )}
                {contract.finalRepaymentComment && (
                  <div className="sm:col-span-2">
                    <dt className="font-medium text-slate-600">Commentaire</dt>
                    <dd className="mt-0.5 text-slate-900 whitespace-pre-wrap">{contract.finalRepaymentComment}</dd>
                  </div>
                )}
              </dl>
              {(contract.finalRepaymentModifiedBy ?? contract.finalRepaymentModificationMotif) && (
                <div className="pt-4 border-t border-slate-200">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Dernière modification de la quittance</p>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    {contract.finalRepaymentModifiedByName && (
                      <div>
                        <dt className="font-medium text-slate-600">Modifié par</dt>
                        <dd className="mt-0.5 text-slate-900">{contract.finalRepaymentModifiedByName}</dd>
                      </div>
                    )}
                    {contract.finalRepaymentModifiedAt && (
                      <div>
                        <dt className="font-medium text-slate-600">Date de modification</dt>
                        <dd className="mt-0.5 text-slate-900">
                          {format(new Date(contract.finalRepaymentModifiedAt), "dd MMMM yyyy 'à' HH:mm", { locale: fr })}
                        </dd>
                      </div>
                    )}
                    {contract.finalRepaymentModificationMotif && (
                      <div className="sm:col-span-2">
                        <dt className="font-medium text-slate-600">Motif de modification</dt>
                        <dd className="mt-0.5 text-slate-900 whitespace-pre-wrap">{contract.finalRepaymentModificationMotif}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modals */}
      <CreditPaymentModal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false)
          setSelectedDueIndex(null)
          setPaymentToEdit(null)
        }}
        creditId={contract.id}
        paymentToEdit={paymentToEdit}
        submitLabel={paymentToEdit ? 'Modifier le versement' : undefined}
        defaultAmount={paymentToEdit ? paymentToEdit.amount : (selectedDueIndex !== null ? actualSchedule[selectedDueIndex]?.payment : contract.monthlyPaymentAmount)}
        defaultPaymentDate={paymentToEdit ? paymentToEdit.paymentDate : (selectedDueIndex !== null ? actualSchedule[selectedDueIndex]?.date : undefined)}
        installmentId={paymentToEdit?.installmentId ?? (selectedDueIndex !== null ? actualSchedule[selectedDueIndex]?.installmentId : undefined)}
        installmentNumber={paymentToEdit ? getCreditPaymentMonthNumber(contract, paymentToEdit) : (selectedDueIndex !== null ? actualSchedule[selectedDueIndex]?.month : undefined)}
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
          setPaymentToEdit(null)
        }}
      />
      <CreditPenaltyPaymentModal
        isOpen={showPenaltyPaymentModal}
        onClose={() => {
          setShowPenaltyPaymentModal(false)
          setSelectedPenaltyToPay(null)
          setPenaltyPaymentModalMode('pay')
        }}
        creditId={contract.id}
        penalty={selectedPenaltyToPay}
        modalMode={penaltyPaymentModalMode}
        onSuccess={async () => {
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['creditPenalties', 'creditId', contract.id] }),
            queryClient.invalidateQueries({ queryKey: ['creditPenalties', 'unpaid', 'creditId', contract.id] }),
            queryClient.invalidateQueries({ queryKey: ['creditContract', contract.id] }),
            queryClient.invalidateQueries({ queryKey: ['creditContracts'] }),
            queryClient.invalidateQueries({ queryKey: ['creditContractsStats'] }),
          ])
          setShowPenaltyPaymentModal(false)
          setSelectedPenaltyToPay(null)
          setPenaltyPaymentModalMode('pay')
        }}
      />
      <CreditPenaltyReceiptModal
        isOpen={showPenaltyReceiptModal}
        onClose={() => {
          setShowPenaltyReceiptModal(false)
          setSelectedPenaltyForReceipt(null)
        }}
        contract={contract}
        penalty={selectedPenaltyForReceipt}
      />
      {selectedRestMonth !== null && (
        <RestMonthModal
          isOpen={showRestMonthModal}
          onClose={() => {
            setShowRestMonthModal(false)
            setSelectedRestMonth(null)
          }}
          creditId={contract.id}
          monthNumber={selectedRestMonth}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['creditContract', contract.id] })
            queryClient.invalidateQueries({ queryKey: ['creditPayments', 'creditId', contract.id] })
          }}
        />
      )}
      <GuarantorPaymentModal
        isOpen={showGuarantorPaymentModal}
        onClose={() => setShowGuarantorPaymentModal(false)}
        creditId={contract.id}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['guarantorPayments', 'creditId', contract.id] })
        }}
      />
      {(selectedPaymentForReceipt && (selectedDueIndexForReceipt !== null || !!selectedPayment)) && (
        <PaymentReceiptModal
          isOpen={showReceiptModal}
          onClose={() => {
            setShowReceiptModal(false)
            setSelectedDueIndexForReceipt(null)
            setSelectedPayment(null)
          }}
          contract={selectedPaymentReceiptContext?.receiptContract ?? contract}
          payment={selectedPaymentForReceipt}
          installmentNumber={selectedReceiptInstallmentNumber}
          schedule={selectedPaymentReceiptContext?.receiptSchedule ?? actualSchedule}
          pdfTitleText={
            selectedPaymentReceiptContext
              ? (selectedPaymentReceiptContext.cycleNumber > 1
                ? `${format(new Date(selectedPaymentReceiptContext.dueDate ?? selectedPaymentForReceipt.paymentDate), 'yyyy-MM-dd')} - M${selectedPaymentReceiptContext.installmentNumber} apres augmentation`
                : undefined)
              : undefined
          }
          dueDate={selectedReceiptDueDate}
          penaltyAmountOverride={selectedReceiptPenaltyAmount}
          onEditClick={!['DISCHARGED', 'CLOSED'].includes(contract.status) ? () => {
            setPaymentToEdit(selectedPaymentForReceipt)
            setShowReceiptModal(false)
            setSelectedDueIndexForReceipt(null)
            setSelectedPayment(null)
            setShowPaymentModal(true)
          } : undefined}
        />
      )}

      {/* Modal résumé de versement */}
      {selectedPayment && (
        <PaymentSummaryModal
          isOpen={showPaymentSummaryModal}
          onClose={() => {
            setShowPaymentSummaryModal(false)
            setSelectedPayment(null)
            setSelectedDueIndexForSummary(null)
          }}
          contract={contract}
          payment={selectedPayment}
          dueItem={selectedDueIndexForSummary !== null ? actualSchedule[selectedDueIndexForSummary] as React.ComponentProps<typeof PaymentSummaryModal>['dueItem'] : undefined}
          nextDueItem={selectedDueIndexForSummary !== null && selectedDueIndexForSummary + 1 < actualSchedule.length 
            ? actualSchedule[selectedDueIndexForSummary + 1] as React.ComponentProps<typeof PaymentSummaryModal>['nextDueItem']
            : undefined}
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
              {isUploadActivationFlow
                ? 'Téléversez le contrat signé par le client. Le contrat sera automatiquement activé après l\'upload.'
                : 'Téléversez le nouveau contrat signé par le client après augmentation du crédit.'}
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

            {isUploadActivationFlow && (
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
                  toast.success(
                    isUploadActivationFlow
                      ? 'Contrat signé uploadé et contrat activé avec succès'
                      : 'Nouveau contrat signé téléversé avec succès'
                  )
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
                  {isUploadActivationFlow ? 'Uploader et activer' : 'Uploader le contrat signé'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de remplacement du contrat signé */}
      <Dialog open={showReplaceContractModal} onOpenChange={setShowReplaceContractModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Modifier le contrat signé
            </DialogTitle>
            <DialogDescription>
              Le fichier précédent sera remplacé par le nouveau PDF. Le statut du contrat ne change pas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="replaceContractFile" className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Nouveau fichier du contrat signé (PDF) *
              </Label>
              <Input
                id="replaceContractFile"
                type="file"
                accept="application/pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) setReplaceContractFile(file)
                }}
                disabled={replaceSignedContract.isPending}
              />
              {replaceContractFile && (
                <div className="mt-2 text-sm text-gray-600">
                  Fichier sélectionné : {replaceContractFile.name} ({(replaceContractFile.size / 1024).toFixed(2)} KB)
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowReplaceContractModal(false)
                setReplaceContractFile(undefined)
              }}
              disabled={replaceSignedContract.isPending}
            >
              Annuler
            </Button>
            <Button
              onClick={async () => {
                if (!replaceContractFile) {
                  toast.error('Veuillez sélectionner un fichier')
                  return
                }
                try {
                  await replaceSignedContract.mutateAsync({
                    contractId: contract.id,
                    file: replaceContractFile,
                  })
                  setShowReplaceContractModal(false)
                  setReplaceContractFile(undefined)
                } catch (error: any) {
                  toast.error(error?.message || 'Erreur lors du remplacement du contrat signé')
                }
              }}
              disabled={!replaceContractFile || replaceSignedContract.isPending}
              className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65]"
            >
              {replaceSignedContract.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Remplacement en cours...
                </>
              ) : (
                'Remplacer'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal d'augmentation de crédit */}
      <CreditExtensionModal
        isOpen={showExtensionModal}
        onClose={() => setShowExtensionModal(false)}
        contract={contract}
      />
      <SwitchToFixedPhaseModal
        isOpen={showSwitchToFixedModal}
        onClose={() => setShowSwitchToFixedModal(false)}
        contract={contract}
        onConfirm={async (reason) => {
          await switchToFixedPhase.mutateAsync({ contractId: contract.id, reason })
        }}
        isPending={switchToFixedPhase.isPending}
      />
      <CreditSpecialeContractPDFModal
        isOpen={showContractPDFModal}
        onClose={() => setShowContractPDFModal(false)}
        contract={contract}
      />
      <FinalRepaymentModal
        isOpen={showFinalRepaymentModal}
        onClose={() => setShowFinalRepaymentModal(false)}
        contract={contract}
        onValidate={async (motif) => {
          await validateFinalRepayment.mutateAsync({ contractId: contract.id, motif })
        }}
        isPending={validateFinalRepayment.isPending}
      />
      <SignedQuittanceUploadModal
        isOpen={showSignedQuittanceUploadModal}
        onClose={() => setShowSignedQuittanceUploadModal(false)}
        contract={contract}
        isReplace={!!contract.signedQuittanceUrl}
        onUpload={async (file, data) => {
          await uploadSignedQuittance.mutateAsync({ contractId: contract.id, file, data })
        }}
        onReplace={async (file, data, modificationMotif) => {
          await replaceSignedQuittance.mutateAsync({
            contractId: contract.id,
            file,
            data,
            modificationMotif,
          })
        }}
        isPending={uploadSignedQuittance.isPending || replaceSignedQuittance.isPending}
      />
      <CloseContractModal
        isOpen={showCloseContractModal}
        onClose={() => setShowCloseContractModal(false)}
        contract={contract}
        onCloseContract={async (data) => {
          await closeContract.mutateAsync({
            contractId: contract.id,
            closedAt: data.closedAt,
            motifCloture: data.motifCloture,
          })
        }}
        isPending={closeContract.isPending}
      />
      <QuittanceCreditSpecialePDFModal
        isOpen={showQuittanceModal}
        onClose={() => setShowQuittanceModal(false)}
        contract={contract}
      />
    </div>
  )
}
