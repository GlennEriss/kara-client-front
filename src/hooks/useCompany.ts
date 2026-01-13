/**
 * @module useCompany
 * React Query hooks for company and profession operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ServiceFactory } from '@/factories/ServiceFactory'
import { useCompanySearch as useCompanySearchNew, useCompanyMutations } from '@/domains/infrastructure/references/hooks/useCompanies'
import { useProfessionSearch as useProfessionSearchNew, useProfessionMutations } from '@/domains/infrastructure/references/hooks/useProfessions'
import type { CompanySearchResult } from '@/domains/infrastructure/references/entities/company.types'
import type { ProfessionSearchResult } from '@/domains/infrastructure/references/entities/profession.types'

/**
 * Hook pour rechercher une entreprise par nom
 * @deprecated Utiliser useCompanySearch depuis @/domains/infrastructure/references/hooks/useCompanies
 */
export function useCompanySearch(companyName: string) {
  return useCompanySearchNew(companyName)
}

/**
 * Hook pour rechercher une profession par nom
 * @deprecated Utiliser useProfessionSearch depuis @/domains/infrastructure/references/hooks/useProfessions
 */
export function useProfessionSearch(professionName: string) {
  return useProfessionSearchNew(professionName)
}

/**
 * Hook pour créer une nouvelle entreprise
 * @deprecated Utiliser useCompanyMutations depuis @/domains/infrastructure/references/hooks/useCompanies
 */
export function useCreateCompany() {
  const { create } = useCompanyMutations()
  return {
    mutateAsync: async ({ companyName, adminId, additionalData }: { companyName: string; adminId: string; additionalData?: any }) => {
      return create.mutateAsync({
        name: companyName,
        adminId,
        ...additionalData,
      })
    },
  }
}

/**
 * Hook pour créer une nouvelle profession
 * @deprecated Utiliser useProfessionMutations depuis @/domains/infrastructure/references/hooks/useProfessions
 */
export function useCreateProfession() {
  const { create } = useProfessionMutations()
  return {
    mutateAsync: async ({ professionName, adminId, additionalData }: { professionName: string; adminId: string; additionalData?: any }) => {
      return create.mutateAsync({
        name: professionName,
        adminId,
        ...additionalData,
      })
    },
  }
}

/**
 * Hook pour mettre à jour l'entreprise dans une demande d'adhésion
 * @deprecated Cette fonctionnalité doit être implémentée dans membership.db.ts
 */
export function useUpdateMembershipRequestCompany() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ 
      requestId, 
      companyName 
    }: { 
      requestId: string; 
      companyName: string 
    }) => {
      // TODO: Implémenter updateMembershipRequestCompany dans membership.db.ts
      console.warn('updateMembershipRequestCompany doit être implémenté dans membership.db.ts')
      return Promise.resolve()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['membership-requests'] })
    },
  })
}

/**
 * Hook pour mettre à jour la profession dans une demande d'adhésion
 * @deprecated Cette fonctionnalité doit être implémentée dans membership.db.ts
 */
export function useUpdateMembershipRequestProfession() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ 
      requestId, 
      professionName 
    }: { 
      requestId: string; 
      professionName: string 
    }) => {
      // TODO: Implémenter updateMembershipRequestProfession dans membership.db.ts
      console.warn('updateMembershipRequestProfession doit être implémenté dans membership.db.ts')
      return Promise.resolve()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['membership-requests'] })
    },
  })
} 