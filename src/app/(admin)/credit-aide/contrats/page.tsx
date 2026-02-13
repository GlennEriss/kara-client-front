import React, { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { CreditAideContratsSection } from '@/domains/financial/credit-speciale/aide/contrats/components/CreditAideContratsSection'

function CreditAideContratsSkeleton() {
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

export default function CreditAideContratsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-gradient-to-r from-[#234D65] to-[#2c5a73] bg-clip-text text-transparent">
              Contrats de Crédit Aide
            </h1>
            <p className="text-gray-600 text-base md:text-lg">
              Gestion des contrats de crédit aide et suivi des versements.
            </p>
          </div>
        </div>

        <Suspense fallback={<CreditAideContratsSkeleton />}>
          <CreditAideContratsSection />
        </Suspense>
      </div>
    </div>
  )
}
