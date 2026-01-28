/**
 * Étape 1 : Sélection du membre + Motif de la demande
 */

'use client'

import { UseFormReturn } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { CaisseImprevueDemandFormInput } from '../../../hooks/useDemandForm'

interface Step1MemberProps {
  form: UseFormReturn<CaisseImprevueDemandFormInput>
}

export function Step1Member({ form }: Step1MemberProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="member-search">Rechercher un membre</Label>
        <p className="text-xs text-kara-neutral-500 mb-2">
          Recherchez et sélectionnez le membre pour qui créer la demande
        </p>
        {/* TODO: Intégrer composant de recherche membre avec autocomplétion */}
        <div className="border rounded-lg p-4 bg-gray-50">
          <p className="text-sm text-kara-neutral-500">Composant de recherche membre à implémenter</p>
        </div>
      </div>

      <div>
        <Label htmlFor="cause">
          Motif de la demande <span className="text-red-500">*</span>
        </Label>
        <p className="text-xs text-kara-neutral-500 mb-2">
          Décrivez la raison de la demande (10-500 caractères)
        </p>
        <Textarea
          id="cause"
          {...form.register('cause', {
            required: 'Le motif est requis',
            minLength: { value: 10, message: 'Le motif doit contenir au moins 10 caractères' },
            maxLength: { value: 500, message: 'Le motif ne peut pas dépasser 500 caractères' },
          })}
          placeholder="Ex: Aide pour frais médicaux urgents suite à une hospitalisation..."
          className="min-h-[120px]"
          data-testid="demand-cause-textarea"
        />
        {form.formState.errors.cause && (
          <p className="text-xs text-red-500 mt-1">{form.formState.errors.cause.message}</p>
        )}
        <p className="text-xs text-kara-neutral-500 mt-1">
          {form.watch('cause')?.length || 0} / 500 caractères
        </p>
      </div>
    </div>
  )
}
