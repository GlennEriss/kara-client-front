import { PageHero } from '@/components/ui/page-hero'
import { Skeleton } from '@/components/ui/skeleton'
import { CreditFixeContratsSection } from '@/domains/financial/credit-speciale/fixe/contrats/components/CreditFixeContratsSection'
import { FileText } from 'lucide-react'
import { Suspense } from 'react'

function CreditFixeContratsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-12 bg-gray-200 rounded animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    </div>
  )
}

export default function CreditFixeContratsPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 p-4 md:p-6">
      <PageHero
        icon={FileText}
        title="Contrats de Crédit Fixe"
        subtitle="Gestion des contrats de crédit fixe et suivi des versements."
      />

      <Suspense fallback={<CreditFixeContratsSkeleton />}>
        <CreditFixeContratsSection />
      </Suspense>
    </div>
  )
}
