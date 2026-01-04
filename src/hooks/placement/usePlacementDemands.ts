import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ServiceFactory } from '@/factories/ServiceFactory'
import { useAuth } from '../useAuth'
import { toast } from 'sonner'
import { PlacementDemand, PlacementDemandFilters, PlacementDemandStats } from '@/types/types'
import { PlacementDemandFormInput, approveDemandSchema, rejectDemandSchema, reopenDemandSchema } from '@/schemas/placement.schema'
import { z } from 'zod'

const service = ServiceFactory.getPlacementService()

/**
 * Hook pour récupérer la liste des demandes avec filtres
 */
export function usePlacementDemands(filters?: PlacementDemandFilters) {
    return useQuery({
        queryKey: ['placementDemands', filters],
        queryFn: () => service.getDemandsWithFilters(filters),
        staleTime: 30 * 1000, // 30 secondes
    })
}

/**
 * Hook pour récupérer une demande par ID
 */
export function usePlacementDemand(id: string) {
    return useQuery({
        queryKey: ['placementDemand', id],
        queryFn: () => service.getDemandById(id),
        enabled: !!id,
        staleTime: 30 * 1000,
    })
}

/**
 * Hook pour récupérer les statistiques des demandes
 */
export function usePlacementDemandsStats(filters?: PlacementDemandFilters) {
    return useQuery({
        queryKey: ['placementDemandsStats', filters],
        queryFn: () => service.getDemandsStats(filters),
        staleTime: 2 * 60 * 1000, // 2 minutes
    })
}

/**
 * Hook pour les mutations (create, approve, reject, reopen, convert)
 */
export function usePlacementDemandMutations() {
    const qc = useQueryClient()
    const { user } = useAuth()

    const create = useMutation({
        mutationFn: (data: PlacementDemandFormInput) => {
            if (!user?.uid) throw new Error('Utilisateur non authentifié')
            return service.createDemand(data as any, user.uid)
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['placementDemands'] })
            qc.invalidateQueries({ queryKey: ['placementDemandsStats'] })
            toast.success('Demande créée avec succès')
        },
        onError: (error: any) => {
            toast.error(error?.message || 'Erreur lors de la création de la demande')
        },
    })

    const approve = useMutation({
        mutationFn: ({ demandId, reason }: { demandId: string; reason: string }) => {
            if (!user?.uid) throw new Error('Utilisateur non authentifié')
            // Valider avec Zod
            approveDemandSchema.parse({ reason })
            return service.approveDemand(demandId, user.uid, reason)
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['placementDemands'] })
            qc.invalidateQueries({ queryKey: ['placementDemandsStats'] })
            qc.invalidateQueries({ queryKey: ['placementDemand'] })
            toast.success('Demande acceptée avec succès')
        },
        onError: (error: any) => {
            if (error instanceof z.ZodError) {
                toast.error(error.issues[0]?.message || 'Erreur de validation')
            } else {
                toast.error(error?.message || 'Erreur lors de l\'acceptation de la demande')
            }
        },
    })

    const reject = useMutation({
        mutationFn: ({ demandId, reason }: { demandId: string; reason: string }) => {
            if (!user?.uid) throw new Error('Utilisateur non authentifié')
            // Valider avec Zod
            rejectDemandSchema.parse({ reason })
            return service.rejectDemand(demandId, user.uid, reason)
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['placementDemands'] })
            qc.invalidateQueries({ queryKey: ['placementDemandsStats'] })
            qc.invalidateQueries({ queryKey: ['placementDemand'] })
            toast.success('Demande refusée')
        },
        onError: (error: any) => {
            if (error instanceof z.ZodError) {
                toast.error(error.issues[0]?.message || 'Erreur de validation')
            } else {
                toast.error(error?.message || 'Erreur lors du refus de la demande')
            }
        },
    })

    const reopen = useMutation({
        mutationFn: ({ demandId, reason }: { demandId: string; reason: string }) => {
            if (!user?.uid) throw new Error('Utilisateur non authentifié')
            // Valider avec Zod
            reopenDemandSchema.parse({ reason })
            return service.reopenDemand(demandId, user.uid, reason)
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['placementDemands'] })
            qc.invalidateQueries({ queryKey: ['placementDemandsStats'] })
            qc.invalidateQueries({ queryKey: ['placementDemand'] })
        },
        onError: (error: any) => {
            if (error instanceof z.ZodError) {
                toast.error(error.issues[0]?.message || 'Erreur de validation')
            } else {
                toast.error(error?.message || 'Erreur lors de la réouverture de la demande')
            }
        },
    })

    const convert = useMutation({
        mutationFn: ({ demandId, placementData }: { demandId: string; placementData?: any }) => {
            if (!user?.uid) throw new Error('Utilisateur non authentifié')
            return service.convertDemandToPlacement(demandId, user.uid, placementData)
        },
        onSuccess: (result) => {
            qc.invalidateQueries({ queryKey: ['placementDemands'] })
            qc.invalidateQueries({ queryKey: ['placementDemandsStats'] })
            qc.invalidateQueries({ queryKey: ['placementDemand'] })
            if (result?.placement) {
                qc.invalidateQueries({ queryKey: ['placements'] })
            }
            toast.success('Placement créé avec succès')
        },
        onError: (error: any) => {
            toast.error(error?.message || 'Erreur lors de la conversion en placement')
        },
    })

    return {
        create,
        approve,
        reject,
        reopen,
        convert,
    }
}

