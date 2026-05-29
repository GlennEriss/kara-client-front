import { EventCreatePage } from '@/domains/community/events/components/EventCreatePage'

export default function EventNewRoute() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <EventCreatePage />
      </div>
    </div>
  )
}
