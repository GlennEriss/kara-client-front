/**
 * Page de détail d'un événement (admin)
 *
 * Bloc infos générales + lieu (final ou sondage)
 * + résultats du sondage + table des votants
 * + actions : publier, modifier, clôturer le sondage, annuler, supprimer
 */

'use client'

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import routes from '@/constantes/routes'
import { useAuth } from '@/domains/auth/hooks'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  CalendarHeart,
  ChevronLeft,
  Edit,
  Loader2,
  MapPin,
  Megaphone,
  Send,
  Trash2,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useEvent } from '../hooks/useEvent'
import {
  useCancelEvent,
  useConfirmEventLocation,
  useDeleteEvent,
  usePublishEvent,
} from '../hooks/useEventMutations'
import { EVENT_TYPE_LABEL, EventStatusBadge, EventTypeBadge } from './event-meta'
import { PollResultsPanel } from './PollResultsPanel'
import { VotersTable } from './VotersTable'

interface Props {
  eventId: string
}

export function EventDetailPage({ eventId }: Props) {
  const router = useRouter()
  const { user } = useAuth()
  const { data: event, isLoading, isError } = useEvent(eventId)

  const publish = usePublishEvent()
  const cancel = useCancelEvent()
  const confirmLoc = useConfirmEventLocation()
  const del = useDeleteEvent()

  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [selectedOptionId, setSelectedOptionId] = useState<string>('')
  const [deleteOpen, setDeleteOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (isError || !event) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-600 mb-3">Événement introuvable.</p>
        <Button asChild variant="outline">
          <Link href={routes.admin.events}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Retour à la liste
          </Link>
        </Button>
      </div>
    )
  }

  const canPublish = event.status === 'draft'
  const canEdit = event.status !== 'cancelled' && event.status !== 'completed'
  const canDelete = event.status === 'draft'
  const canCancel = event.status !== 'cancelled' && event.status !== 'completed'
  const canConfirmLocation = event.status === 'poll_open'

  const startLabel = format(event.startDate, "EEEE d MMMM yyyy 'à' HH'h'mm", { locale: fr })
  const endLabel = event.endDate
    ? format(event.endDate, "EEEE d MMMM yyyy 'à' HH'h'mm", { locale: fr })
    : null
  const pollClosesLabel = event.pollClosesAt
    ? format(event.pollClosesAt, "d MMMM yyyy 'à' HH'h'mm", { locale: fr })
    : null

  return (
    <div className="space-y-5">
      {/* Toolbar haut */}
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href={routes.admin.events}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Retour
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          {canPublish && (
            <Button
              type="button"
              onClick={() =>
                user && publish.mutate({ id: event.id, publishedBy: user.uid })
              }
              disabled={publish.isPending}
              className="bg-[#234D65] hover:bg-[#1A3D4F]"
            >
              {publish.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Send className="h-4 w-4 mr-1" />
              )}
              Publier
            </Button>
          )}
          {canConfirmLocation && (
            <Button
              type="button"
              variant="outline"
              className="border-amber-300 text-amber-700 hover:bg-amber-50"
              onClick={() => {
                setSelectedOptionId(event.proposedLocations?.[0]?.id ?? '')
                setConfirmOpen(true)
              }}
            >
              <MapPin className="h-4 w-4 mr-1" />
              Clôturer & confirmer le lieu
            </Button>
          )}
          {canEdit && (
            <Button asChild variant="outline">
              <Link href={routes.admin.eventEdit(event.id)}>
                <Edit className="h-4 w-4 mr-1" />
                Modifier
              </Link>
            </Button>
          )}
          {canCancel && (
            <Button
              type="button"
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-50"
              onClick={() => setCancelOpen(true)}
            >
              <X className="h-4 w-4 mr-1" />
              Annuler
            </Button>
          )}
          {canDelete && (
            <Button
              type="button"
              variant="ghost"
              className="text-red-600 hover:bg-red-50"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Supprimer
            </Button>
          )}
        </div>
      </div>

      {/* En-tête */}
      <Card className="overflow-hidden">
        {event.imageURL && (
          <div className="relative h-56 w-full bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={event.imageURL}
              alt={event.title}
              className="h-full w-full object-cover"
            />
          </div>
        )}
        <CardContent className="p-5 md:p-6 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <EventStatusBadge status={event.status} />
            {event.type && <EventTypeBadge type={event.type} />}
            <span className="text-xs text-gray-400">ID : {event.id}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            {event.title}
          </h1>
          <p className="text-sm text-gray-700 whitespace-pre-line">
            {event.description}
          </p>

          {event.cancellationReason && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <strong>Motif d&apos;annulation :</strong> {event.cancellationReason}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Date & lieu */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center gap-2 text-[#234D65]">
              <CalendarHeart className="h-5 w-5" />
              <h2 className="font-semibold">Date et horaires</h2>
            </div>
            <p className="text-sm text-gray-700">
              <strong>Début :</strong> {startLabel}
            </p>
            {endLabel && (
              <p className="text-sm text-gray-700">
                <strong>Fin :</strong> {endLabel}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center gap-2 text-[#234D65]">
              <MapPin className="h-5 w-5" />
              <h2 className="font-semibold">Lieu</h2>
            </div>
            {event.finalLocation ? (
              <>
                <p className="text-sm font-medium text-gray-900">{event.finalLocation.name}</p>
                {event.finalLocation.address && (
                  <p className="text-sm text-gray-600">{event.finalLocation.address}</p>
                )}
                {event.finalLocation.description && (
                  <p className="text-xs text-gray-500">{event.finalLocation.description}</p>
                )}
              </>
            ) : event.pollEnabled ? (
              <>
                <p className="text-sm text-gray-700">
                  <strong>{event.proposedLocations?.length ?? 0}</strong>{' '}
                  option(s) en cours de sondage
                </p>
                {pollClosesLabel && (
                  <p className="text-xs text-gray-500">
                    Clôture du sondage : {pollClosesLabel}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-500 italic">Lieu non renseigné</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sondage */}
      {event.pollEnabled && <PollResultsPanel event={event} />}
      {event.pollEnabled && (
        <Card>
          <CardContent className="p-5 md:p-6">
            <VotersTable event={event} />
          </CardContent>
        </Card>
      )}

      {/* Si pas de sondage et pas encore publié */}
      {!event.pollEnabled && event.status === 'draft' && (
        <Card className="border-dashed">
          <CardContent className="p-5 text-sm text-gray-500 flex items-start gap-3">
            <Megaphone className="h-4 w-4 mt-0.5 shrink-0" />
            <p>
              Cet événement est en brouillon. Cliquez sur <strong>Publier</strong> pour
              le rendre visible aux membres.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}

      {/* Confirmer le lieu gagnant */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer le lieu de l&apos;événement</DialogTitle>
            <DialogDescription>
              Sélectionnez l&apos;option retenue. Le sondage sera clôturé et les
              membres recevront une notification du lieu officiel.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 pt-2">
            <Label>Lieu officiel</Label>
            <Select value={selectedOptionId} onValueChange={setSelectedOptionId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une option" />
              </SelectTrigger>
              <SelectContent>
                {(event.proposedLocations ?? []).map((opt) => {
                  const count = event.votesByOptionId?.[opt.id] ?? 0
                  return (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.name} — {count} vote{count > 1 ? 's' : ''}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={async () => {
                if (!user || !selectedOptionId) return
                await confirmLoc.mutateAsync({
                  id: event.id,
                  input: { optionId: selectedOptionId },
                  confirmedBy: user.uid,
                })
                setConfirmOpen(false)
              }}
              disabled={!selectedOptionId || confirmLoc.isPending}
              className="bg-[#234D65] hover:bg-[#1A3D4F]"
            >
              {confirmLoc.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              )}
              Confirmer ce lieu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Annuler l'événement */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Annuler l&apos;événement</DialogTitle>
            <DialogDescription>
              Cette action est visible des membres. Précisez la raison de l&apos;annulation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 pt-2">
            <Label htmlFor="cancel-reason">Raison de l&apos;annulation *</Label>
            <Textarea
              id="cancel-reason"
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Ex : reporté en raison de…"
            />
            {cancelReason.length > 0 && cancelReason.trim().length < 10 && (
              <p className="text-xs text-red-600">
                Minimum 10 caractères ({cancelReason.trim().length}/10)
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>
              Retour
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!user || cancelReason.trim().length < 10) return
                await cancel.mutateAsync({
                  id: event.id,
                  input: { reason: cancelReason.trim() },
                  cancelledBy: user.uid,
                })
                setCancelOpen(false)
                setCancelReason('')
              }}
              disabled={cancelReason.trim().length < 10 || cancel.isPending}
            >
              {cancel.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              )}
              Confirmer l&apos;annulation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Supprimer le brouillon */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l&apos;événement ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le brouillon sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={async () => {
                if (!user) return
                await del.mutateAsync({ id: event.id, deletedBy: user.uid })
                router.push(routes.admin.events)
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
