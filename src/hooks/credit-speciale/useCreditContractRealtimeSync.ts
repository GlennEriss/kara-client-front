'use client'

import { firebaseCollectionNames } from '@/constantes/firebase-collection-names'
import { collection, db, doc, onSnapshot, query, where } from '@/firebase/firestore'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

/**
 * Synchronisation temps réel multi-admin pour la page
 * détail d'un contrat crédit.
 */
export function useCreditContractRealtimeSync(creditId?: string, enabled = true) {
  const queryClient = useQueryClient()
  const initialSnapshotsSeen = useRef(0)
  const invalidateTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!enabled || !creditId) return

    const listenersCount = 6

    const scheduleInvalidation = () => {
      if (invalidateTimer.current) {
        clearTimeout(invalidateTimer.current)
      }

      invalidateTimer.current = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['creditContract', creditId] })
        queryClient.invalidateQueries({ queryKey: ['creditContract'] })
        queryClient.invalidateQueries({ queryKey: ['creditContracts'] })
        queryClient.invalidateQueries({ queryKey: ['creditContractsStats'] })

        queryClient.invalidateQueries({ queryKey: ['creditPayments'] })
        queryClient.invalidateQueries({ queryKey: ['creditPayments', 'creditId', creditId] })
        queryClient.invalidateQueries({ queryKey: ['creditInstallments'] })
        queryClient.invalidateQueries({ queryKey: ['creditInstallments', 'creditId', creditId] })
        queryClient.invalidateQueries({ queryKey: ['creditPenalties'] })
        queryClient.invalidateQueries({ queryKey: ['creditPenalties', 'creditId', creditId] })
        queryClient.invalidateQueries({ queryKey: ['creditPenalties', 'unpaid', 'creditId', creditId] })
        queryClient.invalidateQueries({ queryKey: ['guarantorRemunerations'] })
        queryClient.invalidateQueries({ queryKey: ['guarantorRemunerations', 'creditId', creditId] })
        queryClient.invalidateQueries({ queryKey: ['guarantorPayments'] })
        queryClient.invalidateQueries({ queryKey: ['guarantorPayments', 'creditId', creditId] })
      }, 250)
    }

    const onAnySnapshot = () => {
      if (initialSnapshotsSeen.current < listenersCount) {
        initialSnapshotsSeen.current += 1
        return
      }
      scheduleInvalidation()
    }

    const unsubscribeContract = onSnapshot(
      doc(db, firebaseCollectionNames.creditContracts, creditId),
      onAnySnapshot,
      (error) => {
        console.error('[useCreditContractRealtimeSync] contract listener error:', error)
      }
    )

    const unsubscribePayments = onSnapshot(
      query(collection(db, firebaseCollectionNames.creditPayments), where('creditId', '==', creditId)),
      onAnySnapshot,
      (error) => {
        console.error('[useCreditContractRealtimeSync] payments listener error:', error)
      }
    )

    const unsubscribeInstallments = onSnapshot(
      query(collection(db, firebaseCollectionNames.creditInstallments), where('creditId', '==', creditId)),
      onAnySnapshot,
      (error) => {
        console.error('[useCreditContractRealtimeSync] installments listener error:', error)
      }
    )

    const unsubscribePenalties = onSnapshot(
      query(collection(db, firebaseCollectionNames.creditPenalties), where('creditId', '==', creditId)),
      onAnySnapshot,
      (error) => {
        console.error('[useCreditContractRealtimeSync] penalties listener error:', error)
      }
    )

    const unsubscribeGuarantorRemunerations = onSnapshot(
      query(collection(db, firebaseCollectionNames.guarantorRemunerations), where('creditId', '==', creditId)),
      onAnySnapshot,
      (error) => {
        console.error('[useCreditContractRealtimeSync] guarantor remunerations listener error:', error)
      }
    )

    const unsubscribeGuarantorPayments = onSnapshot(
      query(collection(db, firebaseCollectionNames.guarantorPayments), where('creditId', '==', creditId)),
      onAnySnapshot,
      (error) => {
        console.error('[useCreditContractRealtimeSync] guarantor payments listener error:', error)
      }
    )

    return () => {
      unsubscribeContract()
      unsubscribePayments()
      unsubscribeInstallments()
      unsubscribePenalties()
      unsubscribeGuarantorRemunerations()
      unsubscribeGuarantorPayments()
      if (invalidateTimer.current) {
        clearTimeout(invalidateTimer.current)
      }
    }
  }, [creditId, enabled, queryClient])
}

