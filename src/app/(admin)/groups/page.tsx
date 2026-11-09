import GroupList from '@/components/groups/GroupList'
import { PageHero } from '@/components/ui/page-hero'
import { Users } from 'lucide-react'
import { Metadata } from 'next'
import { Suspense } from 'react'

export const metadata: Metadata = {
  title: 'Groupes | LE KARA Admin',
  description: 'Groupes de membres et projets collectifs'
}

export default function GroupsPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 p-4 md:p-6">
      <PageHero
        icon={Users}
        title="Groupes et projets collectifs"
        subtitle="Réunissez des membres autour d’une caisse collective, d’un achat ou d’une idée commune."
      />

      {/* useSearchParams (état de liste dans l'URL) impose une frontière Suspense au build */}
      <Suspense fallback={null}>
        <GroupList />
      </Suspense>
    </div>
  )
}
