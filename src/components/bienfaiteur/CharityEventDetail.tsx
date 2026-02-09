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
      <div className="relative min-h-full overflow-hidden bg-gradient-to-br from-slate-50 via-cyan-50/40 to-indigo-50/30 p-4 sm:p-6">
        <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-12 top-40 h-72 w-72 rounded-full bg-blue-300/20 blur-3xl" />
        <div className="relative mx-auto max-w-[1440px] space-y-6">
          <Skeleton className="h-72 w-full rounded-3xl border border-cyan-100/70" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-2xl border border-cyan-100/70" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!event || !stats) {
    return (
      <div className="relative min-h-full overflow-hidden bg-gradient-to-br from-slate-50 via-cyan-50/40 to-indigo-50/30 p-4 sm:p-6">
        <div className="mx-auto max-w-[1440px]">
          <Card className="rounded-2xl border-cyan-100/70 bg-white/80 p-8 text-center shadow-[0_14px_30px_-26px_rgba(16,56,90,0.9)] backdrop-blur-sm">
            <p className="text-slate-600">Évènement non trouvé</p>
          </Card>
        </div>
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
    draft: 'border-zinc-200 bg-zinc-100/90 text-zinc-800',
    upcoming: 'border-amber-200 bg-amber-100/90 text-amber-800',
    ongoing: 'border-emerald-200 bg-emerald-100/90 text-emerald-800',
    closed: 'border-blue-200 bg-blue-100/90 text-blue-800',
    archived: 'border-indigo-200 bg-indigo-100/90 text-indigo-800'
  }

  return (
    <div className="relative min-h-full overflow-hidden bg-gradient-to-br from-slate-50 via-cyan-50/40 to-indigo-50/30 p-4 sm:p-6">
      <div className="pointer-events-none absolute -left-24 -top-16 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-44 h-80 w-80 rounded-full bg-blue-300/20 blur-3xl" />
      <div className="relative mx-auto max-w-[1440px] space-y-6">
        {/* Hero Section */}
        <div className="relative h-72 overflow-hidden rounded-3xl border border-cyan-100/70 shadow-[0_22px_44px_-28px_rgba(13,50,89,0.95)]">
          {event.coverPhotoUrl ? (
            <Image
              src={event.coverPhotoUrl}
              alt={event.title}
              fill
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#1f4f67] via-[#245f78] to-[#2f7895]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent" />

          <div className="absolute bottom-0 left-0 right-0 p-6 text-white sm:p-8">
            <div className="mb-3 flex items-center gap-2">
              <Badge className={`border ${statusColors[event.status]}`}>
                {CHARITY_EVENT_STATUS_LABELS[event.status]}
              </Badge>
            </div>
            <h1 className="mb-3 text-3xl font-black tracking-tight sm:text-4xl">{event.title}</h1>
            <div className="flex flex-col gap-2 text-sm text-cyan-50/95 sm:flex-row sm:items-center sm:gap-5">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(startDate)} - {formatDate(endDate)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                <span>{event.location}</span>
              </div>
            </div>
          </div>

          <div className="absolute right-4 top-4">
            <Button
              variant="secondary"
              size="sm"
              className="border border-white/25 bg-white/20 text-white backdrop-blur hover:bg-white/25"
              onClick={() => router.push(routes.admin.bienfaiteurModify(eventId))}
            >
              <Edit className="mr-2 h-4 w-4" />
              Modifier
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="overflow-hidden border-cyan-100/70 bg-gradient-to-br from-white to-cyan-50/60 shadow-[0_14px_30px_-24px_rgba(14,58,95,0.88)]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-700">Progression</CardTitle>
              <div className="rounded-full bg-cyan-100 p-2 text-cyan-700">
                <TrendingUp className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-slate-800">{stats.progressPercentage.toFixed(0)}%</div>
              <Progress value={stats.progressPercentage} className="mt-2 h-2.5 bg-slate-200" />
              <p className="mt-2 text-xs text-slate-500">
                {formatAmount(event.totalCollectedAmount)} / {event.targetAmount ? formatAmount(event.targetAmount) : '∞'} FCFA
              </p>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-emerald-100/70 bg-gradient-to-br from-white to-emerald-50/70 shadow-[0_14px_30px_-24px_rgba(14,88,60,0.75)]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-700">Contributions</CardTitle>
              <div className="rounded-full bg-emerald-100 p-2 text-emerald-700">
                <Gift className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-slate-800">{stats.totalContributions}</div>
              <p className="text-xs text-slate-500">
                {formatAmount(stats.totalMoney)} FCFA espèces
              </p>
              <p className="text-xs text-slate-500">
                {formatAmount(stats.totalInKind)} FCFA en nature
              </p>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-violet-100/70 bg-gradient-to-br from-white to-violet-50/70 shadow-[0_14px_30px_-24px_rgba(72,53,132,0.7)]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-700">Participants</CardTitle>
              <div className="rounded-full bg-violet-100 p-2 text-violet-700">
                <Users className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-slate-800">{stats.totalMembers}</div>
              <p className="text-xs text-slate-500">
                Membres
              </p>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-amber-100/80 bg-gradient-to-br from-white to-amber-50/70 shadow-[0_14px_30px_-24px_rgba(120,90,24,0.75)]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-700">Groupes</CardTitle>
              <div className="rounded-full bg-amber-100 p-2 text-amber-700">
                <Users className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-slate-800">{stats.totalGroups}</div>
              <p className="text-xs text-slate-500">
                Groupes participants
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="relative -mx-2 px-2">
            <div className="overflow-x-auto no-scrollbar">
              <TabsList className="min-w-max rounded-2xl border border-cyan-100/70 bg-white/80 p-1.5 shadow-[0_10px_30px_-24px_rgba(17,57,93,0.88)]">
                <TabsTrigger value="contributions" className="rounded-xl px-4 py-2 data-[state=active]:bg-[#1f4f67] data-[state=active]:text-white">
                  <Gift className="mr-2 h-4 w-4" />
                  Contributions
                </TabsTrigger>
                <TabsTrigger value="participants" className="rounded-xl px-4 py-2 data-[state=active]:bg-[#1f4f67] data-[state=active]:text-white">
                  <Users className="mr-2 h-4 w-4" />
                  Participants
                </TabsTrigger>
                <TabsTrigger value="groups" className="rounded-xl px-4 py-2 data-[state=active]:bg-[#1f4f67] data-[state=active]:text-white">
                  <Users className="mr-2 h-4 w-4" />
                  Groupes
                </TabsTrigger>
                <TabsTrigger value="media" className="rounded-xl px-4 py-2 data-[state=active]:bg-[#1f4f67] data-[state=active]:text-white">
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Médias
                </TabsTrigger>
                <TabsTrigger value="settings" className="rounded-xl px-4 py-2 data-[state=active]:bg-[#1f4f67] data-[state=active]:text-white">
                  <Settings className="mr-2 h-4 w-4" />
                  Paramètres
                </TabsTrigger>
              </TabsList>
            </div>
            <span className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-slate-50 to-transparent" />
            <span className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-slate-50 to-transparent" />
          </div>

          <TabsContent value="contributions" className="space-y-4">
            <Card className="border-cyan-100/70 bg-white/75 p-1 shadow-[0_14px_30px_-24px_rgba(16,56,90,0.85)] backdrop-blur-sm">
              <CardContent className="p-3 sm:p-4">
                <CharityContributionsSection eventId={eventId} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="participants" className="space-y-4">
            <Card className="border-cyan-100/70 bg-white/75 p-1 shadow-[0_14px_30px_-24px_rgba(16,56,90,0.85)] backdrop-blur-sm">
              <CardContent className="p-3 sm:p-4">
                <CharityParticipantsSection eventId={eventId} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="groups" className="space-y-4">
            <Card className="border-cyan-100/70 bg-white/75 p-1 shadow-[0_14px_30px_-24px_rgba(16,56,90,0.85)] backdrop-blur-sm">
              <CardContent className="p-3 sm:p-4">
                <CharityGroupsSection eventId={eventId} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="media" className="space-y-4">
            <Card className="border-cyan-100/70 bg-white/75 p-1 shadow-[0_14px_30px_-24px_rgba(16,56,90,0.85)] backdrop-blur-sm">
              <CardContent className="p-3 sm:p-4">
                <CharityMediaSection eventId={eventId} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card className="border-cyan-100/70 bg-white/75 p-1 shadow-[0_14px_30px_-24px_rgba(16,56,90,0.85)] backdrop-blur-sm">
              <CardContent className="p-3 sm:p-4">
                <CharityEventSettings event={event} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
