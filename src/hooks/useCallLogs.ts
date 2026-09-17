'use client'

/**
 * Hooks de traçabilité des relances : lecture du journal des contacts et
 * enregistrement d'un compte rendu.
 */

import { useCallback, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/domains/auth/hooks/useAuth'
import { useAuditLogger } from '@/hooks/useAuditLog'
import {
  createCallLog,
  listCallLogs,
  CALL_OUTCOME_LABELS,
  CONTACT_CHANNEL_LABELS,
  type CallLog,
  type CallLogInput,
} from '@/services/call-logs/callLog'

const QUERY_KEY = 'call-logs'

/** Journal des contacts (fenêtre récente, filtrage client). */
export function useCallLogs(max = 1000) {
  return useQuery<CallLog[]>({
    queryKey: [QUERY_KEY, max],
    queryFn: () => listCallLogs(max),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}

/**
 * Dernier contact connu par retardataire (`personKey` → contact le plus récent).
 * `listCallLogs` renvoyant déjà les documents du plus récent au plus ancien,
 * la première occurrence rencontrée est la bonne.
 */
export function useLastContactByPerson(max = 1000) {
  const { data: logs = [], isLoading } = useCallLogs(max)

  const lastContact = useMemo(() => {
    const map = new Map<string, CallLog>()
    for (const log of logs) {
      if (!map.has(log.personKey)) map.set(log.personKey, log)
    }
    return map
  }, [logs])

  return { lastContact, isLoading }
}

/** Historique complet d'un retardataire, du plus récent au plus ancien. */
export function useCallLogsForPerson(personKey: string | undefined, max = 1000) {
  const { data: logs = [], isLoading } = useCallLogs(max)

  const history = useMemo(
    () => (personKey ? logs.filter((l) => l.personKey === personKey) : []),
    [logs, personKey],
  )

  return { history, isLoading }
}

/** Champs que l'appelant fournit ; l'admin auteur est ajouté automatiquement. */
export type RecordCallArgs = Omit<CallLogInput, 'adminId' | 'adminName'>

/**
 * Enregistre un compte rendu en attribuant automatiquement l'admin connecté,
 * et double l'écriture dans le journal d'audit global.
 */
export function useRecordCall() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { log } = useAuditLogger()

  const adminName = user?.displayName?.trim() || user?.email || 'Administrateur'
  const adminId = user?.uid || 'inconnu'

  const mutation = useMutation({
    mutationFn: (args: RecordCallArgs) => createCallLog({ ...args, adminId, adminName }),
    onSuccess: (_id, args) => {
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
      log({
        action: 'other',
        module: 'recouvrement',
        moduleLabel: 'Recouvrement',
        description: `${CONTACT_CHANNEL_LABELS[args.channel]} — ${args.name} (${args.product}) : ${CALL_OUTCOME_LABELS[args.outcome]}`,
        targetType: args.isGroup ? 'groupe' : 'membre',
        targetId: args.memberId || args.groupId || args.matricule,
        metadata: {
          outcome: args.outcome,
          channel: args.channel,
          totalOverdue: args.totalOverdue,
        },
      })
    },
  })

  const record = useCallback(
    (args: RecordCallArgs) => mutation.mutateAsync(args),
    [mutation],
  )

  return { record, isPending: mutation.isPending }
}
