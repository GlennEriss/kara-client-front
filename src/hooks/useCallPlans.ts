'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/domains/auth/hooks/useAuth'
import { useAuditLogger } from '@/hooks/useAuditLog'
import {
  completeCallPlan,
  createCallPlanBatch,
  deleteCallPlan,
  listCallPlans,
  type CallPlanAssignee,
  type CallPlanTarget,
} from '@/services/call-logs/callPlan'

const QUERY_KEY = 'call-plans'

export function useCallPlans(startDate: string, endDate: string) {
  return useQuery({
    queryKey: [QUERY_KEY, startDate, endDate],
    queryFn: () => listCallPlans(startDate, endDate),
    staleTime: 20 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  })
}

export function useScheduleCallBatch() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { log } = useAuditLogger()

  return useMutation({
    mutationFn: ({
      scheduledDate,
      targets,
      assignee,
    }: {
      scheduledDate: string
      targets: CallPlanTarget[]
      assignee?: CallPlanAssignee
    }) => createCallPlanBatch({
      scheduledDate,
      targets,
      assignee,
      createdById: user?.uid ?? 'inconnu',
      createdByEmail: user?.email ?? undefined,
      createdByName: user?.displayName?.trim() || user?.email || 'Super administrateur',
    }),
    onSuccess: (count, variables) => {
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
      log({
        action: 'create',
        module: 'recouvrement',
        moduleLabel: 'Recouvrement',
        targetType: 'lot-appels',
        description: `Planification de ${count} appel${count > 1 ? 's' : ''} pour le ${variables.scheduledDate}`,
        metadata: {
          scheduledDate: variables.scheduledDate,
          count,
          assignee: variables.assignee?.name ?? 'Non attribué',
        },
      })
    },
  })
}

export function useCompleteCallPlan() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, callLogId }: { id: string; callLogId: string }) => completeCallPlan(id, {
      callLogId,
      completedById: user?.uid ?? 'inconnu',
      completedByName: user?.displayName?.trim() || user?.email || 'Administrateur',
    }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  })
}

export function useDeleteCallPlan() {
  const queryClient = useQueryClient()
  const { log } = useAuditLogger()

  return useMutation({
    mutationFn: (id: string) => deleteCallPlan(id),
    onSuccess: (_result, id) => {
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
      log({
        action: 'delete',
        module: 'recouvrement',
        moduleLabel: 'Recouvrement',
        targetType: 'appel-planifie',
        targetId: id,
        description: 'Suppression d’un appel planifié',
      })
    },
  })
}
