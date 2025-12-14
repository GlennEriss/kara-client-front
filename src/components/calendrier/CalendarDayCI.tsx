"use client"

import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { cn } from "@/lib/utils"
import type { DayPaymentsCI } from "@/hooks/useCalendarCaisseImprevue"

interface CalendarDayCIProps {
  day: Date
  dayPayments?: DayPaymentsCI
  isCurrentMonth: boolean
  isToday: boolean
  onClick: () => void
}

const COLOR_CLASSES = {
  green: "bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200 hover:from-emerald-100 hover:to-emerald-200/50 hover:border-emerald-300 hover:shadow-emerald-100",
  orange: "bg-gradient-to-br from-orange-50 to-orange-100/50 border-orange-200 hover:from-orange-100 hover:to-orange-200/50 hover:border-orange-300 hover:shadow-orange-100",
  yellow: "bg-gradient-to-br from-amber-50 to-yellow-100/50 border-amber-200 hover:from-amber-100 hover:to-yellow-200/50 hover:border-amber-300 hover:shadow-amber-100",
  red: "bg-gradient-to-br from-red-50 to-rose-100/50 border-red-200 hover:from-red-100 hover:to-rose-200/50 hover:border-red-300 hover:shadow-red-100",
  gray: "bg-gradient-to-br from-gray-50 to-slate-100/50 border-gray-200 hover:from-gray-100 hover:to-slate-200/50 hover:border-gray-300",
}

const COLOR_BADGE_CLASSES = {
  green: "bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/30",
  orange: "bg-gradient-to-r from-orange-500 to-orange-600 shadow-lg shadow-orange-500/30",
  yellow: "bg-gradient-to-r from-amber-500 to-yellow-500 shadow-lg shadow-amber-500/30",
  red: "bg-gradient-to-r from-red-500 to-rose-600 shadow-lg shadow-red-500/30",
  gray: "bg-gradient-to-r from-gray-400 to-slate-500 shadow-lg shadow-gray-400/30",
}

const COLOR_TEXT_CLASSES = {
  green: "text-emerald-700",
  orange: "text-orange-700",
  yellow: "text-amber-700",
  red: "text-red-700",
  gray: "text-gray-600",
}

export function CalendarDayCI({
  day,
  dayPayments,
  isCurrentMonth,
  isToday,
  onClick,
}: CalendarDayCIProps) {
  const hasPayments = dayPayments && dayPayments.count > 0
  const color = dayPayments?.color || "gray"

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative min-h-[110px] p-3 border-2 rounded-xl transition-all duration-300 text-left",
        "hover:shadow-lg hover:-translate-y-0.5 hover:scale-[1.02]",
        "focus:outline-none focus:ring-2 focus:ring-[#234D65]/20 focus:ring-offset-2",
        isCurrentMonth ? "text-gray-900" : "text-gray-400 opacity-60",
        isToday && "ring-2 ring-[#234D65] ring-offset-2 shadow-lg",
        hasPayments
          ? COLOR_CLASSES[color]
          : "bg-white border-gray-100 hover:bg-gray-50/80 hover:border-gray-200"
      )}
    >
      {/* Indicateur de jour avec versements */}
      {hasPayments && (
        <div className={cn(
          "absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white transform group-hover:scale-110 transition-transform",
          COLOR_BADGE_CLASSES[color]
        )}>
          {dayPayments.count}
        </div>
      )}

      {/* Numéro du jour */}
      <div className="flex items-center justify-between mb-2">
        <span
          className={cn(
            "flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold transition-colors",
            isToday 
              ? "bg-[#234D65] text-white shadow-md" 
              : hasPayments 
                ? COLOR_TEXT_CLASSES[color]
                : "text-gray-700"
          )}
        >
          {format(day, "d", { locale: fr })}
        </span>
      </div>

      {/* Informations des versements */}
      {hasPayments && (
        <div className="space-y-1.5">
          <div className={cn(
            "text-xs font-semibold",
            COLOR_TEXT_CLASSES[color]
          )}>
            {dayPayments.totalAmount.toLocaleString("fr-FR")} F
          </div>
          
          {/* Barre de progression */}
          <div className="h-1.5 bg-gray-200/60 rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full rounded-full transition-all duration-500",
                color === 'green' ? "bg-gradient-to-r from-emerald-400 to-emerald-500" :
                color === 'orange' ? "bg-gradient-to-r from-orange-400 to-orange-500" :
                color === 'yellow' ? "bg-gradient-to-r from-amber-400 to-yellow-500" :
                color === 'red' ? "bg-gradient-to-r from-red-400 to-rose-500" :
                "bg-gradient-to-r from-gray-400 to-slate-500"
              )}
              style={{ 
                width: `${dayPayments.totalAmount > 0 
                  ? (dayPayments.paidAmount / dayPayments.totalAmount) * 100 
                  : 0}%` 
              }}
            />
          </div>

          {/* Détails */}
          <div className="flex items-center justify-between text-[10px]">
            {dayPayments.paidAmount > 0 && (
              <span className="text-emerald-600 font-medium">
                ✓ {dayPayments.paidAmount.toLocaleString("fr-FR")}
              </span>
            )}
            {dayPayments.remainingAmount > 0 && (
              <span className="text-orange-600 font-medium">
                ◷ {dayPayments.remainingAmount.toLocaleString("fr-FR")}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Effet de survol */}
      <div className={cn(
        "absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none",
        "bg-gradient-to-t from-black/5 to-transparent"
      )} />
    </button>
  )
}
