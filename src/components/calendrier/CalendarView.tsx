"use client"

import { useState, useMemo } from "react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, addMonths, subMonths, isSameDay } from "date-fns"
import { fr } from "date-fns/locale"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CalendarDay } from "./CalendarDay"
import { DayPaymentsModal } from "./DayPaymentsModal"
import { PaymentSidebar } from "./PaymentSidebar"
import type { DayPayments, CalendarPaymentItem } from "@/hooks/useCalendarCaisseSpeciale"

interface CalendarViewProps {
  month: Date
  onMonthChange: (month: Date) => void
  daysPayments: DayPayments[]
  isLoading: boolean
}

export function CalendarView({
  month,
  onMonthChange,
  daysPayments,
  isLoading,
}: CalendarViewProps) {
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [selectedPayment, setSelectedPayment] = useState<CalendarPaymentItem | null>(null)

  const monthStart = startOfMonth(month)
  const monthEnd = endOfMonth(month)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1, locale: fr })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1, locale: fr })
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const daysPaymentsMap = useMemo(() => {
    const map = new Map<string, DayPayments>()
    daysPayments.forEach((day) => {
      const key = format(day.date, "yyyy-MM-dd")
      map.set(key, day)
    })
    return map
  }, [daysPayments])

  const handlePreviousMonth = () => {
    onMonthChange(subMonths(month, 1))
  }

  const handleNextMonth = () => {
    onMonthChange(addMonths(month, 1))
  }

  const handleDayClick = (day: Date) => {
    setSelectedDay(day)
  }

  const handleCloseModal = () => {
    setSelectedDay(null)
  }

  const handlePaymentClick = (payment: CalendarPaymentItem) => {
    setSelectedPayment(payment)
    setSelectedDay(null) // Fermer le modal du jour
  }

  const handleCloseSidebar = () => {
    setSelectedPayment(null)
  }

  const selectedDayPayments = selectedDay
    ? daysPaymentsMap.get(format(selectedDay, "yyyy-MM-dd"))
    : undefined

  const today = new Date()

  const weekDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]

  return (
    <div className="space-y-4">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={handlePreviousMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-bold">
          {format(month, "MMMM yyyy", { locale: fr })}
        </h2>
        <Button variant="outline" size="icon" onClick={handleNextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendrier */}
      {isLoading ? (
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }).map((_, i) => (
            <div
              key={i}
              className="min-h-[100px] bg-gray-100 animate-pulse rounded-lg"
            />
          ))}
        </div>
      ) : (
        <>
          {/* En-têtes des jours */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {weekDays.map((day) => (
              <div
                key={day}
                className="text-center text-sm font-semibold text-gray-600 py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Grille du calendrier */}
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day) => {
              const dayKey = format(day, "yyyy-MM-dd")
              const dayPayments = daysPaymentsMap.get(dayKey)
              const isCurrentMonth = day >= monthStart && day <= monthEnd
              const isToday = isSameDay(day, today)

              return (
                <CalendarDay
                  key={dayKey}
                  day={day}
                  dayPayments={dayPayments}
                  isCurrentMonth={isCurrentMonth}
                  isToday={isToday}
                  onClick={() => handleDayClick(day)}
                />
              )
            })}
          </div>
        </>
      )}

      {/* Modal des versements du jour */}
      {selectedDay && selectedDayPayments && (
        <DayPaymentsModal
          isOpen={!!selectedDay}
          onClose={handleCloseModal}
          dayPayments={selectedDayPayments}
          onPaymentClick={handlePaymentClick}
        />
      )}

      {/* Sidebar de détail d'un versement */}
      {selectedPayment && (
        <PaymentSidebar
          payment={selectedPayment}
          onClose={handleCloseSidebar}
        />
      )}
    </div>
  )
}
