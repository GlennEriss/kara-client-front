import { VehicleInsuranceEditView } from '@/components/vehicule/VehicleInsuranceEditView'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Modifier assurance véhicule | KARA Admin',
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditVehiculePage({ params }: Props) {
  const { id } = await params
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6">
      <VehicleInsuranceEditView insuranceId={id} />
    </div>
  )
}
