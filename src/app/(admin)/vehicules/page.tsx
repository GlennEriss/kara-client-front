import { VehicleInsuranceList } from '@/components/vehicule/VehicleInsuranceList'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Module Véhicules | KARA Admin',
  description: 'Suivi des assurances des membres possédant un véhicule',
}

export default function VehiculesPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 md:p-6">
      <VehicleInsuranceList />
    </div>
  )
}
