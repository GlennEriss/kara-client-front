'use client'

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useVehicleInsuranceForm } from '@/hooks/vehicule/useVehicleInsuranceForm'
import { VehicleInsurance } from '@/types/types'
import { VehicleInsuranceFormValues } from '@/schemas/vehicule.schema'
import { MemberWithSubscription } from '@/db/member.db'
import { useMemo } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  members: MemberWithSubscription[]
  onSubmit: (values: VehicleInsuranceFormValues) => void
  initialInsurance?: VehicleInsurance | null
  isSubmitting?: boolean
  mode?: 'create' | 'edit'
}

export function VehicleInsuranceForm({ members, onSubmit, initialInsurance, isSubmitting, mode = 'create' }: Props) {
  const defaultValues = useMemo(() => {
    if (!initialInsurance) {
      return {
        memberId: '',
        memberFirstName: '',
        memberLastName: '',
        memberMatricule: '',
        vehicleType: 'car' as VehicleInsuranceFormValues['vehicleType'],
        vehicleBrand: '',
        vehicleModel: '',
        plateNumber: '',
        insuranceCompany: '',
        policyNumber: '',
        coverageType: '',
        premiumAmount: 0,
        currency: 'FCFA',
        startDate: new Date(),
        endDate: new Date(),
      } as Partial<VehicleInsuranceFormValues>
    }

    return {
      memberId: initialInsurance.memberId,
      memberFirstName: initialInsurance.memberFirstName,
      memberLastName: initialInsurance.memberLastName,
      memberMatricule: initialInsurance.memberMatricule,
      vehicleType: initialInsurance.vehicleType,
      vehicleBrand: initialInsurance.vehicleBrand,
      vehicleModel: initialInsurance.vehicleModel,
      vehicleYear: initialInsurance.vehicleYear,
      plateNumber: initialInsurance.plateNumber,
      insuranceCompany: initialInsurance.insuranceCompany,
      insuranceAgent: initialInsurance.insuranceAgent,
      policyNumber: initialInsurance.policyNumber,
      coverageType: initialInsurance.coverageType,
      premiumAmount: initialInsurance.premiumAmount,
      currency: initialInsurance.currency,
      startDate: initialInsurance.startDate,
      endDate: initialInsurance.endDate,
      sponsorMemberId: initialInsurance.sponsorMemberId,
      sponsorName: initialInsurance.sponsorName,
      notes: initialInsurance.notes,
    } as Partial<VehicleInsuranceFormValues>
  }, [initialInsurance])

  const form = useVehicleInsuranceForm(defaultValues)

  const handleMemberChange = (memberId: string) => {
    const member = members.find(m => m.id === memberId)
    if (!member) return
    form.setValue('memberId', memberId, { shouldDirty: true, shouldValidate: true })
    form.setValue('memberFirstName', member.firstName || '')
    form.setValue('memberLastName', member.lastName || '')
    form.setValue('memberMatricule', member.matricule || '')
  }

  const handleSubmit = (values: VehicleInsuranceFormValues) => {
    onSubmit(values)
  }

  const memberOptions = members.map(member => ({
    id: member.id,
    label: `${member.firstName} ${member.lastName}`,
    matricule: member.matricule,
  }))

  if (initialInsurance && !memberOptions.find(option => option.id === initialInsurance.memberId)) {
    memberOptions.unshift({
      id: initialInsurance.memberId,
      label: `${initialInsurance.memberFirstName} ${initialInsurance.memberLastName}`,
      matricule: initialInsurance.memberMatricule || '',
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="memberId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Membre</FormLabel>
                <Select disabled={mode === 'edit'} value={field.value} onValueChange={value => handleMemberChange(value)}>
                  <FormControl>
                    <SelectTrigger className="capitalize">
                      <SelectValue placeholder="Sélectionner un membre" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {memberOptions.map(option => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label} • {option.matricule}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="memberFirstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prénom</FormLabel>
                  <Input {...field} disabled />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="memberLastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom</FormLabel>
                  <Input {...field} disabled />
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="vehicleType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type de véhicule</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="car">Voiture</SelectItem>
                    <SelectItem value="motorcycle">Moto</SelectItem>
                    <SelectItem value="truck">Camion</SelectItem>
                    <SelectItem value="bus">Bus</SelectItem>
                    <SelectItem value="other">Autre</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="plateNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Plaque</FormLabel>
                <Input {...field} placeholder="AA-123-BB" className="uppercase" />
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <FormField control={form.control} name="vehicleBrand" render={({ field }) => (
            <FormItem>
              <FormLabel>Marque</FormLabel>
              <Input {...field} placeholder="Toyota" />
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="vehicleModel" render={({ field }) => (
            <FormItem>
              <FormLabel>Modèle</FormLabel>
              <Input {...field} placeholder="Corolla" />
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="vehicleYear" render={({ field }) => (
            <FormItem>
              <FormLabel>Année</FormLabel>
              <Input type="number" value={field.value || ''} onChange={event => field.onChange(event.target.value ? Number(event.target.value) : undefined)} />
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <FormField control={form.control} name="insuranceCompany" render={({ field }) => (
            <FormItem>
              <FormLabel>Compagnie d’assurance</FormLabel>
              <Input {...field} placeholder="Nom de l’assurance" />
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="policyNumber" render={({ field }) => (
            <FormItem>
              <FormLabel>Numéro de police</FormLabel>
              <Input {...field} placeholder="POL-123456" />
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <FormField control={form.control} name="coverageType" render={({ field }) => (
            <FormItem>
              <FormLabel>Type de couverture</FormLabel>
              <Input {...field} placeholder="Tous risques" />
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="insuranceAgent" render={({ field }) => (
            <FormItem>
              <FormLabel>Agent / contact</FormLabel>
              <Input {...field} placeholder="Nom de l’agent" />
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <FormField control={form.control} name="premiumAmount" render={({ field }) => (
            <FormItem>
              <FormLabel>Montant annuel</FormLabel>
              <Input type="number" value={field.value || 0} onChange={event => field.onChange(Number(event.target.value))} />
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="currency" render={({ field }) => (
            <FormItem>
              <FormLabel>Devise</FormLabel>
              <Input {...field} />
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="sponsorName" render={({ field }) => (
            <FormItem>
              <FormLabel>Parrain (optionnel)</FormLabel>
              <Input {...field} placeholder="Nom du parrain" />
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <FormField control={form.control} name="startDate" render={({ field }) => (
            <FormItem>
              <FormLabel>Début</FormLabel>
              <Input type="date" value={field.value ? formatDate(field.value) : ''} onChange={event => field.onChange(event.target.value ? new Date(event.target.value) : undefined)} />
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="endDate" render={({ field }) => (
            <FormItem>
              <FormLabel>Fin</FormLabel>
              <Input type="date" value={field.value ? formatDate(field.value) : ''} onChange={event => field.onChange(event.target.value ? new Date(event.target.value) : undefined)} />
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem>
            <FormLabel>Notes</FormLabel>
            <Textarea {...field} placeholder="Informations complémentaires" rows={3} />
            <FormMessage />
          </FormItem>
        )} />

        <div className="flex justify-end gap-3">
          <Button type="submit" className={cn('min-w-[200px]', isSubmitting && 'opacity-75')} disabled={isSubmitting}>
            {isSubmitting ? 'Enregistrement...' : mode === 'create' ? 'Ajouter' : 'Mettre à jour'}
          </Button>
        </div>
      </form>
    </Form>
  )
}

function formatDate(date: Date) {
  const iso = date.toISOString()
  return iso.substring(0, 10)
}

