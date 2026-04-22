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
  /** Désactiver les clics (ex. contrat clôturé) */
  disabled?: boolean
}

export function ContractCalendarGrid({
  month,
  daysWithStatus,
  onDayClick,
  onPrevMonth,
  onNextMonth,
  disabled = false,
}: ContractCalendarGridProps) {
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
                'bg-green-50 border-green-200 hover:bg-green-100 cursor-pointer'
              dayContent = (
                <div className="flex items-center justify-center gap-0.5 text-xs text-green-600">
                  <CheckCircle className="h-3 w-3" />
                </div>
              )
            } else if (day.status === 'due') {
              dayStyle =
                'bg-red-50 border-red-200 hover:bg-red-100 cursor-pointer'
              dayContent = (
                <div className="flex items-center justify-center gap-1 text-xs text-red-600">
                  <AlertCircle className="h-3 w-3" />
                </div>
              )
            } else {
              dayStyle =
                'bg-white border-gray-200 hover:bg-gray-50 cursor-pointer'
              dayContent = (
                <div className="flex items-center justify-center gap-1 text-xs text-gray-500">
                  <Calendar className="h-3 w-3" />
                </div>
              )
            }

            if (day.isToday && isCurrentMonth && day.status !== 'unavailable') {
              if (day.status === 'paid') {
                dayStyle =
                  'bg-green-100 border-green-300 hover:bg-green-200 cursor-pointer ring-2 ring-blue-400'
              } else {
                dayStyle =
                  'bg-red-100 border-red-300 hover:bg-red-200 cursor-pointer ring-2 ring-blue-400'
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
              </div>
            )
          })}
        </div>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="text-xs font-medium text-gray-700 mb-3">Légende :</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-50 border-2 border-green-200 rounded" />
              <span className="text-green-700">Versé</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-50 border-2 border-red-200 rounded" />
              <span className="text-red-700">À verser (passé)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-white border-2 border-gray-200 rounded" />
              <span className="text-gray-700">À venir</span>
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
        </div>
      </CardContent>
    </Card>
  )
}
