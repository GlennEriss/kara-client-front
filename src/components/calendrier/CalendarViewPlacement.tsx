"use client"

import { useState, useMemo } from "react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, addMonths, subMonths, isSameDay } from "date-fns"
import { fr } from "date-fns/locale"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CalendarDayPlacement } from "./CalendarDayPlacement"
import { DayCommissionsModalPlacement } from "./DayCommissionsModalPlacement"
import { CommissionSidebarPlacement } from "./CommissionSidebarPlacement"
import type { DayCommissions, CalendarCommissionItem } from "@/hooks/useCalendarPlacement"

interface CalendarViewPlacementProps {
  month: Date
  onMonthChange: (month: Date) => void
  daysCommissions: DayCommissions[]
  isLoading: boolean
}

export function CalendarViewPlacement({
  month,
  onMonthChange,
  daysCommissions,
  isLoading,
}: CalendarViewPlacementProps) {
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [selectedCommission, setSelectedCommission] = useState<CalendarCommissionItem | null>(null)

  const monthStart = startOfMonth(month)
  const monthEnd = endOfMonth(month)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1, locale: fr })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1, locale: fr })
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const daysCommissionsMap = useMemo(() => {
    const map = new Map<string, DayCommissions>()
    daysCommissions.forEach((day) => {
      const key = format(day.date, "yyyy-MM-dd")
      map.set(key, day)
    })
    return map
  }, [daysCommissions])

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

  const handleCommissionClick = (commission: CalendarCommissionItem) => {
    setSelectedCommission(commission)
    setSelectedDay(null) // Fermer le modal du jour
  }

  const handleCloseSidebar = () => {
    setSelectedCommission(null)
  }

  const selectedDayCommissions = selectedDay
    ? daysCommissionsMap.get(format(selectedDay, "yyyy-MM-dd"))
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
              const dayCommissions = daysCommissionsMap.get(dayKey)
              const isCurrentMonth = day >= monthStart && day <= monthEnd
              const isToday = isSameDay(day, today)

              return (
                <CalendarDayPlacement
                  key={dayKey}
                  day={day}
                  dayCommissions={dayCommissions}
                  isCurrentMonth={isCurrentMonth}
                  isToday={isToday}
                  onClick={() => handleDayClick(day)}
                />
              )
            })}
          </div>
        </>
      )}

      {/* Modal des commissions du jour */}
      {selectedDay && selectedDayCommissions && (
        <DayCommissionsModalPlacement
          isOpen={!!selectedDay}
          onClose={handleCloseModal}
          dayCommissions={selectedDayCommissions}
          onCommissionClick={handleCommissionClick}
        />
      )}

      {/* Sidebar de détail d'une commission */}
      {selectedCommission && (
        <CommissionSidebarPlacement
          commission={selectedCommission}
          onClose={handleCloseSidebar}
        />
      )}
    </div>
  )
}
