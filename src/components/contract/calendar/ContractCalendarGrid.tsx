"use client"

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Calendar, CheckCircle, ChevronLeft, ChevronRight, XCircle } from 'lucide-react'
import React from 'react'
import type { DayWithStatus } from './types'
import { MONTH_NAMES } from './types'

const WEEKDAY_HEADERS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'] as const

export interface ContractCalendarGridProps {
  month: Date
  daysWithStatus: DayWithStatus[]
  onDayClick: (date: Date) => void
  onPrevMonth: () => void
  onNextMonth: () => void
  totalMonths?: number
  /** Désactiver les clics (ex. contrat clôturé) */
  disabled?: boolean
}

export function ContractCalendarGrid({
  month,
  daysWithStatus,
  onDayClick,
  onPrevMonth,
  onNextMonth,
  totalMonths = 0,
  disabled = false,
}: ContractCalendarGridProps) {
  const periodPalette = React.useMemo(
    () => [
      'bg-sky-50 border-sky-200',
      'bg-emerald-50 border-emerald-200',
      'bg-amber-50 border-amber-200',
      'bg-violet-50 border-violet-200',
      'bg-rose-50 border-rose-200',
      'bg-teal-50 border-teal-200',
      'bg-orange-50 border-orange-200',
      'bg-indigo-50 border-indigo-200',
      'bg-lime-50 border-lime-200',
      'bg-cyan-50 border-cyan-200',
      'bg-fuchsia-50 border-fuchsia-200',
      'bg-stone-50 border-stone-200',
    ],
    []
  )

  const getPeriodStyle = (periodIndex: number | null) => {
    if (periodIndex == null || periodIndex < 0) {
      return 'bg-white border-gray-200'
    }
    return periodPalette[periodIndex % periodPalette.length]
  }

  const handleDayClick = (day: DayWithStatus) => {
    if (disabled) return
    if (day.status === 'unavailable') return
    onDayClick(day.date)
  }

  return (
    <Card className="border-0 shadow-xl">
      <CardHeader className="bg-gradient-to-r from-indigo-50 to-indigo-100/50 border-b">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-indigo-700">
            <Calendar className="h-5 w-5" />
            Calendrier des Versements Quotidiens
          </CardTitle>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onPrevMonth}
              aria-label="Mois précédent"
              className="h-9 w-9 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <h3 className="text-lg font-bold text-gray-900 min-w-[160px] text-center">
              {MONTH_NAMES[month.getMonth()]} {month.getFullYear()}
            </h3>

            <Button
              variant="outline"
              size="sm"
              onClick={onNextMonth}
              aria-label="Mois suivant"
              className="h-9 w-9 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">

        <div className="grid grid-cols-7 gap-1">
          {WEEKDAY_HEADERS.map((day) => (
            <div
              key={day}
              className="p-2 text-center text-xs font-medium text-gray-500 bg-gray-50 rounded-lg"
            >
              {day}
            </div>
          ))}

          {daysWithStatus.map((day, index) => {
            const isCurrentMonth =
              day.date.getMonth() === month.getMonth() &&
              day.date.getFullYear() === month.getFullYear()

            let dayStyle = ''
            let dayContent: React.ReactNode = null
            const basePeriodStyle = getPeriodStyle(day.periodIndex)

            if (day.status === 'unavailable' || !isCurrentMonth) {
              dayStyle = 'bg-gray-50 text-gray-400 cursor-not-allowed'
              if (isCurrentMonth) {
                dayContent = (
                  <div className="flex items-center justify-center gap-1 text-xs text-gray-500">
                    <XCircle className="h-3 w-3" />
                  </div>
                )
              }
            } else if (day.status === 'paid') {
              dayStyle =
                `${basePeriodStyle} hover:brightness-[0.98] cursor-pointer`
              dayContent = (
                <div className="flex items-center justify-center gap-0.5 text-xs text-green-600">
                  <CheckCircle className="h-3 w-3" />
                </div>
              )
            } else if (day.status === 'due') {
              dayStyle =
                `${basePeriodStyle} hover:brightness-[0.98] cursor-pointer`
              dayContent = (
                <div className="flex items-center justify-center gap-1 text-xs text-red-600">
                  <AlertCircle className="h-3 w-3" />
                </div>
              )
            } else {
              dayStyle = `${basePeriodStyle} hover:brightness-[0.98] cursor-pointer`
              dayContent = (
                <div className="flex items-center justify-center gap-1 text-xs">
                  <Calendar className="h-3 w-3" />
                </div>
              )
            }

            if (day.isToday && isCurrentMonth && day.status !== 'unavailable') {
              if (day.status === 'paid') {
                dayStyle =
                  `${basePeriodStyle} cursor-pointer ring-2 ring-blue-400 border-green-400`
              } else if (day.status === 'due') {
                dayStyle =
                  `${basePeriodStyle} cursor-pointer ring-2 ring-blue-400 border-red-400`
              } else {
                dayStyle =
                  `${basePeriodStyle} cursor-pointer ring-2 ring-blue-400 border-blue-400`
              }
            }

            const canClick =
              isCurrentMonth &&
              day.status !== 'unavailable' &&
              !disabled

            return (
              <div
                key={index}
                className={`p-2 min-h-[60px] border rounded-lg transition-all duration-200 ${dayStyle}`}
                onClick={() => canClick && handleDayClick(day)}
                role={canClick ? 'button' : undefined}
                aria-label={
                  canClick
                    ? `Jour ${day.date.getDate()}, ${day.status === 'paid' ? 'Versé' : day.status === 'due' ? 'À verser' : 'À venir'}`
                    : undefined
                }
              >
                <div className="text-xs font-medium mb-1">
                  {day.date.getDate()}
                </div>
                {isCurrentMonth && dayContent}
                {isCurrentMonth && day.status !== 'unavailable' && day.periodIndex != null && (
                  <div className="mt-1 text-[10px] font-semibold text-slate-600">
                    M{day.periodIndex + 1}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="text-xs font-medium text-gray-700 mb-3">Légende :</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs mb-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-50 border-2 border-green-200 rounded" />
              <span className="text-green-700">Versé</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-50 border-2 border-red-200 rounded" />
              <span className="text-red-700">À verser (passé)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-100 border-2 border-gray-200 rounded" />
              <span className="text-gray-600">Indisponible</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100 border-2 border-red-300 rounded ring-2 ring-blue-400" />
              <span className="text-blue-700">Aujourd&apos;hui</span>
            </div>
          </div>

          {totalMonths > 0 && (
            <div>
              <div className="text-xs font-medium text-gray-700 mb-2">Périodes d&apos;échéance :</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                {Array.from({ length: totalMonths }).map((_, index) => {
                  const paletteClass = periodPalette[index % periodPalette.length]
                  return (
                    <div key={`period-legend-${index}`} className="flex items-center gap-2">
                      <div className={`w-4 h-4 border-2 rounded ${paletteClass}`} />
                      <span className="text-slate-700">Période M{index + 1}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
