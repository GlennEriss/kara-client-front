import { useQuery } from '@tanstack/react-query'
import { ServiceFactory } from '@/factories/ServiceFactory'
import { Admin } from '@/types/types'

/**
 * Hook React Query pour récupérer un administrateur par son ID
 * Utilise le service centralisé via ServiceFactory (singleton)
 * 
 * @param id - L'ID de l'administrateur
 * @returns Query result avec les données de l'admin
 */
export function useAdmin(id: string | undefined | null) {
  const service = ServiceFactory.getCaisseImprevueService()

  return useQuery<Admin | null, Error>({
    queryKey: ['admin', id],
    queryFn: async () => {
      if (!id) return null
      return await service.getAdminById(id)
    },
    enabled: !!id, // N'exécuter que si id est fourni
    staleTime: 10 * 60 * 1000, // Les données restent fraîches pendant 10 minutes
    gcTime: 30 * 60 * 1000, // Garde le cache pendant 30 minutes
    retry: 2, // Réessaye 2 fois en cas d'erreur
  })
}


