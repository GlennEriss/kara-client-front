'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/domains/auth/hooks/useAuth'
import { useAuditLogger } from '@/hooks/useAuditLog'
import {
  completeCallPlan,
  createCallPlanBatch,
  deleteCallPlan,
  listCallPlans,
  listOverdueCallPlans,
  rescheduleCallPlan,
  type RescheduleCallPlanRequest,
  type CallPlanAssignee,
  type CallPlanTarget,
} from '@/services/call-logs/callPlan'
import { callPlanToday } from '@/utils/call-plan-dates'

const QUERY_KEY = 'call-plans'

export function useOverdueCallPlans() {
  const today = callPlanToday()
  return useQuery({ queryKey: [QUERY_KEY, 'overdue', today], queryFn: () => listOverdueCallPlans(today), staleTime: 20_000 })
}

export function useRescheduleCallPlan() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { log } = useAuditLogger()
  return useMutation({
    mutationFn: (input: RescheduleCallPlanRequest) => rescheduleCallPlan({
      ...input,
      byId: user?.uid ?? 'inconnu',
      byName: user?.displayName?.trim() || user?.email || 'Super administrateur',
    }),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
    onSuccess: (count, input) => log({
      action: 'update', module: 'recouvrement', moduleLabel: 'Recouvrement', targetType: 'appel-planifie',
      targetId: input.id ?? input.batchId, description: `${count} appel(s) replanifié(s) pour le ${input.scheduledDate}`,
      metadata: { scheduledDate: input.scheduledDate, reason: input.reason, count },
    }),
  })
}

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
      sourceCallLogId,
    }: {
      scheduledDate: string
      targets: CallPlanTarget[]
      assignee?: CallPlanAssignee
      sourceCallLogId?: string
    }) => createCallPlanBatch({
      scheduledDate,
      targets,
      assignee,
      sourceCallLogId,
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
