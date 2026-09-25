import MessageTemplatesSettings from '@/domains/messaging/components/MessageTemplatesSettings'
import { PageHero } from '@/components/ui/page-hero'
import { MessageSquare } from 'lucide-react'

export const metadata = {
  title: 'Modèles de messages | LE KARA Administration',
  description: 'Personnalisez les messages de rappel et d’anniversaire envoyés aux membres',
}

export default function MessageTemplatesPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 p-4 md:p-6">
      <PageHero
        icon={MessageSquare}
        title="Modèles de messages"
        subtitle="Personnalisez les messages WhatsApp envoyés aux membres : rappels de versement, anniversaires, adhésion, assurance."
      />
      <MessageTemplatesSettings />
    </div>
  )
}
