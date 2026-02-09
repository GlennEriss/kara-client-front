'use client'

import React, { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { Eye, MoreVertical, Pencil, PlayCircle, Loader2 } from 'lucide-react'
import Image from 'next/image'

interface CharityEventTableProps {
  events: CharityEvent[]
  onSetOngoing?: (eventId: string) => void
  updatingEventId?: string | null
}

export default function CharityEventTable({ events, onSetOngoing, updatingEventId }: CharityEventTableProps) {
  const router = useRouter()
  const [eventIdToSetOngoing, setEventIdToSetOngoing] = useState<string | null>(null)

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

  const statusColors = {
    draft: 'border-zinc-200 bg-zinc-100/90 text-zinc-800',
    upcoming: 'border-amber-200 bg-amber-100/90 text-amber-800',
    ongoing: 'border-emerald-200 bg-emerald-100/90 text-emerald-800',
    closed: 'border-blue-200 bg-blue-100/90 text-blue-800',
    archived: 'border-indigo-200 bg-indigo-100/90 text-indigo-800'
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-cyan-100/80 bg-white/80 shadow-[0_16px_34px_-30px_rgba(15,56,93,0.9)] backdrop-blur-sm">
      <Table>
        <TableHeader className="bg-cyan-50/70">
          <TableRow className="hover:bg-cyan-50/70">
            <TableHead className="text-slate-700">Évènement</TableHead>
            <TableHead className="text-slate-700">Dates & Lieu</TableHead>
            <TableHead className="text-slate-700">Statut</TableHead>
            <TableHead className="text-slate-700">Progression</TableHead>
            <TableHead className="text-slate-700">Participants</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((event) => {
            const progressPercentage = event.targetAmount 
              ? Math.min(100, (event.totalCollectedAmount / event.targetAmount) * 100)
              : 100

            // Sécuriser les dates
            const safeStartDate = event.startDate instanceof Date ? event.startDate : new Date(event.startDate)
            const safeEndDate = event.endDate instanceof Date ? event.endDate : new Date(event.endDate)

            return (
              <TableRow key={event.id} className="cursor-pointer border-cyan-100/60 transition-colors hover:bg-cyan-50/35" onClick={() => router.push(routes.admin.bienfaiteurDetails(event.id))}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {event.coverPhotoUrl ? (
                      <div className="relative h-12 w-12 rounded-md overflow-hidden flex-shrink-0 ring-1 ring-cyan-100">
                        <Image
                          src={event.coverPhotoUrl}
                          alt={event.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-12 w-12 rounded-md bg-gradient-to-br from-cyan-100 to-indigo-100 flex-shrink-0 ring-1 ring-cyan-100" />
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 truncate">{event.title}</p>
                      <p className="text-sm text-slate-500 truncate">{event.description.substring(0, 60)}...</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <p>{formatDate(safeStartDate)} - {formatDate(safeEndDate)}</p>
                    <p className="text-slate-500">{event.location}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={`border ${statusColors[event.status]}`}>
                    {CHARITY_EVENT_STATUS_LABELS[event.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="min-w-[170px] space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-slate-700">{formatAmount(event.totalCollectedAmount)} FCFA</span>
                      {event.targetAmount && (
                        <span className="text-slate-500">{formatAmount(event.targetAmount)}</span>
                      )}
                    </div>
                    <Progress value={progressPercentage} className="h-2.5 bg-slate-200" />
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <p className="font-medium text-slate-700">{event.totalParticipantsCount} membres</p>
                    <p className="text-slate-500">{event.totalGroupsCount} groupes</p>
                  </div>
                </TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-slate-600 hover:bg-cyan-50">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(routes.admin.bienfaiteurDetails(event.id))}>
                          <Eye className="h-4 w-4 mr-2" />
                          Voir les détails
                        </DropdownMenuItem>
                        {(event.status === 'draft' || event.status === 'upcoming') && onSetOngoing && (
                          <DropdownMenuItem
                            disabled={updatingEventId === event.id}
                            onSelect={() => setEventIdToSetOngoing(event.id)}
                          >
                            {updatingEventId === event.id ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <PlayCircle className="h-4 w-4 mr-2" />
                            )}
                            Mettre en cours
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => router.push(routes.admin.bienfaiteurModify(event.id))}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Modifier
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      <AlertDialog open={!!eventIdToSetOngoing} onOpenChange={(open) => !open && setEventIdToSetOngoing(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mettre cet évènement en cours ?</AlertDialogTitle>
            <AlertDialogDescription>
              La collecte sera ouverte aux participants. Vous pourrez modifier le statut plus tard depuis les paramètres.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (eventIdToSetOngoing) onSetOngoing?.(eventIdToSetOngoing)
                setEventIdToSetOngoing(null)
              }}
              disabled={eventIdToSetOngoing !== null && updatingEventId === eventIdToSetOngoing}
            >
              Mettre en cours
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
