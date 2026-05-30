import { VehicleInsuranceDetailView } from '@/components/vehicule/VehicleInsuranceDetailView'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Détail assurance véhicule | KARA Admin',
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function VehiculeDetailPage({ params }: Props) {
  const { id } = await params
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6">
      <VehicleInsuranceDetailView insuranceId={id} />
    </div>
  )
}
