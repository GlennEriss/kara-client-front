'use client'

import { AgentsListPage } from '@/components/agent-recouvrement/AgentsListPage'
import { PageHero } from '@/components/ui/page-hero'
import { UserCheck } from 'lucide-react'
import { Suspense } from 'react'

export default function AgentsRecouvrementPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 p-4 md:p-6">
      <PageHero
        icon={UserCheck}
        title="Agents de Recouvrement"
        subtitle="Gérez les agents terrain qui collectent les paiements"
      />
      {/* useSearchParams (état de liste dans l'URL) impose une frontière Suspense au build */}
      <Suspense fallback={null}>
        <AgentsListPage />
      </Suspense>
    </div>
  )
}
