import React from 'react'
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import SelectApp, { SelectOption } from '@/components/forms/SelectApp'

interface GroupMemberSelectFormProps {
  groupMembers?: any[]
  isLoading?: boolean
}

export default function GroupMemberSelectForm({ groupMembers, isLoading }: GroupMemberSelectFormProps) {
  // Transformer les membres du groupe en options pour SelectApp
  const options: SelectOption[] = groupMembers?.map((member: any) => ({
    value: member.id,
    label: `${member.firstName} ${member.lastName} (${member.matricule})`
  })) || []

  return (
    <FormField
      name="selectedGroupMemberId"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Membre du groupe qui verse *</FormLabel>
          <FormControl>
            <SelectApp
              options={options}
              value={field.value}
              onChange={field.onChange}
              placeholder={
                isLoading 
                  ? "Chargement des membres du groupe..." 
                  : "Sélectionnez le membre qui verse"
              }
              disabled={isLoading}
            />
          </FormControl>
          <FormMessage />
          <p className="text-xs text-gray-500 mt-1">
            Ce champ permet de tracer qui a effectué le versement dans le groupe
          </p>
        </FormItem>
      )}
    />
  )
}
