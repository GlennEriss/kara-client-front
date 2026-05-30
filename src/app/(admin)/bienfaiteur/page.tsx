import CharityEventsList from '@/components/bienfaiteur/CharityEventsList'
import { PageHero } from '@/components/ui/page-hero'
import { HandHeart } from 'lucide-react'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Évènements Bienfaiteur | KARA Admin',
  description: 'Gestion des évènements caritatifs et récollections de l\'Association LE KARA'
}

export default function BienfaiteurPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 sm:p-6">
      <PageHero
        icon={HandHeart}
        title="Évènements Bienfaiteur"
        subtitle="Gérez les actions de solidarité, les participants et les contributions depuis un tableau de bord unifié."
      />

      <CharityEventsList />
    </div>
  )
}
