'use client'

import { CHARITY_AUDIT_MODULE } from '@/constantes/audit-modules'
import { useAuditLogger } from '@/hooks/useAuditLog'
import { useAuth } from '@/hooks/useAuth'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { computeCharityStars, type CharityStarAdjustment, type MemberCharityStars } from '../entities/charity-stars.types'
import { CharityStarsService } from '../services/CharityStarsService'

const service = CharityStarsService.getInstance()

const STALE_TIME = 60 * 1000

/** Étoiles d'un membre. */
export function useMemberCharityStars(memberId?: string | null) {
  return useQuery<MemberCharityStars>({
    queryKey: ['charity-stars', memberId],
    queryFn: () => service.getMemberStars(memberId!),
    enabled: Boolean(memberId),
    staleTime: STALE_TIME,
    // Évite un `undefined` transitoire dans les affichages compacts.
    placeholderData: memberId ? computeCharityStars({ memberId }) : undefined,
  })
}

/**
 * Étoiles de plusieurs membres, pour les listes et les tableaux de participants.
 * La clé inclut les identifiants triés : deux pages différentes ne partagent pas
 * le même cache, mais un simple réordonnancement ne provoque pas de refetch.
 */
export function useCharityStarsMany(memberIds: string[]) {
  const sortedIds = Array.from(new Set(memberIds.filter(Boolean))).sort()

  return useQuery<Map<string, MemberCharityStars>>({
    queryKey: ['charity-stars', 'many', sortedIds],
    queryFn: () => service.getMemberStarsMany(sortedIds),
    enabled: sortedIds.length > 0,
    staleTime: STALE_TIME,
  })
}

/** Historique des retraits d'étoiles d'un membre. */
export function useCharityStarAdjustments(memberId?: string | null) {
  return useQuery<CharityStarAdjustment[]>({
    queryKey: ['charity-stars', memberId, 'adjustments'],
    queryFn: () => service.listAdjustments(memberId!),
    enabled: Boolean(memberId),
    staleTime: STALE_TIME,
  })
}

/** Retrait d'une étoile par un admin, avec motif et journalisation. */
export function useDeductCharityStar() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const { log } = useAuditLogger()

  return useMutation({
    mutationFn: ({ memberId, reason }: { memberId: string; reason: string }) => {
      if (!user?.uid) throw new Error('Utilisateur non authentifié')
      return service.deductStar({
        memberId,
        reason,
        adminId: user.uid,
        adminName: user.displayName?.trim() || user.email || undefined,
      })
    },
    onSuccess: (_result, variables) => {
      qc.invalidateQueries({ queryKey: ['charity-stars'] })
      log({
        action: 'update',
        ...CHARITY_AUDIT_MODULE,
        targetType: 'membre',
        targetId: variables.memberId,
        description: 'Retrait d’une étoile de charité',
        metadata: { reason: variables.reason },
      })
      toast.success('Étoile retranchée')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erreur lors du retrait de l’étoile')
    },
  })
}
