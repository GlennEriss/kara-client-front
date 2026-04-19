'use client'

import { firebaseCollectionNames } from '@/constantes/firebase-collection-names'
import { collection, db, onSnapshot } from '@/firebase/firestore'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

/**
 * Synchronisation temps réel multi-admin pour les pages
 * de liste des contrats crédit (spéciale/fixe/aide).
 */
export function useCreditContractsRealtimeSync(enabled = true) {
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
        queryClient.invalidateQueries({ queryKey: ['creditContracts'] })
        queryClient.invalidateQueries({ queryKey: ['creditContractsStats'] })
        queryClient.invalidateQueries({ queryKey: ['creditContract'] })
      }, 250)
    }

    const unsubscribe = onSnapshot(
      collection(db, firebaseCollectionNames.creditContracts),
      () => {
        if (!hasReceivedInitialSnapshot.current) {
          hasReceivedInitialSnapshot.current = true
          return
        }
        scheduleInvalidation()
      },
      (error) => {
        console.error('[useCreditContractsRealtimeSync] listener error:', error)
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

