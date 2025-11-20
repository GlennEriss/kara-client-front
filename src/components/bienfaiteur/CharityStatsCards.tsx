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
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Évènements cette année */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Évènements cette année
          </CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalEventsThisYear}</div>
          <p className="text-xs text-muted-foreground">
            Actions de solidarité
          </p>
        </CardContent>
      </Card>

      {/* Montant total collecté */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Montant total collecté
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatAmount(stats.totalCollectedAmount)}</div>
          <p className="text-xs text-muted-foreground">
            FCFA
          </p>
        </CardContent>
      </Card>

      {/* Total participants */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total participants
          </CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalParticipants}</div>
          <p className="text-xs text-muted-foreground">
            Membres contributeurs
          </p>
        </CardContent>
      </Card>

      {/* Prochain évènement */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Prochain évènement
          </CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {stats.nextUpcomingEvent ? (
            <>
              <div className="text-lg font-bold truncate">
                {stats.nextUpcomingEvent.title}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatDate(stats.nextUpcomingEvent.startDate)}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Aucun évènement à venir
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

