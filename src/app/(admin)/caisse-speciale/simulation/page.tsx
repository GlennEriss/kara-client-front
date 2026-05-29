'use client'

import CaisseSpecialeSimulationPage from '@/components/caisse-speciale/CaisseSpecialeSimulationPage'
import { PageHero } from '@/components/ui/page-hero'
import { Skeleton } from '@/components/ui/skeleton'
import { Calculator } from 'lucide-react'
import { Suspense } from 'react'

function SimulationPageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  )
}

export default function SimulationPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 p-4 md:p-6">
      <PageHero
        icon={Calculator}
        title="Simulation Caisse Spéciale"
        subtitle="Simulez un échéancier et les bonus pour un contrat Standard ou Standard Charitable. Aucune donnée n'est enregistrée."
      />

      <Suspense fallback={<SimulationPageSkeleton />}>
        <CaisseSpecialeSimulationPage />
      </Suspense>
    </div>
  )
}
