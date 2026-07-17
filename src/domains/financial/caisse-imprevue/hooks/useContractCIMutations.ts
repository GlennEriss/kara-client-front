/**
 * Hook React Query pour les mutations sur les contrats Caisse Imprévue (ex: suppression)
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useAuditLogger } from '@/hooks/useAuditLog'
import { CaisseImprevueService } from '../services/CaisseImprevueService'
import { toast } from 'sonner'

const service = CaisseImprevueService.getInstance()
const CI_MODULE = { module: 'caisseImprevue', moduleLabel: 'Caisse Imprévue' } as const

export function useContractCIMutations() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { log } = useAuditLogger()

  const deleteContract = useMutation({
    mutationFn: (contractId: string) => {
      if (!user?.uid) throw new Error('Utilisateur non authentifié')
      return service.deleteContractCI(contractId, user.uid)
    },
    onSuccess: (_result, contractId) => {
      queryClient.invalidateQueries({ queryKey: ['contractsCI'] })
      queryClient.invalidateQueries({ queryKey: ['contractsCIStats'] })
      queryClient.invalidateQueries({ queryKey: ['caisse-imprevue-demands'] })
      queryClient.invalidateQueries({ queryKey: ['caisse-imprevue-demands-stats'] })
      queryClient.invalidateQueries({ queryKey: ['demand-detail'] })
      log({ action: 'delete', ...CI_MODULE, targetType: 'contrat', targetId: contractId, description: 'Suppression d\'un contrat de caisse imprévue (et de sa demande liée)' })
      toast.success('Contrat supprimé')
    },
    onError: (error: Error) => {
      toast.error(error?.message ?? 'Erreur lors de la suppression du contrat')
    },
  })

  const replaceContractDocument = useMutation({
    mutationFn: ({ contractId, file }: { contractId: string; file: File }) => {
      if (!user?.uid) throw new Error('Utilisateur non authentifié')
      return service.replaceContractDocument(contractId, file, user.uid)
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contractsCI'] })
      log({ action: 'update', ...CI_MODULE, targetType: 'contrat', targetId: variables.contractId, description: 'Remplacement du document d\'un contrat de caisse imprévue' })
      queryClient.invalidateQueries({ queryKey: ['contractsCIStats'] })
      queryClient.invalidateQueries({ queryKey: ['contractCI'] })
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      toast.success('Contrat remplacé avec succès')
    },
    onError: (error: Error) => {
      toast.error(error?.message ?? 'Erreur lors du remplacement du contrat')
    },
  })

  const updateContractSubscription = useMutation({
    mutationFn: ({ contractId, subscriptionId }: { contractId: string; subscriptionId: string }) => {
      if (!user?.uid) throw new Error('Utilisateur non authentifié')
      return service.updateContractSubscription(contractId, subscriptionId, user.uid)
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contractsCI'] })
      log({ action: 'update', ...CI_MODULE, targetType: 'contrat', targetId: variables.contractId, description: 'Changement de forfait d\'un contrat de caisse imprévue' })
      queryClient.invalidateQueries({ queryKey: ['contractsCIStats'] })
      queryClient.invalidateQueries({ queryKey: ['contractCI'] })
      toast.success('Catégorie du contrat mise à jour')
    },
    onError: (error: Error) => {
      toast.error(error?.message ?? 'Erreur lors de la modification de la catégorie')
    },
  })

  return { deleteContract, replaceContractDocument, updateContractSubscription }
}
