import PlacementList from '@/components/placement/PlacementList'
import { PageHero } from '@/components/ui/page-hero'
import { PiggyBank } from 'lucide-react'

export const metadata = {
  title: 'Placements | Kara Administration',
  description: 'Gestion des placements et suivi des bienfaiteurs',
}

export default function PlacementsPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 p-4 md:p-6">
      <PageHero
        icon={PiggyBank}
        title="Placements"
        subtitle="Gestion des placements et suivi des bienfaiteurs"
      />

      <PlacementList />
    </div>
  )
}
