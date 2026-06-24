'use client'

import { getUsersByMatricules } from '@/db/user.db'
import type { User } from '@/types/types'
import { useQuery } from '@tanstack/react-query'

/**
 * Résout un membre à partir de son matricule (recherche par champ `matricule`).
 * Renvoie `null` si aucun membre ne correspond.
 */
export function useMemberByMatricule(matricule?: string | null) {
  const key = (matricule ?? '').trim()
  return useQuery<User | null>({
    queryKey: ['memberByMatricule', key],
    enabled: key.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const map = await getUsersByMatricules([key])
      return map.get(key) ?? null
    },
  })
}
