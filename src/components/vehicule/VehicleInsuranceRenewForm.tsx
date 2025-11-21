// @ts-nocheck
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const renewSchema = z.object({
  startDate: z.coerce.date({ message: 'Date de début requise' }),
  endDate: z.coerce.date({ message: 'Date de fin requise' }),
  premiumAmount: z.coerce.number({ message: 'Montant requis' }).positive('Montant positif requis'),
  policyNumber: z.string().optional(),
  coverageType: z.string().optional(),
})

export type VehicleInsuranceRenewValues = z.infer<typeof renewSchema>

interface Props {
  defaultValues?: Partial<VehicleInsuranceRenewValues>
  onSubmit: (values: VehicleInsuranceRenewValues) => void
  isSubmitting?: boolean
}

export function VehicleInsuranceRenewForm({ defaultValues, onSubmit, isSubmitting }: Props) {
  const form = useForm<VehicleInsuranceRenewValues>({
    resolver: zodResolver(renewSchema),
    defaultValues: {
      startDate: defaultValues?.startDate ?? new Date(),
      endDate: defaultValues?.endDate ?? new Date(),
      premiumAmount: defaultValues?.premiumAmount ?? 0,
      policyNumber: defaultValues?.policyNumber,
      coverageType: defaultValues?.coverageType,
    },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <FormField control={form.control} name="startDate" render={({ field }) => (
            <FormItem>
              <FormLabel>Nouvelle date de début</FormLabel>
              <FormControl>
                <Input type="date" value={field.value ? formatDate(field.value) : ''} onChange={event => field.onChange(new Date(event.target.value))} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="endDate" render={({ field }) => (
            <FormItem>
              <FormLabel>Nouvelle date de fin</FormLabel>
              <FormControl>
                <Input type="date" value={field.value ? formatDate(field.value) : ''} onChange={event => field.onChange(new Date(event.target.value))} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="premiumAmount" render={({ field }) => (
          <FormItem>
            <FormLabel>Montant annuel</FormLabel>
            <FormControl>
              <Input type="number" value={field.value} onChange={event => field.onChange(Number(event.target.value))} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="policyNumber" render={({ field }) => (
          <FormItem>
            <FormLabel>Nouveau numéro de police (optionnel)</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="coverageType" render={({ field }) => (
          <FormItem>
            <FormLabel>Couverture (optionnel)</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting} className="min-w-[200px]">
            {isSubmitting ? 'Renouvellement...' : 'Renouveler'}
          </Button>
        </div>
      </form>
    </Form>
  )
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

