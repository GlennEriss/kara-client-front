'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ServiceFactory } from '@/factories/ServiceFactory'
import { toast } from 'sonner'

interface UploadContractDocumentParams {
  file: File
  contractId: string
  memberId: string
  userId: string
}

/**
 * Hook pour uploader un document de contrat CI
 * Utilise le service CaisseImprevueService via ServiceFactory
 */
export const useUploadContractDocument = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ file, contractId, memberId, userId }: UploadContractDocumentParams) => {
      const service = ServiceFactory.getCaisseImprevueService()
      return await service.uploadContractDocument(file, contractId, memberId, userId)
    },
    onSuccess: (data) => {
      // Invalider le cache des contrats pour rafraîchir la liste
      queryClient.invalidateQueries({ queryKey: ['contractsCI'] })
      queryClient.invalidateQueries({ queryKey: ['contractsCIStats'] })
      
      toast.success('Document téléversé avec succès', {
        description: `Le contrat a été enregistré dans la base de données`
      })
    },
    onError: (error: Error) => {
      toast.error('Erreur lors du téléversement', {
        description: error.message
      })
    }
  })
}

