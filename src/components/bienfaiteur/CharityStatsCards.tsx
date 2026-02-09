'use client'

import React from 'react'
import { Calendar, TrendingUp, Users, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CharityGlobalStats } from '@/types/types'

interface CharityStatsCardsProps {
  stats: CharityGlobalStats
}

export default function CharityStatsCards({ stats }: CharityStatsCardsProps) {
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount)
  }

  const formatDate = (date: Date | undefined | null) => {
    if (!date) return 'Date non définie'
    try {
      const dateObj = date instanceof Date ? date : new Date(date)
      if (isNaN(dateObj.getTime())) {
        return 'Date invalide'
      }
      return new Intl.DateTimeFormat('fr-FR', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      }).format(dateObj)
    } catch (error) {
      console.error('Error formatting date:', error, date)
      return 'Date invalide'
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {/* Évènements cette année */}
      <Card className="overflow-hidden border-cyan-100/70 bg-gradient-to-br from-white to-cyan-50/60 shadow-[0_14px_28px_-24px_rgba(16,61,99,0.9)] transition-transform hover:-translate-y-0.5">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Évènements cette année
          </CardTitle>
          <div className="rounded-full bg-cyan-100 p-2 text-cyan-700">
            <Calendar className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-black text-slate-800">{stats.totalEventsThisYear}</div>
          <p className="text-xs text-slate-500">
            Actions de solidarité
          </p>
        </CardContent>
      </Card>

      {/* Montant total collecté */}
      <Card className="overflow-hidden border-emerald-100/70 bg-gradient-to-br from-white to-emerald-50/70 shadow-[0_14px_28px_-24px_rgba(16,80,58,0.85)] transition-transform hover:-translate-y-0.5">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Montant total collecté
          </CardTitle>
          <div className="rounded-full bg-emerald-100 p-2 text-emerald-700">
            <TrendingUp className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-black text-slate-800">{formatAmount(stats.totalCollectedAmount)}</div>
          <p className="text-xs text-slate-500">
            FCFA
          </p>
        </CardContent>
      </Card>

      {/* Total participants */}
      <Card className="overflow-hidden border-violet-100/70 bg-gradient-to-br from-white to-violet-50/70 shadow-[0_14px_28px_-24px_rgba(71,58,132,0.85)] transition-transform hover:-translate-y-0.5">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total participants
          </CardTitle>
          <div className="rounded-full bg-violet-100 p-2 text-violet-700">
            <Users className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-black text-slate-800">{stats.totalParticipants}</div>
          <p className="text-xs text-slate-500">
            Membres contributeurs
          </p>
        </CardContent>
      </Card>

      {/* Prochain évènement */}
      <Card className="overflow-hidden border-amber-100/80 bg-gradient-to-br from-white to-amber-50/70 shadow-[0_14px_28px_-24px_rgba(120,87,20,0.78)] transition-transform hover:-translate-y-0.5">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Prochain évènement
          </CardTitle>
          <div className="rounded-full bg-amber-100 p-2 text-amber-700">
            <Clock className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          {stats.nextUpcomingEvent ? (
            <>
              <div className="text-lg font-bold text-slate-800 truncate">
                {stats.nextUpcomingEvent.title}
              </div>
              <p className="text-xs text-slate-500">
                {formatDate(stats.nextUpcomingEvent.startDate)}
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-500">
              Aucun évènement à venir
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
