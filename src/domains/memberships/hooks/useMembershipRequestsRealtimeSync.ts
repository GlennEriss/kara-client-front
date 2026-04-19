'use client'

import {
  MEMBERSHIP_REQUEST_CACHE,
  MEMBERSHIP_REQUEST_COLLECTIONS,
} from '@/constantes/membership-requests'
import { collection, db, onSnapshot } from '@/firebase/firestore'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

/**
 * Synchronisation temps réel des données de la page membership-requests.
 *
 * Objectif: en mode multi-admin, refléter immédiatement les actions d'un admin
 * (paiement, approbation, rejet, corrections, réouverture, suppression)
 * sur les sessions des autres admins.
 */
export function useMembershipRequestsRealtimeSync(enabled = true) {
  const queryClient = useQueryClient()
  const initialSnapshotsSeen = useRef(0)
  const invalidateTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!enabled) return

    const scheduleInvalidation = () => {
      if (invalidateTimer.current) {
        clearTimeout(invalidateTimer.current)
      }

      // Petit debounce pour éviter plusieurs refetch successifs
      // lors d'un lot d'écritures Firestore.
      invalidateTimer.current = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: [MEMBERSHIP_REQUEST_CACHE.QUERY_KEY] })
        queryClient.invalidateQueries({ queryKey: [MEMBERSHIP_REQUEST_CACHE.STATS_QUERY_KEY] })
        queryClient.invalidateQueries({ queryKey: [MEMBERSHIP_REQUEST_CACHE.DUPLICATES_ALERT_QUERY_KEY] })
        queryClient.invalidateQueries({ queryKey: [MEMBERSHIP_REQUEST_CACHE.DUPLICATES_GROUPS_QUERY_KEY] })
      }, 250)
    }

    const unsubscribeMembershipRequests = onSnapshot(
      collection(db, MEMBERSHIP_REQUEST_COLLECTIONS.REQUESTS),
      () => {
        if (initialSnapshotsSeen.current < 2) {
          initialSnapshotsSeen.current += 1
          return
        }
        scheduleInvalidation()
      },
      (error) => {
        console.error('[useMembershipRequestsRealtimeSync] membership-requests listener error:', error)
      }
    )

    const unsubscribeDuplicateGroups = onSnapshot(
      collection(db, 'duplicate-groups'),
      () => {
        if (initialSnapshotsSeen.current < 2) {
          initialSnapshotsSeen.current += 1
          return
        }
        scheduleInvalidation()
      },
      (error) => {
        console.error('[useMembershipRequestsRealtimeSync] duplicate-groups listener error:', error)
      }
    )

    return () => {
      unsubscribeMembershipRequests()
      unsubscribeDuplicateGroups()
      if (invalidateTimer.current) {
        clearTimeout(invalidateTimer.current)
      }
    }
  }, [enabled, queryClient])
}
