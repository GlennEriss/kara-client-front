/**
 * Étape 2 : Informations de la demande
 */

'use client'

import { UseFormReturn } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from 'lucide-react'
import type { CaisseSpecialeDemandFormInput } from '@/schemas/caisse-speciale.schema'

interface Step2InfosDemandeProps {
  form: UseFormReturn<CaisseSpecialeDemandFormInput>
}

export function Step2InfosDemande({ form }: Step2InfosDemandeProps) {
  return (
    <div className="space-y-6">
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
