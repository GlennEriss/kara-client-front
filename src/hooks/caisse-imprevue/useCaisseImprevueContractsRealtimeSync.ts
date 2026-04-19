'use client'

import { firebaseCollectionNames } from '@/constantes/firebase-collection-names'
import { collection, db, onSnapshot } from '@/firebase/firestore'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

/**
 * Synchronisation temps réel multi-admin pour la page
 * /caisse-imprevue (liste des contrats).
 */
export function useCaisseImprevueContractsRealtimeSync(enabled = true) {
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
        queryClient.invalidateQueries({ queryKey: ['contractsCI'] })
        queryClient.invalidateQueries({ queryKey: ['contractsCIStats'] })
      }, 250)
    }

    const unsubscribe = onSnapshot(
      collection(db, firebaseCollectionNames.contractsCI),
      () => {
        if (!hasReceivedInitialSnapshot.current) {
          hasReceivedInitialSnapshot.current = true
          return
        }
        scheduleInvalidation()
      },
      (error) => {
        console.error('[useCaisseImprevueContractsRealtimeSync] listener error:', error)
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

