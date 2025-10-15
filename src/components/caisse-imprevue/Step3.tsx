'use client'
import React from 'react'
import { Phone, CheckCircle2 } from 'lucide-react'
import { useFormCaisseImprevueProvider } from '@/providers/FormCaisseImprevueProvider'
import EmergencyContactForm from '@/components/caisse-speciale/forms/EmergencyContactForm'

export default function Step3() {
  const { form } = useFormCaisseImprevueProvider()
  const step3Values = form.watch('step3')

  // Fonction pour mettre à jour un champ spécifique du contact d'urgence
  const handleUpdateField = (field: string, value: any) => {
    form.setValue(`step3.${field}` as any, value, {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: false
    })
  }

  return (
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

      {/* Formulaire de contact d'urgence */}
      <EmergencyContactForm 
        emergencyContact={{
          lastName: step3Values?.lastName || '',
          firstName: step3Values?.firstName || '',
          phone1: step3Values?.phone1 || '',
          phone2: step3Values?.phone2 || '',
          relationship: (step3Values?.relationship || 'Autre') as any
        }}
        onUpdate={handleUpdateField}
      />

      {/* Récapitulatif visuel si le formulaire est valide */}
      {step3Values?.lastName && step3Values?.phone1 && step3Values?.relationship && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle2 className="w-5 h-5" />
            <p className="font-medium">
              Contact d'urgence confirmé : {step3Values.lastName}
              {step3Values.firstName && ` ${step3Values.firstName}`}
            </p>
          </div>
          <p className="text-sm text-green-600 mt-1">
            Téléphone : {step3Values.phone1}
            {step3Values.phone2 && ` / ${step3Values.phone2}`}
          </p>
          <p className="text-sm text-green-600">
            Lien : {step3Values.relationship}
          </p>
        </div>
      )}
    </div>
  )
}
