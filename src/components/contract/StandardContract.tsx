"use client"

import React, { useState } from "react"
import Link from "next/link"
import routes from "@/constantes/routes"
import { useCaisseContract } from "@/hooks/useCaisseContracts"
import { useActiveCaisseSettingsByType } from "@/hooks/useCaisseSettings"
import { useGroupMembers } from "@/hooks/useMembers"
import {
  pay,
  requestFinalRefund,
  requestEarlyRefund,
  approveRefund,
  markRefundPaid,
  cancelEarlyRefund,
} from "@/services/caisse/mutations"
import { toast } from "sonner"
// PDF generation désactivée pour build Next 15; à réactiver via import dynamique côté client si besoin
import { recomputeNow } from "@/services/caisse/readers"
import { compressImage, IMAGE_COMPRESSION_PRESETS } from "@/lib/utils"
import FileInput from "@/components/ui/file-input"
import type { PaymentMode } from "@/types/types"
import {
  RefreshCw,
  UserRound,
  CalendarDays,
  BadgeCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Wallet,
  CreditCard,
  FileText,
  Users,
} from "lucide-react"

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
  const [file, setFile] = useState<File | undefined>()
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split("T")[0])
  const [paymentTime, setPaymentTime] = useState(() => {
    const now = new Date()
    return `${now.getHours().toString().padStart(2, "0")}:${now
      .getMinutes()
      .toString()
      .padStart(2, "0")}`
  })
  const [isPaying, setIsPaying] = useState(false)
  const [isRecomputing, setIsRecomputing] = useState(false)
  const [isRefunding, setIsRefunding] = useState(false)
  const [refundFile, setRefundFile] = useState<File | undefined>()
  const [refundReason, setRefundReason] = useState("")
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
  const [confirmFinal, setConfirmFinal] = useState(false)
  const [fileInputResetKey, setFileInputResetKey] = useState(0)
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("airtel_money")
  const [selectedGroupMemberId, setSelectedGroupMemberId] = useState<string | null>(null)

  function paymentStatusLabel(s: string): string {
    const map: Record<string, string> = { DUE: "À payer", PAID: "Payé", REFUSED: "Refusé" }
    return map[s] || s
  }
  function contractStatusLabel(s: string): string {
    const map: Record<string, string> = {
      DRAFT: "En cours",
      ACTIVE: "Actif",
      LATE_NO_PENALTY: "Retard (J+0..3)",
      LATE_WITH_PENALTY: "Retard (J+4..12)",
      DEFAULTED_AFTER_J12: "Résilié (>J+12)",
      EARLY_WITHDRAW_REQUESTED: "Retrait anticipé demandé",
      FINAL_REFUND_PENDING: "Remboursement final en attente",
      EARLY_REFUND_PENDING: "Remboursement anticipé en attente",
      RESCINDED: "Résilié",
      CLOSED: "Clos",
    }
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

  const isClosed = data.status === "CLOSED"
  const settings = useActiveCaisseSettingsByType((data as any).caisseType)

  // Récupérer les membres du groupe si c'est un contrat de groupe
  const groupeId = (data as any).groupeId || ((data as any).memberId && (data as any).memberId.length > 20 ? (data as any).memberId : null)
  const isGroupContract = data.contractType === 'GROUP' || !!groupeId
  const { data: groupMembers, isLoading: isLoadingGroupMembers } = useGroupMembers(groupeId, isGroupContract)

  const payments = data.payments || []
  const paidCount = payments.filter((p: any) => p.status === "PAID").length
  const totalMonths = data.monthsPlanned || 0
  const progress = totalMonths ? Math.min(100, Math.round((paidCount / totalMonths) * 100)) : 0

  const onPay = async () => {
    if (isClosed) {
      toast.error("Contrat clos: paiement impossible.")
      return
    }
    if (selectedIdx === null) {
      toast.error("Veuillez choisir un mois à payer.")
      return
    }
    if (!file) {
      toast.error("Veuillez téléverser une preuve (capture) avant de payer.")
      return
    }
    if (!paymentDate) {
      toast.error("Veuillez sélectionner la date de paiement.")
      return
    }
    if (!paymentTime) {
      toast.error("Veuillez sélectionner l'heure de paiement.")
      return
    }
    if (!paymentMode) {
      toast.error("Veuillez sélectionner le mode de paiement.")
      return
    }

    try {
      setIsPaying(true)
      
      if (isGroupContract && groupMembers) {
        // Validation spécifique pour les contrats de groupe
        if (!selectedGroupMemberId) {
          toast.error("Veuillez sélectionner le membre du groupe qui effectue le versement.")
          return
        }
        
        // Utiliser la fonction payGroup pour les contrats de groupe
        const selectedMember = groupMembers.find(m => m.id === selectedGroupMemberId)
        if (!selectedMember) {
          toast.error("Membre du groupe non trouvé")
          return
        }
        
        const { payGroup } = await import('@/services/caisse/mutations')
        await payGroup({
          contractId: id,
          dueMonthIndex: selectedIdx,
          memberId: selectedMember.id,
          memberName: `${selectedMember.firstName} ${selectedMember.lastName}`,
          memberMatricule: selectedMember.matricule || '',
          memberPhotoURL: selectedMember.photoURL || undefined,
          memberContacts: selectedMember.contacts || [],
          amount: data.monthlyAmount || 0,
          file,
          paidAt: new Date(`${paymentDate}T${paymentTime}`),
          time: paymentTime,
          mode: paymentMode
        })
        
        toast.success("Contribution ajoutée au versement collectif")
      } else {
        // Utiliser la fonction pay normale pour les contrats individuels
        await pay({
          contractId: id,
          dueMonthIndex: selectedIdx,
          memberId: data.memberId,
          file,
          paidAt: new Date(`${paymentDate}T${paymentTime}`),
          time: paymentTime,
          mode: paymentMode,
        })
        toast.success("Paiement enregistré")
      }
      
      await refetch()

      // Reset UI
      setSelectedIdx(null)
      setFile(undefined)
      setPaymentDate(new Date().toISOString().split("T")[0])
      setPaymentTime(() => {
        const now = new Date()
        return `${now.getHours().toString().padStart(2, "0")}:${now
          .getMinutes()
          .toString()
          .padStart(2, "0")}`
      })
      setPaymentMode("airtel_money")
      setSelectedGroupMemberId("")
      setFileInputResetKey((prev) => prev + 1)
    } finally {
      setIsPaying(false)
    }
  }

  return (
    <div className="space-y-8 p-4 md:p-6">
      {/* Header */}
      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className={classNames("h-10 w-10 rounded-xl flex items-center justify-center", brand.bg, "text-white shadow")}> 
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Contrat #{id}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                <Badge tone="blue">
                  <BadgeCheck className="h-3.5 w-3.5" /> {contractStatusLabel(data.status)}
                </Badge>
                {isGroupContract && (
                  <Badge tone="green">
                    <Users className="h-3.5 w-3.5" /> Contrat de Groupe
                  </Badge>
                )}
                <span className="text-xs text-slate-500">
                  Paramètres actifs ({String((data as any).caisseType)}): {settings.data ? (settings.data as any).id : "—"}
                </span>
              </div>
              {isGroupContract && (
                <div className="mt-2 text-xs text-blue-600 bg-blue-50 p-2 rounded-lg">
                  <strong>💡 Contrat de Groupe :</strong> Les versements sont cumulés par mois. 
                  Chaque membre peut contribuer et le mois est considéré comme payé quand le montant total 
                  ({data.monthlyAmount?.toLocaleString('fr-FR')} FCFA) est atteint.
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={async () => {
                setIsRecomputing(true)
                await recomputeNow(id)
                await refetch()
                setIsRecomputing(false)
              }}
              className={classNames(
                "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium",
                "transition-colors",
                brand.bgSoft,
                "hover:bg-slate-100"
              )}
            >
              <RefreshCw className={classNames("h-4 w-4", isRecomputing ? "animate-spin" : "")} />
              {isRecomputing ? "Recalcul…" : "Recalculer maintenant"}
            </button>
            <Link
              className={classNames(
                "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium",
                brand.bg,
                "text-white",
                brand.hover,
                "shadow"
              )}
              href={routes.admin.membershipDetails(data.memberId)}
            >
              <UserRound className="h-4 w-4" /> Voir membre
            </Link>
            <Link
              className={classNames(
                "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium",
                "bg-green-600 hover:bg-green-700 text-white",
                "shadow"
              )}
              href={routes.admin.caisseSpecialeContractPayments(id)}
            >
              <FileText className="h-4 w-4" /> Historique des versements
            </Link>
          </div>
        </div>

        {/* Progress */}
        <div className="mt-4 rounded-xl border bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2 text-slate-700">
              <CalendarDays className="h-4 w-4" />
              <span>
                Mois payés: <b>{paidCount}</b> / {totalMonths}
              </span>
            </div>
            <div className="text-slate-700">
              Total dû: <b>{(((data.monthlyAmount || 0) * totalMonths) || 0).toLocaleString("fr-FR")} FCFA</b>
            </div>
            <div className="text-slate-700">
              Reste: <b>{Math.max(0, ((data.monthlyAmount || 0) * totalMonths) - (data.nominalPaid || 0)).toLocaleString("fr-FR")} FCFA</b>
            </div>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white shadow-inner">
            <div
              className={classNames("h-2 rounded-full", brand.bg)}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard icon={CreditCard} label="Montant mensuel" value={`${(data.monthlyAmount || 0).toLocaleString("fr-FR")} FCFA`} accent="brand" />
        <StatCard icon={Clock} label="Durée (mois)" value={data.monthsPlanned || 0} />
        <StatCard icon={CheckCircle2} label="Nominal payé" value={`${(data.nominalPaid || 0).toLocaleString("fr-FR")} FCFA`} />
        <StatCard icon={BadgeCheck} label="Bonus cumulés" value={`${(data.bonusAccrued || 0).toLocaleString("fr-FR")} FCFA`} accent="emerald" />
        <StatCard icon={AlertTriangle} label="Pénalités cumulées" value={`${(data.penaltiesTotal || 0).toLocaleString("fr-FR")} FCFA`} accent="red" />
        <StatCard icon={CalendarDays} label="Prochaine échéance" value={data.nextDueAt ? new Date(data.nextDueAt).toLocaleDateString("fr-FR") : "—"} />
      </div>

      {/* Calendrier des échéances */}
      <div className="space-y-3">
        <SectionTitle>Calendrier des échéances</SectionTitle>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {payments.map((p: any) => {
            let badge: React.ReactNode = null
            if (p.status === "DUE" && p.dueAt) {
              const now = new Date()
              const due = new Date(p.dueAt)
              const days = Math.floor((now.getTime() - due.getTime()) / 86400000)
              if (days > 12) badge = <Badge tone="red">{">"}J+12</Badge>
              else if (days >= 4) badge = <Badge tone="yellow">J+4..J+12</Badge>
              else if (days >= 0) badge = <Badge tone="yellow">J+0..J+3</Badge>
            }

            const isSelectable = p.status === "DUE" && !isClosed
            const isSelected = selectedIdx === p.dueMonthIndex

            // Déterminer les couleurs selon le statut
            let cardColors = ""
            let borderColors = ""
            let bgColors = ""
            
            if (p.status === "PAID") {
              cardColors = "border-green-200 bg-green-50"
              borderColors = "border-green-300"
              bgColors = "bg-green-50"
            } else if (p.status === "DUE") {
              cardColors = "border-blue-200 bg-blue-50"
              borderColors = "border-blue-300"
              bgColors = "bg-blue-50"
            } else if (p.status === "REFUSED") {
              cardColors = "border-red-200 bg-red-50"
              borderColors = "border-red-300"
              bgColors = "bg-red-50"
            } else {
              cardColors = "border-slate-200 bg-slate-50"
              borderColors = "border-slate-300"
              bgColors = "bg-slate-50"
            }

            // Couleur de sélection
            if (isSelected) {
              cardColors = `${brand.ring} ring-2 border-[#234D65] bg-[#234D65]/5`
            }

            return (
              <div
                key={p.id}
                className={classNames(
                  "rounded-2xl border p-4 shadow-sm transition-all",
                  cardColors,
                  isSelected ? `${brand.ring} ring-2` : "hover:shadow-md",
                  !isSelectable && "opacity-70"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className={classNames(
                    "font-medium text-lg",
                    p.status === "PAID" ? "text-green-700" : 
                    p.status === "DUE" ? "text-blue-700" : 
                    p.status === "REFUSED" ? "text-red-700" : 
                    "text-slate-700"
                  )}>
                    M{p.dueMonthIndex + 1}
                  </div>
                  <div className="flex items-center gap-2">
                    {badge}
                    <Badge 
                      tone={
                        p.status === "PAID" ? "green" : 
                        p.status === "DUE" ? "blue" : 
                        p.status === "REFUSED" ? "red" : 
                        "slate"
                      }
                    >
                      {paymentStatusLabel(p.status)}
                    </Badge>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <div>Échéance: {p.dueAt ? new Date(p.dueAt).toLocaleDateString("fr-FR") : "—"}</div>
                  <div>Payé le: {p.paidAt ? new Date(p.paidAt).toLocaleDateString("fr-FR") : "—"}</div>
                  {p.penaltyApplied ? (
                    <div className="col-span-2 text-red-600 font-medium">Pénalité: {p.penaltyApplied}</div>
                  ) : null}
                </div>

                <label className={classNames(
                  "mt-3 flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                  isSelectable ? 
                    "hover:bg-white hover:border-[#234D65] hover:shadow-sm" : 
                    "cursor-not-allowed opacity-60",
                  isSelected ? "bg-[#234D65] text-white border-[#234D65]" : "bg-white"
                )}>
                  <input
                    type="radio"
                    name="pay"
                    onChange={() => isSelectable && setSelectedIdx(p.dueMonthIndex)}
                    checked={isSelected}
                    disabled={!isSelectable}
                    className="accent-[#234D65]"
                  />
                  <span className={isSelected ? "text-white" : ""}>
                    {isSelectable ? "Sélectionner pour payer" : "Non disponible"}
                  </span>
                </label>
              </div>
            )
          })}
        </div>
      </div>

      {/* Paiement */}
      <div className="space-y-4 rounded-2xl border bg-white p-5 shadow-sm">
        <SectionTitle>Payer l’échéance sélectionnée</SectionTitle>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Date */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Date de paiement *</label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className={classNames(
                "w-full rounded-xl border p-2 text-sm shadow-sm transition-all",
                "focus:outline-none focus:ring-2",
                brand.ring
              )}
              required
            />
          </div>

          {/* Heure */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Heure de paiement *</label>
            <input
              type="time"
              value={paymentTime}
              onChange={(e) => setPaymentTime(e.target.value)}
              className={classNames(
                "w-full rounded-xl border p-2 text-sm shadow-sm transition-all",
                "focus:outline-none focus:ring-2",
                brand.ring
              )}
              required
            />
          </div>

          {/* Mode */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Mode de paiement *</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="paymentMode"
                  value="airtel_money"
                  checked={paymentMode === "airtel_money"}
                  onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                  className="accent-[#234D65]"
                />
                <span className="text-sm text-slate-700">Airtel Money</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="paymentMode"
                  value="mobicash"
                  checked={paymentMode === "mobicash"}
                  onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                  className="accent-[#234D65]"
                />
                <span className="text-sm text-slate-700">Mobicash</span>
              </label>
            </div>
          </div>

          {/* Sélection du membre du groupe (si contrat de groupe) */}
          {isGroupContract && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Membre du groupe qui verse *</label>
              <select
                value={selectedGroupMemberId || ""}
                onChange={(e) => setSelectedGroupMemberId(e.target.value)}
                className={classNames(
                  "w-full rounded-xl border p-2 text-sm shadow-sm transition-all",
                  "focus:outline-none focus:ring-2",
                  brand.ring
                )}
                required
              >
                <option value="">Sélectionnez le membre qui verse</option>
                {groupMembers && groupMembers.length > 0 ? (
                  groupMembers.map((member: any) => (
                    <option key={member.id} value={member.id}>
                      {member.firstName} {member.lastName} ({member.matricule})
                    </option>
                  ))
                ) : (
                  <option value="" disabled>
                    Chargement des membres du groupe...
                  </option>
                )}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Ce champ permet de tracer qui a effectué le versement dans le groupe
              </p>
            </div>
          )}

          {/* Preuve */}
          <div>
            <FileInput
              accept="image/*"
              maxSize={5}
              onFileSelect={async (selectedFile) => {
                if (!selectedFile) {
                  setFile(undefined)
                  return
                }
                try {
                  const dataUrl = await compressImage(selectedFile, IMAGE_COMPRESSION_PRESETS.document)
                  const res = await fetch(dataUrl)
                  const blob = await res.blob()
                  const webpFile = new File([blob], "proof.webp", { type: "image/webp" })
                  setFile(webpFile)
                  toast.success("Preuve compressée (WebP) prête")
                } catch (err) {
                  console.error(err)
                  toast.error("Échec de la compression de l'image")
                  setFile(undefined)
                }
              }}
              disabled={isClosed}
              label="Preuve de paiement *"
              placeholder="Glissez-déposez une image ou cliquez pour parcourir"
              currentFile={file}
              resetKey={fileInputResetKey}
              className="w-full"
            />
          </div>
        </div>

        <div className="sticky bottom-3 mt-2 flex justify-center">
          <button
            onClick={onPay}
            disabled={
              isPaying || 
              !file || 
              !paymentDate || 
              !paymentTime || 
              !paymentMode || 
              isClosed ||
              (isGroupContract && !selectedGroupMemberId)
            }
            className={classNames(
              "inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-medium text-white shadow",
              brand.bg,
              brand.hover,
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
          >
            {isPaying ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Paiement en cours...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4" />
                <span>
                  Payer l'échéance {selectedIdx !== null ? `M${selectedIdx + 1}` : ""}
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Remboursements */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <SectionTitle>Remboursements</SectionTitle>
          {(() => {
            const paidCountLocal = payments.filter((x: any) => x.status === "PAID").length
            const allPaid = payments.length > 0 && paidCountLocal === payments.length
            const canEarly = paidCountLocal >= 1 && !allPaid
            const hasFinalRefund = (data.refunds || []).some((r: any) => r.type === "FINAL" && r.status !== "ARCHIVED") ||
              data.status === "FINAL_REFUND_PENDING" ||
              data.status === "CLOSED"
            const hasEarlyRefund = (data.refunds || []).some((r: any) => r.type === "EARLY" && r.status !== "ARCHIVED") ||
              data.status === "EARLY_REFUND_PENDING"
            return (
              <div className="flex gap-2">
                <button
                  className={classNames(
                    "rounded-lg border px-3 py-2 text-sm font-medium",
                    brand.bgSoft,
                    "hover:bg-slate-100 disabled:opacity-50"
                  )}
                  disabled={isRefunding || !allPaid || hasFinalRefund}
                  onClick={() => setConfirmFinal(true)}
                >
                  Demander remboursement final
                </button>
                <button
                  className={classNames(
                    "rounded-lg border px-3 py-2 text-sm font-medium",
                    brand.bgSoft,
                    "hover:bg-slate-100 disabled:opacity-50"
                  )}
                  disabled={isRefunding || !canEarly || hasEarlyRefund}
                  onClick={async () => {
                    try {
                      setIsRefunding(true)
                      await requestEarlyRefund(id)
                      await refetch()
                      toast.success("Retrait anticipé demandé")
                    } catch (e: any) {
                      toast.error(e?.message || "Action impossible")
                    } finally {
                      setIsRefunding(false)
                    }
                  }}
                >
                  Demander retrait anticipé
                </button>
              </div>
            )
          })()}
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {(data.refunds || []).map((r: any) => (
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
                  <>
                    <button
                      className="rounded-lg border px-3 py-1.5 text-sm hover:bg-slate-50"
                      onClick={() => setConfirmApproveId(r.id)}
                    >
                      Approuver
                    </button>
                    {r.type === "EARLY" && (
                      <button
                        className="rounded-lg border px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                        onClick={async () => {
                          try {
                            await cancelEarlyRefund(id, r.id)
                            await refetch()
                            toast.success("Demande anticipée annulée")
                          } catch (e: any) {
                            toast.error(e?.message || "Annulation impossible")
                          }
                        }}
                      >
                        Annuler
                      </button>
                    )}
                  </>
                )}

                {r.status === "APPROVED" && (
                  <div className="mt-2 w-full space-y-3 rounded-xl border bg-slate-50 p-3">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs text-slate-600">Cause du retrait *</label>
                        <textarea
                          placeholder="Raison du retrait..."
                          className="w-full resize-none rounded-lg border p-2 text-xs"
                          rows={2}
                          value={refundReason || r.reason || ""}
                          onChange={(e) => setRefundReason(e.target.value)}
                          required
                        />
                      </div>
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
                              toast.error("La preuve doit être une image")
                              setRefundFile(undefined)
                              return
                            }
                            try {
                              const dataUrl = await compressImage(f, IMAGE_COMPRESSION_PRESETS.document)
                              const res = await fetch(dataUrl)
                              const blob = await res.blob()
                              const webpFile = new File([blob], "refund-proof.webp", { type: "image/webp" })
                              setRefundFile(webpFile)
                              toast.success("Preuve compressée (WebP) prête")
                            } catch (err) {
                              console.error(err)
                              toast.error("Échec de la compression de l'image")
                              setRefundFile(undefined)
                            }
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
                        const hasReason = (refundReason && refundReason.trim()) || (r.reason && r.reason.trim())
                        const hasDate = refundDate || r.withdrawalDate
                        const hasTime = (refundTime && refundTime.trim()) || (r.withdrawalTime && r.withdrawalTime.trim() && r.withdrawalTime !== "--:--")
                        return !hasFile || !hasReason || !hasDate || !hasTime
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
                            reason: refundReason || r.reason,
                            withdrawalDate: refundDate || normalizeDate(r.withdrawalDate) || undefined,
                            withdrawalTime: refundTime || r.withdrawalTime,
                          })
                          setRefundReason("")
                          setRefundDate("")
                          setRefundTime("")
                          setRefundFile(undefined)
                          setConfirmPaidId(null)
                          await refetch()
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

          {(!data.refunds || data.refunds.length === 0) && (
            <div className="text-xs text-slate-500">Aucun remboursement</div>
          )}
        </div>
      </div>

      {/* Modales */}
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
                  toast.success("Remboursement approuvé")
                }}
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmFinal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl border bg-white p-5 shadow-xl">
            <div className="text-base font-semibold">Confirmer la demande</div>
            <p className="mt-1 text-sm text-slate-600">
              Voulez-vous demander le remboursement final ? Toutes les échéances doivent être payées. Cette action est irréversible.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button className="rounded-lg border px-3 py-2 text-sm" onClick={() => setConfirmFinal(false)} disabled={isRefunding}>
                Annuler
              </button>
              <button
                className={classNames("rounded-lg px-3 py-2 text-sm text-white", brand.bg, brand.hover)}
                onClick={async () => {
                  try {
                    setIsRefunding(true)
                    await requestFinalRefund(id)
                    await refetch()
                    toast.success("Remboursement final demandé")
                  } catch (e: any) {
                    toast.error(e?.message || "Action impossible")
                  } finally {
                    setIsRefunding(false)
                    setConfirmFinal(false)
                  }
                }}
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
