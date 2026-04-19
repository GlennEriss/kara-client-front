'use client'

import { firebaseCollectionNames } from '@/constantes/firebase-collection-names'
import { collection, db, onSnapshot } from '@/firebase/firestore'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

/**
 * Synchronisation temps réel multi-admin pour les pages
 * de demandes crédit (spéciale/fixe/aide).
 */
export function useCreditDemandesRealtimeSync(enabled = true) {
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
        queryClient.invalidateQueries({ queryKey: ['creditDemands'] })
        queryClient.invalidateQueries({ queryKey: ['creditDemandsStats'] })
        queryClient.invalidateQueries({ queryKey: ['creditDemand'] })
        queryClient.invalidateQueries({ queryKey: ['creditContracts'] })
        queryClient.invalidateQueries({ queryKey: ['creditContractsStats'] })
      }, 250)
    }

    const unsubscribeDemands = onSnapshot(
      collection(db, firebaseCollectionNames.creditDemands),
      () => {
        if (initialSnapshotsSeen.current < 2) {
          initialSnapshotsSeen.current += 1
          return
        }
        scheduleInvalidation()
      },
      (error) => {
        console.error('[useCreditDemandesRealtimeSync] demands listener error:', error)
      }
    )

    const unsubscribeContracts = onSnapshot(
      collection(db, firebaseCollectionNames.creditContracts),
      () => {
        if (initialSnapshotsSeen.current < 2) {
          initialSnapshotsSeen.current += 1
          return
        }
        scheduleInvalidation()
      },
      (error) => {
        console.error('[useCreditDemandesRealtimeSync] contracts listener error:', error)
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

