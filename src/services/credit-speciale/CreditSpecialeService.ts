import { ICreditSpecialeService } from "./ICreditSpecialeService";
import { CreditDemand, CreditContract, CreditPayment, CreditPenalty, CreditInstallment, GuarantorRemuneration, CreditDemandStatus, CreditContractStatus, CreditType, StandardSimulation, CustomSimulation, Notification } from "@/types/types";
import { ICreditDemandRepository, CreditDemandFilters, CreditDemandStats } from "@/repositories/credit-speciale/ICreditDemandRepository";
import { ICreditContractRepository, CreditContractFilters, CreditContractStats } from "@/repositories/credit-speciale/ICreditContractRepository";
import { ICreditPaymentRepository, CreditPaymentFilters } from "@/repositories/credit-speciale/ICreditPaymentRepository";
import { ICreditPenaltyRepository, CreditPenaltyFilters } from "@/repositories/credit-speciale/ICreditPenaltyRepository";
import { ICreditInstallmentRepository } from "@/repositories/credit-speciale/ICreditInstallmentRepository";
import { IGuarantorRemunerationRepository, GuarantorRemunerationFilters } from "@/repositories/credit-speciale/IGuarantorRemunerationRepository";
import { IContractCIRepository } from "@/repositories/caisse-imprevu/IContractCIRepository";
import { IPaymentCIRepository } from "@/repositories/caisse-imprevu/IPaymentCIRepository";
import { IMemberRepository } from "@/repositories/members/IMemberRepository";
import { IDocumentRepository } from "@/repositories/documents/IDocumentRepository";
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
        } catch (error) {
            console.error('Erreur lors de la création de la notification:', error);
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
            } catch (error) {
                console.error('Erreur lors de la création de la notification:', error);
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
            } catch (error) {
                console.error('Erreur lors de la vérification du parrain:', error);
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

        // Générer les échéances pour ce contrat
        await this.generateInstallmentsForContract(createdContract, adminId);

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
        } catch (error) {
            console.error('Erreur lors de la création de la notification:', error);
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
            } catch (error) {
                console.error('Erreur lors de la création de la notification de changement de statut:', error);
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
            for (let month = 0; month < maxIterations && (remainingAmount > 0 || creditType === 'SPECIALE'); month++) {
                // 1. Calcul des intérêts sur le solde actuel
                const interest = remainingAmount * monthlyRate;
                // 2. Ajout des intérêts au solde
                const balanceWithInterest = remainingAmount + interest;
                // 3. Versement effectué : si le montant global est inférieur à la mensualité, payer le montant global
                const payment = balanceWithInterest < monthlyPayment ? balanceWithInterest : monthlyPayment;
                remainingAmount = balanceWithInterest - payment;
                
                totalInterest += interest;
                totalPaid += payment; // Somme des mensualités affichées (qui incluent déjà les intérêts)
                duration++;
                
                // Arrondir pour éviter les erreurs de virgule flottante
                if (remainingAmount < 1) {
                    remainingAmount = 0;
                }
                
                // Pour crédit spéciale, arrêter à 7 mois même si solde > 0
                if (creditType === 'SPECIALE' && duration >= 7) {
                    break;
                }
                
                // Pour autres types, arrêter si solde = 0
                if (creditType !== 'SPECIALE' && remainingAmount <= 0) {
                    break;
                }
            }
        }

        // Pour crédit spéciale, toujours fixer la durée à 7 mois et vérifier le solde
        let remainingAtMaxDuration = remainingAmount; // Par défaut
        let isValid = duration <= maxDuration;
        let suggestedMonthlyPayment = monthlyPayment;
        
        if (creditType === 'SPECIALE' && maxDuration === 7) {
            duration = 7; // Toujours 7 mois pour crédit spéciale
            
            // Recalculer les mensualités, intérêts et le solde pour les 7 mois complets
            let testRemaining = amount;
            let totalInterestFor7Months = 0;
            let totalMensualitesFor7Months = 0; // Somme des mensualités affichées (pas les montants globaux)
            
            for (let month = 0; month < 7; month++) {
                const interest = testRemaining * monthlyRate;
                totalInterestFor7Months += interest;
                const balanceWithInterest = testRemaining + interest;
                
                // Mensualité affichée : si le montant global est inférieur à la mensualité, c'est le montant global
                let mensualite: number;
                if (balanceWithInterest < monthlyPayment) {
                    mensualite = balanceWithInterest; // La dernière mensualité = montant global (capital + intérêts)
                } else {
                    mensualite = monthlyPayment;
                }
                
                totalMensualitesFor7Months += mensualite;
                // Le paiement réel est la mensualité affichée
                testRemaining = Math.max(0, balanceWithInterest - mensualite);
                
                if (testRemaining < 1) {
                    testRemaining = 0;
                }
            }
            
            // Utiliser le solde calculé sur exactement 7 mois
            remainingAtMaxDuration = testRemaining;
            
            // Mettre à jour les totaux avec les valeurs réelles
            totalInterest = totalInterestFor7Months;
            totalPaid = totalMensualitesFor7Months; // Somme des mensualités affichées (qui incluent déjà les intérêts)
            
            // Si au 7ème mois il reste un solde, calculer la mensualité minimale nécessaire
            if (remainingAtMaxDuration > 0) {
                isValid = false;
                // Calculer la mensualité minimale pour rembourser en exactement 7 mois
                // On utilise une recherche itérative pour trouver la bonne mensualité
                let minPayment = monthlyPayment;
                let maxPayment = amount * 2; // Limite supérieure raisonnable
                let optimalPayment = maxPayment;
                
                // Recherche binaire pour trouver la mensualité minimale
                for (let iteration = 0; iteration < 50; iteration++) {
                    const testPayment = Math.ceil((minPayment + maxPayment) / 2);
                    let testRemaining = amount;
                    
                    for (let month = 0; month < maxDuration; month++) {
                        const interest = testRemaining * monthlyRate;
                        const balanceWithInterest = testRemaining + interest;
                        const payment = Math.min(testPayment, balanceWithInterest);
                        testRemaining = balanceWithInterest - payment;
                        
                        if (testRemaining < 1) {
                            testRemaining = 0;
                        }
                    }
                    
                    if (testRemaining <= 0) {
                        optimalPayment = testPayment;
                        maxPayment = testPayment - 1;
                    } else {
                        minPayment = testPayment + 1;
                    }
                    
                    if (minPayment > maxPayment) break;
                }
                
                suggestedMonthlyPayment = optimalPayment;
            } else {
                // Si le solde est à 0 au 7ème mois, la simulation est valide
                isValid = true;
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

    async createPayment(data: Omit<CreditPayment, 'id' | 'createdAt' | 'updatedAt'>, proofFile?: File, penaltyIds?: string[]): Promise<CreditPayment> {
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

        // Récupérer toutes les échéances pour ce contrat
        let installments = await this.creditInstallmentRepository.getInstallmentsByCreditId(contract.id);
        
        // Si aucune échéance n'existe, les générer automatiquement
        if (installments.length === 0) {
            console.warn(`Aucune échéance trouvée pour le contrat ${contract.id}. Génération automatique des échéances...`);
            installments = await this.generateInstallmentsForContract(contract, data.createdBy);
            
            if (installments.length === 0) {
                throw new Error('Impossible de générer les échéances pour ce contrat. Veuillez vérifier les paramètres du contrat.');
            }
        }

        // Trouver l'échéance à payer
        // Priorité 1: utiliser l'installmentId fourni dans les données
        // Priorité 2: utiliser la première échéance non payée
        console.log('[CreditSpecialeService] Création de paiement - installmentId fourni:', data.installmentId);
        console.log('[CreditSpecialeService] Nombre d\'échéances disponibles:', installments.length);
        console.log('[CreditSpecialeService] Échéances:', installments.map(i => ({
            id: i.id,
            installmentNumber: i.installmentNumber,
            status: i.status,
            remainingAmount: i.remainingAmount,
            paidAmount: i.paidAmount
        })));
        
        let targetInstallment: CreditInstallment | null = null;
        
        if (data.installmentId) {
            // Utiliser l'échéance spécifiée
            targetInstallment = installments.find(i => i.id === data.installmentId) || null;
            console.log('[CreditSpecialeService] Échéance trouvée avec installmentId:', targetInstallment ? {
                id: targetInstallment.id,
                installmentNumber: targetInstallment.installmentNumber,
                status: targetInstallment.status
            } : 'AUCUNE');
        }
        
        // Si aucune échéance spécifique n'a été trouvée, utiliser la première non payée
        if (!targetInstallment) {
            console.log('[CreditSpecialeService] Aucune échéance spécifique trouvée, recherche de la première non payée...');
            targetInstallment = installments.find(i => i.status !== 'PAID' && i.remainingAmount > 0) || installments[0];
            console.log('[CreditSpecialeService] Échéance sélectionnée (fallback):', targetInstallment ? {
                id: targetInstallment.id,
                installmentNumber: targetInstallment.installmentNumber,
                status: targetInstallment.status
            } : 'AUCUNE');
        }
        
        if (!targetInstallment) {
            console.error('[CreditSpecialeService] ERREUR: Aucune échéance trouvée pour ce contrat');
            throw new Error('Aucune échéance trouvée pour ce contrat');
        }
        
        console.log('[CreditSpecialeService] Échéance cible finale:', {
            id: targetInstallment.id,
            installmentNumber: targetInstallment.installmentNumber,
            status: targetInstallment.status,
            remainingAmount: targetInstallment.remainingAmount,
            paidAmount: targetInstallment.paidAmount
        });
        
        // Créer le paiement avec l'URL de la preuve, la référence et l'ID de l'échéance
        const paymentData = {
            ...data,
            installmentId: targetInstallment.id,
            proofUrl,
            reference,
            principalAmount: 0, // Sera calculé lors de l'application du paiement
            interestAmount: 0, // Sera calculé lors de l'application du paiement
            penaltyAmount: 0, // Sera calculé si des pénalités sont payées
        };
        const payment = await this.creditPaymentRepository.createPayment(paymentData);
        
        // Traiter le paiement sur les échéances
        const isPenaltyOnlyPayment = payment.amount === 0 && payment.comment?.includes('Paiement de pénalités uniquement');
        let remainingPaymentAmount = isPenaltyOnlyPayment ? 0 : payment.amount;
        let totalPrincipalPaid = 0;
        let totalInterestPaid = 0;

        // Si ce n'est pas un paiement de pénalités uniquement, appliquer le paiement aux échéances
        if (!isPenaltyOnlyPayment && remainingPaymentAmount > 0) {
            console.log('[CreditSpecialeService] Application du paiement - Montant restant:', remainingPaymentAmount);
            console.log('[CreditSpecialeService] installmentId fourni dans data:', data.installmentId);
            
            // Si un installmentId spécifique a été fourni, commencer par cette échéance
            // Sinon, utiliser la logique normale (première échéance due)
            let overdueOrDueInstallments: CreditInstallment[];
            
            if (data.installmentId && targetInstallment) {
                console.log('[CreditSpecialeService] Utilisation de l\'échéance spécifiée (installmentId:', data.installmentId, ')');
                // Commencer par l'échéance spécifiée, puis continuer avec les suivantes si nécessaire
                const startIndex = installments.findIndex(i => i.id === targetInstallment!.id);
                console.log('[CreditSpecialeService] Index de départ:', startIndex);
                
                // Si l'échéance spécifiée a remainingAmount = 0 mais status != PAID, l'inclure quand même
                // (cas où l'échéance a été créée avec remainingAmount = 0 mais n'a pas encore été payée)
                overdueOrDueInstallments = installments
                    .slice(startIndex)
                    .filter(i => {
                        // Inclure l'échéance si :
                        // 1. Elle n'est pas déjà payée (status !== 'PAID')
                        // 2. ET (elle a un montant restant > 0 OU c'est l'échéance spécifiée)
                        const isTargetInstallment = i.id === targetInstallment!.id;
                        return i.status !== 'PAID' && (i.remainingAmount > 0 || isTargetInstallment);
                    })
                    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
                console.log('[CreditSpecialeService] Échéances éligibles (à partir de l\'index', startIndex, '):', overdueOrDueInstallments.map(i => ({
                    id: i.id,
                    installmentNumber: i.installmentNumber,
                    status: i.status,
                    remainingAmount: i.remainingAmount
                })));
            } else {
                console.log('[CreditSpecialeService] Utilisation de la logique normale (première échéance due)');
                // Logique normale : chercher l'échéance due ou en retard
                const paymentDate = new Date(payment.paymentDate);
                paymentDate.setHours(0, 0, 0, 0);

                overdueOrDueInstallments = installments
                    .filter(i => i.status !== 'PAID' && i.remainingAmount > 0)
                    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
                console.log('[CreditSpecialeService] Échéances éligibles (logique normale):', overdueOrDueInstallments.map(i => ({
                    id: i.id,
                    installmentNumber: i.installmentNumber,
                    status: i.status,
                    remainingAmount: i.remainingAmount
                })));
            }

            if (overdueOrDueInstallments.length > 0) {
                targetInstallment = overdueOrDueInstallments[0];
                console.log('[CreditSpecialeService] Échéance cible pour le paiement:', {
                    id: targetInstallment.id,
                    installmentNumber: targetInstallment.installmentNumber,
                    status: targetInstallment.status,
                    remainingAmount: targetInstallment.remainingAmount
                });
                
                // Appliquer le paiement à cette échéance et aux suivantes si nécessaire
                console.log('[CreditSpecialeService] Application du paiement sur', overdueOrDueInstallments.length, 'échéance(s)');
                for (const installment of overdueOrDueInstallments) {
                    if (remainingPaymentAmount <= 0) {
                        console.log('[CreditSpecialeService] Montant restant épuisé, arrêt du traitement');
                        break;
                    }

                    // Si remainingAmount est 0 mais que l'échéance n'est pas payée, calculer le montant total attendu
                    // (cas où l'échéance a été créée avec remainingAmount = 0)
                    let installmentTotalAmount = installment.remainingAmount;
                    if (installmentTotalAmount <= 0 && installment.status !== 'PAID') {
                        // Calculer le montant total attendu : interestAmount + principalAmount
                        // Si ces valeurs ne sont pas disponibles, utiliser le montant du paiement comme référence
                        installmentTotalAmount = installment.interestAmount + (installment.totalAmount - installment.interestAmount);
                        // Si toujours 0, utiliser le montant du paiement comme fallback
                        if (installmentTotalAmount <= 0) {
                            installmentTotalAmount = remainingPaymentAmount;
                        }
                    }
                    
                    const amountToPay = Math.min(remainingPaymentAmount, installmentTotalAmount > 0 ? installmentTotalAmount : remainingPaymentAmount);
                    console.log('[CreditSpecialeService] Traitement échéance', installment.installmentNumber, '- Montant à payer:', amountToPay, '- Restant avant:', installment.remainingAmount, '- Total échéance calculé:', installmentTotalAmount);
                    
                    // Calculer combien d'intérêts et de principal ont déjà été payés
                    const interestPaid = Math.min(installment.paidAmount, installment.interestAmount);
                    const principalPaid = Math.max(0, installment.paidAmount - installment.interestAmount);
                    
                    // Calculer combien d'intérêts et de principal restent à payer
                    // Si remainingAmount est 0, utiliser le total calculé
                    const effectiveRemainingAmount = installment.remainingAmount > 0 ? installment.remainingAmount : installmentTotalAmount;
                    const interestRemaining = Math.max(0, installment.interestAmount - interestPaid);
                    const principalRemaining = effectiveRemainingAmount - interestRemaining;
                    
                    // Payer d'abord les intérêts restants, puis le principal
                    const interestPart = Math.min(amountToPay, interestRemaining);
                    const principalPart = Math.min(amountToPay - interestPart, principalRemaining);

                    totalPrincipalPaid += principalPart;
                    totalInterestPaid += interestPart;
                    remainingPaymentAmount -= amountToPay;

                    const newPaidAmount = installment.paidAmount + amountToPay;
                    // Si remainingAmount était 0, calculer le nouveau remainingAmount basé sur le totalAmount
                    // Sinon, soustraire le montant payé du remainingAmount
                    let newRemainingAmount: number;
                    if (installment.remainingAmount <= 0 && installment.status !== 'PAID') {
                        // L'échéance avait remainingAmount = 0 mais n'était pas payée
                        // Calculer le nouveau remainingAmount : totalAmount - newPaidAmount
                        newRemainingAmount = Math.max(0, installmentTotalAmount - newPaidAmount);
                    } else {
                        // Cas normal : soustraire le montant payé
                        newRemainingAmount = Math.max(0, installment.remainingAmount - amountToPay);
                    }
                    
                    // Si un paiement est enregistré, l'échéance est considérée comme payée (fermée)
                    // Le "montant à payer" est une référence, pas une obligation
                    let newStatus: CreditInstallment['status'] = 'PAID';

                    console.log('[CreditSpecialeService] Mise à jour échéance', installment.installmentNumber, '- Nouveau statut: PAID, Montant payé:', newPaidAmount, '- Restant:', newRemainingAmount, '- TotalAmount original:', installment.totalAmount);
                    await this.creditInstallmentRepository.updateInstallment(installment.id, {
                        paidAmount: newPaidAmount,
                        remainingAmount: newRemainingAmount,
                        status: newStatus,
                        paidAt: new Date(), // Toujours marquer comme payé à la date du paiement
                        paymentId: payment.id, // Toujours lier le paiement
                        updatedBy: data.createdBy,
                    });
                    console.log('[CreditSpecialeService] Échéance', installment.installmentNumber, 'mise à jour avec succès');
                }
                
                // Mettre à jour le paiement avec les montants totaux (principal + intérêts) pour toutes les échéances payées
                await this.creditPaymentRepository.updatePayment(payment.id, {
                    installmentId: targetInstallment.id,
                    principalAmount: totalPrincipalPaid,
                    interestAmount: totalInterestPaid,
                });
            }
        }

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

        // Calculer et créer les pénalités pour l'échéance payée si nécessaire
        if (targetInstallment && !isPenaltyOnlyPayment) {
            await this.checkAndCreatePenaltiesForInstallment(targetInstallment, payment);
        }

        // Mettre à jour le contrat avec les totaux
        const allInstallments = await this.creditInstallmentRepository.getInstallmentsByCreditId(contract.id);
        const totalPaid = allInstallments.reduce((sum, i) => sum + i.paidAmount, 0);
        const totalRemaining = allInstallments.reduce((sum, i) => sum + i.remainingAmount, 0);
        
        let newStatus = contract.status;
        if (totalRemaining <= 0) {
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

        // Mettre à jour nextDueAt avec la prochaine échéance due
        const nextDueInstallment = await this.creditInstallmentRepository.getNextDueInstallment(contract.id);
        const nextDueAt = nextDueInstallment ? nextDueInstallment.dueDate : undefined;

        await this.creditContractRepository.updateContract(contract.id, {
            amountPaid: totalPaid,
            amountRemaining: totalRemaining,
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
                } catch (error) {
                    console.error('Erreur lors de la création de la notification d\'alerte score:', error);
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
                } catch (error) {
                    console.error('Erreur lors de la création de la notification de contrat terminé:', error);
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
                
                const remunerationAmount = Math.round(
                    (payment.amount * contract.guarantorRemunerationPercentage) / 100
                );

                if (remunerationAmount > 0) {
                    // Déterminer le mois en fonction de l'échéance réellement payée
                    // Si le paiement a été appliqué à plusieurs échéances, utiliser la première échéance qui a reçu un paiement
                    let month: number;
                    
                    // Récupérer toutes les échéances mises à jour après le paiement
                    const updatedInstallments = await this.creditInstallmentRepository.getInstallmentsByCreditId(contract.id);
                    
                    // Trouver l'échéance qui correspond au paiement
                    // Priorité 1 : Utiliser payment.installmentId si disponible
                    if (payment.installmentId) {
                        const installment = updatedInstallments.find(inst => inst.id === payment.installmentId);
                        if (installment && installment.installmentNumber) {
                            month = installment.installmentNumber;
                        } else {
                            // Fallback : utiliser targetInstallment
                            month = targetInstallment?.installmentNumber || 1;
                        }
                    } else if (targetInstallment && targetInstallment.installmentNumber) {
                        // Priorité 2 : Utiliser targetInstallment
                        month = targetInstallment.installmentNumber;
                    } else {
                        // Priorité 3 : Trouver la première échéance qui a été partiellement ou complètement payée par ce paiement
                        // Chercher l'échéance qui a été mise à jour récemment et qui correspond au paiement
                        const recentlyUpdatedInstallment = updatedInstallments
                            .filter(inst => inst.status === 'PARTIAL' || inst.status === 'PAID')
                            .sort((a, b) => a.installmentNumber - b.installmentNumber)[0];
                        
                        if (recentlyUpdatedInstallment && recentlyUpdatedInstallment.installmentNumber) {
                            month = recentlyUpdatedInstallment.installmentNumber;
                        } else {
                            // Dernier fallback : calculer à partir de la date
                            const firstPaymentDate = new Date(contract.firstPaymentDate);
                            const paymentDate = new Date(payment.paymentDate);
                            const monthsDiff = (paymentDate.getFullYear() - firstPaymentDate.getFullYear()) * 12 + 
                                             (paymentDate.getMonth() - firstPaymentDate.getMonth());
                            month = Math.max(1, monthsDiff + 1);
                        }
                    }

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
                    } catch (error) {
                        console.error('Erreur lors de la création de la notification de rémunération:', error);
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
        } catch (error) {
            console.error('Erreur lors de la génération du reçu PDF:', error);
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
        } catch (error) {
            console.error('Erreur lors du calcul du score initial basé sur l\'historique:', error);
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

    /**
     * Vérifie et crée les pénalités pour une échéance spécifique
     */
    async checkAndCreatePenaltiesForInstallment(installment: CreditInstallment, payment: CreditPayment): Promise<void> {
        const contract = await this.creditContractRepository.getContractById(installment.creditId);
        if (!contract) return;

        // Ignorer si l'échéance est déjà payée ou si le paiement est uniquement pour pénalités
        if (installment.status === 'PAID' || installment.remainingAmount <= 0) {
            return;
        }

        const paymentDate = new Date(payment.paymentDate);
        paymentDate.setHours(0, 0, 0, 0);
        const dueDate = new Date(installment.dueDate);
        dueDate.setHours(0, 0, 0, 0);

        // Calculer le nombre de jours de retard
        const daysLate = Math.floor((paymentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

        // Si le paiement est en retard, créer une pénalité
        if (daysLate > 0) {
            const penaltyAmount = await this.calculatePenalties(installment.creditId, daysLate, installment.totalAmount);
            
            if (penaltyAmount > 0) {
                // Vérifier si une pénalité existe déjà pour cette échéance
                const existingPenalties = await this.getPenaltiesByCreditId(installment.creditId);
                const existingPenalty = existingPenalties.find(p => 
                    p.installmentId === installment.id && !p.paid
                );

                if (!existingPenalty) {
                    const penalty = await this.createPenalty({
                        creditId: installment.creditId,
                        installmentId: installment.id,
                        amount: penaltyAmount,
                        daysLate,
                        dueDate: installment.dueDate,
                        paid: false,
                        reported: false,
                        createdBy: payment.createdBy,
                        updatedBy: payment.createdBy,
                    });

                    // Notification pour les admins : pénalité créée
                    try {
                        await this.notificationService.createNotification({
                            module: 'credit_speciale',
                            entityId: installment.creditId,
                            type: 'reminder',
                            title: 'Pénalité appliquée',
                            message: `Une pénalité de ${penaltyAmount.toLocaleString('fr-FR')} FCFA a été appliquée au contrat de ${contract.clientFirstName} ${contract.clientLastName} (${daysLate} jour(s) de retard sur l'échéance du ${dueDate.toLocaleDateString('fr-FR')}).`,
                            metadata: {
                                contractId: installment.creditId,
                                installmentId: installment.id,
                                penaltyId: penalty.id,
                                clientId: contract.clientId,
                                amount: penaltyAmount,
                                daysLate,
                                dueDate: dueDate.toISOString(),
                            },
                        });
                    } catch (error) {
                        console.error('Erreur lors de la création de la notification de pénalité:', error);
                    }
                }
            }
        }
    }

    async checkAndCreatePenalties(creditId: string, payment: CreditPayment): Promise<void> {
        const contract = await this.creditContractRepository.getContractById(creditId);
        if (!contract) return;

        // Ignorer les paiements de pénalités uniquement
        if (payment.amount === 0 && payment.comment?.includes('Paiement de pénalités uniquement')) {
            return;
        }

        // Récupérer tous les paiements pour calculer le montant cumulé
        const allPayments = await this.getPaymentsByCreditId(creditId);
        const sortedPayments = allPayments
            .filter(p => p.amount > 0 || !p.comment?.includes('Paiement de pénalités uniquement'))
            .sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime());
        
        // Calculer les échéances pour identifier laquelle vient d'être payée
        const monthlyRate = contract.interestRate / 100;
        const firstDate = new Date(contract.firstPaymentDate);
        const paymentAmount = contract.monthlyPaymentAmount;
        const maxDuration = contract.duration;
        
        let remaining = contract.amount;
        let accumulatedPaid = 0;
        const paymentDate = new Date(payment.paymentDate);
        paymentDate.setHours(0, 0, 0, 0);

        // Trouver quelle échéance vient d'être payée
        for (let i = 0; i < maxDuration; i++) {
            if (remaining <= 0 && contract.creditType !== 'SPECIALE') break;

            const dueDate = new Date(firstDate);
            dueDate.setMonth(dueDate.getMonth() + i);
            dueDate.setHours(0, 0, 0, 0);
            
            const interest = remaining * monthlyRate;
            const balanceWithInterest = remaining + interest;
            
            let expectedPayment: number;
            if (remaining < paymentAmount) {
                expectedPayment = balanceWithInterest;
                remaining = 0;
            } else {
                expectedPayment = paymentAmount;
                remaining = Math.max(0, balanceWithInterest - expectedPayment);
            }

            // Calculer le montant payé cumulé jusqu'à maintenant (avant ce paiement)
            const paidBeforeThisPayment = sortedPayments
                .filter(p => new Date(p.paymentDate).getTime() < paymentDate.getTime())
                .reduce((sum, p) => sum + (p.amount > 0 ? p.amount : 0), 0);
            
            const expectedTotalForThisDue = accumulatedPaid + expectedPayment;
            
            // Vérifier si cette échéance vient d'être payée avec ce paiement
            const paidAfterThisPayment = paidBeforeThisPayment + payment.amount;
            const isThisDueJustPaid = paidAfterThisPayment >= expectedTotalForThisDue && 
                                     paidBeforeThisPayment < expectedTotalForThisDue;

            if (isThisDueJustPaid) {
                // Calculer le retard pour cette échéance
                const daysLate = Math.floor((paymentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

                if (daysLate > 0) {
                    const penaltyAmount = await this.calculatePenalties(creditId, daysLate, expectedPayment);
                    
                    // Vérifier si une pénalité existe déjà pour cette échéance
                    const existingPenalties = await this.getPenaltiesByCreditId(creditId);
                    const existingPenalty = existingPenalties.find(p => {
                        const pDueDate = new Date(p.dueDate);
                        pDueDate.setHours(0, 0, 0, 0);
                        return Math.abs(pDueDate.getTime() - dueDate.getTime()) < 24 * 60 * 60 * 1000 && !p.paid;
                    });

                    if (!existingPenalty && penaltyAmount > 0) {
                        // Trouver l'installment correspondant à cette date d'échéance
                        const installments = await this.creditInstallmentRepository.getInstallmentsByCreditId(creditId);
                        const matchingInstallment = installments.find(inst => {
                            const instDueDate = new Date(inst.dueDate);
                            instDueDate.setHours(0, 0, 0, 0);
                            return Math.abs(instDueDate.getTime() - dueDate.getTime()) < 24 * 60 * 60 * 1000;
                        });

                        const penalty = await this.createPenalty({
                            creditId,
                            installmentId: matchingInstallment?.id || '',
                            amount: penaltyAmount,
                            daysLate,
                            dueDate,
                            paid: false,
                            reported: false,
                            createdBy: payment.createdBy,
                            updatedBy: payment.createdBy,
                        });

                        // Notification pour les admins : pénalité créée
                        try {
                            await this.notificationService.createNotification({
                                module: 'credit_speciale',
                                entityId: creditId,
                                type: 'reminder',
                                title: 'Pénalité appliquée',
                                message: `Une pénalité de ${penaltyAmount.toLocaleString('fr-FR')} FCFA a été appliquée au contrat de ${contract.clientFirstName} ${contract.clientLastName} (${daysLate} jour(s) de retard sur l'échéance du ${dueDate.toLocaleDateString('fr-FR')}).`,
                                metadata: {
                                    contractId: creditId,
                                    penaltyId: penalty.id,
                                    clientId: contract.clientId,
                                    amount: penaltyAmount,
                                    daysLate,
                                    dueDate: dueDate.toISOString(),
                                },
                            });
                        } catch (error) {
                            console.error('Erreur lors de la création de la notification de pénalité:', error);
                        }
                    }
                }
                break; // On a trouvé l'échéance payée, on peut arrêter
            }

            accumulatedPaid += expectedPayment;
        }
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
     * Vérifie et crée les pénalités manquantes pour toutes les échéances passées
     * Cette fonction peut être appelée pour s'assurer que toutes les pénalités sont créées
     */
    async checkAndCreateMissingPenalties(creditId: string): Promise<void> {
        const contract = await this.creditContractRepository.getContractById(creditId);
        if (!contract) return;

        // Récupérer tous les paiements et pénalités existantes
        const allPayments = await this.getPaymentsByCreditId(creditId);
        const existingPenalties = await this.getPenaltiesByCreditId(creditId);
        
        const sortedPayments = allPayments
            .filter(p => p.amount > 0 || !p.comment?.includes('Paiement de pénalités uniquement'))
            .sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime());
        
        // Calculer les échéances (même logique que dans calculateStandardSimulation)
        const monthlyRate = contract.interestRate / 100;
        const firstDate = new Date(contract.firstPaymentDate);
        const paymentAmount = contract.monthlyPaymentAmount;
        const maxDuration = contract.duration;
        
        let remaining = contract.amount;
        let accumulatedPaid = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Parcourir toutes les échéances
        for (let i = 0; i < maxDuration; i++) {
            if (remaining <= 0 && contract.creditType !== 'SPECIALE') break;

            const dueDate = new Date(firstDate);
            dueDate.setMonth(dueDate.getMonth() + i);
            dueDate.setHours(0, 0, 0, 0);
            
            const interest = remaining * monthlyRate;
            const balanceWithInterest = remaining + interest;
            
            let expectedPayment: number;
            if (remaining < paymentAmount) {
                expectedPayment = balanceWithInterest;
                remaining = 0;
            } else {
                expectedPayment = paymentAmount;
                remaining = Math.max(0, balanceWithInterest - expectedPayment);
            }

            // Calculer le montant payé cumulé jusqu'à maintenant
            let tempAccumulated = 0;
            let paymentDateForThisDue: Date | null = null;
            
            for (const p of sortedPayments) {
                tempAccumulated += p.amount;
                // Si ce paiement couvre cette échéance
                if (tempAccumulated >= accumulatedPaid + expectedPayment && !paymentDateForThisDue) {
                    paymentDateForThisDue = new Date(p.paymentDate);
                    paymentDateForThisDue.setHours(0, 0, 0, 0);
                }
            }

            const expectedTotalForThisDue = accumulatedPaid + expectedPayment;
            const isPaid = tempAccumulated >= expectedTotalForThisDue;

            // Si l'échéance est passée et payée en retard, créer une pénalité si elle n'existe pas
            if (dueDate < today && isPaid && paymentDateForThisDue && paymentDateForThisDue > dueDate) {
                const daysLate = Math.floor((paymentDateForThisDue.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
                
                if (daysLate > 0) {
                    // Vérifier si une pénalité existe déjà pour cette échéance (payée ou non)
                    const hasPenalty = existingPenalties.some(p => {
                        const pDueDate = new Date(p.dueDate);
                        pDueDate.setHours(0, 0, 0, 0);
                        return Math.abs(pDueDate.getTime() - dueDate.getTime()) < 24 * 60 * 60 * 1000;
                    });

                    // Ne créer une pénalité que si aucune n'existe déjà pour cette échéance
                    if (!hasPenalty) {
                        const penaltyAmount = await this.calculatePenalties(creditId, daysLate, expectedPayment);
                        
                        if (penaltyAmount > 0) {
                            try {
                                // Trouver l'installment correspondant à cette date d'échéance
                                const installments = await this.creditInstallmentRepository.getInstallmentsByCreditId(creditId);
                                const matchingInstallment = installments.find(inst => {
                                    const instDueDate = new Date(inst.dueDate);
                                    instDueDate.setHours(0, 0, 0, 0);
                                    return Math.abs(instDueDate.getTime() - dueDate.getTime()) < 24 * 60 * 60 * 1000;
                                });

                                await this.createPenalty({
                                    creditId,
                                    installmentId: matchingInstallment?.id || '',
                                    amount: penaltyAmount,
                                    daysLate,
                                    dueDate,
                                    paid: false,
                                    reported: false,
                                    createdBy: contract.createdBy,
                                    updatedBy: contract.createdBy,
                                });
                            } catch (error) {
                                console.error(`Erreur lors de la création de la pénalité pour l'échéance du ${dueDate.toLocaleDateString('fr-FR')}:`, error);
                            }
                        }
                    }
                }
            }

            accumulatedPaid += expectedPayment;
        }
    }

    async createPenalty(data: Omit<CreditPenalty, 'id' | 'createdAt' | 'updatedAt'>): Promise<CreditPenalty> {
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
            } catch (error) {
                console.error('Erreur lors de la vérification des paiements CI:', error);
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

    async generateContractPDF(contractId: string, blank?: boolean): Promise<{ url: string; path: string; documentId: string }> {
        const contract = await this.creditContractRepository.getContractById(contractId);
        if (!contract) {
            throw new Error('Contrat introuvable');
        }

        // Pour l'instant, on retourne une URL vide - le composant PDF sera créé séparément
        // TODO: Implémenter la génération PDF avec jsPDF ou react-pdf
        // Pour l'instant, on crée juste un document placeholder
        const document = await this.documentRepository.createDocument({
            type: blank ? 'CREDIT_SPECIALE_CONTRACT' : 'CREDIT_SPECIALE_CONTRACT',
            format: 'pdf',
            libelle: `Contrat crédit ${contract.creditType} ${blank ? '(vierge)' : ''}`,
            path: `credit-contracts/${contractId}/${blank ? 'blank' : 'filled'}-contract.pdf`,
            url: '', // Sera rempli après génération
            size: 0,
            memberId: contract.clientId,
            contractId: contract.id,
            createdBy: contract.createdBy,
            updatedBy: contract.createdBy,
        });

        // Mettre à jour le contrat avec l'URL du document
        await this.creditContractRepository.updateContract(contractId, {
            contractUrl: document.url,
            updatedBy: contract.createdBy,
        });

        return {
            url: document.url,
            path: document.path,
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
        } catch (error) {
            console.error('Erreur lors de la création de la notification:', error);
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
}

