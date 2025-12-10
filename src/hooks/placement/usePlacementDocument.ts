'use client'

import { useQuery } from '@tanstack/react-query'
import { RepositoryFactory } from '@/factories/RepositoryFactory'

/**
 * Hook pour récupérer un document de placement par son ID
 */
export const usePlacementDocument = (documentId: string | undefined | null) => {
  return useQuery({
    queryKey: ['placementDocument', documentId],
    queryFn: async () => {
      if (!documentId) return null
      
      try {
        const repository = RepositoryFactory.getDocumentRepository()
        return await repository.getDocumentById(documentId)
      } catch (error) {
        console.error('Erreur lors de la récupération du document:', error)
        throw error
      }
    },
    enabled: !!documentId,
    staleTime: 1000 * 60 * 10, // 10 minutes
  })
}

