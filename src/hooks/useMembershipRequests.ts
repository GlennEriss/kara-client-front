'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
    getMembershipRequestsPaginated, 
    getMembershipRequestById,
    renewSecurityCode,
    updateMembershipPayment
} from '@/db/membership.db'
import { ServiceFactory } from '@/factories/ServiceFactory'
import { toast } from 'sonner'
import type { 
    MembershipRequestStatus, 
    PaginatedMembershipRequests,
    MembershipRequest, 
    TypePayment,
    PaymentMode
} from '@/types/types'

/**
 * Hook pour récupérer les demandes d'adhésion avec pagination
 */
export function useMembershipRequests(options: {
    page?: number;
    limit?: number;
    status?: MembershipRequestStatus | 'all';
    searchQuery?: string;
    enabled?: boolean;
} = {}) {
    const {
        page = 1,
        limit = 10,
        status = 'all',
        searchQuery = '',
        enabled = true
    } = options;

    return useQuery({
        queryKey: ['membershipRequests', { page, limit, status, searchQuery }],
        queryFn: async (): Promise<PaginatedMembershipRequests> => {
            const result = await getMembershipRequestsPaginated({
                page,
                limit,
                status: status === 'all' ? undefined : status,
                searchQuery: searchQuery.trim() || undefined,
                orderByField: 'createdAt',
                orderByDirection: 'desc'
            });
            return result;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 10, // 10 minutes
        refetchOnWindowFocus: false,
        enabled
    });
}

/**
 * Hook pour récupérer une demande d'adhésion spécifique
 */
export function useMembershipRequest(requestId: string, enabled = true) {
    return useQuery({
        queryKey: ['membershipRequest', requestId],
        queryFn: async (): Promise<MembershipRequest | null> => {
            if (!requestId) return null;
            return await getMembershipRequestById(requestId);
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 10, // 10 minutes
        enabled: enabled && !!requestId
    });
}

/**
 * Hook pour mettre à jour le statut d'une demande d'adhésion (avec notification)
 */
export function useUpdateMembershipRequestStatus() {
    const queryClient = useQueryClient();
    const membershipService = ServiceFactory.getMembershipService();

    return useMutation({
        mutationFn: async (params: {
            requestId: string;
            newStatus: MembershipRequest['status'];
            reviewedBy?: string;
            reviewNote?: string;
            motifReject?: string;
        }) => {
            const { requestId, newStatus, reviewedBy, reviewNote, motifReject } = params;
            const success = await membershipService.updateMembershipRequestStatus(
                requestId,
                newStatus,
                reviewedBy,
                reviewNote,
                motifReject
            );
            
            if (!success) {
                throw new Error('Erreur lors de la mise à jour du statut');
            }
            
            return success;
        },
        onSuccess: (_, variables) => {
            // Invalider et refetch les queries liées
            queryClient.invalidateQueries({ 
                queryKey: ['membershipRequests'] 
            });
            queryClient.invalidateQueries({ 
                queryKey: ['membershipRequest', variables.requestId] 
            });
            // Rafraîchir les notifications
            queryClient.invalidateQueries({ 
                queryKey: ['notifications'] 
            });
        },
        onError: (error) => {
            console.error('Erreur lors de la mise à jour:', error);
        }
    });
}

/**
 * Hook pour renouveler le code de sécurité d'une demande d'adhésion
 */
export function useRenewSecurityCode() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (requestId: string) => {
            const result = await renewSecurityCode(requestId);
            
            if (!result.success) {
                throw new Error(result.error || 'Erreur lors du renouvellement du code');
            }
            
            return result;
        },
        onSuccess: (result, requestId) => {
            // Invalider et refetch les queries liées
            queryClient.invalidateQueries({ 
                queryKey: ['membershipRequests'] 
            });
            
            toast.success('Code renouvelé !', {
                description: `Nouveau code: ${result.newCode}`,
                duration: 5000,
            });
        },
        onError: (error) => {
            toast.error('Erreur lors du renouvellement', {
                description: error.message,
                duration: 4000,
            });
        }
    });
}

/**
 * Hook pour payer une demande
 */
export function usePayMembershipRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (params: { requestId: string; payment: { date: Date; mode: PaymentMode; amount: number; acceptedBy: string; paymentType: TypePayment; time?: string; withFees?: boolean } }) => {
      const ok = await updateMembershipPayment(params.requestId, params.payment)
      if (!ok) throw new Error('Erreur paiement')
      return ok
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['membershipRequests'] })
      queryClient.invalidateQueries({ queryKey: ['membershipRequest', variables.requestId] })
    },
  })
}

/**
 * Hook pour les statistiques des demandes d'adhésion
 */
export function useMembershipRequestsStats() {
    return useQuery({
        queryKey: ['membershipRequestsStats'],
        queryFn: async () => {
            // Récupérer les différents statuts en parallèle
            const [pending, approved, rejected, underReview] = await Promise.all([
                getMembershipRequestsPaginated({ status: 'pending', limit: 1000 }),
                getMembershipRequestsPaginated({ status: 'approved', limit: 1000 }),
                getMembershipRequestsPaginated({ status: 'rejected', limit: 1000 }),
                getMembershipRequestsPaginated({ status: 'under_review', limit: 1000 }),
            ]);

            // Calculer les stats du jour/semaine/mois
            const today = new Date();
            const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay());
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

            const allRequests = [
                ...pending.data,
                ...approved.data,
                ...rejected.data,
                ...underReview.data
            ];

            const todayCount = allRequests.filter(req => 
                req.createdAt && new Date(req.createdAt) >= startOfDay
            ).length;

            const weekCount = allRequests.filter(req => 
                req.createdAt && new Date(req.createdAt) >= startOfWeek
            ).length;

            const monthCount = allRequests.filter(req => 
                req.createdAt && new Date(req.createdAt) >= startOfMonth
            ).length;

            return {
                total: allRequests.length,
                pending: pending.pagination.totalItems,
                approved: approved.pagination.totalItems,
                rejected: rejected.pagination.totalItems,
                underReview: underReview.pagination.totalItems,
                todayCount,
                weekCount,
                monthCount
            };
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 10, // 10 minutes
        refetchOnWindowFocus: false
    });
}

/**
 * Types pour les filtres de recherche
 */
export interface MembershipRequestFilters {
    status: MembershipRequest['status'] | 'all';
    searchQuery: string;
    page: number;
    limit: number;
}

/**
 * Hook personnalisé pour gérer l'état des filtres de recherche
 */
export function useMembershipRequestFilters(
    initialFilters: Partial<MembershipRequestFilters> = {}
) {
    const defaultFilters: MembershipRequestFilters = {
        status: 'all',
        searchQuery: '',
        page: 1,
        limit: 10,
        ...initialFilters
    };

    return defaultFilters;
}

/**
 * Hook pour récupérer une demande d'adhésion par son dossier ID
 */
export function useMembershipRequestByDossier(dossierId: string, enabled = true) {
    return useQuery({
        queryKey: ['membershipRequestByDossier', dossierId],
        queryFn: async (): Promise<MembershipRequest | null> => {
            if (!dossierId) return null;
            return await getMembershipRequestById(dossierId);
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 10, // 10 minutes
        enabled: enabled && !!dossierId
    });
}