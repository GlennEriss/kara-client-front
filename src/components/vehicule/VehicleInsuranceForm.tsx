'use client'

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useVehicleInsuranceForm } from '@/hooks/vehicule/useVehicleInsuranceForm'
import { VehicleInsurance } from '@/types/types'
import { VehicleInsuranceFormValues } from '@/schemas/vehicule.schema'
import { MemberWithSubscription } from '@/db/member.db'
import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { User, Car, Shield, Calendar, FileText, DollarSign } from 'lucide-react'

interface Props {
  members: MemberWithSubscription[]
  onSubmit: (values: VehicleInsuranceFormValues) => void
  initialInsurance?: VehicleInsurance | null
  isSubmitting?: boolean
  mode?: 'create' | 'edit'
  isLoadingMembers?: boolean
}

export function VehicleInsuranceForm({ members, onSubmit, initialInsurance, isSubmitting, mode = 'create', isLoadingMembers = false }: Props) {
  const defaultValues = useMemo(() => {
    if (!initialInsurance) {
      return {
        memberId: '',
        memberFirstName: '',
        memberLastName: '',
        memberMatricule: '',
        memberContacts: [],
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
    form.setValue('memberContacts', member.contacts || [])
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

  const selectedMember = useMemo(() => {
    const memberId = form.watch('memberId')
    if (!memberId) return null
    return members.find(m => m.id === memberId)
  }, [form.watch('memberId'), members])

  return (
    <Form {...form}>
      <form id="vehicle-insurance-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Section Membre */}
        <Card className="border-2">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-100">
                <User className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Membre</CardTitle>
                <CardDescription>Sélectionnez le membre possédant le véhicule</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="memberId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold">Membre possédant un véhicule</FormLabel>
                  <Select 
                    disabled={mode === 'edit' || isLoadingMembers || memberOptions.length === 0} 
                    value={field.value} 
                    onValueChange={value => handleMemberChange(value)}
                  >
                    <FormControl>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder={
                          isLoadingMembers 
                            ? "Chargement des membres..." 
                            : memberOptions.length === 0 
                              ? "Aucun membre avec véhicule disponible" 
                              : "Sélectionner un membre"
                        } />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isLoadingMembers ? (
                        <SelectItem value="loading" disabled>Chargement...</SelectItem>
                      ) : memberOptions.length === 0 ? (
                        <SelectItem value="no-members" disabled>Aucun membre avec véhicule trouvé</SelectItem>
                      ) : (
                        memberOptions.map(option => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.label} • {option.matricule}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {selectedMember && (
                    <p className="text-xs text-gray-500 mt-1">
                      {selectedMember.firstName} {selectedMember.lastName} • Matricule: {selectedMember.matricule}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Section Véhicule */}
        <Card className="border-2">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-green-100">
                <Car className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Informations du véhicule</CardTitle>
                <CardDescription>Détails du véhicule à assurer</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="vehicleType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold">Type de véhicule</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="h-11">
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
                    <FormLabel className="text-sm font-semibold">Plaque d'immatriculation</FormLabel>
                    <Input {...field} placeholder="AA-123-BB" className="h-11 uppercase" />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <FormField control={form.control} name="vehicleBrand" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold">Marque</FormLabel>
                  <Input {...field} placeholder="Toyota" className="h-11" />
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="vehicleModel" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold">Modèle</FormLabel>
                  <Input {...field} placeholder="Corolla" className="h-11" />
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="vehicleYear" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold">Année</FormLabel>
                  <Input 
                    type="number" 
                    value={field.value || ''} 
                    onChange={event => field.onChange(event.target.value ? Number(event.target.value) : undefined)} 
                    placeholder="2020"
                    className="h-11"
                  />
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          </CardContent>
        </Card>

        {/* Section Assurance */}
        <Card className="border-2">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-purple-100">
                <Shield className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Détails de l'assurance</CardTitle>
                <CardDescription>Informations sur la police d'assurance</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <FormField control={form.control} name="insuranceCompany" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold">Compagnie d'assurance</FormLabel>
                  <Input {...field} placeholder="Nom de l'assurance" className="h-11" />
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="policyNumber" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold">Numéro de police</FormLabel>
                  <Input {...field} placeholder="POL-123456" className="h-11" />
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <FormField control={form.control} name="coverageType" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold">Type de couverture</FormLabel>
                  <Input {...field} value={field.value || ''} placeholder="Tous risques" className="h-11" />
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="insuranceAgent" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold">Agent / Contact</FormLabel>
                  <Input {...field} value={field.value || ''} placeholder="Nom de l'agent" className="h-11" />
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          </CardContent>
        </Card>

        {/* Section Financière */}
        <Card className="border-2">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-amber-100">
                <DollarSign className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Informations financières</CardTitle>
                <CardDescription>Montant et parrainage</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <FormField control={form.control} name="premiumAmount" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold">Montant annuel</FormLabel>
                  <Input 
                    type="number" 
                    value={field.value || 0} 
                    onChange={event => field.onChange(Number(event.target.value))} 
                    className="h-11"
                  />
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="currency" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold">Devise</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="FCFA">FCFA</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="sponsorName" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold">Parrain (optionnel)</FormLabel>
                  <Input {...field} value={field.value || ''} placeholder="Nom du parrain" className="h-11" />
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          </CardContent>
        </Card>

        {/* Section Dates */}
        <Card className="border-2">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-red-100">
                <Calendar className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Période de couverture</CardTitle>
                <CardDescription>Dates de début et de fin de l'assurance</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <FormField control={form.control} name="startDate" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold">Date de début</FormLabel>
                  <Input 
                    type="date" 
                    value={field.value ? formatDate(field.value) : ''} 
                    onChange={event => field.onChange(event.target.value ? new Date(event.target.value) : undefined)} 
                    className="h-11"
                  />
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="endDate" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold">Date de fin</FormLabel>
                  <Input 
                    type="date" 
                    value={field.value ? formatDate(field.value) : ''} 
                    onChange={event => field.onChange(event.target.value ? new Date(event.target.value) : undefined)} 
                    className="h-11"
                  />
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          </CardContent>
        </Card>

        {/* Section Notes */}
        <Card className="border-2">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gray-100">
                <FileText className="h-4 w-4 text-gray-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Notes</CardTitle>
                <CardDescription>Informations complémentaires</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold">Notes (optionnel)</FormLabel>
                <Textarea 
                  {...field} 
                  value={field.value || ''} 
                  placeholder="Informations complémentaires..." 
                  rows={4}
                  className="resize-none"
                />
                <FormMessage />
              </FormItem>
            )} />
          </CardContent>
        </Card>
      </form>
    </Form>
  )
}

function formatDate(date: Date) {
  const iso = date.toISOString()
  return iso.substring(0, 10)
}
