"use client"

import { X, Phone, Calendar, TrendingUp, Percent, Clock, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { CalendarCommissionItem } from "@/hooks/useCalendarPlacement"
import type { PayoutMode } from "@/types/types"

interface CommissionSidebarHeaderPlacementProps {
  commission: CalendarCommissionItem
  onClose: () => void
}

const PAYOUT_MODE_CONFIG: Record<PayoutMode, { label: string; color: string }> = {
  MonthlyCommission_CapitalEnd: { label: "Commission mensuelle", color: "blue" },
  CapitalPlusCommission_End: { label: "Capital + Commissions", color: "purple" },
}

const PLACEMENT_STATUS_CONFIG = {
  Draft: { label: "Brouillon", color: "gray" },
  Active: { label: "Actif", color: "emerald" },
  Closed: { label: "Clos", color: "blue" },
  EarlyExit: { label: "Retrait anticipé", color: "amber" },
  Canceled: { label: "Annulé", color: "red" },
}

export function CommissionSidebarHeaderPlacement({
  commission,
  onClose,
}: CommissionSidebarHeaderPlacementProps) {
  const placement = commission.placement
  const benefactorDisplayName = commission.benefactorDisplayName
  const benefactorPhone = placement.benefactorPhone
  const payoutConfig = PAYOUT_MODE_CONFIG[placement.payoutMode]
  const statusConfig = PLACEMENT_STATUS_CONFIG[placement.status]

  return (
    <div className="relative overflow-hidden">
      {/* Fond avec dégradé */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#234D65] via-[#2c5a73] to-[#1a3a4d]" />
      <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,transparent,white)]" />
      <div className="absolute -top-20 -right-20 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
      
      <div className="relative p-6 text-white">
        {/* Bouton fermer */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onClose}
          className="absolute top-4 right-4 text-white/80 hover:text-white hover:bg-white/10 rounded-full hidden sm:flex"
        >
          <X className="h-5 w-5" />
        </Button>

        {/* En-tête */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 shadow-lg">
            <Wallet className="h-7 w-7 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Détails de la commission</h2>
            <p className="text-white/70 text-sm">Placement #{placement.id.slice(-8)}</p>
          </div>
        </div>

        {/* Informations du bienfaiteur */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
              {benefactorDisplayName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)}
            </div>
            <div className="flex-1">
              <div className="font-semibold text-lg">{benefactorDisplayName}</div>
              {benefactorPhone && (
                <div className="flex items-center gap-2 text-white/70 text-sm mt-1">
                  <Phone className="h-3.5 w-3.5" />
                  {benefactorPhone}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Badges de statut */}
        <div className="flex flex-wrap gap-2">
          <span className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold",
            payoutConfig.color === "blue" 
              ? "bg-blue-500/20 text-blue-200 border border-blue-400/30"
              : "bg-purple-500/20 text-purple-200 border border-purple-400/30"
          )}>
            <TrendingUp className="h-3.5 w-3.5" />
            {payoutConfig.label}
          </span>
          <span className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold",
            statusConfig.color === "emerald" 
              ? "bg-emerald-500/20 text-emerald-200 border border-emerald-400/30"
              : statusConfig.color === "blue"
              ? "bg-blue-500/20 text-blue-200 border border-blue-400/30"
              : statusConfig.color === "amber"
              ? "bg-amber-500/20 text-amber-200 border border-amber-400/30"
              : statusConfig.color === "red"
              ? "bg-red-500/20 text-red-200 border border-red-400/30"
              : "bg-gray-500/20 text-gray-200 border border-gray-400/30"
          )}>
            {statusConfig.label}
          </span>
        </div>
      </div>

      {/* Informations du placement */}
      <div className="bg-white px-6 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100 text-blue-600">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-blue-600 font-medium">Capital</div>
              <div className="text-sm font-bold text-blue-900">
                {placement.amount.toLocaleString("fr-FR")} F
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl border border-emerald-100">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600">
              <Percent className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-emerald-600 font-medium">Taux</div>
              <div className="text-sm font-bold text-emerald-900">{placement.rate}%</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl border border-purple-100">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-100 text-purple-600">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-purple-600 font-medium">Durée</div>
              <div className="text-sm font-bold text-purple-900">{placement.periodMonths} mois</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl border border-amber-100">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-100 text-amber-600">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-amber-600 font-medium">Début</div>
              <div className="text-sm font-bold text-amber-900">
                {placement.startDate 
                  ? (placement.startDate instanceof Date 
                      ? placement.startDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })
                      : new Date(placement.startDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }))
                  : "N/A"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
