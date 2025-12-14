"use client"

import { useState, useMemo } from "react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, addMonths, subMonths, isSameDay } from "date-fns"
import { fr } from "date-fns/locale"
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react"
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

  // Calculer les statistiques du mois
  const monthStats = useMemo(() => {
    const totalAmount = daysCommissions.reduce((sum, day) => sum + day.totalAmount, 0)
    const paidAmount = daysCommissions.reduce((sum, day) => sum + day.paidAmount, 0)
    const totalCount = daysCommissions.reduce((sum, day) => sum + day.count, 0)
    const paidCount = daysCommissions.reduce((sum, day) => 
      sum + day.commissions.filter(c => c.status === 'Paid').length, 0)
    return { totalAmount, paidAmount, totalCount, paidCount }
  }, [daysCommissions])

  const handlePreviousMonth = () => {
    onMonthChange(subMonths(month, 1))
  }

  const handleNextMonth = () => {
    onMonthChange(addMonths(month, 1))
  }

  const handleToday = () => {
    onMonthChange(new Date())
  }

  const handleDayClick = (day: Date) => {
    setSelectedDay(day)
  }

  const handleCloseModal = () => {
    setSelectedDay(null)
  }

  const handleCommissionClick = (commission: CalendarCommissionItem) => {
    setSelectedCommission(commission)
    setSelectedDay(null)
  }

  const handleCloseSidebar = () => {
    setSelectedCommission(null)
  }

  const selectedDayCommissions = selectedDay
    ? daysCommissionsMap.get(format(selectedDay, "yyyy-MM-dd"))
    : undefined

  const today = new Date()

  const weekDays = [
    { short: "Lun", full: "Lundi" },
    { short: "Mar", full: "Mardi" },
    { short: "Mer", full: "Mercredi" },
    { short: "Jeu", full: "Jeudi" },
    { short: "Ven", full: "Vendredi" },
    { short: "Sam", full: "Samedi" },
    { short: "Dim", full: "Dimanche" },
  ]

  return (
    <div className="space-y-6">
      {/* Statistiques du mois */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
          <div className="text-xs font-medium text-blue-600 uppercase tracking-wide">Total du mois</div>
          <div className="text-xl font-bold text-blue-900 mt-1">
            {monthStats.totalAmount.toLocaleString("fr-FR")} <span className="text-sm font-normal">FCFA</span>
          </div>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-100">
          <div className="text-xs font-medium text-emerald-600 uppercase tracking-wide">Montant payé</div>
          <div className="text-xl font-bold text-emerald-900 mt-1">
            {monthStats.paidAmount.toLocaleString("fr-FR")} <span className="text-sm font-normal">FCFA</span>
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-4 border border-purple-100">
          <div className="text-xs font-medium text-purple-600 uppercase tracking-wide">Commissions</div>
          <div className="text-xl font-bold text-purple-900 mt-1">
            {monthStats.totalCount}
          </div>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-100">
          <div className="text-xs font-medium text-amber-600 uppercase tracking-wide">Progression</div>
          <div className="text-xl font-bold text-amber-900 mt-1">
            {monthStats.totalCount > 0 ? Math.round((monthStats.paidCount / monthStats.totalCount) * 100) : 0}%
          </div>
        </div>
      </div>

      {/* Navigation du calendrier */}
      <div className="flex items-center justify-between bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-4 border border-gray-100">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={handlePreviousMonth}
          className="h-10 w-10 rounded-lg hover:bg-white hover:shadow-md transition-all"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleToday}
            className="text-xs text-gray-500 hover:text-[#234D65]"
          >
            <CalendarDays className="h-4 w-4 mr-1" />
            Aujourd'hui
          </Button>
          <h2 className="text-xl font-bold text-gray-900 capitalize min-w-[200px] text-center">
            {format(month, "MMMM yyyy", { locale: fr })}
          </h2>
        </div>

        <Button 
          variant="outline" 
          size="icon" 
          onClick={handleNextMonth}
          className="h-10 w-10 rounded-lg hover:bg-white hover:shadow-md transition-all"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Calendrier */}
      {isLoading ? (
        <div className="grid grid-cols-7 gap-3">
          {Array.from({ length: 35 }).map((_, i) => (
            <div
              key={i}
              className="min-h-[110px] bg-gradient-to-br from-gray-100 to-gray-50 animate-pulse rounded-xl"
            />
          ))}
        </div>
      ) : (
        <>
          {/* En-têtes des jours */}
          <div className="grid grid-cols-7 gap-3">
            {weekDays.map((day) => (
              <div
                key={day.short}
                className="text-center py-3 rounded-lg bg-gradient-to-br from-[#234D65]/5 to-[#234D65]/10 border border-[#234D65]/10"
              >
                <span className="hidden sm:inline text-sm font-semibold text-[#234D65]">
                  {day.full}
                </span>
                <span className="sm:hidden text-sm font-semibold text-[#234D65]">
                  {day.short}
                </span>
              </div>
            ))}
          </div>

          {/* Grille du calendrier */}
          <div className="grid grid-cols-7 gap-3">
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
