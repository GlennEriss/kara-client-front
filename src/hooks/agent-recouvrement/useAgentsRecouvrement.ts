import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ServiceFactory } from '@/factories/ServiceFactory'
import type { AgentsFilters } from '@/types/types'
import type { CreateAgentInput } from '@/repositories/agent-recouvrement/IAgentRecouvrementRepository'

const QUERY_KEY = 'agentsRecouvrement'

export function useAgentsRecouvrement(
  filters: AgentsFilters = {},
  page: number = 1,
  itemsPerPage: number = 12
) {
  const service = ServiceFactory.getAgentRecouvrementService()

  return useQuery({
    queryKey: [QUERY_KEY, 'list', filters, page, itemsPerPage],
    queryFn: async () => {
      if (filters.tab === 'anniversaires') {
        return service.getAgentsAnniversairesMois(page, itemsPerPage)
      }
      return service.getAgentsWithFilters(filters, page, itemsPerPage)
    },
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

export function useAgentsRecouvrementStats() {
  const service = ServiceFactory.getAgentRecouvrementService()

  return useQuery({
    queryKey: [QUERY_KEY, 'stats'],
    queryFn: () => service.getAgentsStats(),
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

export function useAgentRecouvrement(id: string | undefined) {
  const service = ServiceFactory.getAgentRecouvrementService()

  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: () => service.getAgentById(id!),
    enabled: !!id,
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

export function useAgentsActifs() {
  const service = ServiceFactory.getAgentRecouvrementService()

  return useQuery({
    queryKey: [QUERY_KEY, 'actifs'],
    queryFn: () => service.getAgentsActifs(),
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

export function useCreateAgentRecouvrement() {
  const queryClient = useQueryClient()
  const service = ServiceFactory.getAgentRecouvrementService()

  return useMutation({
    mutationFn: (input: CreateAgentInput) => service.createAgent(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

export function useUpdateAgentRecouvrement() {
  const queryClient = useQueryClient()
  const service = ServiceFactory.getAgentRecouvrementService()

  return useMutation({
    mutationFn: ({
      id,
      updates,
      updatedBy,
    }: {
      id: string
      updates: Parameters<typeof service.updateAgent>[1]
      updatedBy: string
    }) => service.updateAgent(id, updates, updatedBy),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
      if (variables?.id) {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.id] })
      }
    },
  })
}

export function useDeactivateAgentRecouvrement() {
  const queryClient = useQueryClient()
  const service = ServiceFactory.getAgentRecouvrementService()

  return useMutation({
    mutationFn: ({ id, updatedBy }: { id: string; updatedBy: string }) =>
      service.deactivateAgent(id, updatedBy),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
      if (variables?.id) {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.id] })
      }
    },
  })
}

export function useReactivateAgentRecouvrement() {
  const queryClient = useQueryClient()
  const service = ServiceFactory.getAgentRecouvrementService()

  return useMutation({
    mutationFn: ({ id, updatedBy }: { id: string; updatedBy: string }) =>
      service.reactivateAgent(id, updatedBy),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
      if (variables?.id) {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.id] })
      }
    },
  })
}

export function useDeleteAgentRecouvrement() {
  const queryClient = useQueryClient()
  const service = ServiceFactory.getAgentRecouvrementService()

  return useMutation({
    mutationFn: (id: string) => service.deleteAgent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}
