import { ICreditSpecialeService } from "./ICreditSpecialeService";
import { CreditDemand, CreditContract, CreditPayment, CreditPenalty, CreditInstallment, GuarantorRemuneration, CreditDemandStatus, CreditContractStatus, CreditType, StandardSimulation, CustomSimulation, Notification } from "@/types/types";
import { ICreditDemandRepository, CreditDemandFilters, CreditDemandStats } from "@/repositories/credit-speciale/ICreditDemandRepository";
import { ICreditContractRepository, CreditContractFilters, CreditContractStats } from "@/repositories/credit-speciale/ICreditContractRepository";
import { ICreditPaymentRepository, CreditPaymentFilters } from "@/repositories/credit-speciale/ICreditPaymentRepository";
import { ICreditPenaltyRepository } from "@/repositories/credit-speciale/ICreditPenaltyRepository";
import { ICreditInstallmentRepository } from "@/repositories/credit-speciale/ICreditInstallmentRepository";
import { IGuarantorRemunerationRepository, GuarantorRemunerationFilters } from "@/repositories/credit-speciale/IGuarantorRemunerationRepository";
import { IContractCIRepository } from "@/repositories/caisse-imprevu/IContractCIRepository";
import { IPaymentCIRepository } from "@/repositories/caisse-imprevu/IPaymentCIRepository";
import { IMemberRepository } from "@/repositories/members/IMemberRepository";
import { IDocumentRepository } from "@/domains/infrastructure/documents/repositories/IDocumentRepository";
import { RepositoryFactory } from "@/factories/RepositoryFactory";
import { ServiceFactory } from "@/factories/ServiceFactory";
import { NotificationService } from "@/services/notifications/NotificationService";
import { EmergencyContact } from "@/schemas/emergency-contact.schema";

export class CreditSpecialeService implements ICreditSpecialeService {
    readonly name = "CreditSpecialeService";
    private notificationService: NotificationService;
    private contractCIRepository: IContractCIRepository;
    private paymentCIRepository: IPaymentCIRepository;
    private memberRepository: IMemberRepository;
    private documentRepository: IDocumentRepository;

    private creditInstallmentRepository: ICreditInstallmentRepository;

    constructor(
        private creditDemandRepository: ICreditDemandRepository,
        private creditContractRepository: ICreditContractRepository,
        private creditPaymentRepository: ICreditPaymentRepository,
        private creditPenaltyRepository: ICreditPenaltyRepository,
        private guarantorRemunerationRepository: IGuarantorRemunerationRepository
    ) {
        this.notificationService = ServiceFactory.getNotificationService();
        this.contractCIRepository = RepositoryFactory.getContractCIRepository();
        this.paymentCIRepository = RepositoryFactory.getPaymentCIRepository();
        this.memberRepository = RepositoryFactory.getMemberRepository();
        this.documentRepository = RepositoryFactory.getDocumentRepository();
        this.creditInstallmentRepository = RepositoryFactory.getCreditInstallmentRepository();
    }

    // ==================== DEMANDES ====================

    async createDemand(data: Omit<CreditDemand, 'id' | 'createdAt' | 'updatedAt'>): Promise<CreditDemand> {
        // Récupérer le matricule du membre
        const member = await this.memberRepository.getMemberById(data.clientId);
        if (!member || !member.matricule) {
            throw new Error('Membre non trouvé ou matricule manquant');
        }

        // Extraire la partie numérique du matricule (ex: "0001" depuis "0001.MK.040825")
        const matriculePart = member.matricule.split('.')[0] || member.matricule.replace(/[^0-9]/g, '').slice(0, 4);
        const matriculeFormatted = matriculePart.padStart(4, '0');

        // Générer la date et l'heure au format demandé
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = String(now.getFullYear()).slice(-2);
        const dateFormatted = `${day}${month}${year}`;
        
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const timeFormatted = `${hours}${minutes}`;

        // Générer l'ID au format: MK_DEMANDE_CSP_matricule_date_heure
        const customId = `MK_DEMANDE_CSP_${matriculeFormatted}_${dateFormatted}_${timeFormatted}`;

        // Calculer le score initial basé sur l'historique des crédits précédents
        const initialScore = await this.calculateInitialScore(data.clientId);

        // Ajouter le score initial à la demande
        const demandData = {
            ...data,
            score: initialScore,
            scoreUpdatedAt: new Date(),
        };

        const demand = await this.creditDemandRepository.createDemand(demandData, customId);
        
        // Notification pour les admins
        try {
            await this.notificationService.createNotification({
                module: 'credit_speciale',
                entityId: demand.id,
                type: 'new_request',
                title: 'Nouvelle demande de crédit',
                message: `Nouvelle demande de ${data.creditType} de ${data.amount.toLocaleString('fr-FR')} FCFA par ${data.clientFirstName} ${data.clientLastName}`,
                metadata: {
                    demandId: demand.id,
                    creditType: data.creditType,
                    amount: data.amount,
                    clientId: data.clientId,
                },
            });
        } catch {
            // Erreur lors de la création de la notification - continue sans
        }
        
        return demand;
    }

    async getDemandById(id: string): Promise<CreditDemand | null> {
        return await this.creditDemandRepository.getDemandById(id);
    }

    async getDemandsWithFilters(filters?: CreditDemandFilters): Promise<CreditDemand[]> {
        return await this.creditDemandRepository.getDemandsWithFilters(filters);
    }

    async getDemandsStats(filters?: CreditDemandFilters): Promise<CreditDemandStats> {
        return await this.creditDemandRepository.getDemandsStats(filters);
    }

    async updateDemandStatus(id: string, status: CreditDemandStatus, adminId: string, comments?: string): Promise<CreditDemand | null> {
        const demand = await this.creditDemandRepository.updateDemand(id, {
            status,
            updatedBy: adminId,
            ...(comments && { adminComments: comments }),
        });

        if (demand) {
            // Notification au client
            try {
                let title = 'Statut de demande mis à jour'
                let message = `Votre demande de crédit ${demand.creditType} a été mise à jour`
                
                if (status === 'APPROVED') {
                    title = 'Demande approuvée'
                    message = `Votre demande de crédit ${demand.creditType} a été approuvée`
                } else if (status === 'REJECTED') {
                    title = 'Demande rejetée'
                    message = `Votre demande de crédit ${demand.creditType} a été rejetée`
                } else if (status === 'PENDING' && comments && comments.startsWith('Réouverture:')) {
                    // Réouverture d'une demande rejetée
                    title = 'Demande réouverte'
                    message = `Votre demande de crédit ${demand.creditType} a été réouverte et sera réexaminée`
                }
                
                await this.notificationService.createNotification({
                    module: 'credit_speciale',
                    entityId: demand.id,
                    type: 'status_update',
                    title,
                    message,
                    metadata: {
                        demandId: demand.id,
                        status,
                        clientId: demand.clientId,
                    },
                });
            } catch {
                // Erreur lors de la création de la notification - continue sans
            }
        }

        return demand;
    }

    // ==================== CONTRATS ====================

    async createContractFromDemand(
        demandId: string, 
        adminId: string,
        simulationData: {
            interestRate: number;
            monthlyPaymentAmount: number;
            duration: number;
            firstPaymentDate: Date;
            totalAmount: number;
            emergencyContact?: EmergencyContact;
            guarantorRemunerationPercentage?: number;
        }
    ): Promise<CreditContract> {
        const demand = await this.creditDemandRepository.getDemandById(demandId);
        if (!demand || demand.status !== 'APPROVED') {
            throw new Error('La demande doit être approuvée pour créer un contrat');
        }

        // Vérifier si un contrat existe déjà pour cette demande
        if (demand.contractId) {
            throw new Error('Un contrat a déjà été créé pour cette demande');
        }

        // Vérifier si le garant est parrain
        let guarantorIsParrain = false;
        if (demand.guarantorId && demand.guarantorIsMember) {
            try {
                const guarantor = await this.memberRepository.getMemberById(demand.guarantorId);
                if (guarantor && guarantor.matricule) {
                    const filleuls = await this.memberRepository.getFilleulsByIntermediaryCode(guarantor.matricule);
                    guarantorIsParrain = filleuls.length > 0;
                }
            } catch {
                // Erreur lors de la vérification du parrain - continue sans
            }
        }

        // Calculer la date de la prochaine échéance (premier versement + 1 mois)
        const nextDueAt = new Date(simulationData.firstPaymentDate);
        nextDueAt.setMonth(nextDueAt.getMonth() + 1);

        // Utiliser le score de la demande s'il existe, sinon calculer le score initial basé sur l'historique
        const initialScore = demand.score !== undefined && demand.score !== null
            ? demand.score
            : await this.calculateInitialScore(demand.clientId);

        // Générer l'ID personnalisé au format: MK_CSP_matricule_date_heure
        const member = await this.memberRepository.getMemberById(demand.clientId);
        if (!member || !member.matricule) {
            throw new Error('Membre non trouvé ou matricule manquant');
        }

        // Extraire la partie numérique du matricule (ex: "0001" depuis "0001.MK.040825")
        const matriculePart = member.matricule.split('.')[0] || member.matricule.replace(/[^0-9]/g, '').slice(0, 4);
        const matriculeFormatted = matriculePart.padStart(4, '0');

        // Générer la date et l'heure au format demandé
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = String(now.getFullYear()).slice(-2);
        const dateFormatted = `${day}${month}${year}`;
        
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const timeFormatted = `${hours}${minutes}`;

        // Générer l'ID au format: MK_CSP_matricule_date_heure
        const customContractId = `MK_CSP_${matriculeFormatted}_${dateFormatted}_${timeFormatted}`;

        const contract: Omit<CreditContract, 'id' | 'createdAt' | 'updatedAt'> = {
            demandId: demand.id,
            clientId: demand.clientId,
            clientFirstName: demand.clientFirstName,
            clientLastName: demand.clientLastName,
            clientContacts: demand.clientContacts,
            creditType: demand.creditType,
            amount: demand.amount,
            interestRate: simulationData.interestRate,
            monthlyPaymentAmount: simulationData.monthlyPaymentAmount,
            totalAmount: simulationData.totalAmount,
            duration: simulationData.duration,
            firstPaymentDate: simulationData.firstPaymentDate,
            nextDueAt,
            status: 'PENDING',
            amountPaid: 0,
            amountRemaining: simulationData.totalAmount,
            score: initialScore,
            scoreUpdatedAt: new Date(),
            guarantorId: demand.guarantorId,
            guarantorFirstName: demand.guarantorFirstName,
            guarantorLastName: demand.guarantorLastName,
            guarantorRelation: demand.guarantorRelation,
            guarantorIsMember: demand.guarantorIsMember,
            guarantorIsParrain,
            guarantorRemunerationPercentage: simulationData.guarantorRemunerationPercentage || (demand.guarantorIsMember ? 2 : 0),
            emergencyContact: simulationData.emergencyContact,
            createdBy: adminId,
            updatedBy: adminId,
        };

        const createdContract = await this.creditContractRepository.createContract(contract, customContractId);

        // Ne plus créer les installments - ils seront calculés dynamiquement à partir des paiements

        // Mettre à jour la demande avec l'ID du contrat (relation 1:1)
        await this.creditDemandRepository.updateDemand(demandId, {
            contractId: createdContract.id,
            updatedBy: adminId,
        });

        // Notification
        try {
            await this.notificationService.createNotification({
                module: 'credit_speciale',
                entityId: createdContract.id,
                type: 'contract_created',
                title: 'Contrat créé',
                message: `Un contrat de crédit ${createdContract.creditType} a été créé pour ${createdContract.clientFirstName} ${createdContract.clientLastName}`,
                metadata: {
                    contractId: createdContract.id,
                    demandId: demand.id,
                    clientId: createdContract.clientId,
                },
            });
        } catch {
            // Erreur lors de la création de la notification - continue sans
        }

        return createdContract;
    }

    async getContractById(id: string): Promise<CreditContract | null> {
        return await this.creditContractRepository.getContractById(id);
    }

    async getContractsWithFilters(filters?: CreditContractFilters): Promise<CreditContract[]> {
        return await this.creditContractRepository.getContractsWithFilters(filters);
    }

    async getContractsStats(filters?: CreditContractFilters): Promise<CreditContractStats> {
        return await this.creditContractRepository.getContractsStats(filters);
    }

    async updateContractStatus(id: string, status: CreditContractStatus, adminId: string): Promise<CreditContract | null> {
        const contract = await this.creditContractRepository.getContractById(id);
        if (!contract) return null;

        const updatedContract = await this.creditContractRepository.updateContract(id, {
            status,
            updatedBy: adminId,
        });

        // Notification si le statut change vers TRANSFORMED (clôturé/transformé)
        if (status === 'TRANSFORMED') {
            try {
                await this.notificationService.createNotification({
                    module: 'credit_speciale',
                    entityId: id,
                    type: 'contract_finished',
                    title: 'Contrat transformé',
                    message: `Le contrat de crédit ${contract.creditType} de ${contract.clientFirstName} ${contract.clientLastName} a été transformé.`,
                    metadata: {
                        contractId: id,
                        clientId: contract.clientId,
                        creditType: contract.creditType,
                        status,
                    },
                });
            } catch {
                // Erreur lors de la création de la notification de changement de statut - continue sans
            }
        }

        return updatedContract;
    }

    // ==================== SIMULATIONS ====================

    async calculateStandardSimulation(
        amount: number,
        interestRate: number,
        monthlyPayment: number,
        firstPaymentDate: Date,
        creditType: CreditType
    ): Promise<StandardSimulation> {
        // Taux d'intérêt mensuel (le taux saisi est mensuel, pas annuel)
        const monthlyRate = interestRate / 100;
        let duration = 0;
        let remainingAmount = amount;
        let totalInterest = 0;
        let totalPaid = 0;

        const maxDuration = creditType === 'SPECIALE' ? 7 : creditType === 'AIDE' ? 3 : Infinity;
        
        if (monthlyRate === 0) {
            // Sans intérêts
            duration = Math.ceil(amount / monthlyPayment);
            totalPaid = duration * monthlyPayment;
        } else {
            // Avec intérêts composés mensuels
            // Formule : Nouveau solde = (Solde actuel × (1 + taux)) - versement
            // Pour crédit spéciale, toujours calculer jusqu'à 7 mois même si solde = 0
            const maxIterations = maxDuration !== Infinity ? maxDuration : 120;
            
            // Pour crédit spéciale, toujours calculer jusqu'à 7 mois
            for (let month = 0; month < maxIterations && (remainingAmount > 0.01 || creditType === 'SPECIALE'); month++) {
                // 1. Calcul des intérêts sur le solde actuel
                const interest = remainingAmount * monthlyRate;
                // 2. Ajout des intérêts au solde
                const balanceWithInterest = remainingAmount + interest;
                // 3. Versement effectué : si le montant global est inférieur ou égal à la mensualité, payer le montant global
                let payment: number;
                if (balanceWithInterest <= monthlyPayment) {
                    payment = balanceWithInterest;
                    remainingAmount = 0;
                } else {
                    payment = monthlyPayment;
                    remainingAmount = Math.max(0, balanceWithInterest - payment);
                }
                
                totalInterest += interest;
                totalPaid += payment; // Somme des mensualités affichées (qui incluent déjà les intérêts)
                duration++;
                
                // Arrondir pour éviter les erreurs de virgule flottante
                if (remainingAmount < 0.01) {
                    remainingAmount = 0;
                }
                
                // Si le solde est à 0, on peut arrêter même pour crédit spéciale
                if (remainingAmount <= 0.01) {
                    break;
                }
                
                // Pour crédit spéciale, arrêter à 7 mois même si solde > 0
                if (creditType === 'SPECIALE' && duration >= 7) {
                    break;
                }
            }
        }

        // Pour crédit spéciale, vérifier si la durée dépasse 7 mois
        let remainingAtMaxDuration = remainingAmount; // Par défaut
        let isValid = duration <= maxDuration;
        let suggestedMonthlyPayment = monthlyPayment;
        
        if (creditType === 'SPECIALE' && maxDuration === 7) {
            // Si la durée calculée dépasse 7 mois, la simulation est invalide
            if (duration > 7) {
                isValid = false;
                // Calculer la mensualité minimale pour rembourser en exactement 7 mois
                let minPayment = monthlyPayment;
                let maxPayment = amount * 2; // Limite supérieure raisonnable
                let optimalPayment = maxPayment;
                
                // Recherche binaire pour trouver la mensualité minimale
                for (let iteration = 0; iteration < 50; iteration++) {
                    const testPayment = Math.ceil((minPayment + maxPayment) / 2);
                    let testRemaining = amount;
                    
                    for (let month = 0; month < maxDuration; month++) {
                        if (testRemaining <= 0.01) break;
                        
                        const interest = testRemaining * monthlyRate;
                        const balanceWithInterest = testRemaining + interest;
                        let payment: number;
                        if (balanceWithInterest <= testPayment) {
                            payment = balanceWithInterest;
                            testRemaining = 0;
                        } else {
                            payment = testPayment;
                            testRemaining = Math.max(0, balanceWithInterest - payment);
                        }
                        
                        if (testRemaining < 0.01) {
                            testRemaining = 0;
                        }
                    }
                    
                    if (testRemaining <= 0.01) {
                        optimalPayment = testPayment;
                        maxPayment = testPayment - 1;
                    } else {
                        minPayment = testPayment + 1;
                    }
                    
                    if (minPayment > maxPayment) break;
                }
                
                suggestedMonthlyPayment = optimalPayment;
            } else {
                // Si la durée est <= 7 mois, calculer le solde restant au 7ème mois (ou à la fin si remboursé avant)
                let testRemaining = amount;
                let calculatedDuration = 0;
                
                for (let month = 0; month < 7; month++) {
                    if (testRemaining <= 0.01) {
                        break;
                    }
                    
                    const interest = testRemaining * monthlyRate;
                    const balanceWithInterest = testRemaining + interest;
                    
                    let mensualite: number;
                    if (balanceWithInterest <= monthlyPayment) {
                        mensualite = balanceWithInterest;
                        testRemaining = 0;
                    } else {
                        mensualite = monthlyPayment;
                        testRemaining = Math.max(0, balanceWithInterest - mensualite);
                    }
                    
                    calculatedDuration++;
                    
                    if (testRemaining < 0.01) {
                        testRemaining = 0;
                    }
                    
                    if (testRemaining <= 0.01) {
                        break;
                    }
                }
                
                remainingAtMaxDuration = testRemaining;
                isValid = remainingAtMaxDuration <= 0.01;
            }
        }
        
        // Total à rembourser = somme des mensualités affichées (qui incluent déjà les intérêts)
        const totalAmount = Math.round(totalPaid);

        return {
            amount,
            interestRate,
            monthlyPayment,
            firstPaymentDate,
            duration,
            totalAmount,
            isValid,
            // Pour crédit spéciale, toujours retourner remainingAtMaxDuration et suggestedMonthlyPayment si solde > 0
            ...(creditType === 'SPECIALE' && maxDuration === 7 && remainingAtMaxDuration > 0 ? {
                remainingAtMaxDuration,
                suggestedMonthlyPayment,
            } : creditType === 'SPECIALE' && maxDuration === 7 ? {
                remainingAtMaxDuration: 0, // Solde à 0 au 7ème mois
            } : isValid ? {} : { suggestedMinimumAmount: amount * (duration / maxDuration) }),
        };
    }

    async calculateCustomSimulation(
        amount: number,
        interestRate: number,
        monthlyPayments: Array<{ month: number; amount: number }>,
        firstPaymentDate: Date,
        creditType: CreditType
    ): Promise<CustomSimulation> {
        const duration = monthlyPayments.length;
        // Taux d'intérêt mensuel (le taux saisi est mensuel, pas annuel)
        const monthlyRate = interestRate / 100;
        
        let totalInterest = 0;
        let totalPaid = 0;
        let remainingAmount = amount;

        monthlyPayments.forEach((payment) => {
            // Toujours calculer les intérêts sur le solde actuel (même si 0)
            // 1. Calcul des intérêts sur le solde actuel
            const interest = remainingAmount * monthlyRate;
            // 2. Ajout des intérêts au solde
            const balanceWithInterest = remainingAmount + interest;
            // 3. Soustraction du versement
            const actualPayment = Math.min(payment.amount, balanceWithInterest);
            remainingAmount = balanceWithInterest - actualPayment;
            
            totalInterest += interest;
            totalPaid += actualPayment;
            
            // Arrondir pour éviter les erreurs de virgule flottante
            if (remainingAmount < 1) {
                remainingAmount = 0;
            }
        });

        // Total à rembourser = somme des mensualités prévues (qui sont déjà les montants totaux à payer)
        const totalAmount = totalPaid;
        const maxDuration = creditType === 'SPECIALE' ? 7 : creditType === 'AIDE' ? 3 : Infinity;
        const isValid = duration <= maxDuration && remainingAmount <= 0;

        return {
            amount,
            interestRate,
            monthlyPayments,
            firstPaymentDate,
            duration,
            totalAmount,
            isValid,
            ...(isValid ? {} : { suggestedMinimumAmount: amount * (duration / maxDuration) }),
        };
    }

    async calculateProposedSimulation(
        amount: number, // Montant emprunté (pas le total à rembourser)
        duration: number,
        interestRate: number,
        firstPaymentDate: Date,
        creditType: CreditType
    ): Promise<StandardSimulation> {
        // Taux d'intérêt mensuel (le taux saisi est mensuel, pas annuel)
        const monthlyRate = interestRate / 100;
        const maxDuration = creditType === 'SPECIALE' ? 7 : creditType === 'AIDE' ? 3 : Infinity;
        
        // Vérifier que la durée est valide
        if (duration > maxDuration) {
            throw new Error(`La durée maximum est de ${maxDuration} mois pour un crédit ${creditType === 'SPECIALE' ? 'spéciale' : 'aide'}`);
        }

        // Recherche binaire pour trouver la mensualité optimale
        // qui permet de rembourser le montant emprunté en exactement `duration` mois
        let minPayment = Math.ceil(amount / duration);
        let maxPayment = amount * 2;
        let optimalMonthlyPayment = maxPayment;

        for (let iteration = 0; iteration < 50; iteration++) {
            const testPayment = Math.ceil((minPayment + maxPayment) / 2);
            let testRemaining = amount;

            // Simuler les `duration` mois avec cette mensualité
            for (let month = 0; month < duration; month++) {
                const interest = testRemaining * monthlyRate;
                const balanceWithInterest = testRemaining + interest;
                const payment = Math.min(testPayment, balanceWithInterest);
                testRemaining = balanceWithInterest - payment;

                if (testRemaining < 1) {
                    testRemaining = 0;
                }
            }

            if (testRemaining <= 0) {
                // La mensualité est suffisante, on peut essayer plus petit
                optimalMonthlyPayment = testPayment;
                maxPayment = testPayment - 1;
            } else {
                // La mensualité est insuffisante, il faut augmenter
                minPayment = testPayment + 1;
            }

            if (minPayment > maxPayment) break;
        }

        // Calculer avec la mensualité optimale pour obtenir les valeurs exactes
        let finalRemaining = amount;
        let totalInterest = 0;
        let totalPaid = 0;

        for (let month = 0; month < duration; month++) {
            const interest = finalRemaining * monthlyRate;
            totalInterest += interest;
            const balanceWithInterest = finalRemaining + interest;
            
            // Si c'est le dernier mois ou si le reste dû est inférieur à la mensualité
            let payment: number;
            if (month === duration - 1 || finalRemaining < optimalMonthlyPayment) {
                // Payer le montant global complet (reste dû + intérêts) pour que le solde soit 0
                payment = balanceWithInterest;
            } else {
                payment = optimalMonthlyPayment;
            }
            
            totalPaid += payment;
            finalRemaining = Math.max(0, balanceWithInterest - payment);

            if (finalRemaining < 1) {
                finalRemaining = 0;
            }
        }

        const isValid = finalRemaining <= 0;
        // Total à rembourser = somme des paiements effectués
        const totalAmount = totalPaid;

        return {
            amount: Math.round(amount),
            interestRate,
            monthlyPayment: optimalMonthlyPayment,
            firstPaymentDate,
            duration,
            totalAmount: Math.round(totalAmount),
            isValid,
        };
    }

    // ==================== ÉCHÉANCES (INSTALLMENTS) ====================

    /**
     * Génère toutes les échéances pour un contrat de crédit
     */
    async generateInstallmentsForContract(contract: CreditContract, adminId: string): Promise<CreditInstallment[]> {
        const monthlyRate = contract.interestRate / 100;
        const firstDate = new Date(contract.firstPaymentDate);
        const paymentAmount = contract.monthlyPaymentAmount;
        const duration = contract.duration;
        
        let remaining = contract.amount;
        const installments: Array<Omit<CreditInstallment, 'id' | 'createdAt' | 'updatedAt'>> = [];

        for (let i = 0; i < duration; i++) {
            if (remaining <= 0 && contract.creditType !== 'SPECIALE') break;

            const dueDate = new Date(firstDate);
            dueDate.setMonth(dueDate.getMonth() + i);
            dueDate.setHours(0, 0, 0, 0);
            
            const interest = remaining * monthlyRate;
            const balanceWithInterest = remaining + interest;
            
            // paymentAmount représente le capital (mensualité de base), le montant total à payer = capital + intérêts
            let principalAmount: number;
            let totalAmount: number;
            
            if (remaining < paymentAmount) {
                // Dernière échéance ou solde restant inférieur à la mensualité
                totalAmount = balanceWithInterest;
                principalAmount = remaining;
                remaining = 0;
            } else {
                // Le montant total à payer = capital (paymentAmount) + intérêts
                const totalPaymentAmount = paymentAmount + interest;
                // S'assurer qu'on ne dépasse pas balanceWithInterest
                totalAmount = Math.min(totalPaymentAmount, balanceWithInterest);
                principalAmount = paymentAmount; // Le capital est toujours paymentAmount
                remaining = Math.max(0, balanceWithInterest - totalAmount);
            }

            // Arrondir pour éviter les erreurs de virgule flottante
            if (remaining < 1) {
                remaining = 0;
            }

            installments.push({
                creditId: contract.id,
                installmentNumber: i + 1,
                dueDate,
                principalAmount: Math.round(principalAmount),
                interestAmount: Math.round(interest),
                totalAmount: Math.round(totalAmount),
                paidAmount: 0,
                remainingAmount: Math.round(totalAmount),
                status: i === 0 ? 'DUE' : 'PENDING',
                createdBy: adminId,
                updatedBy: adminId,
            });
        }

        return await this.creditInstallmentRepository.createInstallments(installments);
    }

    // ==================== PAIEMENTS ====================

    async createPayment(data: Omit<CreditPayment, 'id' | 'createdAt' | 'updatedAt'>, proofFile?: File, penaltyIds?: string[], installmentNumber?: number): Promise<CreditPayment> {
        // Récupérer le contrat pour générer la référence
        const contract = await this.creditContractRepository.getContractById(data.creditId);
        if (!contract) {
            throw new Error('Contrat introuvable');
        }

        // Récupérer le membre pour obtenir le matricule
        const member = await this.memberRepository.getMemberById(contract.clientId);
        if (!member || !member.matricule) {
            throw new Error('Membre non trouvé ou matricule manquant');
        }

        // Générer la référence unique du paiement
        const now = new Date(data.paymentDate);
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = String(now.getFullYear()).slice(-2);
        const dateFormatted = `${day}${month}${year}`;
        
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const timeFormatted = `${hours}${minutes}`;
        
        // Extraire le matricule du client (4 premiers chiffres)
        const matriculePart = member.matricule.split('.')[0] || member.matricule.replace(/[^0-9]/g, '').slice(0, 4);
        const matriculeFormatted = matriculePart.padStart(4, '0');
        
        // Format: MK_PAIEMENT_CSP_matricule_date_heure
        const reference = `MK_PAIEMENT_CSP_${matriculeFormatted}_${dateFormatted}_${timeFormatted}`;

        // Upload de la preuve si fournie
        let proofUrl: string | undefined = data.proofUrl;
        if (proofFile) {
            try {
                const { url, path } = await this.documentRepository.uploadDocumentFile(
                    proofFile,
                    contract.clientId,
                    'CREDIT_SPECIALE_RECEIPT'
                );
                proofUrl = url;
            } catch (error) {
                console.error('Erreur lors de l\'upload de la preuve:', error);
                throw new Error('Échec de l\'upload de la preuve de paiement');
            }
        }

        // Ne plus utiliser les installments - calculer directement à partir des paiements
        // Récupérer tous les paiements existants pour calculer le reste dû
        // Inclure les paiements de 0 FCFA s'ils ont un commentaire explicite (pénalités uniquement ou paiement de 0)
        const allPayments = await this.creditPaymentRepository.getPaymentsByCreditId(contract.id);
        const realPayments = allPayments.filter(p => 
            p.amount > 0 || 
            p.comment?.includes('Paiement de pénalités uniquement') ||
            p.comment?.includes('Paiement de 0 FCFA')
        );
        
        // Calculer le montant total payé et le reste dû en appliquant la formule
        const monthlyRate = contract.interestRate / 100;
        let remaining = contract.amount;
        
        // Appliquer la formule pour chaque paiement : nouveauMontantRestant = MontantRestant - montantVerser
        // MontantRestant = nouveauMontantRestant * taux + nouveauMontantRestant
        const sortedPayments = [...realPayments].sort((a, b) => 
            new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime()
        );
        
        for (const existingPayment of sortedPayments) {
            // Calculer les intérêts sur le montant restant avant le paiement
            const interest = remaining * monthlyRate;
            const totalWithInterest = remaining + interest;
            
            // Soustraire le montant versé
            remaining = Math.max(0, totalWithInterest - existingPayment.amount);
        }
        
        // Calculer les intérêts et le principal pour ce nouveau paiement
        const interestBeforePayment = remaining * monthlyRate;
        const totalWithInterest = remaining + interestBeforePayment;
        
        // Calculer combien d'intérêts et de principal sont payés par ce paiement
        // Un paiement de 0 FCFA peut être soit un paiement de pénalités uniquement, soit un paiement de 0 FCFA normal
        const isPenaltyOnlyPayment = data.amount === 0 && data.comment?.includes('Paiement de pénalités uniquement');
        const isZeroPayment = data.amount === 0 && (data.comment?.includes('Paiement de 0 FCFA') || isPenaltyOnlyPayment);
        const paymentAmount = isZeroPayment ? 0 : data.amount;
        
        // Payer d'abord les intérêts, puis le principal
        const interestPart = Math.min(paymentAmount, interestBeforePayment);
        const principalPart = Math.max(0, paymentAmount - interestPart);
        
        // Calculer le mois : utiliser installmentNumber si fourni, sinon calculer à partir de la date
        let monthNumber: number;
        if (installmentNumber !== undefined && installmentNumber > 0) {
            // Utiliser le numéro de mois fourni directement
            monthNumber = installmentNumber;
            console.log('[CreditSpecialeService] Utilisation du installmentNumber fourni:', monthNumber);
        } else {
            // Calculer le mois à partir de la date de paiement et de la première date de paiement
            const firstPaymentDate = new Date(contract.firstPaymentDate);
            const paymentDate = new Date(data.paymentDate);
            const monthsDiff = (paymentDate.getFullYear() - firstPaymentDate.getFullYear()) * 12 + 
                              (paymentDate.getMonth() - firstPaymentDate.getMonth());
            monthNumber = Math.max(1, monthsDiff + 1);
            console.log('[CreditSpecialeService] Calcul du mois à partir de la date:', {
                firstPaymentDate: firstPaymentDate.toISOString(),
                paymentDate: paymentDate.toISOString(),
                monthsDiff,
                monthNumber
            });
        }
        
        // Générer l'ID personnalisé au format M{mois}_{idContrat}
        // Utiliser l'ID complet du contrat
        const customPaymentId = `M${monthNumber}_${contract.id}`;
        console.log('[CreditSpecialeService] ID du paiement généré:', customPaymentId);
        
        // Créer le paiement
        const paymentData = {
            ...data,
            proofUrl,
            reference,
            principalAmount: principalPart,
            interestAmount: interestPart,
            penaltyAmount: 0, // Sera calculé si des pénalités sont payées
        };
        const payment = await this.creditPaymentRepository.createPayment(paymentData, customPaymentId);

        // Traiter les pénalités si sélectionnées
        let totalPenaltyAmount = 0;
        if (penaltyIds && penaltyIds.length > 0) {
            for (const penaltyId of penaltyIds) {
                const penalty = await this.creditPenaltyRepository.getPenaltyById(penaltyId);
                if (penalty && !penalty.paid) {
                    totalPenaltyAmount += penalty.amount;
                    await this.creditPenaltyRepository.updatePenalty(penaltyId, {
                        paid: true,
                        paidAt: new Date(),
                        paymentId: payment.id,
                        updatedBy: data.createdBy,
                    });
                }
            }
            // Mettre à jour le paiement avec le montant des pénalités
            await this.creditPaymentRepository.updatePayment(payment.id, {
                penaltyAmount: totalPenaltyAmount,
            });
        }

        // Calculer et créer les pénalités si nécessaire (basé sur les paiements, pas les installments)
        // Ne pas créer de pénalités pour les paiements de 0 FCFA
        if (!isZeroPayment && paymentAmount > 0) {
            await this.checkAndCreatePenalties(contract.id, payment);
        }

        // Recalculer le montant total payé et restant à partir de tous les paiements
        // Inclure les paiements de 0 FCFA s'ils ont un commentaire explicite (pénalités uniquement ou paiement de 0)
        const updatedPayments = await this.creditPaymentRepository.getPaymentsByCreditId(contract.id);
        const updatedRealPayments = updatedPayments.filter(p => 
            p.amount > 0 || 
            p.comment?.includes('Paiement de pénalités uniquement') ||
            p.comment?.includes('Paiement de 0 FCFA')
        );
        
        // Recalculer le reste dû avec tous les paiements
        let calculatedRemaining = contract.amount;
        const recalculatedPayments = [...updatedRealPayments].sort((a, b) => 
            new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime()
        );
        
        for (const p of recalculatedPayments) {
            const interest = calculatedRemaining * monthlyRate;
            const totalWithInterest = calculatedRemaining + interest;
            calculatedRemaining = Math.max(0, totalWithInterest - p.amount);
        }
        
        const totalPaid = updatedRealPayments.reduce((sum, p) => sum + p.amount, 0);
        const totalRemaining = calculatedRemaining + (calculatedRemaining * monthlyRate); // Ajouter les intérêts sur le reste actuel
        
        let newStatus = contract.status;
        if (totalRemaining <= 0 || calculatedRemaining <= 0) {
            newStatus = 'DISCHARGED';
        } else if (totalPaid > 0 && totalPaid < contract.totalAmount) {
            newStatus = 'PARTIAL';
        }

        // Calculer le nouveau score uniquement si ce n'est pas un paiement de pénalités uniquement
        const newScore = isPenaltyOnlyPayment 
            ? contract.score || 5
            : await this.calculateScore(contract.id, payment);
        const oldScore = contract.score || 5;
        const scoreVariation = isPenaltyOnlyPayment ? 0 : newScore - oldScore;

        // Calculer la prochaine date d'échéance basée sur les paiements
        // Si le reste dû > 0, la prochaine échéance est dans 1 mois
        const nextDueAt = calculatedRemaining > 0 
            ? (() => {
                const lastPaymentDate = recalculatedPayments.length > 0 
                    ? new Date(recalculatedPayments[recalculatedPayments.length - 1].paymentDate)
                    : new Date(contract.firstPaymentDate);
                const nextDue = new Date(lastPaymentDate);
                nextDue.setMonth(nextDue.getMonth() + 1);
                return nextDue;
            })()
            : undefined;

        await this.creditContractRepository.updateContract(contract.id, {
            amountPaid: totalPaid,
            amountRemaining: Math.round(totalRemaining),
            status: newStatus,
            nextDueAt,
            score: newScore,
            scoreUpdatedAt: new Date(),
            updatedBy: data.createdBy,
        });

        // Alerte score si variation forte (≥ 2 points ou ≤ -2 points)
        if (Math.abs(scoreVariation) >= 2) {
                try {
                    const variationLabel = scoreVariation > 0 ? 'augmentation' : 'baisse';
                    const variationEmoji = scoreVariation > 0 ? '📈' : '📉';
                    
                    await this.notificationService.createNotification({
                        module: 'credit_speciale',
                        entityId: contract.id,
                        type: 'reminder',
                        title: `${variationEmoji} Alerte : Variation importante du score`,
                        message: `Le score de fiabilité du contrat de crédit ${contract.creditType} de ${contract.clientFirstName} ${contract.clientLastName} a connu une ${variationLabel} importante : ${oldScore.toFixed(1)} → ${newScore.toFixed(1)} (${scoreVariation > 0 ? '+' : ''}${scoreVariation.toFixed(1)} point${Math.abs(scoreVariation) > 1 ? 's' : ''}).`,
                        metadata: {
                            contractId: contract.id,
                            clientId: contract.clientId,
                            creditType: contract.creditType,
                            oldScore,
                            newScore,
                            scoreVariation,
                            paymentId: payment.id,
                            paymentDate: payment.paymentDate.toISOString(),
                        },
                    });
                } catch {
                    // Erreur lors de la création de la notification d'alerte score - continue sans
                }
            }

        // Notification si le contrat est terminé (DISCHARGED)
        if (newStatus === 'DISCHARGED' && contract.status !== 'DISCHARGED') {
                try {
                    await this.notificationService.createNotification({
                        module: 'credit_speciale',
                        entityId: contract.id,
                        type: 'contract_finished',
                        title: 'Contrat de crédit terminé',
                        message: `Le contrat de crédit ${contract.creditType} de ${contract.clientFirstName} ${contract.clientLastName} a été entièrement remboursé.`,
                        metadata: {
                            contractId: contract.id,
                            clientId: contract.clientId,
                            creditType: contract.creditType,
                            totalAmount: contract.totalAmount,
                        },
                    });
                } catch {
                    // Erreur lors de la création de la notification de contrat terminé - continue sans
                }
            }

        // Marquer les pénalités sélectionnées comme payées
        if (penaltyIds && penaltyIds.length > 0) {
                for (const penaltyId of penaltyIds) {
                    await this.creditPenaltyRepository.updatePenalty(penaltyId, {
                        paid: true,
                        paidAt: new Date(),
                        updatedBy: data.createdBy,
                    });
                }
            }

        // Les pénalités sont déjà calculées dans la nouvelle logique basée sur les installments

        // Calculer et créer la rémunération du garant si applicable
        if (contract.guarantorIsMember && 
                contract.guarantorId && 
                contract.guarantorRemunerationPercentage > 0) {
                
                // Calculer le mois à partir de la date du paiement
                const firstPaymentDate = new Date(contract.firstPaymentDate);
                const paymentDate = new Date(payment.paymentDate);
                const monthsDiff = (paymentDate.getFullYear() - firstPaymentDate.getFullYear()) * 12 + 
                                 (paymentDate.getMonth() - firstPaymentDate.getMonth());
                const month = Math.max(1, monthsDiff + 1);
                
                // Limiter à 7 mois maximum pour la rémunération
                if (month <= 7) {
                    // Recalculer le montant global pour ce mois en utilisant l'échéancier
                    const { calculateSchedule } = await import('@/utils/credit-speciale-calculations');
                    const schedule = calculateSchedule({
                        amount: contract.amount,
                        interestRate: contract.interestRate,
                        monthlyPayment: contract.monthlyPaymentAmount,
                        firstPaymentDate: contract.firstPaymentDate,
                        maxDuration: 7, // Limiter à 7 mois
                    });
                    
                    // Trouver l'échéance correspondant au mois du paiement
                    const installment = schedule.find(item => item.month === month);
                    
                    if (installment) {
                        // Calculer la rémunération sur le reste dû (capital restant au début du mois)
                        // Pour le mois 1, le reste dû au début = montant emprunté
                        // Pour les mois suivants, le reste dû au début = remaining du mois précédent
                        let remainingAtStartOfMonth = 0;
                        if (month === 1) {
                            remainingAtStartOfMonth = contract.amount;
                        } else {
                            const previousInstallment = schedule.find(item => item.month === month - 1);
                            if (previousInstallment) {
                                remainingAtStartOfMonth = previousInstallment.remaining;
                            }
                        }
                        
                        const remunerationAmount = Math.round(
                            (remainingAtStartOfMonth * contract.guarantorRemunerationPercentage) / 100
                        );

                        if (remunerationAmount > 0) {
                            await this.guarantorRemunerationRepository.createRemuneration({
                                creditId: contract.id,
                                guarantorId: contract.guarantorId,
                                paymentId: payment.id,
                                amount: remunerationAmount,
                                month,
                                createdBy: data.createdBy,
                                updatedBy: data.createdBy,
                            });

                            // Notification pour le garant
                            try {
                                await this.notificationService.createNotification({
                                    module: 'credit_speciale',
                                    entityId: contract.id,
                                    type: 'reminder', // Utiliser 'reminder' en attendant l'ajout de 'guarantor_remuneration' dans NotificationType
                                    title: 'Rémunération reçue',
                                    message: `Vous avez reçu ${remunerationAmount.toLocaleString('fr-FR')} FCFA de rémunération pour le crédit de ${contract.clientFirstName} ${contract.clientLastName}`,
                                    metadata: {
                                        contractId: contract.id,
                                        paymentId: payment.id,
                                        amount: remunerationAmount,
                                        month,
                                        guarantorId: contract.guarantorId, // ID du garant dans metadata pour filtrage
                                        notificationType: 'guarantor_remuneration', // Type spécifique dans metadata
                                    },
                                });
                            } catch {
                                // Erreur lors de la création de la notification de rémunération - continue sans
                            }
                        }
                    }
                }
            }

        // Générer automatiquement le reçu PDF
        try {
            const receiptUrl = await this.generatePaymentReceiptPDF(payment, contract);
            if (receiptUrl) {
                // Mettre à jour le paiement avec l'URL du reçu
                await this.creditPaymentRepository.updatePayment(payment.id, {
                    receiptUrl,
                });
            }
        } catch {
            // Ne pas faire échouer la création du paiement si le reçu échoue
        }

        return payment;
    }

    // ==================== GÉNÉRATION REÇU PDF ====================

    async generatePaymentReceiptPDF(payment: CreditPayment, contract: CreditContract): Promise<string> {
        try {
            // Importer jsPDF dynamiquement
            const { default: jsPDF } = await import('jspdf');
            const autoTable = (await import('jspdf-autotable')).default;
            
            const doc = new jsPDF('p', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            let yPos = 20;

            // En-tête
            doc.setFillColor(35, 77, 101); // #234D65
            doc.rect(0, 0, pageWidth, 40, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(24);
            doc.setFont('helvetica', 'bold');
            doc.text('REÇU DE PAIEMENT', pageWidth / 2, 20, { align: 'center' });
            
            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
            doc.text('Crédit Spéciale - KARA', pageWidth / 2, 30, { align: 'center' });

            yPos = 50;

            // Informations du contrat
            doc.setTextColor(0, 0, 0);
            doc.setFillColor(240, 240, 240);
            doc.rect(10, yPos, pageWidth - 20, 50, 'F');
            
            yPos += 10;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text('INFORMATIONS DU CRÉDIT', 15, yPos);
            
            yPos += 7;
            doc.setFont('helvetica', 'normal');
            doc.text(`Client: ${contract.clientFirstName} ${contract.clientLastName}`, 15, yPos);
            doc.text(`N° Contrat: ${contract.id.slice(-8).toUpperCase()}`, pageWidth / 2 + 5, yPos);
            
            yPos += 7;
            doc.text(`Type: ${contract.creditType}`, 15, yPos);
            doc.text(`Montant emprunté: ${contract.amount.toLocaleString('fr-FR')} FCFA`, pageWidth / 2 + 5, yPos);
            
            yPos += 7;
            const paymentDate = new Date(payment.paymentDate);
            doc.text(`Date d'émission: ${paymentDate.toLocaleDateString('fr-FR')}`, 15, yPos);

            yPos += 15;

            // Informations du paiement
            doc.setFillColor(34, 197, 94); // green-600
            doc.rect(10, yPos, pageWidth - 20, 12, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('PAIEMENT ENREGISTRÉ', 15, yPos + 8);

            yPos += 20;

            // Détails du paiement
            const formatDateTime = (date: Date, time: string) => {
                return `${date.toLocaleDateString('fr-FR')} à ${time}`;
            };

            const formatAmount = (amount: number): string => {
                return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
            };

            const paymentModeLabels: Record<string, string> = {
                CASH: 'Espèces',
                MOBILE_MONEY: 'Mobile Money',
                BANK_TRANSFER: 'Virement bancaire',
                CHEQUE: 'Chèque',
            };

            const paymentData = [
                ['Date et heure', formatDateTime(paymentDate, payment.paymentTime)],
                ['Montant', `${formatAmount(payment.amount)} FCFA`],
                ['Moyen de paiement', paymentModeLabels[payment.mode] || payment.mode],
                ['Référence', payment.reference || 'N/A'],
            ];

            autoTable(doc, {
                startY: yPos,
                head: [['Détail', 'Valeur']],
                body: paymentData,
                theme: 'striped',
                headStyles: { fillColor: [35, 77, 101], textColor: 255, fontStyle: 'bold' },
                styles: { fontSize: 10 },
                margin: { left: 10, right: 10 },
            });

            yPos = (doc as any).lastAutoTable.finalY + 10;

            // Preuve de paiement si disponible
            if (payment.proofUrl) {
                doc.setFontSize(9);
                doc.setTextColor(100, 100, 100);
                doc.text('Preuve de paiement disponible dans le système', 15, yPos);
                yPos += 10;
            }

            // Pied de page
            doc.setPage(1);
            doc.setFontSize(8);
            doc.setTextColor(128, 128, 128);
            doc.text(
                'Ce document est généré automatiquement et certifie le paiement enregistré.',
                pageWidth / 2,
                pageHeight - 10,
                { align: 'center' }
            );

            // Convertir le PDF en blob puis en File pour l'upload
            const blob = doc.output('blob');
            const fileName = `recu-paiement-${contract.id.slice(-6)}-${payment.id.slice(-6)}.pdf`;
            const file = new File([blob], fileName, { type: 'application/pdf' });

            // Upload du PDF dans Firebase Storage
            const { url, path } = await this.documentRepository.uploadDocumentFile(
                file,
                contract.clientId,
                'CREDIT_SPECIALE_RECEIPT'
            );

            // Créer le document dans la collection documents
            await this.documentRepository.createDocument({
                type: 'CREDIT_SPECIALE_RECEIPT',
                format: 'pdf',
                libelle: `Reçu de paiement crédit ${contract.creditType}`,
                path,
                url,
                size: file.size,
                memberId: contract.clientId,
                contractId: contract.id,
                createdBy: payment.createdBy,
                updatedBy: payment.createdBy,
            });

            return url;
        } catch (error) {
            console.error('Erreur lors de la génération du reçu PDF:', error);
            throw error;
        }
    }

    // ==================== SCORING ====================

    /**
     * Calcule le score initial basé sur l'historique des crédits précédents du client
     * @param clientId ID du client
     * @returns Score initial (0-10), ou 5 par défaut si aucun historique
     */
    async calculateInitialScore(clientId: string): Promise<number> {
        try {
            // Récupérer tous les contrats précédents du client (terminés ou actifs)
            const previousContracts = await this.creditContractRepository.getContractsWithFilters({
                clientId,
            });

            // Filtrer les contrats qui ont un score (terminés ou en cours avec paiements)
            const contractsWithScore = previousContracts.filter(
                contract => contract.score !== undefined && contract.score !== null
            );

            if (contractsWithScore.length === 0) {
                // Aucun historique, retourner le score de base
                return 5;
            }

            // Calculer le score moyen pondéré par récence
            // Les contrats récents (moins de 12 mois) ont un poids de 1.0
            // Les contrats plus anciens (12-24 mois) ont un poids de 0.7
            // Les contrats très anciens (>24 mois) ont un poids de 0.5
            const now = new Date();
            let totalWeightedScore = 0;
            let totalWeight = 0;

            for (const contract of contractsWithScore) {
                const contractEndDate = contract.status === 'DISCHARGED' || contract.status === 'CLOSED' || contract.status === 'TRANSFORMED'
                    ? (contract.updatedAt || contract.createdAt)
                    : now;

                const monthsSinceEnd = Math.floor(
                    (now.getTime() - new Date(contractEndDate).getTime()) / (1000 * 60 * 60 * 24 * 30)
                );

                let weight = 1.0;
                if (monthsSinceEnd > 24) {
                    weight = 0.5;
                } else if (monthsSinceEnd > 12) {
                    weight = 0.7;
                }

                const contractScore = contract.score || 5;
                totalWeightedScore += contractScore * weight;
                totalWeight += weight;
            }

            if (totalWeight === 0) {
                return 5;
            }

            // Calculer la moyenne pondérée
            const averageScore = totalWeightedScore / totalWeight;

            // Appliquer les bornes (0-10) et arrondir à 1 décimale
            const initialScore = Math.max(0, Math.min(10, averageScore));
            return Math.round(initialScore * 10) / 10;
        } catch {
            // En cas d'erreur, retourner le score de base
            return 5;
        }
    }

    async calculateScore(creditId: string, payment: CreditPayment): Promise<number> {
        const contract = await this.creditContractRepository.getContractById(creditId);
        if (!contract) return 5; // Score de base

        const baseScore = contract.score || 5;
        const paymentDate = new Date(payment.paymentDate);
        
        // Utiliser l'échéance liée au paiement si disponible
        let dueDate: Date | null = null;
        if (payment.installmentId) {
            const installment = await this.creditInstallmentRepository.getInstallmentById(payment.installmentId);
            if (installment) {
                dueDate = new Date(installment.dueDate);
            }
        }
        
        // Sinon, utiliser nextDueAt du contrat
        if (!dueDate) {
            dueDate = contract.nextDueAt ? new Date(contract.nextDueAt) : null;
        }

        if (!dueDate) return baseScore;

        const daysDiff = Math.floor((paymentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

        let scoreChange = 0;

        // Règles de scoring
        if (daysDiff === 0) {
            // Paiement à J
            scoreChange = +1;
        } else if (daysDiff === 1) {
            // Paiement à J+1
            scoreChange = +0.5;
        } else if (daysDiff < 0) {
            // Paiement avant J
            scoreChange = +0.5;
        } else if (daysDiff > 1) {
            // Paiement après J+1
            scoreChange = -0.25 * daysDiff;
        }

        // Vérifier les pénalités impayées
        const unpaidPenalties = await this.getUnpaidPenaltiesByCreditId(creditId);
        if (unpaidPenalties.length > 0) {
            scoreChange -= 0.25 * unpaidPenalties.length;
        }

        // Facteur de récence (6 derniers mois)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        if (paymentDate < sixMonthsAgo) {
            scoreChange *= 0.5;
        }

        // Appliquer les bornes (0-10)
        const newScore = Math.max(0, Math.min(10, baseScore + scoreChange));
        return Math.round(newScore * 10) / 10; // Arrondir à 1 décimale
    }

    // ==================== PÉNALITÉS ====================

    // Fonction supprimée : checkAndCreatePenaltiesForInstallment
    // Utiliser checkAndCreatePenalties() à la place, qui fonctionne avec l'échéancier actuel

    async checkAndCreatePenalties(creditId: string, payment: CreditPayment): Promise<void> {
        console.log('[checkAndCreatePenalties] Début - creditId:', creditId, 'payment.id:', payment.id);
        const contract = await this.creditContractRepository.getContractById(creditId);
        if (!contract) {
            console.log('[checkAndCreatePenalties] Contrat non trouvé');
            return;
        }

        // Ignorer les paiements de 0 FCFA (pénalités uniquement ou paiement de 0)
        if (payment.amount === 0 && (
            payment.comment?.includes('Paiement de pénalités uniquement') ||
            payment.comment?.includes('Paiement de 0 FCFA')
        )) {
            console.log('[checkAndCreatePenalties] Paiement de 0 FCFA, ignoré');
            return;
        }

        // Extraire le numéro du mois depuis l'ID du paiement (format: M{mois}_{idContrat})
        let monthNumber: number | undefined;
        if (payment.id) {
            const match = payment.id.match(/^M(\d+)_/);
            if (match) {
                monthNumber = parseInt(match[1], 10);
                console.log('[checkAndCreatePenalties] Mois extrait depuis l\'ID:', monthNumber);
            } else {
                console.log('[checkAndCreatePenalties] Aucun mois trouvé dans l\'ID:', payment.id);
            }
        } else {
            console.log('[checkAndCreatePenalties] Payment.id est undefined');
        }

        // Si on n'a pas pu extraire le mois depuis l'ID, calculer à partir de la date
        if (!monthNumber || isNaN(monthNumber)) {
            const firstDate = new Date(contract.firstPaymentDate);
        const paymentDate = new Date(payment.paymentDate);
            const monthsDiff = (paymentDate.getFullYear() - firstDate.getFullYear()) * 12 + 
                              (paymentDate.getMonth() - firstDate.getMonth());
            monthNumber = Math.max(1, monthsDiff + 1);
            console.log('[checkAndCreatePenalties] Mois calculé depuis la date:', monthNumber, 'firstDate:', firstDate.toISOString(), 'paymentDate:', paymentDate.toISOString());
        }

        // Calculer la date prévue de l'échéance pour ce mois
        const firstPaymentDate = new Date(contract.firstPaymentDate);
        const dueDate = new Date(firstPaymentDate);
        dueDate.setMonth(dueDate.getMonth() + monthNumber - 1);
        dueDate.setHours(0, 0, 0, 0);

        // Date de paiement
        const paymentDate = new Date(payment.paymentDate);
        paymentDate.setHours(0, 0, 0, 0);

        console.log('[checkAndCreatePenalties] Dates calculées:', {
            monthNumber,
            firstPaymentDate: firstPaymentDate.toISOString(),
            dueDate: dueDate.toISOString(),
            paymentDate: paymentDate.toISOString()
        });

        // Date limite : ne pas créer de pénalités rétroactives pour les échéances avant cette date
        const newPenaltyLogicStartDate = new Date('2025-12-16');
        newPenaltyLogicStartDate.setHours(0, 0, 0, 0);

        // Ne pas créer de pénalité si la date d'échéance est avant la date limite
        if (dueDate < newPenaltyLogicStartDate) {
            console.log('[checkAndCreatePenalties] Échéance avant date limite, pénalité ignorée:', {
                paymentId: payment.id,
                dueDate: dueDate.toISOString(),
                limitDate: newPenaltyLogicStartDate.toISOString()
            });
            return;
        }

        // Calculer le nombre de jours de retard
        // Si datePaiement <= dateEcheancierActuel → pas de pénalité
        // Si datePaiement > dateEcheancierActuel → pénalité
        const daysLate = Math.floor((paymentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        console.log('[checkAndCreatePenalties] Jours de retard calculés:', daysLate);

        // Les pénalités ne s'appliquent qu'à partir du 3ème jour de retard (marge de 2 jours)
        if (daysLate >= 3) {
            console.log('[checkAndCreatePenalties] Paiement en retard, calcul du montant de l\'échéance...');
            // Calculer le montant de l'échéance pour ce mois à partir de l'échéancier actuel
            // On doit recalculer l'échéancier actuel pour obtenir le montant exact de cette échéance
            const monthlyRate = contract.interestRate / 100;
            let currentRemaining = contract.amount;
            let installmentAmount = 0;
            console.log('[checkAndCreatePenalties] Paramètres initiaux:', {
                monthlyRate,
                currentRemaining,
                contractAmount: contract.amount
            });

            // Récupérer tous les paiements une seule fois
            const allPayments = await this.getPaymentsByCreditId(creditId);
            const realPayments = allPayments.filter(p => 
                p.amount > 0 || !p.comment?.includes('Paiement de pénalités uniquement')
            );

            // Créer un map des paiements par mois (exclure le paiement actuel)
            const paymentsByMonth = new Map<number, number>();
            for (const p of realPayments) {
                if (p.id && p.id !== payment.id) {
                    const match = p.id.match(/^M(\d+)_/);
                    if (match) {
                        const pMonth = parseInt(match[1], 10);
                        const currentAmount = paymentsByMonth.get(pMonth) || 0;
                        paymentsByMonth.set(pMonth, currentAmount + p.amount);
                    }
                }
            }

            // Recalculer jusqu'au mois concerné pour obtenir le montant de l'échéance
            for (let i = 0; i < monthNumber; i++) {
                const isAfterMonth7 = i >= 7;
                const interest = isAfterMonth7 ? 0 : currentRemaining * monthlyRate;
                const montantGlobal = currentRemaining + interest;
                
                // Récupérer le paiement pour ce mois (s'il existe)
                const actualPayment = paymentsByMonth.get(i + 1) || 0;
                
                let paymentAmount: number;
                let resteDu: number;
                
                if (actualPayment > 0) {
                    paymentAmount = actualPayment;
                    resteDu = Math.max(0, montantGlobal - paymentAmount);
            } else {
                    const monthlyPayment = contract.monthlyPaymentAmount;
                    if (monthlyPayment > montantGlobal) {
                        paymentAmount = montantGlobal;
                        resteDu = 0;
                    } else if (currentRemaining < monthlyPayment && !isAfterMonth7) {
                        paymentAmount = currentRemaining;
                        resteDu = 0;
                    } else {
                        paymentAmount = monthlyPayment;
                        resteDu = montantGlobal - paymentAmount;
                    }
                }

                // Si c'est le mois concerné, sauvegarder le montant théorique de l'échéance
                if (i + 1 === monthNumber) {
                    // Utiliser le montant théorique (paymentAmount calculé), pas le montant réellement payé
                    // Car la pénalité se calcule sur le montant dû, pas sur le montant payé
                    installmentAmount = paymentAmount;
                }

                currentRemaining = resteDu;
            }

            // Calculer la pénalité : (jours de retard * montant de l'échéance) / 30
            const penaltyAmount = (daysLate * installmentAmount) / 30;
            console.log('[checkAndCreatePenalties] Pénalité calculée:', {
                daysLate,
                installmentAmount,
                penaltyAmount: Math.round(penaltyAmount),
                formula: `(${daysLate} * ${installmentAmount}) / 30`
            });

            if (penaltyAmount > 0) {
                // Vérifier si une pénalité existe déjà pour ce mois
                    const existingPenalties = await this.getPenaltiesByCreditId(creditId);
                    console.log('[checkAndCreatePenalties] Pénalités existantes:', existingPenalties.length);
                    const existingPenalty = existingPenalties.find(p => {
                        const pDueDate = new Date(p.dueDate);
                        pDueDate.setHours(0, 0, 0, 0);
                    // Vérifier si la pénalité correspond au même mois (même date d'échéance)
                        const matches = Math.abs(pDueDate.getTime() - dueDate.getTime()) < 24 * 60 * 60 * 1000 && !p.paid;
                        if (matches) {
                            console.log('[checkAndCreatePenalties] Pénalité existante trouvée:', {
                                penaltyId: p.id,
                                penaltyDueDate: pDueDate.toISOString(),
                                penaltyAmount: p.amount,
                                penaltyPaid: p.paid
                            });
                        }
                        return matches;
                    });

                if (!existingPenalty) {
                        console.log('[checkAndCreatePenalties] Création de la pénalité...');
                        const penalty = await this.createPenalty({
                            creditId,
                        installmentId: '', // Plus besoin d'installmentId
                        amount: Math.round(penaltyAmount),
                            daysLate,
                            dueDate,
                            paid: false,
                            reported: false,
                            createdBy: payment.createdBy,
                            updatedBy: payment.createdBy,
                        });
                        console.log('[checkAndCreatePenalties] Pénalité créée avec succès:', {
                            penaltyId: penalty.id,
                            amount: penalty.amount,
                            daysLate: penalty.daysLate,
                            dueDate: penalty.dueDate.toISOString()
                        });

                        // Notification pour les admins : pénalité créée
                        try {
                            await this.notificationService.createNotification({
                                module: 'credit_speciale',
                                entityId: creditId,
                                type: 'reminder',
                                title: 'Pénalité appliquée',
                            message: `Une pénalité de ${Math.round(penaltyAmount).toLocaleString('fr-FR')} FCFA a été appliquée au contrat de ${contract.clientFirstName} ${contract.clientLastName} (${daysLate} jour(s) de retard sur l'échéance du ${dueDate.toLocaleDateString('fr-FR')}).`,
                                metadata: {
                                    contractId: creditId,
                                    penaltyId: penalty.id,
                                    clientId: contract.clientId,
                                amount: Math.round(penaltyAmount),
                                    daysLate,
                                    dueDate: dueDate.toISOString(),
                                month: monthNumber,
                                },
                            });
                        } catch {
                            // Erreur lors de la création de la notification de pénalité - continue sans
                        }
                    } else {
                        console.log('[checkAndCreatePenalties] Pénalité déjà existante, non créée');
                    }
                } else {
                    console.log('[checkAndCreatePenalties] Montant de pénalité <= 0, non créée');
                }
        } else {
            console.log('[checkAndCreatePenalties] Pas de pénalité (daysLate < 3, marge de 2 jours)');
        }
        console.log('[checkAndCreatePenalties] Fin');
    }

    // ==================== ÉCHÉANCES (INSTALLMENTS) ====================

    async getInstallmentsByCreditId(creditId: string): Promise<CreditInstallment[]> {
        return await this.creditInstallmentRepository.getInstallmentsByCreditId(creditId);
    }

    async getPaymentsByCreditId(creditId: string): Promise<CreditPayment[]> {
        return await this.creditPaymentRepository.getPaymentsByCreditId(creditId);
    }

    async getPaymentsWithFilters(filters?: CreditPaymentFilters): Promise<CreditPayment[]> {
        return await this.creditPaymentRepository.getPaymentsWithFilters(filters);
    }

    // ==================== PÉNALITÉS ====================

    async calculatePenalties(creditId: string, daysLate: number, monthlyPaymentAmount: number): Promise<number> {
        // Règle de 3 : pénalité = (montant mensuel * jours de retard) / 30
        return (monthlyPaymentAmount * daysLate) / 30;
    }

    /**
     * Vérifie et crée les pénalités manquantes pour tous les paiements en retard
     * Cette fonction peut être appelée pour s'assurer que toutes les pénalités sont créées
     * IMPORTANT: Ne crée des pénalités que pour les paiements faits après l'implémentation de la nouvelle logique
     * (date limite: 16 décembre 2025 - date d'implémentation de la nouvelle logique)
     * Supprime également les pénalités rétroactives qui ont été créées par erreur
     */
    async checkAndCreateMissingPenalties(creditId: string): Promise<void> {
        console.log('[checkAndCreateMissingPenalties] Début - creditId:', creditId);
        const contract = await this.creditContractRepository.getContractById(creditId);
        if (!contract) {
            console.log('[checkAndCreateMissingPenalties] Contrat non trouvé');
            return;
        }

        // Date limite : ne pas créer de pénalités rétroactives pour les paiements avant cette date
        // Cette date correspond à l'implémentation de la nouvelle logique de pénalités
        const newPenaltyLogicStartDate = new Date('2025-12-16');
        newPenaltyLogicStartDate.setHours(0, 0, 0, 0);
        console.log('[checkAndCreateMissingPenalties] Date limite pour pénalités rétroactives:', newPenaltyLogicStartDate.toISOString());

        // Récupérer tous les paiements
        const allPayments = await this.getPaymentsByCreditId(creditId);
        let existingPenalties = await this.getPenaltiesByCreditId(creditId);
        
        // Supprimer les pénalités rétroactives qui correspondent à des échéances avant la date limite
        // Une pénalité est rétroactive si sa date d'échéance est avant le 16 décembre 2025
        // (date d'implémentation de la nouvelle logique)
        console.log('[checkAndCreateMissingPenalties] Vérification des pénalités rétroactives...', existingPenalties.length, 'pénalités existantes');
        let deletedCount = 0;
        for (const penalty of existingPenalties) {
            const penaltyDueDate = new Date(penalty.dueDate);
            penaltyDueDate.setHours(0, 0, 0, 0);
            
            console.log('[checkAndCreateMissingPenalties] Vérification pénalité:', {
                penaltyId: penalty.id,
                penaltyDueDate: penaltyDueDate.toISOString(),
                penaltyAmount: penalty.amount,
                penaltyPaid: penalty.paid,
                isBeforeLimit: penaltyDueDate < newPenaltyLogicStartDate
            });
            
            // Si la date d'échéance de la pénalité est avant la date limite, c'est une pénalité rétroactive
            // On la supprime si elle n'est pas payée
            if (penaltyDueDate < newPenaltyLogicStartDate && !penalty.paid) {
                try {
                    await this.creditPenaltyRepository.deletePenalty(penalty.id);
                    deletedCount++;
                    console.log(`[checkAndCreateMissingPenalties] Pénalité rétroactive supprimée: ${penalty.id} (${penalty.amount} FCFA pour l'échéance du ${penaltyDueDate.toLocaleDateString('fr-FR')})`);
                } catch {
                    // Erreur lors de la suppression de la pénalité rétroactive - continue sans
                }
            }
        }
        console.log(`[checkAndCreateMissingPenalties] ${deletedCount} pénalité(s) rétroactive(s) supprimée(s)`);
        
        // Récupérer à nouveau les pénalités après suppression pour avoir la liste à jour
        existingPenalties = await this.getPenaltiesByCreditId(creditId);
        
        const realPayments = allPayments
            .filter(p => p.amount > 0 || !p.comment?.includes('Paiement de pénalités uniquement'));

        // Pour chaque paiement, vérifier s'il y a une pénalité correspondante
        console.log('[checkAndCreateMissingPenalties] Vérification de', realPayments.length, 'paiements');
        for (const payment of realPayments) {
            // Ignorer les paiements faits avant l'implémentation de la nouvelle logique
            const paymentDateCheck = new Date(payment.paymentDate);
            paymentDateCheck.setHours(0, 0, 0, 0);
            console.log('[checkAndCreateMissingPenalties] Vérification paiement:', {
                paymentId: payment.id,
                paymentDate: paymentDateCheck.toISOString(),
                isBeforeLimit: paymentDateCheck < newPenaltyLogicStartDate
            });
            if (paymentDateCheck < newPenaltyLogicStartDate) {
                console.log('[checkAndCreateMissingPenalties] Paiement ignoré (avant date limite):', payment.id);
                continue; // Ne pas créer de pénalités rétroactives
            }
            // Extraire le numéro du mois depuis l'ID du paiement
            let monthNumber: number | undefined;
            if (payment.id) {
                const match = payment.id.match(/^M(\d+)_/);
                if (match) {
                    monthNumber = parseInt(match[1], 10);
                }
            }

            if (!monthNumber || isNaN(monthNumber)) continue;

            // Calculer la date prévue de l'échéance pour ce mois
            const contractFirstPaymentDate = new Date(contract.firstPaymentDate);
            const dueDate = new Date(contractFirstPaymentDate);
            dueDate.setMonth(dueDate.getMonth() + monthNumber - 1);
            dueDate.setHours(0, 0, 0, 0);

            // Date de paiement
            const paymentDate = new Date(payment.paymentDate);
            paymentDate.setHours(0, 0, 0, 0);

            // Calculer le nombre de jours de retard
            const daysLate = Math.floor((paymentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
            console.log('[checkAndCreateMissingPenalties] Calcul retard pour paiement:', {
                paymentId: payment.id,
                monthNumber,
                dueDate: dueDate.toISOString(),
                paymentDate: paymentDate.toISOString(),
                daysLate,
                dueDateBeforeLimit: dueDate < newPenaltyLogicStartDate
            });

            // Ne pas créer de pénalité si la date d'échéance est avant la date limite
            // (même si le paiement a été fait après la date limite)
            if (dueDate < newPenaltyLogicStartDate) {
                console.log('[checkAndCreateMissingPenalties] Échéance avant date limite, pénalité ignorée:', {
                    paymentId: payment.id,
                    dueDate: dueDate.toISOString(),
                    limitDate: newPenaltyLogicStartDate.toISOString()
                });
                continue;
            }

            // Si le paiement est en retard, vérifier si une pénalité existe déjà
            // Les pénalités ne s'appliquent qu'à partir du 3ème jour de retard (marge de 2 jours)
                if (daysLate >= 3) {
                // Vérifier si une pénalité existe déjà pour ce mois
                    const hasPenalty = existingPenalties.some(p => {
                        const pDueDate = new Date(p.dueDate);
                        pDueDate.setHours(0, 0, 0, 0);
                        const matches = Math.abs(pDueDate.getTime() - dueDate.getTime()) < 24 * 60 * 60 * 1000;
                        if (matches) {
                            console.log('[checkAndCreateMissingPenalties] Pénalité existante trouvée:', {
                                penaltyId: p.id,
                                penaltyDueDate: pDueDate.toISOString(),
                                penaltyAmount: p.amount
                            });
                        }
                        return matches;
                    });
                    console.log('[checkAndCreateMissingPenalties] Pénalité existe déjà?', hasPenalty);

                    if (!hasPenalty) {
                    // Recalculer le montant de l'échéance pour ce mois (même logique que checkAndCreatePenalties)
                    const monthlyRate = contract.interestRate / 100;
                    let currentRemaining = contract.amount;
                    let installmentAmount = 0;

                    // Créer un map des paiements par mois (exclure le paiement actuel)
                    const paymentsByMonth = new Map<number, number>();
                    for (const p of realPayments) {
                        if (p.id && p.id !== payment.id) {
                            const match = p.id.match(/^M(\d+)_/);
                            if (match) {
                                const pMonth = parseInt(match[1], 10);
                                const currentAmount = paymentsByMonth.get(pMonth) || 0;
                                paymentsByMonth.set(pMonth, currentAmount + p.amount);
                            }
                        }
                    }

                    // Recalculer jusqu'au mois concerné
                    for (let i = 0; i < monthNumber; i++) {
                        const isAfterMonth7 = i >= 7;
                        const interest = isAfterMonth7 ? 0 : currentRemaining * monthlyRate;
                        const montantGlobal = currentRemaining + interest;
                        
                        const actualPayment = paymentsByMonth.get(i + 1) || 0;
                        
                        let paymentAmount: number;
                        let resteDu: number;
                        
                        if (actualPayment > 0) {
                            paymentAmount = actualPayment;
                            resteDu = Math.max(0, montantGlobal - paymentAmount);
                        } else {
                            const monthlyPayment = contract.monthlyPaymentAmount;
                            if (monthlyPayment > montantGlobal) {
                                paymentAmount = montantGlobal;
                                resteDu = 0;
                            } else if (currentRemaining < monthlyPayment && !isAfterMonth7) {
                                paymentAmount = currentRemaining;
                                resteDu = 0;
                            } else {
                                paymentAmount = monthlyPayment;
                                resteDu = montantGlobal - paymentAmount;
                            }
                        }

                        if (i + 1 === monthNumber) {
                            installmentAmount = paymentAmount;
                        }

                        currentRemaining = resteDu;
                    }

                    // Calculer la pénalité
                    const penaltyAmount = (daysLate * installmentAmount) / 30;
                    console.log('[checkAndCreateMissingPenalties] Pénalité calculée:', {
                        daysLate,
                        installmentAmount,
                        penaltyAmount: Math.round(penaltyAmount),
                        formula: `(${daysLate} * ${installmentAmount}) / 30`
                    });
                        
                        if (penaltyAmount > 0) {
                            try {
                                console.log('[checkAndCreateMissingPenalties] Création de la pénalité...');
                                const penalty = await this.createPenalty({
                                    creditId,
                                installmentId: '', // Plus besoin d'installmentId
                                amount: Math.round(penaltyAmount),
                                    daysLate,
                                    dueDate,
                                    paid: false,
                                    reported: false,
                                createdBy: payment.createdBy || contract.createdBy,
                                updatedBy: payment.updatedBy || contract.updatedBy,
                                });
                                console.log('[checkAndCreateMissingPenalties] Pénalité créée avec succès:', {
                                    penaltyId: penalty.id,
                                    amount: penalty.amount,
                                    daysLate: penalty.daysLate,
                                    dueDate: penalty.dueDate.toISOString()
                                });
                            } catch {
                                // Erreur lors de la création de la pénalité - continue sans
                            }
                        } else {
                            console.log('[checkAndCreateMissingPenalties] Montant de pénalité <= 0, non créée');
                        }
                    } else {
                        console.log('[checkAndCreateMissingPenalties] Pas de pénalité existante trouvée, création...');
                    }
                } else {
                    console.log('[checkAndCreateMissingPenalties] Pas de pénalité (daysLate < 3, marge de 2 jours)');
                }
        }
        console.log('[checkAndCreateMissingPenalties] Fin');
    }

    async createPenalty(data: Omit<CreditPenalty, 'id' | 'createdAt' | 'updatedAt'>): Promise<CreditPenalty> {
        // Protection finale : ne pas créer de pénalité si la date d'échéance est avant le 16 décembre 2025
        const newPenaltyLogicStartDate = new Date('2025-12-16');
        newPenaltyLogicStartDate.setHours(0, 0, 0, 0);
        const penaltyDueDate = new Date(data.dueDate);
        penaltyDueDate.setHours(0, 0, 0, 0);
        
        if (penaltyDueDate < newPenaltyLogicStartDate) {
            console.log('[createPenalty] BLOCAGE: Tentative de création d\'une pénalité rétroactive bloquée:', {
                dueDate: penaltyDueDate.toISOString(),
                limitDate: newPenaltyLogicStartDate.toISOString(),
                amount: data.amount
            });
            throw new Error(`Impossible de créer une pénalité pour une échéance avant le 16 décembre 2025 (échéance: ${penaltyDueDate.toLocaleDateString('fr-FR')})`);
        }
        
        return await this.creditPenaltyRepository.createPenalty(data);
    }

    async getPenaltiesByCreditId(creditId: string): Promise<CreditPenalty[]> {
        return await this.creditPenaltyRepository.getPenaltiesByCreditId(creditId);
    }

    async getUnpaidPenaltiesByCreditId(creditId: string): Promise<CreditPenalty[]> {
        return await this.creditPenaltyRepository.getUnpaidPenaltiesByCreditId(creditId);
    }

    // ==================== RÉMUNÉRATION GARANT ====================

    async getRemunerationsByCreditId(creditId: string): Promise<GuarantorRemuneration[]> {
        return await this.guarantorRemunerationRepository.getRemunerationsByCreditId(creditId);
    }

    async getRemunerationsByGuarantorId(guarantorId: string): Promise<GuarantorRemuneration[]> {
        return await this.guarantorRemunerationRepository.getRemunerationsByGuarantorId(guarantorId);
    }

    async getRemunerationsWithFilters(filters?: GuarantorRemunerationFilters): Promise<GuarantorRemuneration[]> {
        return await this.guarantorRemunerationRepository.getRemunerationsWithFilters(filters);
    }

    // ==================== ÉLIGIBILITÉ ====================

    async checkEligibility(clientId: string, guarantorId?: string): Promise<{ eligible: boolean; reason?: string }> {
        // Vérifier si le client a des pénalités impayées en fin de contrat
        const allClientContracts = await this.creditContractRepository.getContractsWithFilters({
            clientId,
        });
        
        // Filtrer les contrats terminés (DISCHARGED, CLOSED, TRANSFORMED)
        const finishedContracts = allClientContracts.filter(c => 
            c.status === 'DISCHARGED' || c.status === 'CLOSED' || c.status === 'TRANSFORMED'
        );
        
        for (const contract of finishedContracts) {
            const unpaidPenalties = await this.creditPenaltyRepository.getUnpaidPenaltiesByCreditId(contract.id);
            if (unpaidPenalties.length > 0) {
                const totalUnpaidPenalties = unpaidPenalties.reduce((sum, p) => sum + p.amount, 0);
                return {
                    eligible: false,
                    reason: `Le client a des pénalités impayées (${totalUnpaidPenalties.toLocaleString('fr-FR')} FCFA) sur un contrat précédent. Veuillez régulariser ces pénalités avant de créer une nouvelle demande.`,
                };
            }
        }

        // Vérifier si le client est à jour à la caisse imprévue
        const clientContracts = await this.contractCIRepository.getContractsByMemberId(clientId);
        const activeClientContracts = clientContracts.filter(c => c.status === 'ACTIVE');
        
        // Vérifier si au moins un contrat actif a des paiements récents (dernière cotisation dans les 30 derniers jours)
        let clientIsUpToDate = false;
        for (const contract of activeClientContracts) {
            try {
                const payments = await this.paymentCIRepository.getPaymentsByContractId(contract.id);
                const paidPayments = payments.filter(p => p.status === 'PAID' && p.versements.length > 0);
                
                if (paidPayments.length > 0) {
                    // Vérifier le dernier versement
                    const lastPayment = paidPayments[paidPayments.length - 1];
                    if (lastPayment.versements.length > 0) {
                        const lastVersement = lastPayment.versements[lastPayment.versements.length - 1];
                        const versementDate = new Date(lastVersement.date);
                        const thirtyDaysAgo = new Date();
                        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                        
                        if (versementDate >= thirtyDaysAgo) {
                            clientIsUpToDate = true;
                            break;
                        }
                    }
                }
            } catch {
                // Erreur lors de la vérification des paiements CI - continue sans
            }
        }

        if (clientIsUpToDate) {
            return { eligible: true };
        }

        // Si le client n'est pas à jour, vérifier le garant
        if (guarantorId) {
            const guarantorContracts = await this.contractCIRepository.getContractsByMemberId(guarantorId);
            const activeGuarantorContracts = guarantorContracts.filter(c => c.status === 'ACTIVE');
            
            let guarantorIsUpToDate = false;
            for (const contract of activeGuarantorContracts) {
                try {
                    const payments = await this.paymentCIRepository.getPaymentsByContractId(contract.id);
                    const paidPayments = payments.filter(p => p.status === 'PAID' && p.versements.length > 0);
                    
                    if (paidPayments.length > 0) {
                        const lastPayment = paidPayments[paidPayments.length - 1];
                        if (lastPayment.versements.length > 0) {
                            const lastVersement = lastPayment.versements[lastPayment.versements.length - 1];
                            const versementDate = new Date(lastVersement.date);
                            const thirtyDaysAgo = new Date();
                            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                            
                            if (versementDate >= thirtyDaysAgo) {
                                guarantorIsUpToDate = true;
                                break;
                            }
                        }
                    }
                } catch (error) {
                    console.error('Erreur lors de la vérification des paiements CI:', error);
                }
            }

            if (guarantorIsUpToDate) {
                return { eligible: true };
            }

            return { 
                eligible: false, 
                reason: 'Ni le client ni le garant ne sont à jour à la caisse imprévue (dernière cotisation > 30 jours)' 
            };
        }

        return { 
            eligible: false, 
            reason: 'Le client n\'est pas à jour à la caisse imprévue (dernière cotisation > 30 jours) et aucun garant n\'a été fourni' 
        };
    }

    // ==================== GÉNÉRATION ET UPLOAD DE CONTRATS PDF ====================

    async generateContractPDF(contractId: string, blank?: boolean, pdfFile?: File): Promise<{ url: string; path: string; documentId: string }> {
        const contract = await this.creditContractRepository.getContractById(contractId);
        if (!contract) {
            throw new Error('Contrat introuvable');
        }

        let url = '';
        let path = '';
        let size = 0;

        // Si un fichier PDF est fourni, l'uploader
        if (pdfFile) {
            const uploadResult = await this.documentRepository.uploadDocumentFile(
                pdfFile,
                contract.clientId,
                'CREDIT_SPECIALE_CONTRACT'
            );
            url = uploadResult.url;
            path = uploadResult.path;
            size = uploadResult.size;
        } else {
            // Sinon, créer un document placeholder (pour compatibilité)
            path = `credit-contracts/${contractId}/${blank ? 'blank' : 'filled'}-contract.pdf`;
        }

        // Créer le document dans la collection documents
        const document = await this.documentRepository.createDocument({
            type: 'CREDIT_SPECIALE_CONTRACT',
            format: 'pdf',
            libelle: `Contrat crédit ${contract.creditType} ${blank ? '(vierge)' : ''}`,
            path,
            url,
            size,
            memberId: contract.clientId,
            contractId: contract.id,
            createdBy: contract.createdBy,
            updatedBy: contract.createdBy,
        });

        // Mettre à jour le contrat avec l'URL du document
        if (url) {
            await this.creditContractRepository.updateContract(contractId, {
                contractUrl: url,
                updatedBy: contract.createdBy,
            });
        }

        return {
            url,
            path,
            documentId: document.id || '',
        };
    }

    async uploadSignedContract(contractId: string, signedContractFile: File, adminId: string): Promise<CreditContract> {
        const contract = await this.creditContractRepository.getContractById(contractId);
        if (!contract) {
            throw new Error('Contrat introuvable');
        }

        // Upload du contrat signé
        const { url, path } = await this.documentRepository.uploadDocumentFile(
            signedContractFile,
            contract.clientId,
            'CREDIT_SPECIALE_CONTRACT_SIGNED'
        );

        // Créer le document dans la collection documents
        await this.documentRepository.createDocument({
            type: 'CREDIT_SPECIALE_CONTRACT_SIGNED',
            format: 'pdf',
            libelle: `Contrat signé crédit ${contract.creditType}`,
            path,
            url,
            size: signedContractFile.size,
            memberId: contract.clientId,
            contractId: contract.id,
            createdBy: adminId,
            updatedBy: adminId,
        });

        // Mettre à jour le contrat avec l'URL du contrat signé et activer le contrat
        const updatedContract = await this.creditContractRepository.updateContract(contractId, {
            signedContractUrl: url,
            status: 'ACTIVE',
            activatedAt: new Date(),
            fundsReleasedAt: new Date(),
            updatedBy: adminId,
        });

        if (!updatedContract) {
            throw new Error('Erreur lors de la mise à jour du contrat');
        }

        // Notifications
        try {
            await this.notificationService.createNotification({
                module: 'credit_speciale',
                entityId: contractId,
                type: 'contract_created',
                title: 'Contrat activé',
                message: `Le contrat de crédit ${contract.creditType} a été activé et les fonds ont été remis`,
                metadata: {
                    contractId,
                    clientId: contract.clientId,
                },
            });
        } catch {
            // Erreur lors de la création de la notification - continue sans
        }

        return updatedContract;
    }

    // ==================== HISTORIQUE ====================

    /**
     * Récupère l'historique complet d'un crédit (demande, contrat, paiements, pénalités, notifications)
     */
    async getCreditHistory(contractId: string): Promise<{
        demand: CreditDemand | null;
        contract: CreditContract | null;
        payments: CreditPayment[];
        penalties: CreditPenalty[];
        notifications: Notification[];
    }> {
        try {
            // Récupérer le contrat
            const contract = await this.creditContractRepository.getContractById(contractId);
            if (!contract) {
                throw new Error('Contrat introuvable');
            }

            // Récupérer la demande associée
            let demand: CreditDemand | null = null;
            if (contract.demandId) {
                demand = await this.creditDemandRepository.getDemandById(contract.demandId);
            }

            // Récupérer les paiements
            const payments = await this.creditPaymentRepository.getPaymentsByCreditId(contractId);

            // Récupérer les pénalités
            const penalties = await this.creditPenaltyRepository.getPenaltiesByCreditId(contractId);

            // Récupérer les notifications liées au contrat et à la demande
            // On récupère toutes les notifications du module credit_speciale et on filtre
            const allNotifications = await this.notificationService.getNotifications({
                module: 'credit_speciale',
            });

            // Filtrer les notifications pertinentes (liées au contrat, à la demande ou au client de ce contrat)
            const relevantNotifications = allNotifications.filter(notif => {
                const metadata = notif.metadata || {};
                // Vérifier si la notification concerne ce contrat spécifique
                return (
                    notif.entityId === contractId ||
                    (contract.demandId && notif.entityId === contract.demandId) ||
                    metadata.contractId === contractId ||
                    (contract.demandId && metadata.demandId === contract.demandId) ||
                    metadata.clientId === contract.clientId
                );
            });

            return {
                demand,
                contract,
                payments,
                penalties,
                notifications: relevantNotifications,
            };
        } catch (error) {
            console.error('Erreur lors de la récupération de l\'historique:', error);
            throw error;
        }
    }

    // ==================== AUGMENTATION DE CRÉDIT ====================

    /**
     * Vérifie si un contrat peut être étendu (augmentation de crédit)
     */
    async checkExtensionEligibility(contractId: string): Promise<{
        eligible: boolean;
        reason?: string;
        currentContract?: CreditContract;
        paymentsCount: number;
        unpaidPenaltiesCount: number;
    }> {
        try {
            const contract = await this.creditContractRepository.getContractById(contractId);
            if (!contract) {
                return { eligible: false, reason: 'Contrat introuvable', paymentsCount: 0, unpaidPenaltiesCount: 0 };
            }

            // Vérifier que le contrat est actif ou partiellement remboursé
            if (contract.status !== 'ACTIVE' && contract.status !== 'PARTIAL') {
                return { 
                    eligible: false, 
                    reason: `Le contrat doit être actif ou partiellement remboursé (statut actuel: ${contract.status})`,
                    currentContract: contract,
                    paymentsCount: 0,
                    unpaidPenaltiesCount: 0
                };
            }

            // Récupérer les paiements
            const payments = await this.creditPaymentRepository.getPaymentsByCreditId(contractId);
            const paymentsCount = payments.filter(p => p.amount > 0 || p.comment?.includes('Paiement de 0 FCFA')).length;

            // Récupérer les pénalités impayées
            const unpaidPenalties = await this.creditPenaltyRepository.getUnpaidPenaltiesByCreditId(contractId);
            const unpaidPenaltiesCount = unpaidPenalties.length;

            // Si des échéances ont été payées, vérifier qu'il n'y a pas de pénalités impayées
            if (paymentsCount > 0 && unpaidPenaltiesCount > 0) {
                return {
                    eligible: false,
                    reason: `Le client a ${unpaidPenaltiesCount} pénalité(s) impayée(s). Il doit d'abord les rembourser avant de demander une augmentation.`,
                    currentContract: contract,
                    paymentsCount,
                    unpaidPenaltiesCount
                };
            }

            return {
                eligible: true,
                currentContract: contract,
                paymentsCount,
                unpaidPenaltiesCount
            };
        } catch (error) {
            console.error('Erreur lors de la vérification de l\'éligibilité à l\'extension:', error);
            throw error;
        }
    }

    /**
     * Calcule les montants pour une augmentation de crédit
     */
    async calculateExtensionAmounts(contractId: string): Promise<{
        originalAmount: number;
        interestRate: number;
        totalPaid: number;
        remainingDue: number;
        suggestedMinMonthlyPayment?: number;
    }> {
        try {
            const contract = await this.creditContractRepository.getContractById(contractId);
            if (!contract) {
                throw new Error('Contrat introuvable');
            }

            // Récupérer les paiements effectués
            const payments = await this.creditPaymentRepository.getPaymentsByCreditId(contractId);
            const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

            // Calculer le reste dû
            // Si des paiements ont été effectués: Reste dû = Montant initial + Intérêts accumulés - Montants payés
            // Si aucun paiement: Reste dû = Montant initial + Intérêts du premier mois
            let remainingDue: number;
            
            if (totalPaid > 0) {
                // Calculer le reste dû en fonction des paiements réels
                remainingDue = contract.totalAmount - totalPaid;
            } else {
                // Aucun paiement: ajouter les intérêts du premier mois
                const firstMonthInterest = contract.amount * (contract.interestRate / 100);
                remainingDue = contract.amount + firstMonthInterest;
            }

            // S'assurer que le reste dû n'est pas négatif
            remainingDue = Math.max(0, remainingDue);

            return {
                originalAmount: contract.amount,
                interestRate: contract.interestRate,
                totalPaid,
                remainingDue,
            };
        } catch (error) {
            console.error('Erreur lors du calcul des montants d\'extension:', error);
            throw error;
        }
    }

    /**
     * Étend un contrat (augmentation de crédit)
     * - Passe le contrat initial en statut EXTENDED
     * - Crée une nouvelle demande approuvée automatiquement
     * - Crée un nouveau contrat avec le nouveau capital
     */
    async extendContract(
        parentContractId: string,
        additionalAmount: number,
        cause: string,
        simulationData: {
            interestRate: number;
            monthlyPaymentAmount: number;
            duration: number;
            firstPaymentDate: Date;
            totalAmount: number;
        },
        adminId: string,
        emergencyContact?: EmergencyContact,
        desiredDate?: string
    ): Promise<{
        newDemand: CreditDemand;
        newContract: CreditContract;
        parentContract: CreditContract;
    }> {
        try {
            // 1. Vérifier l'éligibilité
            const eligibility = await this.checkExtensionEligibility(parentContractId);
            if (!eligibility.eligible) {
                throw new Error(eligibility.reason || 'Le contrat ne peut pas être étendu');
            }

            const parentContract = eligibility.currentContract!;

            // 2. Calculer les montants
            const amounts = await this.calculateExtensionAmounts(parentContractId);
            const newCapital = amounts.remainingDue + additionalAmount;

            // 3. Récupérer les paiements du contrat parent
            const parentPayments = await this.creditPaymentRepository.getPaymentsByCreditId(parentContractId);
            const hasPayments = parentPayments.length > 0 && amounts.totalPaid > 0;

            // 4. Créer la nouvelle demande (automatiquement approuvée)
            const member = await this.memberRepository.getMemberById(parentContract.clientId);
            if (!member || !member.matricule) {
                throw new Error('Membre non trouvé ou matricule manquant');
            }

            // Générer l'ID de la demande
            const matriculePart = member.matricule.split('.')[0] || member.matricule.replace(/[^0-9]/g, '').slice(0, 4);
            const matriculeFormatted = matriculePart.padStart(4, '0');
            const now = new Date();
            const day = String(now.getDate()).padStart(2, '0');
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const year = String(now.getFullYear()).slice(-2);
            const dateFormatted = `${day}${month}${year}`;
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const timeFormatted = `${hours}${minutes}`;
            const demandId = `MK_DEMANDE_CSP_${matriculeFormatted}_${dateFormatted}_${timeFormatted}`;

            const newDemandData: Omit<CreditDemand, 'id' | 'createdAt' | 'updatedAt'> = {
                clientId: parentContract.clientId,
                clientFirstName: parentContract.clientFirstName,
                clientLastName: parentContract.clientLastName,
                clientContacts: parentContract.clientContacts,
                creditType: parentContract.creditType,
                amount: newCapital, // Nouveau capital
                monthlyPaymentAmount: simulationData.monthlyPaymentAmount,
                desiredDate: desiredDate || new Date().toISOString().split('T')[0],
                cause: `Augmentation de crédit - ${cause} (Contrat initial: ${parentContractId}, Montant additionnel: ${additionalAmount.toLocaleString('fr-FR')} FCFA)`,
                status: 'APPROVED', // Automatiquement approuvée
                guarantorId: parentContract.guarantorId,
                guarantorFirstName: parentContract.guarantorFirstName,
                guarantorLastName: parentContract.guarantorLastName,
                guarantorRelation: parentContract.guarantorRelation,
                guarantorIsMember: parentContract.guarantorIsMember,
                adminComments: `Extension automatique du contrat ${parentContractId}. Montant initial: ${amounts.originalAmount.toLocaleString('fr-FR')} FCFA, Reste dû: ${amounts.remainingDue.toLocaleString('fr-FR')} FCFA, Montant additionnel: ${additionalAmount.toLocaleString('fr-FR')} FCFA, Nouveau capital: ${newCapital.toLocaleString('fr-FR')} FCFA`,
                score: parentContract.score || 5,
                scoreUpdatedAt: new Date(),
                createdBy: adminId,
            };

            const newDemand = await this.creditDemandRepository.createDemand(newDemandData, demandId);

            // 5. Créer le nouveau contrat
            const contractId = `MK_CSP_${matriculeFormatted}_${dateFormatted}_${timeFormatted}`;

            const newContractData = {
                demandId: newDemand.id,
                parentContractId: parentContractId, // Lien vers le contrat parent
                clientId: parentContract.clientId,
                clientFirstName: parentContract.clientFirstName,
                clientLastName: parentContract.clientLastName,
                clientContacts: parentContract.clientContacts,
                creditType: parentContract.creditType,
                amount: newCapital,
                interestRate: simulationData.interestRate,
                monthlyPaymentAmount: simulationData.monthlyPaymentAmount,
                totalAmount: simulationData.totalAmount,
                duration: simulationData.duration,
                firstPaymentDate: simulationData.firstPaymentDate,
                status: 'PENDING' as CreditContractStatus, // En attente de signature
                amountPaid: 0,
                amountRemaining: simulationData.totalAmount,
                guarantorId: parentContract.guarantorId,
                guarantorFirstName: parentContract.guarantorFirstName,
                guarantorLastName: parentContract.guarantorLastName,
                guarantorRelation: parentContract.guarantorRelation,
                guarantorIsMember: parentContract.guarantorIsMember,
                guarantorIsParrain: parentContract.guarantorIsParrain,
                guarantorRemunerationPercentage: parentContract.guarantorRemunerationPercentage,
                emergencyContact: emergencyContact || parentContract.emergencyContact,
                score: parentContract.score || 5,
                scoreUpdatedAt: new Date(),
                createdBy: adminId,
            };

            const newContract = await this.creditContractRepository.createContract(newContractData, contractId);

            // 6. Mettre à jour la demande avec l'ID du contrat
            await this.creditDemandRepository.updateDemand(newDemand.id, {
                contractId: newContract.id,
                updatedBy: adminId,
            });

            // 7. Passer le contrat parent en statut EXTENDED
            const updatedParentContract = await this.creditContractRepository.updateContract(parentContractId, {
                status: 'EXTENDED',
                extendedAt: new Date(),
                blockedReason: `Augmentation de crédit vers ${newContract.id}`,
                updatedBy: adminId,
            });

            if (!updatedParentContract) {
                throw new Error('Erreur lors de la mise à jour du contrat parent');
            }

            // 8. Si des échéances ont été payées sur le contrat parent, enregistrer la première échéance du nouveau contrat comme payée
            if (hasPayments) {
                // Le montant de la première échéance payée du contrat parent
                const firstPaymentAmount = parentPayments[0]?.amount || 0;
                
                if (firstPaymentAmount > 0) {
                    // Créer un paiement pour la première échéance du nouveau contrat
                    // Format: M1_{idContrat} (comme les autres paiements)
                    const transferPaymentId = `M1_${newContract.id}`;
                    await this.creditPaymentRepository.createPayment({
                        creditId: newContract.id,
                        amount: firstPaymentAmount,
                        principalAmount: firstPaymentAmount,
                        interestAmount: 0,
                        penaltyAmount: 0,
                        paymentDate: new Date(),
                        paymentTime: `${hours}:${minutes}`,
                        mode: 'CASH',
                        comment: `Transfert de la première échéance du contrat parent ${parentContractId}`,
                        createdBy: adminId,
                    }, transferPaymentId);

                    // Mettre à jour le nouveau contrat avec le montant payé
                    await this.creditContractRepository.updateContract(newContract.id, {
                        amountPaid: firstPaymentAmount,
                        amountRemaining: simulationData.totalAmount - firstPaymentAmount,
                        updatedBy: adminId,
                    });
                }
            }

            // 9. Créer les notifications
            try {
                await this.notificationService.createNotification({
                    module: 'credit_speciale',
                    entityId: newContract.id,
                    type: 'contract_created',
                    title: 'Augmentation de crédit créée',
                    message: `Une augmentation de crédit de ${additionalAmount.toLocaleString('fr-FR')} FCFA a été créée pour ${parentContract.clientFirstName} ${parentContract.clientLastName}. Nouveau capital: ${newCapital.toLocaleString('fr-FR')} FCFA`,
                    metadata: {
                        contractId: newContract.id,
                        parentContractId,
                        additionalAmount,
                        newCapital,
                        clientId: parentContract.clientId,
                    },
                });

                await this.notificationService.createNotification({
                    module: 'credit_speciale',
                    entityId: parentContractId,
                    type: 'status_update',
                    title: 'Contrat étendu',
                    message: `Le contrat ${parentContractId} a été étendu. Un nouveau contrat ${newContract.id} a été créé.`,
                    metadata: {
                        contractId: parentContractId,
                        newContractId: newContract.id,
                        clientId: parentContract.clientId,
                    },
                });
            } catch {
                // Erreur lors de la création des notifications - continue sans
            }

            return {
                newDemand: { ...newDemand, contractId: newContract.id },
                newContract,
                parentContract: updatedParentContract,
            };
        } catch (error) {
            console.error('Erreur lors de l\'extension du contrat:', error);
            throw error;
        }
    }

    /**
     * Récupère le contrat enfant (si extension)
     */
    async getChildContract(parentContractId: string): Promise<CreditContract | null> {
        try {
            const contracts = await this.creditContractRepository.getContractsWithFilters({});
            return contracts.find(c => c.parentContractId === parentContractId) || null;
        } catch {
            return null;
        }
    }

    /**
     * Récupère le contrat parent (si extension)
     */
    async getParentContract(childContractId: string): Promise<CreditContract | null> {
        try {
            const contract = await this.creditContractRepository.getContractById(childContractId);
            if (!contract || !contract.parentContractId) {
                return null;
            }
            return await this.creditContractRepository.getContractById(contract.parentContractId);
        } catch {
            return null;
        }
    }
}

