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
import { subscriptionCISchema, type SubscriptionCIFormData } from '@/schemas/caisse-imprevue.schema'
import { SubscriptionCI } from '@/types/types'
import { useSubscriptionCI } from './SubscriptionCIContext'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

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
  const { updateSubscription } = useSubscriptionCI()
  const { user } = useAuth()

  // @ts-ignore - Erreur de duplication de types react-hook-form
  const form = useForm<SubscriptionCIFormData>({
    resolver: zodResolver(subscriptionCISchema),
    defaultValues: subscription ? {
      label: subscription.label,
      code: subscription.code,
      amountPerMonth: subscription.amountPerMonth,
      nominal: subscription.nominal,
      durationInMonths: subscription.durationInMonths,
      penaltyRate: subscription.penaltyRate,
      penaltyDelayDays: subscription.penaltyDelayDays,
      supportMin: subscription.supportMin,
      supportMax: subscription.supportMax,
      status: subscription.status,
    } : undefined,
  })

  // Réinitialiser le formulaire quand la subscription change
  useEffect(() => {
    if (subscription) {
      form.reset({
        label: subscription.label,
        code: subscription.code,
        amountPerMonth: subscription.amountPerMonth,
        nominal: subscription.nominal,
        durationInMonths: subscription.durationInMonths,
        penaltyRate: subscription.penaltyRate,
        penaltyDelayDays: subscription.penaltyDelayDays,
        supportMin: subscription.supportMin,
        supportMax: subscription.supportMax,
        status: subscription.status,
      })
    }
  }, [subscription, form])

  const onSubmit = async (data: SubscriptionCIFormData) => {
    if (!subscription) return
    
    // Préparer les données pour la mise à jour
    const updateData = {
      ...data,
      updatedAt: new Date(),
      updatedBy: user?.uid || '',
      status: data.status as 'ACTIVE' | 'INACTIVE',
    }

    // Utiliser la mutation de React Query
    updateSubscription.mutate(
      { id: subscription.id, data: updateData },
      {
        onSuccess: () => {
          onOpenChange(false)
          // Toast géré par le hook de mutation
        },
        // Erreur gérée par le hook de mutation
      }
    )
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
            Modifiez les paramètres du forfait
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Section 1: Identification */}
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
                        <Input placeholder="Ex: Forfait Hospitalisation" {...field} />
                      </FormControl>
                      <FormDescription>
                        Nom descriptif pour identifier ce forfait
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
                        <Input {...field} />
                      </FormControl>
                      <FormDescription>
                        Code unique du forfait
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
                    name="nominal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nominal (FCFA) *</FormLabel>
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
                    name="supportMax"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Appui maximum (FCFA) *</FormLabel>
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

            {/* Section 3: Paramètres */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <h3 className="font-semibold text-lg">Paramètres du forfait</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                        <FormLabel>Délai pénalités (jours) *</FormLabel>
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
              </CardContent>
            </Card>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={updateSubscription.isPending}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                className="bg-[#224D62] hover:bg-[#2c5a73]"
                disabled={updateSubscription.isPending}
              >
                {updateSubscription.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Enregistrer les modifications
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
