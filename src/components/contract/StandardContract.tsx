"use client"

import { Badge, Badge as BadgeShadcn } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import EarlyWithdrawalRequestModal from '@/components/shared/EarlyWithdrawalRequestModal'
import routes from "@/constantes/routes"
import { listRefunds } from "@/db/caisse/refunds.db"
import { getGroupById } from "@/db/group.db"
import { useAuth } from "@/hooks/useAuth"
import { useCaisseContract } from "@/hooks/useCaisseContracts"
import { useCaisseSpecialeContractRealtimeSync } from '@/hooks/caisse-speciale/useCaisseSpecialeContractRealtimeSync'
import { useActiveCaisseSettingsByType } from "@/hooks/useCaisseSettings"
import { useGroupMembers, useMember } from "@/hooks/useMembers"
import {
    approveRefund,
    cancelEarlyRefund,
    markRefundPaid,
    pay,
    requestEarlyRefund,
    requestFinalRefund,
    updatePaymentContribution,
} from "@/services/caisse/mutations"
import type { RefundDocument } from "@/types/types"
import { getContractStatusConfig } from '@/utils/contract-status'
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
    AlertTriangle,
    ArrowLeft,
    CalendarDays,
    CheckCircle2,
    Clock,
    CreditCard,
    DollarSign,
    Download,
    Eye,
    FileText,
    History,
    RefreshCw,
    Trash2,
    TrendingUp,
    X,
    XCircle,
} from "lucide-react"
import { useRouter } from "next/navigation"
import React, { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import ContractDetailsSkeleton from "./ContractDetailsSkeleton"
import PaymentCSModal, { PaymentCSFormData } from "./PaymentCSModal"
import PdfDocumentModal from "./PdfDocumentModal"
import PdfViewerModal from "./PdfViewerModal"
import RemboursementNormalPDFModal from "./RemboursementNormalPDFModal"
import TestPaymentTools from "./TestPaymentTools"
import EmergencyContact from "./standard/EmergencyContact"
import PaymentInvoiceModal from "./standard/PaymentInvoiceModal"

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


function classNames(...cls: (string | false | undefined)[]) {
  return cls.filter(Boolean).join(" ")
}

// ————————————————————————————————————————————————————————————
// Component
// ————————————————————————————————————————————————————————————

type Props = { id: string }

export default function StandardContract({ id }: Props) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data, isLoading, isError, error, refetch } = useCaisseContract(id)
  const { user } = useAuth()
  const { data: member } = useMember((data as any)?.memberId)
  const { data: group } = useQuery({
    queryKey: ['group', (data as any)?.groupeId],
    queryFn: () => getGroupById((data as any)?.groupeId as string),
    enabled: !!(data as any)?.groupeId,
  })

  const [isRefunding, setIsRefunding] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number | null>(null)
  const [selectedPayment, setSelectedPayment] = useState<any>(null)
  /** Paiement en cours de modification (ouverture du formulaire en mode édition) */
  const [editPayment, setEditPayment] = useState<{ paymentId: string; contributionId: string; payment: any } | null>(null)
  const [refundFile, setRefundFile] = useState<File | undefined>()
  const [refundDate, setRefundDate] = useState(() => new Date().toISOString().split("T")[0])
  const [refundTime, setRefundTime] = useState(() => {
    const now = new Date()
    return `${now.getHours().toString().padStart(2, "0")}:${now
      .getMinutes()
      .toString()
      .padStart(2, "0")}`
  })
  const [confirmApproveId, setConfirmApproveId] = useState<string | null>(null)
  const [confirmPaidId, setConfirmPaidId] = useState<string | null>(null)
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [showPdfViewer, setShowPdfViewer] = useState(false)
  const [showRemboursementPdf, setShowRemboursementPdf] = useState(false)
  const [currentRefundId, setCurrentRefundId] = useState<string | null>(null)
  const [currentDocument, setCurrentDocument] = useState<RefundDocument | null>(null)
  const [refunds, setRefunds] = useState<any[]>([])
  const [confirmDeleteDocumentId, setConfirmDeleteDocumentId] = useState<string | null>(null)
  const [showEarlyRefundModal, setShowEarlyRefundModal] = useState(false)
  const [showReasonModal, setShowReasonModal] = useState(false)
  const [refundType, setRefundType] = useState<'FINAL' | null>(null)
  const [refundReasonInput, setRefundReasonInput] = useState('')

  // Fonction pour recharger les remboursements
  const reloadRefunds = React.useCallback(async () => {
    if (id) {
      try {
        const refundsData = await listRefunds(id)
        setRefunds(refundsData)
      } catch {
        // Error loading refunds - silently fail
      }
    }
  }, [id])

  // Load refunds from subcollection
  useEffect(() => {
    reloadRefunds()
  }, [reloadRefunds])

  const refreshRealtimeData = useCallback(() => {
    void refetch()
    void reloadRefunds()
  }, [refetch, reloadRefunds])

  useCaisseSpecialeContractRealtimeSync(id, {
    enabled: !showRemboursementPdf,
    onContractChanged: refreshRealtimeData,
    onRefundsChanged: refreshRealtimeData,
  })

  function _paymentStatusLabel(s: string): string {
    const map: Record<string, string> = { DUE: "À payer", PAID: "Payé", REFUSED: "Refusé" }
    return map[s] || s
  }
  function _refundStatusLabel(s: string): string {
    const map: Record<string, string> = {
      PENDING: "En attente",
      APPROVED: "Approuvé",
      PAID: "Payé",
      ARCHIVED: "Archivé",
    }
    return map[s] || s
  }
  function _refundTypeLabel(t: string): string {
    const map: Record<string, string> = { FINAL: "Final", EARLY: "Anticipé", DEFAULT: "Défaut" }
    return map[t] || t
  }

  if (isLoading) return <ContractDetailsSkeleton />
  if (isError)
    return (
      <div className="p-6 text-red-600">Erreur de chargement du contrat: {(error as any)?.message}</div>
    )
  if (!data) return <div className="p-6">Contrat introuvable</div>

  const isClosed = data.status === "CLOSED" || data.status === "RESCINDED"
  const headerStatusConfig = getContractStatusConfig(data.status)
  const HeaderStatusIcon = headerStatusConfig.icon
  const headerBadges = (
    <>
      <Badge className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] text-white text-lg px-4 py-2">
        Contrat Standard
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

  // Récupérer les membres du groupe si c'est un contrat de groupe
  const groupeId = (data as any).groupeId || ((data as any).memberId && (data as any).memberId.length > 20 ? (data as any).memberId : null)
  const isGroupContract = data.contractType === 'GROUP' || !!groupeId
  const { data: groupMembers } = useGroupMembers(groupeId, isGroupContract)

  const payments = data.payments || []
  const paidCount = payments.filter((x: any) => x.status === 'PAID').length
  const totalMonths = data.monthsPlanned || 0
  const progress = totalMonths > 0 ? (paidCount / totalMonths) * 100 : 0

  // Récupérer les paramètres de caisse
  const _settings = useActiveCaisseSettingsByType((data as any).caisseType)

  // Le bonus accumulé est déjà calculé et stocké dans bonusAccrued lors des paiements
  const currentBonus = data.bonusAccrued || 0

  // Trouver la prochaine échéance à payer (paiement séquentiel)
  const getNextDueMonthIndex = () => {
    const sortedPayments = [...payments].sort((a, b) => a.dueMonthIndex - b.dueMonthIndex)
    const nextDue = sortedPayments.find(p => p.status === "DUE")
    return nextDue ? nextDue.dueMonthIndex : -1
  }

  const nextDueMonthIndex = getNextDueMonthIndex()

  const currentRefund = useMemo(() => {
    return currentRefundId ? refunds.find((r: any) => r.id === currentRefundId) : null
  }, [currentRefundId, refunds])

  const documentMemberId = useMemo(() => {
    if ((data as any).memberId) return (data as any).memberId
    if ((data as any).groupeId) return `GROUP_${(data as any).groupeId}`
    return ''
  }, [data])

  const handlePdfUpload = async (document: RefundDocument | null) => {
    // Le document est maintenant persisté dans la base de données
    // On peut fermer le modal et rafraîchir les données
    setShowPdfModal(false)
    await refetch()
    await reloadRefunds() // Rafraîchir la liste des remboursements
  }

  const handleViewDocument = async (refundId: string, document: RefundDocument) => {
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

  const handleDeleteDocument = async (refundId: string) => {
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

  const handleMonthClick = (monthIndex: number, payment: any) => {
    setSelectedMonthIndex(monthIndex)
    setEditPayment(null)

    // Si le paiement est déjà effectué, afficher la facture
    if (payment.status === 'PAID') {
      setSelectedPayment(payment)
      setShowInvoiceModal(true)
    } else {
      // Sinon, afficher le formulaire de paiement
      setShowPaymentModal(true)
    }
  }

  const handlePaymentSubmit = async (paymentData: PaymentCSFormData) => {
    if (editPayment) {
      try {
        await updatePaymentContribution({
          contractId: id,
          paymentId: editPayment.paymentId,
          contributionId: editPayment.contributionId,
          updates: {
            amount: paymentData.amount,
            time: paymentData.time,
            mode: paymentData.mode,
            withFees: paymentData.withFees,
            paymentMethodOther: paymentData.paymentMethodOther,
            proofFile: paymentData.proofFile,
            paidAt: new Date(`${paymentData.date}T${paymentData.time}`),
            modificationReason: paymentData.modificationReason,
            agentRecouvrementId: paymentData.agentRecouvrementId,
          },
        })
        await queryClient.invalidateQueries({ queryKey: ['caisse-contract', id] })
        await refetch()
        toast.success('Versement modifié')
        setShowPaymentModal(false)
        setEditPayment(null)
      } catch (err) {
        console.error('Erreur lors de la modification:', err)
        toast.error(err instanceof Error ? err.message : 'Impossible de modifier le versement')
      }
      return
    }

    if (selectedMonthIndex === null) return

    try {
      await pay({
        contractId: id,
        dueMonthIndex: selectedMonthIndex,
        memberId: data.memberId,
        amount: paymentData.amount,
        file: paymentData.proofFile!,
        paidAt: new Date(`${paymentData.date}T${paymentData.time}`),
        time: paymentData.time,
        mode: paymentData.mode,
        withFees: paymentData.withFees,
        paymentMethodOther: paymentData.paymentMethodOther,
        agentRecouvrementId: paymentData.agentRecouvrementId
      })
      await refetch()
      toast.success('Contribution enregistrée')

      setShowPaymentModal(false)
      setSelectedMonthIndex(null)
    } catch (error) {
      console.error('Erreur lors du paiement:', error)
      throw error
    }
  }

  const openEditPaymentModal = (e: React.MouseEvent, payment: any) => {
    e.stopPropagation()
    const contrib = payment?.contribs?.[0]
    if (!contrib) return
    const paidAt = contrib.paidAt ? (typeof contrib.paidAt?.toDate === 'function' ? contrib.paidAt.toDate() : new Date(contrib.paidAt)) : new Date()
    setEditPayment({
      paymentId: payment.id,
      contributionId: contrib.id,
      payment,
    })
    setSelectedMonthIndex(null)
    setShowPaymentModal(true)
  }

  const getMonthlyPeriodBounds = useCallback((dueMonthIndex: number) => {
    const raw = (data as any)?.contractStartAt ?? (data as any)?.firstPaymentDate
    if (!raw) return null
    const startRef = typeof raw?.toDate === 'function' ? raw.toDate() : new Date(raw)
    if (isNaN(startRef.getTime())) return null
    const start = new Date(startRef)
    start.setMonth(start.getMonth() + dueMonthIndex)
    const end = new Date(startRef)
    end.setMonth(end.getMonth() + dueMonthIndex + 1)
    end.setDate(end.getDate() - 1)
    return { start, end }
  }, [data])

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
              <DollarSign className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 shrink-0" />
              <span className="break-words">{member?.firstName || ''} {member?.lastName || ''}</span>
            </CardTitle>
            <div className="space-y-1 text-blue-100 break-words">
              <p className="text-sm sm:text-base lg:text-lg break-words">
                Contrat <span className="font-mono text-xs sm:text-sm break-all">#{id}</span>
              </p>
              <p className="text-sm break-words">
                {member?.firstName || ''} {member?.lastName || ''} - Type: <span className="font-mono text-xs break-all">{String((data as any).caisseType)}</span>
              </p>
            </div>
          </CardHeader>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <StatCard icon={CreditCard} label="Montant mensuel" value={`${formatAmount(data.monthlyAmount || 0)} FCFA`} accent="brand" />
          <StatCard icon={Clock} label="Durée (mois)" value={data.monthsPlanned || 0} />
          <StatCard icon={CheckCircle2} label="Nominal payé" value={`${formatAmount(data.nominalPaid || 0)} FCFA`} />
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
                style={{ width: `${Math.min(100, progress)}%` }}
              />
            </div>
            <div className="text-sm text-slate-700">
              Montant payé&nbsp;: <b>{formatAmount(data.nominalPaid || 0)} FCFA</b>
            </div>
          </CardContent>
        </Card>

        {/* Outils de test (DEV uniquement) */}
        <TestPaymentTools
          contractId={id}
          contractData={data}
          onPaymentSuccess={async () => {
            await refetch()
            await reloadRefunds() // Rafraîchir la liste des remboursements
          }}
        />
        {/* Échéancier de Paiement */}
        <Card className="border-0 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-indigo-100/50 border-b">
            <CardTitle className="flex items-center gap-2 text-indigo-700">
              <CalendarDays className="h-5 w-5" />
              Échéancier de Paiement
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {payments.map((p: any) => {
                let badge: React.ReactNode = null
                if (p.status === "DUE" && p.dueAt) {
                  const now = new Date()
                  const due = new Date(p.dueAt)
                  const days = Math.floor((now.getTime() - due.getTime()) / 86400000)
                  if (days > 12) badge = <BadgeShadcn variant="destructive">{">"}J+12</BadgeShadcn>
                  else if (days >= 4) badge = <BadgeShadcn variant="secondary">J+4..J+12</BadgeShadcn>
                  else if (days >= 0) badge = <BadgeShadcn variant="secondary">J+0..J+3</BadgeShadcn>
                }

                const isSelectable = p.status === "DUE" && !isClosed && p.dueMonthIndex === nextDueMonthIndex
                const isDisabled = isClosed && p.status !== 'PAID'

                const getStatusConfig = (status: string) => {
                  switch (status) {
                    case 'DUE':
                      return { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', icon: Clock }
                    case 'PAID':
                      return { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', icon: CheckCircle2 }
                    case 'REFUSED':
                      return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', icon: X }
                    default:
                      return { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', icon: AlertTriangle }
                  }
                }

                const statusConfig = getStatusConfig(p.status)
                const StatusIcon = statusConfig.icon

                return (
                  <Card
                    key={p.id}
                    className={`transition-all duration-300 border-2 ${isDisabled
                        ? 'border-gray-200 bg-gray-100 cursor-not-allowed opacity-60'
                        : p.status === 'PAID'
                          ? 'border-green-200 bg-green-50/50 cursor-pointer hover:shadow-lg hover:-translate-y-1'
                          : isSelectable
                            ? 'border-blue-200 bg-blue-50 cursor-pointer hover:shadow-lg hover:-translate-y-1'
                            : 'border-gray-200 hover:border-[#224D62] cursor-pointer hover:shadow-lg hover:-translate-y-1'
                      }`}
                    onClick={() => (isSelectable || p.status === 'PAID') && !isDisabled && handleMonthClick(p.dueMonthIndex, p)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="bg-[#224D62] text-white rounded-lg px-3 py-1 text-sm font-bold">
                            M{p.dueMonthIndex + 1}
                          </div>
                          {badge}
                        </div>
                        <Badge className={`${statusConfig.bg} ${statusConfig.text} ${statusConfig.border} border`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {p.status === "DUE" && p.dueMonthIndex !== nextDueMonthIndex ? "À venir" :
                            p.status === "DUE" ? "À payer" :
                              p.status === "PAID" ? "Payé" :
                                p.status === "REFUSED" ? "Refusé" : p.status}
                        </Badge>
                      </div>

                      <div className="space-y-3">
                        {(() => {
                          const bounds = getMonthlyPeriodBounds(p.dueMonthIndex)
                          return bounds ? (
                            <div className="text-sm">
                              <span className="text-gray-600">Période: </span>
                              <span className="font-semibold text-gray-900">
                                du {bounds.start.toLocaleDateString("fr-FR")} au {bounds.end.toLocaleDateString("fr-FR")}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Échéance:</span>
                              <span className="font-semibold text-gray-900">
                                {p.dueAt ? new Date(p.dueAt).toLocaleDateString("fr-FR") : "—"}
                              </span>
                            </div>
                          )
                        })()}

                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Montant versé:</span>
                          <span className="font-semibold text-gray-900">
                            {p.status === "PAID"
                              ? `${formatAmount(
                                  Number(p.amount) ||
                                    (Array.isArray(p.contribs) ? p.contribs.reduce((s: number, c: any) => s + (Number(c?.amount) || 0), 0) : 0)
                                )} FCFA`
                              : "—"}
                          </span>
                        </div>

                        {p.paidAt && (
                          <>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Payé le:</span>
                              <span className="font-semibold text-green-600">
                                {new Date(p.paidAt).toLocaleDateString("fr-FR")}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Payé à:</span>
                              <span className="font-semibold text-green-600">
                                {(p.time ?? p.contribs?.[0]?.time) || new Date(p.paidAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                          </>
                        )}

                        {Number(p.penaltyApplied) > 0 && (
                          <div className="flex items-center justify-between text-sm text-red-600 font-medium">
                            <span>Pénalité:</span>
                            <span>{Number(p.penaltyApplied).toLocaleString("fr-FR")} FCFA</span>
                          </div>
                        )}

                        {p.status === 'PAID' && ((p as any).modificationReason ?? (p as any).updatedAt) && (
                          <div className="pt-2 mt-2 border-t border-gray-100 space-y-1 text-xs text-gray-500">
                            {(p as any).updatedAt && (() => {
                              const u = (p as any).updatedAt
                              const modDate = typeof u?.toDate === 'function' ? u.toDate() : u ? new Date(u) : null
                              if (!modDate || isNaN(modDate.getTime())) return null
                              return (
                                <div className="flex items-center justify-between">
                                  <span>Modifié le:</span>
                                  <span>{modDate.toLocaleDateString("fr-FR")} à {modDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                                </div>
                              )
                            })()}
                            {(p as any).modificationReason && (
                              <div>
                                <span className="font-medium">Motif:</span>
                                <span className="ml-1">{(p as any).modificationReason}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {!isDisabled && (isSelectable || p.status === 'PAID') && (
                        <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                          {isSelectable ? (
                            <div className="text-sm text-[#234D65] font-medium">Cliquez pour payer</div>
                          ) : p.status === 'PAID' ? (
                            <>
                              <div className="flex flex-col gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="w-full text-[#234D65] border-[#234D65] hover:bg-[#234D65]/10"
                                  onClick={(e) => { e.stopPropagation(); handleMonthClick(p.dueMonthIndex, p); }}
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  Voir la facture
                                </Button>
                                {!isClosed && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="w-full text-amber-700 border-amber-300 hover:bg-amber-50"
                                    onClick={(e) => openEditPaymentModal(e, p)}
                                  >
                                    Modifier
                                  </Button>
                                )}
                              </div>
                            </>
                          ) : null}
                        </div>
                      )}
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

        {/* Modal de paiement (création ou modification) */}
        <PaymentCSModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false)
            setSelectedMonthIndex(null)
            setEditPayment(null)
          }}
          onSubmit={handlePaymentSubmit}
          title={editPayment
            ? `Modifier le versement – mois M${(editPayment.payment.dueMonthIndex ?? 0) + 1}`
            : `Versement pour le mois M${(selectedMonthIndex ?? 0) + 1}`}
          description={editPayment ? 'Modifier la date, l\'heure, le montant ou la preuve du versement.' : 'Enregistrer le versement mensuel'}
          defaultAmount={data.monthlyAmount || 0}
          amountDisabled={data.caisseType === 'STANDARD' || data.caisseType === 'STANDARD_CHARITABLE'}
          initialData={editPayment ? (() => {
            const p = editPayment.payment
            const contribs = p?.contribs ?? []
            const c = contribs[0]
            if (!c) return undefined
            const lastContribWithAgent = contribs.length ? [...contribs].reverse().find((x: any) => x.agentRecouvrementId) : null
            const agentRecouvrementId = (p as any)?.agentRecouvrementId ?? lastContribWithAgent?.agentRecouvrementId ?? c?.agentRecouvrementId ?? ''
            const paidAt = c.paidAt ? (typeof c.paidAt?.toDate === 'function' ? c.paidAt.toDate() : new Date(c.paidAt)) : new Date()
            return {
              date: paidAt.toISOString().split('T')[0],
              time: (c.time ?? `${String(paidAt.getHours()).padStart(2, '0')}:${String(paidAt.getMinutes()).padStart(2, '0')}`),
              amount: Number(c.amount) || 0,
              mode: (c.mode ?? 'airtel_money') as PaymentCSFormData['mode'],
              withFees: c.withFees,
              paymentMethodOther: c.paymentMethodOther,
              proofUrl: c.proofUrl,
              agentRecouvrementId: agentRecouvrementId || undefined,
            }
          })() : undefined}
          submitLabel={editPayment ? 'Modifier le versement' : undefined}
          isGroupContract={isGroupContract}
        />

        {/* Modal de facture */}
        <PaymentInvoiceModal
          isOpen={showInvoiceModal}
          onClose={() => {
            setShowInvoiceModal(false)
            setSelectedPayment(null)
            setSelectedMonthIndex(null)
          }}
          payment={selectedPayment}
          contractData={data}
          member={member ?? undefined}
          group={group ?? undefined}
          payments={payments}
          getAdminDisplayName={(id) => id || '—'}
        />


        {/* Section Remboursements */}
        <Card className="border-0 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-indigo-500 to-indigo-600">
            <CardTitle className="flex items-center gap-2 text-white">
              <RefreshCw className="h-5 w-5" />
              Remboursements
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {(() => {
              const paidCountLocal = payments.filter((x: any) => x.status === "PAID").length
              const allPaid = payments.length > 0 && paidCountLocal === payments.length
              const canEarly = paidCountLocal >= 1 && !allPaid
              const hasFinalRefund = refunds.some((r: any) => r.type === "FINAL" && r.status !== "ARCHIVED") ||
                data.status === "FINAL_REFUND_PENDING" ||
                data.status === "CLOSED"
              const hasEarlyRefund = refunds.some((r: any) => r.type === "EARLY" && r.status !== "ARCHIVED") ||
                data.status === "EARLY_REFUND_PENDING"

              // Vérifier si une demande de retrait anticipé ou remboursement final est active (PENDING ou APPROVED)
              const hasActiveRefund = refunds.some((r: any) =>
                (r.type === 'EARLY' || r.type === 'FINAL') &&
                (r.status === 'PENDING' || r.status === 'APPROVED')
              )
              return (
                <>
                  {/* Boutons d'action */}
                  <div className="flex flex-col sm:flex-row gap-3 mb-6">
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
                      onClick={() => setShowEarlyRefundModal(true)}
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
                              return { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', icon: CheckCircle2 }
                            case 'PAID':
                              return { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', icon: CheckCircle2 }
                            default:
                              return { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', icon: X }
                          }
                        }

                        const statusConfig = getRefundStatusConfig(r.status)
                        const StatusIcon = statusConfig.icon
                        const finalProofUrl = r.proofUrl || r.withdrawalProofUrl
                        const finalDocumentUrl = r.document?.url
                        const finalAdminName = r.processedByName || r.processedBy
                        const finalDate = r.withdrawalDate ? new Date(r.withdrawalDate) : (r.processedAt ? new Date(r.processedAt) : null)
                        const finalTime = r.withdrawalTime || r.processedTime

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

                            {r.type === 'FINAL' && r.status === 'PAID' && (
                              <div className="mb-4 border-t border-gray-100 pt-3 space-y-2">
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="text-gray-600">Document téléversé:</span>
                                  {finalDocumentUrl ? (
                                    <a href={finalDocumentUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-medium">Voir le PDF</a>
                                  ) : (
                                    <span className="text-xs text-gray-500">Indisponible</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="text-gray-600">Preuve téléversée:</span>
                                  {finalProofUrl ? (
                                    <a href={finalProofUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-medium">Voir la preuve</a>
                                  ) : (
                                    <span className="text-xs text-gray-500">Indisponible</span>
                                  )}
                                </div>
                                <div className="pt-1 space-y-1 text-xs text-gray-500">
                                  {finalAdminName && <p>Marqué par: {finalAdminName}</p>}
                                  {finalDate && (
                                    <p>
                                      Le {finalDate.toLocaleDateString('fr-FR')} à {finalTime || finalDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}

                            {r.status === "PENDING" && (
                              <div className="space-y-2">
                                {/* Première ligne : Approbation et Document de remboursement */}
                                <div className="flex flex-col sm:flex-row gap-2">
                                  <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => setConfirmApproveId(r.id)}
                                    disabled={(r.type === "FINAL" && !r.document) || (r.type === "EARLY" && !r.document)}
                                  >
                                    Approuver
                                  </Button>
                                  {(r.type === "FINAL" || r.type === "EARLY") && (
                                    <Button
                                      variant="outline"
                                      className="flex-1 border-green-300 text-green-600 hover:bg-green-50 flex items-center justify-center gap-2"
                                      onClick={() => setShowRemboursementPdf(true)}
                                    >
                                      <FileText className="h-4 w-4" />
                                      Document de remboursement
                                    </Button>
                                  )}
                                </div>

                                {/* Deuxième ligne : Actions sur le PDF */}
                                {(r.type === "FINAL" || r.type === "EARLY") && (
                                  <div className="flex flex-col sm:flex-row gap-2">
                                    {r.document ? (
                                      <>
                                        <Button
                                          variant="outline"
                                          className="flex-1 border-green-300 text-green-600 hover:bg-green-50 flex items-center justify-center gap-2"
                                          onClick={() => handleViewDocument(r.id, r.document)}
                                        >
                                          <Eye className="h-4 w-4" />
                                          Voir PDF
                                        </Button>
                                        <Button
                                          variant="outline"
                                          className="flex-1 border-blue-300 text-blue-600 hover:bg-blue-50 flex items-center justify-center gap-2"
                                          onClick={() => handleOpenPdfModal(r.id)}
                                        >
                                          <FileText className="h-4 w-4" />
                                          Remplacer PDF
                                        </Button>
                                        <Button
                                          variant="outline"
                                          className="flex-1 border-red-300 text-red-600 hover:bg-red-50 flex items-center justify-center gap-2"
                                          onClick={() => setConfirmDeleteDocumentId(r.id)}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                          Supprimer PDF
                                        </Button>
                                      </>
                                    ) : (
                                      <Button
                                        variant="outline"
                                        className="flex-1 border-red-300 text-red-600 hover:bg-red-50 flex items-center justify-center gap-2"
                                        onClick={() => handleOpenPdfModal(r.id)}
                                      >
                                        <FileText className="h-4 w-4" />
                                        Ajouter PDF
                                      </Button>
                                    )}
                                  </div>
                                )}

                                {/* Troisième ligne : Annulation (si applicable) */}
                                {r.type === "EARLY" && !r.document && (
                                  <Button
                                    variant="outline"
                                    className="w-full border-red-300 text-red-600 hover:bg-red-50"
                                    onClick={async () => {
                                      try {
                                        await cancelEarlyRefund(id, r.id)
                                        await refetch()
                                        await reloadRefunds() // Rafraîchir la liste des remboursements
                                        toast.success("Demande anticipée annulée")
                                      } catch (e: any) {
                                        toast.error(e?.message || "Annulation impossible")
                                      }
                                    }}
                                  >
                                    Annuler la demande
                                  </Button>
                                )}
                              </div>
                            )}

                            {r.status === "APPROVED" && (
                              <div className="space-y-4">
                                {/* Affichage de la cause (non modifiable) */}
                                {r.reason && (
                                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <label className="block text-xs text-blue-700 font-medium mb-1">Cause du retrait:</label>
                                    <p className="text-sm text-blue-900">{r.reason}</p>
                                  </div>
                                )}

                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                  <div>
                                    <label className="mb-1 block text-xs text-slate-600">Date du retrait *</label>
                                    <input
                                      type="date"
                                      value={refundDate}
                                      onChange={(e) => setRefundDate(e.target.value)}
                                      className="w-full rounded-lg border p-2 text-xs"
                                      required
                                    />
                                  </div>
                                  <div>
                                    <label className="mb-1 block text-xs text-slate-600">Heure du retrait *</label>
                                    <input
                                      type="time"
                                      value={refundTime}
                                      onChange={(e) => setRefundTime(e.target.value)}
                                      className="w-full rounded-lg border p-2 text-xs"
                                      required
                                    />
                                  </div>
                                  <div>
                                    <label className="mb-1 block text-xs text-slate-600">Preuve du retrait *</label>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={async (e) => {
                                        const f = e.target.files?.[0]
                                        if (!f) {
                                          setRefundFile(undefined)
                                          return
                                        }
                                        if (!f.type.startsWith("image/")) {
                                          toast.error("La preuve doit être une image (JPG, PNG, WebP...)")
                                          setRefundFile(undefined)
                                          return
                                        }
                                        setRefundFile(f)
                                        toast.success("Preuve PDF sélectionnée")
                                      }}
                                      className="w-full rounded-lg border p-2 text-xs"
                                      required
                                    />
                                  </div>
                                </div>
                                <Button
                                  className={classNames(
                                    "w-full inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-white",
                                    brand.bg,
                                    brand.hover,
                                    "disabled:opacity-50"
                                  )}
                                  disabled={(() => {
                                    const hasFile = !!refundFile
                                    const hasDate = refundDate || r.withdrawalDate
                                    const hasTime = (refundTime && refundTime.trim()) || (r.withdrawalTime && r.withdrawalTime.trim() && r.withdrawalTime !== "--:--")
                                    return !hasFile || !hasDate || !hasTime
                                  })()}
                                  onClick={async () => {
                                    try {
                                      const normalizeDate = (dateValue: any): string | null => {
                                        if (!dateValue) return null
                                        try {
                                          let date: Date
                                          if (dateValue && typeof dateValue.toDate === "function") {
                                            date = dateValue.toDate()
                                          } else if (dateValue instanceof Date) {
                                            date = dateValue
                                          } else if (typeof dateValue === "string") {
                                            date = new Date(dateValue)
                                          } else {
                                            date = new Date(dateValue)
                                          }
                                          return isNaN(date.getTime()) ? null : date.toISOString().split("T")[0]
                                        } catch {
                                          return null
                                        }
                                      }

                                      await markRefundPaid(id, r.id, refundFile!, {
                                        reason: r.reason,
                                        withdrawalDate: refundDate || normalizeDate(r.withdrawalDate) || undefined,
                                        withdrawalTime: refundTime || r.withdrawalTime,
                                      })
                                      setRefundDate("")
                                      setRefundTime("")
                                      setRefundFile(undefined)
                                      setConfirmPaidId(null)
                                      await refetch()
                                      await reloadRefunds() // Rafraîchir la liste des remboursements
                                      toast.success("Remboursement marqué payé")
                                    } catch (error: any) {
                                      toast.error(error?.message || "Erreur lors du marquage")
                                    }
                                  }}
                                >
                                  <FileText className="h-4 w-4" /> Marquer payé
                                </Button>
                              </div>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                </>
              )
            })()}
          </CardContent>
        </Card>
      </div>
      {/* Modales */}
      <EarlyWithdrawalRequestModal
        isOpen={showEarlyRefundModal}
        onClose={() => setShowEarlyRefundModal(false)}
        isSubmitting={isRefunding}
        memberDisplayName={
          member
            ? `${member.firstName || ''} ${member.lastName || ''}`.trim()
            : (group as any)?.nom || (group as any)?.name || 'Membre'
        }
        contractDisplayLabel={`Contrat #${id} - Caisse Spéciale`}
        monthlyAmountLabel={`Montant mensuel : ${formatAmount(data.monthlyAmount || 0)} FCFA`}
        maxAmount={Math.max(0, Math.round(data.nominalPaid || 0))}
        onSubmit={async (formData) => {
          try {
            setIsRefunding(true)
            await requestEarlyRefund(id, {
              reason: formData.reason,
              withdrawalDate: formData.withdrawalDate,
              withdrawalTime: formData.withdrawalTime,
              withdrawalAmount: formData.withdrawalAmount,
              withdrawalMode: formData.withdrawalMode,
              withdrawalProof: formData.withdrawalProof,
              documentPdf: formData.documentPdf,
              createdBy: user?.uid,
            })
            await refetch()
            await reloadRefunds()
            toast.success('Retrait anticipé demandé')
          } catch (e: any) {
            toast.error(e?.message || 'Action impossible')
            throw e
          } finally {
            setIsRefunding(false)
          }
        }}
      />
      {/* Modale de saisie de la cause du retrait */}
      {showReasonModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border bg-white p-5 shadow-xl">
            <div className="text-base font-semibold mb-4">
              Demande de remboursement final
            </div>
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
            <div className="mt-6 flex justify-end gap-2">
              <button
                className="rounded-lg border px-4 py-2 text-sm"
                onClick={() => {
                  setShowReasonModal(false)
                  setRefundType(null)
                  setRefundReasonInput('')
                }}
              >
                Annuler
              </button>
              <button
                className={classNames(
                  "rounded-lg px-4 py-2 text-sm text-white",
                  brand.bg,
                  brand.hover,
                  "disabled:opacity-50"
                )}
                disabled={!refundReasonInput.trim() || isRefunding}
                onClick={async () => {
                  try {
                    setIsRefunding(true)

                    if (refundType !== 'FINAL') {
                      throw new Error('Cette action est réservée au remboursement final')
                    }
                    await requestFinalRefund(id, refundReasonInput)
                    toast.success('Remboursement final demandé')

                    await refetch()
                    await reloadRefunds() // Rafraîchir la liste des remboursements

                    setShowReasonModal(false)
                    setRefundType(null)
                    setRefundReasonInput('')

                    // Afficher le PDF de remboursement
                    setShowRemboursementPdf(true)
                  } catch (e: any) {
                    toast.error(e?.message || "Action impossible")
                  } finally {
                    setIsRefunding(false)
                  }
                }}
              >
                {isRefunding ? 'Traitement...' : 'Confirmer et voir le PDF'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmApproveId && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl border bg-white p-5 shadow-xl">
            <div className="text-base font-semibold">Confirmer l'approbation</div>
            <p className="mt-1 text-sm text-slate-600">Voulez-vous approuver ce remboursement ?</p>
            <div className="mt-4 flex justify-end gap-2">
              <button className="rounded-lg border px-3 py-2 text-sm" onClick={() => setConfirmApproveId(null)}>
                Annuler
              </button>
              <button
                className={classNames("rounded-lg px-3 py-2 text-sm text-white", brand.bg, brand.hover)}
                onClick={async () => {
                  if (!confirmApproveId) return
                  await approveRefund(id, confirmApproveId)
                  setConfirmApproveId(null)
                  await refetch()
                  await reloadRefunds() // Rafraîchir la liste des remboursements
                  toast.success("Remboursement approuvé")
                }}
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Modal PDF Document */}
      {currentRefund && (
        <PdfDocumentModal
          isOpen={showPdfModal}
          onClose={() => setShowPdfModal(false)}
          onDocumentUploaded={handlePdfUpload}
          contractId={id}
          refundId={currentRefundId || ""}
          existingDocument={currentRefund?.document || null}
          title={currentRefund.type === 'FINAL' ? 'Document de Remboursement Final' : 'Document de Retrait Anticipé'}
          description={currentRefund.type === 'FINAL' ? 'Téléchargez le document PDF à remplir, puis téléversez-le une fois complété pour pouvoir approuver le remboursement final.' : 'Téléchargez le document PDF à remplir, puis téléversez-le une fois complété pour pouvoir approuver le retrait anticipé.'}
          documentType={currentRefund.type === 'FINAL' ? 'FINAL_REFUND_CS' : 'EARLY_REFUND_CS'}
          memberId={documentMemberId}
          documentLabel={`${currentRefund?.type === 'FINAL' ? 'Remboursement final' : 'Retrait anticipé'} - Contrat ${id}`}
        />
      )}

      {/* Modal PDF Viewer */}
      {currentDocument && currentRefundId && (
        <PdfViewerModal
          isOpen={showPdfViewer}
          onClose={() => setShowPdfViewer(false)}
          document={currentDocument}
          title={currentRefundId ? (refunds.find((r: any) => r.id === currentRefundId)?.type === 'FINAL' ? 'Document de Remboursement Final' : 'Document de Retrait Anticipé') : 'Document de Remboursement'}
        />
      )}


      {/* Modal de confirmation de suppression */}
      {confirmDeleteDocumentId && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl border bg-white p-5 shadow-xl">
            <div className="text-base font-semibold">Confirmer la suppression</div>
            <p className="mt-1 text-sm text-slate-600">
              Voulez-vous vraiment supprimer ce document PDF ? Cette action est irréversible.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="rounded-lg border px-3 py-2 text-sm"
                onClick={() => setConfirmDeleteDocumentId(null)}
              >
                Annuler
              </button>
              <button
                className="rounded-lg px-3 py-2 text-sm text-white bg-red-600 hover:bg-red-700"
                onClick={() => {
                  if (confirmDeleteDocumentId) {
                    handleDeleteDocument(confirmDeleteDocumentId)
                  }
                }}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal PDF Remboursement */}
      <RemboursementNormalPDFModal
        isOpen={showRemboursementPdf}
        onClose={() => setShowRemboursementPdf(false)}
        contractId={id}
        contractData={data}
      />
    </div>
  )
}
