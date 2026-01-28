/**
 * Étape 3 : Contact d'urgence
 * 
 * Exclusion automatique du membre sélectionné dans Step 1
 * Utilise EmergencyContactMemberSelector selon la documentation
 */

'use client'

import { UseFormReturn } from 'react-hook-form'
import EmergencyContactMemberSelector from '@/components/shared/EmergencyContactMemberSelector'
import type { CaisseImprevueDemandFormInput } from '../../../hooks/useDemandForm'

interface Step3ContactProps {
  form: UseFormReturn<CaisseImprevueDemandFormInput>
}

export function Step3Contact({ form }: Step3ContactProps) {
  const memberId = form.watch('memberId')
  const emergencyContact = form.watch('emergencyContact')

  // Callback pour mettre à jour les champs du contact d'urgence
  const handleUpdateField = (field: string, value: any) => {
    // Mapper les champs vers la structure emergencyContact
    const fieldMap: Record<string, keyof CaisseImprevueDemandFormInput['emergencyContact']> = {
      memberId: 'memberId',
      lastName: 'lastName',
      firstName: 'firstName',
      phone1: 'phone1',
      phone2: 'phone2',
      relationship: 'relationship',
      typeId: 'typeId',
      idNumber: 'idNumber',
      documentPhotoUrl: 'documentPhotoUrl',
    }

    const mappedField = fieldMap[field] || field
    form.setValue(`emergencyContact.${mappedField}` as any, value, {
      shouldValidate: true,
      shouldDirty: true,
    })
  }

  return (
    <div className="space-y-4">
      <EmergencyContactMemberSelector
        memberId={emergencyContact?.memberId}
        lastName={emergencyContact?.lastName || ''}
        firstName={emergencyContact?.firstName || ''}
        phone1={emergencyContact?.phone1 || ''}
        phone2={emergencyContact?.phone2 || ''}
        relationship={emergencyContact?.relationship || ''}
        idNumber={emergencyContact?.idNumber || ''}
        typeId={emergencyContact?.typeId || ''}
        documentPhotoUrl={emergencyContact?.documentPhotoUrl || ''}
        onUpdate={handleUpdateField}
        excludeMemberIds={memberId ? [memberId] : []}
      />
    </div>
  )
}
