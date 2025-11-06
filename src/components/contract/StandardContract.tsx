"use client"

import React, { useState, useEffect, useMemo } from "react"
import { useCaisseContract } from "@/hooks/useCaisseContracts"
import { useActiveCaisseSettingsByType } from "@/hooks/useCaisseSettings"
import { useGroupMembers } from "@/hooks/useMembers"
import { useAuth } from "@/hooks/useAuth"
import {
  requestFinalRefund,
  requestEarlyRefund,
  approveRefund,
  markRefundPaid,
  cancelEarlyRefund,
  pay,
} from "@/services/caisse/mutations"
import { toast } from "sonner"
import { compressImage, IMAGE_COMPRESSION_PRESETS } from "@/lib/utils"
import { listRefunds } from "@/db/caisse/refunds.db"
import {
  Clock,
  CheckCircle2,
  CreditCard,
  FileText,
  Eye,
  Trash2,
  CalendarDays,
  AlertTriangle,
  Download,
  X,
} from "lucide-react"
import { Badge as BadgeShadcn } from "@/components/ui/badge"
import PdfDocumentModal from "./PdfDocumentModal"
import PdfViewerModal from "./PdfViewerModal"
import RemboursementNormalPDFModal from "./RemboursementNormalPDFModal"
import PaymentCSModal, { PaymentCSFormData } from "./PaymentCSModal"
import PaymentInvoiceModal from "./standard/PaymentInvoiceModal"
import HeaderContractSection from "./standard/HeaderContractSection"
import StandardEchanceForm from "./standard/StandardEchanceForm"
import type { RefundDocument } from "@/types/types"
import TestPaymentTools from "./TestPaymentTools"

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

function Badge({ children, tone = "slate" as "slate" | "green" | "red" | "yellow" | "blue" }: React.PropsWithChildren<{ tone?: "slate" | "green" | "red" | "yellow" | "blue" }>) {
  const tones: Record<string, string> = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-700",
    yellow: "bg-yellow-100 text-yellow-700",
    blue: "bg-blue-100 text-blue-700",
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${tones[tone]}`}>{children}</span>
  )
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

function SectionTitle({ children }: React.PropsWithChildren) {
  return <h2 className="text-base font-semibold text-slate-900">{children}</h2>
}

function classNames(...cls: (string | false | undefined)[]) {
  return cls.filter(Boolean).join(" ")
}

// ————————————————————————————————————————————————————————————
// Component
// ————————————————————————————————————————————————————————————

type Props = { id: string }

export default function StandardContract({ id }: Props) {
  const { data, isLoading, isError, error, refetch } = useCaisseContract(id)
  const { user } = useAuth()

  const [isRecomputing, setIsRecomputing] = useState(false)
  const [isRefunding, setIsRefunding] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number | null>(null)
  const [selectedPayment, setSelectedPayment] = useState<any>(null)
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
  const [showReasonModal, setShowReasonModal] = useState(false)
  const [refundType, setRefundType] = useState<'FINAL' | 'EARLY' | null>(null)
  const [refundReasonInput, setRefundReasonInput] = useState('')

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

  function paymentStatusLabel(s: string): string {
    const map: Record<string, string> = { DUE: "À payer", PAID: "Payé", REFUSED: "Refusé" }
    return map[s] || s
  }
  function refundStatusLabel(s: string): string {
    const map: Record<string, string> = {
      PENDING: "En attente",
      APPROVED: "Approuvé",
      PAID: "Payé",
      ARCHIVED: "Archivé",
    }
    return map[s] || s
  }
  function refundTypeLabel(t: string): string {
    const map: Record<string, string> = { FINAL: "Final", EARLY: "Anticipé", DEFAULT: "Défaut" }
    return map[t] || t
  }

  if (isLoading) return <div className="p-6">Chargement…</div>
  if (isError)
    return (
      <div className="p-6 text-red-600">Erreur de chargement du contrat: {(error as any)?.message}</div>
    )
  if (!data) return <div className="p-6">Contrat introuvable</div>

  const isClosed = data.status === "CLOSED" || data.status === "RESCINDED"

  // Récupérer les membres du groupe si c'est un contrat de groupe
  const groupeId = (data as any).groupeId || ((data as any).memberId && (data as any).memberId.length > 20 ? (data as any).memberId : null)
  const isGroupContract = data.contractType === 'GROUP' || !!groupeId
  const { data: groupMembers, isLoading: isLoadingGroupMembers } = useGroupMembers(groupeId, isGroupContract)

  const payments = data.payments || []
  const paidCount = payments.filter((x: any) => x.status === 'PAID').length
  const totalMonths = data.monthsPlanned || 0
  const progress = totalMonths > 0 ? (paidCount / totalMonths) * 100 : 0

  // Récupérer les paramètres de caisse pour le calcul du bonus
  const settings = useActiveCaisseSettingsByType((data as any).caisseType)
  
  // Calculer le bonus actuel
  const calculateBonus = (monthIndex: number, nominalPaid: number) => {
    if (!settings.data?.bonusRules) return 0
    const bonusRate = settings.data.bonusRules.percentage / 100
    return nominalPaid * bonusRate
  }
  
  const currentBonus = calculateBonus(
    data.currentMonthIndex || 0,
    data.nominalPaid || 0
  )

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
    if (selectedMonthIndex === null) return

    try {
      await pay({ 
      contractId: id,
        dueMonthIndex: selectedMonthIndex, 
        memberId: data.memberId, 
        amount: paymentData.amount, 
        file: paymentData.proofFile,
        paidAt: new Date(`${paymentData.date}T${paymentData.time}`),
        time: paymentData.time,
        mode: paymentData.mode
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

  return (
    <div className="space-y-8 p-4 md:p-6 overflow-x-hidden">
      {/* Header */}
      <HeaderContractSection
        id={id}
        data={data}
        isGroupContract={isGroupContract}
        paidCount={paidCount}
        totalMonths={totalMonths}
        progress={progress}
        isRecomputing={isRecomputing}
        setIsRecomputing={setIsRecomputing}
        refetch={async () => { await refetch() }}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard icon={CreditCard} label="Montant mensuel" value={`${(data.monthlyAmount || 0).toLocaleString("fr-FR")} FCFA`} accent="brand" />
        <StatCard icon={Clock} label="Durée (mois)" value={data.monthsPlanned || 0} />
        <StatCard icon={CheckCircle2} label="Nominal payé" value={`${(data.nominalPaid || 0).toLocaleString("fr-FR")} FCFA`} />
        <StatCard icon={CalendarDays} label="Bonus" value={`${currentBonus.toLocaleString("fr-FR")} FCFA`} accent="emerald" />
        <StatCard icon={AlertTriangle} label="Pénalités cumulées" value={`${(data.penaltiesTotal || 0).toLocaleString("fr-FR")} FCFA`} accent="red" />
        <StatCard icon={CalendarDays} label="Prochaine échéance" value={data.nextDueAt ? new Date(data.nextDueAt).toLocaleDateString("fr-FR") : "—"} />
      </div>

      {/* Outils de test (DEV uniquement) */}
      <TestPaymentTools 
        contractId={id}
        contractData={data}
        onPaymentSuccess={async () => {
          await refetch()
          await reloadRefunds() // Rafraîchir la liste des remboursements
        }}
      />
          {/* Calendrier des échéances */}
      <div className="space-y-3 rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Calendrier des échéances</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
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
            
            let cardColors = ""
            if (p.status === "PAID") {
              cardColors = "border-green-200 bg-green-50"
            } else if (p.status === "DUE") {
              if (p.dueMonthIndex === nextDueMonthIndex) {
                cardColors = "border-blue-200 bg-blue-50"
              } else {
                cardColors = "border-gray-200 bg-gray-50"
              }
            } else if (p.status === "REFUSED") {
              cardColors = "border-red-200 bg-red-50"
            } else {
              cardColors = "border-slate-200 bg-slate-50"
            }

            return (
              <div
                key={p.id}
                className={classNames(
                  "rounded-2xl border p-4 shadow-sm transition-all cursor-pointer hover:shadow-md",
                  cardColors,
                  !isSelectable && p.status !== 'PAID' && "opacity-70"
                )}
                onClick={() => (isSelectable || p.status === 'PAID') && handleMonthClick(p.dueMonthIndex, p)}
              >
                <div className="flex items-center justify-between">
                  <div className={classNames(
                    "font-medium text-lg",
                    p.status === "PAID" ? "text-green-700" :
                      p.status === "DUE" ? 
                        (p.dueMonthIndex === nextDueMonthIndex ? "text-blue-700" : "text-gray-500") :
                        p.status === "REFUSED" ? "text-red-700" :
                          "text-slate-700"
                  )}>
                    M{p.dueMonthIndex + 1}
                  </div>
                  <div className="flex items-center gap-2">
                    {badge}
                    <BadgeShadcn variant={
                      p.status === "PAID" ? "secondary" :
                        p.status === "DUE" ? 
                          (p.dueMonthIndex === nextDueMonthIndex ? "secondary" : "outline") :
                          p.status === "REFUSED" ? "destructive" :
                            "outline"
                    } className={
                      p.status === "PAID" ? "bg-green-100 text-green-800 border-green-200" :
                        p.status === "DUE" && p.dueMonthIndex === nextDueMonthIndex ? "bg-blue-100 text-blue-800 border-blue-200" :
                          p.status === "DUE" ? "bg-gray-100 text-gray-500 border-gray-200" : ""
                    }>
                      {p.status === "DUE" && p.dueMonthIndex !== nextDueMonthIndex ? "À venir" : 
                        p.status === "DUE" ? "À payer" : 
                        p.status === "PAID" ? "Payé" : 
                        p.status === "REFUSED" ? "Refusé" : p.status}
                    </BadgeShadcn>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <div>Échéance: {p.dueAt ? new Date(p.dueAt).toLocaleDateString("fr-FR") : "—"}</div>
                  <div>Payé le: {p.paidAt ? new Date(p.paidAt).toLocaleDateString("fr-FR") : "—"}</div>
                  {p.penaltyApplied ? (
                    <div className="col-span-2 text-red-600 font-medium">Pénalité: {p.penaltyApplied} FCFA</div>
                  ) : null}
            </div>

                {(isSelectable || p.status === 'PAID') && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-center gap-2 text-sm text-[#234D65] font-medium">
                      {isSelectable ? (
                        <span>Cliquez pour payer</span>
                      ) : p.status === 'PAID' ? (
                        <span>Cliquez pour voir la facture</span>
                      ) : null}
                    </div>
                         </div>
                       )}
                     </div>
            )
          })}
                   </div>
                 </div>

        {/* Modal de paiement */}
        <PaymentCSModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false)
            setSelectedMonthIndex(null)
          }}
          onSubmit={handlePaymentSubmit}
          title={`Versement pour le mois M${(selectedMonthIndex ?? 0) + 1}`}
          description="Enregistrer le versement mensuel"
          defaultAmount={data.monthlyAmount || 0}
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
        />


      {/* Remboursements */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <SectionTitle>Remboursements</SectionTitle>
          {(() => {
            const paidCountLocal = payments.filter((x: any) => x.status === "PAID").length
            const allPaid = payments.length > 0 && paidCountLocal === payments.length
            const canEarly = paidCountLocal >= 1 && !allPaid
            const hasFinalRefund = refunds.some((r: any) => r.type === "FINAL" && r.status !== "ARCHIVED") ||
              data.status === "FINAL_REFUND_PENDING" ||
              data.status === "CLOSED"
            const hasEarlyRefund = refunds.some((r: any) => r.type === "EARLY" && r.status !== "ARCHIVED") ||
              data.status === "EARLY_REFUND_PENDING"
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 w-full md:w-auto">
                <button
                  className={classNames(
                    "rounded-lg border px-3 py-2 text-sm font-medium w-full text-center",
                    brand.bgSoft,
                    "hover:bg-slate-100 disabled:opacity-50"
                  )}
                  disabled={isRefunding || !allPaid || hasFinalRefund}
                  onClick={() => {
                    setRefundType('FINAL')
                    setRefundReasonInput('')
                    setShowReasonModal(true)
                  }}
                >
                  Demander remboursement final
                </button>
                <button
                  className={classNames(
                    "rounded-lg border px-3 py-2 text-sm font-medium w-full text-center",
                    brand.bgSoft,
                    "hover:bg-slate-100 disabled:opacity-50"
                  )}
                  disabled={isRefunding || !canEarly || hasEarlyRefund}
                  onClick={() => {
                    setRefundType('EARLY')
                    setRefundReasonInput('')
                    setShowReasonModal(true)
                  }}
                >
                  Demander retrait anticipé
                </button>
                <button
                  className={classNames(
                    "rounded-lg border px-3 py-2 text-sm font-medium w-full text-center",
                    brand.bgSoft,
                    "hover:bg-slate-100"
                  )}
                  onClick={() => setShowRemboursementPdf(true)}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  PDF Remboursement
                </button>
              </div>
            )
          })()}
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {refunds.map((r: any) => (
            <div key={r.id} className="rounded-2xl border bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="font-medium">{refundTypeLabel(r.type)}</div>
                <Badge
                  tone={r.status === "PENDING" ? "yellow" : r.status === "APPROVED" ? "blue" : r.status === "PAID" ? "green" : "slate"}
                >
                  {refundStatusLabel(r.status)}
                </Badge>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600">
                <div>Nominal: {(r.amountNominal || 0).toLocaleString("fr-FR")} FCFA</div>
                <div>Bonus: {(r.amountBonus || 0).toLocaleString("fr-FR")} FCFA</div>
                <div className="col-span-2">
                  Échéance remboursement: {r.deadlineAt ? new Date(r.deadlineAt).toLocaleDateString("fr-FR") : "—"}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {r.status === "PENDING" && (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      className="rounded-lg border px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => setConfirmApproveId(r.id)}
                      disabled={(r.type === "FINAL" && !r.document) || (r.type === "EARLY" && !r.document)}
                    >
                      Approuver
                    </button>
                    {(r.type === "FINAL" || r.type === "EARLY") && (
                      <>
                        <button
                          className="rounded-lg border px-3 py-1.5 text-sm text-green-600 hover:bg-green-50 flex items-center gap-2"
                          onClick={() => setShowRemboursementPdf(true)}
                        >
                          <FileText className="h-4 w-4" />
                          Document de remboursement
                        </button>
                        {r.document ? (
                          <div className="flex gap-2">
                            <button
                              className="rounded-lg border px-3 py-1.5 text-sm text-green-600 hover:bg-green-50 flex items-center gap-2"
                              onClick={() => handleViewDocument(r.id, r.document)}
                            >
                              <Eye className="h-4 w-4" />
                              Voir PDF
                            </button>
                            <button
                              className="rounded-lg border px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                              onClick={() => handleOpenPdfModal(r.id)}
                            >
                              <FileText className="h-4 w-4" />
                              Remplacer PDF
                            </button>
                            <button
                              className="rounded-lg border px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                              onClick={() => setConfirmDeleteDocumentId(r.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                              Supprimer PDF
                            </button>
                          </div>
                        ) : (
                          <button
                            className="rounded-lg border px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                            onClick={() => handleOpenPdfModal(r.id)}
                          >
                            <FileText className="h-4 w-4" />
                            Ajouter PDF
                          </button>
                        )}
                      </>
                    )}
                    {r.type === "EARLY" && !r.document && (
                      <button
                        className="rounded-lg border px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
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
                        Annuler
                      </button>
                    )}
                  </div>
                )}

                {r.status === "APPROVED" && (
                  <div className="mt-2 w-full space-y-3 rounded-xl border bg-slate-50 p-3">
                    {/* Affichage de la cause (non modifiable) */}
                    {r.reason && (
                      <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg">
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
                    <button
                      className={classNames(
                        "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-white",
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
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {refunds.length === 0 && (
            <div className="text-xs text-slate-500">Aucun remboursement</div>
          )}
        </div>
      </div>

      {/* Modales */}
      {/* Modale de saisie de la cause du retrait */}
      {showReasonModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border bg-white p-5 shadow-xl">
            <div className="text-base font-semibold mb-4">
              {refundType === 'FINAL' ? 'Demande de remboursement final' : 'Demande de retrait anticipé'}
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
                onClick={() => handleDeleteDocument(confirmDeleteDocumentId)}
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
