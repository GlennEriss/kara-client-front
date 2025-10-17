'use client'

import { useQuery } from '@tanstack/react-query'
import { ServiceFactory } from '@/factories/ServiceFactory'

/**
 * Hook pour récupérer un document par son ID
 * Utilise le service CaisseImprevueService via ServiceFactory (singleton)
 */
export const useDocumentCI = (documentId: string | undefined) => {
  return useQuery({
    queryKey: ['documentCI', documentId],
    queryFn: async () => {
      if (!documentId) return null
      
      try {
        const service = ServiceFactory.getCaisseImprevueService()
        return await service.getDocumentById(documentId)
      } catch (error) {
        console.error('Erreur lors de la récupération du document:', error)
        throw error
      }
    },
    enabled: !!documentId, // Ne lance la requête que si documentId est défini
    staleTime: 1000 * 60 * 10, // 10 minutes
  })
}
