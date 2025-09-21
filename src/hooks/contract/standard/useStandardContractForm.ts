import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { 
  individualContractSchema, 
  groupContractSchema,
  type IndividualContractFormData,
  type GroupContractFormData,
  individualContractDefaultValues,
  groupContractDefaultValues
} from '@/schemas/contract.standard.schema'
import { PaymentMode } from '@/types/types'

// ————————————————————————————————————————————————————————————
// Types union pour les deux types de contrats
// ————————————————————————————————————————————————————————————
export type StandardContractFormData = IndividualContractFormData | GroupContractFormData
export type StandardContractFormReturn = ReturnType<typeof useIndividualContractForm> | ReturnType<typeof useGroupContractForm>

// ————————————————————————————————————————————————————————————
// Hook pour les contrats individuels
// ————————————————————————————————————————————————————————————
export function useIndividualContractForm(contractId: string, memberId: string) {
  const form = useForm<IndividualContractFormData>({
    resolver: zodResolver(individualContractSchema),
    defaultValues: {
      ...individualContractDefaultValues,
      contractId,
      memberId,
    },
    mode: 'onChange',
  })

  return {
    form,
    ...form,
  }
}

// ————————————————————————————————————————————————————————————
// Hook pour les contrats de groupe
// ————————————————————————————————————————————————————————————
export function useGroupContractForm(contractId: string, groupeId: string) {
  const form = useForm<GroupContractFormData>({
    resolver: zodResolver(groupContractSchema),
    defaultValues: {
      ...groupContractDefaultValues,
      contractId,
      groupeId,
    },
    mode: 'onChange',
  })

  return {
    form,
    ...form,
  }
}

// ————————————————————————————————————————————————————————————
// Hook principal qui détermine le type de contrat
// ————————————————————————————————————————————————————————————
export function useStandardContractForm(
  contractId: string, 
  memberId: string, 
  groupeId?: string
): StandardContractFormReturn {
  const isGroupContract = !!groupeId
  
  if (isGroupContract) {
    return useGroupContractForm(contractId, groupeId)
  } else {
    return useIndividualContractForm(contractId, memberId)
  }
}
