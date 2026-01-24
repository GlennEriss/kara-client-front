/**
 * Hook React Query pour les statistiques des membres (V2)
 * 
 * Calcule les statistiques à partir des membres fournis ou récupère les stats globales.
 * Utilise MembershipStatsService pour le calcul.
 */

'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { MemberWithSubscription, PaginatedMembers } from '@/db/member.db'
import { MembershipStatsService, type MembershipStatsV2 } from '../services/MembershipStatsService'
import { MembersRepositoryV2 } from '../repositories/MembersRepositoryV2'

export interface UseMembershipStatsOptions {
  /**
   * Option A : Calculer depuis les membres fournis (comme actuellement dans MembershipList)
   * Si fourni, les stats seront calculées localement depuis cette liste
   */
  members?: MemberWithSubscription[] | PaginatedMembers | null

  /**
   * Option B : Récupérer les stats globales depuis Firestore
   * Si members n'est pas fourni, récupère tous les membres pour calculer les stats
   */
  fetchGlobal?: boolean

  /**
   * Activer/désactiver la requête
   */
  enabled?: boolean
}

export interface UseMembershipStatsResult {
  stats: MembershipStatsV2 | null
  isLoading: boolean
  isError: boolean
  error: unknown
  refetch: () => Promise<unknown>
}

/**
 * Hook pour récupérer les statistiques des membres
 * 
 * @param options - Options de configuration
 * @returns Statistiques et état de chargement
 */
export function useMembershipStats(
  options: UseMembershipStatsOptions = {},
): UseMembershipStatsResult {
  const { members, fetchGlobal = false, enabled = true } = options

  // Option A : Calculer depuis les membres fournis
  const localStats = useMemo(() => {
    if (!members) return null

    if ('data' in members && 'pagination' in members) {
      // PaginatedMembers
      return MembershipStatsService.calculateStats(members as PaginatedMembers)
    } else if (Array.isArray(members)) {
      // Array<MemberWithSubscription>
      return MembershipStatsService.calculateStatsFromMembers(members)
    }

    return null
  }, [members])

  // Option B : Récupérer les stats globales depuis Firestore
  const globalStatsQuery = useQuery<MembershipStatsV2 | null>({
    queryKey: ['memberships', 'stats', 'global'],
    queryFn: async () => {
      const repository = MembersRepositoryV2.getInstance()
      
      // Récupérer tous les membres (sans pagination pour les stats globales)
      // On peut utiliser une limite élevée ou récupérer par batch
      const result = await repository.getAll({}, 1, 10000) // Limite élevée pour récupérer tous les membres
      
      return MembershipStatsService.calculateStats(result)
    },
    enabled: enabled && fetchGlobal && !members,
    staleTime: 10 * 60 * 1000, // 10 minutes (stats globales changent moins souvent)
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false,
  })

  // Si on a des membres fournis, utiliser le calcul local
  if (members !== undefined) {
    return {
      stats: localStats,
      isLoading: false,
      isError: false,
      error: null,
      refetch: async () => {
        // Pour le calcul local, refetch ne fait rien
        return Promise.resolve(null)
      },
    }
  }

  // Sinon, utiliser les stats globales
  return {
    stats: globalStatsQuery.data ?? null,
    isLoading: globalStatsQuery.isLoading,
    isError: globalStatsQuery.isError,
    error: globalStatsQuery.error,
    refetch: globalStatsQuery.refetch,
  }
}
