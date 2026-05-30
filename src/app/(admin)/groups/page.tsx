import GroupList from '@/components/groups/GroupList'
import { PageHero } from '@/components/ui/page-hero'
import { Users } from 'lucide-react'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Groupes | KARA Admin',
  description: 'Gestion des groupes et des membres associés'
}

export default function GroupsPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6">
      <PageHero
        icon={Users}
        title="Gestion des Groupes"
        subtitle="Créez des groupes et rattachez des membres"
      />

      <GroupList />
    </div>
  )
}
