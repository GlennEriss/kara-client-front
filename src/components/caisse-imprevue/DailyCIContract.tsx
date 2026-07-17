'use client'

import { useIsSuperAdmin } from '@/hooks/useIsSuperAdmin'
import { backOr } from '@/lib/backNavigation'
import EmergencyContact from '@/components/contract/standard/EmergencyContact'
import ContractCIMemberInfoDialog from '@/components/caisse-imprevue/ContractCIMemberInfoDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import routes from '@/constantes/routes'
import { listRefundsCI, updateRefundCI } from '@/db/caisse/refunds.db'
import { useActiveSupport, useCheckEligibilityForSupport, useContractPaymentStats, useCreateVersement, useDeleteVersement, usePaymentsCI, useSupportHistory, useUpdateVersement } from '@/hooks/caisse-imprevue'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { requestEarlyRefund, requestFinalRefund } from '@/services/caisse/mutations'
import { ContractCI, PaymentCI, VersementCI } from '@/types/types'
import { calculateMonthIndex, getMonthPeriod } from '@/utils/caisse-imprevue-utils'
import { getContractStatusConfig } from '@/utils/contract-status'
import { useDocumentViewer } from '@/components/documents/DocumentViewerProvider'
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
    Eye,
    FileSignature,
    HandCoins,
    History,
    Pencil,
    RefreshCw,
    TrendingUp,
    XCircle,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import React, { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import EarlyRefundCIModal from './EarlyRefundCIModal'
import EditContractCategoryCIModal from './EditContractCategoryCIModal'
import FinalRefundCIModal from './FinalRefundCIModal'
import MarkAsPaidRefundCIModal from './MarkAsPaidRefundCIModal'
import ValidateRefundCIModal from './ValidateRefundCIModal'
import PaymentCIModal, { PaymentFormData } from './PaymentCIModal'
import PaymentReceiptCIModal from './PaymentReceiptCIModal'
import RemboursementCIPDFModal from './RemboursementCIPDFModal'
import RefundDocumentLinkCI from './RefundDocumentLinkCI'
import RepaySupportCIModal from './RepaySupportCIModal'
import RequestSupportCIModal from './RequestSupportCIModal'
import SupportHistorySection from './SupportHistorySection'
import SupportRecognitionPDFModal from './SupportRecognitionPDFModal'

// Helper pour formater les montants correctement
const formatAmount = (amount: number): string => {
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

const formatDateKey = (date: Date): string => format(date, 'yyyy-MM-dd')

const ECHEANCE_COLOR_PALETTE = [
  {
    badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    upcomingBgClass: 'bg-emerald-50',
    upcomingBorderClass: 'border-emerald-200',
    paidBgClass: 'bg-emerald-100',
    paidBorderClass: 'border-emerald-300',
  },
  {
    badgeClass: 'border-blue-200 bg-blue-50 text-blue-700',
    upcomingBgClass: 'bg-blue-50',
    upcomingBorderClass: 'border-blue-200',
    paidBgClass: 'bg-blue-100',
    paidBorderClass: 'border-blue-300',
  },
  {
    badgeClass: 'border-violet-200 bg-violet-50 text-violet-700',
    upcomingBgClass: 'bg-violet-50',
    upcomingBorderClass: 'border-violet-200',
    paidBgClass: 'bg-violet-100',
    paidBorderClass: 'border-violet-300',
  },
  {
    badgeClass: 'border-amber-200 bg-amber-50 text-amber-700',
    upcomingBgClass: 'bg-amber-50',
    upcomingBorderClass: 'border-amber-200',
    paidBgClass: 'bg-amber-100',
    paidBorderClass: 'border-amber-300',
  },
  {
    badgeClass: 'border-cyan-200 bg-cyan-50 text-cyan-700',
    upcomingBgClass: 'bg-cyan-50',
    upcomingBorderClass: 'border-cyan-200',
    paidBgClass: 'bg-cyan-100',
    paidBorderClass: 'border-cyan-300',
  },
  {
    badgeClass: 'border-pink-200 bg-pink-50 text-pink-700',
    upcomingBgClass: 'bg-pink-50',
    upcomingBorderClass: 'border-pink-200',
    paidBgClass: 'bg-pink-100',
    paidBorderClass: 'border-pink-300',
  },
]

interface DailyCIContractProps {
  contract: ContractCI
  document?: any | null
  isLoadingDocument?: boolean
}

// Statistiques du contrat — grille statique (même design que la liste des contrats)
const PaymentStatsGrid = ({ contract, paymentStats }: { contract: ContractCI; paymentStats?: { totalAmountPaid: number; paymentCount: number; paidMonthsCount: number; supportCount: number } }) => {
  const totalTarget = contract.subscriptionCINominal || 0
  const amountPaid = paymentStats?.totalAmountPaid || 0
  const progressPercentage = totalTarget > 0 ? Math.min(100, (amountPaid / totalTarget) * 100) : 0

  const stats: { title: string; value: number | string; subtitle?: string; accent?: boolean }[] = [
    { title: 'Montant mensuel', value: `${contract.subscriptionCIAmountPerMonth.toLocaleString('fr-FR')} FCFA`, accent: true },
    { title: 'Durée du contrat', value: `${contract.subscriptionCIDuration} mois` },
    { title: 'Nominal total', value: `${contract.subscriptionCINominal.toLocaleString('fr-FR')} FCFA` },
    { title: 'Versements effectués', value: paymentStats?.paidMonthsCount || 0 },
    {
      title: 'Montant versé',
      value: `${(paymentStats?.totalAmountPaid || 0).toLocaleString('fr-FR')} FCFA`,
      subtitle: `${progressPercentage.toFixed(1)}% du total`,
      accent: true,
    },
    { title: 'Aides reçues', value: paymentStats?.supportCount || 0 },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 rounded-xl bg-gray-50 p-3 sm:grid-cols-3 lg:grid-cols-6">
      {stats.map((s) => (
        <div key={s.title}>
          <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">{s.title}</p>
          <p className={cn('text-sm font-bold tabular-nums', s.accent ? 'text-[#234D65]' : 'text-gray-900')}>
            {s.value}
          </p>
          {s.subtitle && <p className="mt-0.5 text-[10px] text-gray-400">{s.subtitle}</p>}
        </div>
      ))}
    </div>
  )
}

export default function DailyCIContract({ contract, document: _document, isLoadingDocument: _isLoadingDocument }: DailyCIContractProps) {
  const { openDocument } = useDocumentViewer()
  const router = useRouter()
  // Actions sensibles (modifier/supprimer un versement) : SuperAdmin uniquement.
  const isSuperAdmin = useIsSuperAdmin()
  const { user } = useAuth()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [showRequestSupportModal, setShowRequestSupportModal] = useState(false)
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
  const [editCategoryOpen, setEditCategoryOpen] = useState(false)
  const [confirmApproveRefundId, setConfirmApproveRefundId] = useState<string | null>(null)
  const [refundToMarkAsPaid, setRefundToMarkAsPaid] = useState<{ id: string; label: string } | null>(null)
  const [refundToValidate, setRefundToValidate] = useState<any | null>(null)
  const [editVersement, setEditVersement] = useState<{ payment: PaymentCI; versement: VersementCI } | null>(null)

  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

  // Récupérer les paiements depuis Firestore
  const { data: payments = [] } = usePaymentsCI(contract.id)
  const createVersementMutation = useCreateVersement()
  const updateVersementMutation = useUpdateVersement()
  const deleteVersementMutation = useDeleteVersement()

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
      setSelectedDate(null)
    }
  }, [activeSupport, showRepaySupportModal])

  // Initialiser currentMonth au premier mois du contrat au chargement
  React.useEffect(() => {
    if (contract.firstPaymentDate) {
      const firstPaymentDate = new Date(contract.firstPaymentDate)
      firstPaymentDate.setHours(0, 0, 0, 0)
      // Initialiser le calendrier sur le mois du premier paiement
      setCurrentMonth(new Date(firstPaymentDate.getFullYear(), firstPaymentDate.getMonth(), 1))
    }
  }, [contract.firstPaymentDate])

  // Calculer l'index du mois actuel du calendrier par rapport à firstPaymentDate
  // Le mois est calculé en utilisant des cycles de 30 jours à partir de firstPaymentDate
  const currentMonthIndex = useMemo(() => {
    if (!contract.firstPaymentDate) return 0
    
    // Trouver le monthIndex qui a le plus de jours dans le mois calendaire affiché
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    
    // Obtenir le premier et dernier jour du mois calendaire
    const firstDayOfCalendarMonth = new Date(year, month, 1)
    firstDayOfCalendarMonth.setHours(0, 0, 0, 0)
    const lastDayOfCalendarMonth = new Date(year, month + 1, 0)
    lastDayOfCalendarMonth.setHours(23, 59, 59, 999)
    
    // Calculer les monthIndex possibles pour le début et la fin du mois calendaire
    const startMonthIndex = calculateMonthIndex(firstDayOfCalendarMonth, contract.firstPaymentDate)
    const endMonthIndex = calculateMonthIndex(lastDayOfCalendarMonth, contract.firstPaymentDate)
    
    // Si les deux sont identiques, c'est le bon
    if (startMonthIndex === endMonthIndex) {
      return startMonthIndex
    }
    
    // Sinon, compter combien de jours appartiennent à chaque monthIndex
    // Ne compter que les jours après firstPaymentDate
    const monthIndexCounts: { [key: number]: number } = {}
    const firstPaymentDateObj = new Date(contract.firstPaymentDate)
    firstPaymentDateObj.setHours(0, 0, 0, 0)
    
    // Parcourir tous les jours du mois calendaire
    const currentDate = new Date(firstDayOfCalendarMonth)
    while (currentDate <= lastDayOfCalendarMonth) {
      // Ne compter que les jours après ou égaux à firstPaymentDate
      const dateToCheck = new Date(currentDate)
      dateToCheck.setHours(0, 0, 0, 0)
      
      if (dateToCheck >= firstPaymentDateObj) {
        const dayMonthIndex = calculateMonthIndex(currentDate, contract.firstPaymentDate)
        // S'assurer que le monthIndex est valide (>= 0)
        if (dayMonthIndex >= 0) {
          monthIndexCounts[dayMonthIndex] = (monthIndexCounts[dayMonthIndex] || 0) + 1
        }
      }
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    // Trouver le monthIndex avec le plus de jours
    let maxCount = 0
    let dominantMonthIndex = startMonthIndex >= 0 ? startMonthIndex : 0
    
    // Si aucun jour valide trouvé, retourner 0 (premier mois)
    if (Object.keys(monthIndexCounts).length === 0) {
      return 0
    }
    
    for (const [monthIdx, count] of Object.entries(monthIndexCounts)) {
      if (count > maxCount) {
        maxCount = count
        dominantMonthIndex = parseInt(monthIdx)
      }
    }
    
    return dominantMonthIndex
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
  const getEcheanceColor = useCallback((monthIndex: number) => {
    const paletteIndex = Math.abs(monthIndex) % ECHEANCE_COLOR_PALETTE.length
    return ECHEANCE_COLOR_PALETTE[paletteIndex]
  }, [])

  // Fonctions utilitaires pour les récapitulatifs mensuels
  const getMonthDateRange = useCallback((monthIndex: number) => {
    try {
      const { startDate, endDate } = getMonthPeriod(monthIndex, contract.firstPaymentDate)
      return { start: startDate, end: endDate }
    } catch {
      return null
    }
  }, [contract.firstPaymentDate])

  const getTotalForMonth = useCallback((monthIndex: number) => {
    const payment = payments.find((p: any) => p.monthIndex === monthIndex)
    if (!payment || !payment.versements) return 0
    
    // Calculer le total des versements pour ce mois
    return payment.versements.reduce((sum: number, versement: any) => {
      return sum + (versement.amount || 0)
    }, 0)
  }, [payments])

  const getMonthStatus = useCallback((monthIndex: number) => {
    const payment = payments.find((p: any) => p.monthIndex === monthIndex)
    if (!payment) return 'DUE'
    
    const total = getTotalForMonth(monthIndex)
    const target = contract.subscriptionCIAmountPerMonth || 0
    
    if (total >= target) {
      return 'PAID'
    } else if (total > 0) {
      return 'PARTIAL'
    } else {
      return 'DUE'
    }
  }, [payments, getTotalForMonth, contract.subscriptionCIAmountPerMonth])

  // Prochaine échéance à payer (premier mois DUE dont la date de début >= aujourd'hui) pour le PDF Reconnaissance
  const nextDueDate = React.useMemo(() => {
    if (!contract.firstPaymentDate) return null
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const duration = contract.subscriptionCIDuration ?? 12
    for (let monthIndex = 0; monthIndex < duration; monthIndex++) {
      const { startDate } = getMonthPeriod(monthIndex, contract.firstPaymentDate!)
      startDate.setHours(0, 0, 0, 0)
      if (startDate >= today && getMonthStatus(monthIndex) === 'DUE') return startDate
    }
    return null
  }, [contract.firstPaymentDate, contract.subscriptionCIDuration, payments, getMonthStatus])

  // Référence pour le slider vertical (desktop) et horizontal (mobile)
  const monthSliderRef = React.useRef<HTMLDivElement>(null)
  const monthSliderMobileRef = React.useRef<HTMLDivElement>(null)

  // Synchroniser le scroll du slider desktop quand le badge "Actuel" change
  React.useEffect(() => {
    if (!monthSliderRef.current) return
    
    const activeCard = monthSliderRef.current.querySelector(`[data-month-index="${currentMonthIndex}"]`) as HTMLElement
    if (activeCard) {
      const container = monthSliderRef.current
      const containerRect = container.getBoundingClientRect()
      const cardRect = activeCard.getBoundingClientRect()
      
      // Calculer la position relative de la carte dans le conteneur scrollable
      // La différence entre les positions absolues + le scroll actuel donne la position dans le contenu
      const currentScrollTop = container.scrollTop
      const cardTopInContent = cardRect.top - containerRect.top + currentScrollTop
      
      // Hauteurs pour le calcul
      const containerHeight = container.clientHeight
      const cardHeight = cardRect.height
      
      // Centrer la carte : positionner le centre de la carte au centre du viewport
      // scrollTop = position du centre de la carte - centre du viewport
      const cardCenter = cardTopInContent + (cardHeight / 2)
      const targetScrollTop = cardCenter - (containerHeight / 2)
      
      // S'assurer que le scroll ne dépasse pas les limites
      const maxScrollTop = container.scrollHeight - containerHeight
      const finalScrollTop = Math.max(0, Math.min(targetScrollTop, maxScrollTop))
      
      container.scrollTo({
        top: finalScrollTop,
        behavior: 'smooth'
      })
    }
  }, [currentMonthIndex])

  // Synchroniser le scroll du slider horizontal mobile quand le badge "Actuel" change
  React.useEffect(() => {
    if (!monthSliderMobileRef.current) return
    
    const activeCard = monthSliderMobileRef.current.querySelector(`[data-month-index="${currentMonthIndex}"]`) as HTMLElement
    if (activeCard) {
      activeCard.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      })
    }
  }, [currentMonthIndex])

  const getPaymentForDate = (date: Date) => {
    // Calculer le monthIndex correct pour cette date spécifique
    const dateMonthIndex = calculateMonthIndex(date, contract.firstPaymentDate)
    
    // Récupérer le paiement du mois correspondant
    const payment = payments.find((p: any) => p.monthIndex === dateMonthIndex)
    if (!payment) return null

    // Chercher un versement pour cette date spécifique
    const dateString = formatDateKey(date)
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
    const dateString = formatDateKey(selectedDate)
    const versement = payment.versements?.find((v: any) => v.date === dateString)
    
    if (!versement) return null

    return {
      ...payment,
      versements: [versement],
      accumulatedAmount: versement.amount
    }
  }

  const handlePaymentSubmit = async (paymentData: PaymentFormData) => {
    if (!user?.uid) {
      const err = new Error('Utilisateur non authentifié')
      toast.error(err.message)
      throw err
    }

    try {
      if (editVersement) {
        const modificationReason = paymentData.modificationReason?.trim()
        if (!modificationReason) {
          const err = new Error('Veuillez indiquer le motif de la modification')
          toast.error(err.message)
          throw err
        }
        await updateVersementMutation.mutateAsync({
          contractId: contract.id,
          monthIndex: editVersement.payment.monthIndex,
          versementId: editVersement.versement.id,
          versementData: {
            date: paymentData.date,
            time: paymentData.time,
            amount: paymentData.amount,
            mode: paymentData.mode,
            withFees: paymentData.withFees,
            paymentMethodOther: paymentData.paymentMethodOther,
            agentRecouvrementId: paymentData.agentRecouvrementId,
          },
          proofFile: paymentData.proofFile,
          modificationReason,
          userId: user.uid,
        })
        setShowPaymentModal(false)
        setSelectedDate(null)
        setEditVersement(null)
      } else {
        if (!selectedDate) {
          const err = new Error('Aucune date sélectionnée pour enregistrer le versement')
          toast.error(err.message)
          throw err
        }

        const dateMonthIndex = calculateMonthIndex(selectedDate, contract.firstPaymentDate)
        await createVersementMutation.mutateAsync({
          contractId: contract.id,
          monthIndex: dateMonthIndex,
          versementData: {
            date: paymentData.date,
            time: paymentData.time,
            amount: paymentData.amount,
            mode: paymentData.mode,
            withFees: paymentData.withFees,
            paymentMethodOther: paymentData.paymentMethodOther,
            agentRecouvrementId: paymentData.agentRecouvrementId,
          },
          proofFile: paymentData.proofFile!,
          userId: user.uid,
        })
        setShowPaymentModal(false)
        setSelectedDate(null)
      }
    } catch (error) {
      console.error('Erreur lors du paiement:', error)
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
        Contrat Journalier CI
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 lg:p-8 overflow-x-hidden">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* En-tête avec bouton retour */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              variant="outline"
              onClick={() => backOr(router, routes.admin.caisseImprevue)}
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

            {/* Bouton Contact d'urgence */}
            <EmergencyContact emergencyContact={(contract as any)?.emergencyContact} contractKind="CI" contractId={(contract as any)?.id} />

            {/* Modifier les infos du membre (superAdmin) */}
            <ContractCIMemberInfoDialog contract={contract} />
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
              <p className="text-sm break-words flex items-center gap-2 flex-wrap">
                {contract.memberFirstName} {contract.memberLastName} - Forfait <span className="font-mono text-xs break-all">{contract.subscriptionCICode}</span>
                {process.env.NODE_ENV === 'development' && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-blue-100 hover:text-white hover:bg-white/20"
                    onClick={() => setEditCategoryOpen(true)}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    Modifier la catégorie
                  </Button>
                )}
              </p>
              <p className="text-sm break-words">
                Objectif mensuel: {contract.subscriptionCIAmountPerMonth.toLocaleString('fr-FR')} FCFA
              </p>
            </div>
          </CardHeader>
        </Card>

        {process.env.NODE_ENV === 'development' && (
          <EditContractCategoryCIModal
            open={editCategoryOpen}
            onOpenChange={setEditCategoryOpen}
            contract={contract}
          />
        )}

        {/* Statistiques de paiement - Carrousel */}
        <PaymentStatsGrid contract={contract} paymentStats={paymentStats} />

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
              Montant payé&nbsp;: <b>{formatAmount(paymentStats?.totalAmountPaid || 0)} FCFA</b>
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

        {/* Récapitulatifs mensuels et Calendrier */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Calendrier quotidien */}
          <div className="flex-1">
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
	                <div className="mb-4 rounded-lg border border-indigo-100 bg-indigo-50/60 px-3 py-2 text-xs text-indigo-700">
	                  Chaque échéance (M1, M2, M3...) est colorée pour faciliter le suivi visuel.
	                </div>
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
	                    const dateMonthIndex = calculateMonthIndex(date, contract.firstPaymentDate)
	                    const hasEcheance =
	                      dateMonthIndex >= 0 && dateMonthIndex < (contract.subscriptionCIDuration || 0)
	                    const echeanceColor = hasEcheance ? getEcheanceColor(dateMonthIndex) : null
	                    
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
	                      dayStyle = hasEcheance && echeanceColor
	                        ? `${echeanceColor.paidBgClass} ${echeanceColor.paidBorderClass} hover:brightness-95 cursor-pointer`
	                        : 'bg-green-50 border-green-200 hover:bg-green-100 cursor-pointer'
	                      dayContent = (
	                        <div className="flex items-center justify-center gap-0.5 text-xs text-green-600">
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
	                        dayStyle = hasEcheance && echeanceColor
	                          ? `${echeanceColor.upcomingBgClass} ${echeanceColor.upcomingBorderClass} hover:brightness-95 cursor-pointer`
	                          : 'bg-white border-gray-200 hover:bg-gray-50 cursor-pointer'
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
	                        {isCurrentMonth && !isBeforeFirstPayment && hasEcheance && echeanceColor && (
	                          <div className="mb-1">
	                            <span
	                              className={cn(
	                                'inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-semibold',
	                                echeanceColor.badgeClass,
	                              )}
	                            >
	                              M{dateMonthIndex + 1}
	                            </span>
	                          </div>
	                        )}
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
          </div>

          {/* Slider vertical des récapitulatifs mensuels (Desktop uniquement) */}
          <div className="hidden lg:block lg:w-80 xl:w-96 flex-shrink-0">
            <Card className="border-0 shadow-xl h-full">
              <CardHeader className="bg-gradient-to-r from-indigo-50 to-indigo-100/50 border-b">
                <CardTitle className="flex items-center gap-2 text-indigo-700 text-lg">
                  <TrendingUp className="h-5 w-5" />
                  Récapitulatif mensuel
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 h-[calc(100vh-400px)] min-h-[600px] overflow-y-auto" ref={monthSliderRef}>
                <div className="space-y-3">
                  {Array.from({ length: contract.subscriptionCIDuration || 0 }).map((_, monthIndex) => {
                    const total = getTotalForMonth(monthIndex)
                    const status = getMonthStatus(monthIndex)
                    const target = contract.subscriptionCIAmountPerMonth || 0
                    const percentage = target > 0 ? Math.min(100, (total / target) * 100) : 0
                    const range = getMonthDateRange(monthIndex)
                    const isActive = currentMonthIndex === monthIndex

                    return (
                      <Card
                        key={monthIndex}
                        data-month-index={monthIndex}
                        className={cn(
                          "border-2 shadow-md transition-all duration-300 cursor-pointer hover:shadow-lg",
                          isActive 
                            ? "border-indigo-500 bg-indigo-50/50 shadow-indigo-200" 
                            : "border-gray-200 bg-white"
                        )}
                        onClick={() => {
                          // Naviguer vers le mois correspondant
                          if (range) {
                            setCurrentMonth(new Date(range.start))
                          }
                        }}
                      >
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-bold flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              <Calendar className={cn("h-4 w-4", isActive ? "text-indigo-600" : "text-gray-600")} />
                              Mois {monthIndex + 1}
                            </span>
                            {isActive && (
                              <Badge className="bg-indigo-600 text-white text-xs">Actuel</Badge>
                            )}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {range && (
                            <div className="text-xs text-gray-500">
                              {format(range.start, 'dd MMM', { locale: fr })} → {format(range.end, 'dd MMM yyyy', { locale: fr })}
                            </div>
                          )}
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">Objectif:</span>
                            <span className="font-semibold">{target.toLocaleString('fr-FR')} FCFA</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">Versé:</span>
                            <span className="font-semibold text-green-600">{total.toLocaleString('fr-FR')} FCFA</span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span>Progression</span>
                              <span className="font-medium">{percentage.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div
                                className={cn(
                                  "h-1.5 rounded-full transition-all duration-300",
                                  percentage >= 100 ? 'bg-green-500' : percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                )}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                          {status === 'PAID' && (() => {
                            const monthPayment = payments.find((p: any) => p.monthIndex === monthIndex) as PaymentCI | undefined
                            if (!monthPayment?.modificationReason && !monthPayment?.updatedAt) return null
                            return (
                              <div className="pt-2 mt-2 border-t border-gray-100 space-y-1 text-xs text-gray-500">
                                {monthPayment?.updatedAt && (() => {
                                  const u = monthPayment.updatedAt
                                  const modDate = u instanceof Date ? u : (typeof (u as any)?.toDate === 'function' ? (u as any).toDate() : u ? new Date(u as string | number) : null)
                                  if (!modDate || isNaN(modDate.getTime())) return null
                                  return (
                                    <div className="flex items-center justify-between">
                                      <span>Modifié le:</span>
                                      <span>{modDate.toLocaleDateString('fr-FR')} à {modDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                  )
                                })()}
                                {monthPayment?.modificationReason && (
                                  <div>
                                    <span className="font-medium">Motif:</span>
                                    <span className="ml-1">{monthPayment.modificationReason}</span>
                                  </div>
                                )}
                              </div>
                            )
                          })()}
                          <div className="flex items-center gap-2 pt-1">
                            <Badge
                              variant={
                                status === 'PAID' ? 'default' :
                                  status === 'PARTIAL' ? 'secondary' :
                                    status === 'DUE' ? 'secondary' : 'destructive'
                              }
                              className={cn(
                                "text-xs",
                                status === 'PAID' ? "bg-green-100 text-green-800 border-green-200" :
                                  status === 'PARTIAL' ? "bg-yellow-100 text-yellow-800 border-yellow-200" :
                                    "bg-gray-100 text-gray-600 border-gray-200"
                              )}
                            >
                              {status === 'PAID' ? 'Complété' : status === 'PARTIAL' ? 'Partiel' : 'En cours'}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Slider horizontal mobile des récapitulatifs mensuels (Mobile uniquement) */}
          <div className="lg:hidden mt-4">
            <Card className="border-0 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-indigo-50 to-indigo-100/50 border-b pb-3">
                <CardTitle className="flex items-center gap-2 text-indigo-700 text-base">
                  <TrendingUp className="h-4 w-4" />
                  Récapitulatif mensuel
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div 
                  ref={monthSliderMobileRef}
                  className="overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory" 
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  <style dangerouslySetInnerHTML={{ __html: `
                    .overflow-x-auto::-webkit-scrollbar {
                      display: none;
                    }
                  `}} />
                  <div className="flex gap-4 min-w-max">
                    {Array.from({ length: contract.subscriptionCIDuration || 0 }).map((_, monthIndex) => {
                      const total = getTotalForMonth(monthIndex)
                      const status = getMonthStatus(monthIndex)
                      const target = contract.subscriptionCIAmountPerMonth || 0
                      const percentage = target > 0 ? Math.min(100, (total / target) * 100) : 0
                      const range = getMonthDateRange(monthIndex)
                      const isActive = currentMonthIndex === monthIndex

                      return (
                        <Card
                          key={monthIndex}
                          data-month-index={monthIndex}
                          className={cn(
                            "border-2 shadow-md transition-all duration-300 cursor-pointer hover:shadow-lg snap-center shrink-0 w-[280px]",
                            isActive 
                              ? "border-indigo-500 bg-indigo-50/50 shadow-indigo-200" 
                              : "border-gray-200 bg-white"
                          )}
                          onClick={() => {
                            // Naviguer vers le mois correspondant
                            if (range) {
                              setCurrentMonth(new Date(range.start))
                            }
                          }}
                        >
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold flex items-center justify-between">
                              <span className="flex items-center gap-2">
                                <Calendar className={cn("h-4 w-4", isActive ? "text-indigo-600" : "text-gray-600")} />
                                Mois {monthIndex + 1}
                              </span>
                              {isActive && (
                                <Badge className="bg-indigo-600 text-white text-xs">Actuel</Badge>
                              )}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            {range && (
                              <div className="text-xs text-gray-500">
                                {format(range.start, 'dd MMM', { locale: fr })} → {format(range.end, 'dd MMM yyyy', { locale: fr })}
                              </div>
                            )}
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-600">Objectif:</span>
                              <span className="font-semibold">{target.toLocaleString('fr-FR')} FCFA</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-600">Versé:</span>
                              <span className="font-semibold text-green-600">{total.toLocaleString('fr-FR')} FCFA</span>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span>Progression</span>
                                <span className="font-medium">{percentage.toFixed(1)}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-1.5">
                                <div
                                  className={cn(
                                    "h-1.5 rounded-full transition-all duration-300",
                                    percentage >= 100 ? 'bg-green-500' : percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                  )}
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                            {status === 'PAID' && (() => {
                              const monthPayment = payments.find((p: any) => p.monthIndex === monthIndex) as PaymentCI | undefined
                              if (!monthPayment?.modificationReason && !monthPayment?.updatedAt) return null
                              return (
                                <div className="pt-2 mt-2 border-t border-gray-100 space-y-1 text-xs text-gray-500">
                                  {monthPayment?.updatedAt && (() => {
                                    const u = monthPayment.updatedAt
                                    const modDate = u instanceof Date ? u : (typeof (u as any)?.toDate === 'function' ? (u as any).toDate() : u ? new Date(u as string | number) : null)
                                    if (!modDate || isNaN(modDate.getTime())) return null
                                    return (
                                      <div className="flex items-center justify-between">
                                        <span>Modifié le:</span>
                                        <span>{modDate.toLocaleDateString('fr-FR')} à {modDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                                      </div>
                                    )
                                  })()}
                                  {monthPayment?.modificationReason && (
                                    <div>
                                      <span className="font-medium">Motif:</span>
                                      <span className="ml-1">{monthPayment.modificationReason}</span>
                                    </div>
                                  )}
                                </div>
                              )
                            })()}
                            <div className="flex items-center gap-2 pt-1">
                              <Badge
                                variant={
                                  status === 'PAID' ? 'default' :
                                    status === 'PARTIAL' ? 'secondary' :
                                      status === 'DUE' ? 'secondary' : 'destructive'
                                }
                                className={cn(
                                  "text-xs",
                                  status === 'PAID' ? "bg-green-100 text-green-800 border-green-200" :
                                    status === 'PARTIAL' ? "bg-yellow-100 text-yellow-800 border-yellow-200" :
                                      "bg-gray-100 text-gray-600 border-gray-200"
                                )}
                              >
                                {status === 'PAID' ? 'Complété' : status === 'PARTIAL' ? 'Partiel' : 'En cours'}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Modal de paiement */}
        <PaymentCIModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false)
            setSelectedDate(null)
            setEditVersement(null)
          }}
          onSubmit={handlePaymentSubmit}
          title={editVersement ? `Modifier le versement – ${editVersement.versement.date}` : 'Versement quotidien'}
          description={editVersement ? 'Modifier l\'heure, le montant, le mode ou la preuve du versement (date fixe).' : (selectedDate ? `Enregistrer le versement du ${selectedDate.toLocaleDateString('fr-FR')}` : '')}
          defaultDate={editVersement ? editVersement.versement.date : (selectedDate ? formatDateKey(selectedDate) : undefined)}
          isMonthly={false}
          isDateFixed={!!editVersement}
          contractId={contract.id}
          initialData={editVersement ? { date: editVersement.versement.date, time: editVersement.versement.time, amount: editVersement.versement.amount, mode: editVersement.versement.mode, withFees: editVersement.versement.withFees, paymentMethodOther: editVersement.versement.paymentMethodOther, proofUrl: editVersement.versement.proofUrl, agentRecouvrementId: editVersement.versement.agentRecouvrementId } : undefined}
          submitLabel={editVersement ? 'Modifier le versement' : undefined}
        />

        {/* Modal de reçu */}
        {getSelectedPaymentWithVersement() && (
          <PaymentReceiptCIModal
            isOpen={showReceiptModal}
            onClose={() => {
              setShowReceiptModal(false)
              if (!editVersement) {
                setSelectedDate(null)
              }
            }}
            contract={contract}
            payment={getSelectedPaymentWithVersement()!}
            isMonthly={false}
            onEditClick={!isContractTerminated && isSuperAdmin ? () => {
              if (!selectedDate) return
              const mi = calculateMonthIndex(selectedDate, contract.firstPaymentDate)
              const payment = payments.find((p: any) => p.monthIndex === mi)
              const dateStr = formatDateKey(selectedDate)
              const versement = payment?.versements?.find((v: any) => v.date === dateStr)
              if (payment && versement) {
                setEditVersement({ payment, versement })
                setShowReceiptModal(false)
                setShowPaymentModal(true)
              }
            } : undefined}
            onDeleteClick={!isContractTerminated && isSuperAdmin ? async () => {
              if (!selectedDate) return
              const payment = getSelectedPaymentWithVersement()
              if (!payment) return
              const dateStr = formatDateKey(selectedDate)
              const versement = payment.versements?.find((v: any) => v.date === dateStr)
              if (!versement) return
              try {
                await deleteVersementMutation.mutateAsync({
                  contractId: contract.id,
                  monthIndex: payment.monthIndex,
                  versementId: versement.id,
                })
                setShowReceiptModal(false)
                setSelectedDate(null)
              } catch {
                // Erreur gérée par le hook (toast)
              }
            } : undefined}
          />
        )}

        {/* Modal de demande de support */}
        <RequestSupportCIModal
          isOpen={showRequestSupportModal}
          onClose={() => setShowRequestSupportModal(false)}
          contract={contract}
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
            defaultDate={formatDateKey(selectedDate)}
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
                Générer la quittance
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
                  const isInstantRefund = r.type === 'EARLY' || r.type === 'FINAL'

                  const getRefundStatusConfig = (status: string) => {
                    switch (status) {
                      case 'PENDING':
                        return { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200', icon: Clock, label: 'En attente' }
                      case 'APPROVED':
                        return { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', icon: CheckCircle, label: 'Approuvé' }
                      case 'PAID':
                        return { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', icon: CheckCircle, label: 'Payé' }
                      case 'REJECTED':
                        return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', icon: XCircle, label: 'Refusé' }
                      default:
                        return { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', icon: XCircle, label: 'Archivé' }
                    }
                  }

                  const statusConfig = getRefundStatusConfig(r.status)
                  const StatusIcon = statusConfig.icon
                  const handledBy = r.paidByName || r.approvedByName || r.createdByName || r.updatedByName
                  const handledDate = r.paidAt ? new Date(r.paidAt) : r.withdrawalDate ? new Date(r.withdrawalDate) : r.createdAt ? new Date(r.createdAt) : null
                  const handledTime = r.paidAtTime || r.withdrawalTime || (r as { time?: string }).time
                  const canShowPendingMessage = r.status === 'PENDING'
                  const canShowApprovedMessage = r.status === 'APPROVED'
                  const canShowActions = r.status === 'PENDING' || r.status === 'APPROVED'
                  const canShowPaidInfo = r.status === 'PAID' && (r.paidByName || r.paidAt)

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
                              {statusConfig.label}
                            </Badge>
                            {canShowPendingMessage && (
                              <p className="text-xs text-amber-600 mt-1.5">
                                En attente d&apos;approbation par l&apos;administrateur
                              </p>
                            )}
                            {canShowApprovedMessage && (
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

                        {isInstantRefund && (
                          <div className="pt-3 border-t border-gray-100 space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-gray-600">Document téléversé:</span>
                              <RefundDocumentLinkCI documentId={r.documentId} />
                            </div>
                            {(r.type === 'FINAL' ? (r.paymentProofUrl || r.proofUrl) : r.proofUrl) && (
                              <div className="flex items-center gap-2 text-sm">
                                <span className="text-gray-600">{r.type === 'FINAL' ? 'Preuve de paiement:' : 'Preuve téléversée:'}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const url = r.type === 'FINAL' ? (r.paymentProofUrl || r.proofUrl) : r.proofUrl
                                    const last = String(contract?.memberLastName ?? '').toUpperCase().replace(/\s+/g, '_')
                                    const first = String(contract?.memberFirstName ?? '').toUpperCase().replace(/\s+/g, '_')
                                    const filename = `${last}_${first}_PREUVE_${r.type ?? 'REMBOURSEMENT'}.pdf`
                                    openDocument({ url, filename, title: 'Preuve de paiement' })
                                  }}
                                  className="text-indigo-600 hover:underline font-medium flex items-center gap-1 cursor-pointer"
                                >
                                  <Download className="h-4 w-4" />
                                  Télécharger
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {!isInstantRefund && r.status === 'PAID' && r.paymentProofUrl && (
                          <div className="pt-3 border-t border-gray-100">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-gray-600">Preuve de paiement:</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const last = String(contract?.memberLastName ?? '').toUpperCase().replace(/\s+/g, '_')
                                  const first = String(contract?.memberFirstName ?? '').toUpperCase().replace(/\s+/g, '_')
                                  const filename = `${last}_${first}_PREUVE_${r.type ?? 'REMBOURSEMENT'}.pdf`
                                  openDocument({ url: r.paymentProofUrl, filename, title: 'Preuve de paiement' })
                                }}
                                className="text-indigo-600 hover:underline font-medium flex items-center gap-1 cursor-pointer"
                              >
                                <Download className="h-4 w-4" />
                                Télécharger
                              </button>
                            </div>
                          </div>
                        )}
                        {isInstantRefund && (handledBy || handledDate) && (
                          <div className="pt-2 space-y-1 text-xs text-gray-500">
                            {handledBy && <p>Marqué par: {handledBy}</p>}
                            {handledDate && (
                              <p>
                                Le {handledDate.toLocaleDateString('fr-FR')} à {handledTime ?? handledDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            )}
                          </div>
                        )}
                        {canShowPaidInfo && (
                          <div className="pt-2 space-y-1 text-xs text-gray-500">
                            {r.paidByName && <p>Marqué par: {r.paidByName}</p>}
                            {r.paidAt && (
                              <p>
                                Le {new Date(r.paidAt).toLocaleDateString('fr-FR')} à {(r as { paidAtTime?: string; time?: string }).paidAtTime ?? (r as { paidAtTime?: string; time?: string }).time ?? new Date(r.paidAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {canShowActions && (
                        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-2">
                          {r.status === 'PENDING' && (
                            <>
                              {r.documentUrl && (
                                <a href={r.documentUrl} target="_blank" rel="noopener noreferrer">
                                  <Button variant="outline" size="sm" className="border-gray-300 text-gray-600 hover:bg-gray-50">
                                    <Eye className="h-4 w-4 mr-1" />
                                    Voir le document
                                  </Button>
                                </a>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-[#234D65]/30 text-[#234D65] hover:bg-[#234D65]/5"
                                onClick={() => setRefundToValidate(r)}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Traiter la demande
                              </Button>
                            </>
                          )}
                          {r.status === 'APPROVED' && (
                            <>
                              {r.adminDocumentUrl && (
                                <a href={r.adminDocumentUrl} target="_blank" rel="noopener noreferrer">
                                  <Button variant="outline" size="sm" className="border-gray-300 text-gray-600 hover:bg-gray-50">
                                    <Eye className="h-4 w-4 mr-1" />
                                    Doc. doublement signé
                                  </Button>
                                </a>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-green-300 text-green-600 hover:bg-green-50"
                                onClick={() => setRefundToMarkAsPaid({ id: r.id, label: r.type === 'FINAL' ? 'Remboursement Final' : 'Retrait Anticipé' })}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Marquer comme payé
                              </Button>
                            </>
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

        {/* Modal de validation remboursement membre */}
        {refundToValidate && (
          <ValidateRefundCIModal
            open={!!refundToValidate}
            onClose={() => setRefundToValidate(null)}
            contractId={contract.id}
            refund={refundToValidate}
            onSuccess={async () => { setRefundToValidate(null); await reloadRefunds() }}
          />
        )}

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

        {/* Historique des aides financières */}
        <SupportHistorySection contractId={contract.id} />

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
            subscriptionCINominal: contract.subscriptionCINominal,
            subscriptionCISupportMin: contract.subscriptionCISupportMin,
            subscriptionCISupportMax: contract.subscriptionCISupportMax,
            firstPaymentDate: contract.firstPaymentDate,
            createdAt: contract.createdAt,
          }}
          nextDueDate={nextDueDate}
          support={
            activeSupport || supportHistory[0]
              ? { approvedAt: (activeSupport || supportHistory[0]).approvedAt ?? new Date() }
              : null
          }
        />

        {/* Modal de demande de retrait anticipé */}
        <EarlyRefundCIModal
          isOpen={showEarlyRefundModal}
          onClose={() => setShowEarlyRefundModal(false)}
          contract={contract}
          onSuccess={reloadRefunds}
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
