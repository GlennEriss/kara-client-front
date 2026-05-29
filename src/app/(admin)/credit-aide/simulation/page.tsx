import { PageHero } from '@/components/ui/page-hero'
import { Skeleton } from '@/components/ui/skeleton'
import { CreditAideSimulationSection } from '@/domains/financial/credit-speciale/aide/simulation/components/CreditAideSimulationSection'
import { Calculator } from 'lucide-react'
import { Suspense } from 'react'

function CreditAideSimulationPageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  )
}

export default function CreditAideSimulationPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 p-4 md:p-6">
      <PageHero
        icon={Calculator}
        title="Simulation Crédit Aide"
        subtitle="Simulez un prêt à intérêt unique (0% à 5%) sur une durée maximale de 3 échéances."
      />

      <Suspense fallback={<CreditAideSimulationPageSkeleton />}>
        <CreditAideSimulationSection />
      </Suspense>
    </div>
  )
}
