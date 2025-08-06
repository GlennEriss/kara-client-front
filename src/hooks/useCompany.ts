/**
 * @module useCompany
 * React Query hooks for company and profession operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  findCompanyByName, 
  createCompany, 
  findProfessionByName, 
  createProfession,
  updateMembershipRequestCompany,
  updateMembershipRequestProfession
} from '@/db/company.db'
import type { CompanySearchResult, ProfessionSearchResult } from '@/types/types'

/**
 * Hook pour rechercher une entreprise par nom
 */
export function useCompanySearch(companyName: string) {
  return useQuery<CompanySearchResult>({
    queryKey: ['company-search', companyName],
    queryFn: () => findCompanyByName(companyName),
    enabled: !!companyName && companyName.length >= 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook pour rechercher une profession par nom
 */
export function useProfessionSearch(professionName: string) {
  return useQuery<ProfessionSearchResult>({
    queryKey: ['profession-search', professionName],
    queryFn: () => findProfessionByName(professionName),
    enabled: !!professionName && professionName.length >= 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook pour créer une nouvelle entreprise
 */
export function useCreateCompany() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ 
      companyName, 
      adminId, 
      additionalData 
    }: { 
      companyName: string; 
      adminId: string; 
      additionalData?: any 
    }) => createCompany(companyName, adminId, additionalData),
    onSuccess: () => {
      // Invalider les recherches d'entreprises
      queryClient.invalidateQueries({ queryKey: ['company-search'] })
    },
  })
}

/**
 * Hook pour créer une nouvelle profession
 */
export function useCreateProfession() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ 
      professionName, 
      adminId, 
      additionalData 
    }: { 
      professionName: string; 
      adminId: string; 
      additionalData?: any 
    }) => createProfession(professionName, adminId, additionalData),
    onSuccess: () => {
      // Invalider les recherches de professions
      queryClient.invalidateQueries({ queryKey: ['profession-search'] })
    },
  })
}

/**
 * Hook pour mettre à jour l'entreprise dans une demande d'adhésion
 */
export function useUpdateMembershipRequestCompany() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ 
      requestId, 
      companyName 
    }: { 
      requestId: string; 
      companyName: string 
    }) => updateMembershipRequestCompany(requestId, companyName),
    onSuccess: () => {
      // Invalider les données des demandes d'adhésion
      queryClient.invalidateQueries({ queryKey: ['membership-requests'] })
    },
  })
}

/**
 * Hook pour mettre à jour la profession dans une demande d'adhésion
 */
export function useUpdateMembershipRequestProfession() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ 
      requestId, 
      professionName 
    }: { 
      requestId: string; 
      professionName: string 
    }) => updateMembershipRequestProfession(requestId, professionName),
    onSuccess: () => {
      // Invalider les données des demandes d'adhésion
      queryClient.invalidateQueries({ queryKey: ['membership-requests'] })
    },
  })
} 