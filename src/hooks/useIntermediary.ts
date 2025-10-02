import { useQuery } from '@tanstack/react-query'
import { getUserById } from '@/db/user.db'
import { getAdminById } from '@/db/admin.db'

interface IntermediaryInfo {
  firstName: string
  lastName: string
  type: 'user' | 'admin'
}

/**
 * Hook pour récupérer les informations d'un intermédiaire (parrain)
 * Cherche d'abord dans la collection users, puis dans admins
 */
export function useIntermediary(intermediaryCode?: string) {
  return useQuery<IntermediaryInfo | null>({
    queryKey: ['intermediary', intermediaryCode],
    queryFn: async (): Promise<IntermediaryInfo | null> => {
      if (!intermediaryCode) return null

      try {
        // Chercher d'abord dans la collection users
        const user = await getUserById(intermediaryCode)
        if (user) {
          return {
            firstName: user.firstName,
            lastName: user.lastName,
            type: 'user'
          }
        }

        // Si pas trouvé dans users, chercher dans admins
        const admin = await getAdminById(intermediaryCode)
        if (admin) {
          return {
            firstName: admin.firstName,
            lastName: admin.lastName,
            type: 'admin'
          }
        }

        return null
      } catch (error) {
        console.error('Erreur lors de la récupération de l\'intermédiaire:', error)
        return null
      }
    },
    enabled: !!intermediaryCode,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}
