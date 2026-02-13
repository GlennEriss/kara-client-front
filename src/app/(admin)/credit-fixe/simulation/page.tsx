import React, { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { CreditFixeSimulationSection } from '@/domains/financial/credit-speciale/fixe/simulation/components/CreditFixeSimulationSection'

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-gradient-to-r from-[#234D65] to-[#2c5a73] bg-clip-text text-transparent">
              Simulation Crédit Fixe
            </h1>
            <p className="text-gray-600 text-base md:text-lg">
              Simulez un prêt à intérêt unique avec une durée maximale de 14 échéances.
            </p>
          </div>
        </div>

        <Suspense fallback={<CreditFixeSimulationPageSkeleton />}>
          <CreditFixeSimulationSection />
        </Suspense>
      </div>
    </div>
  )
}
