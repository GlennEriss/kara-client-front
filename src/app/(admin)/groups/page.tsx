import { Metadata } from 'next'
import GroupList from '@/components/groups/GroupList'

export const metadata: Metadata = {
  title: 'Groupes | KARA Admin',
  description: 'Gestion des groupes et des membres associés'
}

export default function GroupsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-[#234D65] to-[#2c5a73] bg-clip-text text-transparent">
            Gestion des Groupes
          </h1>
          <p className="text-gray-600 text-lg">Créez des groupes et rattachez des membres</p>
        </div>
      </div>

      <GroupList />
    </div>
  )
}

