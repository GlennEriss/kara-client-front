"use client"

import ListContracts from '@/components/caisse-speciale/ListContracts'
import { PageHero } from '@/components/ui/page-hero'
import { Wallet } from 'lucide-react'
import { Suspense } from 'react'

export default function AdminCaissePage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 p-4 md:p-6">
      <PageHero
        icon={Wallet}
        title="Caisse Spéciale"
        subtitle="Gestion des contrats et suivi des versements"
      />

      {/* useSearchParams (état de liste dans l'URL) impose une frontière Suspense au build */}
      <Suspense fallback={null}>
        <ListContracts />
      </Suspense>
    </div>
  )
}
