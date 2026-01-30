import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ServiceFactory } from '@/factories/ServiceFactory'
import { useAuth } from '../useAuth'
import { toast } from 'sonner'
import { CaisseSpecialeDemand, CaisseSpecialeDemandFilters, CaisseSpecialeDemandStats } from '@/types/types'
import { CaisseSpecialeDemandFormInput, approveDemandSchema, rejectDemandSchema, reopenDemandSchema } from '@/schemas/caisse-speciale.schema'
import { z } from 'zod'

const service = ServiceFactory.getCaisseSpecialeService()

/**
 * Hook pour récupérer la liste des demandes avec filtres
 */
export function useCaisseSpecialeDemands(filters?: CaisseSpecialeDemandFilters) {
    return useQuery({
        queryKey: ['caisseSpecialeDemands', filters],
        queryFn: () => service.getDemandsWithFilters(filters),
        staleTime: 30 * 1000, // 30 secondes
    })
}

/**
 * Hook pour récupérer une demande par ID
 */
export function useCaisseSpecialeDemand(id: string) {
    return useQuery({
        queryKey: ['caisseSpecialeDemand', id],
        queryFn: () => service.getDemandById(id),
        enabled: !!id,
        staleTime: 30 * 1000,
    })
}

/**
 * Hook pour récupérer les statistiques des demandes
 */
export function useCaisseSpecialeDemandsStats(filters?: CaisseSpecialeDemandFilters) {
    return useQuery({
        queryKey: ['caisseSpecialeDemandsStats', filters],
        queryFn: () => service.getDemandsStats(filters),
        staleTime: 2 * 60 * 1000, // 2 minutes
    })
}

/**
 * Hook pour les mutations (create, approve, reject, convert)
 */
export function useCaisseSpecialeDemandMutations() {
    const qc = useQueryClient()
    const { user } = useAuth()

    const create = useMutation({
        mutationFn: (data: CaisseSpecialeDemandFormInput) => {
            if (!user?.uid) throw new Error('Utilisateur non authentifié')
            // Forcer contractType à 'INDIVIDUAL'
            return service.createDemand({ ...data, contractType: 'INDIVIDUAL' } as any, user.uid)
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['caisseSpecialeDemands'] })
            qc.invalidateQueries({ queryKey: ['caisseSpecialeDemandsStats'] })
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
            qc.invalidateQueries({ queryKey: ['caisseSpecialeDemands'] })
            qc.invalidateQueries({ queryKey: ['caisseSpecialeDemandsStats'] })
            qc.invalidateQueries({ queryKey: ['caisseSpecialeDemand'] })
            qc.invalidateQueries({ queryKey: ['caisseContracts'] })
            toast.success('Demande acceptée et contrat créé avec succès')
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
            qc.invalidateQueries({ queryKey: ['caisseSpecialeDemands'] })
            qc.invalidateQueries({ queryKey: ['caisseSpecialeDemandsStats'] })
            qc.invalidateQueries({ queryKey: ['caisseSpecialeDemand'] })
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
            qc.invalidateQueries({ queryKey: ['caisseSpecialeDemands'] })
            qc.invalidateQueries({ queryKey: ['caisseSpecialeDemandsStats'] })
            qc.invalidateQueries({ queryKey: ['caisseSpecialeDemand'] })
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
        mutationFn: ({ demandId }: { demandId: string }) => {
            if (!user?.uid) throw new Error('Utilisateur non authentifié')
            return service.convertDemandToContract(demandId, user.uid)
        },
        onSuccess: (result) => {
            qc.invalidateQueries({ queryKey: ['caisseSpecialeDemands'] })
            qc.invalidateQueries({ queryKey: ['caisseSpecialeDemandsStats'] })
            qc.invalidateQueries({ queryKey: ['caisseSpecialeDemand'] })
            if (result?.contractId) {
                qc.invalidateQueries({ queryKey: ['caisseContracts'] })
            }
            toast.success('Contrat créé avec succès')
        },
        onError: (error: any) => {
            toast.error(error?.message || 'Erreur lors de la conversion en contrat')
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

