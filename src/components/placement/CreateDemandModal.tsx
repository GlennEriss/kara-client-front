'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { placementDemandFormSchema, placementDemandDefaultValues, type PlacementDemandFormInput } from '@/schemas/placement.schema'
import { useAuth } from '@/hooks/useAuth'
import { usePlacementDemandMutations } from '@/hooks/placement/usePlacementDemands'
import { toast } from 'sonner'
import { Loader2, Calendar } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { useEntitySearch } from '@/hooks/useEntitySearch'
import { EntitySearchResult } from '@/types/types'
import EmergencyContactMemberSelector from '@/components/shared/EmergencyContactMemberSelector'

interface CreateDemandModalProps {
  isOpen: boolean
  onClose: () => void
  initialBenefactorId?: string
}

export default function CreateDemandModal({ 
  isOpen, 
  onClose, 
  initialBenefactorId
}: CreateDemandModalProps) {
  const { create } = usePlacementDemandMutations()
  const { user } = useAuth()
  
  const [selectedEntity, setSelectedEntity] = useState<EntitySearchResult | null>(null)
  
  const {
    searchQuery,
    results,
    isLoading: isSearching,
    setSearchQuery,
    resetSearch
  } = useEntitySearch('INDIVIDUAL')

  const form = useForm<PlacementDemandFormInput>({
    resolver: zodResolver(placementDemandFormSchema),
    defaultValues: {
      ...placementDemandDefaultValues,
      benefactorId: initialBenefactorId,
    },
  })

  // Gérer la sélection d'un bienfaiteur (membre avec rôle Bienfaiteur)
  const handleEntitySelect = (entity: EntitySearchResult) => {
    if (entity.type === 'member') {
      setSelectedEntity(entity)
      setSearchQuery('')
      form.setValue('benefactorId', entity.id)
    }
  }

  const onSubmit = async (data: PlacementDemandFormInput) => {
    try {
      if (!user?.uid) {
        toast.error('Vous devez être connecté pour créer une demande')
        return
      }
      
      await create.mutateAsync(data)
      form.reset()
      setSelectedEntity(null)
      resetSearch()
      onClose()
    } catch (error) {
      // L'erreur est gérée par le hook de mutation
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#224D62]">
            Nouvelle demande de placement
          </DialogTitle>
          <DialogDescription>
            Créez une nouvelle demande de placement pour un bienfaiteur
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Section 1: Sélection du bienfaiteur */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <h3 className="font-semibold text-lg">Bienfaiteur</h3>
                
                {/* Recherche de bienfaiteur */}
                <div className="space-y-2">
                  <FormLabel>
                    Rechercher un bienfaiteur
                  </FormLabel>
                  <div className="relative">
                    <Input
                      placeholder="Nom, prénom ou matricule..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {isSearching && (
                      <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                    )}
                  </div>
                  
                  {searchQuery && results.length > 0 && (
                    <div className="mt-2 border rounded-lg max-h-48 overflow-y-auto">
                      {results
                        .filter((entity) => entity.type === 'member')
                        .map((entity) => (
                        <div
                          key={entity.id}
                          onClick={() => handleEntitySelect(entity)}
                          className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 flex items-center gap-3"
                        >
                          <div className="flex-1">
                            <div className="font-medium">{entity.displayName}</div>
                            {entity.additionalInfo && (
                              <div className="text-sm text-gray-500">{entity.additionalInfo}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedEntity && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="font-medium text-green-900">
                        {selectedEntity.displayName} sélectionné
                      </div>
                    </div>
                  )}
                </div>

                <FormField
                  control={form.control}
                  name="benefactorId"
                  render={({ field }) => (
                    <FormItem className="hidden">
                      <FormControl>
                        <Input {...field} type="hidden" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Section 2: Informations de la demande */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <h3 className="font-semibold text-lg">Informations de la demande</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Montant du placement (FCFA)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Ex: 1000000"
                            min="1000"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormDescription>
                          Minimum: 1 000 FCFA
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="rate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Taux de commission (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Ex: 5"
                            min="0"
                            max="100"
                            step="0.1"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormDescription>
                          Entre 0% et 100%
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="periodMonths"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Durée prévue (mois)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Ex: 3"
                            min="1"
                            max="7"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormDescription>
                          Entre 1 et 7 mois
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="payoutMode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mode de paiement</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionnez un mode" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="MonthlyCommission_CapitalEnd">
                              Commission mensuelle + Capital en fin
                            </SelectItem>
                            <SelectItem value="CapitalPlusCommission_End">
                              Capital + Commission en fin
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="desiredDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date souhaitée</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              type="date"
                              className="pl-10"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormDescription>
                          Pour quand souhaitez-vous que le placement commence ?
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="cause"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cause / Motif (optionnel)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Décrivez la raison de la demande..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Section 3: Contact d'urgence (optionnel) */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <h3 className="font-semibold text-lg">Contact d'urgence (optionnel)</h3>
                
                <EmergencyContactMemberSelector
                  memberId={form.watch('urgentContact')?.memberId}
                  lastName={form.watch('urgentContact')?.name?.split(' ')[0]}
                  firstName={form.watch('urgentContact')?.firstName}
                  phone1={form.watch('urgentContact')?.phone}
                  phone2={form.watch('urgentContact')?.phone2}
                  relationship={form.watch('urgentContact')?.relationship}
                  typeId={form.watch('urgentContact')?.typeId}
                  idNumber={form.watch('urgentContact')?.idNumber}
                  documentPhotoUrl={form.watch('urgentContact')?.documentPhotoUrl}
                  onUpdate={(field, value) => {
                    const current = form.getValues('urgentContact') || {} as any
                    // S'assurer que name et phone sont toujours présents (requis par le schéma)
                    const baseContact = {
                      name: (current as any)?.name || '',
                      phone: (current as any)?.phone || '',
                      ...current,
                    }
                    
                    if (field === 'memberId') {
                      form.setValue('urgentContact', { ...baseContact, memberId: value }, { shouldValidate: false })
                    } else if (field === 'lastName') {
                      form.setValue('urgentContact', { ...baseContact, name: value }, { shouldValidate: false })
                    } else if (field === 'firstName') {
                      form.setValue('urgentContact', { ...baseContact, firstName: value }, { shouldValidate: false })
                    } else if (field === 'phone1') {
                      form.setValue('urgentContact', { ...baseContact, phone: value }, { shouldValidate: false })
                    } else if (field === 'phone2') {
                      form.setValue('urgentContact', { ...baseContact, phone2: value }, { shouldValidate: false })
                    } else if (field === 'relationship') {
                      form.setValue('urgentContact', { ...baseContact, relationship: value }, { shouldValidate: false })
                    } else if (field === 'typeId') {
                      form.setValue('urgentContact', { ...baseContact, typeId: value }, { shouldValidate: false })
                    } else if (field === 'idNumber') {
                      form.setValue('urgentContact', { ...baseContact, idNumber: value }, { shouldValidate: false })
                    } else if (field === 'documentPhotoUrl') {
                      form.setValue('urgentContact', { ...baseContact, documentPhotoUrl: value }, { shouldValidate: false })
                    }
                  }}
                  excludeMemberIds={form.watch('benefactorId') ? [form.watch('benefactorId')] : []}
                />
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={onClose}>
                Annuler
              </Button>
              <Button 
                type="submit" 
                disabled={create.isPending || !selectedEntity || !form.watch('benefactorId')}
                className="bg-[#234D65] hover:bg-[#2c5a73]"
              >
                {create.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Création...
                  </>
                ) : (
                  'Créer la demande'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

