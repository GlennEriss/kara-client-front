'use client'

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useVehicleInsuranceForm } from '@/hooks/vehicule/useVehicleInsuranceForm'
import { VehicleInsurance, User as UserType } from '@/types/types'
import { VehicleInsuranceFormValues } from '@/schemas/vehicule.schema'
import { useMemo, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { User, Car, Shield, Calendar, FileText, DollarSign, Users } from 'lucide-react'
import MemberSearchInput from './MemberSearchInput'

const DEFAULT_PHONE_PREFIX = '+241 '
const PHONE_DIGITS_LIMIT = 8

const formatPhoneValue = (value: string, allowEmpty = false) => {
  const digitsOnly = value.replace(/[^0-9]/g, '')
  let digits = digitsOnly
  if (digits.startsWith('241')) {
    digits = digits.slice(3)
  }
  const normalized = digits.slice(0, PHONE_DIGITS_LIMIT)
  if (!normalized) {
    return allowEmpty ? '' : DEFAULT_PHONE_PREFIX
  }
  const grouped = normalized.replace(/(\d{2})(?=\d)/g, '$1 ')
  return `${DEFAULT_PHONE_PREFIX}${grouped}`.trimEnd()
}

interface Props {
  onSubmit: (values: VehicleInsuranceFormValues) => void
  initialInsurance?: VehicleInsurance | null
  isSubmitting?: boolean
  mode?: 'create' | 'edit'
  isLoadingMembers?: boolean
}

export function VehicleInsuranceForm({ onSubmit, initialInsurance, isSubmitting, mode = 'create', isLoadingMembers = false }: Props) {
  const defaultValues = useMemo(() => {
    if (!initialInsurance) {
      return {
        holderType: 'member' as VehicleInsuranceFormValues['holderType'],
        city: '',
        memberId: '',
        memberFirstName: '',
        memberLastName: '',
        memberMatricule: '',
        memberContacts: [],
        nonMemberFirstName: '',
        nonMemberLastName: '',
        nonMemberPhone1: DEFAULT_PHONE_PREFIX,
        nonMemberPhone2: null,
        vehicleType: 'car' as VehicleInsuranceFormValues['vehicleType'],
        energySource: 'essence' as VehicleInsuranceFormValues['energySource'],
        fiscalPower: '',
        vehicleBrand: '',
        vehicleModel: '',
        plateNumber: '',
        warrantyMonths: 12,
        insuranceCompany: '',
        policyNumber: '',
        premiumAmount: 0,
        currency: 'FCFA',
        startDate: new Date(),
        endDate: new Date(),
        notes: '',
        sponsorMemberId: '',
        sponsorName: '',
        sponsorMatricule: null,
        sponsorContacts: [],
      } as Partial<VehicleInsuranceFormValues>
    }

    // Déterminer le type de titulaire depuis les données existantes
    const holderType = initialInsurance.holderType || 
      (initialInsurance.memberId ? 'member' : 'non-member')

    return {
      holderType,
      city: initialInsurance.city || '',
      memberId: initialInsurance.memberId || '',
      memberFirstName: initialInsurance.memberFirstName || '',
      memberLastName: initialInsurance.memberLastName || '',
      memberMatricule: initialInsurance.memberMatricule || '',
      memberContacts: initialInsurance.memberContacts || [],
      nonMemberFirstName: initialInsurance.nonMemberFirstName || '',
      nonMemberLastName: initialInsurance.nonMemberLastName || '',
      nonMemberPhone1: initialInsurance.nonMemberPhone1 || '',
      nonMemberPhone2: initialInsurance.nonMemberPhone2 || null,
      vehicleType: initialInsurance.vehicleType,
      vehicleBrand: initialInsurance.vehicleBrand,
      vehicleModel: initialInsurance.vehicleModel,
      vehicleYear: initialInsurance.vehicleYear,
      plateNumber: initialInsurance.plateNumber,
      energySource: initialInsurance.energySource || 'essence',
      fiscalPower: initialInsurance.fiscalPower || '',
      insuranceCompany: initialInsurance.insuranceCompany,
      policyNumber: initialInsurance.policyNumber,
      warrantyMonths: initialInsurance.warrantyMonths ?? 12,
      premiumAmount: initialInsurance.premiumAmount,
      currency: initialInsurance.currency,
      startDate: initialInsurance.startDate,
      endDate: initialInsurance.endDate,
      sponsorMemberId: initialInsurance.sponsorMemberId || '',
      sponsorName: initialInsurance.sponsorName || '',
      sponsorMatricule: initialInsurance.sponsorMatricule,
      sponsorContacts: initialInsurance.sponsorContacts || [],
      notes: initialInsurance.notes,
    } as Partial<VehicleInsuranceFormValues>
  }, [initialInsurance])

  const form = useVehicleInsuranceForm(defaultValues)

  const holderType = form.watch('holderType')
  const initialMemberDisplayName =
    initialInsurance && initialInsurance.memberFirstName
      ? `${initialInsurance.memberFirstName || ''} ${initialInsurance.memberLastName || ''}`.trim()
      : undefined
  const initialSponsorDisplayName = initialInsurance?.sponsorName || undefined
  useEffect(() => {
    if (holderType === 'non-member') {
      const phone1 = form.getValues('nonMemberPhone1')
      if (!phone1) {
        form.setValue('nonMemberPhone1', DEFAULT_PHONE_PREFIX, { shouldDirty: false, shouldValidate: true })
      }
    }
  }, [holderType, form])

  const handleMemberChange = (memberId: string, member: UserType | null) => {
    if (!member) {
      form.setValue('memberId', '', { shouldDirty: true, shouldValidate: true })
      form.setValue('memberFirstName', '', { shouldDirty: true, shouldValidate: true })
      form.setValue('memberLastName', '', { shouldDirty: true, shouldValidate: true })
      form.setValue('memberMatricule', '', { shouldDirty: true, shouldValidate: true })
      form.setValue('memberContacts', [], { shouldDirty: true, shouldValidate: true })
      return
    }
    form.setValue('memberId', memberId, { shouldDirty: true, shouldValidate: true })
    form.setValue('memberFirstName', member.firstName || '', { shouldDirty: true, shouldValidate: true })
    form.setValue('memberLastName', member.lastName || '', { shouldDirty: true, shouldValidate: true })
    form.setValue('memberMatricule', member.matricule || '', { shouldDirty: true, shouldValidate: true })
    form.setValue('memberContacts', member.contacts || [], { shouldDirty: true, shouldValidate: true })
  }

  const handleSponsorChange = (memberId: string, member: UserType | null) => {
    if (!memberId || !member) {
      form.setValue('sponsorMemberId', '', { shouldDirty: true, shouldValidate: true })
      form.setValue('sponsorName', '', { shouldDirty: true, shouldValidate: true })
      form.setValue('sponsorMatricule', null, { shouldDirty: true, shouldValidate: true })
      form.setValue('sponsorContacts', [], { shouldDirty: true, shouldValidate: true })
      return
    }
    form.setValue('sponsorMemberId', memberId, { shouldDirty: true, shouldValidate: true })
    form.setValue('sponsorName', `${member.firstName || ''} ${member.lastName || ''}`.trim(), { shouldDirty: true, shouldValidate: true })
    form.setValue('sponsorMatricule', member.matricule || null, { shouldDirty: true, shouldValidate: true })
    form.setValue('sponsorContacts', member.contacts || [], { shouldDirty: true, shouldValidate: true })
  }

  const handleHolderTypeChange = (value: 'member' | 'non-member') => {
    form.setValue('holderType', value, { shouldDirty: true, shouldValidate: true })
    // Réinitialiser les champs selon le type
    if (value === 'member') {
      form.setValue('nonMemberFirstName', '', { shouldDirty: true, shouldValidate: true })
      form.setValue('nonMemberLastName', '', { shouldDirty: true, shouldValidate: true })
      form.setValue('nonMemberPhone1', '', { shouldDirty: true, shouldValidate: true })
      form.setValue('nonMemberPhone2', null, { shouldDirty: true, shouldValidate: true })
    } else {
      form.setValue('memberId', '', { shouldDirty: true, shouldValidate: true })
      form.setValue('memberFirstName', '', { shouldDirty: true, shouldValidate: true })
      form.setValue('memberLastName', '', { shouldDirty: true, shouldValidate: true })
      form.setValue('memberMatricule', '', { shouldDirty: true, shouldValidate: true })
      form.setValue('memberContacts', [], { shouldDirty: true, shouldValidate: true })
      form.setValue('nonMemberPhone1', DEFAULT_PHONE_PREFIX, { shouldDirty: true, shouldValidate: true })
    }
  }

  const handlePhoneChange = (fieldName: 'nonMemberPhone1' | 'nonMemberPhone2', rawValue: string) => {
    const formatted = formatPhoneValue(rawValue, fieldName === 'nonMemberPhone2')
    form.setValue(fieldName, formatted, { shouldDirty: true, shouldValidate: true })
  }

  const handleSubmit = (values: VehicleInsuranceFormValues) => {
    onSubmit(values)
  }

  return (
    <Form {...form}>
      <form id="vehicle-insurance-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Section Titulaire */}
        <Card className="border-2">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-100">
                <Users className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Titulaire de l'assurance</CardTitle>
                <CardDescription>Choisissez si le titulaire est un membre KARA ou un non-membre</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Choix du type de titulaire */}
            <FormField
              control={form.control}
              name="holderType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold">Type de titulaire</FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={handleHolderTypeChange}
                      className="flex gap-6"
                      disabled={mode === 'edit'}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="member" id="holder-member" />
                        <label
                          htmlFor="holder-member"
                          className="flex items-center gap-2 text-sm font-medium leading-none cursor-pointer"
                        >
                          <User className="h-4 w-4 text-blue-600" />
                          Membre KARA
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="non-member" id="holder-non-member" />
                        <label
                          htmlFor="holder-non-member"
                          className="flex items-center gap-2 text-sm font-medium leading-none cursor-pointer"
                        >
                          <Users className="h-4 w-4 text-gray-600" />
                          Non-membre
                        </label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Champs pour membre */}
            {holderType === 'member' && (
              <FormField
                control={form.control}
                name="memberId"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <MemberSearchInput
                        value={field.value || ''}
                        onChange={handleMemberChange}
                        selectedMemberId={field.value}
                        error={form.formState.errors.memberId?.message}
                        disabled={mode === 'edit' || isLoadingMembers}
                        label="Rechercher un membre"
                        placeholder="Rechercher par nom, prénom ou matricule..."
                        initialDisplayName={initialMemberDisplayName}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold">Ville (Gabon)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value || ''}
                      placeholder="Libreville, Port-Gentil..."
                      className="h-11"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Champs pour non-membre */}
            {holderType === 'non-member' && (
              <div className="space-y-4 border-t pt-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="nonMemberFirstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold">
                          Prénom <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ''}
                            placeholder="Prénom"
                            className="h-11"
                            disabled={mode === 'edit'}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="nonMemberLastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold">
                          Nom <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ''}
                            placeholder="Nom"
                            className="h-11"
                            disabled={mode === 'edit'}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="nonMemberPhone1"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold">
                          Téléphone 1 <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            ref={field.ref}
                            name={field.name}
                            value={field.value || ''}
                            onBlur={field.onBlur}
                            onChange={event => handlePhoneChange('nonMemberPhone1', event.target.value)}
                            placeholder="+241 65 67 17 34"
                            className="h-11"
                            disabled={mode === 'edit'}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="nonMemberPhone2"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold">Téléphone 2 (optionnel)</FormLabel>
                        <FormControl>
                          <Input
                            ref={field.ref}
                            name={field.name}
                            value={field.value || ''}
                            onBlur={field.onBlur}
                            onChange={event => handlePhoneChange('nonMemberPhone2', event.target.value)}
                            placeholder="+241 74 XX XX XX"
                            className="h-11"
                            disabled={mode === 'edit'}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}
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
                        <SelectItem value="maison">Maison</SelectItem>
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
            <div className="grid md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="energySource"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold">Source d'énergie</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Energie" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="essence">Essence</SelectItem>
                        <SelectItem value="diesel">Diesel</SelectItem>
                        <SelectItem value="electrique">Électrique</SelectItem>
                        <SelectItem value="hybride">Hybride</SelectItem>
                        <SelectItem value="gaz">Gaz</SelectItem>
                        <SelectItem value="autre">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fiscalPower"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold">Puissance fiscale / administrative</FormLabel>
                    <Input {...field} placeholder="11 CV" className="h-11" />
                    <FormMessage />
                  </FormItem>
                )}
              />
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
            <FormField
              control={form.control}
              name="warrantyMonths"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold">Durée de garantie (mois)</FormLabel>
                  <Input
                    type="number"
                    value={field.value || 0}
                    onChange={event => field.onChange(Number(event.target.value))}
                    className="h-11"
                    min={1}
                    max={60}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
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
            </div>
            <FormField
              control={form.control}
              name="sponsorMemberId"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <MemberSearchInput
                      value={field.value || ''}
                      onChange={handleSponsorChange}
                      selectedMemberId={field.value || undefined}
                      error={form.formState.errors.sponsorMemberId?.message}
                      disabled={isLoadingMembers}
                      label="Parrain"
                      placeholder="Nom, prénom ou matricule du parrain"
                      initialDisplayName={initialSponsorDisplayName}
                      isRequired
                      helperText="Tapez # suivi du matricule ou le nom d'un membre pour le retrouver rapidement"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
