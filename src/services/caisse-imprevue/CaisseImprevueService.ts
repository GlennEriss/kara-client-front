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

            // 2. Vérifier s'il y a un support actif
            const activeSupport = await this.getActiveSupport(contractId)
            let supportRepaymentAmount = 0
            let supportRepaymentId: string | undefined = undefined

            if (activeSupport && activeSupport.status === 'ACTIVE') {
                // BLOQUER LE VERSEMENT : Le support doit être remboursé intégralement AVANT tout nouveau versement
                if (versementData.amount < activeSupport.amountRemaining) {
                    throw new Error(
                        `Impossible d'effectuer un versement. Vous devez d'abord rembourser intégralement le support actif. ` +
                        `Montant restant à rembourser : ${activeSupport.amountRemaining.toLocaleString('fr-FR')} FCFA. ` +
                        `Veuillez verser au minimum ce montant pour rembourser le support.`
                    )
                }

                // Si le montant couvre ou dépasse le support restant
                supportRepaymentAmount = activeSupport.amountRemaining

                // Générer un ID pour le remboursement
                const now = new Date()
                const repaymentId = `rep_${now.getTime()}`
                supportRepaymentId = repaymentId

                // Créer l'objet de remboursement
                const repayment: Omit<SupportRepaymentCI, 'createdAt'> = {
                    id: repaymentId,
                    amount: supportRepaymentAmount,
                    date: versementData.date,
                    time: versementData.time,
                    monthIndex,
                    versementId: `v_${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getFullYear()).slice(-2)}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`,
                    createdBy: userId,
                }

                // Enregistrer le remboursement (cela marque aussi le support comme REPAID)
                await this.recordRepayment(contractId, activeSupport.id, monthIndex, repayment)

                // Déduire le montant du support du versement
                // Le montant restant après remboursement du support ira au versement mensuel
                versementData.amount = versementData.amount - supportRepaymentAmount
            }

            // 3. Upload de la preuve de paiement dans Firebase Storage
            const { url: proofUrl, path: proofPath } = await this.documentRepository.uploadDocumentFile(
                proofFile,
                contract.memberId,
                'PROOF_PAYMENT_CI'
            )

            // 4. Générer l'ID du versement
            const now = new Date()
            const day = String(now.getDate()).padStart(2, '0')
            const month = String(now.getMonth() + 1).padStart(2, '0')
            const year = String(now.getFullYear()).slice(-2)
            const hours = String(now.getHours()).padStart(2, '0')
            const minutes = String(now.getMinutes()).padStart(2, '0')
            const versementId = `v_${day}${month}${year}_${hours}${minutes}`

            // 5. Créer le versement complet avec les infos de remboursement de support
            const versement: VersementCI = {
                id: versementId,
                ...versementData,
                proofUrl,
                proofPath,
                supportRepaymentAmount,
                supportRepaymentId,
                createdAt: now,
                createdBy: userId,
            }

            // 6. Vérifier si le paiement du mois existe
            let payment = await this.paymentCIRepository.getPaymentByMonth(contractId, monthIndex)

            // 7. Si le paiement n'existe pas, le créer
            if (!payment) {
                const paymentData: Omit<PaymentCI, 'id' | 'createdAt' | 'updatedAt'> = {
                    contractId,
                    monthIndex,
                    status: 'DUE',
                    targetAmount: contract.subscriptionCIAmountPerMonth,
                    accumulatedAmount: 0,
                    supportRepaymentAmount: 0,
                    versements: [],
                    createdBy: userId,
                    updatedBy: userId,
                }

                payment = await this.paymentCIRepository.createPayment(contractId, paymentData)
            }

            // 8. Ajouter le versement au paiement
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
    async requestSupport(contractId: string, amount: number, adminId: string, documentFile: File): Promise<SupportCI> {
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

            // 4. Téléverser le document PDF dans Firebase Storage
            const { url: documentUrl, path: documentPath, size } = await this.documentRepository.uploadDocumentFile(
                documentFile,
                contract.memberId,
                'SUPPORT_CI'
            )

            // 5. Créer l'enregistrement du document dans Firestore
            const documentData: Omit<Document, 'id' | 'createdAt' | 'updatedAt'> = {
                type: 'SUPPORT_CI',
                format: 'pdf',
                libelle: `Demande de support - ${contract.memberFirstName} ${contract.memberLastName} - Contrat ${contractId}`,
                path: documentPath,
                url: documentUrl,
                size: size,
                memberId: contract.memberId,
                contractId: contractId,
                createdBy: adminId,
                updatedBy: adminId,
            }

            const document = await this.documentRepository.createDocument(documentData)
            if (!document || !document.id) {
                throw new Error('Erreur lors de la création du document')
            }

            // 6. Récupérer les 3 derniers mois payés
            const payments = await this.paymentCIRepository.getPaymentsByContractId(contractId)
            const paidPayments = payments
                .filter(p => p.status === 'PAID')
                .sort((a, b) => a.monthIndex - b.monthIndex)
                .slice(-3)

            // 7. Calculer les déductions des 3 derniers mois
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

            // 8. Créer le support avec les informations du document
            const now = new Date()
            const supportData: Omit<SupportCI, 'id' | 'createdAt' | 'updatedAt'> = {
                contractId,
                amount,
                status: 'ACTIVE',
                documentId: document.id,
                documentUrl: documentUrl,
                documentPath: documentPath,
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

    /**
     * Calcule les statistiques de paiement d'un contrat
     * - totalAmountPaid: somme des targetAmount des paiements (montant total versé)
     * - paymentCount: nombre de documents dans la collection payments
     * - supportCount: nombre total d'aides reçues
     */
    async getContractPaymentStats(contractId: string): Promise<{ totalAmountPaid: number; paymentCount: number; supportCount: number }> {
        try {
            // 1. Récupérer tous les paiements
            const payments = await this.paymentCIRepository.getPaymentsByContractId(contractId)
            
            // 2. Calculer le montant total versé (somme des targetAmount)
            const totalAmountPaid = payments.reduce((sum, payment) => sum + (payment.targetAmount || 0), 0)
            
            // 3. Nombre de versements (nombre de documents dans la collection payments)
            const paymentCount = payments.length
            
            // 4. Nombre total d'aides reçues
            const supports = await this.getSupportHistory(contractId)
            const supportCount = supports.length

            return {
                totalAmountPaid,
                paymentCount,
                supportCount
            }
        } catch (error) {
            console.error('Erreur lors du calcul des statistiques de paiement:', error)
            return {
                totalAmountPaid: 0,
                paymentCount: 0,
                supportCount: 0
            }
        }
    }
}