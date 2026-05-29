import CreditSimulationPage from '@/components/credit-speciale/CreditSimulationPage'
import { PageHero } from '@/components/ui/page-hero'
import { Skeleton } from '@/components/ui/skeleton'
import { Calculator } from 'lucide-react'
import { Suspense } from 'react'

function CreditSimulationPageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  )
}

export default function SimulationsPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 p-4 md:p-6">
      <PageHero
        icon={Calculator}
        title="Simulation de Crédit"
        subtitle="Calculez les conditions de remboursement pour vos crédits"
      />

      <Suspense fallback={<CreditSimulationPageSkeleton />}>
        <CreditSimulationPage />
      </Suspense>
    </div>
  )
}
