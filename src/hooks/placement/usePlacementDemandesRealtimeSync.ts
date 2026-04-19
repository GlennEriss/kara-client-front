'use client'

import { firebaseCollectionNames } from '@/constantes/firebase-collection-names'
import { collection, db, onSnapshot } from '@/firebase/firestore'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

/**
 * Synchronisation temps réel multi-admin pour la page
 * /placements/demandes (liste + détails + conversion en placement).
 */
export function usePlacementDemandesRealtimeSync(enabled = true) {
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
        queryClient.invalidateQueries({ queryKey: ['placementDemands'] })
        queryClient.invalidateQueries({ queryKey: ['placementDemandsStats'] })
        queryClient.invalidateQueries({ queryKey: ['placementDemand'] })
        queryClient.invalidateQueries({ queryKey: ['placements'] })
      }, 250)
    }

    const onCollectionChange = () => {
      if (initialSnapshotsSeen.current < 2) {
        initialSnapshotsSeen.current += 1
        return
      }
      scheduleInvalidation()
    }

    const unsubscribeDemands = onSnapshot(
      collection(db, firebaseCollectionNames.placementDemands),
      onCollectionChange,
      (error) => {
        console.error('[usePlacementDemandesRealtimeSync] demands listener error:', error)
      }
    )

    const unsubscribePlacements = onSnapshot(
      collection(db, firebaseCollectionNames.placements),
      onCollectionChange,
      (error) => {
        console.error('[usePlacementDemandesRealtimeSync] placements listener error:', error)
      }
    )

    return () => {
      unsubscribeDemands()
      unsubscribePlacements()
      if (invalidateTimer.current) {
        clearTimeout(invalidateTimer.current)
      }
    }
  }, [enabled, queryClient])
}

