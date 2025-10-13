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
import { subscriptionCISchema, type SubscriptionCIFormData } from '@/schemas/caisse-imprevue.schema'
import { SubscriptionCI, CAISSE_IMPREVUE_PLANS } from '@/types/types'
import { useSubscriptionCI } from './SubscriptionCIContext'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface EditSubscriptionCIModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  subscription: SubscriptionCI | null
}

export default function EditSubscriptionCIModal({
  open,
  onOpenChange,
  subscription
}: EditSubscriptionCIModalProps) {
  const { dispatch } = useSubscriptionCI()
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // @ts-ignore - Erreur de duplication de types react-hook-form
  const form = useForm<SubscriptionCIFormData>({
    resolver: zodResolver(subscriptionCISchema),
    defaultValues: subscription ? {
      memberId: subscription.memberId,
      code: subscription.code,
      amountPerMonth: subscription.amountPerMonth,
      nominal: subscription.nominal,
      durationInMonths: subscription.durationInMonths,
      penaltyRate: subscription.penaltyRate,
      penaltyDelayDays: subscription.penaltyDelayDays,
      supportMin: subscription.supportMin,
      supportMax: subscription.supportMax,
      paymentFrequency: subscription.paymentFrequency,
      status: subscription.status,
    } : undefined,
  })

  const selectedPlanCode = form.watch('code')
  const selectedPlan = selectedPlanCode ? CAISSE_IMPREVUE_PLANS[selectedPlanCode] : null

  // Réinitialiser le formulaire quand la subscription change
  useEffect(() => {
    if (subscription) {
      form.reset({
        memberId: subscription.memberId,
        code: subscription.code,
        amountPerMonth: subscription.amountPerMonth,
        nominal: subscription.nominal,
        durationInMonths: subscription.durationInMonths,
        penaltyRate: subscription.penaltyRate,
        penaltyDelayDays: subscription.penaltyDelayDays,
        supportMin: subscription.supportMin,
        supportMax: subscription.supportMax,
        paymentFrequency: subscription.paymentFrequency,
        status: subscription.status,
      })
    }
  }, [subscription, form])

  const onSubmit = async (data: SubscriptionCIFormData) => {
    if (!subscription) return

    setIsSubmitting(true)

    try {
      // TODO: Appeler le service pour mettre à jour la souscription
      // await updateSubscriptionCI(subscription.id, data)

      const updatedSubscription = {
        ...subscription,
        ...data,
        updatedAt: new Date(),
        updatedBy: 'admin',
      }

      dispatch({ type: 'UPDATE_SUBSCRIPTION', payload: updatedSubscription })
      toast.success('Forfait modifié avec succès')
      onOpenChange(false)
    } catch (error) {
      console.error('Erreur lors de la modification:', error)
      toast.error('Erreur lors de la modification du forfait')
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA'
  }

  if (!subscription) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#224D62]">
            Modifier le forfait {subscription.code}
          </DialogTitle>
          <DialogDescription>
            Modifiez les paramètres de la souscription
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Section 1: Informations du membre */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <h3 className="font-semibold text-lg">Informations du membre</h3>

                <FormField
                  control={form.control}
                  name="memberId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ID du membre</FormLabel>
                      <FormControl>
                        <Input {...field} readOnly className="bg-gray-50" />
                      </FormControl>
                      <FormDescription>
                        L'identifiant du membre ne peut pas être modifié
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Section 2: Forfait */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <h3 className="font-semibold text-lg">Configuration du forfait</h3>

                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Forfait *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
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
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedPlan && (
                  <div className="p-4 bg-[#224D62]/5 border border-[#224D62]/20 rounded-lg space-y-2">
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
                        <p className="text-muted-foreground">Appui</p>
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
                          value={field.value}
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
                                      Versement complet mensuel
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
                                      Versements progressifs
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

            {/* Section 3: Paramètres */}
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Statut *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
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
                Enregistrer les modifications
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

