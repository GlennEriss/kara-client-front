import { Metadata } from 'next'
import { VehicleInsuranceList } from '@/components/vehicule/VehicleInsuranceList'

export const metadata: Metadata = {
  title: 'Module Véhicules | KARA Admin',
  description: 'Suivi des assurances des membres possédant un véhicule',
}

export default function VehiculesPage() {
  return (
    <div className="p-6 space-y-6">
      <VehicleInsuranceList />
    </div>
  )
}

