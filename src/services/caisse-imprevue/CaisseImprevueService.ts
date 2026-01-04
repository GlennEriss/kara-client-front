import { User, Admin, ContractCI, Document, PaymentCI, VersementCI, SupportCI, SupportRepaymentCI, EarlyRefundCI, FinalRefundCI, CaisseImprevueDemand, CaisseImprevueDemandFilters, CaisseImprevueDemandStats } from "@/types/types";
import { ICaisseImprevueService, VersementFormData } from "./ICaisseImprevueService";
import { IMemberRepository } from "@/repositories/members/IMemberRepository";
import { SubscriptionCI } from "@/types/types";
import { ISubscriptionCIRepository } from "@/repositories/caisse-imprevu/ISubscriptionCIRepository";
import { IContractCIRepository, ContractsCIFilters, ContractsCIStats } from "@/repositories/caisse-imprevu/IContractCIRepository";
import { IAdminRepository } from "@/repositories/admins/IAdminRepository";
import { IDocumentRepository } from "@/repositories/documents/IDocumentRepository";
import { IPaymentCIRepository } from "@/repositories/caisse-imprevu/IPaymentCIRepository";
import { ISupportCIRepository } from "@/repositories/caisse-imprevu/ISupportCIRepository";
import { IEarlyRefundCIRepository } from "@/repositories/caisse-imprevu/IEarlyRefundCIRepository";
import { ICaisseImprevueDemandRepository } from "@/repositories/caisse-imprevue/ICaisseImprevueDemandRepository";
import { ServiceFactory } from "@/factories/ServiceFactory";
import { NotificationService } from "@/services/notifications/NotificationService";
import { RepositoryFactory } from "@/factories/RepositoryFactory";

export class CaisseImprevueService implements ICaisseImprevueService {
    readonly name = "CaisseImprevueService"
    private notificationService: NotificationService

    private caisseImprevueDemandRepository: ICaisseImprevueDemandRepository

    constructor(
        private memberRepository: IMemberRepository, 
        private subscriptionCIRepository: ISubscriptionCIRepository,
        private contractCIRepository: IContractCIRepository,
        private adminRepository: IAdminRepository,
        private documentRepository: IDocumentRepository,
        private paymentCIRepository: IPaymentCIRepository,
        private supportCIRepository: ISupportCIRepository,
        private earlyRefundCIRepository: IEarlyRefundCIRepository,
        caisseImprevueDemandRepository?: ICaisseImprevueDemandRepository
    ) {
        this.memberRepository = memberRepository
        this.subscriptionCIRepository = subscriptionCIRepository
        this.contractCIRepository = contractCIRepository
        this.adminRepository = adminRepository
        this.documentRepository = documentRepository
        this.paymentCIRepository = paymentCIRepository
        this.supportCIRepository = supportCIRepository
        this.earlyRefundCIRepository = earlyRefundCIRepository
        this.caisseImprevueDemandRepository = caisseImprevueDemandRepository || RepositoryFactory.getCaisseImprevueDemandRepository()
        this.notificationService = ServiceFactory.getNotificationService()
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
        const contract = await this.contractCIRepository.createContract(data)
        
        // Créer une notification de création de contrat
        try {
            const frequencyLabel = data.paymentFrequency === 'DAILY' ? 'journalier' : 'mensuel'
            await this.notificationService.createNotification({
                module: 'caisse_imprevue',
                entityId: contract.id,
                type: 'contract_created',
                title: 'Nouveau contrat créé',
                message: `Un nouveau contrat ${frequencyLabel} a été créé pour ${data.memberFirstName} ${data.memberLastName}`,
                metadata: {
                    contractId: contract.id,
                    paymentFrequency: data.paymentFrequency,
                    memberId: data.memberId,
                    memberFirstName: data.memberFirstName,
                    memberLastName: data.memberLastName,
                },
            })
        } catch (error) {
            // Ne pas faire échouer la création du contrat si la notification échoue
            console.error('Erreur lors de la création de la notification:', error)
        }
        
        return contract
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

    async getContractsCIStats(filters?: ContractsCIFilters): Promise<ContractsCIStats> {
        return await this.contractCIRepository.getContractsStats(filters)
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

            // Notification pour les admins : demande de support créée
            try {
                await this.notificationService.createNotification({
                    module: 'caisse_imprevue',
                    entityId: contractId,
                    type: 'reminder',
                    title: 'Demande de support créée',
                    message: `Une demande de support de ${amount.toLocaleString('fr-FR')} FCFA a été créée pour le contrat de ${contract.memberFirstName} ${contract.memberLastName}.`,
                    metadata: {
                        contractId,
                        supportId: support.id,
                        memberId: contract.memberId,
                        amount,
                        documentId: document.id,
                    },
                });
            } catch (error) {
                console.error('Erreur lors de la création de la notification de support:', error);
            }

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
                
                // Notification si le support est entièrement remboursé
                try {
                    const contract = await this.contractCIRepository.getContractById(contractId);
                    if (contract) {
                        await this.notificationService.createNotification({
                            module: 'caisse_imprevue',
                            entityId: contractId,
                            type: 'reminder',
                            title: 'Support entièrement remboursé',
                            message: `Le support de ${support.amount.toLocaleString('fr-FR')} FCFA pour le contrat de ${contract.memberFirstName} ${contract.memberLastName} a été entièrement remboursé.`,
                            metadata: {
                                contractId,
                                supportId,
                                memberId: contract.memberId,
                                totalAmount: support.amount,
                            },
                        });
                    }
                } catch (error) {
                    console.error('Erreur lors de la création de la notification de remboursement complet:', error);
                }
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

    // ================== MÉTHODES DE RETRAIT ANTICIPÉ ==================

    /**
     * Demande un retrait anticipé CI
     * Cette méthode gère tout le processus en une seule étape :
     * - Validation du contrat et des paiements
     * - Upload de la preuve du retrait
     * - Upload du document PDF signé
     * - Création du document dans la collection documents
     * - Création de la demande de retrait anticipé
     */
    async requestEarlyRefundCI(
        contractId: string,
        data: {
            reason: string
            withdrawalDate: string
            withdrawalTime: string
            withdrawalAmount: number
            withdrawalMode: 'cash' | 'bank_transfer' | 'airtel_money' | 'mobicash'
            withdrawalProof: File
            documentPdf: File
            userId: string
        }
    ): Promise<EarlyRefundCI> {
        try {
            // 1. Validation du contrat
            const contract = await this.contractCIRepository.getContractById(contractId)
            if (!contract) {
                throw new Error('Contrat introuvable')
            }
            if (contract.status !== 'ACTIVE') {
                throw new Error('Le contrat doit être actif pour effectuer un retrait anticipé')
            }

            // 2. Vérifier les paiements (au moins 1 versement effectué)
            const payments = await this.paymentCIRepository.getPaymentsByContractId(contractId)
            const paidCount = payments.filter(p => p.status === 'PAID').length
            if (paidCount < 1) {
                throw new Error('Retrait anticipé indisponible : aucun versement effectué')
            }

            // 3. Vérifier qu'aucune demande active n'existe
            const existingRefunds = await this.earlyRefundCIRepository.getEarlyRefundsByContractId(contractId)
            const hasActiveEarly = existingRefunds.some(
                r => r.status !== 'ARCHIVED'
            )
            if (hasActiveEarly) {
                throw new Error('Une demande de retrait anticipé est déjà en cours pour ce contrat')
            }

            // 4. Calculer le montant nominal (somme des accumulatedAmount des paiements)
            const totalAmountPaid = payments.reduce(
                (sum, payment) => sum + (payment.accumulatedAmount || 0),
                0
            )

            // 5. Calculer le montant bonus (pour l'instant à 0, peut être implémenté selon les règles métier)
            const amountBonus = 0

            // 6. Upload de la preuve du retrait (image ou PDF)
            const { url: proofUrl, path: proofPath } = await this.documentRepository.uploadDocumentFile(
                data.withdrawalProof,
                contract.memberId,
                'PROOF_EARLY_REFUND_CI'
            )

            // 7. Upload du document PDF signé et création dans la collection documents
            const { url: documentUrl, path: documentPath, size } = await this.documentRepository.uploadDocumentFile(
                data.documentPdf,
                contract.memberId,
                'EARLY_REFUND_DOCUMENT_CI'
            )

            // 8. Créer l'enregistrement du document dans Firestore
            const documentData: Omit<Document, 'id' | 'createdAt' | 'updatedAt'> = {
                type: 'EARLY_REFUND_CI',
                format: 'pdf',
                libelle: `Document de retrait anticipé - ${contract.memberFirstName} ${contract.memberLastName} - Contrat ${contractId}`,
                path: documentPath,
                url: documentUrl,
                size: size,
                memberId: contract.memberId,
                contractId: contractId,
                createdBy: data.userId,
                updatedBy: data.userId,
            }

            const document = await this.documentRepository.createDocument(documentData)
            if (!document || !document.id) {
                throw new Error('Erreur lors de la création du document')
            }

            // 9. Créer la demande de retrait anticipé
            const withdrawalDate = new Date(data.withdrawalDate)
            const deadlineAt = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000) // 45 jours après création

            const earlyRefundData: Omit<EarlyRefundCI, 'id' | 'createdAt' | 'updatedAt'> = {
                contractId,
                type: 'EARLY',
                reason: data.reason,
                withdrawalDate,
                withdrawalTime: data.withdrawalTime,
                withdrawalAmount: data.withdrawalAmount,
                withdrawalMode: data.withdrawalMode,
                proofUrl,
                proofPath,
                documentId: document.id,
                amountNominal: totalAmountPaid,
                amountBonus,
                status: 'PENDING',
                deadlineAt,
                createdBy: data.userId,
                updatedBy: data.userId,
            }

            const earlyRefund = await this.earlyRefundCIRepository.createEarlyRefund(contractId, earlyRefundData)

            // 10. Mettre à jour le contrat pour référencer le document et résilier le contrat
            const updatedContract = await this.contractCIRepository.updateContract(contractId, {
                earlyRefundDocumentId: document.id,
                status: 'CANCELED', // Résilier le contrat lors d'un retrait anticipé
                updatedBy: data.userId,
            })

            // Créer une notification de résiliation de contrat
            if (updatedContract) {
                try {
                    const frequencyLabel = updatedContract.paymentFrequency === 'DAILY' ? 'journalier' : 'mensuel'
                    await this.notificationService.createNotification({
                        module: 'caisse_imprevue',
                        entityId: contractId,
                        type: 'contract_canceled',
                        title: 'Contrat résilié',
                        message: `Le contrat ${contractId} de ${updatedContract.memberFirstName} ${updatedContract.memberLastName} (${frequencyLabel}) a été résilié`,
                        metadata: {
                            contractId,
                            paymentFrequency: updatedContract.paymentFrequency,
                            memberId: updatedContract.memberId,
                            memberFirstName: updatedContract.memberFirstName,
                            memberLastName: updatedContract.memberLastName,
                            reason: 'Retrait anticipé',
                        },
                    })
                } catch (error) {
                    console.error('Erreur lors de la création de la notification:', error)
                }
            }

            return earlyRefund
        } catch (error) {
            console.error('Erreur lors de la demande de retrait anticipé:', error)
            throw error
        }
    }

    /**
     * Crée une demande de remboursement final CI
     */
    async requestFinalRefundCI(
        contractId: string,
        data: {
            reason: string
            withdrawalDate: string
            withdrawalTime: string
            withdrawalMode: 'cash' | 'bank_transfer' | 'airtel_money' | 'mobicash'
            withdrawalProof: File
            documentPdf: File
            userId: string
        }
    ): Promise<FinalRefundCI> {
        try {
            // 1. Validation du contrat
            const contract = await this.contractCIRepository.getContractById(contractId)
            if (!contract) {
                throw new Error('Contrat introuvable')
            }
            if (contract.status !== 'ACTIVE') {
                throw new Error('Le contrat doit être actif pour effectuer un remboursement final')
            }

            // 2. Vérifier que tous les mois/jours sont payés
            const payments = await this.paymentCIRepository.getPaymentsByContractId(contractId)
            const paidCount = payments.filter(p => p.status === 'PAID').length
            const allPaid = payments.length > 0 && paidCount === payments.length
            
            if (!allPaid) {
                throw new Error('Remboursement final indisponible : toutes les échéances doivent être payées')
            }

            // 3. Vérifier qu'aucune demande de remboursement final n'existe déjà
            const existingRefunds = await this.earlyRefundCIRepository.getEarlyRefundsByContractId(contractId)
            const hasActiveFinal = existingRefunds.some(
                (r: any) => r.type === 'FINAL' && r.status !== 'ARCHIVED'
            )
            if (hasActiveFinal) {
                throw new Error('Une demande de remboursement final est déjà en cours pour ce contrat')
            }

            // 4. Calculer le montant total versé (non modifiable)
            const totalAmountPaid = payments.reduce(
                (sum, payment) => sum + (payment.accumulatedAmount || 0),
                0
            )

            // 5. Calculer le montant bonus (pour l'instant à 0, peut être implémenté selon les règles métier)
            const amountBonus = 0

            // 6. Upload de la preuve du retrait (image uniquement)
            const { url: proofUrl, path: proofPath } = await this.documentRepository.uploadDocumentFile(
                data.withdrawalProof,
                contract.memberId,
                'PROOF_FINAL_REFUND_CI'
            )

            // 7. Upload du document PDF signé et création dans la collection documents
            const { url: documentUrl, path: documentPath, size } = await this.documentRepository.uploadDocumentFile(
                data.documentPdf,
                contract.memberId,
                'FINAL_REFUND_DOCUMENT_CI'
            )

            // 8. Créer l'enregistrement du document dans Firestore
            const documentData: Omit<Document, 'id' | 'createdAt' | 'updatedAt'> = {
                type: 'FINAL_REFUND_CI',
                format: 'pdf',
                libelle: `Document de remboursement final - ${contract.memberFirstName} ${contract.memberLastName} - Contrat ${contractId}`,
                path: documentPath,
                url: documentUrl,
                size: size,
                memberId: contract.memberId,
                contractId: contractId,
                createdBy: data.userId,
                updatedBy: data.userId,
            }

            const document = await this.documentRepository.createDocument(documentData)
            if (!document || !document.id) {
                throw new Error('Erreur lors de la création du document')
            }

            // 9. Créer la demande de remboursement final
            const withdrawalDate = new Date(data.withdrawalDate)
            const deadlineAt = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000) // 45 jours après création

            const finalRefundData: Omit<FinalRefundCI, 'id' | 'createdAt' | 'updatedAt'> = {
                contractId,
                type: 'FINAL',
                reason: data.reason,
                withdrawalDate,
                withdrawalTime: data.withdrawalTime,
                withdrawalAmount: totalAmountPaid, // Montant non modifiable, égal au total versé
                withdrawalMode: data.withdrawalMode,
                proofUrl,
                proofPath,
                documentId: document.id,
                amountNominal: totalAmountPaid,
                amountBonus,
                status: 'PENDING',
                deadlineAt,
                createdBy: data.userId,
                updatedBy: data.userId,
            }

            // Utiliser le repository pour créer le remboursement final (il accepte le type dans les données)
            const createdRefund = await this.earlyRefundCIRepository.createEarlyRefund(contractId, finalRefundData as any)

            // 10. Mettre à jour le contrat pour référencer le document et terminer le contrat
            const updatedContract = await this.contractCIRepository.updateContract(contractId, {
                finalRefundDocumentId: document.id,
                status: 'FINISHED', // Terminer le contrat lors d'un remboursement final
                updatedBy: data.userId,
            })

            // Créer une notification de terminaison de contrat
            if (updatedContract) {
                try {
                    const frequencyLabel = updatedContract.paymentFrequency === 'DAILY' ? 'journalier' : 'mensuel'
                    await this.notificationService.createNotification({
                        module: 'caisse_imprevue',
                        entityId: contractId,
                        type: 'contract_finished',
                        title: 'Contrat terminé',
                        message: `Le contrat ${contractId} de ${updatedContract.memberFirstName} ${updatedContract.memberLastName} (${frequencyLabel}) est terminé`,
                        metadata: {
                            contractId,
                            paymentFrequency: updatedContract.paymentFrequency,
                            memberId: updatedContract.memberId,
                            memberFirstName: updatedContract.memberFirstName,
                            memberLastName: updatedContract.memberLastName,
                            reason: 'Remboursement final',
                        },
                    })
                } catch (error) {
                    console.error('Erreur lors de la création de la notification:', error)
                }
            }

            // Convertir le résultat en FinalRefundCI
            return {
                ...createdRefund,
                type: 'FINAL' as const,
            } as FinalRefundCI
        } catch (error) {
            console.error('Erreur lors de la demande de remboursement final:', error)
            throw error
        }
    }

    // ==================== DEMANDES ====================

    async createDemand(data: Omit<CaisseImprevueDemand, 'id' | 'createdAt' | 'updatedAt'>, adminId: string): Promise<CaisseImprevueDemand> {
        // Générer l'ID au format: MK_DEMANDE_CI_{matricule}_{date}_{heure}
        let matriculeFormatted = "0000";
        let memberName = "Membre inconnu";
        
        if (data.memberId) {
            const member = await this.memberRepository.getMemberById(data.memberId);
            if (member && member.matricule) {
                const matriculePart = member.matricule.split('.')[0] || member.matricule.replace(/[^0-9]/g, '').slice(0, 4);
                matriculeFormatted = matriculePart.padStart(4, '0');
                memberName = `${member.firstName || ''} ${member.lastName || ''}`.trim();
            }
        }

        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = String(now.getFullYear()).slice(-2);
        const dateFormatted = `${day}${month}${year}`;
        
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const timeFormatted = `${hours}${minutes}`;

        const customId = `MK_DEMANDE_CI_${matriculeFormatted}_${dateFormatted}_${timeFormatted}`;

        const demandData = {
            ...data,
            status: 'PENDING' as const,
            createdBy: adminId,
        };

        const demand = await this.caisseImprevueDemandRepository.createDemand(demandData, customId);
        
        // Notification pour tous les admins
        try {
            await this.notificationService.createNotification({
                module: 'caisse_imprevue',
                entityId: demand.id,
                type: 'caisse_imprevue_demand_created',
                title: 'Nouvelle demande de contrat Caisse Imprévue',
                message: `Une nouvelle demande a été créée par ${adminId} pour ${memberName}`,
                metadata: {
                    demandId: demand.id,
                    memberId: data.memberId,
                    subscriptionCIID: data.subscriptionCIID,
                    paymentFrequency: data.paymentFrequency,
                    desiredDate: data.desiredDate,
                    createdBy: adminId,
                },
            });
        } catch (error) {
            console.error('Erreur lors de la création de la notification:', error);
        }
        
        return demand;
    }

    async getDemandById(id: string): Promise<CaisseImprevueDemand | null> {
        return await this.caisseImprevueDemandRepository.getDemandById(id);
    }

    async getDemandsWithFilters(filters?: CaisseImprevueDemandFilters): Promise<CaisseImprevueDemand[]> {
        return await this.caisseImprevueDemandRepository.getDemandsWithFilters(filters);
    }

    async getDemandsStats(filters?: CaisseImprevueDemandFilters): Promise<CaisseImprevueDemandStats> {
        return await this.caisseImprevueDemandRepository.getDemandsStats(filters);
    }

    async approveDemand(demandId: string, adminId: string, reason: string): Promise<CaisseImprevueDemand | null> {
        // Récupérer le nom de l'admin
        const admin = await this.adminRepository.getAdminById(adminId);
        const adminName = admin ? `${admin.firstName || ''} ${admin.lastName || ''}`.trim() : adminId;

        const demand = await this.caisseImprevueDemandRepository.updateDemandStatus(
            demandId,
            'APPROVED',
            { adminId, adminName, reason, decisionMadeAt: new Date() },
            undefined
        );

        if (demand) {
            // Récupérer le nom du membre
            let memberName = "Membre inconnu";
            if (demand.memberId) {
                const member = await this.memberRepository.getMemberById(demand.memberId);
                if (member) {
                    memberName = `${member.firstName || ''} ${member.lastName || ''}`.trim();
                }
            }

            // Notification
            try {
                await this.notificationService.createNotification({
                    module: 'caisse_imprevue',
                    entityId: demand.id,
                    type: 'caisse_imprevue_demand_approved',
                    title: 'Demande acceptée',
                    message: `Votre demande de contrat Caisse Imprévue a été acceptée. Raison : ${reason}`,
                    metadata: {
                        demandId: demand.id,
                        decisionMadeBy: adminId,
                        decisionMadeByName: adminName,
                        decisionReason: reason,
                        decisionMadeAt: demand.decisionMadeAt?.toISOString(),
                        memberId: demand.memberId,
                    },
                });
            } catch (error) {
                console.error('Erreur lors de la création de la notification:', error);
            }
        }

        return demand;
    }

    async rejectDemand(demandId: string, adminId: string, reason: string): Promise<CaisseImprevueDemand | null> {
        // Récupérer le nom de l'admin
        const admin = await this.adminRepository.getAdminById(adminId);
        const adminName = admin ? `${admin.firstName || ''} ${admin.lastName || ''}`.trim() : adminId;

        const demand = await this.caisseImprevueDemandRepository.updateDemandStatus(
            demandId,
            'REJECTED',
            { adminId, adminName, reason, decisionMadeAt: new Date() },
            undefined
        );

        if (demand) {
            // Récupérer le nom du membre
            let memberName = "Membre inconnu";
            if (demand.memberId) {
                const member = await this.memberRepository.getMemberById(demand.memberId);
                if (member) {
                    memberName = `${member.firstName || ''} ${member.lastName || ''}`.trim();
                }
            }

            // Notification
            try {
                await this.notificationService.createNotification({
                    module: 'caisse_imprevue',
                    entityId: demand.id,
                    type: 'caisse_imprevue_demand_rejected',
                    title: 'Demande refusée',
                    message: `Votre demande de contrat Caisse Imprévue a été refusée. Raison : ${reason}`,
                    metadata: {
                        demandId: demand.id,
                        decisionMadeBy: adminId,
                        decisionMadeByName: adminName,
                        decisionReason: reason,
                        decisionMadeAt: demand.decisionMadeAt?.toISOString(),
                        memberId: demand.memberId,
                    },
                });
            } catch (error) {
                console.error('Erreur lors de la création de la notification:', error);
            }
        }

        return demand;
    }

    async reopenDemand(demandId: string, adminId: string, reason: string): Promise<CaisseImprevueDemand | null> {
        // Récupérer le nom de l'admin
        const admin = await this.adminRepository.getAdminById(adminId);
        const adminName = admin ? `${admin.firstName || ''} ${admin.lastName || ''}`.trim() : adminId;

        const demand = await this.caisseImprevueDemandRepository.updateDemandStatus(
            demandId,
            'PENDING',
            undefined,
            { adminId, adminName, reason, reopenedAt: new Date() }
        );

        if (demand) {
            // Notification
            try {
                await this.notificationService.createNotification({
                    module: 'caisse_imprevue',
                    entityId: demand.id,
                    type: 'caisse_imprevue_demand_reopened',
                    title: 'Demande réouverte',
                    message: `La demande de contrat Caisse Imprévue a été réouverte. Motif : ${reason}`,
                    metadata: {
                        demandId: demand.id,
                        reopenedBy: adminId,
                        reopenedByName: adminName,
                        reopenReason: reason,
                        reopenedAt: demand.reopenedAt?.toISOString(),
                        memberId: demand.memberId,
                    },
                });
            } catch (error) {
                console.error('Erreur lors de la création de la notification:', error);
            }
        }

        return demand;
    }

    async convertDemandToContract(demandId: string, adminId: string, contractData?: Partial<ContractCI>): Promise<{ demand: CaisseImprevueDemand; contract: ContractCI } | null> {
        const demand = await this.getDemandById(demandId);
        if (!demand || demand.status !== 'APPROVED') {
            throw new Error('La demande doit être acceptée pour être convertie en contrat');
        }

        if (demand.contractId) {
            throw new Error('Cette demande a déjà été convertie en contrat');
        }

        // Générer l'ID du contrat au format: MK_CI_CONTRACT_{MEMBERID}_{DATE}_{HEURE}
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = String(now.getFullYear()).slice(-2);
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const contractId = `MK_CI_CONTRACT_${demand.memberId}_${day}${month}${year}_${hours}${minutes}`;

        // Exclure id de contractData s'il est présent pour éviter les conflits
        const { id: _, ...contractDataWithoutId } = contractData || {};

        // Créer le contrat à partir de la demande
        const contract = await this.createContractCI({
            id: contractId,
            memberId: demand.memberId,
            memberFirstName: demand.memberFirstName || '',
            memberLastName: demand.memberLastName || '',
            memberContacts: demand.memberContacts || [],
            memberEmail: demand.memberEmail,
            subscriptionCIID: demand.subscriptionCIID,
            subscriptionCICode: demand.subscriptionCICode,
            subscriptionCILabel: demand.subscriptionCILabel,
            subscriptionCIAmountPerMonth: demand.subscriptionCIAmountPerMonth,
            subscriptionCINominal: demand.subscriptionCINominal,
            subscriptionCIDuration: demand.subscriptionCIDuration,
            subscriptionCISupportMin: demand.subscriptionCISupportMin ?? 0,
            subscriptionCISupportMax: demand.subscriptionCISupportMax ?? 0,
            paymentFrequency: demand.paymentFrequency,
            firstPaymentDate: contractData?.firstPaymentDate || demand.firstPaymentDate || demand.desiredDate,
            emergencyContact: demand.emergencyContact || {
                lastName: '',
                phone1: '',
                relationship: '',
                idNumber: '',
                typeId: '',
                documentPhotoUrl: '',
            },
            status: 'ACTIVE',
            totalMonthsPaid: 0,
            isEligibleForSupport: false,
            supportHistory: [],
            createdBy: adminId,
            updatedBy: adminId,
            ...contractDataWithoutId,
        });

        // Mettre à jour la demande pour indiquer qu'elle a été convertie
        const updatedDemand = await this.caisseImprevueDemandRepository.updateDemand(demandId, {
            status: 'CONVERTED',
            contractId: contract.id,
        });

        if (updatedDemand && contract) {
            // Récupérer le nom du membre
            let memberName = "Membre inconnu";
            if (demand.memberId) {
                const member = await this.memberRepository.getMemberById(demand.memberId);
                if (member) {
                    memberName = `${member.firstName || ''} ${member.lastName || ''}`.trim();
                }
            }

            // Notification
            try {
                await this.notificationService.createNotification({
                    module: 'caisse_imprevue',
                    entityId: contract.id,
                    type: 'caisse_imprevue_demand_converted',
                    title: 'Demande convertie en contrat',
                    message: `Votre demande a été convertie en contrat. Le contrat ${contract.id} est maintenant actif.`,
                    metadata: {
                        demandId: demand.id,
                        contractId: contract.id,
                        memberId: demand.memberId,
                        convertedBy: adminId,
                    },
                });
            } catch (error) {
                console.error('Erreur lors de la création de la notification:', error);
            }
        }

        return updatedDemand && contract ? {
            demand: updatedDemand,
            contract: contract,
        } : null;
    }
}