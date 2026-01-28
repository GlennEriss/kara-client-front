/**
 * Étape 3 : Contact d'urgence
 * 
 * Exclusion automatique du membre sélectionné dans Step 1
 */

'use client'

import { UseFormReturn } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { CaisseImprevueDemandFormInput } from '../../../hooks/useDemandForm'
import { DOCUMENT_TYPE_OPTIONS } from '@/constantes/document-types'

interface Step3ContactProps {
  form: UseFormReturn<CaisseImprevueDemandFormInput>
}

export function Step3Contact({ form }: Step3ContactProps) {
  const memberId = form.watch('memberId')

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="contact-lastName">
          Nom du contact <span className="text-red-500">*</span>
        </Label>
        <Input
          id="contact-lastName"
          {...form.register('emergencyContact.lastName', { required: 'Le nom est requis' })}
        />
      </div>

      <div>
        <Label htmlFor="contact-firstName">Prénom du contact</Label>
        <Input id="contact-firstName" {...form.register('emergencyContact.firstName')} />
      </div>

      <div>
        <Label htmlFor="contact-phone1">
          Téléphone principal <span className="text-red-500">*</span>
        </Label>
        <Input
          id="contact-phone1"
          {...form.register('emergencyContact.phone1', { required: 'Le téléphone est requis' })}
        />
      </div>

      <div>
        <Label htmlFor="contact-relationship">
          Lien avec le demandeur <span className="text-red-500">*</span>
        </Label>
        <Input
          id="contact-relationship"
          {...form.register('emergencyContact.relationship', { required: 'Le lien est requis' })}
          placeholder="Ex: Frère, Sœur, Ami..."
        />
      </div>

      <div>
        <Label htmlFor="contact-typeId">
          Type de pièce d'identité <span className="text-red-500">*</span>
        </Label>
        <Select
          value={form.watch('emergencyContact.typeId')}
          onValueChange={(value) => form.setValue('emergencyContact.typeId', value)}
        >
          <SelectTrigger id="contact-typeId">
            <SelectValue placeholder="Sélectionner" />
          </SelectTrigger>
          <SelectContent>
            {DOCUMENT_TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="contact-idNumber">
          Numéro de pièce <span className="text-red-500">*</span>
        </Label>
        <Input
          id="contact-idNumber"
          {...form.register('emergencyContact.idNumber', { required: 'Le numéro est requis' })}
        />
      </div>

      <div>
        <Label htmlFor="contact-photo">Photo de la pièce d'identité</Label>
        <Input
          id="contact-photo"
          type="file"
          accept="image/*"
          onChange={(e) => {
            // TODO: Implémenter upload vers Firebase Storage
            console.log('Upload photo:', e.target.files?.[0])
          }}
        />
      </div>

      {memberId && (
        <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800">
          ℹ️ Le membre sélectionné ({memberId}) sera automatiquement exclu de la recherche de contact
        </div>
      )}
    </div>
  )
}
