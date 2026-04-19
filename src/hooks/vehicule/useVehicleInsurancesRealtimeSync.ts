'use client'

import { collection, db, onSnapshot } from '@/firebase/firestore'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

const VEHICLE_INSURANCES_COLLECTION = 'vehicle-insurances'

/**
 * Synchronisation temps réel multi-admin pour le module Véhicules.
 * Couvre les actions de la liste et des vues détail/édition:
 * création, modification, renouvellement, suppression.
 */
export function useVehicleInsurancesRealtimeSync(enabled = true) {
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
        queryClient.invalidateQueries({ queryKey: ['vehicle-insurances'] })
      }, 250)
    }

    const unsubscribe = onSnapshot(
      collection(db, VEHICLE_INSURANCES_COLLECTION),
      () => {
        if (!hasReceivedInitialSnapshot.current) {
          hasReceivedInitialSnapshot.current = true
          return
        }
        scheduleInvalidation()
      },
      (error) => {
        console.error('[useVehicleInsurancesRealtimeSync] listener error:', error)
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

