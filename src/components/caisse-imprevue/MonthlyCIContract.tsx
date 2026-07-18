'use client'

import { useIsSuperAdmin } from '@/hooks/useIsSuperAdmin'
import { backOr } from '@/lib/backNavigation'
import EmergencyContact from '@/components/contract/standard/EmergencyContact'
import ContractCIMemberInfoDialog from '@/components/caisse-imprevue/ContractCIMemberInfoDialog'
import { MemberByMatricule } from '@/components/admin/MemberByMatricule'
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
import { getContractStatusConfig } from '@/utils/contract-status'
import { useDocumentViewer } from '@/components/documents/DocumentViewerProvider'
import {
    AlertCircle,
    ArrowLeft,
    Calendar,
    CalendarDays,
    CheckCircle,
    Clock,
    DollarSign,
    Download,
    Eye,
    FileSignature,
    HandCoins,
    History,
    Pencil,
    Trash2,
    RefreshCw,
    TrendingUp,
    XCircle,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'
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

interface MonthlyCIContractProps {
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

// Bloc `entraide` posé sur les contrats issus de la migration Excel.
type EntraideMeta = {
  code?: string
  contractEndDate?: string
  receptionDate?: string
  contractSigned?: string
  yearRegistered?: string
  closureDocs?: string
  guarantorMatricule?: string
  observation?: string
  otherRemarks?: string
  summary?: {
    versementsCount?: number
    monthsUnpaid?: number
    imprevusCount?: number
    montantTotal?: number
  }
}

/** "2026-01-28" -> "28/01/2026" */
function fmtIso(s?: string): string | undefined {
  if (!s) return undefined
  const [y, m, d] = s.split('-')
  return y && m && d ? `${d}/${m}/${y}` : s
}

const fmtNum = (n?: number) => (typeof n === 'number' ? n.toLocaleString('fr-FR') : undefined)

/** Encart « Détails de la résiliation / import » pour les contrats migrés. */
function MigrationDetailsCard({ contract }: { contract: ContractCI }) {
  const e = (contract as ContractCI & { entraide?: EntraideMeta }).entraide
  if (!e) return null
  const isCanceled = contract.status === 'CANCELED'
  const isFinished = contract.status === 'FINISHED'

  const guarantor = e.guarantorMatricule?.trim()
  const rows: Array<[string, string | undefined]> = [
    ['Code entraide', e.code],
    ['Date de réception', fmtIso(e.receptionDate)],
    ['Fin des versements', fmtIso(e.contractEndDate)],
    ['Contrat signé', e.contractSigned],
    ['Année inscription', e.yearRegistered],
    ['Documents clôture', e.closureDocs],
    ['Observation', e.observation],
    ['Motif', e.otherRemarks],
  ]
  const visible = rows.filter(([, v]) => v && v.trim() !== '')

  const s = e.summary
  // « Mois cotisés » = nombre réel de mois payés (= versements importés),
  // PAS la colonne DUREE PERIODE de l'Excel (peu fiable). « Mois impayés » =
  // durée du contrat − mois cotisés.
  const paidMonths = s?.versementsCount
  const totalMonths = contract.subscriptionCIDuration
  const unpaidMonths =
    typeof totalMonths === 'number' && typeof paidMonths === 'number'
      ? Math.max(0, totalMonths - paidMonths)
      : undefined
  const summaryAll: Array<[string, string | undefined]> = s
    ? [
        ['Mois cotisés', fmtNum(paidMonths)],
        ...((isCanceled || isFinished) && unpaidMonths !== undefined
          ? ([['Mois impayés', fmtNum(unpaidMonths)]] as Array<[string, string | undefined]>)
          : []),
        ['Imprévus', fmtNum(s.imprevusCount)],
        ['Montant total', s.montantTotal ? `${fmtNum(s.montantTotal)} FCFA` : undefined],
      ]
    : []
  const summaryRows = summaryAll.filter(([, v]) => v !== undefined && v !== '')

  if (visible.length === 0 && summaryRows.length === 0 && !guarantor) return null

  return (
    <Card className={isCanceled ? 'border border-amber-200 bg-amber-50/40 shadow-sm' : 'border-0 shadow-md'}>
      <CardContent className="space-y-3 p-4">
        <h3 className="text-sm font-bold text-[#234D65]">
          {isCanceled ? 'Détails de la résiliation' : 'Informations complémentaires (import)'}
        </h3>
        {(visible.length > 0 || guarantor) && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {visible.map(([label, value]) => (
              <div key={label}>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
                <p className="break-words text-sm text-gray-800">{value}</p>
              </div>
            ))}
            {guarantor && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Garant</p>
                <p className="break-words text-sm text-gray-800">
                  <MemberByMatricule matricule={guarantor} roleLabel="Garant" />
                </p>
              </div>
            )}
          </div>
        )}
        {summaryRows.length > 0 && (
          <div className="grid grid-cols-2 gap-3 rounded-lg bg-gray-50 p-3 sm:grid-cols-4">
            {summaryRows.map(([label, value]) => (
              <div key={label}>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
                <p className="text-sm font-bold tabular-nums text-[#234D65]">{value}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function MonthlyCIContract({ contract, document: _document, isLoadingDocument: _isLoadingDocument }: MonthlyCIContractProps) {
  const { openDocument } = useDocumentViewer()
  const router = useRouter()
  // Actions sensibles (modifier/supprimer un versement) : SuperAdmin uniquement.
  const isSuperAdmin = useIsSuperAdmin()
  const { user } = useAuth()
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number | null>(null)
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
      setSelectedMonthIndex(null)
    }
  }, [activeSupport, showRepaySupportModal])

  const getMonthStatus = (monthIndex: number) => {
    const payment = payments.find((p: any) => p.monthIndex === monthIndex)
    return payment?.status || 'DUE'
  }

  /** Index du premier mois non payé (ordre chronologique) : seul ce mois peut recevoir un nouveau versement. */
  const nextUnpaidMonthIndex = React.useMemo(() => {
    const duration = contract.subscriptionCIDuration ?? 12
    for (let i = 0; i < duration; i++) {
      if (getMonthStatus(i) !== 'PAID') return i
    }
    return null
  }, [contract.subscriptionCIDuration, payments])

  // Prochaine échéance à payer (premier mois DUE dont la date >= aujourd'hui) pour le PDF Reconnaissance
  const nextDueDate = React.useMemo(() => {
    if (!contract.firstPaymentDate) return null
    const first = new Date(contract.firstPaymentDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    for (let monthIndex = 0; monthIndex < (contract.subscriptionCIDuration ?? 12); monthIndex++) {
      const due = new Date(first)
      due.setMonth(due.getMonth() + monthIndex)
      due.setHours(0, 0, 0, 0)
      if (due >= today && getMonthStatus(monthIndex) === 'DUE') return due
    }
    return null
  }, [contract.firstPaymentDate, contract.subscriptionCIDuration, payments])

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
      // 3. Versement normal
      // RESTRICTION DÉSACTIVÉE : autoriser de payer n'importe quel mois (ex. M5 ou M6 même si M3 non réglé).
      // Pour rétablir l'ordre chronologique (obliger à payer le prochain mois impayé avant les suivants), décommenter le bloc ci-dessous.
      // if (nextUnpaidMonthIndex !== null && monthIndex !== nextUnpaidMonthIndex) {
      //   toast.error(
      //     `Veuillez d'abord régler le mois M${nextUnpaidMonthIndex + 1} avant de pouvoir enregistrer un versement pour le mois M${monthIndex + 1}.`
      //   )
      //   setSelectedMonthIndex(null)
      //   return
      // }
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
      if (editVersement) {
        if (!data.modificationReason?.trim()) return
        await updateVersementMutation.mutateAsync({
          contractId: contract.id,
          monthIndex: editVersement.payment.monthIndex,
          versementId: editVersement.versement.id,
          versementData: {
            date: data.date,
            time: data.time,
            amount: data.amount,
            mode: data.mode,
            withFees: data.withFees,
            paymentMethodOther: data.paymentMethodOther,
            agentRecouvrementId: data.agentRecouvrementId,
          },
          proofFile: data.proofFile,
          modificationReason: data.modificationReason.trim(),
          userId: user.uid,
        })
        setShowPaymentModal(false)
        setSelectedMonthIndex(null)
        setEditVersement(null)
      } else {
        await createVersementMutation.mutateAsync({
          contractId: contract.id,
          monthIndex: selectedMonthIndex,
          versementData: {
            date: data.date,
            time: data.time,
            amount: data.amount,
            mode: data.mode,
            withFees: data.withFees,
            paymentMethodOther: data.paymentMethodOther,
            agentRecouvrementId: data.agentRecouvrementId,
          },
          proofFile: data.proofFile!,
          userId: user.uid,
        })
        setShowPaymentModal(false)
        setSelectedMonthIndex(null)
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
              onClick={() => backOr(router, routes.admin.caisseImprevue)}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour
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

        {/* Statistiques de paiement */}
        <PaymentStatsGrid contract={contract} paymentStats={paymentStats} />

        {/* Détails résiliation / import (contrats migrés) */}
        <MigrationDetailsCard contract={contract} />

        {/* Barre de progression */}
        <Card className="border-0 shadow-md">
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-700">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-[#234D65]" />
                <span>
                  Mois payés&nbsp;: <b>{paidCount}</b> / {totalMonths || '—'}
                </span>
              </div>
              {/* Mois impayés : surtout utile pour les contrats résiliés/terminés (ex. 4/12 → 8). */}
              {totalMonths > 0 && (isContractCanceled || isContractFinished) && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <span>
                    Mois impayés&nbsp;: <b className="text-amber-700">{Math.max(0, totalMonths - paidCount)}</b>
                  </span>
                </div>
              )}
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

                    // Désactiver : contrat terminé et mois non payé. (RESTRICTION DÉSACTIVÉE : on n'impose plus l'ordre des échéances.)
                    // Pour rétablir : autoriser uniquement le clic sur le prochain mois impayé, décommenter la ligne isNotNextUnpaid et l'ajouter dans isDisabled.
                    // const isNotNextUnpaid = status === 'DUE' && nextUnpaidMonthIndex !== null && monthIndex !== nextUnpaidMonthIndex
                    const isDisabled = (isContractTerminated && status !== 'PAID') // || isNotNextUnpaid
                    
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

                            {status === 'PAID' && (() => {
                              const monthPayment = payments.find((p) => p.monthIndex === monthIndex && p.status === 'PAID')
                              const lastVersement = monthPayment?.versements?.length
                                ? monthPayment.versements[monthPayment.versements.length - 1]
                                : null
                              const paidDate = lastVersement
                                ? new Date(`${lastVersement.date}T${lastVersement.time || '00:00'}`)
                                : null
                              const paidTimeStr = lastVersement?.time
                              return paidDate ? (
                                <div className="space-y-1 pt-1 border-t border-gray-200">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-600">Payé le:</span>
                                    <span className="font-semibold text-green-600">
                                      {paidDate.toLocaleDateString('fr-FR')}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-600">Payé à:</span>
                                    <span className="font-semibold text-green-600">
                                      {paidTimeStr || paidDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                </div>
                              ) : null
                            })()}

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

                            {/* Boutons Voir la facture + Modifier (mois payé), alignés à la verticale */}
                            {status === 'PAID' && (() => {
                              const monthPayment = payments.find((p: any) => p.monthIndex === monthIndex) as PaymentCI | undefined
                              const lastVersement = monthPayment?.versements?.length
                                ? monthPayment.versements[monthPayment.versements.length - 1]
                                : null
                              if (!lastVersement) return null
                              return (
                                <div className="pt-3 border-t border-gray-200 flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="w-full text-[#234D65] border-[#234D65] hover:bg-[#234D65]/10"
                                    onClick={() => {
                                      setSelectedMonthIndex(monthIndex)
                                      setShowReceiptModal(true)
                                    }}
                                  >
                                    <Eye className="h-3 w-3 mr-1" />
                                    Voir la facture
                                  </Button>
                                  {!isContractTerminated && isSuperAdmin && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="w-full border-amber-300 text-amber-700 hover:bg-amber-50"
                                      onClick={() => {
                                        setSelectedMonthIndex(monthIndex)
                                        setEditVersement({ payment: monthPayment!, versement: lastVersement })
                                        setShowPaymentModal(true)
                                      }}
                                    >
                                      <Pencil className="h-3 w-3 mr-1" />
                                      Modifier
                                    </Button>
                                  )}
                                  {!isContractTerminated && isSuperAdmin && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="w-full border-red-300 text-red-700 hover:bg-red-50"
                                      disabled={deleteVersementMutation.isPending}
                                      onClick={async () => {
                                        if (!window.confirm('Supprimer ce versement ? Les totaux du contrat seront recalculés. Action irréversible.')) return
                                        try {
                                          await deleteVersementMutation.mutateAsync({
                                            contractId: contract.id,
                                            monthIndex: monthPayment!.monthIndex,
                                            versementId: lastVersement.id,
                                          })
                                        } catch {
                                          // Erreur gérée par le hook (toast)
                                        }
                                      }}
                                    >
                                      <Trash2 className="h-3 w-3 mr-1" />
                                      {deleteVersementMutation.isPending ? 'Suppression…' : 'Supprimer'}
                                    </Button>
                                  )}
                                </div>
                              )
                            })()}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>

            {/* Information */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>ℹ️ Information :</strong> Cliquez sur un mois pour voir le reçu (mois payé) ou enregistrer un versement.
                {/* RESTRICTION DÉSACTIVÉE : on autorise tout mois à recevoir un versement. Pour rétablir le message, décommenter :
                {nextUnpaidMonthIndex !== null && !isContractTerminated && (
                  <> Seul le <strong>mois M{nextUnpaidMonthIndex + 1}</strong> (prochain mois à payer) accepte un nouveau versement.</>
                )}
                */}
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
            setEditVersement(null)
          }}
          onSubmit={handlePaymentSubmit}
          title={editVersement ? `Modifier le versement – Mois M${editVersement.payment.monthIndex + 1}` : `Versement pour le mois M${(selectedMonthIndex ?? 0) + 1}`}
          description={editVersement ? 'Modifier la date, l\'heure, le montant, le mode ou la preuve du versement.' : `Enregistrer le versement mensuel de ${contract.subscriptionCIAmountPerMonth.toLocaleString('fr-FR')} FCFA`}
          defaultAmount={contract.subscriptionCIAmountPerMonth}
          isMonthly={true}
          contractId={contract.id}
          initialData={editVersement ? { date: editVersement.versement.date, time: editVersement.versement.time, amount: editVersement.versement.amount, mode: editVersement.versement.mode, withFees: editVersement.versement.withFees, paymentMethodOther: editVersement.versement.paymentMethodOther, proofUrl: editVersement.versement.proofUrl, agentRecouvrementId: editVersement.versement.agentRecouvrementId } : undefined}
          submitLabel={editVersement ? 'Modifier le versement' : undefined}
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
                  const isMemberSubmitted = !!r._submittedByMember || r.status === 'PENDING' || r.status === 'APPROVED' || r.status === 'REJECTED'
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

        {/* Historique des aides financières */}
        <SupportHistorySection contractId={contract.id} />

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
