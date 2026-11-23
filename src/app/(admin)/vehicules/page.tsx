import { VehicleInsuranceList } from '@/components/vehicule/VehicleInsuranceList'
import { Metadata } from 'next'
import { Suspense } from 'react'

export const metadata: Metadata = {
  title: 'Assurances et prospections | LE KARA Admin',
  description: 'Gestion des assurances de biens, des échéances et des prospects',
}

export default function VehiculesPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 md:p-6">
      {/* useSearchParams (état de liste dans l'URL) impose une frontière Suspense au build */}
      <Suspense fallback={null}>
        <VehicleInsuranceList />
      </Suspense>
    </div>
  )
}
