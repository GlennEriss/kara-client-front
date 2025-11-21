import { Metadata } from 'next'
import { VehicleInsuranceDetailView } from '@/components/vehicule/VehicleInsuranceDetailView'

export const metadata: Metadata = {
  title: 'Détail assurance véhicule | KARA Admin',
}

interface Props {
  params: { id: string }
}

export default function VehiculeDetailPage({ params }: Props) {
  return (
    <div className="p-6">
      <VehicleInsuranceDetailView insuranceId={params.id} />
    </div>
  )
}

