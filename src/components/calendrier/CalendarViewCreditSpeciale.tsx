"use client"

import { Button } from "@/components/ui/button"
import type {
  CalendarPaymentItemCredit,
  DayPaymentsCredit,
} from "@/hooks/useCalendarCreditSpeciale"
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns"
import { fr } from "date-fns/locale"
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"
import { useMemo, useState } from "react"
import { DayPaymentsModalCreditSpeciale } from "./DayPaymentsModalCreditSpeciale"
import { PaymentSidebarCreditSpeciale } from "./PaymentSidebarCreditSpeciale"

interface CalendarViewCreditSpecialeProps {
  month: Date
  onMonthChange: (month: Date) => void
  daysPayments: DayPaymentsCredit[]
  isLoading: boolean
}

const COLOR_CLASS: Record<DayPaymentsCredit["color"], string> = {
  green: "border-emerald-200 bg-emerald-50",
  orange: "border-orange-200 bg-orange-50",
  yellow: "border-yellow-200 bg-yellow-50",
  red: "border-red-200 bg-red-50",
  gray: "border-gray-200 bg-white",
}

export function CalendarViewCreditSpeciale({
  month,
  onMonthChange,
  daysPayments,
  isLoading,
}: CalendarViewCreditSpecialeProps) {
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [selectedPayment, setSelectedPayment] =
    useState<CalendarPaymentItemCredit | null>(null)

  const monthStart = startOfMonth(month)
  const monthEnd = endOfMonth(month)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1, locale: fr })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1, locale: fr })
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const daysPaymentsMap = useMemo(() => {
    const map = new Map<string, DayPaymentsCredit>()
    daysPayments.forEach((day) => {
      map.set(format(day.date, "yyyy-MM-dd"), day)
    })
    return map
  }, [daysPayments])

  const monthStats = useMemo(() => {
    const totalAmount = daysPayments.reduce((sum, day) => sum + day.totalAmount, 0)
    const paidAmount = daysPayments.reduce((sum, day) => sum + day.paidAmount, 0)
    const totalCount = daysPayments.reduce((sum, day) => sum + day.count, 0)
    return { totalAmount, paidAmount, totalCount }
  }, [daysPayments])

  const weekDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]
  const today = new Date()

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
          <div className="text-xs font-medium text-blue-600 uppercase">Total du mois</div>
          <div className="text-xl font-bold text-blue-900 mt-1">
            {monthStats.totalAmount.toLocaleString("fr-FR")} FCFA
          </div>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-100">
          <div className="text-xs font-medium text-emerald-600 uppercase">Montant payé</div>
          <div className="text-xl font-bold text-emerald-900 mt-1">
            {monthStats.paidAmount.toLocaleString("fr-FR")} FCFA
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-4 border border-purple-100">
          <div className="text-xs font-medium text-purple-600 uppercase">Échéances</div>
          <div className="text-xl font-bold text-purple-900 mt-1">{monthStats.totalCount}</div>
        </div>
      </div>

      <div className="flex items-center justify-between bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-4 border border-gray-100">
        <Button variant="outline" size="icon" onClick={() => onMonthChange(subMonths(month, 1))}>
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => onMonthChange(new Date())}>
            <CalendarDays className="h-4 w-4 mr-1" />
            Aujourd'hui
          </Button>
          <h2 className="text-xl font-bold text-gray-900 capitalize min-w-[200px] text-center">
            {format(month, "MMMM yyyy", { locale: fr })}
          </h2>
        </div>

        <Button variant="outline" size="icon" onClick={() => onMonthChange(addMonths(month, 1))}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-7 gap-3">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="min-h-[110px] bg-gray-100 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-7 gap-3">
            {weekDays.map((day) => (
              <div
                key={day}
                className="text-center py-3 rounded-lg bg-gradient-to-br from-[#234D65]/5 to-[#234D65]/10 border border-[#234D65]/10 text-sm font-semibold text-[#234D65]"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-3">
            {calendarDays.map((day) => {
              const dayKey = format(day, "yyyy-MM-dd")
              const dayPayments = daysPaymentsMap.get(dayKey)
              const isCurrentMonth = day >= monthStart && day <= monthEnd
              const isToday = isSameDay(day, today)
              return (
                <button
                  key={dayKey}
                  onClick={() => dayPayments?.payments?.length && setSelectedDay(day)}
                  className={[
                    "min-h-[110px] rounded-xl border p-2 text-left transition-all",
                    isCurrentMonth ? "" : "opacity-40",
                    isToday ? "ring-2 ring-[#234D65]" : "",
                    COLOR_CLASS[dayPayments?.color || "gray"],
                    dayPayments?.payments?.length ? "hover:shadow-md" : "",
                  ].join(" ")}
                >
                  <div className="text-xs font-semibold text-gray-700">{format(day, "d")}</div>
                  {dayPayments?.payments?.length ? (
                    <div className="mt-2 space-y-1">
                      <div className="text-[11px] text-gray-700 font-medium">
                        {dayPayments.count} échéance{dayPayments.count > 1 ? "s" : ""}
                      </div>
                      <div className="text-[11px] text-gray-600">
                        {dayPayments.totalAmount.toLocaleString("fr-FR")} FCFA
                      </div>
                    </div>
                  ) : null}
                </button>
              )
            })}
          </div>
        </>
      )}

      {selectedPayment && (
        <PaymentSidebarCreditSpeciale
          payment={selectedPayment}
          onClose={() => setSelectedPayment(null)}
        />
      )}

      {selectedDay && daysPaymentsMap.get(format(selectedDay, "yyyy-MM-dd")) && (
        <DayPaymentsModalCreditSpeciale
          isOpen={!!selectedDay}
          onClose={() => setSelectedDay(null)}
          dayPayments={daysPaymentsMap.get(format(selectedDay, "yyyy-MM-dd"))!}
          onPaymentClick={(payment) => {
            setSelectedPayment(payment)
            setSelectedDay(null)
          }}
        />
      )}
    </div>
  )
}
