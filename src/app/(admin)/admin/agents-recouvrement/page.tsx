'use client'

import { AgentsListPage } from '@/components/agent-recouvrement/AgentsListPage'
import { PageHero } from '@/components/ui/page-hero'
import { UserCheck } from 'lucide-react'

export default function AgentsRecouvrementPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 p-4 md:p-6">
      <PageHero
        icon={UserCheck}
        title="Agents de Recouvrement"
        subtitle="Gérez les agents terrain qui collectent les paiements"
      />
      <AgentsListPage />
    </div>
  )
}
