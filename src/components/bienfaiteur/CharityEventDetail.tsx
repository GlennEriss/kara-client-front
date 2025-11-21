'use client'

import React, { useState } from 'react'
import { useCharityEvent, useCharityEventStats } from '@/hooks/bienfaiteur/useCharityEvents'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Calendar, MapPin, TrendingUp, Users, Gift, Image as ImageIcon, Settings, Edit } from 'lucide-react'
import { CHARITY_EVENT_STATUS_LABELS } from '@/types/types'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import routes from '@/constantes/routes'
import CharityContributionsSection from './CharityContributionsSection'
import CharityParticipantsSection from './CharityParticipantsSection'
import CharityGroupsSection from './CharityGroupsSection'
import CharityMediaSection from './CharityMediaSection'
import CharityEventSettings from './CharityEventSettings'

interface CharityEventDetailProps {
  eventId: string
}

export default function CharityEventDetail({ eventId }: CharityEventDetailProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('contributions')
  const { data: event, isLoading: isLoadingEvent } = useCharityEvent(eventId)
  const { data: stats, isLoading: isLoadingStats } = useCharityEventStats(eventId)

  if (isLoadingEvent || isLoadingStats) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-64 w-full" />
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    )
  }

  if (!event || !stats) {
    return (
      <div className="p-6">
        <p className="text-center text-gray-500">Évènement non trouvé</p>
      </div>
    )
  }

  // Vérifier et convertir les dates si nécessaire
  const startDate = event.startDate instanceof Date ? event.startDate : new Date(event.startDate)
  const endDate = event.endDate instanceof Date ? event.endDate : new Date(event.endDate)

  // Valider les dates
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    console.error('Invalid dates in event:', { startDate: event.startDate, endDate: event.endDate })
  }

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

  const statusColors = {
    draft: 'bg-gray-100 text-gray-800',
    upcoming: 'bg-yellow-100 text-yellow-800',
    ongoing: 'bg-green-100 text-green-800',
    closed: 'bg-blue-100 text-blue-800',
    archived: 'bg-gray-100 text-gray-600'
  }

  return (
    <div className="space-y-6 p-6">
      {/* Hero Section */}
      <div className="relative h-64 rounded-xl overflow-hidden">
        {event.coverPhotoUrl ? (
          <Image
            src={event.coverPhotoUrl}
            alt={event.title}
            fill
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Badge className={statusColors[event.status]}>
              {CHARITY_EVENT_STATUS_LABELS[event.status]}
            </Badge>
          </div>
          <h1 className="text-4xl font-bold mb-2">{event.title}</h1>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(startDate)} - {formatDate(endDate)}</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              <span>{event.location}</span>
            </div>
          </div>
        </div>

        <div className="absolute top-4 right-4">
          <Button 
            variant="secondary" 
            size="sm"
            onClick={() => router.push(routes.admin.bienfaiteurModify(eventId))}
          >
            <Edit className="h-4 w-4 mr-2" />
            Modifier
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progression</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.progressPercentage.toFixed(0)}%</div>
            <Progress value={stats.progressPercentage} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {formatAmount(event.totalCollectedAmount)} / {event.targetAmount ? formatAmount(event.targetAmount) : '∞'} FCFA
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contributions</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalContributions}</div>
            <p className="text-xs text-muted-foreground">
              {formatAmount(stats.totalMoney)} FCFA espèces
            </p>
            <p className="text-xs text-muted-foreground">
              {formatAmount(stats.totalInKind)} FCFA en nature
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Participants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMembers}</div>
            <p className="text-xs text-muted-foreground">
              Membres
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Groupes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalGroups}</div>
            <p className="text-xs text-muted-foreground">
              Groupes participants
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="relative -mx-4 px-4">
          <div className="overflow-x-auto no-scrollbar">
            <TabsList className="flex min-w-max gap-2">
              <TabsTrigger value="contributions">Contributions</TabsTrigger>
              <TabsTrigger value="participants">Participants</TabsTrigger>
              <TabsTrigger value="groups">Groupes</TabsTrigger>
              <TabsTrigger value="media">Médias</TabsTrigger>
              <TabsTrigger value="settings">Paramètres</TabsTrigger>
            </TabsList>
          </div>
          <span className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-white to-transparent" />
          <span className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-white to-transparent" />
        </div>

        <TabsContent value="contributions" className="space-y-4">
          <CharityContributionsSection eventId={eventId} />
        </TabsContent>

        <TabsContent value="participants" className="space-y-4">
          <CharityParticipantsSection eventId={eventId} />
        </TabsContent>

        <TabsContent value="groups" className="space-y-4">
          <CharityGroupsSection eventId={eventId} />
        </TabsContent>

        <TabsContent value="media" className="space-y-4">
          <CharityMediaSection eventId={eventId} />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <CharityEventSettings event={event} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

