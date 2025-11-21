import { Metadata } from 'next'
import { VehicleInsuranceEditView } from '@/components/vehicule/VehicleInsuranceEditView'

export const metadata: Metadata = {
  title: 'Modifier assurance véhicule | KARA Admin',
}

interface Props {
  params: { id: string }
}

export default function EditVehiculePage({ params }: Props) {
  return (
    <div className="p-6">
      <VehicleInsuranceEditView insuranceId={params.id} />
    </div>
  )
}

