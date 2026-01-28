'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { caisseImprevueDemandFormSchema, caisseImprevueDemandDefaultValues, type CaisseImprevueDemandFormInput } from '@/schemas/caisse-imprevue.schema'
import { useAuth } from '@/hooks/useAuth'
import { useCaisseImprevueDemandMutations } from '@/hooks/caisse-imprevue/useCaisseImprevueDemands'
import { toast } from 'sonner'
import { Loader2, ChevronLeft, ChevronRight, CheckCircle, CheckCircle2, AlertCircle, Package, Wallet, Calendar, Clock, Phone } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { useEntitySearch } from '@/hooks/useEntitySearch'
import { EntitySearchResult } from '@/types/types'
import { FormCaisseImprevueProvider } from '@/providers/FormCaisseImprevueProvider'
import { cn } from '@/lib/utils'
import { useActiveSubscriptionsCI } from '@/hooks/caisse-imprevue/useActiveSubscriptionsCI'
import { SubscriptionCI } from '@/types/types'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import EmergencyContactMemberSelector from '@/components/shared/EmergencyContactMemberSelector'
interface CreateDemandModalProps {
  isOpen: boolean
  onClose: () => void
  initialMemberId?: string
}

// Composant pour la sélection du forfait
function ForfaitSelection({ form }: { form: ReturnType<typeof useForm<CaisseImprevueDemandFormInput>> }) {
  const { data: activeSubscriptions, isLoading, isError, error } = useActiveSubscriptionsCI()
  const selectedSubscriptionId = form.watch('subscriptionCIID')

  const handleSelectSubscription = (subscription: SubscriptionCI) => {
    form.setValue('subscriptionCIID', subscription.id)
    form.setValue('subscriptionCICode', subscription.code)
    form.setValue('subscriptionCILabel', subscription.label || '')
    form.setValue('subscriptionCIAmountPerMonth', subscription.amountPerMonth)
    form.setValue('subscriptionCINominal', subscription.nominal)
    form.setValue('subscriptionCIDuration', subscription.durationInMonths)
    form.setValue('subscriptionCISupportMin', subscription.supportMin)
    form.setValue('subscriptionCISupportMax', subscription.supportMax)
    toast.success(`Forfait sélectionné : ${subscription.code}`)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-[#224D62]" />
        <span className="ml-2 text-muted-foreground">Chargement des forfaits...</span>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center gap-2 text-red-700">
          <AlertCircle className="h-4 w-4" />
          <p className="text-sm">
            Erreur lors du chargement des forfaits. {error?.message || String(error)}
          </p>
        </div>
      </div>
    )
  }

  if (!activeSubscriptions || activeSubscriptions.length === 0) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-center gap-2 text-yellow-700">
          <Package className="h-4 w-4" />
          <p className="text-sm">Aucun forfait actif disponible pour le moment.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
        {activeSubscriptions.map((subscription) => (
          <Card
            key={subscription.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedSubscriptionId === subscription.id
                ? 'border-[#224D62] bg-[#224D62]/5 border-2'
                : ''
            }`}
            onClick={() => handleSelectSubscription(subscription)}
          >
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-[#224D62]">
                      {subscription.code}
                    </Badge>
                    {subscription.label && (
                      <p className="font-medium text-sm">{subscription.label}</p>
                    )}
                  </div>
                  {selectedSubscriptionId === subscription.id && (
                    <CheckCircle2 className="w-5 h-5 text-[#224D62]" />
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>
                    <p className="font-medium text-foreground">
                      {subscription.amountPerMonth.toLocaleString()} FCFA/mois
                    </p>
                    <p>Montant mensuel</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {subscription.nominal.toLocaleString()} FCFA
                    </p>
                    <p>Nominal total</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {subscription.durationInMonths} mois
                    </p>
                    <p>Durée</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {subscription.supportMin.toLocaleString()} - {subscription.supportMax.toLocaleString()} FCFA
                    </p>
                    <p>Appui</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {form.formState.errors.subscriptionCIID && (
        <p className="text-sm text-red-500">{form.formState.errors.subscriptionCIID.message}</p>
      )}
    </div>
  )
}

// Composant pour la sélection de la fréquence de paiement
function PaymentFrequencySelection({ form }: { form: ReturnType<typeof useForm<CaisseImprevueDemandFormInput>> }) {
  const paymentFrequency = form.watch('paymentFrequency')

  return (
    <div className="space-y-3">
      <RadioGroup
        value={paymentFrequency}
        onValueChange={(value) => form.setValue('paymentFrequency', value as 'DAILY' | 'MONTHLY')}
        className="flex flex-col space-y-3"
      >
        <div className="flex items-start space-x-3 space-y-0">
          <RadioGroupItem value="MONTHLY" id="monthly" />
          <div className="space-y-1 leading-none">
            <Label htmlFor="monthly" className="font-medium cursor-pointer">
              Mensuel
            </Label>
            <p className="text-sm text-muted-foreground">
              Le remboursement sera effectué une fois par mois
            </p>
          </div>
        </div>
        <div className="flex items-start space-x-3 space-y-0">
          <RadioGroupItem value="DAILY" id="daily" />
          <div className="space-y-1 leading-none">
            <Label htmlFor="daily" className="font-medium cursor-pointer">
              Quotidien
            </Label>
            <p className="text-sm text-muted-foreground">
              Le remboursement sera effectué au fil des jours
            </p>
          </div>
        </div>
      </RadioGroup>
      {form.formState.errors.paymentFrequency && (
        <p className="text-sm text-red-500">{form.formState.errors.paymentFrequency.message}</p>
      )}
    </div>
  )
}

// Composant pour la sélection du contact d'urgence
function EmergencyContactSelection({ form, memberId }: { form: ReturnType<typeof useForm<CaisseImprevueDemandFormInput>>, memberId?: string }) {
  const emergencyContact = form.watch('emergencyContact')

  // Effet pour déboguer les changements
  useEffect(() => {
    console.log('👀 Contact d\'urgence dans le formulaire:', emergencyContact)
  }, [emergencyContact])

  const handleUpdateField = useCallback((field: string, value: any) => {
    const currentEmergencyContact = form.getValues('emergencyContact') || {}
    const updatedEmergencyContact = {
      ...currentEmergencyContact,
      [field]: value
    }
    console.log('🔄 Mise à jour du champ:', field, 'avec la valeur:', value)
    console.log('📝 Contact d\'urgence avant mise à jour:', currentEmergencyContact)
    console.log('📝 Contact d\'urgence après mise à jour:', updatedEmergencyContact)
    
    form.setValue('emergencyContact', updatedEmergencyContact, {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true
    })
    // Déclencher la validation pour s'assurer que le formulaire se met à jour
    form.trigger('emergencyContact')
  }, [form])

  return (
    <div className="space-y-4">
      <EmergencyContactMemberSelector
        memberId={emergencyContact?.memberId}
        lastName={emergencyContact?.lastName || ''}
        firstName={emergencyContact?.firstName || ''}
        phone1={emergencyContact?.phone1 || ''}
        phone2={emergencyContact?.phone2 || ''}
        relationship={emergencyContact?.relationship || ''}
        idNumber={emergencyContact?.idNumber || ''}
        typeId={emergencyContact?.typeId || ''}
        documentPhotoUrl={emergencyContact?.documentPhotoUrl || ''}
        onUpdate={handleUpdateField}
        excludeMemberIds={memberId ? [memberId] : []}
      />

      {/* Récapitulatif visuel si le formulaire est rempli */}
      {emergencyContact?.lastName && 
       emergencyContact?.phone1 && 
       emergencyContact?.relationship && 
       emergencyContact?.typeId && 
       emergencyContact?.idNumber && 
       emergencyContact?.documentPhotoUrl && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle2 className="w-5 h-5" />
            <p className="font-medium">
              Contact d&apos;urgence confirmé : {emergencyContact.lastName}
              {emergencyContact.firstName && ` ${emergencyContact.firstName}`}
            </p>
          </div>
          <p className="text-sm text-green-600 mt-1">
            Téléphone : {emergencyContact.phone1}
            {emergencyContact.phone2 && ` / ${emergencyContact.phone2}`}
          </p>
          <p className="text-sm text-green-600">
            Lien : {emergencyContact.relationship}
          </p>
          <p className="text-sm text-green-600">
            Document : {emergencyContact.typeId} - {emergencyContact.idNumber}
          </p>
          <p className="text-sm text-green-600 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Photo du document uploadée
          </p>
        </div>
      )}
    </div>
  )
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
      const cause = form.watch('cause')
      return !!form.watch('memberId') && 
             !!cause && 
             cause.length >= 10 && 
             cause.length <= 500
    }
    if (currentStep === 2) {
      return !!form.watch('subscriptionCIID') && !!form.watch('paymentFrequency') && !!form.watch('desiredDate')
    }
    // Step 3 : vérifier que le contact d'urgence est rempli
    const emergencyContact = form.watch('emergencyContact')
    return !!(
      emergencyContact?.lastName &&
      emergencyContact?.phone1 &&
      emergencyContact?.relationship &&
      emergencyContact?.typeId &&
      emergencyContact?.idNumber &&
      emergencyContact?.documentPhotoUrl
    )
  }

  const handleNext = (e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()
    
    if (currentStep < 3) {
      if (canGoNext()) {
        setCurrentStep(currentStep + 1)
      } else {
        // Déclencher la validation pour afficher les erreurs
        form.trigger()
      }
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
    { id: 3, title: 'Contact', description: 'Contact d\'urgence' },
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
          <form 
            onSubmit={(e) => {
              e.preventDefault()
              if (currentStep === 3) {
                form.handleSubmit(onSubmit)(e)
              }
            }} 
            className="space-y-6"
          >
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

                  {/* Champ motif de la demande */}
                  <div className="space-y-2">
                    <label htmlFor="cause" className="text-sm font-medium">
                      Motif de la demande <span className="text-red-500">*</span>
                    </label>
                    <Textarea
                      id="cause"
                      placeholder="Décrivez le motif de la demande de contrat Caisse Imprévue (minimum 10 caractères, maximum 500 caractères)..."
                      {...form.register('cause')}
                      className="min-h-24 resize-none"
                      maxLength={500}
                    />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      {form.watch('cause') && (
                        <span className={form.watch('cause')?.length < 10 ? 'text-red-500' : 'text-green-600'}>
                          {form.watch('cause')?.length || 0} / 500 caractères
                          {form.watch('cause')?.length < 10 && ' (minimum 10 caractères requis)'}
                        </span>
                      )}
                      {!form.watch('cause') && (
                        <span>Minimum 10 caractères requis</span>
                      )}
                    </div>
                    {form.formState.errors.cause && (
                      <p className="text-sm text-red-500">{form.formState.errors.cause.message}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Étape 2: Forfait */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-[#224D62]/10">
                    <Wallet className="w-6 h-6 text-[#224D62]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[#224D62]">Forfait et remboursement</h3>
                    <p className="text-sm text-muted-foreground">Sélectionnez le forfait et le type de remboursement</p>
                  </div>
                </div>

                {/* Sélection du forfait */}
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <h3 className="font-semibold text-lg">Choix du forfait</h3>
                    <ForfaitSelection form={form} />
                  </CardContent>
                </Card>

                {/* Fréquence de paiement */}
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <h3 className="font-semibold text-lg">Fréquence de remboursement</h3>
                    <PaymentFrequencySelection form={form} />
                  </CardContent>
                </Card>

                {/* Date souhaitée */}
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-[#224D62]" />
                      Date souhaitée
                    </h3>
                    <div className="space-y-2">
                      <Label htmlFor="desiredDate">Date souhaitée pour le début du contrat *</Label>
                      <input
                        id="desiredDate"
                        type="date"
                        {...form.register('desiredDate')}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                      {form.formState.errors.desiredDate && (
                        <p className="text-sm text-red-500">{form.formState.errors.desiredDate.message}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Étape 3: Contact d'urgence */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-[#224D62]/10">
                    <Phone className="w-6 h-6 text-[#224D62]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[#224D62]">Contact d'urgence</h3>
                    <p className="text-sm text-muted-foreground">Renseignez les informations du contact d'urgence</p>
                  </div>
                </div>

                <EmergencyContactSelection form={form} memberId={form.watch('memberId')} />
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
                  disabled={create.isPending || !canGoNext()}
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

