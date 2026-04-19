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

  const initializedContractSnapshot = useRef(false)
  const initializedRefundsSnapshot = useRef(false)
  const callbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!enabled || !contractId) return

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
        if (!initializedContractSnapshot.current) {
          initializedContractSnapshot.current = true
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
        if (!initializedRefundsSnapshot.current) {
          initializedRefundsSnapshot.current = true
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

