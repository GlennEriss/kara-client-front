import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ServiceFactory } from '@/factories/ServiceFactory'
import { useAuth } from '../useAuth'
import { toast } from 'sonner'
import { CaisseImprevueDemand, CaisseImprevueDemandFilters, CaisseImprevueDemandStats } from '@/types/types'
import { CaisseImprevueDemandFormInput, approveCaisseImprevueDemandSchema, rejectCaisseImprevueDemandSchema, reopenCaisseImprevueDemandSchema } from '@/schemas/caisse-imprevue.schema'
import { z } from 'zod'

const service = ServiceFactory.getCaisseImprevueService()

/**
 * Hook pour récupérer la liste des demandes avec filtres
 */
export function useCaisseImprevueDemands(filters?: CaisseImprevueDemandFilters) {
    return useQuery({
        queryKey: ['caisseImprevueDemands', filters],
        queryFn: () => service.getDemandsWithFilters(filters),
        staleTime: 30 * 1000, // 30 secondes
    })
}

/**
 * Hook pour récupérer une demande par ID
 */
export function useCaisseImprevueDemand(id: string) {
    return useQuery({
        queryKey: ['caisseImprevueDemand', id],
        queryFn: () => service.getDemandById(id),
        enabled: !!id,
        staleTime: 30 * 1000,
    })
}

/**
 * Hook pour récupérer les statistiques des demandes
 */
export function useCaisseImprevueDemandsStats(filters?: CaisseImprevueDemandFilters) {
    return useQuery({
        queryKey: ['caisseImprevueDemandsStats', filters],
        queryFn: () => service.getDemandsStats(filters),
        staleTime: 2 * 60 * 1000, // 2 minutes
    })
}

/**
 * Hook pour les mutations (create, approve, reject, reopen, convert)
 */
export function useCaisseImprevueDemandMutations() {
    const qc = useQueryClient()
    const { user } = useAuth()

    const create = useMutation({
        mutationFn: (data: CaisseImprevueDemandFormInput) => {
            if (!user?.uid) throw new Error('Utilisateur non authentifié')
            return service.createDemand(data as any, user.uid)
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['caisseImprevueDemands'] })
            qc.invalidateQueries({ queryKey: ['caisseImprevueDemandsStats'] })
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
            approveCaisseImprevueDemandSchema.parse({ reason })
            return service.approveDemand(demandId, user.uid, reason)
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['caisseImprevueDemands'] })
            qc.invalidateQueries({ queryKey: ['caisseImprevueDemandsStats'] })
            qc.invalidateQueries({ queryKey: ['caisseImprevueDemand'] })
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
            rejectCaisseImprevueDemandSchema.parse({ reason })
            return service.rejectDemand(demandId, user.uid, reason)
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['caisseImprevueDemands'] })
            qc.invalidateQueries({ queryKey: ['caisseImprevueDemandsStats'] })
            qc.invalidateQueries({ queryKey: ['caisseImprevueDemand'] })
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
            reopenCaisseImprevueDemandSchema.parse({ reason })
            return service.reopenDemand(demandId, user.uid, reason)
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['caisseImprevueDemands'] })
            qc.invalidateQueries({ queryKey: ['caisseImprevueDemandsStats'] })
            qc.invalidateQueries({ queryKey: ['caisseImprevueDemand'] })
            toast.success('Demande réouverte avec succès')
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
        mutationFn: ({ demandId, contractData }: { demandId: string; contractData?: any }) => {
            if (!user?.uid) throw new Error('Utilisateur non authentifié')
            return service.convertDemandToContract(demandId, user.uid, contractData)
        },
        onSuccess: (result) => {
            qc.invalidateQueries({ queryKey: ['caisseImprevueDemands'] })
            qc.invalidateQueries({ queryKey: ['caisseImprevueDemandsStats'] })
            qc.invalidateQueries({ queryKey: ['caisseImprevueDemand'] })
            if (result?.contract) {
                qc.invalidateQueries({ queryKey: ['contractsCI'] })
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

