"use client"

import React from "react"
import Link from "next/link"
import routes from "@/constantes/routes"
import { useActiveCaisseSettingsByType } from "@/hooks/useCaisseSettings"
import { recomputeNow } from "@/services/caisse/readers"
import {
  RefreshCw,
  UserRound,
  CalendarDays,
  BadgeCheck,
  Wallet,
  FileText,
  Users,
  AlertTriangle,
} from "lucide-react"
import EmergencyContact from "./EmergencyContact"

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

function classNames(...cls: (string | false | undefined)[]) {
  return cls.filter(Boolean).join(" ")
}

// ————————————————————————————————————————————————————————————
// Component
// ————————————————————————————————————————————————————————————

type Props = {
  id: string
  data: any
  isGroupContract: boolean
  paidCount: number
  totalMonths: number
  progress: number
  isRecomputing: boolean
  setIsRecomputing: (value: boolean) => void
  refetch: () => Promise<void>
}

export default function HeaderContractSection({
  id,
  data,
  isGroupContract,
  paidCount,
  totalMonths,
  progress,
  isRecomputing,
  setIsRecomputing,
  refetch
}: Props) {
  const settings = useActiveCaisseSettingsByType((data as any).caisseType)

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

  return (
    <div className="bg-white rounded-2xl shadow-lg shadow-blue-100/50 border border-gray-100 p-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className={classNames("h-10 w-10 rounded-xl flex items-center justify-center", brand.bg, "text-white shadow")}>
            <Wallet className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl font-black tracking-tight bg-gradient-to-r from-[#234D65] to-[#2c5a73] bg-clip-text text-transparent break-words">
              Contrat Standard <span className="font-mono text-sm sm:text-base break-all">#{id}</span>
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <span className="text-sm text-gray-500">
                Paramètres actifs ({String((data as any).caisseType)}): {settings.data ? (settings.data as any).id : "—"}
              </span>
              <Badge tone={
                data.status === "LATE_NO_PENALTY" || 
                data.status === "LATE_WITH_PENALTY" || 
                data.status === "DEFAULTED_AFTER_J12" 
                  ? "red" 
                  : "blue"
              }>
                {data.status === "LATE_NO_PENALTY" || 
                 data.status === "LATE_WITH_PENALTY" || 
                 data.status === "DEFAULTED_AFTER_J12" ? (
                  <AlertTriangle className="h-3.5 w-3.5" />
                ) : (
                  <BadgeCheck className="h-3.5 w-3.5" />
                )} {contractStatusLabel(data.status)}
              </Badge>
              {isGroupContract && (
                <Badge tone="blue">
                  <Users className="h-3.5 w-3.5" /> Contrat de Groupe
                </Badge>
              )}
            </div>
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
              brand.bg,
              "text-white",
              brand.hover,
              "shadow"
            )}
            href={routes.admin.caisseSpecialeContractPayments(id)}
          >
            <FileText className="h-4 w-4" /> Historique des versements
          </Link>
          <EmergencyContact emergencyContact={data.emergencyContact} />
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
  )
}
