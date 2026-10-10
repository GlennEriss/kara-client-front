'use client'

import { useQuery } from '@tanstack/react-query'
import { getMembershipRequestByDossier } from '@/db/member.db'

/**
 * La date de délivrance de la pièce d'identité n'est pas recopiée sur la fiche
 * membre : elle reste dans le dossier d'adhésion. Les PDF l'affichent comme la
 * fiche d'adhésion ; ce hook la joint au membre.
 */
export function useWithIdentityIssuingDate<T extends { dossier?: string | null } | null | undefined>(
  member: T,
): T extends null | undefined ? T : T & { identityDocumentIssuingDate?: unknown } {
  const dossierId = member?.dossier || undefined
  const { data: issuingDate } = useQuery({
    queryKey: ['membership-request', 'identity-issuing-date', dossierId],
    queryFn: async () => {
      const request = await getMembershipRequestByDossier(dossierId as string)
      return (request?.documents?.issuingDate as unknown) ?? null
    },
    enabled: !!dossierId,
    staleTime: 10 * 60 * 1000,
  })
  if (!member || !issuingDate) return member as never
  return { ...member, identityDocumentIssuingDate: issuingDate } as never
}
