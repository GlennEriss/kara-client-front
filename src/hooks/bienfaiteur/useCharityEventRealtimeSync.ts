'use client'

import { collection, db, doc, onSnapshot } from '@/firebase/firestore'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

const CHARITY_EVENTS_COLLECTION = 'charity-events'

/**
 * Synchronisation temps réel multi-admin pour la page détail d'un évènement
 * bienfaiteur (tabs Contributions / Participants / Groupes / Médias / Paramètres).
 */
export function useCharityEventRealtimeSync(eventId?: string, enabled = true) {
  const queryClient = useQueryClient()
  const initialSnapshotsSeen = useRef(0)
  const invalidateTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!enabled || !eventId) return

    const listenersCount = 4

    const scheduleInvalidation = () => {
      if (invalidateTimer.current) {
        clearTimeout(invalidateTimer.current)
      }

      invalidateTimer.current = setTimeout(() => {
        // Snapshot global / liste
        queryClient.invalidateQueries({ queryKey: ['charity-events'] })

        // Détail évènement + stats
        queryClient.invalidateQueries({ queryKey: ['charity-events', eventId] })
        queryClient.invalidateQueries({ queryKey: ['charity-events', eventId, 'stats'] })

        // Onglets détail
        queryClient.invalidateQueries({ queryKey: ['charity-participants', eventId] })
        queryClient.invalidateQueries({ queryKey: ['charity-contributions', eventId] })
        queryClient.invalidateQueries({ queryKey: ['charity-media', eventId] })
      }, 250)
    }

    const onAnySnapshot = () => {
      if (initialSnapshotsSeen.current < listenersCount) {
        initialSnapshotsSeen.current += 1
        return
      }
      scheduleInvalidation()
    }

    const unsubscribeEvent = onSnapshot(
      doc(db, CHARITY_EVENTS_COLLECTION, eventId),
      onAnySnapshot,
      (error) => {
        console.error('[useCharityEventRealtimeSync] event listener error:', error)
      }
    )

    const unsubscribeParticipants = onSnapshot(
      collection(db, CHARITY_EVENTS_COLLECTION, eventId, 'participants'),
      onAnySnapshot,
      (error) => {
        console.error('[useCharityEventRealtimeSync] participants listener error:', error)
      }
    )

    const unsubscribeContributions = onSnapshot(
      collection(db, CHARITY_EVENTS_COLLECTION, eventId, 'contributions'),
      onAnySnapshot,
      (error) => {
        console.error('[useCharityEventRealtimeSync] contributions listener error:', error)
      }
    )

    const unsubscribeMedia = onSnapshot(
      collection(db, CHARITY_EVENTS_COLLECTION, eventId, 'media'),
      onAnySnapshot,
      (error) => {
        console.error('[useCharityEventRealtimeSync] media listener error:', error)
      }
    )

    return () => {
      unsubscribeEvent()
      unsubscribeParticipants()
      unsubscribeContributions()
      unsubscribeMedia()
      if (invalidateTimer.current) {
        clearTimeout(invalidateTimer.current)
      }
    }
  }, [enabled, eventId, queryClient])
}

