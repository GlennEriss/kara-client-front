'use client'

import { collection, db, onSnapshot } from '@/firebase/firestore'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

const CHARITY_EVENTS_COLLECTION = 'charity-events'

/**
 * Synchronisation temps réel multi-admin pour la page /bienfaiteur.
 * Met à jour le snapshot (stats globales + liste + détails/exports) quand
 * un évènement est créé/modifié/supprimé par une autre session admin.
 */
export function useCharityEventsRealtimeSync(enabled = true) {
  const queryClient = useQueryClient()
  const hasReceivedInitialSnapshot = useRef(false)
  const invalidateTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!enabled) return

    const scheduleInvalidation = () => {
      if (invalidateTimer.current) {
        clearTimeout(invalidateTimer.current)
      }

      invalidateTimer.current = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['charity-events'] })
      }, 250)
    }

    const unsubscribe = onSnapshot(
      collection(db, CHARITY_EVENTS_COLLECTION),
      () => {
        if (!hasReceivedInitialSnapshot.current) {
          hasReceivedInitialSnapshot.current = true
          return
        }
        scheduleInvalidation()
      },
      (error) => {
        console.error('[useCharityEventsRealtimeSync] listener error:', error)
      }
    )

    return () => {
      unsubscribe()
      if (invalidateTimer.current) {
        clearTimeout(invalidateTimer.current)
      }
    }
  }, [enabled, queryClient])
}

