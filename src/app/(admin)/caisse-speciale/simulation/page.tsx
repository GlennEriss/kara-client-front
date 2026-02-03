'use client'

import React, { Suspense } from 'react'
import CaisseSpecialeSimulationPage from '@/components/caisse-speciale/CaisseSpecialeSimulationPage'
import { Skeleton } from '@/components/ui/skeleton'

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-gradient-to-r from-[#234D65] to-[#2c5a73] bg-clip-text text-transparent">
              Simulation Caisse Spéciale
            </h1>
            <p className="text-gray-600 text-base md:text-lg">
              Simulez un échéancier et les bonus pour un contrat Standard ou Standard Charitable. Aucune donnée n&apos;est enregistrée.
            </p>
          </div>
        </div>

        <Suspense fallback={<SimulationPageSkeleton />}>
          <CaisseSpecialeSimulationPage />
        </Suspense>
      </div>
    </div>
  )
}
