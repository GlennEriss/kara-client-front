import { PageHero } from '@/components/ui/page-hero'
import { Skeleton } from '@/components/ui/skeleton'
import { CreditFixeSimulationSection } from '@/domains/financial/credit-speciale/fixe/simulation/components/CreditFixeSimulationSection'
import { Calculator } from 'lucide-react'
import { Suspense } from 'react'

function CreditFixeSimulationPageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  )
}

export default function CreditFixeSimulationPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 p-4 md:p-6">
      <PageHero
        icon={Calculator}
        title="Simulation Crédit Fixe"
        subtitle="Simulez un prêt à intérêt unique avec une durée maximale de 14 échéances."
      />

      <Suspense fallback={<CreditFixeSimulationPageSkeleton />}>
        <CreditFixeSimulationSection />
      </Suspense>
    </div>
  )
}
