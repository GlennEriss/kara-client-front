'use client'

import { useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { listAuditLogs, logAdminAction, type AuditAction, type AuditLog } from '@/services/audit/auditLog'

/** Liste des derniers logs d'audit (fenêtre récente, filtrage client). */
export function useAuditLogs(max = 500) {
  return useQuery<AuditLog[]>({
    queryKey: ['audit-logs', max],
    queryFn: () => listAuditLogs(max),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}

export interface LogActionArgs {
  action: AuditAction
  module: string
  moduleLabel?: string
  description: string
  targetType?: string
  targetId?: string
  metadata?: Record<string, unknown>
}

/**
 * Renvoie une fonction `log(...)` qui journalise une action en attribuant
 * automatiquement l'admin connecté. À appeler après une mutation réussie.
 */
export function useAuditLogger() {
  const { user } = useAuth()

  const log = useCallback(
    (args: LogActionArgs) => {
      const adminName = user?.displayName?.trim() || user?.email || 'Administrateur'
      // Best-effort : on n'attend pas la promesse pour ne pas ralentir l'UI.
      void logAdminAction({
        adminId: user?.uid || 'inconnu',
        adminName,
        adminEmail: user?.email || undefined,
        action: args.action,
        module: args.module,
        moduleLabel: args.moduleLabel,
        description: args.description,
        targetType: args.targetType,
        targetId: args.targetId,
        metadata: args.metadata,
      })
    },
    [user?.uid, user?.displayName, user?.email],
  )

  return { log }
}
