/**
 * Étape 3 : Contact d'urgence
 * Réutilise EmergencyContactMemberSelector (exclut le membre sélectionné)
 */

'use client'

import { UseFormReturn } from 'react-hook-form'
import EmergencyContactMemberSelector from '@/components/shared/EmergencyContactMemberSelector'
import type { CaisseSpecialeDemandFormInput } from '@/schemas/caisse-speciale.schema'

interface Step3ContactCSProps {
  form: UseFormReturn<CaisseSpecialeDemandFormInput>
}

export function Step3ContactCS({ form }: Step3ContactCSProps) {
  const memberId = form.watch('memberId')
  const emergencyContact = form.watch('emergencyContact')

  const handleUpdateField = (field: string, value: unknown) => {
    const fieldMap: Record<string, keyof NonNullable<CaisseSpecialeDemandFormInput['emergencyContact']>> = {
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
