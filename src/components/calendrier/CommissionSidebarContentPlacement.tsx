"use client"

import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Calendar, CheckCircle2, Clock, AlertCircle, TrendingUp, History, BarChart3 } from "lucide-react"
import type { CalendarCommissionItem } from "@/hooks/useCalendarPlacement"
import { usePlacementCommissions } from "@/hooks/usePlacements"

interface CommissionSidebarContentPlacementProps {
  commission: CalendarCommissionItem
  showReceipt: boolean
  receiptUrl?: string | null
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

export function CommissionSidebarContentPlacement({
  commission,
  showReceipt,
  receiptUrl,
}: CommissionSidebarContentPlacementProps) {
  const { data: allCommissions = [], isLoading } = usePlacementCommissions(
    commission.placement.id
  )

  const previousCommissions = allCommissions
    .filter((c) => c.dueDate < commission.dueDate)
    .sort((a, b) => b.dueDate.getTime() - a.dueDate.getTime())
    .slice(0, 5)

  const nextCommissions = allCommissions
    .filter((c) => c.dueDate > commission.dueDate)
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
    .slice(0, 5)

  const totalPaid = allCommissions
    .filter((c) => c.status === 'Paid')
    .reduce((sum, c) => sum + c.amount, 0)

  const paidCount = allCommissions.filter((c) => c.status === 'Paid').length
  const progressPercentage = allCommissions.length > 0 ? (paidCount / allCommissions.length) * 100 : 0

  const colorConfig = COLOR_CONFIG[commission.color]
  const StatusIcon = colorConfig.icon

  return (
    <div className="p-5 space-y-5">
      {/* Commission actuelle */}
      <div className={cn(
        "rounded-2xl border-2 p-5 transition-all",
        colorConfig.bg,
        colorConfig.border
      )}>
        <div className="flex items-center gap-3 mb-4">
          <div className={cn(
            "flex items-center justify-center w-12 h-12 rounded-xl text-white shadow-lg",
            colorConfig.badge
          )}>
            <StatusIcon className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Commission sélectionnée</h3>
            <p className={cn("text-sm font-medium", colorConfig.text)}>
              {STATUS_LABELS[commission.status]}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-white/60 rounded-xl">
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="h-4 w-4" />
              <span className="text-sm">Échéance</span>
            </div>
            <span className="text-sm font-bold text-gray-900">
              {format(commission.dueDate, "dd MMMM yyyy", { locale: fr })}
            </span>
          </div>

          <div className="flex items-center justify-between p-3 bg-white/60 rounded-xl">
            <div className="flex items-center gap-2 text-gray-600">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm">Montant</span>
            </div>
            <span className={cn("text-lg font-bold", colorConfig.text)}>
              {commission.amount.toLocaleString("fr-FR")} FCFA
            </span>
          </div>

          {commission.paidAt && (
            <div className="flex items-center justify-between p-3 bg-white/60 rounded-xl">
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm">Payé le</span>
              </div>
              <span className="text-sm font-bold text-emerald-700">
                {format(commission.paidAt, "dd MMMM yyyy", { locale: fr })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Statistiques */}
      <div className="bg-gradient-to-br from-[#234D65]/5 to-[#234D65]/10 rounded-2xl p-5 border border-[#234D65]/10">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-[#234D65]" />
          <h3 className="font-bold text-gray-900">Statistiques du placement</h3>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-600">Progression</span>
              <span className="font-bold text-[#234D65]">{paidCount} / {allCommissions.length} commissions</span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#234D65] to-[#2c5a73] rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl p-3 border border-gray-100">
              <div className="text-xs text-gray-500">Total payé</div>
              <div className="text-lg font-bold text-emerald-600">
                {totalPaid.toLocaleString("fr-FR")} F
              </div>
            </div>
            <div className="bg-white rounded-xl p-3 border border-gray-100">
              <div className="text-xs text-gray-500">Taux de complétion</div>
              <div className="text-lg font-bold text-[#234D65]">
                {Math.round(progressPercentage)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Historique */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center gap-2 p-4 border-b border-gray-100 bg-gray-50/50">
          <History className="h-5 w-5 text-gray-600" />
          <h3 className="font-bold text-gray-900">Historique des commissions</h3>
        </div>

        <div className="p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#234D65]" />
            </div>
          ) : (
            <div className="space-y-4">
              {previousCommissions.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Précédentes
                  </h4>
                  <div className="space-y-2">
                    {previousCommissions.map((c) => (
                      <div
                        key={c.id}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-xl border transition-colors",
                          c.status === "Paid" 
                            ? "bg-emerald-50/50 border-emerald-100" 
                            : "bg-gray-50 border-gray-100"
                        )}
                      >
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {format(c.dueDate, "dd MMM yyyy", { locale: fr })}
                          </div>
                          <div className="text-xs text-gray-500">
                            {c.amount.toLocaleString("fr-FR")} FCFA
                          </div>
                        </div>
                        <span className={cn(
                          "text-xs px-2.5 py-1 rounded-full font-medium",
                          c.status === "Paid" 
                            ? "bg-emerald-100 text-emerald-700"
                            : c.status === "Due"
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-700"
                        )}>
                          {STATUS_LABELS[c.status]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {nextCommissions.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    À venir
                  </h4>
                  <div className="space-y-2">
                    {nextCommissions.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-blue-50/50 border border-blue-100"
                      >
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {format(c.dueDate, "dd MMM yyyy", { locale: fr })}
                          </div>
                          <div className="text-xs text-gray-500">
                            {c.amount.toLocaleString("fr-FR")} FCFA
                          </div>
                        </div>
                        <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-blue-100 text-blue-700">
                          {STATUS_LABELS[c.status]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {previousCommissions.length === 0 && nextCommissions.length === 0 && (
                <div className="text-center py-8 text-gray-500 text-sm">
                  Aucun historique disponible
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Reçu PDF */}
      {showReceipt && receiptUrl && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <h3 className="font-bold text-gray-900">Reçu de paiement</h3>
          </div>
          <div className="p-4">
            <iframe
              src={receiptUrl}
              className="w-full h-[500px] border rounded-xl"
              title="Reçu de paiement"
            />
          </div>
        </div>
      )}
    </div>
  )
}
