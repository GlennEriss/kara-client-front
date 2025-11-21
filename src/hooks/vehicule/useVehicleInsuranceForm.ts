'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { VehicleInsuranceFormValues, vehicleInsuranceFormSchema } from '@/schemas/vehicule.schema'

export function useVehicleInsuranceForm(defaultValues?: Partial<VehicleInsuranceFormValues>) {
  const resolver = zodResolver(vehicleInsuranceFormSchema) as NonNullable<
    Parameters<typeof useForm<VehicleInsuranceFormValues>>[0]
  >['resolver']

  const form = useForm<VehicleInsuranceFormValues>({
    resolver,
    defaultValues: {
      currency: 'FCFA',
      ...defaultValues,
    },
  })

  useEffect(() => {
    if (defaultValues) {
      form.reset({
        currency: 'FCFA',
        ...defaultValues,
      })
    }
  }, [defaultValues, form])

  return form
}

