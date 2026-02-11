/**
 * Hook React Query pour les mutations sur les contrats Caisse Imprévue (ex: suppression)
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { CaisseImprevueService } from '../services/CaisseImprevueService'
import { toast } from 'sonner'

const service = CaisseImprevueService.getInstance()

export function useContractCIMutations() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const deleteContract = useMutation({
    mutationFn: (contractId: string) => {
      if (!user?.uid) throw new Error('Utilisateur non authentifié')
      return service.deleteContractCI(contractId, user.uid)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractsCI'] })
      queryClient.invalidateQueries({ queryKey: ['contractsCIStats'] })
      queryClient.invalidateQueries({ queryKey: ['caisse-imprevue-demands'] })
      queryClient.invalidateQueries({ queryKey: ['caisse-imprevue-demands-stats'] })
      queryClient.invalidateQueries({ queryKey: ['demand-detail'] })
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractsCI'] })
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractsCI'] })
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
