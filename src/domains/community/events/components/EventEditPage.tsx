/**
 * Page d'édition d'un événement (admin)
 */

'use client'

import { Skeleton } from '@/components/ui/skeleton'
import routes from '@/constantes/routes'
import { useAuth } from '@/domains/auth/hooks'
import { useRouter } from 'next/navigation'
import { useEvent } from '../hooks/useEvent'
import { useUpdateEvent } from '../hooks/useEventMutations'
import type { CreateEventFormValues } from '../schemas/event.schema'
import { EventForm } from './EventForm'

interface Props {
  eventId: string
}

export function EventEditPage({ eventId }: Props) {
  const router = useRouter()
  const { user } = useAuth()
  const { data: event, isLoading, isError } = useEvent(eventId)
  const updateEvent = useUpdateEvent()

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (isError || !event) {
    return (
      <div className="p-6 text-sm text-red-600">
        Événement introuvable.
      </div>
    )
  }

  // Une fois publié, on verrouille le toggle "sondage" pour éviter incohérences
  // avec les votes déjà reçus.
  const lockPollToggle = event.status !== 'draft'

  const handleSubmit = async (values: CreateEventFormValues) => {
    if (!user) return
    const startDate = new Date(values.startDate)
    const endDate = values.endDate ? new Date(values.endDate) : undefined
    const pollClosesAt =
      values.pollEnabled && values.pollClosesAt
        ? new Date(values.pollClosesAt)
        : undefined

    await updateEvent.mutateAsync({
      id: event.id,
      updatedBy: user.uid,
      data: {
        title: values.title.trim(),
        description: values.description.trim(),
        imageURL: values.imageURL?.trim() || undefined,
        type: values.type,
        startDate,
        endDate,
        pollEnabled: values.pollEnabled,
        proposedLocations: values.pollEnabled
          ? (values.proposedLocations ?? []).map((o) => ({
              id: o.id,
              name: o.name?.trim() ?? '',
              address: o.address?.trim() || undefined,
              description: o.description?.trim() || undefined,
            }))
          : undefined,
        pollClosesAt,
        finalLocation:
          !values.pollEnabled && values.finalLocation
            ? {
                name: values.finalLocation.name?.trim() ?? '',
                address: values.finalLocation.address?.trim() || undefined,
                description: values.finalLocation.description?.trim() || undefined,
              }
            : undefined,
      },
    })

    router.push(routes.admin.eventDetails(event.id))
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-black tracking-tight bg-gradient-to-r from-[#234D65] to-[#2c5a73] bg-clip-text text-transparent">
          Modifier l&apos;événement
        </h1>
        <p className="text-gray-600 text-sm md:text-base">
          Les modifications seront visibles immédiatement des membres.
        </p>
      </div>

      <EventForm
        initialEvent={event}
        submitLabel="Enregistrer les modifications"
        lockPollToggle={lockPollToggle}
        onBack={() => router.push(routes.admin.eventDetails(event.id))}
        onSubmit={handleSubmit}
        isSubmitting={updateEvent.isPending}
      />
    </div>
  )
}
