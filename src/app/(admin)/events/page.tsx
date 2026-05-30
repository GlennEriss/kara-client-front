import { PageHero } from '@/components/ui/page-hero'
import { EventsListPage } from '@/domains/community/events/components/EventsListPage'
import { CalendarDays } from 'lucide-react'

export default function EventsRoute() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 p-4 md:p-6">
      <PageHero
        icon={CalendarDays}
        title="Événements"
        subtitle="Organisez les événements de l'association et leurs sondages de lieu"
      />
      <EventsListPage />
    </div>
  )
}
