'use client'
import React, { useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Wallet, Loader2, CheckCircle2, AlertCircle, Package, Calendar, Clock } from 'lucide-react'
import { useFormCaisseImprevueProvider } from '@/providers/FormCaisseImprevueProvider'
import { SubscriptionCI } from '@/types/types'
import { toast } from 'sonner'
import { useActiveSubscriptionsCI } from '@/hooks/caisse-imprevue/useActiveSubscriptionsCI'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function Step2() {
  const { form } = useFormCaisseImprevueProvider()
  const step2Values = form.watch('step2')
  const selectedSubscriptionId = step2Values?.subscriptionCIID

  // Récupération des forfaits actifs avec React Query
  const { data: activeSubscriptions, isLoading, isError } = useActiveSubscriptionsCI()

  // Fonction de sélection d'un forfait
  const handleSelectSubscription = useCallback((subscription: SubscriptionCI) => {
    // ✅ Définir les valeurs avec validation et sans marquer comme touched
    form.setValue('step2.subscriptionCIID', subscription.id, { 
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: false
    })
    form.setValue('step2.subscriptionCICode', subscription.code, { 
      shouldValidate: true, 
      shouldDirty: true,
      shouldTouch: false
    })
    form.setValue('step2.subscriptionCILabel', subscription.label || '', { 
      shouldValidate: true, 
      shouldDirty: true,
      shouldTouch: false
    })
    form.setValue('step2.subscriptionCIAmountPerMonth', subscription.amountPerMonth, { 
      shouldValidate: true, 
      shouldDirty: true,
      shouldTouch: false
    })
    form.setValue('step2.subscriptionCINominal', subscription.nominal, { 
      shouldValidate: true, 
      shouldDirty: true,
      shouldTouch: false
    })
    form.setValue('step2.subscriptionCIDuration', subscription.durationInMonths, { 
      shouldValidate: true, 
      shouldDirty: true,
      shouldTouch: false
    })
    form.setValue('step2.subscriptionCISupportMin', subscription.supportMin, { 
      shouldValidate: true, 
      shouldDirty: true,
      shouldTouch: false
    })
    form.setValue('step2.subscriptionCISupportMax', subscription.supportMax, { 
      shouldValidate: true, 
      shouldDirty: true,
      shouldTouch: false
    })
    
    toast.success(`Forfait sélectionné : ${subscription.code}${subscription.label ? ` - ${subscription.label}` : ''}`)
  }, [form])

  return (
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
        <CardHeader>
          <CardTitle>Choix du forfait</CardTitle>
          <CardDescription>
            Sélectionnez un forfait de Caisse Imprévue disponible
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* État de chargement */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-[#224D62]" />
              <span className="ml-2 text-muted-foreground">Chargement des forfaits...</span>
            </div>
          )}

          {/* Affichage de l'erreur */}
          {isError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Une erreur est survenue lors du chargement des forfaits. Veuillez réessayer.
              </AlertDescription>
            </Alert>
          )}

          {/* Liste des forfaits disponibles */}
          {!isLoading && !isError && activeSubscriptions && activeSubscriptions.length === 0 && (
            <Alert>
              <Package className="h-4 w-4" />
              <AlertDescription>
                Aucun forfait actif disponible pour le moment.
              </AlertDescription>
            </Alert>
          )}

          {!isLoading && !isError && activeSubscriptions && activeSubscriptions.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {activeSubscriptions.length} forfait(s) disponible(s)
              </p>
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Détails du forfait sélectionné */}
      {selectedSubscriptionId && (
        <Card>
          <CardHeader>
            <CardTitle>Détails du forfait sélectionné</CardTitle>
            <CardDescription>
              Informations détaillées du forfait choisi
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Champs en lecture seule */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="step2.subscriptionCICode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code du forfait</FormLabel>
                    <FormControl>
                      <Input {...field} readOnly className="bg-gray-100 cursor-not-allowed" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="step2.subscriptionCILabel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Libellé</FormLabel>
                    <FormControl>
                      <Input {...field} readOnly className="bg-gray-100 cursor-not-allowed" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="step2.subscriptionCIAmountPerMonth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Montant mensuel (FCFA)</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        value={field.value.toLocaleString()}
                        readOnly 
                        className="bg-gray-100 cursor-not-allowed" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="step2.subscriptionCINominal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nominal (FCFA)</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        value={field.value.toLocaleString()}
                        readOnly 
                        className="bg-gray-100 cursor-not-allowed" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="step2.subscriptionCIDuration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Durée (mois)</FormLabel>
                    <FormControl>
                      <Input {...field} readOnly className="bg-gray-100 cursor-not-allowed" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="step2.subscriptionCISupportMin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Appui min. (FCFA)</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        value={field.value.toLocaleString()}
                        readOnly 
                        className="bg-gray-100 cursor-not-allowed" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="step2.subscriptionCISupportMax"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Appui max. (FCFA)</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        value={field.value.toLocaleString()}
                        readOnly 
                        className="bg-gray-100 cursor-not-allowed" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Récapitulatif visuel */}
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle2 className="w-5 h-5" />
                <p className="font-medium">
                  Forfait confirmé : {step2Values?.subscriptionCICode}
                  {step2Values?.subscriptionCILabel && ` - ${step2Values.subscriptionCILabel}`}
                </p>
              </div>
              <p className="text-sm text-green-600 mt-1">
                {step2Values?.subscriptionCIAmountPerMonth.toLocaleString()} FCFA/mois × {step2Values?.subscriptionCIDuration} mois = {step2Values?.subscriptionCINominal.toLocaleString()} FCFA
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fréquence de paiement */}
      <Card>
        <CardHeader>
          <CardTitle>Fréquence de remboursement</CardTitle>
          <CardDescription>
            Choisissez le rythme de remboursement pour ce contrat
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormField
            control={form.control}
            name="step2.paymentFrequency"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex flex-col space-y-3"
                  >
                    <div className="flex items-start space-x-3 space-y-0">
                      <RadioGroupItem value="MONTHLY" id="monthly" />
                      <div className="space-y-1 leading-none">
                        <FormLabel htmlFor="monthly" className="font-medium cursor-pointer">
                          Mensuel
                        </FormLabel>
                        <FormDescription>
                          Le remboursement sera effectué une fois par mois
                        </FormDescription>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3 space-y-0">
                      <RadioGroupItem value="DAILY" id="daily" />
                      <div className="space-y-1 leading-none">
                        <FormLabel htmlFor="daily" className="font-medium cursor-pointer">
                          Quotidien
                        </FormLabel>
                        <FormDescription>
                          Le remboursement sera effectué au fil des jours
                        </FormDescription>
                      </div>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      {/* Date du premier versement */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#224D62]" />
            Date du premier versement
          </CardTitle>
          <CardDescription>
            Sélectionnez la date du premier versement pour ce contrat
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={form.control}
            name="step2.firstPaymentDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date du premier versement *</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#224D62]/40" />
                    <Input
                      type="date"
                      {...field}
                      min={new Date().toISOString().split('T')[0]}
                      className="pl-10 border-[#224D62]/30 focus:border-[#224D62] focus:ring-[#224D62]/20"
                    />
                  </div>
                </FormControl>
                <FormDescription>
                  La date doit être aujourd'hui ou dans le futur
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Affichage de la date sélectionnée */}
          {step2Values?.firstPaymentDate && (
            <div className="p-4 bg-[#224D62]/5 rounded-lg border border-[#224D62]/20">
              <div className="flex items-center gap-2 text-[#224D62]">
                <Clock className="w-4 h-4" />
                <span className="font-medium text-sm">
                  Premier versement prévu le : {new Date(step2Values.firstPaymentDate).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
