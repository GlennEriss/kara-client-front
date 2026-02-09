'use client'

import React, { useState } from 'react'
import { Calendar, MapPin, Users, TrendingUp, PlayCircle, Loader2 } from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { CharityEvent, CHARITY_EVENT_STATUS_LABELS } from '@/types/types'
import { useRouter } from 'next/navigation'
import routes from '@/constantes/routes'
import Image from 'next/image'

interface CharityEventCardProps {
  event: CharityEvent
  onSetOngoing?: (eventId: string) => void
  updatingEventId?: string | null
}

export default function CharityEventCard({ event, onSetOngoing, updatingEventId }: CharityEventCardProps) {
  const router = useRouter()
  const [confirmSetOngoing, setConfirmSetOngoing] = useState(false)
  const canSetOngoing = (event.status === 'draft' || event.status === 'upcoming') && onSetOngoing
  const isUpdating = updatingEventId === event.id

  const handleConfirmSetOngoing = () => {
    setConfirmSetOngoing(false)
    onSetOngoing?.(event.id)
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
        month: 'short',
        year: 'numeric' 
      }).format(dateObj)
    } catch (error) {
      console.error('Error formatting date:', error, date)
      return 'Date invalide'
    }
  }

  // Sécuriser les dates avant les calculs
  const safeStartDate = event.startDate instanceof Date ? event.startDate : new Date(event.startDate)
  const safeEndDate = event.endDate instanceof Date ? event.endDate : new Date(event.endDate)

  const progressPercentage = event.targetAmount 
    ? Math.min(100, (event.totalCollectedAmount / event.targetAmount) * 100)
    : 100

  const daysRemaining = !isNaN(safeEndDate.getTime())
    ? Math.ceil((safeEndDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0

  const statusColors = {
    draft: 'border-zinc-200 bg-zinc-100/90 text-zinc-800',
    upcoming: 'border-amber-200 bg-amber-100/90 text-amber-800',
    ongoing: 'border-emerald-200 bg-emerald-100/90 text-emerald-800',
    closed: 'border-blue-200 bg-blue-100/90 text-blue-800',
    archived: 'border-indigo-200 bg-indigo-100/90 text-indigo-800'
  }

  return (
    <Card
      className="group cursor-pointer overflow-hidden border-cyan-100/80 bg-gradient-to-b from-white via-white to-cyan-50/40 shadow-[0_16px_34px_-28px_rgba(18,62,98,0.9)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_45px_-28px_rgba(14,56,92,0.95)]"
      onClick={() => router.push(routes.admin.bienfaiteurDetails(event.id))}
    >
      {/* Image de couverture */}
      {event.coverPhotoUrl ? (
        <div className="relative h-52 w-full overflow-hidden">
          <Image
            src={event.coverPhotoUrl}
            alt={event.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/35 via-transparent to-transparent" />
        </div>
      ) : (
        <div className="relative flex h-52 w-full items-center justify-center bg-gradient-to-br from-cyan-100/70 via-sky-100/70 to-indigo-100/75">
          <div className="absolute -left-6 -top-8 h-28 w-28 rounded-full bg-cyan-200/50 blur-2xl" />
          <div className="absolute -bottom-8 right-0 h-28 w-28 rounded-full bg-indigo-200/50 blur-2xl" />
          <TrendingUp className="h-16 w-16 text-slate-500" />
        </div>
      )}

      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-center justify-between">
          <Badge className={`border ${statusColors[event.status]}`}>
            {CHARITY_EVENT_STATUS_LABELS[event.status]}
          </Badge>
          {daysRemaining > 0 && event.status === 'ongoing' && (
            <span className="text-xs font-medium text-slate-600">
              {daysRemaining} jours restants
            </span>
          )}
        </div>

        <h3 className="line-clamp-2 text-lg font-bold text-slate-800">
          {event.title}
        </h3>

        <div className="flex items-center gap-4 text-sm text-slate-600">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(safeStartDate)}</span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            <span className="truncate">{event.location}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pb-4">
        {/* Progression */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-semibold text-slate-800">
              {formatAmount(event.totalCollectedAmount)} FCFA
            </span>
            {event.targetAmount && (
              <span className="text-slate-500">
                {formatAmount(event.targetAmount)} FCFA
              </span>
            )}
          </div>
          <Progress value={progressPercentage} className="h-2.5 bg-slate-200" />
        </div>

        {/* Participants */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1 text-slate-600">
            <Users className="h-4 w-4" />
            <span>{event.totalParticipantsCount} membres</span>
          </div>
          {event.totalGroupsCount > 0 && (
            <span className="text-slate-600">
              {event.totalGroupsCount} groupes
            </span>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex flex-col gap-2 border-t border-cyan-100/70 bg-cyan-50/35 pt-4 sm:flex-row">
        <Button
          variant="outline"
          className="flex-1 border-cyan-200 bg-white text-slate-700 hover:bg-cyan-50"
          onClick={(e) => {
            e.stopPropagation()
            router.push(routes.admin.bienfaiteurDetails(event.id))
          }}
        >
          Voir les détails
        </Button>
        {canSetOngoing && (
          <Button
            variant="default"
            className="flex-1 bg-gradient-to-r from-[#1f4f67] to-[#2f7895] text-white shadow-sm hover:opacity-95"
            disabled={isUpdating}
            onClick={(e) => {
              e.stopPropagation()
              setConfirmSetOngoing(true)
            }}
          >
            {isUpdating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <PlayCircle className="h-4 w-4 mr-2" />
            )}
            Mettre en cours
          </Button>
        )}
      </CardFooter>

      <AlertDialog open={confirmSetOngoing} onOpenChange={setConfirmSetOngoing}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Mettre cet évènement en cours ?</AlertDialogTitle>
            <AlertDialogDescription>
              La collecte sera ouverte aux participants. Vous pourrez modifier le statut plus tard depuis les paramètres.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSetOngoing} disabled={isUpdating}>
              Mettre en cours
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
