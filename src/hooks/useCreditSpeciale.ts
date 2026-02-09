import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ServiceFactory } from '@/factories/ServiceFactory'
import { useAuth } from './useAuth'
import { toast } from 'sonner'
import type { 
    CreditDemand, 
    CreditContract, 
    CreditPayment, 
    CreditPenalty,
    CreditInstallment,
    GuarantorRemuneration,
    CreditDemandStatus,
    CreditContractStatus,
    StandardSimulation,
    CustomSimulation
} from '@/types/types'
import type { CreditDemandFilters } from '@/repositories/credit-speciale/ICreditDemandRepository'
import type { CreditContractFilters } from '@/repositories/credit-speciale/ICreditContractRepository'
import type { CreditPaymentFilters } from '@/repositories/credit-speciale/ICreditPaymentRepository'
import type { EmergencyContact } from '@/schemas/emergency-contact.schema'
import type { UpdateCreditDemandInput } from '@/services/credit-speciale/ICreditSpecialeService'

// ==================== DEMANDES ====================

export function useCreditDemands(filters?: CreditDemandFilters) {
    const service = ServiceFactory.getCreditSpecialeService()
    
    return useQuery<CreditDemand[]>({
        queryKey: ['creditDemands', filters],
        queryFn: () => service.getDemandsWithFilters(filters),
        staleTime: 2 * 60 * 1000,
        gcTime: 5 * 60 * 1000,
    })
}

export function useCreditDemand(id: string) {
    const service = ServiceFactory.getCreditSpecialeService()
    
    return useQuery<CreditDemand | null>({
        queryKey: ['creditDemand', id],
        queryFn: () => service.getDemandById(id),
        enabled: !!id,
        staleTime: 2 * 60 * 1000,
    })
}

export function useCreditDemandsStats(filters?: CreditDemandFilters) {
    const service = ServiceFactory.getCreditSpecialeService()
    
    return useQuery({
        queryKey: ['creditDemandsStats', filters],
        queryFn: () => service.getDemandsStats(filters),
        staleTime: 2 * 60 * 1000,
    })
}

export function useCreditDemandMutations() {
    const qc = useQueryClient()
    const { user } = useAuth()
    const service = ServiceFactory.getCreditSpecialeService()

    const create = useMutation({
        mutationFn: (data: Omit<CreditDemand, 'id' | 'createdAt' | 'updatedAt'>) => {
            if (!user?.uid) throw new Error('Utilisateur non authentifié')
            return service.createDemand({
                ...data,
                createdBy: user.uid,
                updatedBy: user.uid,
            })
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['creditDemands'] })
            qc.invalidateQueries({ queryKey: ['creditDemandsStats'] })
            toast.success('Demande créée avec succès')
        },
        onError: (error: any) => {
            toast.error(error?.message || 'Erreur lors de la création de la demande')
        },
    })

    const updateStatus = useMutation({
        mutationFn: ({ id, status, comments }: { id: string; status: CreditDemandStatus; comments?: string }) => {
            if (!user?.uid) throw new Error('Utilisateur non authentifié')
            return service.updateDemandStatus(id, status, user.uid, comments)
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['creditDemands'] })
            qc.invalidateQueries({ queryKey: ['creditDemand'] })
            qc.invalidateQueries({ queryKey: ['creditDemandsStats'] })
            toast.success('Statut de la demande mis à jour')
        },
        onError: (error: any) => {
            toast.error(error?.message || 'Erreur lors de la mise à jour du statut')
        },
    })

    const updateDemand = useMutation({
        mutationFn: ({ demandId, data }: { demandId: string; data: UpdateCreditDemandInput }) => {
            if (!user?.uid) throw new Error('Utilisateur non authentifié')
            return service.updateDemandDetails(demandId, data, user.uid)
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['creditDemands'] })
            qc.invalidateQueries({ queryKey: ['creditDemand'] })
            qc.invalidateQueries({ queryKey: ['creditDemandsStats'] })
            toast.success('Demande modifiée avec succès')
        },
        onError: (error: any) => {
            toast.error(error?.message || 'Erreur lors de la modification de la demande')
        },
    })

    const deleteDemand = useMutation({
        mutationFn: (demandId: string) => service.deleteDemand(demandId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['creditDemands'] })
            qc.invalidateQueries({ queryKey: ['creditDemand'] })
            qc.invalidateQueries({ queryKey: ['creditDemandsStats'] })
            toast.success('Demande supprimée')
        },
        onError: (error: any) => {
            toast.error(error?.message || 'Erreur lors de la suppression de la demande')
        },
    })

    return { create, updateStatus, updateDemand, deleteDemand }
}

// ==================== CONTRATS ====================

export function useCreditContracts(filters?: CreditContractFilters) {
    const service = ServiceFactory.getCreditSpecialeService()
    
    return useQuery<CreditContract[]>({
        queryKey: ['creditContracts', filters],
        queryFn: () => service.getContractsWithFilters(filters),
        staleTime: 2 * 60 * 1000,
        gcTime: 5 * 60 * 1000,
    })
}

export function useCreditContract(id: string) {
    const service = ServiceFactory.getCreditSpecialeService()
    
    return useQuery<CreditContract | null>({
        queryKey: ['creditContract', id],
        queryFn: () => service.getContractById(id),
        enabled: !!id,
        staleTime: 2 * 60 * 1000,
    })
}

export function useCreditContractsStats(filters?: CreditContractFilters) {
    const service = ServiceFactory.getCreditSpecialeService()
    
    return useQuery({
        queryKey: ['creditContractsStats', filters],
        queryFn: () => service.getContractsStats(filters),
        staleTime: 2 * 60 * 1000,
    })
}

export function useCreditContractMutations() {
    const qc = useQueryClient()
    const { user } = useAuth()
    const service = ServiceFactory.getCreditSpecialeService()

    const createFromDemand = useMutation({
        mutationFn: ({ 
            demandId, 
            simulationData 
        }: { 
            demandId: string
            simulationData: {
                interestRate: number
                monthlyPaymentAmount: number
                duration: number
                firstPaymentDate: Date
                totalAmount: number
                emergencyContact?: EmergencyContact
                guarantorRemunerationPercentage?: number
            }
        }) => {
            if (!user?.uid) throw new Error('Utilisateur non authentifié')
            return service.createContractFromDemand(demandId, user.uid, simulationData)
        },
        onSuccess: async (contract, variables) => {
            // Mise à jour optimiste : mettre à jour toutes les queries qui contiennent cette demande
            qc.setQueriesData(
                { queryKey: ['creditDemands'] },
                (oldData: CreditDemand[] | undefined) => {
                    if (!oldData) return oldData
                    return oldData.map(demand => 
                        demand.id === variables.demandId 
                            ? { ...demand, contractId: contract.id }
                            : demand
                    )
                }
            )
            // Invalider toutes les queries liées pour s'assurer que tout est à jour
            await Promise.all([
                qc.invalidateQueries({ queryKey: ['creditContracts'] }),
                qc.invalidateQueries({ queryKey: ['creditContractsStats'] }),
                qc.invalidateQueries({ queryKey: ['creditDemands'] }),
                qc.invalidateQueries({ queryKey: ['creditDemandsStats'] }),
            ])
            // Refetch explicite pour mettre à jour immédiatement
            await qc.refetchQueries({ queryKey: ['creditDemands'] })
        },
        onError: (error: any) => {
            toast.error(error?.message || 'Erreur lors de la création du contrat')
        },
    })

    const generateContractPDF = useMutation({
        mutationFn: ({ contractId, blank }: { contractId: string; blank?: boolean }) => {
            if (!user?.uid) throw new Error('Utilisateur non authentifié')
            return service.generateContractPDF(contractId, blank)
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['creditContract'] })
            toast.success('Contrat PDF généré avec succès')
        },
        onError: (error: any) => {
            toast.error(error?.message || 'Erreur lors de la génération du contrat PDF')
        },
    })

    const uploadSignedContract = useMutation({
        mutationFn: ({ contractId, signedContractFile }: { contractId: string; signedContractFile: File }) => {
            if (!user?.uid) throw new Error('Utilisateur non authentifié')
            return service.uploadSignedContract(contractId, signedContractFile, user.uid)
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['creditContract'] })
            qc.invalidateQueries({ queryKey: ['creditContracts'] })
            qc.invalidateQueries({ queryKey: ['creditContractsStats'] })
            toast.success('Contrat signé téléversé et contrat activé avec succès')
        },
        onError: (error: any) => {
            toast.error(error?.message || 'Erreur lors du téléversement du contrat signé')
        },
    })

    const updateStatus = useMutation({
        mutationFn: ({ id, status }: { id: string; status: CreditContractStatus }) => {
            if (!user?.uid) throw new Error('Utilisateur non authentifié')
            return service.updateContractStatus(id, status, user.uid)
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['creditContracts'] })
            qc.invalidateQueries({ queryKey: ['creditContract'] })
            qc.invalidateQueries({ queryKey: ['creditContractsStats'] })
            toast.success('Statut du contrat mis à jour')
        },
        onError: (error: any) => {
            toast.error(error?.message || 'Erreur lors de la mise à jour du statut')
        },
    })

    // Clôture de contrat - Quittance
    const generateQuittancePDF = useMutation({
        mutationFn: ({ contractId, pdfFile }: { contractId: string; pdfFile: File }) => {
            return service.generateQuittancePDF(contractId, pdfFile)
        },
        onSuccess: (_, variables) => {
            qc.invalidateQueries({ queryKey: ['creditContract', variables.contractId] })
        },
        onError: (error: any) => {
            toast.error(error?.message || 'Erreur lors de la génération de la quittance')
        },
    })

    // Clôture de contrat
    const validateFinalRepayment = useMutation({
        mutationFn: ({ contractId, motif }: { contractId: string; motif: string }) => {
            if (!user?.uid) throw new Error('Utilisateur non authentifié')
            return service.validateDischarge(contractId, motif, user.uid)
        },
        onSuccess: (_, variables) => {
            qc.invalidateQueries({ queryKey: ['creditContract', variables.contractId] })
            toast.success('Remboursement final validé')
        },
        onError: (error: any) => {
            toast.error(error?.message || 'Erreur lors de la validation du remboursement final')
        },
    })

    const uploadSignedQuittance = useMutation({
        mutationFn: ({ contractId, file }: { contractId: string; file: File }) => {
            if (!user?.uid) throw new Error('Utilisateur non authentifié')
            return service.uploadSignedQuittance(contractId, file, user.uid)
        },
        onSuccess: (_, variables) => {
            qc.invalidateQueries({ queryKey: ['creditContract', variables.contractId] })
            toast.success('Quittance signée téléversée')
        },
        onError: (error: any) => {
            toast.error(error?.message || 'Erreur lors du téléversement de la quittance')
        },
    })

    const closeContract = useMutation({
        mutationFn: ({ contractId, closedAt, motifCloture }: { contractId: string; closedAt: Date; motifCloture: string }) => {
            if (!user?.uid) throw new Error('Utilisateur non authentifié')
            return service.closeContract(contractId, { closedAt, closedBy: user.uid, motifCloture })
        },
        onSuccess: (_, variables) => {
            qc.invalidateQueries({ queryKey: ['creditContract', variables.contractId] })
            qc.invalidateQueries({ queryKey: ['creditContracts'] })
            qc.invalidateQueries({ queryKey: ['creditContractsStats'] })
            toast.success('Contrat clôturé')
        },
        onError: (error: any) => {
            toast.error(error?.message || 'Erreur lors de la clôture du contrat')
        },
    })

    const deleteContract = useMutation({
        mutationFn: (contractId: string) => {
            if (!user?.uid) throw new Error('Utilisateur non authentifié')
            return service.deleteContract(contractId, user.uid)
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['creditContracts'] })
            qc.invalidateQueries({ queryKey: ['creditContractsStats'] })
            qc.invalidateQueries({ queryKey: ['creditContract'] })
            qc.invalidateQueries({ queryKey: ['creditDemands'] })
            qc.invalidateQueries({ queryKey: ['creditDemandsStats'] })
            toast.success('Contrat supprimé')
        },
        onError: (error: any) => {
            toast.error(error?.message || 'Erreur lors de la suppression du contrat')
        },
    })

    return { createFromDemand, updateStatus, generateContractPDF, uploadSignedContract, generateQuittancePDF, validateFinalRepayment, uploadSignedQuittance, closeContract, deleteContract }
}

// ==================== ÉCHÉANCES (INSTALLMENTS) ====================

export function useCreditInstallmentsByCreditId(creditId: string) {
    const service = ServiceFactory.getCreditSpecialeService()
    
    return useQuery<CreditInstallment[]>({
        queryKey: ['creditInstallments', 'creditId', creditId],
        queryFn: () => service.getInstallmentsByCreditId(creditId),
        enabled: !!creditId,
        staleTime: 2 * 60 * 1000,
    })
}

// ==================== PAIEMENTS ====================

export function useCreditPayments(filters?: CreditPaymentFilters) {
    const service = ServiceFactory.getCreditSpecialeService()
    
    return useQuery<CreditPayment[]>({
        queryKey: ['creditPayments', filters],
        queryFn: () => service.getPaymentsWithFilters(filters),
        staleTime: 2 * 60 * 1000,
    })
}

export function useCreditPaymentsByCreditId(creditId: string) {
    const service = ServiceFactory.getCreditSpecialeService()
    
    return useQuery<CreditPayment[]>({
        queryKey: ['creditPayments', 'creditId', creditId],
        queryFn: () => service.getPaymentsByCreditId(creditId),
        enabled: !!creditId,
        staleTime: 2 * 60 * 1000,
    })
}

export function useCreditPaymentMutations() {
    const qc = useQueryClient()
    const { user } = useAuth()
    const service = ServiceFactory.getCreditSpecialeService()

    const create = useMutation({
        mutationFn: ({ data, proofFile, penaltyIds, installmentNumber }: { data: Omit<CreditPayment, 'id' | 'createdAt' | 'updatedAt' | 'proofUrl'>; proofFile?: File; penaltyIds?: string[]; installmentNumber?: number }) => {
            if (!user?.uid) throw new Error('Utilisateur non authentifié')
            return service.createPayment({
                ...data,
                createdBy: user.uid,
                updatedBy: user.uid,
            }, proofFile, penaltyIds, installmentNumber)
        },
        onSuccess: async (_, variables) => {
            const creditId = variables.data.creditId
            // Invalider toutes les queries liées pour rafraîchir l'affichage
            await Promise.all([
                qc.invalidateQueries({ queryKey: ['creditPayments'] }),
                qc.invalidateQueries({ queryKey: ['creditPayments', 'creditId', creditId] }),
                qc.invalidateQueries({ queryKey: ['creditPenalties'] }),
                qc.invalidateQueries({ queryKey: ['creditPenalties', 'creditId', creditId] }),
                qc.invalidateQueries({ queryKey: ['creditContract', creditId] }),
                qc.invalidateQueries({ queryKey: ['creditContracts'] }),
                qc.invalidateQueries({ queryKey: ['creditInstallments', 'creditId', creditId] }),
                qc.invalidateQueries({ queryKey: ['guarantorRemunerations', 'creditId', creditId] }),
                qc.invalidateQueries({ queryKey: ['creditContractsStats'] }),
            ])
            // Refetch explicite pour mettre à jour immédiatement
            await Promise.all([
                qc.refetchQueries({ queryKey: ['creditPayments', 'creditId', creditId] }),
                qc.refetchQueries({ queryKey: ['creditInstallments', 'creditId', creditId] }),
                qc.refetchQueries({ queryKey: ['creditContract', creditId] }),
                qc.refetchQueries({ queryKey: ['creditPenalties', 'creditId', creditId] }),
                qc.refetchQueries({ queryKey: ['guarantorRemunerations', 'creditId', creditId] }),
            ])
            toast.success('Paiement enregistré avec succès')
        },
        onError: (error: any) => {
            toast.error(error?.message || 'Erreur lors de l\'enregistrement du paiement')
        },
    })

    return { create }
}

// ==================== PÉNALITÉS ====================

export function useCreditPenaltiesByCreditId(creditId: string) {
    const service = ServiceFactory.getCreditSpecialeService()
    
    return useQuery<CreditPenalty[]>({
        queryKey: ['creditPenalties', 'creditId', creditId],
        queryFn: () => service.getPenaltiesByCreditId(creditId),
        enabled: !!creditId,
        staleTime: 2 * 60 * 1000,
    })
}

export function useUnpaidCreditPenaltiesByCreditId(creditId: string) {
    const service = ServiceFactory.getCreditSpecialeService()
    
    return useQuery<CreditPenalty[]>({
        queryKey: ['creditPenalties', 'unpaid', 'creditId', creditId],
        queryFn: () => service.getUnpaidPenaltiesByCreditId(creditId),
        enabled: !!creditId,
        staleTime: 2 * 60 * 1000,
    })
}

// ==================== RÉMUNÉRATION GARANT ====================

export function useGuarantorRemunerationsByCreditId(creditId: string) {
    const service = ServiceFactory.getCreditSpecialeService()
    
    return useQuery<GuarantorRemuneration[]>({
        queryKey: ['guarantorRemunerations', 'creditId', creditId],
        queryFn: () => service.getRemunerationsByCreditId(creditId),
        enabled: !!creditId,
        staleTime: 2 * 60 * 1000,
    })
}

export function useGuarantorRemunerationsByGuarantorId(guarantorId: string) {
    const service = ServiceFactory.getCreditSpecialeService()
    
    return useQuery<GuarantorRemuneration[]>({
        queryKey: ['guarantorRemunerations', 'guarantorId', guarantorId],
        queryFn: () => service.getRemunerationsByGuarantorId(guarantorId),
        enabled: !!guarantorId,
        staleTime: 2 * 60 * 1000,
    })
}

// ==================== HISTORIQUE ====================

export function useCreditHistory(contractId: string) {
    const service = ServiceFactory.getCreditSpecialeService()
    
    return useQuery({
        queryKey: ['creditHistory', contractId],
        queryFn: () => service.getCreditHistory(contractId),
        enabled: !!contractId,
        staleTime: 2 * 60 * 1000,
    })
}

// ==================== SIMULATIONS ====================

export function useStandardSimulation() {
    const service = ServiceFactory.getCreditSpecialeService()
    
    return useMutation<StandardSimulation, Error, {
        amount: number
        interestRate: number
        monthlyPayment: number
        firstPaymentDate: Date
        creditType: 'SPECIALE' | 'FIXE' | 'AIDE'
    }>({
        mutationFn: ({ amount, interestRate, monthlyPayment, firstPaymentDate, creditType }) =>
            service.calculateStandardSimulation(amount, interestRate, monthlyPayment, firstPaymentDate, creditType),
    })
}

export function useCustomSimulation() {
    const service = ServiceFactory.getCreditSpecialeService()
    
    return useMutation<CustomSimulation, Error, {
        amount: number
        interestRate: number
        monthlyPayments: Array<{ month: number; amount: number }>
        firstPaymentDate: Date
        creditType: 'SPECIALE' | 'FIXE' | 'AIDE'
    }>({
        mutationFn: ({ amount, interestRate, monthlyPayments, firstPaymentDate, creditType }) =>
            service.calculateCustomSimulation(amount, interestRate, monthlyPayments, firstPaymentDate, creditType),
    })
}

export function useProposedSimulation() {
    const service = ServiceFactory.getCreditSpecialeService()
    
    return useMutation<StandardSimulation, Error, {
        amount: number // Montant emprunté
        duration: number
        interestRate: number
        firstPaymentDate: Date
        creditType: 'SPECIALE' | 'FIXE' | 'AIDE'
    }>({
        mutationFn: ({ amount, duration, interestRate, firstPaymentDate, creditType }) =>
            service.calculateProposedSimulation(amount, duration, interestRate, firstPaymentDate, creditType),
    })
}

// Hook combiné pour faciliter l'utilisation
export function useSimulations() {
    const calculateStandard = useStandardSimulation()
    const calculateCustom = useCustomSimulation()
    const calculateProposed = useProposedSimulation()
    
    return {
        calculateStandard,
        calculateCustom,
        calculateProposed,
    }
}

// ==================== ÉLIGIBILITÉ ====================

export function useCheckEligibility() {
    const service = ServiceFactory.getCreditSpecialeService()
    
    return useMutation<{ eligible: boolean; reason?: string }, Error, { clientId: string; guarantorId?: string }>({
        mutationFn: ({ clientId, guarantorId }) =>
            service.checkEligibility(clientId, guarantorId),
    })
}

// ==================== AUGMENTATION DE CRÉDIT (EXTENSION) ====================

/**
 * Hook pour vérifier l'éligibilité à l'extension d'un contrat
 */
export function useCheckExtensionEligibility(contractId: string) {
    const service = ServiceFactory.getCreditSpecialeService()
    
    return useQuery({
        queryKey: ['creditExtensionEligibility', contractId],
        queryFn: () => service.checkExtensionEligibility(contractId),
        enabled: !!contractId,
        staleTime: 0, // Toujours rafraîchir pour avoir les données les plus récentes
    })
}

/**
 * Hook pour calculer les montants d'une extension de crédit
 */
export function useCalculateExtensionAmounts(contractId: string) {
    const service = ServiceFactory.getCreditSpecialeService()
    
    return useQuery({
        queryKey: ['creditExtensionAmounts', contractId],
        queryFn: () => service.calculateExtensionAmounts(contractId),
        enabled: !!contractId,
        staleTime: 30 * 1000, // Rafraîchir fréquemment car les données peuvent changer
    })
}

/**
 * Hook mutation pour étendre un contrat (augmentation de crédit)
 */
export function useExtendContract() {
    const qc = useQueryClient()
    const { user } = useAuth()
    const service = ServiceFactory.getCreditSpecialeService()

    return useMutation({
        mutationFn: (data: {
            parentContractId: string
            additionalAmount: number
            cause: string
            simulationData: {
                interestRate: number
                monthlyPaymentAmount: number
                duration: number
                firstPaymentDate: Date
                totalAmount: number
            }
            emergencyContact?: EmergencyContact
            desiredDate?: string
        }) => {
            if (!user?.uid) throw new Error('Utilisateur non authentifié')
            return service.extendContract(
                data.parentContractId,
                data.additionalAmount,
                data.cause,
                data.simulationData,
                user.uid,
                data.emergencyContact,
                data.desiredDate
            )
        },
        onSuccess: async (result) => {
            // Invalider toutes les queries liées
            await Promise.all([
                qc.invalidateQueries({ queryKey: ['creditContracts'] }),
                qc.invalidateQueries({ queryKey: ['creditContractsStats'] }),
                qc.invalidateQueries({ queryKey: ['creditContract', result.parentContract.id] }),
                qc.invalidateQueries({ queryKey: ['creditContract', result.newContract.id] }),
                qc.invalidateQueries({ queryKey: ['creditDemands'] }),
                qc.invalidateQueries({ queryKey: ['creditDemandsStats'] }),
                qc.invalidateQueries({ queryKey: ['creditPayments'] }),
                qc.invalidateQueries({ queryKey: ['creditExtensionEligibility'] }),
                qc.invalidateQueries({ queryKey: ['creditExtensionAmounts'] }),
            ])
            toast.success('Augmentation de crédit créée avec succès')
        },
        onError: (error: any) => {
            toast.error(error?.message || 'Erreur lors de l\'augmentation du crédit')
        },
    })
}

/**
 * Hook pour récupérer le contrat enfant (si extension)
 */
export function useChildContract(parentContractId: string) {
    const service = ServiceFactory.getCreditSpecialeService()
    
    return useQuery<CreditContract | null>({
        queryKey: ['creditContract', 'child', parentContractId],
        queryFn: () => service.getChildContract(parentContractId),
        enabled: !!parentContractId,
        staleTime: 2 * 60 * 1000,
    })
}

/**
 * Hook pour récupérer le contrat parent (si extension)
 */
export function useParentContract(childContractId: string | undefined) {
    const service = ServiceFactory.getCreditSpecialeService()
    
    return useQuery<CreditContract | null>({
        queryKey: ['creditContract', 'parent', childContractId],
        queryFn: () => service.getParentContract(childContractId!),
        enabled: !!childContractId,
        staleTime: 2 * 60 * 1000,
    })
}

