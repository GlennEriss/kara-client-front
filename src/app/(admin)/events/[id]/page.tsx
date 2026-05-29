import { EventDetailPage } from '@/domains/community/events/components/EventDetailPage'

interface RouteProps {
  params: Promise<{ id: string }>
}

export default async function EventDetailRoute({ params }: RouteProps) {
  const { id } = await params
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <EventDetailPage eventId={id} />
      </div>
    </div>
  )
}
