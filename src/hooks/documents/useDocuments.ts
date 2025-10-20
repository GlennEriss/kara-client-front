import { useQuery } from '@tanstack/react-query'
import { RepositoryFactory } from '@/factories/RepositoryFactory'
import { DocumentFilters, PaginatedDocuments } from '@/repositories/documents/IDocumentRepository'

export const useDocuments = (filters?: DocumentFilters) => {
  return useQuery<PaginatedDocuments>({
    queryKey: ['documents', filters],
    queryFn: async () => {
      const documentRepository = RepositoryFactory.getDocumentRepository()
      return await documentRepository.getPaginatedDocuments(filters)
    },
    staleTime: 1000 * 60 * 2, // 2 minutes de cache
  })
}

