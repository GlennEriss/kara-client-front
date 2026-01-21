/**
 * Hook React Query pour les actions sur les demandes d'adhésion V2
 * 
 * Gère les mutations : approve, reject, corrections, payment
 */

'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { toast } from 'sonner'
import { MembershipServiceV2 } from '../services/MembershipServiceV2'
import { MEMBERSHIP_REQUEST_CACHE } from '@/constantes/membership-requests'
import { generateCorrectionLink, generateWhatsAppMessage } from '../utils/correctionUtils'
import { generateWhatsAppUrl } from '../utils/whatsappUrl'
import type {
  ApproveMembershipRequestParams,
  RejectMembershipRequestParams,
  ReopenMembershipRequestParams,
  RequestCorrectionsParams,
  ProcessPaymentParams,
} from '../services/interfaces/IMembershipService'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { app } from '@/firebase/app'

export function useMembershipActionsV2() {
  const queryClient = useQueryClient()
  const service = MembershipServiceV2.getInstance()

  const approveMutation = useMutation({
    mutationFn: (params: ApproveMembershipRequestParams) =>
      service.approveMembershipRequest(params),
    onSuccess: () => {
      // Invalider les queries pour refetch
      queryClient.invalidateQueries({ 
        queryKey: [MEMBERSHIP_REQUEST_CACHE.QUERY_KEY] 
      })
      queryClient.invalidateQueries({ 
        queryKey: [MEMBERSHIP_REQUEST_CACHE.STATS_QUERY_KEY] 
      })
    },
  })

  const rejectMutation = useMutation({
    mutationFn: (params: RejectMembershipRequestParams) =>
      service.rejectMembershipRequest(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [MEMBERSHIP_REQUEST_CACHE.QUERY_KEY] 
      })
      queryClient.invalidateQueries({ 
        queryKey: [MEMBERSHIP_REQUEST_CACHE.STATS_QUERY_KEY] 
      })
      // Invalider les notifications pour afficher la nouvelle notification de rejet
      queryClient.invalidateQueries({ 
        queryKey: ['notifications'] 
      })
      toast.success('Demande rejetée', {
        description: 'La demande d\'adhésion a été rejetée avec succès.',
      })
    },
    onError: (error: Error) => {
      toast.error('Erreur lors du rejet', {
        description: error.message || 'Une erreur est survenue lors du rejet de la demande.',
      })
    },
  })

  const requestCorrectionsMutation = useMutation({
    mutationFn: (params: RequestCorrectionsParams) =>
      service.requestCorrections(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [MEMBERSHIP_REQUEST_CACHE.QUERY_KEY] 
      })
      queryClient.invalidateQueries({ 
        queryKey: [MEMBERSHIP_REQUEST_CACHE.STATS_QUERY_KEY] 
      })
    },
  })

  const processPaymentMutation = useMutation({
    mutationFn: (params: ProcessPaymentParams) =>
      service.processPayment(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [MEMBERSHIP_REQUEST_CACHE.QUERY_KEY] 
      })
      queryClient.invalidateQueries({ 
        queryKey: [MEMBERSHIP_REQUEST_CACHE.STATS_QUERY_KEY] 
      })
    },
  })

  const renewSecurityCodeMutation = useMutation({
    mutationFn: ({ requestId, adminId }: { requestId: string; adminId: string }) =>
      service.renewSecurityCode(requestId, adminId),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [MEMBERSHIP_REQUEST_CACHE.QUERY_KEY] 
      })
      queryClient.invalidateQueries({ 
        queryKey: [MEMBERSHIP_REQUEST_CACHE.STATS_QUERY_KEY] 
      })
    },
  })

  const reopenMutation = useMutation({
    mutationFn: (params: ReopenMembershipRequestParams) =>
      service.reopenMembershipRequest(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [MEMBERSHIP_REQUEST_CACHE.QUERY_KEY] 
      })
      queryClient.invalidateQueries({ 
        queryKey: [MEMBERSHIP_REQUEST_CACHE.STATS_QUERY_KEY] 
      })
      // Invalider les notifications pour afficher la nouvelle notification de réouverture
      queryClient.invalidateQueries({ 
        queryKey: ['notifications'] 
      })
      toast.success('Dossier réouvert', {
        description: 'La demande d\'adhésion a été réouverte avec succès.',
      })
    },
    onError: (error: Error) => {
      toast.error('Erreur lors de la réouverture', {
        description: error.message || 'Une erreur est survenue lors de la réouverture du dossier.',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (params: { requestId: string; confirmedMatricule: string }) => {
      const functions = getFunctions(app)
      const deleteMembershipRequestCF = httpsCallable<
        { requestId: string; confirmedMatricule: string },
        { success: boolean; requestId: string; filesDeleted: number; deletedAt: string; warnings?: string }
      >(functions, 'deleteMembershipRequest')

      const result = await deleteMembershipRequestCF({
        requestId: params.requestId,
        confirmedMatricule: params.confirmedMatricule,
      })

      if (!result.data.success) {
        throw new Error('Erreur lors de la suppression de la demande')
      }

      return result.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: [MEMBERSHIP_REQUEST_CACHE.QUERY_KEY] 
      })
      queryClient.invalidateQueries({ 
        queryKey: [MEMBERSHIP_REQUEST_CACHE.STATS_QUERY_KEY] 
      })
      // Invalider les notifications pour afficher la notification de suppression (si créée)
      queryClient.invalidateQueries({ 
        queryKey: ['notifications'] 
      })
      
      const message = data.warnings
        ? `Dossier supprimé. ${data.warnings}`
        : 'Le dossier a été supprimé définitivement avec succès.'
      
      toast.success('Dossier supprimé', {
        description: message,
      })
    },
    onError: (error: Error) => {
      toast.error('Erreur lors de la suppression', {
        description: error.message || 'Une erreur est survenue lors de la suppression du dossier.',
      })
    },
  })

  // Hook pour copier le lien de correction
  const copyCorrectionLink = useCallback(async (requestId: string) => {
    try {
      const link = generateCorrectionLink(requestId)
      const fullLink = `${window.location.origin}${link}`
      
      await navigator.clipboard.writeText(fullLink)
      toast.success('Lien copié !', {
        description: 'Le lien de correction a été copié dans le presse-papiers.',
      })
    } catch (_error) {
      toast.error('Erreur lors de la copie', {
        description: 'Impossible de copier le lien. Veuillez le copier manuellement.',
      })
    }
  }, [])

  // Hook pour envoyer via WhatsApp
  const sendWhatsApp = useCallback((params: {
    requestId: string
    firstName: string
    corrections: string[]
    securityCode: string
    expiryDate: Date
    phoneNumber: string
  }) => {
    try {
      // Générer le message WhatsApp
      const message = generateWhatsAppMessage({
        requestId: params.requestId,
        firstName: params.firstName,
        corrections: params.corrections,
        securityCode: params.securityCode,
        expiryDate: params.expiryDate,
        baseUrl: window.location.origin,
      })

      // Générer l'URL WhatsApp
      const whatsappUrl = generateWhatsAppUrl(params.phoneNumber, message)

      // Ouvrir dans un nouvel onglet
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
    } catch (error) {
      toast.error('Erreur lors de l\'ouverture de WhatsApp', {
        description: error instanceof Error ? error.message : 'Une erreur est survenue.',
      })
    }
  }, [])

  return {
    approveMutation,
    rejectMutation,
    reopenMutation,
    deleteMutation,
    requestCorrectionsMutation,
    processPaymentMutation,
    renewSecurityCodeMutation,
    copyCorrectionLink,
    sendWhatsApp,
  }
}
