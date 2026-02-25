"use client"

import { AgentRecouvrementSelect } from '@/components/agent-recouvrement/AgentRecouvrementSelect'
import { ContractCalendarGrid, useContractCalendar } from '@/components/contract/calendar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import routes from '@/constantes/routes'
import { listRefunds } from '@/db/caisse/refunds.db'
import { canDeletePayment, useDeleteContractPayment } from '@/domains/financial/caisse-speciale/contrats/hooks'
import { useAdmin } from '@/hooks/admin/useAdmin'
import { useAgentRecouvrement } from '@/hooks/agent-recouvrement'
import { useAuth } from '@/hooks/useAuth'
import { useActiveCaisseSettingsByType } from '@/hooks/useCaisseSettings'
import { useGroupMembers, useMember } from '@/hooks/useMembers'
import { earlyRefundDefaultValues, earlyRefundSchema, type EarlyRefundFormData } from '@/schemas/schemas'
import { approveRefund, cancelEarlyRefund, markRefundPaid, requestEarlyRefund, requestFinalRefund, updatePaymentContribution } from '@/services/caisse/mutations'
import type { RefundDocument } from '@/types/types'
import { getContractStatusConfig } from '@/utils/contract-status'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { AlertCircle, AlertTriangle, ArrowLeft, Banknote, Building2, Calendar, CalendarDays, CheckCircle, CheckCircle2, Clock, CreditCard, DollarSign, Download, ExternalLink, Eye, FileText, History, Loader2, RefreshCw, Smartphone, Trash2, TrendingUp, Upload, XCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import React, { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import PdfDocumentModal from './PdfDocumentModal'
import PdfViewerModal from './PdfViewerModal'
import RemboursementNormalPDFModal from './RemboursementNormalPDFModal'
import EmergencyContact from './standard/EmergencyContact'
import TestPaymentTools from './TestPaymentTools'

// Helper pour formater les montants correctement
const formatAmount = (amount: number): string => {
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

// ————————————————————————————————————————————————————————————
// Helpers UI
// ————————————————————————————————————————————————————————————
const brand = {
  bg: "bg-[#234D65]",
  bgSoft: "bg-[#234D65]/10",
  text: "text-[#234D65]",
  ring: "ring-[#234D65]/30",
  hover: "hover:bg-[#1a3a4f]",
}

function StatCard({ icon: Icon, label, value, accent = "slate" }: any) {
  const accents: Record<string, string> = {
    slate: "from-slate-50 to-white",
    emerald: "from-emerald-50 to-white",
    red: "from-rose-50 to-white",
    brand: "from-[#234D65]/10 to-white",
  }
  return (
    <div className={`rounded-2xl border bg-gradient-to-b ${accents[accent]} p-4 shadow-sm`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-slate-500">{label}</div>
          <div className="mt-1 text-lg font-semibold text-slate-800">{value}</div>
        </div>
        {Icon ? <Icon className={`h-5 w-5 ${brand.text}`} /> : null}
      </div>
    </div>
  )
}

type Props = { id: string }

export default function DailyContract({ id }: Props) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    daysWithStatus,
    getPaymentForDate,
    getMonthIndexFromStart,
    getMonthDateRange,
    getTotalForMonth,
    getMonthStatus,
    contractStartDate,
    isGroupContract,
    totalMonths,
  } = useContractCalendar(id, currentMonth)

  const { user } = useAuth()
  const { data: member } = useMember((data as any)?.memberId)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showPaymentDetailsModal, setShowPaymentDetailsModal] = useState(false)
  const [showEditPaymentModal, setShowEditPaymentModal] = useState(false)
  const [showLatePaymentModal, setShowLatePaymentModal] = useState(false)
  const [paymentDetails, setPaymentDetails] = useState<any>(null)
  const { data: adminWhoModified, isLoading: isLoadingAdminWhoModified } = useAdmin(paymentDetails?.updatedBy ?? '')
  /** ID de l'agent de recouvrement pour le versement affiché dans le modal Détails (contribution du jour ou paiement) */
  const detailsModalAgentId = useMemo(() => {
    if (!paymentDetails?.contribs?.length || !selectedDate) return paymentDetails?.agentRecouvrementId ?? ''
    const payment = paymentDetails
    const contrib = payment.contribs.find((c: any) => {
      if (!c.paidAt) return false
      const contribDate = typeof c.paidAt?.toDate === 'function' ? c.paidAt.toDate() : new Date(c.paidAt)
      contribDate.setHours(0, 0, 0, 0)
      const selected = new Date(selectedDate)
      selected.setHours(0, 0, 0, 0)
      return contribDate.getTime() === selected.getTime()
    }) || payment.contribs[0]
    return contrib?.agentRecouvrementId ?? payment?.agentRecouvrementId ?? ''
  }, [paymentDetails, selectedDate])
  const { data: agentRecouvrementDetails } = useAgentRecouvrement(detailsModalAgentId || undefined)
  const [editingContribution, setEditingContribution] = useState<any>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentTime, setPaymentTime] = useState('')
  const [paymentMode, setPaymentMode] = useState<'airtel_money' | 'mobicash' | 'cash' | 'bank_transfer'>('airtel_money')
  const [paymentFile, setPaymentFile] = useState<File | undefined>()
  const [selectedGroupMemberId, setSelectedGroupMemberId] = useState<string>('')
  const [agentRecouvrementId, setAgentRecouvrementId] = useState<string>('')
  /** Motif de la modification (modal Modifier le versement, journalier) */
  const [editModificationReason, setEditModificationReason] = useState<string>('')
  const [isEditing, setIsEditing] = useState(false)
  const [isPaying, setIsPaying] = useState(false)
  const [isRefunding, setIsRefunding] = useState(false)
  // Formulaire de retrait anticipé avec React Hook Form
  const earlyRefundForm = useForm<EarlyRefundFormData>({
    resolver: zodResolver(earlyRefundSchema),
    defaultValues: earlyRefundDefaultValues
  })
  const [confirmApproveId, setConfirmApproveId] = useState<string | null>(null)
  const [confirmDeleteDocumentId, setConfirmDeleteDocumentId] = useState<string | null>(null)
  const [confirmPaidId, setConfirmPaidId] = useState<string | null>(null)
  const [confirmDeletePaymentId, setConfirmDeletePaymentId] = useState<string | null>(null)
  const deletePaymentMutation = useDeleteContractPayment()
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [showRemboursementPdf, setShowRemboursementPdf] = useState(false)
  const [showPdfViewer, setShowPdfViewer] = useState(false)
  const [currentRefundId, setCurrentRefundId] = useState<string | null>(null)
  const [currentDocument, setCurrentDocument] = useState<RefundDocument | null>(null)
  const [refunds, setRefunds] = useState<any[]>([])
  const [showReasonModal, setShowReasonModal] = useState(false)
  const [refundType, setRefundType] = useState<'FINAL' | 'EARLY' | null>(null)
  const [refundReasonInput, setRefundReasonInput] = useState('')
  const [refundFile, setRefundFile] = useState<File | undefined>()
  const [refundDate, setRefundDate] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })
  const [refundTime, setRefundTime] = useState(() => {
    const now = new Date()
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
  })

  const settings = useActiveCaisseSettingsByType((data as any)?.caisseType)

  // Fonction pour recharger les remboursements
  const reloadRefunds = React.useCallback(async () => {
    if (id) {
      try {
        const refundsData = await listRefunds(id)
        setRefunds(refundsData)
      } catch (error) {
        console.error('Error loading refunds:', error)
      }
    }
  }, [id])

  // Load refunds from subcollection
  useEffect(() => {
    reloadRefunds()
  }, [reloadRefunds])

  // Calculer les jours de retard et les pénalités
  const calculateLatePaymentInfo = (selectedDate: Date | null): { daysLate: number; penalty: number; hasPenalty: boolean } | null => {
    if (!selectedDate || !data) return null

    const paymentDate = new Date(selectedDate)
    paymentDate.setHours(0, 0, 0, 0)

    // Déterminer la date de référence (nextDueAt ou contractStartAt pour le 1er versement)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let referenceDate: Date
    if (data.nextDueAt) {
      referenceDate = new Date(data.nextDueAt)
    } else {
      // Premier versement : utiliser contractStartAt
      referenceDate = data.contractStartAt ? new Date(data.contractStartAt) : today
    }
    referenceDate.setHours(0, 0, 0, 0)

    // Calculer le nombre de jours de retard par rapport à la date d'échéance
    const diffTime = paymentDate.getTime() - referenceDate.getTime()
    const daysLate = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    // Pas de retard si paiement avant ou à la date d'échéance
    if (daysLate <= 0) return null

    // Calculer les pénalités (à partir du 4ème jour)
    let penalty = 0
    if (daysLate >= 4 && settings.data?.penaltyRules?.day4To12?.perDay) {
      const penaltyRate = settings.data.penaltyRules.day4To12.perDay / 100
      penalty = penaltyRate * (data.monthlyAmount || 0) * daysLate
    }

    return {
      daysLate,
      penalty,
      hasPenalty: daysLate >= 4
    }
  }

  const latePaymentInfo = calculateLatePaymentInfo(selectedDate)

  // Synchroniser les valeurs existantes quand les données sont chargées
  useEffect(() => {
    if (data && refunds.length > 0) {
      // Trouver le remboursement en attente d'approbation
      const pendingRefund = refunds.find((r: any) => r.status === 'APPROVED')
      if (pendingRefund) {
        // Synchroniser les valeurs existantes dans le formulaire (sans reason qui est déjà saisi)
        const formData: Partial<EarlyRefundFormData> = {}

        if (pendingRefund.withdrawalDate) {
          try {
            const date = new Date(pendingRefund.withdrawalDate)
            if (!isNaN(date.getTime())) {
              formData.withdrawalDate = date.toISOString().split('T')[0]
            }
          } catch (error) {
            console.log('Erreur parsing date existante:', error)
          }
        }

        if (pendingRefund.withdrawalTime && pendingRefund.withdrawalTime !== '--:--' && pendingRefund.withdrawalTime !== 'undefined') {
          formData.withdrawalTime = pendingRefund.withdrawalTime
        }

        // Mettre à jour le formulaire avec les valeurs existantes
        if (Object.keys(formData).length > 0) {
          earlyRefundForm.reset({
            ...earlyRefundDefaultValues,
            ...formData
          })
        }
      }
    }
  }, [data, earlyRefundForm])

  if (isLoading) return <div className="p-4">Chargement…</div>
  if (isError) return <div className="p-4 text-red-600">Erreur de chargement du contrat: {(error as any)?.message}</div>
  if (!data) return <div className="p-4">Contrat introuvable</div>

  // Récupérer les membres du groupe si c'est un contrat de groupe
  const groupeId = (data as any).groupeId || ((data as any).memberId && (data as any).memberId.length > 20 ? (data as any).memberId : null)
  const { data: groupMembers } = useGroupMembers(groupeId, isGroupContract)

  // Calculer la progression des mois payés
  const payments = data?.payments || []
  const paidCount = payments.filter((payment: any) => payment.status === 'PAID').length
  const progress = totalMonths > 0 ? Math.min(100, (paidCount / totalMonths) * 100) : 0

  // Le bonus accumulé est déjà calculé et stocké dans bonusAccrued lors des paiements
  const currentBonus = data.bonusAccrued || 0

  const isClosed = data.status === 'CLOSED' || data.status === 'RESCINDED'
  const headerStatusConfig = getContractStatusConfig(data.status)
  const HeaderStatusIcon = headerStatusConfig.icon
  const headerBadges = (
    <>
      <Badge className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] text-white text-lg px-4 py-2">
        {isGroupContract ? 'Contrat de Groupe' : 'Contrat Journalier'}
      </Badge>
      <Badge className={`${headerStatusConfig.bg} ${headerStatusConfig.text} text-lg px-4 py-2 flex items-center gap-1.5`}>
        <HeaderStatusIcon className="h-4 w-4" />
        {headerStatusConfig.label}
      </Badge>
      {isClosed && (
        <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white text-lg px-4 py-2 flex items-center gap-1.5">
          <XCircle className="h-4 w-4" />
          Contrat fermé
        </Badge>
      )}
    </>
  )

  // Calculer le nominal payé en sommant tous les montants versés par mois
  const nominalPaid: number = Array.from({ length: totalMonths }).reduce((sum: number, _, monthIndex: number) => {
    return sum + getTotalForMonth(monthIndex)
  }, 0)

  const handlePdfUpload = async (document: RefundDocument | null) => {
    // Le document est maintenant persisté dans la base de données
    // On peut fermer le modal et rafraîchir les données
    setShowPdfModal(false)
    await refetch()
    await reloadRefunds() // Rafraîchir la liste des remboursements
  }

  const handleViewDocument = (refundId: string, document: RefundDocument) => {
    if (!document) {
      toast.error('Aucun document à afficher')
      return
    }
    setCurrentRefundId(refundId)
    setCurrentDocument(document)
    setShowPdfViewer(true)
  }

  const handleOpenPdfModal = (refundId: string) => {
    setCurrentRefundId(refundId)
    setShowPdfModal(true)
  }

  const _handleDeleteDocument = async (refundId: string) => {
    try {
      const { updateRefund } = await import('@/db/caisse/refunds.db')

      await updateRefund(id, refundId, {
        document: null,
        updatedBy: user?.uid,
        documentDeletedAt: new Date()
      })

      await reloadRefunds() // Rafraîchir la liste des remboursements
      toast.success("Document supprimé avec succès")
    } catch (error: any) {
      console.error('Error deleting document:', error)
      toast.error(error?.message || "Erreur lors de la suppression du document")
    } finally {
      setConfirmDeleteDocumentId(null)
    }
  }

  // Export PDF "Détails du versement" : même format que la page versements (bouton PDF)
  const exportPaymentDetailsToPDF = async () => {
    if (!paymentDetails) {
      toast.error('Aucun détail de versement à exporter')
      return
    }
    try {
      toast.info('Génération du PDF en cours...')
      const { generateSingleVersementPDF } = await import('@/services/caisse/versementPdfExport')
      await generateSingleVersementPDF({
        contract: data,
        contractId: id,
        member: member ?? undefined,
        group: undefined,
        payments: (data as any)?.payments ?? [],
        payment: paymentDetails,
        getAdminDisplayName: (adminId) => adminId || '—',
      })
      toast.success('PDF téléchargé avec succès')
    } catch (error: any) {
      console.error('Erreur lors de la génération du PDF:', error)
      toast.error('Erreur lors de la génération du PDF')
    }
  }

  const onDateClick = async (date: Date) => {
    if (isClosed) return

    // Vérifier si la date est antérieure au premier versement
    const firstPaymentDate = data.contractStartAt ? new Date(data.contractStartAt) : new Date()
    firstPaymentDate.setHours(0, 0, 0, 0)
    const selectedDateStart = new Date(date)
    selectedDateStart.setHours(0, 0, 0, 0)

    if (selectedDateStart < firstPaymentDate) {
      toast.error('Impossible de verser sur une date antérieure au premier versement')
      return
    }

    setSelectedDate(date)

    // Utiliser les données locales au lieu d'appeler Firestore
    const existingPayment = getPaymentForDate(date)

    if (existingPayment) {
      console.log('✅ Paiement trouvé localement:', existingPayment)

      if (isGroupContract) {
        // Pour les contrats de groupe, permettre d'ajouter de nouvelles contributions
        // ou de voir les détails existants
        setPaymentDetails(existingPayment)
        setShowPaymentDetailsModal(true)
      } else {
        // Pour les contrats individuels, afficher les détails
        setPaymentDetails(existingPayment)
        setShowPaymentDetailsModal(true)
      }
    } else {
      console.log('❌ Aucun paiement trouvé, affichage du formulaire de création')
      // Créer un nouveau versement
      setPaymentDetails(null)
      // Initialiser l'heure actuelle par défaut
      const now = new Date()
      setPaymentTime(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`)
      setShowPaymentModal(true)
    }
  }

  const onPaymentSubmit = async () => {
    console.log('💰 Soumission du versement...')
    console.log('📋 Données du formulaire:', {
      selectedDate,
      paymentAmount,
      paymentTime,
      paymentFile: paymentFile ? {
        name: paymentFile.name,
        type: paymentFile.type,
        size: paymentFile.size
      } : 'undefined',
      paymentMode
    })

    if (!selectedDate || !paymentAmount || !paymentTime || !paymentFile) {
      console.error('❌ Champs manquants:', {
        selectedDate: !!selectedDate,
        paymentAmount: !!paymentAmount,
        paymentTime: !!paymentTime,
        paymentFile: !!paymentFile
      })
      toast.error('Veuillez remplir tous les champs')
      return
    }

    const amount = Number(paymentAmount)
    if (amount <= 0) {
      toast.error('Le montant doit être positif')
      return
    }

    try {
      setIsPaying(true)
      console.log('🚀 Envoi du versement à la base de données...')

      // Trouver le mois correspondant à la date sélectionnée
      const monthIndex = getMonthIndexFromStart(selectedDate)
      if (monthIndex === null || monthIndex < 0) {
        toast.error('Date de versement invalide')
        setIsPaying(false)
        return
      }

      if (isGroupContract && groupMembers) {
        // Utiliser la nouvelle fonction payGroup pour les contrats de groupe
        const selectedMember = groupMembers.find(m => m.id === selectedGroupMemberId)
        if (!selectedMember) {
          toast.error('Membre du groupe non trouvé')
          return
        }

        const { payGroup } = await import('@/services/caisse/mutations')
        console.log('📤 Envoi payGroup avec file:', paymentFile?.name)
        await payGroup({
          contractId: id,
          dueMonthIndex: monthIndex,
          memberId: selectedMember.id,
          memberName: `${selectedMember.firstName} ${selectedMember.lastName}`,
          memberMatricule: selectedMember.matricule || '',
          memberPhotoURL: selectedMember.photoURL || undefined,
          memberContacts: selectedMember.contacts || [],
          amount,
          file: paymentFile,
          paidAt: selectedDate,
          time: paymentTime,
          mode: paymentMode as 'airtel_money' | 'mobicash' | 'cash' | 'bank_transfer',
          agentRecouvrementId: agentRecouvrementId || undefined
        })

        console.log('✅ payGroup terminé avec succès')
        toast.success('Contribution ajoutée au versement collectif')
      } else {
        // Utiliser la fonction pay normale pour les contrats individuels
        const { pay } = await import('@/services/caisse/mutations')
        console.log('📤 Envoi pay avec file:', paymentFile?.name)
        await pay({
          contractId: id,
          dueMonthIndex: monthIndex,
          memberId: data.memberId,
          amount,
          file: paymentFile,
          paidAt: selectedDate,
          time: paymentTime,
          mode: paymentMode as 'airtel_money' | 'mobicash' | 'cash' | 'bank_transfer',
          agentRecouvrementId: agentRecouvrementId || undefined
        })

        console.log('✅ pay terminé avec succès')
        toast.success('Versement enregistré')
      }

      queryClient.invalidateQueries({ queryKey: ['caisse-contract', id] })
      await new Promise((r) => setTimeout(r, 300))
      await refetch()
      setShowPaymentModal(false)
      setSelectedDate(null)
      setPaymentAmount('')
      setPaymentTime('')
      setPaymentMode('airtel_money')
      setPaymentFile(undefined)
      setSelectedGroupMemberId('')
      setAgentRecouvrementId('')
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors de l\'enregistrement')
    } finally {
      setIsPaying(false)
    }
  }

  const onEditPaymentSubmit = async () => {
    if (!editingContribution || !paymentAmount || !paymentTime) {
      toast.error('Veuillez remplir tous les champs obligatoires')
      return
    }
    if (!editModificationReason?.trim()) {
      toast.error('Veuillez indiquer le motif de la modification')
      return
    }

    const amount = Number(paymentAmount)
    if (amount <= 0) {
      toast.error('Le montant doit être positif')
      return
    }

    try {
      setIsEditing(true)

      if (isGroupContract) {
        toast.error('Pour les contrats de groupe, vous ne pouvez pas modifier les contributions. Supprimez et recréez si nécessaire.')
        setShowEditPaymentModal(false)
        setEditingContribution(null)
        return
      }

      const paidAt = selectedDate
        ? new Date(`${selectedDate.toISOString().split('T')[0]}T${paymentTime}`)
        : undefined
      await updatePaymentContribution({
        contractId: id,
        paymentId: paymentDetails.id,
        contributionId: editingContribution.id,
        updates: {
          amount,
          time: paymentTime,
          mode: paymentMode as 'airtel_money' | 'mobicash' | 'cash' | 'bank_transfer',
          proofFile: paymentFile,
          modificationReason: editModificationReason.trim(),
          ...(paidAt && { paidAt }),
        },
      })

      queryClient.invalidateQueries({ queryKey: ['caisse-contract', id] })
      await refetch()
      toast.success('Versement modifié avec succès')
      setShowEditPaymentModal(false)
      setEditingContribution(null)
      setPaymentAmount('')
      setPaymentTime('')
      setPaymentMode('airtel_money')
      setPaymentFile(undefined)
      setEditModificationReason('')
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors de la modification')
    } finally {
      setIsEditing(false)
    }
  }

  const currentRefund = useMemo(() => {
    return currentRefundId ? refunds.find((r: any) => r.id === currentRefundId) : null
  }, [currentRefundId, refunds])

  const documentMemberId = useMemo(() => {
    if ((data as any).memberId) return (data as any).memberId
    if ((data as any).groupeId) return `GROUP_${(data as any).groupeId}`
    return ''
  }, [data])

  useEffect(() => {
    if (contractStartDate) {
      setCurrentMonth(contractStartDate)
    }
  }, [contractStartDate])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 lg:p-8 overflow-x-hidden">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* En-tête avec bouton retour */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              variant="outline"
              onClick={() => router.push(routes.admin.caisseSpeciale)}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour à la liste
            </Button>
            
            <Button
              variant="outline"
              onClick={() => router.push(routes.admin.caisseSpecialeContractPayments(id))}
              className="gap-2 border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              <History className="h-4 w-4" />
              Historique des versements
            </Button>

            <EmergencyContact emergencyContact={(data as any)?.emergencyContact} />
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
              <Calendar className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 shrink-0" />
              <span className="break-words">{member?.firstName || ''} {member?.lastName || ''}</span>
            </CardTitle>
            <div className="space-y-1 text-blue-100 break-words">
              <p className="text-sm sm:text-base lg:text-lg break-words">
                Contrat <span className="font-mono text-xs sm:text-sm break-all">#{id}</span>
              </p>
              <p className="text-sm break-words">
                {member?.firstName || ''} {member?.lastName || ''} - Objectif mensuel: <span className="font-mono text-xs break-all">Libre</span>
              </p>
              <p className="text-xs break-words">
                Type de caisse: <span className="font-mono">{String((data as any).caisseType)}</span>
              </p>
          </div>
          </CardHeader>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <StatCard icon={CreditCard} label="Montant mensuel" value="Libre" accent="brand" />
          <StatCard icon={Clock} label="Durée (mois)" value={data.monthsPlanned || 0} />
          <StatCard icon={CheckCircle2} label="Nominal payé" value={`${formatAmount(nominalPaid)} FCFA`} />
          <StatCard icon={CalendarDays} label="Bonus" value={`${formatAmount(currentBonus)} FCFA`} accent="emerald" />
          <StatCard icon={AlertTriangle} label="Pénalités cumulées" value={`${formatAmount(data.penaltiesTotal || 0)} FCFA`} accent="red" />
          <StatCard icon={CalendarDays} label="Prochaine échéance" value={data.nextDueAt ? new Date(data.nextDueAt).toLocaleDateString("fr-FR") : "—"} />
        </div>

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
              Montant payé&nbsp;: <b>{formatAmount(nominalPaid)} FCFA</b>
            </div>
          </CardContent>
        </Card>

        {/* Outils de test (DEV uniquement) */}
        <TestPaymentTools
          contractId={id}
          contractData={data}
          onPaymentSuccess={async () => {
            await refetch()
          }}
        />

      <ContractCalendarGrid
        month={currentMonth}
        daysWithStatus={daysWithStatus}
        onDayClick={onDateClick}
        onPrevMonth={() => {
          const prev = new Date(currentMonth)
          prev.setMonth(prev.getMonth() - 1)
          setCurrentMonth(prev)
        }}
        onNextMonth={() => {
          const next = new Date(currentMonth)
          next.setMonth(next.getMonth() + 1)
          setCurrentMonth(next)
        }}
        disabled={isClosed}
      />

      {/* Résumé mensuel */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        {Array.from({ length: totalMonths }).map((_, monthIndex) => {
          const total = getTotalForMonth(monthIndex)
          const status = getMonthStatus(monthIndex)
          const target = data.monthlyAmount || 0
          const percentage = target > 0 ? Math.min(100, (total / target) * 100) : 0

          return (
            <Card key={monthIndex} className="shadow-lg border-gray-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-base lg:text-lg flex items-center gap-2">
                  <Calendar className="h-4 w-4 lg:h-5 lg:w-5 text-blue-600" />
                  Mois {monthIndex + 1}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(() => {
                  const range = getMonthDateRange(monthIndex)
                  if (!range) return null
                  return (
                    <div className="text-xs text-gray-500">
                      {range.start.toLocaleDateString('fr-FR')} → {range.end.toLocaleDateString('fr-FR')}
                    </div>
                  )
                })()}
                <div className="flex items-center justify-between">
                  <span className="text-xs lg:text-sm text-gray-600">Objectif</span>
                  <span className="text-sm lg:text-base font-semibold">{formatAmount(target)} FCFA</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs lg:text-sm text-gray-600">Versé</span>
                  <span className="text-sm lg:text-base font-semibold text-green-600">{formatAmount(total)} FCFA</span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs lg:text-sm">
                    <span>Progression</span>
                    <span>{percentage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${percentage >= 100 ? 'bg-green-500' : percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      status === 'PAID' ? 'default' :
                        status === 'PARTIAL' ? 'secondary' :
                          status === 'DUE' ? 'secondary' : 'destructive'
                    }
                    className="text-xs"
                  >
                    {status === 'PAID' ? 'Complété' : status === 'PARTIAL' ? 'Partiel' : status === 'DUE' ? 'En cours' : status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

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
          {(() => {
            const payments = data.payments || []
            const paidCount = payments.filter((x: any) => x.status === 'PAID').length
            const allPaid = payments.length > 0 && paidCount === payments.length

            // Pour DailyContract : vérifier s'il y a au moins 1 versement (contribution)
            const hasAtLeastOneContribution = payments.some((p: any) => {
              if (isGroupContract) {
                return p.groupContributions && p.groupContributions.length > 0
              } else {
                return p.contribs && p.contribs.length > 0
              }
            })

            const canEarly = hasAtLeastOneContribution && !allPaid
            const hasFinalRefund = refunds.some((r: any) => r.type === 'FINAL' && r.status !== 'ARCHIVED') || data.status === 'FINAL_REFUND_PENDING' || data.status === 'CLOSED'
            const hasEarlyRefund = refunds.some((r: any) => r.type === 'EARLY' && r.status !== 'ARCHIVED') || data.status === 'EARLY_REFUND_PENDING'
                
                // Vérifier si une demande de retrait anticipé ou remboursement final est active (PENDING ou APPROVED)
                const hasActiveRefund = refunds.some((r: any) => 
                  (r.type === 'EARLY' || r.type === 'FINAL') && 
                  (r.status === 'PENDING' || r.status === 'APPROVED')
                )

            return (
              <>
                <Button
                      variant="outline"
                      className="flex items-center justify-center gap-2 border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                  disabled={isRefunding || !allPaid || hasFinalRefund}
                  onClick={() => {
                    setRefundType('FINAL')
                    setRefundReasonInput('')
                    setShowReasonModal(true)
                  }}
                >
                      <TrendingUp className="h-5 w-5" />
                      Demander remboursement final
                </Button>

                <Button
                  variant="outline"
                      className="flex items-center justify-center gap-2 border-orange-300 text-orange-700 hover:bg-orange-50"
                  disabled={isRefunding || !canEarly || hasEarlyRefund}
                  onClick={() => {
                    setRefundType('EARLY')
                    setRefundReasonInput('')
                    setShowReasonModal(true)
                  }}
                >
                      <Download className="h-5 w-5" />
                      Demander retrait anticipé
                </Button>

                <Button
                  variant="outline"
                      className="flex items-center justify-center gap-2 border-green-300 text-green-700 hover:bg-green-50"
                      disabled={!hasActiveRefund}
                  onClick={() => setShowRemboursementPdf(true)}
                >
                      <FileText className="h-5 w-5" />
                      Générer la quittance
                </Button>
              </>
            )
          })()}
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

                      <div className="space-y-3 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Montant nominal:</span>
                          <span className="font-semibold">{formatAmount(r.amountNominal || 0)} FCFA</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Bonus:</span>
                          <span className="font-semibold">{formatAmount(r.amountBonus || 0)} FCFA</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Échéance:</span>
                          <span className="font-semibold">{r.deadlineAt ? new Date(r.deadlineAt).toLocaleDateString('fr-FR') : '—'}</span>
                        </div>
                </div>

                  {r.status === 'PENDING' && (
                        <div className="space-y-2">
                          {/* Première ligne : Approbation et Document de remboursement */}
                    <div className="flex flex-col sm:flex-row gap-2">
                            <button 
                              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => setConfirmApproveId(r.id)}
                        disabled={(r.type === 'FINAL' && !r.document) || (r.type === 'EARLY' && !r.document)}
                      >
                        Approuver
                            </button>
                      {(r.type === 'FINAL' || r.type === 'EARLY') && (
                              <button 
                                className="flex-1 px-4 py-2 border border-green-300 text-green-600 rounded-lg hover:bg-green-50 transition-colors duration-200 font-medium flex items-center justify-center gap-2"
                            onClick={() => setShowRemboursementPdf(true)}
                          >
                            <FileText className="h-4 w-4" />
                            Document de remboursement
                              </button>
                            )}
                          </div>

                          {/* Deuxième ligne : Actions sur le PDF */}
                          {(r.type === 'FINAL' || r.type === 'EARLY') && (
                            <div className="flex flex-col sm:flex-row gap-2">
                          {r.document ? (
                            <>
                                  <button 
                                    className="flex-1 px-4 py-2 border border-green-300 text-green-600 rounded-lg hover:bg-green-50 transition-colors duration-200 font-medium flex items-center justify-center gap-2"
                                onClick={() => handleViewDocument(r.id, r.document)}
                              >
                                <Eye className="h-4 w-4" />
                                Voir PDF
                                  </button>
                                  <button 
                                    className="flex-1 px-4 py-2 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors duration-200 font-medium flex items-center justify-center gap-2"
                                onClick={() => handleOpenPdfModal(r.id)}
                              >
                                <FileText className="h-4 w-4" />
                                Remplacer PDF
                                  </button>
                                  <button 
                                    className="flex-1 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors duration-200 font-medium flex items-center justify-center gap-2"
                                onClick={() => setConfirmDeleteDocumentId(r.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                                Supprimer
                                  </button>
                            </>
                          ) : (
                                <button 
                                  className="flex-1 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors duration-200 font-medium flex items-center justify-center gap-2"
                              onClick={() => handleOpenPdfModal(r.id)}
                            >
                              <FileText className="h-4 w-4" />
                              Ajouter PDF
                                </button>
                          )}
                            </div>
                      )}

                          {/* Troisième ligne : Annulation (si applicable) */}
                      {r.type === 'EARLY' && !r.document && (
                            <button 
                              className="w-full px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors duration-200 font-medium"
                          onClick={async () => {
                            try {
                                  await cancelEarlyRefund(id, r.id); 
                                  await refetch();
                                  await reloadRefunds(); // Rafraîchir la liste des remboursements
                              toast.success('Demande anticipée annulée')
                                } catch(e: any) { 
                              toast.error(e?.message || 'Annulation impossible')
                            }
                          }}
                        >
                              Annuler la demande
                            </button>
                      )}
                    </div>
                  )}

                  {r.status === 'APPROVED' && (
                        <div className="space-y-4">
                      {/* Affichage de la cause (non modifiable) */}
                      {r.reason && (
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <label className="block text-xs text-blue-700 font-medium mb-1">Cause du retrait:</label>
                          <p className="text-sm text-blue-900">{r.reason}</p>
                        </div>
                      )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Date du retrait *</label>
                                <input
                                      type="date"
                                  value={refundDate}
                                  onChange={(e) => setRefundDate(e.target.value)}
                                  className="w-full p-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#234D65]/20 focus:border-[#234D65] transition-all duration-200"
                                />
                              </div>
                              
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Heure du retrait *</label>
                                <input
                                      type="time"
                                  value={refundTime}
                                  onChange={(e) => setRefundTime(e.target.value)}
                                  className="w-full p-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#234D65]/20 focus:border-[#234D65] transition-all duration-200"
                                />
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-2">Preuve du retrait *</label>
                            <input
                                      type="file"
                                      accept="image/*"
                                      onChange={async (e) => {
                                const f = e.target.files?.[0]
                                if (!f) {
                                  setRefundFile(undefined)
                                          return
                                        }
                                if (!f.type.startsWith('image/')) {
                                          toast.error('La preuve doit être une image (JPG, PNG, WebP...)')
                                  setRefundFile(undefined)
                                          return
                                        }
                                setRefundFile(f)
                                        toast.success('Preuve PDF sélectionnée')
                                      }}
                              className="w-full p-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#234D65]/20 focus:border-[#234D65] transition-all duration-200"
                            />
                          </div>

                          <button 
                            className="w-full px-4 py-3 bg-gradient-to-r from-[#234D65] to-[#2c5a73] text-white rounded-lg hover:shadow-lg hover:shadow-[#234D65]/25 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2" 
                            disabled={(() => {
                              const hasFile = !!refundFile
                              const hasDate = refundDate || r.withdrawalDate
                              const hasTime = (refundTime && refundTime.trim()) || (r.withdrawalTime && r.withdrawalTime.trim() && r.withdrawalTime !== '--:--')
                              return !hasFile || !hasDate || !hasTime
                            })()}
                            onClick={async () => { 
                              try {
                                const normalizeDate = (dateValue: any): string | null => {
                                  if (!dateValue) return null
                                  try {
                                    let date: Date
                                    if (dateValue && typeof dateValue.toDate === 'function') {
                                      date = dateValue.toDate()
                                    } else if (dateValue instanceof Date) {
                                      date = dateValue
                                    } else if (typeof dateValue === 'string') {
                                      date = new Date(dateValue)
                                    } else {
                                      date = new Date(dateValue)
                                    }
                                    return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0]
                                  } catch {
                                    return null
                                  }
                                }
                                
                                await markRefundPaid(id, r.id, refundFile, {
                                  reason: r.reason,
                                  withdrawalDate: refundDate || normalizeDate(r.withdrawalDate) || undefined,
                                  withdrawalTime: refundTime || r.withdrawalTime
                                })
                                setRefundDate('')
                                setRefundTime('')
                                setRefundFile(undefined)
                                setConfirmPaidId(null)
                                await refetch()
                                await reloadRefunds() // Rafraîchir la liste des remboursements
                                toast.success('Remboursement marqué payé')
                              } catch (error: any) {
                                toast.error(error?.message || 'Erreur lors du marquage')
                              }
                            }}
                          >
                            <CheckCircle className="h-5 w-5" />
                            Marquer comme payé
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })
                  )}
                </div>
              </CardContent>
            </Card>
      </div>

      {/* Modal de versement */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-[#224D62] flex items-center gap-2">
              <DollarSign className="h-6 w-6" />
              Nouveau versement
            </DialogTitle>
            <DialogDescription>
              Enregistrer un versement pour le {selectedDate?.toLocaleDateString('fr-FR')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Date et Heure */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date" className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  Date de paiement *
                  <span className="text-xs text-muted-foreground">(fixe)</span>
                </Label>
                <Input
                  id="date"
                  type="text"
                  value={selectedDate?.toLocaleDateString('fr-FR') || ''}
                  disabled
                  className="w-full bg-gray-100 cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  📅 La date correspond au jour sélectionné dans le calendrier
                </p>
              </div>

              <div>
                <Label htmlFor="time" className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Heure de paiement *
                </Label>
                <Input
                  id="time"
                  type="time"
                  value={paymentTime}
                  onChange={(e) => setPaymentTime(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Montant */}
            <div>
              <Label htmlFor="amount" className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                Montant du versement (FCFA) *
              </Label>
              <Input
                id="amount"
                type="number"
                placeholder="Ex: 10000"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                min="100"
                step="100"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                💡 Pour les paiements quotidiens, le montant peut varier chaque jour. Montant minimum: 100 FCFA
              </p>
            </div>

            {/* Agent de recouvrement */}
            <div>
              <Label className="flex items-center gap-2 mb-2">
                Agent de recouvrement (optionnel)
              </Label>
              <AgentRecouvrementSelect
                value={agentRecouvrementId}
                onValueChange={setAgentRecouvrementId}
                placeholder="Sélectionner l'agent ayant collecté le versement"
                required={false}
              />
            </div>

            {/* Sélection du membre du groupe (si contrat de groupe) */}
            {isGroupContract && (
              <Alert className="border-blue-200 bg-blue-50">
                <AlertTriangle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-700">
                  <div className="space-y-2">
                    <strong>Membre du groupe qui verse *</strong>
                    <Select value={selectedGroupMemberId} onValueChange={setSelectedGroupMemberId}>
                      <SelectTrigger className="w-full mt-2">
                        <SelectValue placeholder="Sélectionnez le membre qui verse" />
                      </SelectTrigger>
                      <SelectContent>
                        {groupMembers && groupMembers.length > 0 ? (
                          groupMembers.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.firstName} {member.lastName} ({member.matricule})
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="" disabled>
                            Chargement des membres du groupe...
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-blue-600 mt-1">
                      Ce champ permet de tracer qui a effectué le versement dans le groupe
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Mode de paiement */}
            <div>
              <Label className="flex items-center gap-2 mb-3">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                Mode de paiement *
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="relative flex items-center p-4 border-2 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors duration-200 has-[:checked]:border-[#224D62] has-[:checked]:bg-[#224D62]/5">
                  <input
                    type="radio"
                    name="paymentMode"
                    value="airtel_money"
                    checked={paymentMode === 'airtel_money'}
                    onChange={(e) => setPaymentMode(e.target.value as 'airtel_money' | 'mobicash' | 'cash' | 'bank_transfer')}
                    className="text-[#224D62] focus:ring-[#224D62]"
                  />
                  <div className="ml-3 flex items-center gap-3">
                    <div className="bg-red-100 rounded-lg p-2">
                      <Smartphone className="h-5 w-5 text-red-600" />
                    </div>
                    <span className="font-medium text-gray-900">Airtel Money</span>
                  </div>
                </label>

                <label className="relative flex items-center p-4 border-2 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors duration-200 has-[:checked]:border-[#224D62] has-[:checked]:bg-[#224D62]/5">
                  <input
                    type="radio"
                    name="paymentMode"
                    value="mobicash"
                    checked={paymentMode === 'mobicash'}
                    onChange={(e) => setPaymentMode(e.target.value as 'airtel_money' | 'mobicash' | 'cash' | 'bank_transfer')}
                    className="text-[#224D62] focus:ring-[#224D62]"
                  />
                  <div className="ml-3 flex items-center gap-3">
                    <div className="bg-blue-100 rounded-lg p-2">
                      <Banknote className="h-5 w-5 text-blue-600" />
                    </div>
                    <span className="font-medium text-gray-900">Mobicash</span>
                  </div>
                </label>

                <label className="relative flex items-center p-4 border-2 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors duration-200 has-[:checked]:border-[#224D62] has-[:checked]:bg-[#224D62]/5">
                  <input
                    type="radio"
                    name="paymentMode"
                    value="cash"
                    checked={paymentMode === 'cash'}
                    onChange={(e) => setPaymentMode(e.target.value as 'airtel_money' | 'mobicash' | 'cash' | 'bank_transfer')}
                    className="text-[#224D62] focus:ring-[#224D62]"
                  />
                  <div className="ml-3 flex items-center gap-3">
                    <div className="bg-green-100 rounded-lg p-2">
                      <DollarSign className="h-5 w-5 text-green-600" />
                    </div>
                    <span className="font-medium text-gray-900">Espèce</span>
                  </div>
                </label>

                <label className="relative flex items-center p-4 border-2 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors duration-200 has-[:checked]:border-[#224D62] has-[:checked]:bg-[#224D62]/5">
                  <input
                    type="radio"
                    name="paymentMode"
                    value="bank_transfer"
                    checked={paymentMode === 'bank_transfer'}
                    onChange={(e) => setPaymentMode(e.target.value as 'airtel_money' | 'mobicash' | 'cash' | 'bank_transfer')}
                    className="text-[#224D62] focus:ring-[#224D62]"
                  />
                  <div className="ml-3 flex items-center gap-3">
                    <div className="bg-purple-100 rounded-lg p-2">
                      <Building2 className="h-5 w-5 text-purple-600" />
                    </div>
                    <span className="font-medium text-gray-900">Virement bancaire</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Preuve de paiement */}
            <div>
              <Label htmlFor="proof" className="flex items-center gap-2 mb-2">
                <Upload className="h-4 w-4 text-muted-foreground" />
                Preuve de paiement *
              </Label>
              <Input
                id="proof"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  console.log('📎 Fichier sélectionné:', file)
                  if (!file) {
                    console.log('❌ Aucun fichier sélectionné')
                    setPaymentFile(undefined)
                    return
                  }
                  if (file.size > 5 * 1024 * 1024) {
                    console.log('❌ Fichier trop volumineux:', file.size, 'bytes')
                    toast.error('Le fichier ne doit pas dépasser 5 MB')
                    e.target.value = ''
                    setPaymentFile(undefined)
                    return
                  }
                  console.log('✅ Fichier accepté:', {
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    lastModified: new Date(file.lastModified).toLocaleString()
                  })
                  setPaymentFile(file)
                  toast.success(`Image "${file.name}" sélectionnée`)
                }}
                disabled={isPaying}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Formats acceptés : JPEG, PNG, WebP (max 5 MB)
              </p>
              
              {paymentFile && (
                <Alert className="mt-2 border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700">
                    <strong>{paymentFile.name}</strong> ({(paymentFile.size / 1024).toFixed(2)} KB)
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Indicateur de retard et pénalités */}
            {latePaymentInfo && (
              <Alert className={latePaymentInfo.hasPenalty
                  ? 'border-red-300 bg-red-50'
                  : 'border-orange-300 bg-orange-50'
                }>
                <AlertCircle className={`h-4 w-4 ${latePaymentInfo.hasPenalty ? 'text-red-600' : 'text-orange-600'}`} />
                <AlertDescription className={latePaymentInfo.hasPenalty ? 'text-red-700' : 'text-orange-700'}>
                  <strong>Paiement en retard</strong>
                  <br />
                  Ce paiement est effectué avec <strong>{latePaymentInfo.daysLate} jour(s) de retard</strong>
                  {latePaymentInfo.hasPenalty && (
                    <>
                      <br />
                      <strong className="text-red-900">Pénalités : {formatAmount(latePaymentInfo.penalty)} FCFA</strong>
                      <br />
                      <span className="text-xs">Appliquées à partir du 4ème jour</span>
                    </>
                  )}
                  {!latePaymentInfo.hasPenalty && (
                    <>
                      <br />
                      <span className="text-xs">⚠️ Période de tolérance (jours 1-3)</span>
                    </>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowPaymentModal(false)
                setSelectedGroupMemberId('')
              }}
              disabled={isPaying}
            >
              Annuler
            </Button>
            <Button
              type="button"
              onClick={onPaymentSubmit}
              disabled={isPaying || !paymentAmount || !paymentTime || !paymentFile}
              className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65]"
            >
              {isPaying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <DollarSign className="h-4 w-4 mr-2" />
                  Enregistrer le versement
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal des détails du versement */}
      <Dialog open={showPaymentDetailsModal} onOpenChange={setShowPaymentDetailsModal}>
        <DialogContent className="w-[95vw] max-w-lg mx-auto max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <DialogTitle className="text-lg lg:text-xl">Détails du versement</DialogTitle>
                <DialogDescription className="text-sm lg:text-base">
                  Versement du {selectedDate?.toLocaleDateString('fr-FR')}
                </DialogDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={exportPaymentDetailsToPDF}
                className="flex items-center gap-2 border-green-300 text-green-700 hover:bg-green-50"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">PDF</span>
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto min-h-0">
            {(() => {
              if (!selectedDate || !paymentDetails) {
                return <div className="text-center text-gray-500 py-8">Chargement des détails...</div>
              }

              // paymentDetails est déjà l'objet paiement, pas besoin de destructurer
              const payment = paymentDetails
              const isGroupContract = data.contractType === 'GROUP' || !!(data as any).groupeId

              // Debug: afficher les données pour vérifier
              console.log('🔍 Payment Details:', payment)
              console.log('🔍 Payment contribs:', payment.contribs)
              if (payment.contribs && payment.contribs.length > 0) {
                console.log('🔍 First contrib proofUrl:', payment.contribs[0].proofUrl)
              }

              if (isGroupContract && payment.groupContributions && payment.groupContributions.length > 0) {
                // Affichage pour les contrats de groupe
                return (
                  <div className="space-y-4">
                    {/* Informations générales */}
                    <div className="space-y-2 lg:space-y-3">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 lg:p-3 bg-gray-50 rounded-lg gap-1 lg:gap-2">
                        <span className="font-medium text-gray-700 text-xs lg:text-sm">Date:</span>
                        <span className="text-gray-900 text-xs lg:text-sm font-medium">{selectedDate?.toLocaleDateString('fr-FR')}</span>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 lg:p-3 bg-blue-50 rounded-lg gap-1 lg:gap-2">
                        <span className="font-medium text-blue-700 text-xs lg:text-sm">Statut du mois:</span>
                        <Badge variant={payment.status === 'PAID' ? 'default' : 'secondary'} className="text-xs">
                          {payment.status === 'PAID' ? 'Payé' : 'En cours'}
                        </Badge>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 lg:p-3 bg-green-50 rounded-lg gap-1 lg:gap-2">
                        <span className="font-medium text-green-700 text-xs lg:text-sm">Total du mois:</span>
                        <span className="text-green-900 font-semibold text-xs lg:text-sm">
                          {formatAmount(payment.accumulatedAmount || 0)} FCFA
                        </span>
                      </div>
                    </div>

                    {/* Liste des contributions */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900 text-sm">Contributions des membres :</h4>
                      {payment.groupContributions.map((contribution: any, index: number) => (
                        <div key={contribution.id} className="p-3 bg-white border border-gray-200 rounded-lg">
                          <div className="flex items-start gap-3">
                            {/* Photo du membre */}
                            <div className="flex-shrink-0">
                              {contribution.memberPhotoURL ? (
                                <img
                                  src={contribution.memberPhotoURL}
                                  alt={`${contribution.memberFirstName} ${contribution.memberLastName}`}
                                  className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                                  <span className="text-gray-500 text-lg font-medium">
                                    {contribution.memberFirstName?.[0]}{contribution.memberLastName?.[0]}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Informations du membre */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-2">
                                <h5 className="font-medium text-gray-900 text-sm">
                                  {contribution.memberFirstName} {contribution.memberLastName}
                                </h5>
                                <Badge variant="outline" className="text-xs">
                                  {contribution.memberMatricule}
                                </Badge>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                                <div>
                                  <span className="font-medium">Montant:</span>
                                  <span className="ml-1 font-semibold text-green-600">
                                    {formatAmount(contribution.amount)} FCFA
                                  </span>
                                </div>
                                <div>
                                  <span className="font-medium">Heure:</span>
                                  <span className="ml-1">{contribution.time}</span>
                                </div>
                                <div>
                                  <span className="font-medium">Mode:</span>
                                  <span className="ml-1">
                                    {contribution.mode === 'airtel_money' ? 'Airtel Money' :
                                      contribution.mode === 'mobicash' ? 'Mobicash' :
                                        contribution.mode === 'cash' ? 'Espèce' :
                                          contribution.mode === 'bank_transfer' ? 'Virement bancaire' : 'Inconnu'}
                                  </span>
                                </div>
                                <div>
                                  <span className="font-medium">Contact:</span>
                                  <span className="ml-1">
                                    {contribution.memberContacts?.[0] || 'Non renseigné'}
                                  </span>
                                </div>
                              </div>

                              {/* Preuve de versement */}
                              {contribution.proofUrl && (
                                <div className="mt-2">
                                  <img
                                    src={contribution.proofUrl}
                                    alt="Preuve de versement"
                                    className="w-full h-20 object-cover rounded-md"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              } else if (payment.contribs && payment.contribs.length > 0) {
                // Affichage pour les contrats individuels
                // Pour les contrats journaliers, trouver la contribution correspondant à la date sélectionnée
                const contribution = payment.contribs.find((c: any) => {
                  if (!c.paidAt) return false
                  const contribDate = typeof c.paidAt.toDate === 'function' ? c.paidAt.toDate() : new Date(c.paidAt)
                  contribDate.setHours(0, 0, 0, 0)
                  const selected = new Date(selectedDate!)
                  selected.setHours(0, 0, 0, 0)
                  return contribDate.getTime() === selected.getTime()
                }) || payment.contribs[0] // Fallback sur la première si aucune correspondance

                console.log('🎯 Contribution trouvée pour la date:', selectedDate?.toLocaleDateString('fr-FR'), {
                  contributionId: contribution?.id,
                  proofUrl: contribution?.proofUrl,
                  amount: contribution?.amount,
                  totalContribs: payment.contribs.length
                })
                return (
                  <div className="space-y-2 lg:space-y-3 p-1">
                    {/* Date du versement */}
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 lg:p-3 bg-gray-50 rounded-lg gap-1 lg:gap-2">
                      <span className="font-medium text-gray-700 text-xs lg:text-sm">Date:</span>
                      <span className="text-gray-900 text-xs lg:text-sm font-medium">{selectedDate?.toLocaleDateString('fr-FR')}</span>
                    </div>

                    {/* Heure du versement */}
                    {contribution?.time && (
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 lg:p-3 bg-gray-50 rounded-lg gap-1 lg:gap-2">
                        <span className="font-medium text-gray-700 text-xs lg:text-sm">Heure:</span>
                        <span className="text-gray-900 text-xs lg:text-sm">{contribution.time}</span>
                      </div>
                    )}

                    {/* Montant */}
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 lg:p-3 bg-gray-50 rounded-lg gap-1 lg:gap-2">
                      <span className="font-medium text-gray-700 text-xs lg:text-sm">Montant:</span>
                      <span className="text-gray-900 font-semibold text-xs lg:text-sm">
                        {formatAmount(contribution?.amount || 0)} FCFA
                      </span>
                    </div>

                    {/* Mode de paiement */}
                    {contribution?.mode && (
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 lg:p-3 bg-gray-50 rounded-lg gap-1 lg:gap-2">
                        <span className="font-medium text-gray-700 text-xs lg:text-sm">Mode:</span>
                        <span className="text-gray-900 text-xs lg:text-sm">
                          {contribution.mode === 'airtel_money' ? 'Airtel Money' :
                            contribution.mode === 'mobicash' ? 'Mobicash' :
                              contribution.mode === 'cash' ? 'Espèce' :
                                contribution.mode === 'bank_transfer' ? 'Virement bancaire' : 'Inconnu'}
                        </span>
                      </div>
                    )}

                    {/* Agent de recouvrement */}
                    {(contribution?.agentRecouvrementId ?? (payment as any).agentRecouvrementId) && (
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 lg:p-3 bg-gray-50 rounded-lg gap-1 lg:gap-2">
                        <span className="font-medium text-gray-700 text-xs lg:text-sm">Agent de recouvrement:</span>
                        <span className="text-gray-900 text-xs lg:text-sm">
                          {agentRecouvrementDetails
                            ? `${agentRecouvrementDetails.nom} ${agentRecouvrementDetails.prenom}`
                            : detailsModalAgentId
                              ? 'Chargement...'
                              : '—'}
                        </span>
                      </div>
                    )}

                    {/* Preuve */}
                    <div className="space-y-1 lg:space-y-2">
                      <span className="font-medium text-gray-700 text-xs lg:text-sm">Preuve de versement:</span>
                      {contribution?.proofUrl ? (
                        <div className="space-y-2">
                          <div className="p-2 lg:p-3 bg-gray-50 rounded-lg">
                            <img
                              src={contribution.proofUrl}
                              alt="Preuve de versement"
                              className="w-full h-auto max-h-60 object-contain rounded-md border border-gray-200"
                              onLoad={() => {
                                console.log('✅ Image chargée avec succès:', contribution.proofUrl)
                              }}
                              onError={(e) => {
                                console.error('❌ Erreur chargement image:', contribution.proofUrl)
                                const target = e.currentTarget as HTMLImageElement
                                target.style.display = 'none'
                                const errorDiv = document.createElement('div')
                                errorDiv.className = 'p-4 bg-red-50 border border-red-200 rounded text-center'
                                errorDiv.innerHTML = `
                                  <p class="text-sm text-red-700 font-medium mb-2">❌ Impossible de charger l'image</p>
                                  <p class="text-xs text-red-600">L'image n'est plus accessible sur Firebase Storage</p>
                                  <a href="${contribution.proofUrl}" target="_blank" class="text-xs text-blue-600 hover:underline mt-2 inline-block">Essayer d'ouvrir dans un nouvel onglet</a>
                                `
                                target.parentElement?.appendChild(errorDiv)
                              }}
                            />
                          </div>
                          {/* Debug info */}
                          <details className="text-xs">
                            <summary className="cursor-pointer text-gray-600 hover:text-gray-800">🔍 Détails techniques</summary>
                            <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono break-all">
                              <p className="text-gray-700">URL: {contribution.proofUrl}</p>
                            </div>
                          </details>
                        </div>
                      ) : (
                        <div className="p-2 lg:p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-xs text-yellow-700 italic">⚠️ Aucune preuve disponible pour cette contribution</p>
                          <p className="text-xs text-gray-500 mt-1">Le versement a été enregistré sans preuve d'image</p>
                        </div>
                      )}
                    </div>

                    {/* Statut du mois */}
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 lg:p-3 bg-blue-50 rounded-lg gap-1 lg:gap-2">
                      <span className="font-medium text-blue-700 text-xs lg:text-sm">Statut du mois:</span>
                      <Badge variant={payment.status === 'PAID' ? 'default' : 'secondary'} className="text-xs">
                        {payment.status === 'PAID' ? 'Payé' : 'En cours'}
                      </Badge>
                    </div>

                    {/* Montant accumulé du mois */}
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 lg:p-3 bg-green-50 rounded-lg gap-1 lg:gap-2">
                      <span className="font-medium text-green-700 text-xs lg:text-sm">Total du mois:</span>
                      <span className="text-green-900 font-semibold text-xs lg:text-sm">
                        {formatAmount(payment.accumulatedAmount || 0)} FCFA
                      </span>
                    </div>

                    {/* Détails de la modification (comme en Standard) */}
                    {((payment as any).modificationReason ?? (payment as any).updatedAt) && (
                      <div className="pt-3 mt-3 border-t border-gray-200 space-y-2 p-3 bg-amber-50/80 rounded-lg">
                        <h4 className="font-medium text-amber-900 text-xs lg:text-sm flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Détails de la modification
                        </h4>
                        {(payment as any).updatedAt && (() => {
                          const u = (payment as any).updatedAt
                          const modDate = typeof u?.toDate === 'function' ? u.toDate() : u ? new Date(u) : null
                          if (!modDate || isNaN(modDate.getTime())) return null
                          return (
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 text-xs text-gray-700">
                              <span className="font-medium text-gray-600">Date de modification:</span>
                              <span>{modDate.toLocaleDateString('fr-FR')} à {modDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          )
                        })()}
                        {(payment as any).updatedBy && (
                          <div className="flex flex-col gap-0.5 text-xs text-gray-700">
                            <span className="font-medium text-gray-600">Modifié par:</span>
                            <span className={`font-medium ${isLoadingAdminWhoModified ? 'animate-pulse text-gray-500' : ''}`}>
                              {isLoadingAdminWhoModified ? (
                                'Chargement...'
                              ) : user?.uid === (payment as any).updatedBy && user?.displayName ? (
                                <>
                                  {user.displayName}
                                  <span className="block text-gray-500 font-normal mt-0.5">Matricule: {(payment as any).updatedBy}</span>
                                </>
                              ) : adminWhoModified ? (
                                <>
                                  {adminWhoModified.firstName} {adminWhoModified.lastName}
                                  <span className="block text-gray-500 font-normal mt-0.5">Matricule: {adminWhoModified.id}</span>
                                </>
                              ) : (
                                <span className="text-gray-500">ID: {(payment as any).updatedBy}</span>
                              )}
                            </span>
                          </div>
                        )}
                        {(payment as any).modificationReason && (
                          <div className="pt-2 border-t border-amber-200/80">
                            <span className="font-medium text-gray-600 text-xs block mb-1">Motif de la modification:</span>
                            <p className="text-gray-900 text-xs bg-white p-2 rounded border border-amber-100">
                              {(payment as any).modificationReason}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              } else {
                return <div className="text-center text-gray-500 py-8">Aucun détail de versement disponible</div>
              }
            })()}
          </div>

          <DialogFooter className="flex-shrink-0 flex flex-col sm:flex-row gap-2 pt-3 lg:pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setShowPaymentDetailsModal(false)}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Fermer
            </Button>

            {/* Bouton pour ajouter une nouvelle contribution (contrats de groupe) */}
            {isGroupContract && (
              <Button
                onClick={() => {
                  setSelectedDate(selectedDate)
                  setPaymentAmount('')
                  setPaymentTime('')
                  setPaymentMode('airtel_money')
                  setPaymentFile(undefined)
                  setSelectedGroupMemberId('')
                  setShowPaymentDetailsModal(false)
                  setShowPaymentModal(true)
                }}
                className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto order-1 sm:order-2"
              >
                Ajouter une contribution
              </Button>
            )}

            {/* Bouton Modifier (contrats individuels / journalier) : ouvrir le modal de modification */}
            {!isGroupContract && paymentDetails?.contribs?.length > 0 && (() => {
              const payment = paymentDetails
              const contribution = payment.contribs.find((c: any) => {
                if (!c.paidAt) return false
                const contribDate = typeof c.paidAt?.toDate === 'function' ? c.paidAt.toDate() : new Date(c.paidAt)
                contribDate.setHours(0, 0, 0, 0)
                const selected = new Date(selectedDate!)
                selected.setHours(0, 0, 0, 0)
                return contribDate.getTime() === selected.getTime()
              }) || payment.contribs[0]

              return (
                <Button
                  onClick={() => {
                    setEditingContribution(contribution)
                    setPaymentAmount(contribution?.amount?.toString() || '')
                    setPaymentTime(contribution?.time || '')
                    setPaymentMode((contribution?.mode || 'airtel_money') as 'airtel_money' | 'mobicash' | 'cash' | 'bank_transfer')
                    setPaymentFile(undefined)
                    setEditModificationReason('')
                    setShowEditPaymentModal(true)
                    setShowPaymentDetailsModal(false)
                  }}
                  className="bg-amber-600 hover:bg-amber-700 text-white w-full sm:w-auto order-1 sm:order-2"
                >
                  Modifier
                </Button>
              )
            })()}

            {/* Bouton Supprimer le versement (après Modifier) : autorisé seulement si contrat actif */}
            {!isGroupContract && paymentDetails?.status === 'PAID' && paymentDetails?.id && canDeletePayment(data ?? null) && (
              <Button
                variant="outline"
                onClick={() => setConfirmDeletePaymentId(paymentDetails.id)}
                className="border-red-300 text-red-700 hover:bg-red-50 w-full sm:w-auto order-1 sm:order-2 flex items-center gap-2"
                disabled={deletePaymentMutation.isPending}
              >
                <Trash2 className="h-4 w-4" />
                Supprimer
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation suppression versement */}
      <AlertDialog open={!!confirmDeletePaymentId} onOpenChange={(open) => !open && setConfirmDeletePaymentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Supprimer ce versement
            </AlertDialogTitle>
            <AlertDialogDescription>
              Vous avez enregistré ce versement à une mauvaise date. La suppression retire le versement et recalcule les totaux du contrat (nominal, bonus, pénalités, prochaine échéance). Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePaymentMutation.isPending}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={async (e) => {
                e.preventDefault()
                if (!confirmDeletePaymentId) return
                try {
                  await deletePaymentMutation.mutateAsync({ contractId: id, paymentId: confirmDeletePaymentId })
                  setConfirmDeletePaymentId(null)
                  setShowPaymentDetailsModal(false)
                } catch {
                  // Erreur gérée par le hook (toast)
                }
              }}
              disabled={deletePaymentMutation.isPending}
            >
              {deletePaymentMutation.isPending ? 'Suppression…' : 'Supprimer le versement'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de modification du versement — même design que Nouveau versement + motif */}
      <Dialog open={showEditPaymentModal} onOpenChange={setShowEditPaymentModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-[#224D62] flex items-center gap-2">
              <DollarSign className="h-6 w-6" />
              Modifier le versement
            </DialogTitle>
            <DialogDescription>
              Modifier la date, l&apos;heure, le montant ou la preuve du versement du {selectedDate?.toLocaleDateString('fr-FR')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Date et Heure — même disposition que Nouveau versement */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-date" className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  Date de paiement *
                  <span className="text-xs text-muted-foreground">(fixe)</span>
                </Label>
                <Input
                  id="edit-date"
                  type="text"
                  value={selectedDate?.toLocaleDateString('fr-FR') || ''}
                  disabled
                  className="w-full bg-gray-100 cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  La date correspond au jour sélectionné dans le calendrier
                </p>
              </div>

              <div>
                <Label htmlFor="edit-time" className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Heure de paiement *
                </Label>
                <Input
                  id="edit-time"
                  type="time"
                  value={paymentTime}
                  onChange={(e) => setPaymentTime(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Montant */}
            <div>
              <Label htmlFor="edit-amount" className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                Montant du versement (FCFA) *
              </Label>
              <Input
                id="edit-amount"
                type="number"
                placeholder="Ex: 10000"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                min="100"
                step="100"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Montant minimum: 100 FCFA
              </p>
            </div>

            {/* Agent de recouvrement (optionnel) */}
            <div>
              <Label className="flex items-center gap-2 mb-2">
                Agent de recouvrement (optionnel)
              </Label>
              <AgentRecouvrementSelect
                value={agentRecouvrementId}
                onValueChange={setAgentRecouvrementId}
                placeholder="Sélectionner l'agent ayant collecté le versement"
                required={false}
              />
            </div>

            {/* Mode de paiement — même grille que Nouveau versement */}
            <div>
              <Label className="flex items-center gap-2 mb-3">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                Mode de paiement *
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="relative flex items-center p-4 border-2 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors duration-200 has-[:checked]:border-[#224D62] has-[:checked]:bg-[#224D62]/5">
                  <input
                    type="radio"
                    name="editPaymentMode"
                    value="airtel_money"
                    checked={paymentMode === 'airtel_money'}
                    onChange={(e) => setPaymentMode(e.target.value as 'airtel_money' | 'mobicash' | 'cash' | 'bank_transfer')}
                    className="text-[#224D62] focus:ring-[#224D62]"
                  />
                  <div className="ml-3 flex items-center gap-3">
                    <div className="bg-red-100 rounded-lg p-2">
                      <Smartphone className="h-5 w-5 text-red-600" />
                    </div>
                    <span className="font-medium text-gray-900">Airtel Money</span>
                  </div>
                </label>

                <label className="relative flex items-center p-4 border-2 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors duration-200 has-[:checked]:border-[#224D62] has-[:checked]:bg-[#224D62]/5">
                  <input
                    type="radio"
                    name="editPaymentMode"
                    value="mobicash"
                    checked={paymentMode === 'mobicash'}
                    onChange={(e) => setPaymentMode(e.target.value as 'airtel_money' | 'mobicash' | 'cash' | 'bank_transfer')}
                    className="text-[#224D62] focus:ring-[#224D62]"
                  />
                  <div className="ml-3 flex items-center gap-3">
                    <div className="bg-blue-100 rounded-lg p-2">
                      <Banknote className="h-5 w-5 text-blue-600" />
                    </div>
                    <span className="font-medium text-gray-900">Mobicash</span>
                  </div>
                </label>

                <label className="relative flex items-center p-4 border-2 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors duration-200 has-[:checked]:border-[#224D62] has-[:checked]:bg-[#224D62]/5">
                  <input
                    type="radio"
                    name="editPaymentMode"
                    value="cash"
                    checked={paymentMode === 'cash'}
                    onChange={(e) => setPaymentMode(e.target.value as 'airtel_money' | 'mobicash' | 'cash' | 'bank_transfer')}
                    className="text-[#224D62] focus:ring-[#224D62]"
                  />
                  <div className="ml-3 flex items-center gap-3">
                    <div className="bg-green-100 rounded-lg p-2">
                      <DollarSign className="h-5 w-5 text-green-600" />
                    </div>
                    <span className="font-medium text-gray-900">Espèce</span>
                  </div>
                </label>

                <label className="relative flex items-center p-4 border-2 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors duration-200 has-[:checked]:border-[#224D62] has-[:checked]:bg-[#224D62]/5">
                  <input
                    type="radio"
                    name="editPaymentMode"
                    value="bank_transfer"
                    checked={paymentMode === 'bank_transfer'}
                    onChange={(e) => setPaymentMode(e.target.value as 'airtel_money' | 'mobicash' | 'cash' | 'bank_transfer')}
                    className="text-[#224D62] focus:ring-[#224D62]"
                  />
                  <div className="ml-3 flex items-center gap-3">
                    <div className="bg-purple-100 rounded-lg p-2">
                      <Building2 className="h-5 w-5 text-purple-600" />
                    </div>
                    <span className="font-medium text-gray-900">Virement bancaire</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Preuve de paiement — remplacer si besoin, comme Standard */}
            <div>
              <Label htmlFor="edit-proof" className="flex items-center gap-2 mb-2">
                <Upload className="h-4 w-4 text-muted-foreground" />
                Preuve de paiement (remplacer si besoin)
              </Label>
              {editingContribution?.proofUrl && (
                <div className="mb-3 p-3 rounded-lg border border-gray-200 bg-gray-50">
                  <p className="text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    Preuve actuelle
                  </p>
                  <a
                    href={editingContribution.proofUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[#224D62] hover:underline flex items-center gap-1"
                  >
                    Voir la preuve actuelle
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
              <Input
                id="edit-proof"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (!file) {
                    setPaymentFile(undefined)
                    return
                  }
                  if (file.size > 10 * 1024 * 1024) {
                    toast.error('Le fichier ne doit pas dépasser 10 MB')
                    e.target.value = ''
                    return
                  }
                  setPaymentFile(file)
                  toast.success(`Image "${file.name}" sélectionnée pour remplacer la preuve`)
                }}
                disabled={isEditing}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Choisir un fichier pour remplacer la preuve (l&apos;ancienne sera supprimée). Formats : JPEG, PNG, WebP (max 10 MB)
              </p>
              {paymentFile && (
                <Alert className="mt-2 border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700">
                    <strong>{paymentFile.name}</strong> ({(paymentFile.size / 1024).toFixed(2)} KB) — remplacera la preuve actuelle
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Motif de la modification (obligatoire, traçabilité) */}
            <div>
              <Label htmlFor="edit-modificationReason" className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Motif de la modification *
              </Label>
              <Textarea
                id="edit-modificationReason"
                value={editModificationReason}
                onChange={(e) => setEditModificationReason(e.target.value)}
                placeholder="Ex: Correction de la date de paiement, changement de montant suite à erreur..."
                rows={3}
                className="w-full resize-y"
                disabled={isEditing}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enregistré avec votre identité et la date de modification pour la traçabilité.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowEditPaymentModal(false)
                setEditingContribution(null)
                setPaymentAmount('')
                setPaymentTime('')
                setPaymentMode('airtel_money')
                setPaymentFile(undefined)
                setEditModificationReason('')
                setSelectedGroupMemberId('')
              }}
              disabled={isEditing}
            >
              Annuler
            </Button>
            <Button
              type="button"
              onClick={onEditPaymentSubmit}
              disabled={
                isEditing ||
                !paymentAmount ||
                !paymentTime ||
                !editModificationReason?.trim()
              }
              className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65]"
            >
              {isEditing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Modifier...
                </>
              ) : (
                <>
                  <DollarSign className="h-4 w-4 mr-2" />
                  Modifier le versement
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de versement en retard */}
      <Dialog open={showLatePaymentModal} onOpenChange={setShowLatePaymentModal}>
        <DialogContent className="w-[95vw] max-w-lg mx-auto max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-lg lg:text-xl">Versement en retard</DialogTitle>
            <DialogDescription className="text-sm lg:text-base">
              Enregistrer un versement pour une date passée (quand l'admin a reçu l'argent mais oublié d'enregistrer)
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="space-y-4 p-1">
              {/* Date du versement (sélection manuelle) */}
              <div>
                <Label htmlFor="late-date" className="text-sm font-medium">Date du versement *</Label>
                <Input
                  id="late-date"
                  type="date"
                  value={(() => {
                    // Initialiser avec la date d'hier par défaut pour un versement en retard
                    const yesterday = new Date()
                    yesterday.setDate(yesterday.getDate() - 1)
                    return yesterday.toISOString().split('T')[0]
                  })()}
                  onChange={(e) => {
                    // Mettre à jour la date sélectionnée
                    const selectedDate = new Date(e.target.value)
                    setSelectedDate(selectedDate)
                  }}
                  max={new Date().toISOString().split('T')[0]} // Pas de dates futures
                  required
                  className="w-full mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Sélectionnez la date réelle du versement (pas de dates futures)
                </p>
              </div>

              {/* Heure du versement */}
              <div>
                <Label htmlFor="late-time" className="text-sm font-medium">Heure du versement *</Label>
                <Input
                  id="late-time"
                  type="time"
                  value={paymentTime}
                  onChange={(e) => setPaymentTime(e.target.value)}
                  required
                  className="w-full mt-1"
                />
              </div>

              {/* Montant */}
              <div>
                <Label htmlFor="late-amount" className="text-sm font-medium">Montant (FCFA) *</Label>
                <Input
                  id="late-amount"
                  type="number"
                  placeholder="0"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  min="100"
                  step="100"
                  required
                  className="w-full mt-1"
                />
              </div>

              {/* Mode de paiement */}
              <div>
                <Label className="text-sm font-medium">Mode de paiement *</Label>
                <div className="flex gap-3 mt-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="latePaymentMode"
                      value="airtel_money"
                      checked={paymentMode === 'airtel_money'}
                      onChange={(e) => setPaymentMode(e.target.value as 'airtel_money' | 'mobicash' | 'cash' | 'bank_transfer')}
                      className="text-blue-600"
                    />
                    <span className="text-sm">Airtel Money</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="latePaymentMode"
                      value="mobicash"
                      checked={paymentMode === 'mobicash'}
                      onChange={(e) => setPaymentMode(e.target.value as 'airtel_money' | 'mobicash' | 'cash' | 'bank_transfer')}
                      className="text-blue-600"
                    />
                    <span className="text-sm">Mobicash</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="latePaymentMode"
                      value="cash"
                      checked={paymentMode === 'cash'}
                      onChange={(e) => setPaymentMode(e.target.value as 'airtel_money' | 'mobicash' | 'cash' | 'bank_transfer')}
                      className="text-blue-600"
                    />
                    <span className="text-sm">Espèce</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="latePaymentMode"
                      value="bank_transfer"
                      checked={paymentMode === 'bank_transfer'}
                      onChange={(e) => setPaymentMode(e.target.value as 'airtel_money' | 'mobicash' | 'cash' | 'bank_transfer')}
                      className="text-blue-600"
                    />
                    <span className="text-sm">Virement bancaire</span>
                  </label>
                </div>
              </div>

              {/* Sélection du membre du groupe (si contrat de groupe) */}
              {isGroupContract && (
                <div>
                  <Label htmlFor="late-groupMember" className="text-sm font-medium">Membre du groupe qui verse *</Label>
                  <Select value={selectedGroupMemberId} onValueChange={setSelectedGroupMemberId}>
                    <SelectTrigger className="w-full mt-1">
                      <SelectValue placeholder="Sélectionnez le membre qui verse" />
                    </SelectTrigger>
                    <SelectContent>
                      {groupMembers && groupMembers.length > 0 ? (
                        groupMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.firstName} {member.lastName} ({member.matricule})
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="" disabled>
                          Chargement des membres du groupe...
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    Ce champ permet de tracer qui a effectué le versement dans le groupe
                  </p>
                </div>
              )}

              {/* Preuve de versement */}
              <div>
                <Label htmlFor="late-proof" className="text-sm font-medium">Preuve de versement *</Label>
                <Input
                  id="late-proof"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    console.log('📎 [Versement retard] Fichier sélectionné:', file)
                    if (!file) {
                      console.log('❌ Aucun fichier sélectionné')
                      setPaymentFile(undefined)
                      return
                    }
                    if (file.size > 5 * 1024 * 1024) {
                      console.log('❌ Fichier trop volumineux:', file.size, 'bytes')
                      toast.error('Le fichier ne doit pas dépasser 5 MB')
                      e.target.value = ''
                      setPaymentFile(undefined)
                      return
                    }
                    console.log('✅ Fichier accepté:', {
                      name: file.name,
                      type: file.type,
                      size: file.size
                    })
                    setPaymentFile(file)
                    toast.success(`Image "${file.name}" sélectionnée`)
                  }}
                  required
                  className="w-full mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Formats acceptés : JPEG, PNG, WebP (max 5 MB)
                </p>
                {paymentFile && (
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-xs text-green-700">
                      ✅ Fichier prêt : <strong>{paymentFile.name}</strong> ({(paymentFile.size / 1024).toFixed(2)} KB)
                    </p>
                  </div>
                )}
              </div>

              {/* Indicateur de retard et pénalités pour versement en retard */}
              {(() => {
                const lateInfo = calculateLatePaymentInfo(selectedDate)
                return lateInfo ? (
                  <div className={`rounded-lg p-3 border-2 ${lateInfo.hasPenalty
                      ? 'bg-red-50 border-red-300'
                      : 'bg-orange-50 border-orange-300'
                    }`}>
                    <div className="flex items-start gap-2">
                      <AlertCircle className={`h-4 w-4 mt-0.5 flex-shrink-0 ${lateInfo.hasPenalty ? 'text-red-600' : 'text-orange-600'
                        }`} />
                      <div className="flex-1">
                        <h4 className={`font-semibold text-sm ${lateInfo.hasPenalty ? 'text-red-900' : 'text-orange-900'
                          }`}>
                          Paiement en retard
                        </h4>
                        <p className={`text-xs mt-1 ${lateInfo.hasPenalty ? 'text-red-800' : 'text-orange-800'
                          }`}>
                          Ce paiement est effectué avec <strong>{lateInfo.daysLate} jour(s) de retard</strong>
                        </p>
                        {lateInfo.hasPenalty && (
                          <div className="mt-2 p-2 bg-red-100 rounded-md border border-red-200">
                            <p className="text-xs font-bold text-red-900">
                              Pénalités : {formatAmount(lateInfo.penalty)} FCFA
                            </p>
                            <p className="text-xs text-red-700 mt-0.5">
                              Appliquées à partir du 4ème jour
                            </p>
                          </div>
                        )}
                        {!lateInfo.hasPenalty && (
                          <p className="text-xs text-orange-700 mt-1">
                            ⚠️ Période de tolérance (jours 1-3)
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null
              })()}

              {/* Informations supplémentaires */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-orange-800">
                    <p className="font-medium mb-1">⚠️ Versement en retard</p>
                    <p>Ce versement sera enregistré pour la date sélectionnée. Assurez-vous que :</p>
                    <ul className="list-disc list-inside mt-1 space-y-0.5">
                      <li>L'argent a bien été reçu</li>
                      <li>La date correspond au jour réel du versement</li>
                      <li>La preuve est claire et lisible</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 flex flex-col sm:flex-row gap-2 pt-3 lg:pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setShowLatePaymentModal(false)
                setSelectedDate(null)
                setPaymentAmount('')
                setPaymentTime('')
                setPaymentMode('airtel_money')
                setPaymentFile(undefined)
                setSelectedGroupMemberId('')
              }}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Annuler
            </Button>
            <Button
              onClick={async () => {
                if (!selectedDate || !paymentAmount || !paymentTime || !paymentFile) {
                  toast.error('Veuillez remplir tous les champs obligatoires')
                  return
                }

                // Validation spécifique pour les contrats de groupe
                if (isGroupContract && !selectedGroupMemberId) {
                  toast.error('Veuillez sélectionner le membre du groupe qui a effectué le versement')
                  return
                }

                const amount = Number(paymentAmount)
                if (amount <= 0) {
                  toast.error('Le montant doit être positif')
                  return
                }

                try {
                  setIsPaying(true)

                  // Trouver le mois correspondant à la date sélectionnée
                  const monthIndex = getMonthIndexFromStart(selectedDate)
                  if (monthIndex === null || monthIndex < 0) {
                    toast.error('Date de versement invalide')
                    setIsPaying(false)
                    return
                  }

                  if (isGroupContract && groupMembers) {
                    // Utiliser la nouvelle fonction payGroup pour les contrats de groupe
                    const selectedMember = groupMembers.find(m => m.id === selectedGroupMemberId)
                    if (!selectedMember) {
                      toast.error('Membre du groupe non trouvé')
                      return
                    }

                    const { payGroup } = await import('@/services/caisse/mutations')
                    await payGroup({
                      contractId: id,
                      dueMonthIndex: monthIndex,
                      memberId: selectedMember.id,
                      memberName: `${selectedMember.firstName} ${selectedMember.lastName}`,
                      memberMatricule: selectedMember.matricule || '',
                      memberPhotoURL: selectedMember.photoURL || undefined,
                      memberContacts: selectedMember.contacts || [],
                      amount,
                      file: paymentFile,
                      paidAt: selectedDate,
                      time: paymentTime,
                      mode: paymentMode as 'airtel_money' | 'mobicash' | 'cash' | 'bank_transfer'
                    })

                    toast.success('Contribution en retard ajoutée au versement collectif')
                  } else {
                    // Utiliser la fonction pay normale pour les contrats individuels
                    const { pay } = await import('@/services/caisse/mutations')
                    await pay({
                      contractId: id,
                      dueMonthIndex: monthIndex,
                      memberId: data.memberId,
                      amount,
                      file: paymentFile,
                      paidAt: selectedDate,
                      time: paymentTime,
                      mode: paymentMode as 'airtel_money' | 'mobicash' | 'cash' | 'bank_transfer'
                    })

                    toast.success('Versement en retard enregistré avec succès')
                  }

                  queryClient.invalidateQueries({ queryKey: ['caisse-contract', id] })
                  await new Promise((r) => setTimeout(r, 300))
                  await refetch()
                  setShowLatePaymentModal(false)
                  setSelectedDate(null)
                  setPaymentAmount('')
                  setPaymentTime('')
                  setPaymentMode('airtel_money')
                  setPaymentFile(undefined)
                  setSelectedGroupMemberId('')
                } catch (err: any) {
                  toast.error(err?.message || 'Erreur lors de l\'enregistrement')
                } finally {
                  setIsPaying(false)
                }
              }}
              disabled={isPaying || !selectedDate || !paymentAmount || !paymentTime || !paymentFile}
              className="bg-orange-600 hover:bg-orange-700 text-white w-full sm:w-auto order-1 sm:order-2"
            >
              {isPaying ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Enregistrer le versement en retard
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modals de confirmation */}
      {confirmApproveId && (
        <Dialog open={!!confirmApproveId} onOpenChange={() => setConfirmApproveId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmer l'approbation</DialogTitle>
              <DialogDescription>
                Voulez-vous approuver ce remboursement ?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmApproveId(null)}>
                Annuler
              </Button>
              <Button
                onClick={async () => {
                  await approveRefund(id, confirmApproveId)
                  setConfirmApproveId(null)
                  await refetch()
                  await reloadRefunds() // Rafraîchir la liste des remboursements
                  toast.success('Remboursement approuvé')
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Confirmer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modale de saisie de la cause du retrait */}
      {showReasonModal && (
        <Dialog open={showReasonModal} onOpenChange={setShowReasonModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {refundType === 'FINAL' ? 'Demande de remboursement final' : 'Demande de retrait anticipé'}
              </DialogTitle>
              <DialogDescription>
                Veuillez indiquer la raison de cette demande
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="reason">Cause du retrait *</Label>
                <Textarea
                  id="reason"
                  placeholder="Expliquez la raison du retrait..."
                  className="w-full resize-none mt-2"
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
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowReasonModal(false)
                  setRefundType(null)
                  setRefundReasonInput('')
                }}
              >
                Annuler
              </Button>
              <Button
                className="bg-[#234D65] hover:bg-[#2c5a73] text-white"
                disabled={!refundReasonInput.trim() || isRefunding}
                onClick={async () => {
                  try {
                    setIsRefunding(true)

                    if (refundType === 'FINAL') {
                      await requestFinalRefund(id, refundReasonInput)
                      toast.success('Remboursement final demandé')
                    } else {
                      await requestEarlyRefund(id, { reason: refundReasonInput })
                      toast.success('Retrait anticipé demandé')
                    }

                    await refetch()
                    await reloadRefunds() // Rafraîchir la liste des remboursements

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
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal PDF Document */}
      {currentRefund && (
        <PdfDocumentModal
          isOpen={showPdfModal}
          onClose={() => setShowPdfModal(false)}
          onDocumentUploaded={handlePdfUpload}
          contractId={id}
          refundId={currentRefundId || ""}
          existingDocument={currentRefund.document}
          title={currentRefund.type === 'FINAL' ? 'Document de Remboursement Final' : 'Document de Retrait Anticipé'}
          description={currentRefund.type === 'FINAL' ? 'Téléchargez le document PDF à remplir, puis téléversez-le une fois complété pour pouvoir approuver le remboursement final.' : 'Téléchargez le document PDF à remplir, puis téléversez-le une fois complété pour pouvoir approuver le retrait anticipé.'}
          documentType={currentRefund.type === 'FINAL' ? 'FINAL_REFUND_CS' : 'EARLY_REFUND_CS'}
          memberId={documentMemberId}
          documentLabel={`${currentRefund.type === 'FINAL' ? 'Remboursement final' : 'Retrait anticipé'} - Contrat ${id}`}
        />
      )}

      {/* Modal PDF Viewer */}
      {currentDocument && (
        <PdfViewerModal
          isOpen={showPdfViewer}
          onClose={() => setShowPdfViewer(false)}
          document={currentDocument}
        />
      )}

      {/* Modal Quittance / Document de remboursement */}
      <RemboursementNormalPDFModal
        isOpen={showRemboursementPdf}
        onClose={() => setShowRemboursementPdf(false)}
        contractId={id}
        contractData={data}
      />
    </div>
  )
}
