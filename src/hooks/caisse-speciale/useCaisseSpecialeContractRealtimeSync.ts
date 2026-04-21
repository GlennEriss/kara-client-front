'use client'

import { firebaseCollectionNames } from '@/constantes/firebase-collection-names'
import { collection, db, doc, onSnapshot } from '@/firebase/firestore'
import { useEffect, useRef } from 'react'

interface UseCaisseSpecialeContractRealtimeSyncOptions {
  enabled?: boolean
  onContractChanged?: () => void
  onRefundsChanged?: () => void
}

/**
 * Synchronisation temps réel multi-admin pour le détail d'un contrat Caisse Spéciale.
 * Couvre les mises à jour du contrat + les remboursements (sous-collection refunds).
 */
export function useCaisseSpecialeContractRealtimeSync(
  contractId: string | undefined,
  options: UseCaisseSpecialeContractRealtimeSyncOptions = {}
) {
  const { enabled = true, onContractChanged, onRefundsChanged } = options

  const callbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!enabled || !contractId) return

    // Important:
    // À chaque (re)abonnement on ignore le 1er snapshot pour éviter une boucle
    // refetch -> render -> re-subscribe -> initial snapshot -> refetch.
    let isFirstContractSnapshot = true
    let isFirstRefundsSnapshot = true

    const scheduleCallback = (callback?: () => void) => {
      if (!callback) return
      if (callbackTimer.current) {
        clearTimeout(callbackTimer.current)
      }
      callbackTimer.current = setTimeout(() => {
        callback()
      }, 250)
    }

    const unsubscribeContract = onSnapshot(
      doc(db, firebaseCollectionNames.caisseContracts, contractId),
      () => {
        if (isFirstContractSnapshot) {
          isFirstContractSnapshot = false
          return
        }
        scheduleCallback(onContractChanged)
      },
      (error) => {
        console.error('[useCaisseSpecialeContractRealtimeSync] contract listener error:', error)
      }
    )

    const unsubscribeRefunds = onSnapshot(
      collection(db, `${firebaseCollectionNames.caisseContracts}/${contractId}/refunds`),
      () => {
        if (isFirstRefundsSnapshot) {
          isFirstRefundsSnapshot = false
          return
        }
        scheduleCallback(onRefundsChanged)
      },
      (error) => {
        console.error('[useCaisseSpecialeContractRealtimeSync] refunds listener error:', error)
      }
    )

    return () => {
      unsubscribeContract()
      unsubscribeRefunds()
      if (callbackTimer.current) {
        clearTimeout(callbackTimer.current)
      }
    }
  }, [enabled, contractId, onContractChanged, onRefundsChanged])
}
