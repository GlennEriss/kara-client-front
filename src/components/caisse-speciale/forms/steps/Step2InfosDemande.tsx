/**
 * Étape 2 : Informations de la demande
 * Types charitable accessibles uniquement si le membre a déjà contribué à une œuvre de charité (cache member-charity-summary).
 */

'use client'

import { useEffect } from 'react'
import { UseFormReturn, useWatch } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, Loader2, Heart } from 'lucide-react'
import { useMemberCharityEligibility } from '@/domains/financial/caisse-speciale/hooks/useMemberCharityEligibility'
import type { CaisseSpecialeDemandFormInput } from '@/schemas/caisse-speciale.schema'

const CHARITABLE_TYPES = ['STANDARD_CHARITABLE', 'JOURNALIERE_CHARITABLE', 'LIBRE_CHARITABLE'] as const

interface Step2InfosDemandeProps {
  form: UseFormReturn<CaisseSpecialeDemandFormInput>
}

export function Step2InfosDemande({ form }: Step2InfosDemandeProps) {
  const memberId = useWatch({ control: form.control, name: 'memberId', defaultValue: form.getValues('memberId') })
  const { eligible, lastContribution, isLoading } = useMemberCharityEligibility(memberId || null)

  // Si le membre n'est pas éligible et qu'un type charitable est sélectionné, réinitialiser
  useEffect(() => {
    if (isLoading) return
    const current = form.getValues('caisseType')
    if (!eligible && current && CHARITABLE_TYPES.includes(current as typeof CHARITABLE_TYPES[number])) {
      form.setValue('caisseType', 'STANDARD')
    }
  }, [eligible, isLoading, form])

  return (
    <div className="space-y-6">
      <h3 className="font-semibold text-lg">Informations de la demande</h3>

      {!eligible && (memberId ? !isLoading : true) && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3">
          Les types <strong>Standard Charitable</strong>, <strong>Journalière Charitable</strong> et <strong>Libre Charitable</strong> sont réservés aux membres ayant déjà contribué à une œuvre de charité.
        </p>
      )}

      {eligible && lastContribution && (
        <div className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-md p-3 flex items-start gap-2">
          <Heart className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <span className="font-medium">Dernière œuvre :</span>{' '}
            {lastContribution.eventName ?? lastContribution.eventId}
            {' — '}
            {lastContribution.date.toLocaleDateString('fr-FR')}
            {lastContribution.amount != null && ` — ${lastContribution.amount.toLocaleString('fr-FR')} FCFA`}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="caisseType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type de caisse</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={isLoading}
              >
                <FormControl>
                  <SelectTrigger>
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Vérification éligibilité...
                      </span>
                    ) : (
                      <SelectValue placeholder="Sélectionnez un type" />
                    )}
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="STANDARD">Standard</SelectItem>
                  <SelectItem value="JOURNALIERE">Journalière</SelectItem>
                  <SelectItem value="LIBRE">Libre</SelectItem>
                  <SelectItem value="STANDARD_CHARITABLE" disabled={!eligible}>
                    Standard Charitable {!eligible && '(réservé aux contributeurs œuvres de charité)'}
                  </SelectItem>
                  <SelectItem value="JOURNALIERE_CHARITABLE" disabled={!eligible}>
                    Journalière Charitable {!eligible && '(réservé aux contributeurs œuvres de charité)'}
                  </SelectItem>
                  <SelectItem value="LIBRE_CHARITABLE" disabled={!eligible}>
                    Libre Charitable {!eligible && '(réservé aux contributeurs œuvres de charité)'}
                  </SelectItem>
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
    </div>
  )
}
