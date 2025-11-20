'use client'

import { useParams, useRouter } from 'next/navigation'
import { useCharityEvent } from '@/hooks/bienfaiteur/useCharityEvents'
import { Skeleton } from '@/components/ui/skeleton'
import EditCharityEventForm from '@/components/bienfaiteur/EditCharityEventForm'
import routes from '@/constantes/routes'

export default function ModifyCharityEventPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.id as string

  const { data: event, isLoading } = useCharityEvent(eventId)

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Évènement non trouvé</p>
          <button
            onClick={() => router.push(routes.admin.bienfaiteur)}
            className="text-blue-600 hover:underline"
          >
            Retour à la liste
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Modifier l'évènement</h1>
        <p className="text-gray-600 mt-2">{event.title}</p>
      </div>
      <EditCharityEventForm event={event} />
    </div>
  )
}

