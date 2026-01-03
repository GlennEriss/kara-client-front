'use client'
import React from 'react'
import { Phone, CheckCircle2 } from 'lucide-react'
import { useFormCaisseImprevueProvider } from '@/providers/FormCaisseImprevueProvider'
import EmergencyContactMemberSelector from '@/components/shared/EmergencyContactMemberSelector'

export default function Step3() {
  const { form } = useFormCaisseImprevueProvider()
  const step3Values = form.watch('step3')
  const formData = form.getValues()

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
      <EmergencyContactMemberSelector
        memberId={step3Values?.memberId}
        lastName={step3Values?.lastName || ''}
        firstName={step3Values?.firstName || ''}
        phone1={step3Values?.phone1 || ''}
        phone2={step3Values?.phone2 || ''}
        relationship={step3Values?.relationship || ''}
        idNumber={step3Values?.idNumber || ''}
        typeId={step3Values?.typeId || ''}
        documentPhotoUrl={step3Values?.documentPhotoUrl || ''}
        onUpdate={handleUpdateField}
        excludeMemberIds={formData.step1?.memberId ? [formData.step1.memberId] : []}
      />

      {/* Récapitulatif visuel si le formulaire est valide */}
      {step3Values?.lastName && 
       step3Values?.phone1 && 
       step3Values?.relationship && 
       step3Values?.typeId && 
       step3Values?.idNumber && 
       step3Values?.documentPhotoUrl && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle2 className="w-5 h-5" />
            <p className="font-medium">
              Contact d&apos;urgence confirmé : {step3Values.lastName}
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
          <p className="text-sm text-green-600">
            Document : {step3Values.typeId} - {step3Values.idNumber}
          </p>
          <p className="text-sm text-green-600 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Photo du document uploadée
          </p>
        </div>
      )}
    </div>
  )
}
