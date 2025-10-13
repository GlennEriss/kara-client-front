'use client'
import React, { useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { subscriptionCISchema, defaultSubscriptionCIValues, type SubscriptionCIFormData } from '@/schemas/caisse-imprevue.schema'
import { CAISSE_IMPREVUE_PLANS } from '@/types/types'
import { useSubscriptionCI } from './SubscriptionCIContext'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface CreateSubscriptionCIModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function CreateSubscriptionCIModal({ open, onOpenChange }: CreateSubscriptionCIModalProps) {
  const { dispatch } = useSubscriptionCI()
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const form = useForm<SubscriptionCIFormData>({
    resolver: zodResolver(subscriptionCISchema),
    defaultValues: defaultSubscriptionCIValues,
  })

  const selectedPlanCode = form.watch('code')
  const selectedPlan = selectedPlanCode ? CAISSE_IMPREVUE_PLANS[selectedPlanCode] : null

  // Mettre à jour automatiquement les montants quand le forfait change
  useEffect(() => {
    if (selectedPlan) {
      form.setValue('amountPerMonth', selectedPlan.monthlyAmount)
      form.setValue('nominal', selectedPlan.nominalTarget)
      form.setValue('supportMin', selectedPlan.supportMin)
      form.setValue('supportMax', selectedPlan.supportMax)
    }
  }, [selectedPlan, form])

  const onSubmit = async (data: SubscriptionCIFormData) => {
    setIsSubmitting(true)
    
    try {
      // TODO: Appeler le service pour créer la souscription dans Firestore
      // const newSubscription = await createSubscriptionCI(data)
      
      // Simulation
      const newSubscription = {
        ...data,
        id: `CI_${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'admin',
      }

      dispatch({ type: 'ADD_SUBSCRIPTION', payload: newSubscription as any })
      toast.success('Forfait créé avec succès')
      form.reset()
      onOpenChange(false)
    } catch (error) {
      console.error('Erreur lors de la création:', error)
      toast.error('Erreur lors de la création du forfait')
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA'
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#224D62]">
            Ajouter un nouveau forfait
          </DialogTitle>
          <DialogDescription>
            Créez une nouvelle souscription de Caisse Imprévue pour un membre
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Section 1: Sélection du membre */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <h3 className="font-semibold text-lg">Informations du membre</h3>
                
                <FormField
                  control={form.control}
                  name="memberId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ID du membre *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: 2663.MK.260925" {...field} />
                      </FormControl>
                      <FormDescription>
                        Identifiant unique du membre
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Section 2: Sélection du forfait */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <h3 className="font-semibold text-lg">Choix du forfait</h3>
                
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Forfait *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionnez un forfait" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.values(CAISSE_IMPREVUE_PLANS).map((plan) => (
                            <SelectItem key={plan.code} value={plan.code}>
                              <div className="flex items-center gap-2">
                                <span className="font-bold">Forfait {plan.code}</span>
                                <span className="text-muted-foreground">
                                  - {formatAmount(plan.monthlyAmount)}/mois
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Choisissez le forfait adapté aux besoins du membre
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Aperçu du forfait sélectionné */}
                {selectedPlan && (
                  <div className="p-4 bg-[#224D62]/5 border border-[#224D62]/20 rounded-lg space-y-2">
                    <p className="font-semibold text-[#224D62]">
                      Détails du forfait {selectedPlan.code}
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Mensuel</p>
                        <p className="font-semibold">{formatAmount(selectedPlan.monthlyAmount)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Nominal</p>
                        <p className="font-semibold">{formatAmount(selectedPlan.nominalTarget)}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Plage d'appui</p>
                        <p className="font-semibold text-green-600">
                          {formatAmount(selectedPlan.supportMin)} - {formatAmount(selectedPlan.supportMax)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="paymentFrequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fréquence de paiement *</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="grid grid-cols-2 gap-4"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <Card className="w-full cursor-pointer hover:shadow-md transition-shadow">
                              <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                  <FormControl>
                                    <RadioGroupItem value="MONTHLY" />
                                  </FormControl>
                                  <div className="flex-1">
                                    <FormLabel className="font-semibold cursor-pointer">
                                      Mensuel
                                    </FormLabel>
                                    <p className="text-xs text-muted-foreground">
                                      Versement complet une fois par mois
                                    </p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <Card className="w-full cursor-pointer hover:shadow-md transition-shadow">
                              <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                  <FormControl>
                                    <RadioGroupItem value="DAILY" />
                                  </FormControl>
                                  <div className="flex-1">
                                    <FormLabel className="font-semibold cursor-pointer">
                                      Journalier
                                    </FormLabel>
                                    <p className="text-xs text-muted-foreground">
                                      Versements progressifs au fil des jours
                                    </p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Section 3: Paramètres avancés */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <h3 className="font-semibold text-lg">Paramètres du contrat</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="durationInMonths"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Durée (en mois) *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormDescription>
                          Nombre de mois du contrat (max 24)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Statut</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionnez un statut" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ACTIVE">Actif</SelectItem>
                            <SelectItem value="SUSPENDED">Suspendu</SelectItem>
                            <SelectItem value="CANCELLED">Annulé</SelectItem>
                            <SelectItem value="COMPLETED">Terminé</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="penaltyRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Taux de pénalité (%) *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormDescription>
                          Pourcentage appliqué en cas de retard
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="penaltyDelayDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Délai avant pénalités (jours) *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormDescription>
                          Nombre de jours de grâce avant pénalités
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                className="bg-[#224D62] hover:bg-[#2c5a73]"
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Créer le forfait
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

