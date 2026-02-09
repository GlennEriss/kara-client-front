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
    draft: 'bg-gray-100 text-gray-800',
    upcoming: 'bg-yellow-100 text-yellow-800',
    ongoing: 'bg-green-100 text-green-800',
    closed: 'bg-blue-100 text-blue-800',
    archived: 'bg-gray-100 text-gray-600'
  }

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push(routes.admin.bienfaiteurDetails(event.id))}>
      {/* Image de couverture */}
      {event.coverPhotoUrl ? (
        <div className="relative h-48 w-full">
          <Image
            src={event.coverPhotoUrl}
            alt={event.title}
            fill
            className="object-cover"
          />
        </div>
      ) : (
        <div className="h-48 w-full bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
          <TrendingUp className="h-16 w-16 text-gray-400" />
        </div>
      )}

      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between">
          <Badge className={statusColors[event.status]}>
            {CHARITY_EVENT_STATUS_LABELS[event.status]}
          </Badge>
          {daysRemaining > 0 && event.status === 'ongoing' && (
            <span className="text-xs text-gray-500">
              {daysRemaining} jours restants
            </span>
          )}
        </div>

        <h3 className="text-lg font-bold line-clamp-2">
          {event.title}
        </h3>

        <div className="flex items-center gap-4 text-sm text-gray-600">
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

      <CardContent className="space-y-4">
        {/* Progression */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">
              {formatAmount(event.totalCollectedAmount)} FCFA
            </span>
            {event.targetAmount && (
              <span className="text-gray-500">
                {formatAmount(event.targetAmount)} FCFA
              </span>
            )}
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Participants */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1 text-gray-600">
            <Users className="h-4 w-4" />
            <span>{event.totalParticipantsCount} membres</span>
          </div>
          {event.totalGroupsCount > 0 && (
            <span className="text-gray-600">
              {event.totalGroupsCount} groupes
            </span>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex flex-col sm:flex-row gap-2">
        <Button
          variant="outline"
          className="flex-1"
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
            className="flex-1"
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

