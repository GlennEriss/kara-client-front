'use client'

import { firebaseCollectionNames } from '@/constantes/firebase-collection-names'
import { collection, db, onSnapshot } from '@/firebase/firestore'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

/**
 * Synchronisation temps réel multi-admin pour la page
 * /caisse-speciale (contrats).
 */
export function useCaisseSpecialeContractsRealtimeSync(enabled = true) {
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
        queryClient.invalidateQueries({ queryKey: ['caisse-contracts'] })
        queryClient.invalidateQueries({ queryKey: ['caisse-contracts-stats'] })
        queryClient.invalidateQueries({ queryKey: ['caisse-contract'] })
        queryClient.invalidateQueries({ queryKey: ['caisse-contract-payments'] })

        // Données liées qui peuvent évoluer après conversion/suppression.
        queryClient.invalidateQueries({ queryKey: ['caisseSpecialeDemands'] })
        queryClient.invalidateQueries({ queryKey: ['caisseSpecialeDemandsStats'] })
      }, 250)
    }

    const unsubscribeContracts = onSnapshot(
      collection(db, firebaseCollectionNames.caisseContracts),
      () => {
        if (initialSnapshotsSeen.current < 2) {
          initialSnapshotsSeen.current += 1
          return
        }
        scheduleInvalidation()
      },
      (error) => {
        console.error('[useCaisseSpecialeContractsRealtimeSync] contracts listener error:', error)
      }
    )

    const unsubscribeDemands = onSnapshot(
      collection(db, firebaseCollectionNames.caisseSpecialeDemands),
      () => {
        if (initialSnapshotsSeen.current < 2) {
          initialSnapshotsSeen.current += 1
          return
        }
        scheduleInvalidation()
      },
      (error) => {
        console.error('[useCaisseSpecialeContractsRealtimeSync] demands listener error:', error)
      }
    )

    return () => {
      unsubscribeContracts()
      unsubscribeDemands()
      if (invalidateTimer.current) {
        clearTimeout(invalidateTimer.current)
      }
    }
  }, [enabled, queryClient])
}

