'use client'

import EditCharityEventForm from '@/components/bienfaiteur/EditCharityEventForm'
import { PageHero } from '@/components/ui/page-hero'
import { Skeleton } from '@/components/ui/skeleton'
import routes from '@/constantes/routes'
import { useCharityEvent } from '@/hooks/bienfaiteur/useCharityEvents'
import { Edit } from 'lucide-react'
import { backOr } from '@/lib/backNavigation'
import { useParams, useRouter } from 'next/navigation'

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
            onClick={() => backOr(router, routes.admin.bienfaiteur)}
            className="text-blue-600 hover:underline"
          >
            Retour
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6">
      <PageHero
        icon={Edit}
        title="Modifier l'évènement"
        subtitle={event.title}
      />
      <EditCharityEventForm event={event} />
    </div>
  )
}

