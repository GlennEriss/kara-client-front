"use client"

import React from 'react'
import { ChevronLeft, ChevronRight, Calendar, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
      <CardContent className="p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={onPrevMonth}
            className="w-full sm:w-auto"
            aria-label="Mois précédent"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Mois précédent</span>
            <span className="sm:hidden">Précédent</span>
          </Button>

          <h2 className="text-xl lg:text-2xl font-bold text-gray-900 text-center order-first sm:order-none">
            {MONTH_NAMES[month.getMonth()]} {month.getFullYear()}
          </h2>

          <Button
            variant="outline"
            size="sm"
            onClick={onNextMonth}
            className="w-full sm:w-auto"
            aria-label="Mois suivant"
          >
            <span className="hidden sm:inline">Mois suivant</span>
            <span className="sm:hidden">Suivant</span>
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {WEEKDAY_HEADERS.map((day) => (
            <div
              key={day}
              className="p-2 lg:p-3 text-center text-xs lg:text-sm font-medium text-gray-500 bg-gray-50 rounded-lg"
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
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <XCircle className="h-3 w-3" />
                    <span className="hidden sm:inline">Non disponible</span>
                    <span className="sm:hidden">N/A</span>
                  </div>
                )
              }
            } else if (day.status === 'paid') {
              dayStyle =
                'bg-green-50 border-green-200 hover:bg-green-100 cursor-pointer'
              dayContent = (
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <CheckCircle className="h-3 w-3" />
                  <span className="hidden sm:inline">Versé</span>
                  <span className="sm:hidden">✓</span>
                </div>
              )
            } else if (day.status === 'due') {
              dayStyle =
                'bg-red-50 border-red-200 hover:bg-red-100 cursor-pointer'
              dayContent = (
                <div className="flex items-center gap-1 text-xs text-red-600">
                  <AlertCircle className="h-3 w-3" />
                  <span className="hidden sm:inline">À verser</span>
                  <span className="sm:hidden">À verser</span>
                </div>
              )
            } else {
              dayStyle =
                'bg-white border-gray-200 hover:bg-gray-50 cursor-pointer'
              dayContent = (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Calendar className="h-3 w-3" />
                  <span className="hidden sm:inline">À venir</span>
                  <span className="sm:hidden">À venir</span>
                </div>
              )
            }

            if (day.isToday && isCurrentMonth && day.status !== 'unavailable') {
              if (day.status === 'paid') {
                dayStyle =
                  'bg-green-100 border-green-300 hover:bg-green-200 cursor-pointer'
              } else {
                dayStyle =
                  'bg-red-100 border-red-300 hover:bg-red-200 cursor-pointer'
              }
              dayContent = (
                <div className="space-y-1">
                  {dayContent}
                  <div className="text-xs text-blue-600 font-medium">
                    <span className="hidden sm:inline">Aujourd&apos;hui</span>
                    <span className="sm:hidden">Auj</span>
                  </div>
                </div>
              )
            }

            const canClick =
              isCurrentMonth &&
              day.status !== 'unavailable' &&
              !disabled

            return (
              <div
                key={index}
                className={`p-2 lg:p-3 min-h-[60px] lg:min-h-[80px] border rounded-lg transition-all duration-200 ${dayStyle}`}
                onClick={() => canClick && handleDayClick(day)}
                role={canClick ? 'button' : undefined}
                aria-label={
                  canClick
                    ? `Jour ${day.date.getDate()}, ${day.status === 'paid' ? 'Versé' : day.status === 'due' ? 'À verser' : 'À venir'}`
                    : undefined
                }
              >
                <div className="text-xs lg:text-sm font-medium mb-1">
                  {day.date.getDate()}
                </div>
                {isCurrentMonth && dayContent}
              </div>
            )
          })}
        </div>

        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-xs font-medium text-gray-700 mb-2">
            Légende des couleurs :
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs">
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
              <span className="text-gray-600">Non disponible</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-100 border-2 border-blue-300 rounded" />
              <span className="text-blue-700">Aujourd&apos;hui</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
