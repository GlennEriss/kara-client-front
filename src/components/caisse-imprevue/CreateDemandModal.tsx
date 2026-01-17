'use client'

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { caisseImprevueDemandFormSchema, caisseImprevueDemandDefaultValues, type CaisseImprevueDemandFormInput } from '@/schemas/caisse-imprevue.schema'
import { useAuth } from '@/hooks/useAuth'
import { useCaisseImprevueDemandMutations } from '@/hooks/caisse-imprevue/useCaisseImprevueDemands'
import { toast } from 'sonner'
import { Loader2, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { useEntitySearch } from '@/hooks/useEntitySearch'
import { EntitySearchResult } from '@/types/types'
import { FormCaisseImprevueProvider } from '@/providers/FormCaisseImprevueProvider'
import { cn } from '@/lib/utils'

interface CreateDemandModalProps {
  isOpen: boolean
  onClose: () => void
  initialMemberId?: string
}

function CreateDemandModalContent({ 
  isOpen, 
  onClose, 
  initialMemberId
}: CreateDemandModalProps) {
  const { create } = useCaisseImprevueDemandMutations()
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedEntity, setSelectedEntity] = useState<EntitySearchResult | null>(null)
  
  const {
    searchQuery,
    results,
    isLoading: isSearching,
    setSearchQuery,
    resetSearch
  } = useEntitySearch('INDIVIDUAL')

  const form = useForm<CaisseImprevueDemandFormInput>({
    resolver: zodResolver(caisseImprevueDemandFormSchema),
    defaultValues: {
      ...caisseImprevueDemandDefaultValues,
      memberId: initialMemberId,
    },
  })

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1)
      form.reset({
        ...caisseImprevueDemandDefaultValues,
        memberId: initialMemberId,
      })
      setSelectedEntity(null)
      resetSearch()
    }
  }, [isOpen, initialMemberId, form, resetSearch])

  const handleEntitySelect = async (entity: EntitySearchResult) => {
    if (entity.type === 'member') {
      setSelectedEntity(entity)
      setSearchQuery('')
      form.setValue('memberId', entity.id)
      
      // Récupérer les détails complets du membre
      try {
        const { getUserById } = await import('@/db/user.db')
        const member = await getUserById(entity.id)
        if (member) {
          form.setValue('memberFirstName', member.firstName || '')
          form.setValue('memberLastName', member.lastName || '')
          form.setValue('memberContacts', member.contacts || [])
          form.setValue('memberEmail', member.email || '')
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des détails du membre:', error)
        // Utiliser les valeurs par défaut si la récupération échoue
        form.setValue('memberFirstName', '')
        form.setValue('memberLastName', '')
        form.setValue('memberContacts', entity.contacts || [])
        form.setValue('memberEmail', '')
      }
    }
  }

  const canGoNext = () => {
    if (currentStep === 1) {
      return !!form.watch('memberId')
    }
    if (currentStep === 2) {
      return !!form.watch('subscriptionCIID') && !!form.watch('paymentFrequency') && !!form.watch('desiredDate')
    }
    return true // Step 3 est optionnel
  }

  const handleNext = () => {
    if (currentStep < 3 && canGoNext()) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const onSubmit = async (data: CaisseImprevueDemandFormInput) => {
    try {
      if (!user?.uid) {
        toast.error('Vous devez être connecté pour créer une demande')
        return
      }
      
      await create.mutateAsync(data)
      form.reset()
      setSelectedEntity(null)
      resetSearch()
      setCurrentStep(1)
      onClose()
    } catch {
      // L'erreur est gérée par le hook de mutation
    }
  }

  const steps = [
    { id: 1, title: 'Membre', description: 'Sélection du membre' },
    { id: 2, title: 'Forfait', description: 'Sélection du forfait et fréquence' },
    { id: 3, title: 'Contact', description: 'Contact d\'urgence (optionnel)' },
  ]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#224D62]">
            Nouvelle demande de contrat Caisse Imprévue
          </DialogTitle>
          <DialogDescription>
            Créez une nouvelle demande de contrat en 3 étapes
          </DialogDescription>
        </DialogHeader>

        {/* Indicateur d'étapes */}
        <div className="flex items-center justify-between mb-6">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center flex-1">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all",
                  currentStep === step.id
                    ? "bg-[#234D65] border-[#234D65] text-white"
                    : currentStep > step.id
                      ? "bg-green-500 border-green-500 text-white"
                      : "bg-gray-100 border-gray-300 text-gray-500"
                )}>
                  {currentStep > step.id ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <span className="font-semibold">{step.id}</span>
                  )}
                </div>
                <div className="mt-2 text-center">
                  <p className={cn(
                    "text-xs font-medium",
                    currentStep === step.id ? "text-[#234D65]" : "text-gray-500"
                  )}>
                    {step.title}
                  </p>
                  <p className="text-xs text-gray-400">{step.description}</p>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className={cn(
                  "flex-1 h-0.5 mx-2",
                  currentStep > step.id ? "bg-green-500" : "bg-gray-300"
                )} />
              )}
            </React.Fragment>
          ))}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Étape 1: Membre */}
            {currentStep === 1 && (
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <h3 className="font-semibold text-lg">Sélection du membre</h3>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Rechercher un membre</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Nom, prénom ou matricule..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg"
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
                </CardContent>
              </Card>
            )}

            {/* Étape 2: Forfait */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Cette étape nécessite la sélection d'un forfait et d'une fréquence de paiement.
                  Pour simplifier, utilisez les composants Step2 existants ou créez une version simplifiée.
                </p>
                {/* TODO: Intégrer Step2 ou créer une version simplifiée */}
              </div>
            )}

            {/* Étape 3: Contact d'urgence */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Cette étape permet de renseigner le contact d'urgence (optionnel).
                  Pour simplifier, utilisez les composants Step3 existants ou créez une version simplifiée.
                </p>
                {/* TODO: Intégrer Step3 ou créer une version simplifiée */}
              </div>
            )}

            <div className="flex justify-between gap-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={currentStep === 1 ? onClose : handlePrev}
                disabled={create.isPending}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                {currentStep === 1 ? 'Annuler' : 'Précédent'}
              </Button>
              
              {currentStep < 3 ? (
                <Button 
                  type="button" 
                  onClick={handleNext}
                  disabled={!canGoNext()}
                  className="bg-[#234D65] hover:bg-[#2c5a73]"
                >
                  Suivant
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button 
                  type="submit" 
                  disabled={create.isPending || !form.watch('memberId') || !form.watch('subscriptionCIID')}
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
              )}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default function CreateDemandModal(props: CreateDemandModalProps) {
  return (
    <FormCaisseImprevueProvider>
      <CreateDemandModalContent {...props} />
    </FormCaisseImprevueProvider>
  )
}

