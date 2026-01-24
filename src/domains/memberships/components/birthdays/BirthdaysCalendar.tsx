/**
 * Vue calendrier mensuel des anniversaires
 * 
 * Affiche un calendrier avec les jours colorés pour les anniversaires.
 * Les jours avec anniversaires sont mis en surbrillance.
 */

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
} from 'date-fns'
import { fr } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import type { BirthdayMember } from '../../types/birthdays'

const MONTHS = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
]

export interface BirthdaysCalendarProps {
  members: BirthdayMember[]
  selectedMonth: number // 0-11 (JavaScript month)
  selectedYear: number
  onMonthChange: (month: number, year: number) => void
  highlightedMemberId?: string
  isLoading?: boolean
}

export function BirthdaysCalendar({
  members,
  selectedMonth,
  selectedYear,
  onMonthChange,
  highlightedMemberId,
  isLoading = false,
}: BirthdaysCalendarProps) {
  const monthStart = startOfMonth(new Date(selectedYear, selectedMonth, 1))
  const monthEnd = endOfMonth(monthStart)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }) // Lundi
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const handlePrevMonth = () => {
    const newDate = subMonths(new Date(selectedYear, selectedMonth, 1), 1)
    onMonthChange(newDate.getMonth(), newDate.getFullYear())
  }

  const handleNextMonth = () => {
    const newDate = addMonths(new Date(selectedYear, selectedMonth, 1), 1)
    onMonthChange(newDate.getMonth(), newDate.getFullYear())
  }

  // Grouper les membres par jour
  const membersByDay = new Map<number, BirthdayMember[]>()
  members.forEach((member) => {
    const day = member.nextBirthday.getDate()
    const month = member.nextBirthday.getMonth()
    const year = member.nextBirthday.getFullYear()

    // Vérifier si l'anniversaire est dans le mois affiché
    if (month === selectedMonth && year === selectedYear) {
      if (!membersByDay.has(day)) {
        membersByDay.set(day, [])
      }
      membersByDay.get(day)!.push(member)
    }
  })

  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

  return (
    <Card data-testid="birthdays-calendar">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span data-testid="calendar-month-header">
            {MONTHS[selectedMonth]} {selectedYear}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevMonth}
              disabled={isLoading}
              data-testid="calendar-prev-month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextMonth}
              disabled={isLoading}
              data-testid="calendar-next-month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Chargement...</div>
        ) : (
          <div className="grid grid-cols-7 gap-2">
            {/* En-têtes des jours */}
            {weekDays.map((day) => (
              <div
                key={day}
                className="text-center text-sm font-semibold text-gray-600 py-2"
              >
                {day}
              </div>
            ))}

            {/* Jours du mois */}
            {days.map((day, idx) => {
              const isCurrentMonth = day.getMonth() === selectedMonth
              const isToday = isSameDay(day, new Date())
              const dayMembers = isCurrentMonth
                ? membersByDay.get(day.getDate()) || []
                : []
              const hasBirthday = dayMembers.length > 0

              return (
                <div
                  key={idx}
                  className={cn(
                    'min-h-[80px] p-2 border rounded-lg',
                    !isCurrentMonth && 'bg-gray-50 opacity-50',
                    isToday && 'bg-blue-50 border-blue-300',
                    hasBirthday && isCurrentMonth && 'bg-pink-50 border-pink-300',
                  )}
                  data-testid={`calendar-day-${format(day, 'yyyy-MM-dd')}`}
                >
                  <div className="text-sm font-medium text-gray-700 mb-1">
                    {format(day, 'd')}
                  </div>
                  {hasBirthday && isCurrentMonth && (
                    <div className="space-y-1">
                      {dayMembers.slice(0, 2).map((member) => (
                        <div
                          key={member.id}
                          className={cn(
                            'text-xs bg-pink-200 text-pink-800 px-1 py-0.5 rounded truncate',
                            highlightedMemberId === member.id && 'ring-2 ring-pink-500',
                          )}
                          title={`${member.firstName} ${member.lastName}`}
                          data-testid={`birthday-badge-${member.matricule}`}
                        >
                          {member.firstName} {member.lastName.charAt(0)}.
                        </div>
                      ))}
                      {dayMembers.length > 2 && (
                        <div className="text-xs text-pink-600 font-medium">
                          +{dayMembers.length - 2} autre(s)
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
