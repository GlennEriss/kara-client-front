import { Metadata } from 'next'
import { VehicleInsuranceDetailView } from '@/components/vehicule/VehicleInsuranceDetailView'

export const metadata: Metadata = {
  title: 'Détail assurance véhicule | KARA Admin',
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function VehiculeDetailPage({ params }: Props) {
  const { id } = await params
  return (
    <div className="p-6">
      <VehicleInsuranceDetailView insuranceId={id} />
    </div>
  )
}

