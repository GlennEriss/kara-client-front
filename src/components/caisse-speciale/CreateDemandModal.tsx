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
import { caisseSpecialeDemandFormSchema, caisseSpecialeDemandDefaultValues, type CaisseSpecialeDemandFormInput } from '@/schemas/caisse-speciale.schema'
import { useAuth } from '@/hooks/useAuth'
import { useCaisseSpecialeDemandMutations } from '@/hooks/caisse-speciale/useCaisseSpecialeDemands'
import { toast } from 'sonner'
import { Loader2, Calendar } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { useEntitySearch } from '@/hooks/useEntitySearch'
import { EntitySearchResult } from '@/types/types'

interface CreateDemandModalProps {
  isOpen: boolean
  onClose: () => void
  initialMemberId?: string
}

export default function CreateDemandModal({ 
  isOpen, 
  onClose, 
  initialMemberId
}: CreateDemandModalProps) {
  const { create } = useCaisseSpecialeDemandMutations()
  const { user } = useAuth()
  
  const [selectedEntity, setSelectedEntity] = useState<EntitySearchResult | null>(null)
  
  const {
    searchQuery,
    results,
    isLoading: isSearching,
    setSearchQuery,
    resetSearch
  } = useEntitySearch('INDIVIDUAL')

  const form = useForm<CaisseSpecialeDemandFormInput>({
    resolver: zodResolver(caisseSpecialeDemandFormSchema),
    defaultValues: {
      ...caisseSpecialeDemandDefaultValues,
      memberId: initialMemberId,
    },
  })

  // Gérer la sélection d'un membre
  const handleEntitySelect = (entity: EntitySearchResult) => {
    if (entity.type === 'member') {
      setSelectedEntity(entity)
      setSearchQuery('')
      form.setValue('memberId', entity.id)
    }
  }

  const onSubmit = async (data: CaisseSpecialeDemandFormInput) => {
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
    } catch {
      // L'erreur est gérée par le hook de mutation
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#224D62]">
            Nouvelle demande de contrat Caisse Spéciale
          </DialogTitle>
          <DialogDescription>
            Créez une nouvelle demande de contrat pour un membre
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Section 1: Sélection du membre */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <h3 className="font-semibold text-lg">Membre</h3>
                
                {/* Recherche de membre */}
                <div className="space-y-2">
                  <FormLabel>
                    Rechercher un membre
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
                  name="memberId"
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
                    name="caisseType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type de caisse</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionnez un type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="STANDARD">Standard</SelectItem>
                            <SelectItem value="JOURNALIERE">Journalière</SelectItem>
                            <SelectItem value="LIBRE">Libre</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="monthlyAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Montant mensuel (FCFA)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Ex: 100000"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="monthsPlanned"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Durée prévue (mois)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Ex: 12"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
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
                          Pour quand souhaitez-vous que le contrat commence ?
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


            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={onClose}>
                Annuler
              </Button>
              <Button 
                type="submit" 
                disabled={create.isPending || !selectedEntity}
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

