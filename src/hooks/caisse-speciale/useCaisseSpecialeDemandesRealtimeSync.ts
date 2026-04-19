'use client'

import { firebaseCollectionNames } from '@/constantes/firebase-collection-names'
import { collection, db, onSnapshot } from '@/firebase/firestore'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

/**
 * Synchronisation temps réel multi-admin pour la page
 * /caisse-speciale/demandes.
 */
export function useCaisseSpecialeDemandesRealtimeSync(enabled = true) {
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
        queryClient.invalidateQueries({ queryKey: ['caisseSpecialeDemands'] })
        queryClient.invalidateQueries({ queryKey: ['caisseSpecialeDemandsStats'] })
        queryClient.invalidateQueries({ queryKey: ['caisseSpecialeDemand'] })
        queryClient.invalidateQueries({ queryKey: ['caisseContracts'] })
      }, 250)
    }

    const unsubscribe = onSnapshot(
      collection(db, firebaseCollectionNames.caisseSpecialeDemands),
      () => {
        if (!hasReceivedInitialSnapshot.current) {
          hasReceivedInitialSnapshot.current = true
          return
        }
        scheduleInvalidation()
      },
      (error) => {
        console.error('[useCaisseSpecialeDemandesRealtimeSync] listener error:', error)
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

