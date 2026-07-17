'use client'

import { firebaseCollectionNames } from '@/constantes/firebase-collection-names'
import { collection, db, doc, onSnapshot } from '@/firebase/firestore'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

/**
 * Synchronisation temps réel multi-admin pour la page
 * /caisse-imprevue/contrats/[id].
 */
export function useCaisseImprevueContractRealtimeSync(contractId?: string, enabled = true) {
  const queryClient = useQueryClient()
  const initialSnapshotsSeen = useRef(0)
  const invalidateTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!enabled || !contractId) return

    const scheduleInvalidation = () => {
      if (invalidateTimer.current) {
        clearTimeout(invalidateTimer.current)
      }

      invalidateTimer.current = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['contractCI', contractId] })
        queryClient.invalidateQueries({ queryKey: ['contractsCI'] })
        queryClient.invalidateQueries({ queryKey: ['contractsCIStats'] })

        queryClient.invalidateQueries({ queryKey: ['paymentsCI', contractId] })
        queryClient.invalidateQueries({ queryKey: ['contract-payment-stats', contractId] })

        queryClient.invalidateQueries({ queryKey: ['support-ci-active', contractId] })
        queryClient.invalidateQueries({ queryKey: ['support-ci-history', contractId] })
        queryClient.invalidateQueries({ queryKey: ['support-ci-eligibility', contractId] })

        // Compatibilité avec des clés legacy présentes dans le module.
        queryClient.invalidateQueries({ queryKey: ['support-ci-active', contractId] })
        queryClient.invalidateQueries({ queryKey: ['support-ci-history', contractId] })
        queryClient.invalidateQueries({ queryKey: ['support-ci-eligibility', contractId] })
      }, 250)
    }

    const contractDocRef = doc(db, firebaseCollectionNames.contractsCI, contractId)
    const paymentsCollectionRef = collection(db, firebaseCollectionNames.contractsCI, contractId, 'payments')
    const supportsCollectionRef = collection(db, firebaseCollectionNames.contractsCI, contractId, 'supports')

    const onAnySnapshot = () => {
      if (initialSnapshotsSeen.current < 3) {
        initialSnapshotsSeen.current += 1
        return
      }
      scheduleInvalidation()
    }

    const unsubscribeContract = onSnapshot(
      contractDocRef,
      onAnySnapshot,
      (error) => {
        console.error('[useCaisseImprevueContractRealtimeSync] contract listener error:', error)
      }
    )

    const unsubscribePayments = onSnapshot(
      paymentsCollectionRef,
      onAnySnapshot,
      (error) => {
        console.error('[useCaisseImprevueContractRealtimeSync] payments listener error:', error)
      }
    )

    const unsubscribeSupports = onSnapshot(
      supportsCollectionRef,
      onAnySnapshot,
      (error) => {
        console.error('[useCaisseImprevueContractRealtimeSync] supports listener error:', error)
      }
    )

    return () => {
      unsubscribeContract()
      unsubscribePayments()
      unsubscribeSupports()
      if (invalidateTimer.current) {
        clearTimeout(invalidateTimer.current)
      }
    }
  }, [contractId, enabled, queryClient])
}

