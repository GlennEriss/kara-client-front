/**
 * Hook React Query pour les mutations sur les contrats Caisse Imprévue (ex: suppression)
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useAuditLogger } from '@/hooks/useAuditLog'
import { CaisseImprevueService } from '../services/CaisseImprevueService'
import { ServiceFactory } from '@/factories/ServiceFactory'
import type { ContractCI } from '@/types/types'
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

  /**
   * Création d'un contrat.
   *
   * Passe par une mutation — et non par un appel direct au service — pour que
   * la liste et les statistiques soient invalidées, et que le filet global du
   * `MutationCache` rafraîchisse les autres sections. Sans cela, la liste des
   * contrats servait son cache (staleTime 5 min) et n'affichait le nouveau
   * contrat qu'après un rechargement de page.
   *
   * Le succès n'affiche pas de toast : l'appelant en produit déjà un, détaillé.
   */
  const createContract = useMutation({
    mutationFn: (data: Omit<ContractCI, 'createdAt' | 'updatedAt'>) =>
      ServiceFactory.getCaisseImprevueService().createContractCI(data),
    onSuccess: (contract) => {
      queryClient.invalidateQueries({ queryKey: ['contractsCI'] })
      queryClient.invalidateQueries({ queryKey: ['contractsCIStats'] })
      log({
        action: 'create',
        ...CI_MODULE,
        targetType: 'contrat',
        targetId: contract?.id,
        description: 'Création d\'un contrat de caisse imprévue',
      })
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

  return { createContract, deleteContract, replaceContractDocument, updateContractSubscription }
}
