import CreateCharityEventForm from '@/components/bienfaiteur/CreateCharityEventForm'
import { PageHero } from '@/components/ui/page-hero'
import { HandHeart } from 'lucide-react'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Créer un Évènement | KARA Admin',
  description: 'Créer un nouvel évènement caritatif'
}

export default function CreateBienfaiteurPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6">
      <PageHero
        icon={HandHeart}
        title="Créer un Évènement Bienfaiteur"
        subtitle="Lancez une nouvelle action de solidarité"
      />

      <CreateCharityEventForm />
    </div>
  )
}
