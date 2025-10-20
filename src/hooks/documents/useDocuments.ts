import { useQuery } from '@tanstack/react-query'
import { RepositoryFactory } from '@/factories/RepositoryFactory'
import { DocumentFilters } from '@/repositories/documents/IDocumentRepository'

export const useDocuments = (filters?: DocumentFilters) => {
  return useQuery({
    queryKey: ['documents', filters],
    queryFn: async () => {
      const documentRepository = RepositoryFactory.getDocumentRepository()
      return await documentRepository.getAllDocuments(filters)
    },
    staleTime: 1000 * 60 * 2, // 2 minutes de cache
  })
}

