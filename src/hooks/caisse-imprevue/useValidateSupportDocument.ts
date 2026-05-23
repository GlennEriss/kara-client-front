import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ServiceFactory } from '@/factories/ServiceFactory'
import { toast } from 'sonner'

export function useValidateSupportDocument(contractId: string) {
  const queryClient = useQueryClient()
  const service = ServiceFactory.getCaisseImprevueService()

  return useMutation<void, Error, { supportId: string; adminId: string; file: File }>({
    mutationFn: ({ supportId, adminId, file }) =>
      service.validateMemberSupport(contractId, supportId, adminId, file),
    onSuccess: () => {
      toast.success('Document validé', {
        description: 'La demande d\'aide est maintenant active.',
      })
      queryClient.invalidateQueries({ queryKey: ['support-ci-active', contractId] })
      queryClient.invalidateQueries({ queryKey: ['support-ci-history', contractId] })
      queryClient.invalidateQueries({ queryKey: ['contract-ci', contractId] })
    },
    onError: (error) => {
      toast.error('Erreur lors de la validation', { description: error.message })
    },
  })
}

export function useRejectSupportDocument(contractId: string) {
  const queryClient = useQueryClient()
  const service = ServiceFactory.getCaisseImprevueService()

  return useMutation<void, Error, { supportId: string; adminId: string; rejectionReason: string }>({
    mutationFn: ({ supportId, adminId, rejectionReason }) =>
      service.rejectMemberSupport(contractId, supportId, adminId, rejectionReason),
    onSuccess: () => {
      toast.success('Document refusé', {
        description: 'Le membre sera invité à re-soumettre un document.',
      })
      queryClient.invalidateQueries({ queryKey: ['support-ci-active', contractId] })
      queryClient.invalidateQueries({ queryKey: ['support-ci-history', contractId] })
      queryClient.invalidateQueries({ queryKey: ['contract-ci', contractId] })
    },
    onError: (error) => {
      toast.error('Erreur lors du refus', { description: error.message })
    },
  })
}
