import { EventEditPage } from '@/domains/community/events/components/EventEditPage'

interface RouteProps {
  params: Promise<{ id: string }>
}

export default async function EventEditRoute({ params }: RouteProps) {
  const { id } = await params
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <EventEditPage eventId={id} />
      </div>
    </div>
  )
}
