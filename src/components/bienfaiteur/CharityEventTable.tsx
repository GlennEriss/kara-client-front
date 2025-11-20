'use client'

import React from 'react'
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
import { CharityEvent, CHARITY_EVENT_STATUS_LABELS } from '@/types/types'
import { useRouter } from 'next/navigation'
import routes from '@/constantes/routes'
import { Eye, MoreVertical } from 'lucide-react'
import Image from 'next/image'

interface CharityEventTableProps {
  events: CharityEvent[]
}

export default function CharityEventTable({ events }: CharityEventTableProps) {
  const router = useRouter()

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
    draft: 'bg-gray-100 text-gray-800',
    upcoming: 'bg-yellow-100 text-yellow-800',
    ongoing: 'bg-green-100 text-green-800',
    closed: 'bg-blue-100 text-blue-800',
    archived: 'bg-gray-100 text-gray-600'
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Évènement</TableHead>
            <TableHead>Dates & Lieu</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Progression</TableHead>
            <TableHead>Participants</TableHead>
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
              <TableRow key={event.id} className="cursor-pointer hover:bg-gray-50" onClick={() => router.push(routes.admin.bienfaiteurDetails(event.id))}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {event.coverPhotoUrl ? (
                      <div className="relative h-12 w-12 rounded overflow-hidden flex-shrink-0">
                        <Image
                          src={event.coverPhotoUrl}
                          alt={event.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-12 w-12 rounded bg-gradient-to-br from-blue-50 to-indigo-100 flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="font-medium truncate">{event.title}</p>
                      <p className="text-sm text-gray-500 truncate">{event.description.substring(0, 60)}...</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <p>{formatDate(safeStartDate)} - {formatDate(safeEndDate)}</p>
                    <p className="text-gray-500">{event.location}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={statusColors[event.status]}>
                    {CHARITY_EVENT_STATUS_LABELS[event.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="space-y-1 min-w-[150px]">
                    <div className="flex justify-between text-xs">
                      <span>{formatAmount(event.totalCollectedAmount)} FCFA</span>
                      {event.targetAmount && (
                        <span className="text-gray-500">{formatAmount(event.targetAmount)}</span>
                      )}
                    </div>
                    <Progress value={progressPercentage} className="h-2" />
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <p>{event.totalParticipantsCount} membres</p>
                    <p className="text-gray-500">{event.totalGroupsCount} groupes</p>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(routes.admin.bienfaiteurDetails(event.id))
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation()
                      }}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

