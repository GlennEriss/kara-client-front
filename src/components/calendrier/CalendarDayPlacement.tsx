"use client"

import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import type { DayCommissions } from "@/hooks/useCalendarPlacement"

interface CalendarDayPlacementProps {
  day: Date
  dayCommissions?: DayCommissions
  isCurrentMonth: boolean
  isToday: boolean
  onClick: () => void
}

const COLOR_CLASSES = {
  green: "bg-green-50 border-green-300 hover:bg-green-100",
  orange: "bg-orange-50 border-orange-300 hover:bg-orange-100",
  yellow: "bg-yellow-50 border-yellow-300 hover:bg-yellow-100",
  red: "bg-red-50 border-red-300 hover:bg-red-100",
  gray: "bg-gray-50 border-gray-200 hover:bg-gray-100",
}

const COLOR_BADGE_CLASSES = {
  green: "bg-green-500",
  orange: "bg-orange-500",
  yellow: "bg-yellow-500",
  red: "bg-red-500",
  gray: "bg-gray-400",
}

export function CalendarDayPlacement({
  day,
  dayCommissions,
  isCurrentMonth,
  isToday,
  onClick,
}: CalendarDayPlacementProps) {
  const hasCommissions = dayCommissions && dayCommissions.count > 0
  const color = dayCommissions?.color || "gray"

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative min-h-[100px] p-2 border rounded-lg transition-all duration-200 text-left",
        isCurrentMonth ? "text-gray-900" : "text-gray-400",
        isToday && "ring-2 ring-blue-500 ring-offset-2",
        hasCommissions
          ? COLOR_CLASSES[color]
          : "bg-white border-gray-200 hover:bg-gray-50"
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <span
          className={cn(
            "text-sm font-semibold",
            isToday && "text-blue-600"
          )}
        >
          {format(day, "d", { locale: fr })}
        </span>
        {hasCommissions && (
          <Badge
            className={cn(
              "h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs font-bold text-white",
              COLOR_BADGE_CLASSES[color]
            )}
          >
            {dayCommissions.count}
          </Badge>
        )}
      </div>

      {hasCommissions && (
        <div className="space-y-1 mt-2">
          <div className="text-xs font-medium text-gray-700">
            {dayCommissions.totalAmount.toLocaleString("fr-FR")} FCFA
          </div>
          {dayCommissions.paidAmount > 0 && (
            <div className="text-xs text-green-600">
              Payé: {dayCommissions.paidAmount.toLocaleString("fr-FR")} FCFA
            </div>
          )}
          {dayCommissions.remainingAmount > 0 && (
            <div className="text-xs text-orange-600">
              Reste: {dayCommissions.remainingAmount.toLocaleString("fr-FR")} FCFA
            </div>
          )}
        </div>
      )}
    </button>
  )
}
