'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ServiceFactory } from '@/factories/ServiceFactory'
import { VehicleInsurance, VehicleInsuranceFilters, VehicleInsuranceListResult } from '@/types/types'
import { useAuth } from '@/hooks/useAuth'
import { VehicleInsuranceFormValues } from '@/schemas/vehicule.schema'

const getService = () => ServiceFactory.getVehicleInsuranceService()

export function useVehicleInsuranceList(filters?: VehicleInsuranceFilters, page: number = 1, pageSize: number = 12) {
  return useQuery<VehicleInsuranceListResult>({
    queryKey: ['vehicle-insurances', 'list', filters, page, pageSize],
    queryFn: () => getService().list(filters, page, pageSize),
    staleTime: 1000 * 60 * 5,
  })
}

export function useVehicleInsuranceStats() {
  return useQuery({
    queryKey: ['vehicle-insurances', 'stats'],
    queryFn: () => getService().getStats(),
    staleTime: 1000 * 60 * 5,
  })
}

export function useVehicleInsurance(id?: string) {
  return useQuery<VehicleInsurance | null>({
    queryKey: ['vehicle-insurances', id],
    queryFn: () => getService().getById(id as string),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreateVehicleInsurance() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: (payload: VehicleInsuranceFormValues) => {
      if (!user?.uid) throw new Error('Utilisateur non authentifié')
      return getService().createInsurance(payload, user.uid)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-insurances'] })
    },
  })
}

export function useUpdateVehicleInsurance() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<VehicleInsuranceFormValues> }) => {
      if (!user?.uid) throw new Error('Utilisateur non authentifié')
      return getService().updateInsurance(id, updates, user.uid)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-insurances', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['vehicle-insurances', 'list'] })
    },
  })
}

export function useRenewVehicleInsurance() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: ({ id, startDate, endDate, premiumAmount, policyNumber, coverageType }: { id: string; startDate: Date; endDate: Date; premiumAmount: number; policyNumber?: string; coverageType?: string }) => {
      if (!user?.uid) throw new Error('Utilisateur non authentifié')
      return getService().renewInsurance(id, { startDate, endDate, premiumAmount, policyNumber, coverageType }, user.uid)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-insurances', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['vehicle-insurances', 'stats'] })
    },
  })
}

export function useDeleteVehicleInsurance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => getService().deleteInsurance(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-insurances'] })
    },
  })
}

export function useMarkVehicleInsuranceExpired() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: (id: string) => {
      if (!user?.uid) throw new Error('Utilisateur non authentifié')
      return getService().markExpired(id, user.uid)
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-insurances', id] })
      queryClient.invalidateQueries({ queryKey: ['vehicle-insurances', 'stats'] })
    },
  })
}

