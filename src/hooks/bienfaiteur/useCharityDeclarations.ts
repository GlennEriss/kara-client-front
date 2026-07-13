'use client'

/**
 * Déclarations d'intention de contribution faites par les MEMBRES depuis
 * l'app membre (collection top-level `charityContributions`, status "pending").
 *
 * Le gestionnaire les voit sur la fiche évènement et peut :
 *  - CONFIRMER : crée la contribution réelle (participant + contribution dans
 *    charity-events/{id}/contributions, comme une saisie manuelle) puis passe
 *    la déclaration à "confirmed" ;
 *  - REFUSER : passe la déclaration à "canceled".
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { collection, doc, getDocs, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore'
import { db } from '@/firebase/firestore'
import { CharityContributionService } from '@/services/bienfaiteur/CharityContributionService'
import { getUsersByMatricules } from '@/db/user.db'
import { useAuth } from '@/hooks/useAuth'
import { useAuditLogger } from '@/hooks/useAuditLog'
import type { CharityContributionInput, PaymentMode } from '@/types/types'

const DECLARATIONS_COLLECTION = 'charityContributions'

export type CharityDeclarationStatus = 'pending' | 'confirmed' | 'canceled'

export interface CharityDeclaration {
  id: string
  eventId: string
  /** Matricule du membre (ou id de secours) déclaré par l'app membre. */
  participantId: string
  participantName: string
  contributionType: 'money' | 'in_kind'
  amount?: number
  inKindDescription?: string
  estimatedValue?: number
  notes?: string
  status: CharityDeclarationStatus
  createdAt: Date
}

function toDate(v: unknown): Date {
  if (v instanceof Date) return v
  if (typeof (v as { toDate?: () => Date })?.toDate === 'function') {
    return (v as { toDate: () => Date }).toDate()
  }
  const d = new Date(v as string)
  return Number.isNaN(d.getTime()) ? new Date(0) : d
}

/** Déclarations des membres pour un évènement (plus récentes d'abord). */
export function useCharityDeclarations(eventId: string) {
  return useQuery<CharityDeclaration[]>({
    queryKey: ['charity-declarations', eventId],
    queryFn: async () => {
      const q = query(
        collection(db, DECLARATIONS_COLLECTION),
        where('eventId', '==', eventId),
        orderBy('createdAt', 'desc'),
      )
      const snap = await getDocs(q)
      return snap.docs.map((d) => {
        const data = d.data()
        return {
          id: d.id,
          eventId: String(data.eventId ?? ''),
          participantId: String(data.participantId ?? ''),
          participantName: String(data.participantName ?? '—'),
          contributionType: data.contributionType === 'in_kind' ? 'in_kind' : 'money',
          amount: data.payment?.amount ?? data.amount ?? undefined,
          inKindDescription: data.inKindDescription ?? undefined,
          estimatedValue: data.estimatedValue ?? undefined,
          notes: data.notes ?? undefined,
          status: (data.status as CharityDeclarationStatus) ?? 'pending',
          createdAt: toDate(data.createdAt),
        }
      })
    },
    enabled: !!eventId,
    staleTime: 60 * 1000,
  })
}

/**
 * Confirme une déclaration : retrouve le membre par matricule, crée la
 * contribution réelle (participant inclus) puis marque la déclaration.
 */
export function useConfirmCharityDeclaration() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { log } = useAuditLogger()

  return useMutation({
    mutationFn: async ({
      declaration,
      paymentMode = 'cash',
    }: {
      declaration: CharityDeclaration
      paymentMode?: PaymentMode
    }) => {
      if (!user?.uid) throw new Error('Utilisateur non authentifié')

      // Le participantId envoyé par l'app membre est le matricule.
      const byMatricule = await getUsersByMatricules([declaration.participantId])
      const member = byMatricule.get(declaration.participantId.trim())
      const memberId = member?.id ?? declaration.participantId
      if (!memberId) throw new Error('Membre introuvable pour cette déclaration')

      const now = new Date()
      const contribution: CharityContributionInput = {
        contributionType: declaration.contributionType,
        status: 'confirmed',
        contributionDate: now,
        notes: declaration.notes,
        ...(declaration.contributionType === 'money'
          ? {
              payment: {
                amount: Number(declaration.amount) || 0,
                mode: paymentMode,
                paymentType: 'Charity',
                date: now,
                time: now.toTimeString().slice(0, 5),
                acceptedBy: user.uid,
                recordedBy: user.uid,
                recordedByName: user.displayName || user.email || 'Admin',
                recordedAt: now,
              },
            }
          : {
              inKindDescription: declaration.inKindDescription || '',
              ...(declaration.estimatedValue ? { estimatedValue: Number(declaration.estimatedValue) } : {}),
            }),
      }

      await CharityContributionService.addParticipantWithContribution(
        declaration.eventId,
        memberId,
        undefined,
        contribution,
        user.uid,
      )

      await updateDoc(doc(db, DECLARATIONS_COLLECTION, declaration.id), {
        status: 'confirmed',
        processedBy: user.uid,
        processedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      return declaration
    },
    onSuccess: (declaration) => {
      queryClient.invalidateQueries({ queryKey: ['charity-declarations', declaration.eventId] })
      queryClient.invalidateQueries({ queryKey: ['charity-contributions', declaration.eventId] })
      queryClient.invalidateQueries({ queryKey: ['charity-participants', declaration.eventId] })
      queryClient.invalidateQueries({ queryKey: ['charity-events', declaration.eventId] })
      log({
        action: 'validate',
        module: 'bienfaiteur',
        moduleLabel: 'Bienfaiteur',
        targetType: 'déclaration de contribution',
        targetId: declaration.id,
        description: `Confirmation de la déclaration de ${declaration.participantName}`,
      })
    },
  })
}

/** Refuse une déclaration (status "canceled") sans créer de contribution. */
export function useCancelCharityDeclaration() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { log } = useAuditLogger()

  return useMutation({
    mutationFn: async (declaration: CharityDeclaration) => {
      await updateDoc(doc(db, DECLARATIONS_COLLECTION, declaration.id), {
        status: 'canceled',
        processedBy: user?.uid ?? 'system',
        processedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      return declaration
    },
    onSuccess: (declaration) => {
      queryClient.invalidateQueries({ queryKey: ['charity-declarations', declaration.eventId] })
      log({
        action: 'reject',
        module: 'bienfaiteur',
        moduleLabel: 'Bienfaiteur',
        targetType: 'déclaration de contribution',
        targetId: declaration.id,
        description: `Refus de la déclaration de ${declaration.participantName}`,
      })
    },
  })
}
