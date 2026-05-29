/**
 * Page de création d'un événement (admin)
 */

'use client'

import routes from '@/constantes/routes'
import { useAuth } from '@/domains/auth/hooks'
import { auth } from '@/firebase/auth'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { EventForm } from './EventForm'
import { useCreateEvent } from '../hooks/useEventMutations'
import type { CreateEventFormValues } from '../schemas/event.schema'

export function EventCreatePage() {
  const router = useRouter()
  const { user } = useAuth()
  const createEvent = useCreateEvent()

  const handleSubmit = async (values: CreateEventFormValues) => {
    const currentUser = user ?? auth.currentUser
    if (!currentUser) {
      toast.error('Session expirée', { description: 'Veuillez vous reconnecter.' })
      return
    }
    const startDate = new Date(values.startDate)
    const endDate = values.endDate ? new Date(values.endDate) : undefined
    const pollClosesAt =
      values.pollEnabled && values.pollClosesAt
        ? new Date(values.pollClosesAt)
        : undefined

    try {
      const event = await createEvent.mutateAsync({
        createdBy: currentUser.uid,
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
                name: o.name.trim(),
                address: o.address?.trim() || undefined,
                description: o.description?.trim() || undefined,
              }))
            : undefined,
          pollClosesAt,
          finalLocation:
            !values.pollEnabled && values.finalLocation
              ? {
                  name: values.finalLocation.name.trim(),
                  address: values.finalLocation.address?.trim() || undefined,
                  description: values.finalLocation.description?.trim() || undefined,
                }
              : undefined,
          createdBy: currentUser.uid,
        },
      })
      router.push(routes.admin.eventDetails(event.id))
    } catch (err) {
      console.error('[EventCreatePage] mutateAsync error:', err)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-black tracking-tight bg-gradient-to-r from-[#234D65] to-[#2c5a73] bg-clip-text text-transparent">
          Nouvel événement
        </h1>
        <p className="text-gray-600 text-sm md:text-base">
          L&apos;événement est créé en brouillon. Vous pourrez le publier depuis la page de détail.
        </p>
      </div>

      <EventForm
        onBack={() => router.push(routes.admin.events)}
        onSubmit={handleSubmit}
        isSubmitting={createEvent.isPending}
        submitLabel="Créer l'événement"
      />
    </div>
  )
}
