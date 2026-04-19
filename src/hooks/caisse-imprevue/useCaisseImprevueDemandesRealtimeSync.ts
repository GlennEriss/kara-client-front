'use client'

import { firebaseCollectionNames } from '@/constantes/firebase-collection-names'
import { collection, db, onSnapshot } from '@/firebase/firestore'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

/**
 * Synchronisation temps réel multi-admin pour la page
 * /caisse-imprevue/demandes.
 *
 * Couvre les actions: accepter, rejeter, réouvrir, supprimer,
 * créer un contrat depuis une demande.
 */
export function useCaisseImprevueDemandesRealtimeSync(enabled = true) {
  const queryClient = useQueryClient()
  const initialSnapshotsSeen = useRef(0)
  const invalidateTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!enabled) return

    const scheduleInvalidation = () => {
      if (invalidateTimer.current) {
        clearTimeout(invalidateTimer.current)
      }

      invalidateTimer.current = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['caisse-imprevue-demands'] })
        queryClient.invalidateQueries({ queryKey: ['caisse-imprevue-demands-stats'] })
        queryClient.invalidateQueries({ queryKey: ['demand-detail'] })
        queryClient.invalidateQueries({ queryKey: ['contractsCI'] })
        queryClient.invalidateQueries({ queryKey: ['contractsCIStats'] })
      }, 250)
    }

    const unsubscribeDemands = onSnapshot(
      collection(db, firebaseCollectionNames.caisseImprevueDemands),
      () => {
        if (initialSnapshotsSeen.current < 2) {
          initialSnapshotsSeen.current += 1
          return
        }
        scheduleInvalidation()
      },
      (error) => {
        console.error('[useCaisseImprevueDemandesRealtimeSync] demands listener error:', error)
      }
    )

    const unsubscribeContracts = onSnapshot(
      collection(db, firebaseCollectionNames.contractsCI),
      () => {
        if (initialSnapshotsSeen.current < 2) {
          initialSnapshotsSeen.current += 1
          return
        }
        scheduleInvalidation()
      },
      (error) => {
        console.error('[useCaisseImprevueDemandesRealtimeSync] contracts listener error:', error)
      }
    )

    return () => {
      unsubscribeDemands()
      unsubscribeContracts()
      if (invalidateTimer.current) {
        clearTimeout(invalidateTimer.current)
      }
    }
  }, [enabled, queryClient])
}

