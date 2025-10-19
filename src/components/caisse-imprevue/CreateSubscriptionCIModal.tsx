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
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { subscriptionCISchema, defaultSubscriptionCIValues, type SubscriptionCIFormData } from '@/schemas/caisse-imprevue.schema'
import { useSubscriptionCI } from './SubscriptionCIContext'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import SelectApp from '@/components/forms/SelectApp'
import { SUBSCRIPTION_CODE_OPTIONS } from '@/constantes/subscription-codes'

interface CreateSubscriptionCIModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function CreateSubscriptionCIModal({ open, onOpenChange }: CreateSubscriptionCIModalProps) {
  const { createSubscription, subscriptions } = useSubscriptionCI()
  const { user } = useAuth()
  
  const form = useForm<SubscriptionCIFormData>({
    resolver: zodResolver(subscriptionCISchema),
    defaultValues: defaultSubscriptionCIValues,
  })

  // Calculer automatiquement le nominal en fonction du montant mensuel et de la durée
  const amountPerMonth = form.watch('amountPerMonth')
  const durationInMonths = form.watch('durationInMonths')

  useEffect(() => {
    const calculatedNominal = (amountPerMonth || 0) * (durationInMonths || 0)
    form.setValue('nominal', calculatedNominal)
  }, [amountPerMonth, durationInMonths, form])

  // Filtrer les codes déjà utilisés
  const usedCodes = subscriptions.map(sub => sub.code)
  const availableCodeOptions = SUBSCRIPTION_CODE_OPTIONS.filter(
    option => !usedCodes.includes(option.value)
  )

  const onSubmit = async (data: SubscriptionCIFormData) => {
    // Générer l'ID personnalisé: MK_CI_FORFAIT_{CODE}_{DATE}_{HEURE}
    const now = new Date()
    const day = String(now.getDate()).padStart(2, '0')
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const year = String(now.getFullYear()).slice(-2)
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    
    const customId = `MK_CI_FORFAIT_${data.code}_${day}${month}${year}_${hours}${minutes}`
    
    // Préparer les données pour la création
    const subscriptionData = {
      ...data,
      id: customId,
      createdBy: user?.uid || '',
      updatedBy: user?.uid,
      status: data.status as 'ACTIVE' | 'INACTIVE',
    }

    // Utiliser la mutation de React Query
    createSubscription.mutate(subscriptionData, {
      onSuccess: () => {
        form.reset()
        onOpenChange(false)
        // Toast géré par le hook de mutation
      },
      // Erreur gérée par le hook de mutation
    })
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
            {/* Section 1: Identification du forfait */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <h3 className="font-semibold text-lg">Identification du forfait</h3>
                
                <FormField
                  control={form.control}
                  name="label"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Libellé du forfait</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Forfait Hospitalisation, Forfait Décès..." {...field} />
                      </FormControl>
                      <FormDescription>
                        Nom descriptif pour identifier ce forfait (optionnel)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code du forfait *</FormLabel>
                      <FormControl>
                        <SelectApp
                          options={availableCodeOptions}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder={
                            availableCodeOptions.length === 0
                              ? "Tous les codes sont utilisés"
                              : "Sélectionner un code (A-Z)"
                          }
                          disabled={availableCodeOptions.length === 0}
                        />
                      </FormControl>
                      <FormDescription>
                        {availableCodeOptions.length === 0 ? (
                          <span className="text-red-600 font-medium">
                            Tous les codes alphabétiques sont déjà utilisés. Veuillez supprimer un forfait existant pour libérer un code.
                          </span>
                        ) : (
                          <>
                            Code alphabétique unique pour identifier ce forfait 
                            <span className="text-green-600 font-medium ml-1">
                              ({availableCodeOptions.length} code{availableCodeOptions.length > 1 ? 's' : ''} disponible{availableCodeOptions.length > 1 ? 's' : ''})
                            </span>
                          </>
                        )}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Section 2: Configuration financière */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <h3 className="font-semibold text-lg">Configuration financière</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="amountPerMonth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Montant mensuel (FCFA) *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Ex: 10000"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormDescription>
                          Montant à cotiser chaque mois
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="nominal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nominal (FCFA) *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Ex: 120000"
                            {...field}
                            disabled
                            className="bg-gray-100 cursor-not-allowed"
                          />
                        </FormControl>
                        <FormDescription>
                          Somme nominale à atteindre
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="supportMin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Appui minimum (FCFA) *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Ex: 0"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormDescription>
                          Montant minimum d'aide possible
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="supportMax"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Appui maximum (FCFA) *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Ex: 30000"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormDescription>
                          Montant maximum d'aide possible
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
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
                        <FormLabel>Statut *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionnez un statut" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ACTIVE">Actif</SelectItem>
                            <SelectItem value="INACTIVE">Inactif</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Les forfaits actifs sont disponibles pour les souscriptions
                        </FormDescription>
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
                disabled={createSubscription.isPending}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                className="bg-[#224D62] hover:bg-[#2c5a73]"
                disabled={createSubscription.isPending || availableCodeOptions.length === 0}
              >
                {createSubscription.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Créer le forfait
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

