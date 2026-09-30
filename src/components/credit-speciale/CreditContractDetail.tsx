'use client'
import dynamic from 'next/dynamic'
import { getCreditContractEndDate } from '@/services/credit-speciale/creditContractDates'
import { computeWeeklyCreditTotals, formatCreditDuration, getWeeklyCreditStartDate, isWeeklyCredit } from '@/utils/credit-weekly'

import { backOr } from '@/lib/backNavigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from '@/components/ui/modal'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
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
import { useChildContract, useCreditContractMutations, useCreditInstallmentsByCreditId, useCreditPaymentsByCreditId, useCreditPaymentMutations, useCreditPenaltiesByCreditId, useDeleteGuarantorPayment, useGuarantorPaymentsByCreditId, useGuarantorRemunerationsByCreditId, useParentContract, useSwitchToFixedPhase } from '@/hooks/useCreditSpeciale'
import { useMember } from '@/hooks/useMembers'
import { cn } from '@/lib/utils'
import DocumentViewerModal from '@/components/documents/DocumentViewerModal'
import {
  buildCreditSpecialFactureData,
  buildCreditSpecialFacturePage1Data,
} from '@/services/credit-speciale/creditSpecialeFactureHelpers'
import { generateGlobalFactureCreditSpecialPDF } from '@/services/credit-speciale/factureCreditSpecialPdfExport'
import { generateCreditSpecialGuarantorCommissionHistoryPDF } from '@/services/credit-speciale/guarantorCommissionHistoryCreditSpecialPdfExport'
import { generateCreditSpecialLossHistoryPDF } from '@/services/credit-speciale/lossHistoryCreditSpecialPdfExport'
import { CreditContract, CreditContractStatus, CreditPayment, CreditPenalty, GuarantorPayment } from '@/types/types'
import {
  getCreditContractCycles,
  buildCreditSpecialeHistory,
  buildCreditSpecialeTimelineHistory,
  type CreditSpecialeTimelineMonth,
  getCreditPaymentDisplayMonthLabel,
  getCreditPaymentCycleNumber,
  getCreditPaymentMonthNumber,
  getCreditPaymentsForCurrentCycle,
  getCreditSpecialeLastRecordedMonth,
} from '@/utils/credit-speciale-history'
import { DELETABLE_PAYMENT_CONTRACT_STATUSES, getCreditPaymentDeletionBlocker } from '@/utils/credit-payment-deletion'
import { useIsSuperAdmin } from '@/hooks/useIsSuperAdmin'
import {
  buildGuarantorCommissionBalance,
  buildGuarantorCommissionRows,
  formatGuarantorCommissionMonth,
  getGuarantorCycleTitle,
} from '@/utils/guarantor-commission'
import { useQueries, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
    AlertCircle,
    ArrowLeft,
    Calendar,
    CalendarDays,
    CheckCircle,
    ChevronDown,
    Clock,
    Download,
    Eye,
    FileSignature,
    FileText,
    HandCoins,
    History,
    Lock,
    Link2,
    Loader2,
    Pencil,
    Plus,
    Shield,
    Trash2,
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
const CreditSpecialeContractPDFModal = dynamic(
  () => import('./CreditSpecialeContractPDFModal'),
  { ssr: false },
)
import FinalRepaymentModal from './FinalRepaymentModal'
import GuarantorPaymentModal from './GuarantorPaymentModal'
const PaymentReceiptModal = dynamic(() => import('./PaymentReceiptModal'), {
  ssr: false,
})
const PaymentSummaryModal = dynamic(() => import('./PaymentSummaryModal'), {
  ssr: false,
})
const QuittanceCreditSpecialePDFModal = dynamic(
  () => import('./QuittanceCreditSpecialePDFModal'),
  { ssr: false },
)
import RestMonthModal from './RestMonthModal'
import SignedQuittanceUploadModal from './SignedQuittanceUploadModal'
import SwitchToFixedPhaseModal from './SwitchToFixedPhaseModal'
import { addContractMonths } from '@/utils/contract-months'

interface CreditContractDetailProps {
  contract: CreditContract
  listPath?: string
  contractDetailsBasePath?: string
}

// Libellés moyen de paiement (alignés caisse spéciale + rétrocompatibilité + remboursement final)
const CREDIT_TYPE_LABELS: Record<CreditContract['creditType'], string> = {
  SPECIALE: 'Crédit spécial',
  FIXE: 'Crédit fixe',
  AIDE: 'Crédit aide',
}

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
// Statistiques du contrat — grille statique (même design que la liste des contrats)
const ContractStatsGrid = ({ contract, penalties = [], realRemainingAmount, totalPaidFromSchedule, totalAmountToRepay, actualSchedule = [], totalLosses = 0 }: { contract: CreditContract; penalties?: CreditPenalty[]; realRemainingAmount: number; totalPaidFromSchedule: number; totalAmountToRepay: number; actualSchedule?: Array<{ interest: number }>; totalLosses?: number }) => {
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

  // Même présentation compacte que le contrat Caisse imprévue, montants en FCFA.
  const fcfa = (value: number) => `${Math.round(value).toLocaleString('fr-FR')} FCFA`
  const startDate = contract.firstPaymentDate
    ? isWeeklyCredit(contract)
      ? getWeeklyCreditStartDate(contract.firstPaymentDate, contract.duration)
      : new Date(contract.firstPaymentDate)
    : null
  const endDate = getCreditContractEndDate(contract)
  const statsData: Array<{ title: string; value: string; subtitle?: string; tone?: 'accent' | 'danger' }> = [
    { title: 'Montant emprunté', value: fcfa(contract.amount) },
    {
      // Durée et période : la fiche n'affichait aucune date d'échéancier.
      title: 'Durée',
      value: formatCreditDuration(contract.duration, contract.durationUnit),
      subtitle: startDate && !Number.isNaN(startDate.getTime()) && endDate
        ? `du ${startDate.toLocaleDateString('fr-FR')} au ${endDate.toLocaleDateString('fr-FR')}`
        : undefined,
    },
    { title: 'Montant versé', value: fcfa(contract.amountPaid), tone: 'accent' },
    { title: 'Montant restant', value: fcfa(realRemainingAmount) },
    {
      title: 'Pourcentage remboursé',
      value: totalAmountToRepay > 0
        ? `${((totalPaidFromSchedule / totalAmountToRepay) * 100).toFixed(1)}%`
        : '0%',
      subtitle: totalAmountToRepay > 0
        ? `${Math.round(totalPaidFromSchedule).toLocaleString('fr-FR')} / ${Math.round(totalAmountToRepay).toLocaleString('fr-FR')} FCFA`
        : 'Aucun paiement enregistré',
    },
    {
      title: isSimpleCredit ? 'Intérêt unique' : 'Total intérêts',
      value: fcfa(totalInterest),
      subtitle: isSimpleCredit
        ? 'Appliqué une seule fois au démarrage'
        : `Somme des intérêts de l'échéancier`,
    },
    {
      title: 'Pénalités impayées',
      value: fcfa(unpaidPenaltiesTotal),
      subtitle: unpaidPenaltiesTotal > 0
        ? `${unpaidPenaltiesCount} pénalité${unpaidPenaltiesCount > 1 ? 's' : ''}`
        : 'Aucune pénalité impayée',
      tone: unpaidPenaltiesTotal > 0 ? 'danger' : undefined,
    },
    ...(totalLosses > 0
      ? [{
          title: 'Manque à gagner',
          value: fcfa(totalLosses),
          subtitle: contract.creditType === 'FIXE'
            ? 'Pertes après la durée contractuelle'
            : 'Manque à gagner en partie fixe',
          tone: 'danger' as const,
        }]
      : []),
  ]

  return (
    <div className={cn(
      'grid grid-cols-2 gap-3 rounded-xl bg-gray-50 p-3 sm:grid-cols-3 lg:grid-cols-4'
    )}>
      {statsData.map((stat) => (
        <div key={stat.title}>
          <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">{stat.title}</p>
          <p className={cn(
            'text-sm font-bold tabular-nums',
            stat.tone === 'accent' ? 'text-[#234D65]' : stat.tone === 'danger' ? 'text-red-600' : 'text-gray-900'
          )}>
            {stat.value}
          </p>
          {stat.subtitle && <p className="mt-0.5 text-[10px] text-gray-400">{stat.subtitle}</p>}
        </div>
      ))}
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

/** Nom de fichier normalisé pour un document lié à un contrat de crédit spécial. */
const creditDocFilename = (contract: CreditContract, label: string) => {
  const last = String(contract.clientLastName ?? '').toUpperCase().replace(/\s+/g, '_')
  const first = String(contract.clientFirstName ?? '').toUpperCase().replace(/\s+/g, '_')
  return `${last}_${first}_${label}.pdf`
}

/** Document en cours de consultation dans la modale d'aperçu. */
type ViewerDoc = { url?: string; filename: string; title: string; subtitle?: string }

export default function CreditContractDetail({
  contract,
  listPath = routes.admin.creditSpecialeContrats,
  contractDetailsBasePath = routes.admin.creditSpecialeContrats,
}: CreditContractDetailProps) {
  const router = useRouter()
  const { user: _user } = useAuth()
  const [activeTab, setActiveTab] = useState<'payments' | 'penalties' | 'history' | 'losses' | 'guarantor'>('payments')
  const isSimpleCredit = contract.creditType === 'FIXE' || contract.creditType === 'AIDE'
  // Crédit spécial court terme : une seule échéance, pas de partie fixe, de repos ni de rajout.
  const isWeekly = isWeeklyCredit(contract)
  const weeklyTotals = isWeekly ? computeWeeklyCreditTotals(contract.amount, contract.interestRate) : null
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
  const [viewerDoc, setViewerDoc] = useState<ViewerDoc | null>(null)
  const [isGeneratingGlobalFacturePdf, setIsGeneratingGlobalFacturePdf] = useState(false)
  const [isGeneratingLossHistoryPdf, setIsGeneratingLossHistoryPdf] = useState(false)
  const [isExportingLossHistoryExcel, setIsExportingLossHistoryExcel] = useState(false)
  const [isGeneratingGuarantorCommissionsPdf, setIsGeneratingGuarantorCommissionsPdf] = useState(false)
  const [isExportingGuarantorCommissionsExcel, setIsExportingGuarantorCommissionsExcel] = useState(false)
  const { uploadSignedContract, replaceSignedContract, validateFinalRepayment, generateQuittancePDF, uploadSignedQuittance, replaceSignedQuittance, closeContract } = useCreditContractMutations()

  // Ouvre la modale d'aperçu/téléchargement (mécanisme mobile unifié).
  const openCreditDocument = (contractArg: CreditContract, url: string | undefined | null, label: string, title: string) => {
    setViewerDoc({
      url: url ?? undefined,
      filename: creditDocFilename(contractArg, label),
      title,
      subtitle: `${contractArg.clientFirstName ?? ''} ${contractArg.clientLastName ?? ''}`.trim() || undefined,
    })
  }
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
  const [showContractInfo, setShowContractInfo] = useState(false)
  const [guarantorPaymentToDelete, setGuarantorPaymentToDelete] = useState<GuarantorPayment | null>(null)
  const deleteGuarantorPayment = useDeleteGuarantorPayment()
  const isSuperAdmin = useIsSuperAdmin()
  const { remove: removePayment } = useCreditPaymentMutations()
  const [paymentToDelete, setPaymentToDelete] = useState<{ payment: CreditPayment; month: number } | null>(null)
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

  const contractCycles = React.useMemo(
    () => getCreditContractCycles(contract),
    [contract]
  )
  const hasCreditAugmentation = contractCycles.length > 1
  const currentCycle = React.useMemo(
    () => contractCycles.at(-1),
    [contractCycles]
  )

  // Le détail du contrat travaille sur le cycle actif ; l’historique complet reste visible plus bas.
  const paymentsForSchedule = getCreditPaymentsForCurrentCycle(contract, payments)
  const specialHistory =
    contract.creditType === 'SPECIALE'
      ? buildCreditSpecialeHistory(contract, paymentsForSchedule, { projectUntilZero: true })
      : []
  const lastRecordedSpecialMonth =
    contract.creditType === 'SPECIALE'
      ? getCreditSpecialeLastRecordedMonth(contract, paymentsForSchedule)
      : 0
  const timelineHistoryRows = React.useMemo<CreditSpecialeTimelineMonth[]>(() => {
    if (contract.creditType === 'SPECIALE') {
      return buildCreditSpecialeTimelineHistory(contract, payments)
    }

    if (contract.creditType !== 'FIXE') {
      return []
    }

    const recordedPayments = payments.filter(
      (payment) =>
        payment.amount > 0 ||
        payment.comment?.includes('Paiement de 0 FCFA') ||
        (!payment.comment?.includes('Paiement de pénalités uniquement') && payment.amount === 0)
    )

    const currentCycleNumber = contractCycles.at(-1)?.cycleNumber ?? 1

    return contractCycles.flatMap((cycle) => {
      const cyclePayments = recordedPayments.filter(
        (payment) => getCreditPaymentCycleNumber(contract, payment) === cycle.cycleNumber
      )
      const lastRecordedMonthRaw = cyclePayments.length > 0
        ? Math.max(...cyclePayments.map((payment) => getCreditPaymentMonthNumber(contract, payment)))
        : 0
      const lastRecordedMonth = lastRecordedMonthRaw > 0
        ? lastRecordedMonthRaw
        : cycle.cycleNumber === currentCycleNumber
          ? 1
          : 0

      if (lastRecordedMonth <= 0) {
        return []
      }

      const hasCustomSchedule = !!cycle.customSchedule?.length
      const cycleTotal = customRound(cycle.totalAmount)
      const plannedPaymentByMonth = new Map<number, number>()
      const plannedDuration = hasCustomSchedule
        ? Math.max(cycle.duration, ...cycle.customSchedule!.map((entry, index) => entry.month || index + 1))
        : Math.max(1, cycle.duration)

      if (hasCustomSchedule) {
        cycle.customSchedule!.forEach((entry, index) => {
          const month = entry.month || index + 1
          plannedPaymentByMonth.set(month, Math.max(0, customRound(entry.amount)))
        })
      } else {
        const basePayment = Math.floor(cycleTotal / plannedDuration)
        let cumulativePlanned = 0
        for (let month = 1; month <= plannedDuration; month++) {
          const payment = month === plannedDuration ? Math.max(0, cycleTotal - cumulativePlanned) : basePayment
          plannedPaymentByMonth.set(month, payment)
          cumulativePlanned += payment
        }
      }

      const cyclePaymentTotalsByMonth = new Map<number, number>()
      for (const payment of cyclePayments) {
        const month = getCreditPaymentMonthNumber(contract, payment)
        cyclePaymentTotalsByMonth.set(month, (cyclePaymentTotalsByMonth.get(month) ?? 0) + payment.amount)
      }

      const cycleTitle =
        cycle.cycleNumber === 1
          ? 'Cycle initial'
          : 'Apres augmentation de credit - reprise a M1'

      const rows: CreditSpecialeTimelineMonth[] = []
      let capital = cycleTotal
      let nextDueAssigned = false

      for (let month = 1; month <= lastRecordedMonth; month++) {
        const date = addContractMonths(cycle.firstPaymentDate, month - 1)

        const amountDue = Math.max(0, customRound(capital))
        const expectedPayment = Math.min(
          amountDue,
          Math.max(0, plannedPaymentByMonth.get(month) ?? customRound(cycle.monthlyPaymentAmount))
        )
        const actualPayment = Math.max(0, cyclePaymentTotalsByMonth.get(month) ?? 0)
        const hasPaymentRecord = cyclePaymentTotalsByMonth.has(month)

        const nextCapitalActual = Math.max(0, customRound(amountDue - actualPayment))
        const nextCapitalProjected = Math.max(0, customRound(amountDue - expectedPayment))

        let status: CreditSpecialeTimelineMonth['status'] = 'FUTURE'
        if (hasPaymentRecord) {
          status = 'PAID'
        } else if (!nextDueAssigned) {
          status = 'DUE'
          nextDueAssigned = true
        }

        rows.push({
          month,
          logicalMonth: month,
          date,
          phase: 'FIXE',
          isRest: false,
          capitalStart: amountDue,
          commission: 0,
          interest: 0,
          amountDue,
          expectedPayment,
          actualPayment,
          hasPaymentRecord,
          nextCapitalActual,
          nextCapitalProjected,
          status,
          cycleNumber: cycle.cycleNumber,
          cycleMonth: month,
          cycleType: cycle.type,
          cycleTitle,
          cycleStartedAt: cycle.startedAt,
          key: `cycle-${cycle.cycleNumber}-month-${month}`,
        })

        capital = hasPaymentRecord ? nextCapitalActual : amountDue
      }

      return rows
    })
  }, [contract, contract.creditType, contractCycles, payments])

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
  const isContractRepaying = contract.status === 'ACTIVE' || contract.status === 'PARTIAL'
  // Un seul rajout autorisé, masqué si déjà fait ou contrat soldé / clos.
  const canExtendContract =
    (contract.creditType === 'FIXE' || contract.creditType === 'SPECIALE') &&
    isContractRepaying &&
    !contract.rajoutEffectue &&
    !isWeekly
  const canSwitchToFixed = contract.creditType === 'SPECIALE' && isContractRepaying && !hasEnteredFixedPhase && !isWeekly
  const hasRajoutNotice = !!contract.rajoutEffectue && (contract.initialAmount != null || contract.rajoutAmount != null)
  const hasManualFixedNotice = fixedTransitionMeta.mode === 'MANUAL' && !!fixedTransitionMeta.at
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
  if (timelineHistoryRows.length > 0) {
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
        const date = addContractMonths(firstDate, (month - 1))

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
        const date = addContractMonths(firstDate, monthIndex)

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
  // Crédit simple ou en semaines : tout versement compte, même sur une échéance pas encore soldée.
  const totalPaidFromSchedule = isSimpleCredit || isWeekly
    ? paymentsForSchedule
        .filter((p) => p.amount > 0 || !p.comment?.includes('Paiement de pénalités uniquement'))
        .reduce((sum, p) => sum + p.amount, 0)
    : actualSchedule
        .filter((item) => item.status === 'PAID')
        .reduce((sum, item) => sum + (item.paidAmount || item.payment || 0), 0)

  // Le montant total à rembourser
  const totalAmountToRepay = isSimpleCredit
    ? customRound(contract.totalAmount)
    : weeklyTotals
      ? weeklyTotals.totalAmount
      : actualSchedule.reduce((sum, item) => sum + item.payment, 0)

  // Calculer le montant restant
  const realRemainingAmount = isSimpleCredit || isWeekly
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
  // Toutes les commissions du contrat, tous cycles confondus : un rajout ouvre
  // un nouveau cycle qui repart à M1 et rémunère à nouveau le garant.
  const guarantorCommissionRows = React.useMemo(() => {
    if (
      contract.creditType !== 'SPECIALE' ||
      !contract.guarantorId ||
      !contract.guarantorIsMember ||
      (contract.guarantorRemunerationPercentage ?? 0) <= 0
    ) {
      return []
    }

    return buildGuarantorCommissionRows(contract, guarantorRemunerations, payments)
  }, [contract, guarantorRemunerations, payments])
  const guarantorCommissionBalance = React.useMemo(
    () => buildGuarantorCommissionBalance(guarantorCommissionRows, guarantorPayments),
    [guarantorCommissionRows, guarantorPayments]
  )
  const totalGuarantorCommissions = guarantorCommissionBalance.totalEarned
  const guarantorCommissionCycles = React.useMemo(() => {
    const byCycle = new Map<number, typeof guarantorCommissionRows>()
    for (const row of guarantorCommissionRows) {
      byCycle.set(row.cycleNumber, [...(byCycle.get(row.cycleNumber) ?? []), row])
    }
    return [...byCycle.entries()].map(([cycleNumber, rows]) => {
      const cycle = contractCycles.find((entry) => entry.cycleNumber === cycleNumber)
      return {
        cycleNumber,
        title: getGuarantorCycleTitle(cycleNumber),
        startedAt: cycle?.startedAt,
        startCapital: cycle?.amount,
        carriedCapital: cycle?.carriedCapital,
        additionalAmount: cycle?.additionalAmount,
        rows,
        total: rows.reduce((sum, row) => sum + row.commissionAmount, 0),
      }
    })
  }, [contractCycles, guarantorCommissionRows])

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
      console.log('Total payé:', paymentsForSchedule.filter(p => p.amount > 0 || !p.comment?.includes('Pénalités')).reduce((sum, p) => sum + p.amount, 0))
    }
  }, [dueItems, nextDueIndex, paymentsForSchedule])

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
          'Capital restant en début de mois (FCFA)': row.capitalAtStartOfMonth,
          'Pourcentage de commission': `${row.commissionPercentage}%`,
          'Somme due (FCFA)': row.commissionAmount,
        })),
        {
          'Mois': 'TOTAL DES COMMISSIONS',
          'Capital restant en début de mois (FCFA)': '',
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
          remainingAmount: row.capitalAtStartOfMonth,
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
    const activeCycleNumber = currentCycle?.cycleNumber ?? 1
    const paymentsForThisMonth = paymentsForSchedule.filter(
      (payment) =>
        getCreditPaymentMonthNumber(contract, payment) === dueItem.month &&
        getCreditPaymentCycleNumber(contract, payment) === activeCycleNumber
    )

    if (paymentsForThisMonth.length > 0) {
      const sortedPayments = [...paymentsForThisMonth].sort((a, b) => {
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 lg:p-8 overflow-x-hidden">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* En-tête avec bouton retour — même disposition que le contrat Caisse imprévue */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              variant="outline"
              onClick={() => backOr(router, listPath)}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour
            </Button>
            <EmergencyContact emergencyContact={contract.emergencyContact} />
            {(canExtendContract || canSwitchToFixed) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    Actions
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {canExtendContract && (
                    <DropdownMenuItem onClick={() => setShowExtensionModal(true)}>
                      <Plus className="h-4 w-4" />
                      Augmenter le crédit
                    </DropdownMenuItem>
                  )}
                  {canSwitchToFixed && (
                    <DropdownMenuItem onClick={() => setShowSwitchToFixedModal(true)}>
                      <Lock className="h-4 w-4" />
                      Basculer en fixe
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] text-white text-lg px-4 py-2">
              {CREDIT_TYPE_LABELS[contract.creditType]}
            </Badge>
            <Badge className={cn('text-lg px-4 py-2', statusConfig.bgColor, statusConfig.color)}>
              {statusConfig.label}
            </Badge>
          </div>
        </div>

        {/* Un seul bandeau pour les événements du contrat (rajout, bascule en fixe, contrats liés) */}
        {(hasRajoutNotice || hasManualFixedNotice || parentContract || childContract) && (
          <Card className="border-0 shadow-md">
            <CardContent className="p-4 space-y-2 text-sm text-slate-700">
              {hasRajoutNotice && (
                <p className="flex items-start gap-2">
                  <History className="h-4 w-4 mt-0.5 shrink-0 text-[#234D65]" />
                  <span>
                    <b>Rajout</b>
                    {contract.rajoutAmount != null && contract.rajoutAmount > 0 && <> de <b>+{contract.rajoutAmount.toLocaleString('fr-FR')} FCFA</b></>}
                    {contract.extendedAt && <> le {format(new Date(contract.extendedAt), 'dd/MM/yyyy', { locale: fr })}</>}
                    {' '}: montant initial {(contract.initialAmount ?? (contract.amount - (contract.rajoutAmount ?? 0))).toLocaleString('fr-FR')} FCFA,
                    nouveau cycle {contract.amount.toLocaleString('fr-FR')} FCFA. L&apos;échéancier repart à M1 ; les versements d&apos;avant restent dans l&apos;historique.
                  </span>
                </p>
              )}
              {hasManualFixedNotice && fixedTransitionMeta.at && (
                <p className="flex items-start gap-2">
                  <Lock className="h-4 w-4 mt-0.5 shrink-0 text-[#234D65]" />
                  <span>
                    <b>Basculé en partie fixe</b> le {format(new Date(fixedTransitionMeta.at), 'dd/MM/yyyy', { locale: fr })}
                    {' '}par {fixedTransitionAdmin ? `${fixedTransitionAdmin.firstName} ${fixedTransitionAdmin.lastName}`.trim() : (fixedTransitionMeta.by || '—')}
                    {fixedTransitionMeta.startMonth ? <>, à partir de M{fixedTransitionMeta.startMonth}</> : null}
                    {fixedTransitionMeta.reason ? <> — {fixedTransitionMeta.reason}</> : null}
                  </span>
                </p>
              )}
              {(parentContract || childContract) && (
                <div className="flex flex-wrap items-center gap-2">
                  <Link2 className="h-4 w-4 shrink-0 text-[#234D65]" />
                  <b>Contrats liés :</b>
                  {parentContract && (
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-[#234D65]"
                      onClick={() => router.push(`${contractDetailsBasePath.replace(/\/$/, '')}/${parentContract.id}`)}
                    >
                      Contrat parent ({parentContract.status})
                    </Button>
                  )}
                  {childContract && (
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-[#234D65]"
                      onClick={() => router.push(`${contractDetailsBasePath.replace(/\/$/, '')}/${childContract.id}`)}
                    >
                      Nouveau contrat ({childContract.status === 'DISCHARGED' ? 'terminé' : childContract.status})
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Titre principal */}
        <Card className="border-0 shadow-xl bg-gradient-to-r from-[#234D65] to-[#2c5a73] overflow-hidden">
          <CardHeader className="overflow-hidden">
            <CardTitle className="text-xl sm:text-2xl lg:text-3xl font-black text-white flex items-center gap-3 break-words">
              <User className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 shrink-0" />
              <span className="break-words">{contract.clientFirstName} {contract.clientLastName}</span>
            </CardTitle>
            <div className="space-y-1 text-blue-100 break-words">
              <p className="text-sm sm:text-base lg:text-lg break-words">
                Contrat <span className="font-mono text-xs sm:text-sm break-all">#{contract.id}</span>
              </p>
              <p className="text-sm break-words">
                Taux {contract.interestRate}% · {formatCreditDuration(contract.duration, contract.durationUnit)} ·{' '}
                {isWeekly ? 'Montant dû' : 'Mensualité'} {contract.monthlyPaymentAmount.toLocaleString('fr-FR')} FCFA
              </p>
              <button
                type="button"
                onClick={() => setShowContractInfo((value) => !value)}
                className="inline-flex items-center gap-1 text-xs text-blue-200 hover:text-white"
                aria-expanded={showContractInfo}
              >
                {showContractInfo ? 'Masquer les détails' : 'Plus de détails'}
                <ChevronDown className={cn('h-3 w-3 transition-transform', showContractInfo && 'rotate-180')} />
              </button>
              {showContractInfo && (
                <div className="space-y-1 pt-1 text-xs">
                  <p>Contacts client : <span className="font-medium">{contract.clientContacts.join(', ') || '—'}</span></p>
                  <p>
                    Premier versement : <span className="font-medium">{formatDate(contract.firstPaymentDate)}</span>
                    {contract.nextDueAt ? <> · Prochaine échéance : <span className="font-medium">{formatDate(contract.nextDueAt)}</span></> : null}
                    {getCreditContractEndDate(contract) ? <> · Fin prévue : <span className="font-medium">{formatDate(getCreditContractEndDate(contract)!)}</span></> : null}
                  </p>
                  {contract.guarantorId && (
                    <p>
                      Garant : <span className="font-medium">{contract.guarantorFirstName} {contract.guarantorLastName}</span>
                      {contract.guarantorRelation ? <> · Relation : <span className="font-medium">{contract.guarantorRelation}</span></> : null}
                    </p>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Statistiques */}
        <div>
          <ContractStatsGrid
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
        <Card className="border-0 shadow-md">
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-700">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-[#234D65]" />
                <span>
                  Échéances payées&nbsp;: <b>{actualSchedule.filter((item) => item.status === 'PAID').length}</b> / {actualSchedule.filter((item) => !item.isRest).length || '—'}
                </span>
              </div>
              <span className="text-slate-500">{progressPercentage.toFixed(1)}% remboursé</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#234D65] to-[#2c5a73] transition-all duration-300"
                style={{ width: `${Math.min(progressPercentage, 100)}%` }}
              />
            </div>
            <div className="text-sm text-slate-700">
              Montant payé&nbsp;: <b>{contract.amountPaid.toLocaleString('fr-FR')} FCFA</b> / {contract.totalAmount.toLocaleString('fr-FR')} FCFA
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

                  // Les échéances se paient dans l'ordre : toutes les précédentes doivent être payées ou en repos.
                  const allPreviousPaid = actualSchedule
                    .slice(0, index)
                    .every((previous) => previous.status === 'PAID' || previous.status === 'REST')
                  const isPayable = item.status === 'DUE' && allPreviousPaid
                  const isDisabled = !canMakePayments || !isPayable

                  const isRest = item.status === 'REST' || !!item.isRest
                  // Pour l'échéancier après rajout, seuls les paiements >= extendedAt comptent
                  const expectedPayment = dueItems.find((due) => due.month === item.month)?.payment
                    ?? Math.min(contract.monthlyPaymentAmount, item.principal)
                  // Crédit en semaines : un versement partiel reste affiché sur l'échéance encore due,
                  // et la progression se mesure sur le total dû.
                  const paidAmount = item.status === 'PAID' || isWeekly ? (item.paidAmount ?? 0) : 0
                  const progressTarget = weeklyTotals ? weeklyTotals.totalAmount : expectedPayment
                  const isPaymentSufficient = paidAmount >= progressTarget
                  const percentage = progressTarget > 0 ? Math.min(100, (paidAmount / progressTarget) * 100) : 0
                  const paymentForCard = item.status === 'PAID' ? getPaymentForScheduleIndex(index) : null
                  // Seul le dernier mois payé se supprime : les mois suivants dépendent du capital
                  // de celui-ci. Sur un contrat encore en cours, les mois plus anciens montrent le
                  // bouton grisé avec l'explication, plutôt que de le masquer sans raison.
                  const deletionBlocker = isSuperAdmin && paymentForCard
                    ? getCreditPaymentDeletionBlocker(contract, payments, paymentForCard)
                    : null
                  const canDeletePayment = isSuperAdmin && !!paymentForCard && deletionBlocker === null
                  const showBlockedDeletion =
                    !!deletionBlocker && DELETABLE_PAYMENT_CONTRACT_STATUSES.includes(contract.status)

                  const statusConfig = item.status === 'PAID'
                    ? paidAmount === 0
                      ? { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', icon: XCircle, label: 'Non payé' }
                      : isPaymentSufficient
                        ? { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', icon: CheckCircle, label: 'Payé' }
                        : { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', icon: AlertCircle, label: 'Payé (insuffisant)' }
                    : item.status === 'DUE'
                    ? { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', icon: Clock, label: 'À payer' }
                    : isRest
                    ? { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: Calendar, label: 'Mois de repos' }
                    : { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', icon: XCircle, label: 'À venir' }
                  const StatusIcon = statusConfig.icon

                  return (
                    <Card
                      key={index}
                      className={cn(
                        'transition-all duration-300 border-2',
                        item.status === 'PAID'
                          ? paidAmount === 0
                            ? 'border-gray-200 bg-white hover:shadow-lg hover:-translate-y-1'
                            : isPaymentSufficient
                              ? 'border-green-200 bg-green-50/50 hover:shadow-lg hover:-translate-y-1'
                              : 'border-red-200 bg-red-50/50 hover:shadow-lg hover:-translate-y-1'
                          : isRest
                          ? 'border-blue-200 bg-blue-50/40'
                          : item.status === 'DUE' && !isDisabled
                          ? 'border-gray-200 bg-white cursor-pointer hover:border-[#224D62] hover:shadow-lg hover:-translate-y-1'
                          : 'border-gray-200 bg-white'
                      )}
                      onClick={() => {
                        // Comme en Caisse imprévue : un clic sur l'échéance à payer ouvre le versement.
                        if (item.status !== 'DUE' || isDisabled) return
                        setSelectedDueIndex(index)
                        setShowPaymentModal(true)
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className={cn(
                            'rounded-lg px-3 py-1 text-sm font-bold text-white',
                            isRest ? 'bg-blue-600' : 'bg-[#224D62]'
                          )}>
                            {isRest ? `Mois ${item.month} – Repos` : isWeekly ? 'Échéance unique' : `Échéance ${item.month}`}
                          </div>
                          <Badge className={`${statusConfig.bg} ${statusConfig.text} ${statusConfig.border} border`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig.label}
                          </Badge>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-sm pb-2 border-b border-gray-200">
                            <span className="text-gray-600 flex items-center gap-1">
                              <CalendarDays className="h-3 w-3" />
                              Date d&apos;échéance:
                            </span>
                            <span className="font-semibold text-gray-900">
                              {format(new Date(item.date), 'dd/MM/yyyy', { locale: fr })}
                            </span>
                          </div>

                          {isRest ? (
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
                              <div className="flex items-center justify-between text-sm pt-1 border-t border-gray-200">
                                <span className="text-gray-600">Capital après repos:</span>
                                <span className="font-semibold text-gray-900">{item.remaining.toLocaleString('fr-FR')} FCFA</span>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Montant à payer:</span>
                                <span className="font-semibold text-gray-900">
                                  {expectedPayment.toLocaleString('fr-FR')} FCFA
                                </span>
                              </div>

                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Montant versé:</span>
                                <span className={cn(
                                  'font-semibold',
                                  item.status !== 'PAID' ? 'text-gray-400' : isPaymentSufficient ? 'text-green-600' : 'text-red-600'
                                )}>
                                  {paidAmount.toLocaleString('fr-FR')} FCFA
                                </span>
                              </div>

                              <div className="flex items-center justify-between text-sm pt-1 border-t border-gray-200">
                                <span className="text-gray-600">Montant global:</span>
                                <span className="font-semibold text-gray-900">{(weeklyTotals ? weeklyTotals.totalAmount : item.principal).toLocaleString('fr-FR')} FCFA</span>
                              </div>
                              {!isSimpleCredit && (
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-gray-600">Intérêts:</span>
                                  <span className="font-semibold text-gray-900">{item.interest.toLocaleString('fr-FR')} FCFA</span>
                                </div>
                              )}

                              {item.status === 'PAID' && item.paymentDate && (
                                <div className="space-y-1 pt-1 border-t border-gray-200">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-600">Payé le:</span>
                                    <span className="font-semibold text-green-600">{format(new Date(item.paymentDate), 'dd/MM/yyyy', { locale: fr })}</span>
                                  </div>
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-600">Payé à:</span>
                                    <span className="font-semibold text-green-600">
                                      {(item.paymentTime != null && item.paymentTime !== '') ? item.paymentTime : new Date(item.paymentDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  {paymentForCard?.mode && (
                                    <div className="flex items-start justify-between gap-2 text-xs">
                                      <span className="shrink-0 text-gray-600">Moyen:</span>
                                      <span className="text-right font-semibold text-gray-900">
                                        {CREDIT_PAYMENT_MODE_LABELS[paymentForCard.mode] ?? paymentForCard.mode}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}

                              {(paymentForCard?.modificationReason || paymentForCard?.updatedAt) && (() => {
                                const u = paymentForCard.updatedAt
                                const modDate = u instanceof Date ? u : (typeof (u as { toDate?: () => Date })?.toDate === 'function' ? (u as { toDate: () => Date }).toDate() : u ? new Date(u as string | number) : null)
                                return (
                                  <div className="pt-2 mt-2 border-t border-gray-100 space-y-1 text-xs text-gray-500">
                                    {modDate && !isNaN(modDate.getTime()) && (
                                      <div className="flex items-center justify-between">
                                        <span>Modifié le:</span>
                                        <span>{modDate.toLocaleDateString('fr-FR')} à {modDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                                      </div>
                                    )}
                                    {paymentForCard.modificationReason && (
                                      <div>
                                        <span className="font-medium">Motif:</span>
                                        <span className="ml-1">{paymentForCard.modificationReason}</span>
                                      </div>
                                    )}
                                  </div>
                                )
                              })()}

                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                  <span>Progression</span>
                                  <span>{percentage.toFixed(1)}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className={cn(
                                      'h-2 rounded-full transition-all duration-300',
                                      percentage >= 100 ? 'bg-green-500' : percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                    )}
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                            </>
                          )}

                          {item.status === 'DUE' &&
                            !isDisabled &&
                            contract.creditType === 'SPECIALE' &&
                            !isWeekly &&
                            index === nextDueIndex &&
                            specialHistoryByMonth.get(item.month)?.phase !== 'FIXE' && (
                            <div className="pt-3 border-t border-gray-200" onClick={(e) => e.stopPropagation()}>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
                                onClick={() => {
                                  setSelectedRestMonth(item.month)
                                  setShowRestMonthModal(true)
                                }}
                              >
                                <Calendar className="h-3 w-3 mr-1" />
                                Mois de repos
                              </Button>
                            </div>
                          )}

                          {item.status === 'PAID' && (
                            <div className="pt-3 border-t border-gray-200 flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="w-full text-[#234D65] border-[#234D65] hover:bg-[#234D65]/10"
                                onClick={() => {
                                  setSelectedDueIndexForReceipt(index)
                                  setShowReceiptModal(true)
                                }}
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                Voir la facture
                              </Button>
                              {!['DISCHARGED', 'CLOSED'].includes(contract.status) && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="w-full border-amber-300 text-amber-700 hover:bg-amber-50"
                                  onClick={() => {
                                    if (!paymentForCard) {
                                      toast.error('Impossible de retrouver le versement pour cette échéance')
                                      return
                                    }
                                    setPaymentToEdit(paymentForCard)
                                    setShowPaymentModal(true)
                                  }}
                                >
                                  <Pencil className="h-3 w-3 mr-1" />
                                  Modifier
                                </Button>
                              )}
                              {canDeletePayment && paymentForCard && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="w-full border-red-300 text-red-700 hover:bg-red-50"
                                  disabled={removePayment.isPending}
                                  onClick={() => setPaymentToDelete({ payment: paymentForCard, month: item.month })}
                                >
                                  <Trash2 className="h-3 w-3 mr-1" />
                                  Supprimer
                                </Button>
                              )}
                              {showBlockedDeletion && (
                                <div className="space-y-1">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="w-full border-gray-200 text-gray-400"
                                    disabled
                                    title={deletionBlocker ?? undefined}
                                  >
                                    <Trash2 className="h-3 w-3 mr-1" />
                                    Supprimer
                                  </Button>
                                  <p className="text-center text-[11px] text-gray-500">
                                    Seul le dernier mois enregistré peut être supprimé : supprimez d&apos;abord les suivants.
                                  </p>
                                </div>
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
                      <strong>ℹ️ Information :</strong> Cliquez sur l&apos;échéance à payer pour enregistrer un versement. Les échéances se paient dans l&apos;ordre.
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
                  {timelineHistoryRows.length > 0 && (
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
                                    {hasCreditAugmentation && (
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
                      <div className="mb-4 space-y-2 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                        <p>
                          <strong>Garant :</strong> {contract.guarantorFirstName} {contract.guarantorLastName}
                          {' · '}
                          <strong>Taux :</strong> {contract.guarantorRemunerationPercentage}%
                        </p>
                        <p>
                          Chaque mois où le client rembourse, le garant gagne{' '}
                          <strong>{contract.guarantorRemunerationPercentage}% du capital qui restait dû au début du mois</strong>{' '}
                          (avant les intérêts du mois). Plus la dette baisse, plus la commission baisse.
                        </p>
                        <p>
                          {isWeekly
                            ? 'Crédit en semaines : la commission est due une seule fois, sur le montant du crédit, au premier versement.'
                            : 'La commission court sur les 7 mois de la partie spéciale (hors mois de repos) et s’arrête au passage en partie fixe.'}
                          Un rajout ouvre un nouveau cycle qui repart à M1 : le garant regagne alors une commission sur le nouveau capital.
                          Elle n&apos;est pas facturée au client ; c&apos;est l&apos;association qui la verse.
                        </p>
                        <p className="text-xs text-blue-700">
                          Une ligne n&apos;apparaît qu&apos;une fois le mois remboursé : un mois impayé ne génère pas encore de commission.
                        </p>
                      </div>
                    </div>

                    {!isLoadingRemunerations && !isGuarantorRemunerationsError && !isLoadingGuarantorPayments && !isGuarantorPaymentsError && (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="rounded-lg border bg-gray-50 p-4">
                          <p className="text-xs text-gray-500">Commissions gagnées</p>
                          <p className="mt-1 text-xl font-bold text-[#234D65]">
                            {guarantorCommissionBalance.totalEarned.toLocaleString('fr-FR')} FCFA
                          </p>
                        </div>
                        <div className="rounded-lg border bg-gray-50 p-4">
                          <p className="text-xs text-gray-500">Déjà versé au garant</p>
                          <p className="mt-1 text-xl font-bold text-emerald-700">
                            {guarantorCommissionBalance.totalPaid.toLocaleString('fr-FR')} FCFA
                          </p>
                        </div>
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                          <p className="text-xs text-amber-700">Reste à verser</p>
                          <p className="mt-1 text-xl font-bold text-amber-800">
                            {guarantorCommissionBalance.remaining.toLocaleString('fr-FR')} FCFA
                          </p>
                        </div>
                      </div>
                    )}

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
                        {guarantorCommissionCycles.map((cycle) => (
                          <div key={cycle.cycleNumber} className="space-y-2">
                            {contractCycles.length > 1 && (
                              <div className="flex flex-wrap items-end justify-between gap-2 rounded-lg bg-[#234D65]/5 px-3 py-2">
                                <div>
                                  <h4 className="text-sm font-semibold text-[#234D65]">{cycle.title}</h4>
                                  <p className="text-xs text-gray-600">
                                    {cycle.cycleNumber > 1 && cycle.startedAt
                                      ? `Démarré le ${format(cycle.startedAt, 'dd/MM/yyyy')} · les mois repartent à M1 · `
                                      : ''}
                                    {cycle.startCapital !== undefined && (
                                      <>Capital de départ : {cycle.startCapital.toLocaleString('fr-FR')} FCFA</>
                                    )}
                                    {cycle.carriedCapital !== undefined && cycle.additionalAmount !== undefined && (
                                      <> (reste reporté {cycle.carriedCapital.toLocaleString('fr-FR')} + rajout {cycle.additionalAmount.toLocaleString('fr-FR')})</>
                                    )}
                                  </p>
                                </div>
                                <span className="text-sm text-gray-600">
                                  Sous-total : <strong>{cycle.total.toLocaleString('fr-FR')} FCFA</strong>
                                </span>
                              </div>
                            )}
                            <div className="border rounded-lg overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Mois</TableHead>
                                    <TableHead>Capital restant en début de mois</TableHead>
                                    <TableHead className="text-right">Taux</TableHead>
                                    <TableHead className="text-right">Commission</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {cycle.rows.map((row) => (
                                    <TableRow key={row.id}>
                                      <TableCell>
                                        <span className="font-medium">M{row.month}</span>
                                        {row.dueDate && (
                                          <span className="ml-2 text-xs capitalize text-gray-500">
                                            {formatGuarantorCommissionMonth(row.dueDate)}
                                          </span>
                                        )}
                                      </TableCell>
                                      <TableCell>{row.capitalAtStartOfMonth.toLocaleString('fr-FR')} FCFA</TableCell>
                                      <TableCell className="text-right">{row.commissionPercentage}%</TableCell>
                                      <TableCell className="text-right font-semibold">{row.commissionAmount.toLocaleString('fr-FR')} FCFA</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                      {/* Paiement au garant */}
                      <div className="border-t pt-6 mt-6">
                        <h4 className="font-semibold mb-1">Paiement au garant</h4>
                        {hasEnteredFixedPhase && (
                          <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                            <AlertCircle className="mt-0.5 h-5 w-5 text-amber-600" />
                            <p className="text-sm text-amber-800">
                              Le cycle en cours est passé en partie fixe : le garant ne gagne plus de nouvelle commission sur ce cycle.
                              Les commissions déjà gagnées restent dues et peuvent être versées.
                            </p>
                          </div>
                        )}
                        {guarantorCommissionBalance.remaining > 0 ? (
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
                        ) : !isLoadingRemunerations && !isLoadingGuarantorPayments ? (
                          <p className="text-sm text-gray-600 mb-3">
                            Aucune commission en attente de versement.
                          </p>
                        ) : null}
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
                                    <TableHead className="w-12"><span className="sr-only">Actions</span></TableHead>
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
                                      <TableCell>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                                          aria-label={`Supprimer le versement de ${gp.amount.toLocaleString('fr-FR')} FCFA`}
                                          onClick={() => setGuarantorPaymentToDelete(gp)}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
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
                            Le garant n'est pas un membre de l'association. Seuls les garants qui sont des membres de l'association peuvent recevoir une commission.
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
                  Générer le procès-verbal de liquidation
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
                      ? () => openCreditDocument(contract, currentCycleDocuments?.contractUrl || contract.contractUrl, 'CONTRAT', 'Contrat')
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
                      onClick={() => openCreditDocument(contract, currentCycleDocuments?.signedContractUrl || contract.signedContractUrl, 'CONTRAT_SIGNE', 'Contrat signé')}
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
                                  ? () => openCreditDocument(contract, cycleDocument.contractUrl, `CONTRAT_CYCLE_${cycleDocument.cycleNumber}`, `Contrat — cycle ${cycleDocument.cycleNumber}`)
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
                              onClick={() => openCreditDocument(contract, cycleDocument.signedContractUrl, `CONTRAT_SIGNE_CYCLE_${cycleDocument.cycleNumber}`, `Contrat signé — cycle ${cycleDocument.cycleNumber}`)}
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
                    onClick={() => openCreditDocument(contract, contract.signedQuittanceUrl, 'QUITTANCE_SIGNEE', 'Quittance signée')}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Quittance signée
                  </Button>
                )}
                {contract.dischargeUrl && (
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => openCreditDocument(contract, contract.dischargeUrl, 'DECHARGE', 'Décharge')}
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
        defaultAmount={
          paymentToEdit
            ? paymentToEdit.amount
            : isWeekly
              // Complément éventuel : on propose le reste à payer, pas ce qui a déjà été versé.
              ? realRemainingAmount
              : (selectedDueIndex !== null ? actualSchedule[selectedDueIndex]?.payment : contract.monthlyPaymentAmount)
        }
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
        remainingAmount={guarantorCommissionBalance.remaining}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['guarantorPayments', 'creditId', contract.id] })
        }}
      />
      <Modal
        open={!!paymentToDelete}
        onOpenChange={(open) => {
          if (!open && !removePayment.isPending) setPaymentToDelete(null)
        }}
        size="sm"
        icon={Trash2}
        tone="destructive"
        title={paymentToDelete ? `Supprimer le paiement de l'échéance M${paymentToDelete.month}` : 'Supprimer le paiement'}
        footer={
          <>
            <Button
              variant="outline"
              disabled={removePayment.isPending}
              onClick={() => setPaymentToDelete(null)}
            >
              Annuler
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={removePayment.isPending}
              onClick={async () => {
                if (!paymentToDelete) return
                try {
                  await removePayment.mutateAsync({
                    paymentId: paymentToDelete.payment.id,
                    creditId: contract.id,
                    month: paymentToDelete.month,
                    amount: paymentToDelete.payment.amount,
                  })
                  setPaymentToDelete(null)
                } catch {
                  // Le toast d'erreur est affiché par le hook ; la modale reste ouverte.
                }
              }}
            >
              {removePayment.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Supprimer le paiement
            </Button>
          </>
        }
      >
        {paymentToDelete && (
          <div className="space-y-2 text-sm text-gray-700">
            <p>
              Paiement de <strong>{paymentToDelete.payment.amount.toLocaleString('fr-FR')} FCFA</strong> du{' '}
              {format(new Date(paymentToDelete.payment.paymentDate), 'dd/MM/yyyy', { locale: fr })}.
              L&apos;échéance M{paymentToDelete.month} redeviendra à payer.
            </p>
            <ul className="list-disc space-y-1 pl-5 text-gray-600">
              <li>Le reste dû et la prochaine échéance du contrat sont recalculés.</li>
              <li>Les pénalités réglées avec ce paiement redeviennent dues ; la pénalité de retard de ce mois, si elle est impayée, est retirée.</li>
              <li>La commission du garant gagnée sur ce mois est retirée.</li>
            </ul>
            <p className="font-medium text-red-700">Cette action est irréversible.</p>
          </div>
        )}
      </Modal>
      <Modal
        open={!!guarantorPaymentToDelete}
        onOpenChange={(open) => {
          if (!open && !deleteGuarantorPayment.isPending) setGuarantorPaymentToDelete(null)
        }}
        size="sm"
        icon={Trash2}
        tone="destructive"
        title="Supprimer ce versement au garant"
        footer={
          <>
            <Button
              variant="outline"
              disabled={deleteGuarantorPayment.isPending}
              onClick={() => setGuarantorPaymentToDelete(null)}
            >
              Annuler
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleteGuarantorPayment.isPending}
              onClick={async () => {
                if (!guarantorPaymentToDelete) return
                try {
                  await deleteGuarantorPayment.mutateAsync({
                    paymentId: guarantorPaymentToDelete.id,
                    creditId: contract.id,
                  })
                  setGuarantorPaymentToDelete(null)
                } catch {
                  // Le toast d'erreur est affiché par le hook ; la modale reste ouverte.
                }
              }}
            >
              {deleteGuarantorPayment.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Supprimer le versement
            </Button>
          </>
        }
      >
        {guarantorPaymentToDelete && (
          <p className="text-sm text-gray-700">
            Versement de <strong>{guarantorPaymentToDelete.amount.toLocaleString('fr-FR')} FCFA</strong> du{' '}
            {format(new Date(guarantorPaymentToDelete.paymentDate), 'dd/MM/yyyy', { locale: fr })}. Le montant sera
            retiré du « déjà versé » et ajouté au reste à verser au garant. Le justificatif est aussi supprimé.
            Cette action est irréversible.
          </p>
        )}
      </Modal>
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
        <ModalContent size="sm">
          <ModalHeader
            icon={Upload}
            title="Uploader le contrat signé"
            description={
              isUploadActivationFlow
                ? 'Téléversez le contrat signé par le client. Le contrat sera automatiquement activé après l\'upload.'
                : 'Téléversez le nouveau contrat signé par le client après augmentation du crédit.'
            }
          />

          <ModalBody>
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
          </ModalBody>

          <ModalFooter>
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
          </ModalFooter>
        </ModalContent>
      </Dialog>

      {/* Modal de remplacement du contrat signé */}
      <Dialog open={showReplaceContractModal} onOpenChange={setShowReplaceContractModal}>
        <ModalContent size="sm">
          <ModalHeader
            icon={FileText}
            title="Modifier le contrat signé"
            description="Le fichier précédent sera remplacé par le nouveau PDF. Le statut du contrat ne change pas."
          />

          <ModalBody>
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
          </ModalBody>

          <ModalFooter>
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
          </ModalFooter>
        </ModalContent>
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
      <DocumentViewerModal
        isOpen={!!viewerDoc}
        onClose={() => setViewerDoc(null)}
        url={viewerDoc?.url}
        filename={viewerDoc?.filename ?? 'document.pdf'}
        title={viewerDoc?.title ?? 'Document'}
        subtitle={viewerDoc?.subtitle}
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
