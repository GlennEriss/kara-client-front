"use client"

import { format } from "date-fns"
import { fr } from "date-fns/locale"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Calendar, TrendingUp, ChevronRight, Wallet, CheckCircle2, Clock, AlertCircle } from "lucide-react"
import type { DayCommissions, CalendarCommissionItem } from "@/hooks/useCalendarPlacement"
import type { PayoutMode } from "@/types/types"

interface DayCommissionsModalPlacementProps {
  isOpen: boolean
  onClose: () => void
  dayCommissions: DayCommissions
  onCommissionClick: (commission: CalendarCommissionItem) => void
}

const PAYOUT_MODE_CONFIG: Record<PayoutMode, { label: string; icon: typeof TrendingUp; color: string }> = {
  MonthlyCommission_CapitalEnd: { label: "Commission mensuelle", icon: Calendar, color: "blue" },
  CapitalPlusCommission_End: { label: "Capital + Commissions", icon: TrendingUp, color: "purple" },
}

const COLOR_CONFIG = {
  green: { 
    bg: "bg-gradient-to-r from-emerald-50 to-green-50", 
    border: "border-emerald-200",
    badge: "bg-emerald-500",
    text: "text-emerald-700",
    icon: CheckCircle2
  },
  orange: { 
    bg: "bg-gradient-to-r from-orange-50 to-amber-50", 
    border: "border-orange-200",
    badge: "bg-orange-500",
    text: "text-orange-700",
    icon: Clock
  },
  yellow: { 
    bg: "bg-gradient-to-r from-amber-50 to-yellow-50", 
    border: "border-amber-200",
    badge: "bg-amber-500",
    text: "text-amber-700",
    icon: Clock
  },
  red: { 
    bg: "bg-gradient-to-r from-red-50 to-rose-50", 
    border: "border-red-200",
    badge: "bg-red-500",
    text: "text-red-700",
    icon: AlertCircle
  },
  gray: { 
    bg: "bg-gradient-to-r from-gray-50 to-slate-50", 
    border: "border-gray-200",
    badge: "bg-gray-400",
    text: "text-gray-600",
    icon: Clock
  },
}

const STATUS_LABELS = {
  Due: "À payer",
  Paid: "Payé",
  Partial: "Partiel",
  Canceled: "Annulé",
}

export function DayCommissionsModalPlacement({
  isOpen,
  onClose,
  dayCommissions,
  onCommissionClick,
}: DayCommissionsModalPlacementProps) {
  // Grouper les commissions par mode de règlement
  const groupedByMode = dayCommissions.commissions.reduce(
    (acc, commission) => {
      const mode = commission.placement.payoutMode
      if (!acc[mode]) {
        acc[mode] = []
      }
      acc[mode].push(commission)
      return acc
    },
    {} as Record<PayoutMode, CalendarCommissionItem[]>
  )

  const progressPercentage = dayCommissions.totalAmount > 0 
    ? (dayCommissions.paidAmount / dayCommissions.totalAmount) * 100 
    : 0

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] p-0 overflow-hidden rounded-2xl">
        {/* En-tête avec dégradé */}
        <div className="bg-gradient-to-r from-[#234D65] via-[#2c5a73] to-[#1a3a4d] p-6 text-white">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <div className="text-xl font-bold capitalize">
                  {format(dayCommissions.date, "EEEE d MMMM yyyy", { locale: fr })}
                </div>
                <div className="text-sm text-white/70 font-normal mt-0.5">
                  {dayCommissions.count} commission{dayCommissions.count > 1 ? 's' : ''} à traiter
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>

          {/* Statistiques */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="text-xs text-white/60 uppercase tracking-wide">Total</div>
              <div className="text-xl font-bold mt-1">
                {dayCommissions.totalAmount.toLocaleString("fr-FR")}
                <span className="text-sm font-normal ml-1">F</span>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="text-xs text-emerald-300 uppercase tracking-wide">Payé</div>
              <div className="text-xl font-bold text-emerald-300 mt-1">
                {dayCommissions.paidAmount.toLocaleString("fr-FR")}
                <span className="text-sm font-normal ml-1">F</span>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="text-xs text-orange-300 uppercase tracking-wide">Reste</div>
              <div className="text-xl font-bold text-orange-300 mt-1">
                {dayCommissions.remainingAmount.toLocaleString("fr-FR")}
                <span className="text-sm font-normal ml-1">F</span>
              </div>
            </div>
          </div>

          {/* Barre de progression */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-white/60 mb-2">
              <span>Progression</span>
              <span>{Math.round(progressPercentage)}%</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-400 to-green-400 rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Liste des commissions */}
        <div className="p-6 max-h-[400px] overflow-y-auto">
          <div className="space-y-6">
            {(Object.keys(groupedByMode) as PayoutMode[]).map((mode) => {
              const config = PAYOUT_MODE_CONFIG[mode]
              const Icon = config.icon
              
              return (
                <div key={mode}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-lg",
                      config.color === "blue" ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      {config.label}
                    </h3>
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full",
                      config.color === "blue" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                    )}>
                      {groupedByMode[mode].length}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    {groupedByMode[mode].map((commission) => {
                      const colorConfig = COLOR_CONFIG[commission.color]
                      const StatusIcon = colorConfig.icon
                      
                      return (
                        <button
                          key={commission.id}
                          onClick={() => onCommissionClick(commission)}
                          className={cn(
                            "group w-full p-4 rounded-xl border-2 transition-all duration-300 text-left",
                            "hover:shadow-lg hover:-translate-y-0.5",
                            colorConfig.bg,
                            colorConfig.border
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              {/* Avatar/Icône */}
                              <div className={cn(
                                "flex items-center justify-center w-10 h-10 rounded-full text-white shadow-lg",
                                colorConfig.badge
                              )}>
                                <Wallet className="h-5 w-5" />
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-gray-900 truncate">
                                    {commission.benefactorDisplayName || "Bienfaiteur inconnu"}
                                  </span>
                                  <span className={cn(
                                    "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium",
                                    colorConfig.badge,
                                    "text-white"
                                  )}>
                                    <StatusIcon className="h-3 w-3" />
                                    {STATUS_LABELS[commission.status]}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-sm">
                                  <span className={cn("font-bold", colorConfig.text)}>
                                    {commission.amount.toLocaleString("fr-FR")} FCFA
                                  </span>
                                  <span className="text-gray-400">•</span>
                                  <span className="text-gray-500 text-xs">
                                    Placement #{commission.placement.id.slice(-8)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all" />
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
