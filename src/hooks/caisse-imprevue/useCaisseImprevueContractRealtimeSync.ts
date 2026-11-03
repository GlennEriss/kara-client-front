'use client'

import { firebaseCollectionNames } from '@/constantes/firebase-collection-names'
import { collection, db, doc, onSnapshot } from '@/firebase/firestore'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

/** Synchronisation multi-admin : chaque source invalide seulement ses données dépendantes. */
export function useCaisseImprevueContractRealtimeSync(contractId?: string, enabled = true) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!enabled || !contractId) return
    let active = true
    let timer: ReturnType<typeof setTimeout> | undefined
    const pendingKeys = new Set<string>()
    const globalKeys = new Set(['contractsCI', 'contractsCIStats'])

    const onChanges = (source: 'contract' | 'payments' | 'supports') => {
      let initialized = false
      return () => {
        if (!active) return
        // Chaque abonnement a son propre premier événement, même après changement de contrat.
        if (!initialized) { initialized = true; return }
        for (const key of ['contractCI', 'contractsCI', 'contractsCIStats', 'support-ci-eligibility']) pendingKeys.add(key)
        if (source === 'payments') {
          pendingKeys.add('paymentsCI')
          pendingKeys.add('contract-payment-stats')
        }
        if (source === 'supports') {
          pendingKeys.add('support-ci-active')
          pendingKeys.add('support-ci-history')
          pendingKeys.add('contract-payment-stats')
        }
        if (timer) clearTimeout(timer)
        timer = setTimeout(() => {
          for (const key of pendingKeys) {
            queryClient.invalidateQueries({ queryKey: globalKeys.has(key) ? [key] : [key, contractId] })
          }
          pendingKeys.clear()
        }, 250)
      }
    }

    const unsubscribeContract = onSnapshot(
      doc(db, firebaseCollectionNames.contractsCI, contractId), onChanges('contract'),
      (error) => console.error('[useCaisseImprevueContractRealtimeSync] contract listener error:', error),
    )
    const unsubscribePayments = onSnapshot(
      collection(db, firebaseCollectionNames.contractsCI, contractId, 'payments'), onChanges('payments'),
      (error) => console.error('[useCaisseImprevueContractRealtimeSync] payments listener error:', error),
    )
    const unsubscribeSupports = onSnapshot(
      collection(db, firebaseCollectionNames.contractsCI, contractId, 'supports'), onChanges('supports'),
      (error) => console.error('[useCaisseImprevueContractRealtimeSync] supports listener error:', error),
    )

    return () => {
      active = false
      unsubscribeContract()
      unsubscribePayments()
      unsubscribeSupports()
      if (timer) clearTimeout(timer)
    }
  }, [contractId, enabled, queryClient])
}
