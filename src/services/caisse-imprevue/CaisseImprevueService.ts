import { User, Admin, ContractCI, Document, PaymentCI, VersementCI, SupportCI, SupportRepaymentCI } from "@/types/types";
import { ICaisseImprevueService, VersementFormData } from "./ICaisseImprevueService";
import { IMemberRepository } from "@/repositories/members/IMemberRepository";
import { SubscriptionCI } from "@/types/types";
import { ISubscriptionCIRepository } from "@/repositories/caisse-imprevu/ISubscriptionCIRepository";
import { IContractCIRepository, ContractsCIFilters, ContractsCIStats } from "@/repositories/caisse-imprevu/IContractCIRepository";
import { IAdminRepository } from "@/repositories/admins/IAdminRepository";
import { IDocumentRepository } from "@/repositories/documents/IDocumentRepository";
import { IPaymentCIRepository } from "@/repositories/caisse-imprevu/IPaymentCIRepository";
import { ISupportCIRepository } from "@/repositories/caisse-imprevu/ISupportCIRepository";

export class CaisseImprevueService implements ICaisseImprevueService {
    readonly name = "CaisseImprevueService"

    constructor(
        private memberRepository: IMemberRepository, 
        private subscriptionCIRepository: ISubscriptionCIRepository,
        private contractCIRepository: IContractCIRepository,
        private adminRepository: IAdminRepository,
        private documentRepository: IDocumentRepository,
        private paymentCIRepository: IPaymentCIRepository,
        private supportCIRepository: ISupportCIRepository
    ) {
        this.memberRepository = memberRepository
        this.subscriptionCIRepository = subscriptionCIRepository
        this.contractCIRepository = contractCIRepository
        this.adminRepository = adminRepository
        this.documentRepository = documentRepository
        this.paymentCIRepository = paymentCIRepository
        this.supportCIRepository = supportCIRepository
    }

    async searchMembers(searchQuery: string): Promise<User[]> {
        return await this.memberRepository.searchMembers(searchQuery)
    }

    async getAllSubscriptions(): Promise<SubscriptionCI[]> {
        return await this.subscriptionCIRepository.getAllSubscriptions()
    }

    async getActiveSubscriptions(): Promise<SubscriptionCI[]> {
        return await this.subscriptionCIRepository.getActiveSubscriptions()
    }

    async getSubscriptionById(id: string): Promise<SubscriptionCI | null> {
        return await this.subscriptionCIRepository.getSubscriptionById(id)
    }

    async createSubscription(data: Omit<SubscriptionCI, 'createdAt' | 'updatedAt'>): Promise<SubscriptionCI> {
        return await this.subscriptionCIRepository.createSubscription(data)
    }

    async updateSubscription(id: string, data: Partial<SubscriptionCI>): Promise<SubscriptionCI> {
        const result = await this.subscriptionCIRepository.updateSubscription(id, data)
        if (!result) {
            throw new Error(`Forfait avec l'ID ${id} introuvable`)
        }
        return result
    }

    async deleteSubscription(id: string): Promise<void> {
        return await this.subscriptionCIRepository.deleteSubscription(id)
    }

    async createContractCI(data: Omit<ContractCI, 'createdAt' | 'updatedAt'>): Promise<ContractCI> {
        return await this.contractCIRepository.createContract(data)
    }

    async getContractCIById(id: string): Promise<ContractCI | null> {
        return await this.contractCIRepository.getContractById(id)
    }

    async getContractsCIByMemberId(memberId: string): Promise<ContractCI[]> {
        return await this.contractCIRepository.getContractsByMemberId(memberId)
    }

    async getAdminById(id: string): Promise<Admin | null> {
        return await this.adminRepository.getAdminById(id)
    }

    async getContractsCIPaginated(filters?: ContractsCIFilters): Promise<ContractCI[]> {
        return await this.contractCIRepository.getContractsWithFilters(filters)
    }

    async getContractsCIStats(): Promise<ContractsCIStats> {
        return await this.contractCIRepository.getContractsStats()
    }

    async uploadContractDocument(file: File, contractId: string, memberId: string, userId: string): Promise<{ documentId: string; contract: ContractCI }> {
        // 1. Upload du fichier vers Firebase Storage
        const { url, path, size } = await this.documentRepository.uploadDocumentFile(file, memberId, 'ADHESION_CI')

        // 2. Créer l'enregistrement du document dans Firestore
        const documentData: Omit<Document, 'id' | 'createdAt' | 'updatedAt'> = {
            type: 'ADHESION_CI',
            format: 'pdf',
            libelle: `Contrat CI - ${memberId}`,
            path: path,
            url: url,
            size: size,
            memberId: memberId,
            contractId: contractId,
            createdBy: userId,
            updatedBy: userId,
        }

        const document = await this.documentRepository.createDocument(documentData)

        if (!document || !document.id) {
            throw new Error('Erreur lors de la création du document')
        }

        // 3. Mettre à jour le contrat avec l'ID du document
        const updatedContract = await this.contractCIRepository.updateContract(contractId, {
            contractStartId: document.id,
            updatedBy: userId,
        })

        if (!updatedContract) {
            throw new Error(`Contrat ${contractId} introuvable`)
        }

        return {
            documentId: document.id,
            contract: updatedContract
        }
    }

    async uploadEmergencyContactImage(imageUrl: string, memberId: string, contractId: string): Promise<{ url: string; path: string }> {
        return await this.documentRepository.uploadImage(imageUrl, memberId, contractId, 'emergency-contact-document')
    }

    async getDocumentById(documentId: string): Promise<Document | null> {
        return await this.documentRepository.getDocumentById(documentId)
    }

    // ================== MÉTHODES DE PAIEMENT ==================

    async getPaymentsByContractId(contractId: string): Promise<PaymentCI[]> {
        return await this.paymentCIRepository.getPaymentsByContractId(contractId)
    }

    async createVersement(
        contractId: string, 
        monthIndex: number, 
        versementData: VersementFormData, 
        proofFile: File, 
        userId: string
    ): Promise<PaymentCI> {
        try {
            // 1. Récupérer le contrat pour avoir les informations du membre
            const contract = await this.contractCIRepository.getContractById(contractId)
            if (!contract) {
                throw new Error(`Contrat ${contractId} introuvable`)
            }

            // 2. Upload de la preuve de paiement dans Firebase Storage
            const { url: proofUrl, path: proofPath } = await this.documentRepository.uploadDocumentFile(
                proofFile,
                contract.memberId,
                'PROOF_PAYMENT_CI'
            )

            // 3. Générer l'ID du versement
            const now = new Date()
            const day = String(now.getDate()).padStart(2, '0')
            const month = String(now.getMonth() + 1).padStart(2, '0')
            const year = String(now.getFullYear()).slice(-2)
            const hours = String(now.getHours()).padStart(2, '0')
            const minutes = String(now.getMinutes()).padStart(2, '0')
            const versementId = `v_${day}${month}${year}_${hours}${minutes}`

            // 4. Créer le versement complet
            const versement: VersementCI = {
                id: versementId,
                ...versementData,
                proofUrl,
                proofPath,
                createdAt: now,
                createdBy: userId,
            }

            // 5. Vérifier si le paiement du mois existe
            let payment = await this.paymentCIRepository.getPaymentByMonth(contractId, monthIndex)

            // 6. Si le paiement n'existe pas, le créer
            if (!payment) {
                const paymentData: Omit<PaymentCI, 'id' | 'createdAt' | 'updatedAt'> = {
                    contractId,
                    monthIndex,
                    status: 'DUE',
                    targetAmount: contract.subscriptionCIAmountPerMonth,
                    accumulatedAmount: 0,
                    versements: [],
                    createdBy: userId,
                    updatedBy: userId,
                }

                payment = await this.paymentCIRepository.createPayment(contractId, paymentData)
            }

            // 7. Ajouter le versement au paiement
            const updatedPayment = await this.paymentCIRepository.addVersement(
                contractId,
                monthIndex,
                versement,
                userId
            )

            return updatedPayment
        } catch (error) {
            console.error('Erreur lors de la création du versement:', error)
            throw error
        }
    }

    // ================== MÉTHODES DE GESTION DES SUPPORTS ==================

    /**
     * Demande un support financier pour un contrat
     */
    async requestSupport(contractId: string, amount: number, adminId: string): Promise<SupportCI> {
        try {
            // 1. Récupérer le contrat et les paiements
            const contract = await this.contractCIRepository.getContractById(contractId)
            if (!contract) {
                throw new Error('Contrat non trouvé')
            }

            // 2. Vérifier l'éligibilité
            const isEligible = await this.checkEligibilityForSupport(contractId)
            if (!isEligible) {
                throw new Error('Ce contrat n\'est pas éligible pour un support')
            }

            // 3. Valider le montant
            if (amount < contract.subscriptionCISupportMin || amount > contract.subscriptionCISupportMax) {
                throw new Error(`Le montant doit être entre ${contract.subscriptionCISupportMin} et ${contract.subscriptionCISupportMax} FCFA`)
            }

            // 4. Récupérer les 3 derniers mois payés
            const payments = await this.paymentCIRepository.getPaymentsByContractId(contractId)
            const paidPayments = payments
                .filter(p => p.status === 'PAID')
                .sort((a, b) => a.monthIndex - b.monthIndex)
                .slice(-3)

            // 5. Calculer les déductions des 3 derniers mois
            const deductions: { monthIndex: number; amount: number }[] = []
            let remainingToDeduct = amount

            for (const payment of paidPayments.reverse()) {
                const amountPaid = payment.accumulatedAmount
                const deduction = Math.min(remainingToDeduct, amountPaid)

                deductions.push({
                    monthIndex: payment.monthIndex,
                    amount: deduction,
                })

                remainingToDeduct -= deduction

                if (remainingToDeduct <= 0) break
            }

            // 6. Créer le support
            const now = new Date()
            const supportData: Omit<SupportCI, 'id' | 'createdAt' | 'updatedAt'> = {
                contractId,
                amount,
                status: 'ACTIVE',
                amountRepaid: 0,
                amountRemaining: amount,
                deductions,
                repayments: [],
                requestedAt: now,
                approvedAt: now,
                approvedBy: adminId,
                createdBy: adminId,
                updatedBy: adminId,
            }

            const support = await this.supportCIRepository.createSupport(contractId, supportData)

            return support
        } catch (error) {
            console.error('Erreur lors de la demande de support:', error)
            throw error
        }
    }

    /**
     * Récupère le support actif d'un contrat
     */
    async getActiveSupport(contractId: string): Promise<SupportCI | null> {
        return await this.supportCIRepository.getActiveSupportByContractId(contractId)
    }

    /**
     * Récupère l'historique complet des supports d'un contrat
     */
    async getSupportHistory(contractId: string): Promise<SupportCI[]> {
        return await this.supportCIRepository.getSupportHistory(contractId)
    }

    /**
     * Calcule la répartition d'un paiement entre remboursement de support et versement mensuel
     */
    async calculateRepayment(
        contractId: string,
        paymentAmount: number
    ): Promise<{ supportRepayment: number; remainingForMonth: number }> {
        const activeSupport = await this.getActiveSupport(contractId)

        if (!activeSupport || activeSupport.status !== 'ACTIVE') {
            return {
                supportRepayment: 0,
                remainingForMonth: paymentAmount,
            }
        }

        // Le remboursement du support est prioritaire
        const supportRepayment = Math.min(paymentAmount, activeSupport.amountRemaining)
        const remainingForMonth = paymentAmount - supportRepayment

        return {
            supportRepayment,
            remainingForMonth,
        }
    }

    /**
     * Enregistre un remboursement de support
     */
    async recordRepayment(
        contractId: string,
        supportId: string,
        monthIndex: number,
        repayment: Omit<SupportRepaymentCI, 'createdAt' | 'createdBy'>
    ): Promise<void> {
        try {
            // 1. Récupérer le support
            const support = await this.supportCIRepository.getSupportById(contractId, supportId)
            if (!support) {
                throw new Error('Support non trouvé')
            }

            // 2. Ajouter le remboursement
            const repaymentWithCreatedBy: Omit<SupportRepaymentCI, 'createdAt'> = {
                ...repayment,
                createdBy: repayment.id, // Temporaire, sera remplacé par l'ID de l'admin
            }

            await this.supportCIRepository.addRepayment(contractId, supportId, repaymentWithCreatedBy)

            // 3. Mettre à jour les montants
            const newAmountRepaid = support.amountRepaid + repayment.amount
            const newAmountRemaining = support.amountRemaining - repayment.amount

            await this.supportCIRepository.updateSupportAmounts(
                contractId,
                supportId,
                newAmountRepaid,
                newAmountRemaining
            )

            // 4. Si entièrement remboursé, mettre à jour le statut
            if (newAmountRemaining <= 0) {
                await this.supportCIRepository.updateSupportStatus(contractId, supportId, 'REPAID', new Date())
            }
        } catch (error) {
            console.error('Erreur lors de l\'enregistrement du remboursement:', error)
            throw error
        }
    }

    /**
     * Vérifie si un contrat est éligible pour un support
     */
    async checkEligibilityForSupport(contractId: string): Promise<boolean> {
        try {
            // 1. Récupérer le contrat
            const contract = await this.contractCIRepository.getContractById(contractId)
            if (!contract) {
                return false
            }

            // 2. Vérifier qu'il n'y a pas de support actif
            const activeSupport = await this.getActiveSupport(contractId)
            if (activeSupport && activeSupport.status === 'ACTIVE') {
                return false
            }

            // 3. Vérifier qu'au moins 3 mois sont payés
            const payments = await this.paymentCIRepository.getPaymentsByContractId(contractId)
            const paidMonths = payments.filter(p => p.status === 'PAID').length

            return paidMonths >= 3
        } catch (error) {
            console.error('Erreur lors de la vérification de l\'éligibilité:', error)
            return false
        }
    }
}