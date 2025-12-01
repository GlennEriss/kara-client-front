'use client'

import { useVehicleInsurance, useUpdateVehicleInsurance } from '@/hooks/vehicule/useVehicleInsurances'
import { VehicleInsuranceForm } from './VehicleInsuranceForm'
import { VehicleInsuranceFormValues } from '@/schemas/vehicule.schema'
import { Button } from '@/components/ui/button'
import routes from '@/constantes/routes'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

interface Props {
  insuranceId: string
}

export function VehicleInsuranceEditView({ insuranceId }: Props) {
  const { data, isLoading } = useVehicleInsurance(insuranceId)
  const updateMutation = useUpdateVehicleInsurance()

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!data) {
    return <p className="text-sm text-gray-500">Assurance introuvable.</p>
  }

  const handleSubmit = async (values: VehicleInsuranceFormValues) => {
    try {
      await updateMutation.mutateAsync({ id: insuranceId, updates: values })
      toast.success('Assurance mise à jour')
    } catch (error) {
      toast.error('Mise à jour impossible', { description: error instanceof Error ? error.message : undefined })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase text-gray-500">Édition</p>
          <h1 className="text-2xl font-bold text-gray-900">Modifier l'assurance</h1>
        </div>
        <Button variant="outline" asChild>
          <Link href={routes.admin.vehiculeDetails(insuranceId)}>Retour au détail</Link>
        </Button>
      </div>
      <VehicleInsuranceForm onSubmit={handleSubmit} initialInsurance={data} isSubmitting={updateMutation.isPending} mode="edit" />
    </div>
  )
}

