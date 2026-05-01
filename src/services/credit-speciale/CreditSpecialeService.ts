import { ICreditSpecialeService, UpdateCreditDemandInput } from "./ICreditSpecialeService";
import { CreditDemand, CreditContract, CreditPayment, CreditPenalty, CreditInstallment, GuarantorRemuneration, GuarantorPayment, CreditDemandStatus, CreditContractStatus, CreditType, CreditPaymentMode, StandardSimulation, CustomSimulation, Notification, PaymentMode, SignedQuittanceUploadData } from "@/types/types";
import { ICreditDemandRepository, CreditDemandFilters, CreditDemandStats } from "@/repositories/credit-speciale/ICreditDemandRepository";
import { ICreditContractRepository, CreditContractFilters, CreditContractStats } from "@/repositories/credit-speciale/ICreditContractRepository";
import { ICreditPaymentRepository, CreditPaymentFilters } from "@/repositories/credit-speciale/ICreditPaymentRepository";
import { ICreditPenaltyRepository } from "@/repositories/credit-speciale/ICreditPenaltyRepository";
import { ICreditInstallmentRepository } from "@/repositories/credit-speciale/ICreditInstallmentRepository";
import { IGuarantorRemunerationRepository, GuarantorRemunerationFilters } from "@/repositories/credit-speciale/IGuarantorRemunerationRepository";
import { IGuarantorPaymentRepository } from "@/repositories/credit-speciale/IGuarantorPaymentRepository";
import { createFile } from "@/db/upload-image.db";
import { IContractCIRepository } from "@/repositories/caisse-imprevu/IContractCIRepository";
import { IPaymentCIRepository } from "@/repositories/caisse-imprevu/IPaymentCIRepository";
import { IMemberRepository } from "@/repositories/members/IMemberRepository";
import { IDocumentRepository } from "@/domains/infrastructure/documents/repositories/IDocumentRepository";
import { RepositoryFactory } from "@/factories/RepositoryFactory";
import { getStorageInstance } from "@/firebase/storage";
import { ref, deleteObject } from "@/firebase/storage";
import { ServiceFactory } from "@/factories/ServiceFactory";
import { NotificationService } from "@/services/notifications/NotificationService";
import { EmergencyContact } from "@/schemas/emergency-contact.schema";
import { CreditFixeSimulationService } from "@/domains/financial/credit-speciale/fixe/simulation/services/CreditFixeSimulationService";
import {
    buildCreditSpecialeHistory,
    buildCreditPaymentId,
    getCreditContractCycles,
    getCreditPaymentCycleNumber,
    getCreditPaymentsForCurrentCycle,
    getCreditPaymentMonthNumber,
    getNextDueFromCreditSpecialeHistory,
} from "@/utils/credit-speciale-history";

export class CreditSpecialeService implements ICreditSpecialeService {
    readonly name = "CreditSpecialeService";
    private notificationService: NotificationService;
    private contractCIRepository: IContractCIRepository;
    private paymentCIRepository: IPaymentCIRepository;
    private memberRepository: IMemberRepository;
    private documentRepository: IDocumentRepository;
    private fixedSimulationService: CreditFixeSimulationService;

    private creditInstallmentRepository: ICreditInstallmentRepository;

    private buildContractSnapshotForCycle(contract: CreditContract, cycleNumber: number) {
        const cycle = getCreditContractCycles(contract).find((entry) => entry.cycleNumber === cycleNumber);

        if (!cycle) {
            return contract;
        }

        return {
            ...contract,
            amount: cycle.amount,
            interestRate: cycle.interestRate,
            monthlyPaymentAmount: cycle.monthlyPaymentAmount,
            totalAmount: cycle.totalAmount,
            duration: cycle.duration,
            firstPaymentDate: cycle.firstPaymentDate,
            restMonths: cycle.restMonths ?? [],
            customSchedule: cycle.customSchedule,
            fixedTransitionMode: cycle.fixedTransitionMode,
            fixedTransitionAt: cycle.fixedTransitionAt,
            fixedTransitionBy: cycle.fixedTransitionBy,
            fixedTransitionReason: cycle.fixedTransitionReason,
            fixedTransitionStartMonth: cycle.fixedTransitionStartMonth,
            createdAt: cycle.startedAt ?? contract.createdAt,
            creditCycles: undefined,
        };
    }

    private getPaymentsForCycle(
        contract: CreditContract,
        payments: CreditPayment[],
        cycleNumber: number
    ): CreditPayment[] {
        return payments.filter((existingPayment) => getCreditPaymentCycleNumber(contract, existingPayment) === cycleNumber);
    }

    private normalizeOptionalString(value?: string | null): string | undefined {
        if (typeof value !== 'string') {
            return undefined;
        }

        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : undefined;
    }

    private updateCurrentCycleDocuments(
        contract: CreditContract,
        docs: {
            contractUrl?: string;
            signedContractUrl?: string;
            signedContractPath?: string;
            signedContractDocumentId?: string;
        }
    ) {
        if (!contract.creditCycles || contract.creditCycles.length === 0) {
            return undefined;
        }

        const cycles = getCreditContractCycles(contract);
        const currentCycleNumber = cycles.at(-1)?.cycleNumber;
        if (!currentCycleNumber) {
            return undefined;
        }

        return cycles.map((cycle) =>
            cycle.cycleNumber === currentCycleNumber
                ? {
                    ...cycle,
                    contractUrl: docs.contractUrl ?? cycle.contractUrl,
                    signedContractUrl: docs.signedContractUrl ?? cycle.signedContractUrl,
                    signedContractPath: docs.signedContractPath ?? cycle.signedContractPath,
                    signedContractDocumentId: docs.signedContractDocumentId ?? cycle.signedContractDocumentId,
                }
                : cycle
        );
    }

    constructor(
        private creditDemandRepository: ICreditDemandRepository,
        private creditContractRepository: ICreditContractRepository,
        private creditPaymentRepository: ICreditPaymentRepository,
        private creditPenaltyRepository: ICreditPenaltyRepository,
        private guarantorRemunerationRepository: IGuarantorRemunerationRepository,
        private guarantorPaymentRepository: IGuarantorPaymentRepository
    ) {
        this.notificationService = ServiceFactory.getNotificationService();
        this.contractCIRepository = RepositoryFactory.getContractCIRepository();
        this.paymentCIRepository = RepositoryFactory.getPaymentCIRepository();
        this.memberRepository = RepositoryFactory.getMemberRepository();
        this.documentRepository = RepositoryFactory.getDocumentRepository();
        this.creditInstallmentRepository = RepositoryFactory.getCreditInstallmentRepository();
        this.fixedSimulationService = CreditFixeSimulationService.getInstance();
    }

    private getDemandIdPrefixByCreditType(creditType: CreditType): string {
        if (creditType === 'FIXE') {
            return 'MK_DEMANDE_CF';
        }
        if (creditType === 'AIDE') {
            return 'MK_DEMANDE_CA';
        }
        return 'MK_DEMANDE_CSP';
    }

    private getContractIdPrefixByCreditType(creditType: CreditType): string {
        if (creditType === 'FIXE') {
            return 'MK_CF';
        }
        if (creditType === 'AIDE') {
            return 'MK_CA';
        }
        return 'MK_CSP';
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

        // Générer l'ID au format: MK_DEMANDE_{PREFIX}_matricule_date_heure
        const demandPrefix = this.getDemandIdPrefixByCreditType(data.creditType);
        const customId = `${demandPrefix}_${matriculeFormatted}_${dateFormatted}_${timeFormatted}`;

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

    async updateDemandDetails(demandId: string, data: UpdateCreditDemandInput, adminId: string): Promise<CreditDemand | null> {
        const demand = await this.creditDemandRepository.getDemandById(demandId);
        if (!demand) return null;
        if (demand.status !== 'PENDING') {
            throw new Error('Seules les demandes en attente peuvent être modifiées');
        }
        return this.creditDemandRepository.updateDemand(demandId, {
            ...data,
            updatedBy: adminId,
        });
    }

    async deleteDemand(demandId: string): Promise<void> {
        const demand = await this.creditDemandRepository.getDemandById(demandId);
        if (!demand) {
            throw new Error('Demande introuvable');
        }
        if (demand.status !== 'PENDING') {
            throw new Error('Seules les demandes en attente peuvent être supprimées');
        }
        if (demand.contractId) {
            throw new Error('Impossible de supprimer une demande déjà liée à un contrat');
        }
        await this.creditDemandRepository.deleteDemand(demandId);
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
            amount: number;
            interestRate: number;
            monthlyPaymentAmount: number;
            duration: number;
            firstPaymentDate: Date;
            totalAmount: number;
            customSchedule?: Array<{ month: number; amount: number }>;
            emergencyContact?: EmergencyContact;
            guarantorRemunerationPercentage?: number;
            disbursementPaymentMode?: PaymentMode;
            disbursementWithFees?: boolean;
            disbursementLocation?: string;
            disbursementDate?: Date;
            disbursementPaymentMethodOther?: string;
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
        const shouldApplyGuarantorRemuneration = demand.creditType === 'SPECIALE';

        // La prochaine échéance d'un contrat nouvellement créé correspond au premier versement.
        const nextDueAt = new Date(simulationData.firstPaymentDate);
        const normalizedDuration = demand.creditType === 'SPECIALE'
            ? Math.min(Math.max(1, simulationData.duration), 7)
            : simulationData.duration;
        const initialAmountRemaining = demand.creditType === 'SPECIALE'
            ? Math.round(simulationData.amount + (simulationData.amount * simulationData.interestRate / 100))
            : simulationData.totalAmount;

        // Utiliser le score de la demande s'il existe, sinon calculer le score initial basé sur l'historique
        const initialScore = demand.score !== undefined && demand.score !== null
            ? demand.score
            : await this.calculateInitialScore(demand.clientId);

        // Générer l'ID personnalisé au format: MK_{PREFIX}_matricule_date_heure
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

        const contractPrefix = this.getContractIdPrefixByCreditType(demand.creditType);
        const customContractId = `${contractPrefix}_${matriculeFormatted}_${dateFormatted}_${timeFormatted}`;

        const contract: Omit<CreditContract, 'id' | 'createdAt' | 'updatedAt'> = {
            demandId: demand.id,
            clientId: demand.clientId,
            clientFirstName: demand.clientFirstName,
            clientLastName: demand.clientLastName,
            clientContacts: demand.clientContacts,
            creditType: demand.creditType,
            amount: simulationData.amount,
            interestRate: simulationData.interestRate,
            monthlyPaymentAmount: simulationData.monthlyPaymentAmount,
            totalAmount: simulationData.totalAmount,
            duration: normalizedDuration,
            ...(simulationData.customSchedule && simulationData.customSchedule.length > 0
                ? { customSchedule: simulationData.customSchedule }
                : {}),
            firstPaymentDate: simulationData.firstPaymentDate,
            nextDueAt,
            status: 'PENDING',
            amountPaid: 0,
            amountRemaining: initialAmountRemaining,
            score: initialScore,
            scoreUpdatedAt: new Date(),
            guarantorId: demand.guarantorId,
            guarantorFirstName: demand.guarantorFirstName,
            guarantorLastName: demand.guarantorLastName,
            guarantorRelation: demand.guarantorRelation,
            guarantorIsMember: demand.guarantorIsMember,
            guarantorIsParrain: shouldApplyGuarantorRemuneration ? guarantorIsParrain : false,
            guarantorRemunerationPercentage: shouldApplyGuarantorRemuneration
                ? (simulationData.guarantorRemunerationPercentage ?? (demand.guarantorIsMember ? 2 : 0))
                : 0,
            emergencyContact: simulationData.emergencyContact,
            disbursementPaymentMode: simulationData.disbursementPaymentMode,
            disbursementWithFees: simulationData.disbursementWithFees,
            disbursementLocation: simulationData.disbursementLocation,
            disbursementDate: simulationData.disbursementDate,
            disbursementPaymentMethodOther: simulationData.disbursementPaymentMethodOther,
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

    async recordRestMonth(creditId: string, monthNumber: number, reason: string, recordedBy: string, recordedByName: string): Promise<void> {
        const contract = await this.creditContractRepository.getContractById(creditId);
        if (!contract) {
            throw new Error('Contrat introuvable');
        }
        const existing = contract.restMonths ?? [];
        if (existing.some((r) => r.monthNumber === monthNumber)) {
            throw new Error(`Le mois ${monthNumber} est déjà enregistré comme mois de repos.`);
        }
        const newEntry = {
            monthNumber,
            reason: reason.trim(),
            recordedBy,
            recordedByName,
            recordedAt: new Date(),
        };
        const nextRestMonths = [...existing, newEntry];
        const payments = getCreditPaymentsForCurrentCycle(
            contract,
            await this.creditPaymentRepository.getPaymentsByCreditId(creditId)
        );
        const history = contract.creditType === 'SPECIALE'
            ? buildCreditSpecialeHistory({ ...contract, restMonths: nextRestMonths }, payments, {
                projectUntilZero: true,
            })
            : [];
        const nextDue = getNextDueFromCreditSpecialeHistory(history);
        const creditCycles = contract.creditCycles?.length
            ? contract.creditCycles.map((cycle, index, cycles) =>
                index === cycles.length - 1
                    ? { ...cycle, restMonths: nextRestMonths }
                    : cycle
            )
            : undefined;

        await this.creditContractRepository.updateContract(creditId, {
            creditCycles,
            restMonths: nextRestMonths,
            nextDueAt: nextDue?.date,
            amountRemaining: nextDue ? Math.round(nextDue.amountDue) : contract.amountRemaining,
            updatedBy: recordedBy,
        });
    }

    async deleteContract(id: string, adminId: string): Promise<void> {
        const contract = await this.creditContractRepository.getContractById(id);
        if (!contract) {
            throw new Error('Contrat introuvable');
        }
        const allowedStatuses: CreditContractStatus[] = ['DRAFT', 'PENDING'];
        if (!allowedStatuses.includes(contract.status)) {
            throw new Error('Seuls les contrats en brouillon ou en attente peuvent être supprimés');
        }
        if (contract.amountPaid > 0) {
            throw new Error('Impossible de supprimer un contrat pour lequel des versements ont été enregistrés');
        }

        // 1) Mise à jour de la demande liée (si demandId) — contractId à null pour permettre de recréer un contrat
        if (contract.demandId) {
            await this.creditDemandRepository.updateDemand(contract.demandId, {
                contractId: null,
                updatedBy: adminId,
                updatedAt: new Date(),
            } as unknown as Partial<Omit<CreditDemand, 'id' | 'createdAt'>>);
        }

        // 2) Cleanup Storage et documents (best effort)
        try {
            const documents = await this.documentRepository.getDocumentsByContractId(id);
            for (const doc of documents) {
                if (doc.path) {
                    try {
                        const storage = getStorageInstance();
                        const fileRef = ref(storage, doc.path);
                        await deleteObject(fileRef);
                    } catch (err) {
                        console.error(`Erreur suppression fichier Storage (path: ${doc.path}):`, err);
                    }
                }
                if (doc.id) {
                    try {
                        await this.documentRepository.deleteDocument(doc.id);
                    } catch (err) {
                        console.error(`Erreur suppression document (id: ${doc.id}):`, err);
                    }
                }
            }
        } catch (err) {
            console.error('Erreur lors du cleanup documents pour le contrat:', err);
        }

        // 3) Suppression du document contrat
        await this.creditContractRepository.deleteContract(id);
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
        if (creditType === 'FIXE') {
            const fixedResult = this.fixedSimulationService.calculateStandardSimulation({
                amount,
                interestRate,
                firstPaymentDate,
                targetMonths: 14,
            });

            return {
                amount: fixedResult.summary.amount,
                interestRate: fixedResult.summary.interestRate,
                monthlyPayment: fixedResult.summary.averageMonthlyPayment,
                firstPaymentDate: new Date(firstPaymentDate),
                duration: fixedResult.summary.duration,
                totalAmount: fixedResult.summary.totalAmount,
                isValid: fixedResult.isValid,
            };
        }

        if (creditType === 'AIDE') {
            if (interestRate > 5) {
                throw new Error('Le taux du crédit aide ne peut pas dépasser 5%');
            }

            const maxDuration = 3;
            const principal = Math.round(amount);
            const totalAmount = Math.round(principal + (principal * interestRate / 100));
            const monthlyPaymentAmount = Math.max(0, Math.round(monthlyPayment));

            if (monthlyPaymentAmount <= 0) {
                throw new Error('La mensualité doit être supérieure à 0');
            }

            let remaining = totalAmount;
            let duration = 0;

            for (let month = 0; month < maxDuration && remaining > 0; month++) {
                remaining = Math.max(0, remaining - monthlyPaymentAmount);
                duration += 1;
            }

            const isValid = remaining <= 0;

            return {
                amount: principal,
                interestRate,
                monthlyPayment: monthlyPaymentAmount,
                firstPaymentDate: new Date(firstPaymentDate),
                duration,
                totalAmount,
                isValid,
                ...(isValid ? {} : { suggestedMinimumAmount: remaining }),
            };
        }

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
        if (creditType === 'FIXE') {
            const fixedResult = this.fixedSimulationService.calculateCustomSimulation({
                amount,
                interestRate,
                firstPaymentDate,
                monthlyPayments,
            });

            return {
                amount: fixedResult.summary.amount,
                interestRate: fixedResult.summary.interestRate,
                monthlyPayments: fixedResult.schedule.map((row) => ({
                    month: row.month,
                    amount: row.payment,
                })),
                firstPaymentDate: new Date(firstPaymentDate),
                duration: fixedResult.summary.duration,
                totalAmount: fixedResult.summary.totalAmount,
                isValid: fixedResult.isValid,
                ...(fixedResult.summary.remaining > 0
                    ? { suggestedMinimumAmount: fixedResult.summary.remaining }
                    : {}),
            };
        }

        if (creditType === 'AIDE') {
            if (interestRate > 5) {
                throw new Error('Le taux du crédit aide ne peut pas dépasser 5%');
            }

            const maxDuration = 3;
            const normalizedPayments = monthlyPayments.map((payment, index) => ({
                month: index + 1,
                amount: Math.max(0, Math.round(payment.amount)),
            }));
            const duration = normalizedPayments.length;
            const totalAmount = Math.round(amount + (amount * interestRate / 100));
            const totalPlanned = normalizedPayments.reduce((sum, payment) => sum + payment.amount, 0);
            const remaining = Math.max(0, totalAmount - totalPlanned);
            const isValid = duration <= maxDuration && remaining <= 0;

            return {
                amount: Math.round(amount),
                interestRate,
                monthlyPayments: normalizedPayments,
                firstPaymentDate: new Date(firstPaymentDate),
                duration,
                totalAmount,
                isValid,
                ...(remaining > 0 ? { suggestedMinimumAmount: remaining } : {}),
            };
        }

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
        if (creditType === 'FIXE') {
            if (duration > 14) {
                throw new Error('La durée maximum est de 14 mois pour un crédit fixe');
            }

            const principal = Math.round(amount);
            const totalAmount = Math.round(principal + (principal * interestRate / 100));

            return {
                amount: principal,
                interestRate,
                monthlyPayment: Math.round(totalAmount / duration),
                firstPaymentDate: new Date(firstPaymentDate),
                duration,
                totalAmount,
                isValid: true,
            };
        }

        if (creditType === 'AIDE') {
            if (duration > 3) {
                throw new Error('La durée maximum est de 3 mois pour un crédit aide');
            }
            if (interestRate > 5) {
                throw new Error('Le taux du crédit aide ne peut pas dépasser 5%');
            }

            const principal = Math.round(amount);
            const totalAmount = Math.round(principal + (principal * interestRate / 100));

            return {
                amount: principal,
                interestRate,
                monthlyPayment: Math.ceil(totalAmount / duration),
                firstPaymentDate: new Date(firstPaymentDate),
                duration,
                totalAmount,
                isValid: true,
            };
        }

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
        // Fast path: lire le matricule depuis l'ID de contrat (ex: MK_CSP_7425_...)
        // Fallback: lire le membre si le format ne permet pas l'extraction.
        let matriculePart = '';
        const idMatriculeMatch = contract.id.match(/^MK_[A-Z_]+_(\d{3,})/)
        if (idMatriculeMatch?.[1]) {
            matriculePart = idMatriculeMatch[1]
        } else {
            const member = await this.memberRepository.getMemberById(contract.clientId);
            if (!member || !member.matricule) {
                throw new Error('Membre non trouvé ou matricule manquant');
            }
            matriculePart = member.matricule.split('.')[0] || member.matricule.replace(/[^0-9]/g, '').slice(0, 4);
        }
        const matriculeFormatted = matriculePart.padStart(4, '0');
        
        // Format: MK_PAIEMENT_{TYPE}_matricule_date_heure
        const paymentPrefix = contract.creditType === 'FIXE'
            ? 'MK_PAIEMENT_CF'
            : contract.creditType === 'AIDE'
                ? 'MK_PAIEMENT_CA'
                : 'MK_PAIEMENT_CSP';
        const reference = `${paymentPrefix}_${matriculeFormatted}_${dateFormatted}_${timeFormatted}`;

        // Upload de la preuve si fournie
        let proofUrl: string | undefined = data.proofUrl;
        if (proofFile) {
            try {
                const { url } = await this.documentRepository.uploadDocumentFile(
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
        const realPayments = getCreditPaymentsForCurrentCycle(contract, allPayments).filter(p => 
            p.amount > 0 || 
            p.comment?.includes('Paiement de pénalités uniquement') ||
            p.comment?.includes('Paiement de 0 FCFA')
        );
        
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

        const isSimpleCredit = contract.creditType === 'FIXE' || contract.creditType === 'AIDE';
        const monthlyRate = contract.interestRate / 100;
        const sortedPayments = [...realPayments].sort((a, b) => 
            new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime()
        );

        // Calculer combien d'intérêts et de principal sont payés par ce paiement
        // Un paiement de 0 FCFA peut être soit un paiement de pénalités uniquement, soit un paiement de 0 FCFA normal
        const isPenaltyOnlyPayment = data.amount === 0 && data.comment?.includes('Paiement de pénalités uniquement');
        const isZeroPayment = data.amount === 0 && (data.comment?.includes('Paiement de 0 FCFA') || isPenaltyOnlyPayment);
        const paymentAmount = isZeroPayment ? 0 : data.amount;

        let remaining = contract.amount;
        let interestBeforePayment = 0;
        let totalWithInterest = contract.amount;

        if (isSimpleCredit) {
            const totalPaidBefore = sortedPayments.reduce((sum, existingPayment) => sum + existingPayment.amount, 0);
            remaining = Math.max(0, contract.totalAmount - totalPaidBefore);
            totalWithInterest = remaining;
        } else {
            const historyBeforePayment = buildCreditSpecialeHistory(contract, realPayments, {
                endMonth: monthNumber,
                projectUntilZero: false,
            });
            const monthHistory = historyBeforePayment.find((month) => month.month === monthNumber);

            if (!monthHistory) {
                throw new Error(`Impossible de reconstruire l'échéance M${monthNumber} pour ce contrat`);
            }

            remaining = monthHistory.capitalStart;
            interestBeforePayment = monthHistory.interest;
            totalWithInterest = monthHistory.amountDue;
        }
        
        // Payer d'abord les intérêts, puis le principal (simple crédit: tout en principal)
        const interestPart = isSimpleCredit ? 0 : Math.min(paymentAmount, interestBeforePayment);
        const principalPart = isSimpleCredit
            ? Math.min(paymentAmount, totalWithInterest)
            : Math.max(0, paymentAmount - interestPart);
        
        // Générer l'ID personnalisé au format M{mois}_{idContrat}
        // Utiliser l'ID complet du contrat
        const customPaymentId = buildCreditPaymentId(contract, monthNumber);
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
            const penalties = await this.creditPenaltyRepository.getPenaltiesByCreditId(contract.id);
            const targetPenalties = penalties.filter((penalty) => penaltyIds.includes(penalty.id) && !penalty.paid);
            totalPenaltyAmount = targetPenalties.reduce((sum, penalty) => sum + penalty.amount, 0);

            await Promise.all(
                targetPenalties.map((penalty) =>
                    this.creditPenaltyRepository.updatePenalty(penalty.id, {
                        paid: true,
                        paidAt: new Date(),
                        paymentId: payment.id,
                        updatedBy: data.createdBy,
                    })
                )
            );

            // Mettre à jour le paiement avec le montant des pénalités
            if (totalPenaltyAmount > 0) {
                await this.creditPaymentRepository.updatePayment(payment.id, {
                    penaltyAmount: totalPenaltyAmount,
                });
            }
        }

        // Recalculer le montant total payé et restant à partir du snapshot local + paiement courant
        // (évite une requête Firestore complète supplémentaire)
        const mergedPayments = [...allPayments.filter((existingPayment) => existingPayment.id !== payment.id), payment];
        const updatedRealPayments = getCreditPaymentsForCurrentCycle(contract, mergedPayments).filter(p => 
            p.amount > 0 || 
            p.comment?.includes('Paiement de pénalités uniquement') ||
            p.comment?.includes('Paiement de 0 FCFA')
        );
        
        // Recalculer le reste dû avec tous les paiements
        let calculatedRemaining = contract.amount;
        const recalculatedPayments = [...updatedRealPayments].sort((a, b) => 
            new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime()
        );
        const totalPaid = updatedRealPayments.reduce((sum, p) => sum + p.amount, 0);

        let totalRemaining = 0;
        let nextDueAt: Date | undefined;
        if (isSimpleCredit) {
            calculatedRemaining = Math.max(0, contract.totalAmount - totalPaid);
            totalRemaining = calculatedRemaining;
            nextDueAt = calculatedRemaining > 0
                ? (() => {
                    const lastPaymentDate = recalculatedPayments.length > 0 
                        ? new Date(recalculatedPayments[recalculatedPayments.length - 1].paymentDate)
                        : new Date(contract.firstPaymentDate);
                    const nextDue = new Date(lastPaymentDate);
                    nextDue.setMonth(nextDue.getMonth() + 1);
                    return nextDue;
                })()
                : undefined;
        } else {
            const updatedHistory = buildCreditSpecialeHistory(contract, updatedRealPayments, {
                projectUntilZero: true,
            });
            const nextDue = getNextDueFromCreditSpecialeHistory(updatedHistory);

            calculatedRemaining = nextDue ? nextDue.capitalStart : 0;
            totalRemaining = nextDue ? nextDue.amountDue : 0;
            nextDueAt = nextDue?.date;
        }
        
        let newStatus = contract.status;
        if (totalRemaining <= 0 || calculatedRemaining <= 0) {
            newStatus = 'DISCHARGED';
        } else if (totalPaid > 0) {
            newStatus = 'PARTIAL';
        }

        const shouldTransformAideToSpeciale = contract.creditType === 'AIDE'
            && monthNumber >= 3
            && totalRemaining > 0;

        if (shouldTransformAideToSpeciale) {
            newStatus = 'TRANSFORMED';
        }

        await this.creditContractRepository.updateContract(contract.id, {
            amountPaid: totalPaid,
            amountRemaining: Math.round(totalRemaining),
            status: newStatus,
            nextDueAt: shouldTransformAideToSpeciale ? undefined : nextDueAt,
            ...(shouldTransformAideToSpeciale ? {
                transformedAt: new Date(),
                blockedReason: `Crédit aide arrivé au terme de 3 mois. Solde restant à transformer en crédit spéciale : ${Math.round(totalRemaining).toLocaleString('fr-FR')} FCFA.`,
            } : {}),
            updatedBy: data.createdBy,
        });

        void (async () => {
            // Calculer et créer les pénalités si nécessaire (basé sur les paiements, pas les installments)
            // Ne pas créer de pénalités pour les paiements de 0 FCFA
            if (!isZeroPayment && paymentAmount > 0) {
                try {
                    await this.checkAndCreatePenalties(contract.id, payment);
                } catch {
                    // Erreur non bloquante
                }
            }

            // Calculer le score en arrière-plan puis persister
            if (!isPenaltyOnlyPayment) {
                try {
                    const oldScore = contract.score || 5;
                    const newScore = await this.calculateScore(contract.id, payment);
                    const scoreVariation = newScore - oldScore;

                    await this.creditContractRepository.updateContract(contract.id, {
                        score: newScore,
                        scoreUpdatedAt: new Date(),
                        updatedBy: data.createdBy,
                    });

                    // Alerte score si variation forte (>= 2 points ou <= -2 points)
                    if (Math.abs(scoreVariation) >= 2) {
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
                    }
                } catch {
                    // Erreur score/notification non bloquante
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
                    // Erreur notification non bloquante
                }
            }

            if (shouldTransformAideToSpeciale && contract.status !== 'TRANSFORMED') {
                try {
                    await this.notificationService.createNotification({
                        module: 'credit_speciale',
                        entityId: contract.id,
                        type: 'contract_finished',
                        title: 'Crédit aide à transformer',
                        message: `Le crédit aide de ${contract.clientFirstName} ${contract.clientLastName} a atteint 3 mois avec un solde restant de ${Math.round(totalRemaining).toLocaleString('fr-FR')} FCFA. Créez un contrat de crédit spéciale pour ce solde.`,
                        metadata: {
                            contractId: contract.id,
                            clientId: contract.clientId,
                            creditType: contract.creditType,
                            remainingAmount: Math.round(totalRemaining),
                            actionRequired: 'transform_to_speciale',
                        },
                    });
                } catch {
                    // Erreur notification non bloquante
                }
            }

            // Calculer et créer la rémunération du garant si applicable
            if (contract.creditType === 'SPECIALE' &&
                contract.guarantorIsMember &&
                contract.guarantorId &&
                contract.guarantorRemunerationPercentage > 0) {
                const month = getCreditPaymentMonthNumber(contract, payment);
                const historyBeforeCurrentPayment = buildCreditSpecialeHistory(contract, realPayments, {
                    endMonth: month,
                    projectUntilZero: false,
                });
                const monthHistory = historyBeforeCurrentPayment.find((entry) => entry.month === month);

                if (monthHistory && !monthHistory.isRest && monthHistory.phase === 'SPECIALE') {
                    const remunerationAmount = Math.round(
                        (monthHistory.capitalStart * contract.guarantorRemunerationPercentage) / 100
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

                        void this.notificationService.createNotification({
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
                        }).catch(() => {
                            // Erreur notification non bloquante
                        });
                    }
                }
            }

            // Générer automatiquement le reçu PDF en arrière-plan (non bloquant pour le formulaire)
            try {
                const receiptUrl = await this.generatePaymentReceiptPDF(payment, contract);
                if (receiptUrl) {
                    await this.creditPaymentRepository.updatePayment(payment.id, {
                        receiptUrl,
                    });
                }
            } catch {
                // Ne pas faire échouer la création du paiement si le reçu échoue
            }
        })();

        return payment;
    }

    /**
     * Met à jour un paiement existant (date, heure, montant, mode, preuve optionnelle) avec motif de modification.
     */
    async updatePayment(
        paymentId: string,
        data: { paymentDate?: Date; paymentTime?: string; amount?: number; mode?: import('@/types/types').CreditPaymentMode; comment?: string; note?: number; withFees?: boolean; agentRecouvrementId?: string },
        proofFile: File | undefined,
        modificationReason: string,
        userId: string
    ): Promise<CreditPayment> {
        const payment = await this.creditPaymentRepository.getPaymentById(paymentId);
        if (!payment) throw new Error('Paiement introuvable');
        const contract = await this.creditContractRepository.getContractById(payment.creditId);
        if (!contract) throw new Error('Contrat introuvable');

        let proofUrl: string | undefined = payment.proofUrl;
        if (proofFile) {
            const { url } = await this.documentRepository.uploadDocumentFile(
                proofFile,
                contract.clientId,
                'CREDIT_SPECIALE_RECEIPT'
            );
            proofUrl = url;
        }

        const payload: Partial<CreditPayment> = {
            ...(data.paymentDate != null && { paymentDate: data.paymentDate instanceof Date ? data.paymentDate : new Date(data.paymentDate) }),
            ...(data.paymentTime != null && { paymentTime: data.paymentTime }),
            ...(data.amount != null && { amount: data.amount }),
            ...(data.mode != null && { mode: data.mode }),
            ...(data.comment != null && { comment: data.comment }),
            ...(data.note != null && { note: data.note }),
            ...(data.withFees !== undefined && { withFees: data.withFees }),
            ...(data.agentRecouvrementId !== undefined && { agentRecouvrementId: data.agentRecouvrementId?.trim() || undefined }),
            ...(proofUrl != null && { proofUrl }),
            updatedBy: userId,
            modificationReason,
        };

        const updated = await this.creditPaymentRepository.updatePayment(paymentId, payload);
        if (!updated) throw new Error('Échec de la mise à jour du paiement');
        return updated;
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
                airtel_money: 'Airtel Money',
                mobicash: 'Mobicash',
                cash: 'Espèce',
                bank_transfer: 'Virement bancaire',
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
        const contract = await this.creditContractRepository.getContractById(creditId);
        if (!contract) {
            return;
        }

        // Ignorer les paiements de 0 FCFA (pénalités uniquement ou paiement de 0)
        if (payment.amount === 0 && (
            payment.comment?.includes('Paiement de pénalités uniquement') ||
            payment.comment?.includes('Paiement de 0 FCFA')
        )) {
            return;
        }

        const cycleNumber = getCreditPaymentCycleNumber(contract, payment);
        const cycleContract = this.buildContractSnapshotForCycle(contract, cycleNumber);
        const monthNumber = getCreditPaymentMonthNumber(cycleContract, payment);

        // Calculer la date prévue de l'échéance pour ce mois
        const firstPaymentDate = new Date(cycleContract.firstPaymentDate);
        const dueDate = new Date(firstPaymentDate);
        dueDate.setMonth(dueDate.getMonth() + monthNumber - 1);
        dueDate.setHours(0, 0, 0, 0);

        // Date de paiement
        const paymentDate = new Date(payment.paymentDate);
        paymentDate.setHours(0, 0, 0, 0);

        // Ne pas créer de pénalité pour un mois de repos
        const restMonths = cycleContract.restMonths ?? [];
        if (restMonths.some((r) => r.monthNumber === monthNumber)) {
            return;
        }

        // Calculer le nombre de jours de retard
        // Si datePaiement <= dateEcheancierActuel → pas de pénalité
        // Si datePaiement > dateEcheancierActuel → pénalité
        const daysLate = Math.floor((paymentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

        // Tolérance de 3 jours : pas de pénalité si retard ≤ 3 jours. Au-delà, règle de 3.
        if (daysLate <= 3) {
            return;
        }

        const allPayments = await this.getPaymentsByCreditId(creditId);
        const cyclePayments = this.getPaymentsForCycle(contract, allPayments, cycleNumber);
        const paymentsBeforeCurrent = cyclePayments.filter((existingPayment) => existingPayment.id !== payment.id);
        const history = cycleContract.creditType === 'SPECIALE'
            ? buildCreditSpecialeHistory(cycleContract, paymentsBeforeCurrent, {
                endMonth: monthNumber,
                projectUntilZero: false,
            })
            : [];
        const monthHistory = history.find((month) => month.month === monthNumber);
        const penaltyBase = cycleContract.creditType === 'SPECIALE'
            ? (monthHistory?.interest ?? payment.interestAmount ?? 0)
            : (payment.interestAmount ?? 0);

        const penaltyAmount = await this.calculatePenalties(creditId, daysLate, penaltyBase);
        if (penaltyAmount <= 0) {
            return;
        }

        const existingPenalties = await this.getPenaltiesByCreditId(creditId);
        const existingPenalty = existingPenalties.find((penalty) => {
            const penaltyDueDate = new Date(penalty.dueDate);
            penaltyDueDate.setHours(0, 0, 0, 0);
            return Math.abs(penaltyDueDate.getTime() - dueDate.getTime()) < 24 * 60 * 60 * 1000 && !penalty.paid;
        });

        if (existingPenalty) {
            return;
        }

        const penalty = await this.createPenalty({
            creditId,
            installmentId: '',
            amount: Math.round(penaltyAmount),
            daysLate,
            dueDate,
            paid: false,
            reported: false,
            createdBy: payment.createdBy,
            updatedBy: payment.createdBy,
        });

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

    async calculatePenalties(creditId: string, daysLate: number, interestAmountBase: number): Promise<number> {
        // Règle métier officielle : pénalité = intérêt du mois * jours de retard / 30
        return (interestAmountBase * daysLate) / 30;
    }

    /**
     * Vérifie et crée les pénalités manquantes pour tous les paiements en retard
     * en appliquant la formule métier officielle sur l'intérêt du mois.
     */
    async checkAndCreateMissingPenalties(creditId: string): Promise<void> {
        const contractExists = await this.creditContractRepository.getContractById(creditId);
        if (!contractExists) {
            return;
        }

        // Récupérer tous les paiements
        const allPayments = await this.getPaymentsByCreditId(creditId);

        const realPayments = allPayments
            .filter(p => p.amount > 0 || !p.comment?.includes('Paiement de pénalités uniquement'));

        for (const payment of realPayments) {
            try {
                await this.checkAndCreatePenalties(creditId, payment);
            } catch (error) {
                console.error('[checkAndCreateMissingPenalties] Erreur lors de la vérification d\'un paiement:', error);
            }
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

    async payPenalty(
        penaltyId: string,
        data: {
            paymentDate: Date;
            paymentTime: string;
            amount: number;
            mode: CreditPaymentMode;
            withFees?: boolean;
            agentRecouvrementId?: string;
            comment?: string;
        },
        proofFile: File | undefined,
        adminId: string
    ): Promise<CreditPenalty> {
        const penalty = await this.creditPenaltyRepository.getPenaltyById(penaltyId);
        if (!penalty) {
            throw new Error('Pénalité introuvable');
        }
        if (penalty.paid) {
            throw new Error('Cette pénalité est déjà payée');
        }

        const expectedAmount = Math.round(penalty.amount);
        const receivedAmount = Math.round(data.amount);
        if (receivedAmount !== expectedAmount) {
            throw new Error('Le montant de la pénalité est fixe et ne peut pas être modifié');
        }

        if ((data.mode === 'airtel_money' || data.mode === 'mobicash') && data.withFees === undefined) {
            throw new Error('Veuillez préciser si le paiement mobile money est avec frais ou sans frais');
        }

        const contract = await this.creditContractRepository.getContractById(penalty.creditId);
        if (!contract) {
            throw new Error('Contrat introuvable');
        }

        let proofUrl: string | undefined;
        let proofPath: string | undefined;
        if (proofFile) {
            if (!proofFile.type.startsWith('image/')) {
                throw new Error('La preuve de paiement de pénalité doit être une image');
            }
            const uploadResult = await this.documentRepository.uploadDocumentFile(
                proofFile,
                contract.clientId,
                'CREDIT_SPECIALE_RECEIPT'
            );
            proofUrl = uploadResult.url;
            proofPath = uploadResult.path;
        }

        const paidAt = data.paymentDate instanceof Date ? new Date(data.paymentDate) : new Date(data.paymentDate);
        const [hours, minutes] = data.paymentTime.split(':').map((value) => parseInt(value, 10));
        paidAt.setHours(Number.isFinite(hours) ? hours : 0, Number.isFinite(minutes) ? minutes : 0, 0, 0);

        const updatedPenalty = await this.creditPenaltyRepository.updatePenalty(penaltyId, {
            paid: true,
            paidAt,
            paymentTime: data.paymentTime,
            paymentMode: data.mode,
            withFees: data.mode === 'airtel_money' || data.mode === 'mobicash' ? data.withFees : undefined,
            agentRecouvrementId: data.agentRecouvrementId?.trim() || undefined,
            proofUrl,
            proofPath,
            paymentComment: data.comment?.trim() || undefined,
            paymentRecordedBy: adminId,
            paymentRecordedAt: new Date(),
            paymentUpdatedBy: adminId,
            paymentUpdatedAt: new Date(),
            updatedBy: adminId,
        });

        if (!updatedPenalty) {
            throw new Error('Impossible de mettre à jour la pénalité');
        }

        return updatedPenalty;
    }

    async updatePenaltyPayment(
        penaltyId: string,
        data: {
            paymentDate: Date;
            paymentTime: string;
            amount: number;
            mode: CreditPaymentMode;
            withFees?: boolean;
            agentRecouvrementId?: string;
            comment?: string;
        },
        proofFile: File | undefined,
        adminId: string
    ): Promise<CreditPenalty> {
        const penalty = await this.creditPenaltyRepository.getPenaltyById(penaltyId);
        if (!penalty) {
            throw new Error('Pénalité introuvable');
        }
        if (!penalty.paid) {
            throw new Error('Cette pénalité doit être payée avant d’être modifiée');
        }

        const expectedAmount = Math.round(penalty.amount);
        const receivedAmount = Math.round(data.amount);
        if (receivedAmount !== expectedAmount) {
            throw new Error('Le montant de la pénalité est fixe et ne peut pas être modifié');
        }

        if ((data.mode === 'airtel_money' || data.mode === 'mobicash') && data.withFees === undefined) {
            throw new Error('Veuillez préciser si le paiement mobile money est avec frais ou sans frais');
        }

        const contract = await this.creditContractRepository.getContractById(penalty.creditId);
        if (!contract) {
            throw new Error('Contrat introuvable');
        }

        let proofUrl = penalty.proofUrl;
        let proofPath = penalty.proofPath;
        if (proofFile) {
            if (!proofFile.type.startsWith('image/')) {
                throw new Error('La preuve de paiement de pénalité doit être une image');
            }
            const uploadResult = await this.documentRepository.uploadDocumentFile(
                proofFile,
                contract.clientId,
                'CREDIT_SPECIALE_RECEIPT'
            );
            proofUrl = uploadResult.url;
            proofPath = uploadResult.path;

            if (penalty.proofPath && penalty.proofPath !== proofPath) {
                try {
                    await this.documentRepository.deleteFile(penalty.proofPath);
                } catch {
                    // Si l'ancienne preuve n'est pas supprimable, on conserve tout de même la mise à jour métier.
                }
            }
        }

        const paidAt = data.paymentDate instanceof Date ? new Date(data.paymentDate) : new Date(data.paymentDate);
        const [hours, minutes] = data.paymentTime.split(':').map((value) => parseInt(value, 10));
        paidAt.setHours(Number.isFinite(hours) ? hours : 0, Number.isFinite(minutes) ? minutes : 0, 0, 0);

        const updatedPenalty = await this.creditPenaltyRepository.updatePenalty(penaltyId, {
            paidAt,
            paymentTime: data.paymentTime,
            paymentMode: data.mode,
            withFees: data.mode === 'airtel_money' || data.mode === 'mobicash' ? data.withFees : false,
            agentRecouvrementId: data.agentRecouvrementId?.trim() || '',
            proofUrl,
            proofPath,
            paymentComment: data.comment?.trim() || '',
            paymentUpdatedBy: adminId,
            paymentUpdatedAt: new Date(),
            updatedBy: adminId,
        });

        if (!updatedPenalty) {
            throw new Error('Impossible de modifier le paiement de la pénalité');
        }

        return updatedPenalty;
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

    async recordGuarantorPayment(
        creditId: string,
        data: { paymentDate: Date; paymentTime: string; amount: number; mode: GuarantorPayment['mode']; reference?: string; comment?: string },
        proofFile: File | undefined,
        adminId: string
    ): Promise<GuarantorPayment> {
        const contract = await this.creditContractRepository.getContractById(creditId);
        if (!contract) throw new Error('Contrat introuvable');
        if (!contract.guarantorId) throw new Error('Ce contrat n\'a pas de garant');
        if (contract.creditType !== 'SPECIALE') throw new Error('Le paiement au garant ne s\'applique qu\'aux contrats crédit spéciale');
        if (data.amount <= 0) throw new Error('Le montant doit être strictement positif');

        let proofUrl: string | undefined;
        let proofPath: string | undefined;
        if (proofFile) {
            const location = `credit/${creditId}/guarantor-payments`;
            const { url, path } = await createFile(proofFile, creditId, location);
            proofUrl = url;
            proofPath = path;
        }

        return this.guarantorPaymentRepository.createPayment({
            creditId,
            guarantorId: contract.guarantorId,
            paymentDate: data.paymentDate instanceof Date ? data.paymentDate : new Date(data.paymentDate),
            paymentTime: data.paymentTime,
            amount: data.amount,
            mode: data.mode,
            proofUrl,
            proofPath,
            reference: data.reference,
            comment: data.comment,
            createdBy: adminId,
        });
    }

    async getGuarantorPaymentsByCreditId(creditId: string): Promise<GuarantorPayment[]> {
        return this.guarantorPaymentRepository.getPaymentsByCreditId(creditId);
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
            const updatedCycles = this.updateCurrentCycleDocuments(contract, { contractUrl: url });
            await this.creditContractRepository.updateContract(contractId, {
                contractUrl: url,
                creditCycles: updatedCycles,
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
        const document = await this.documentRepository.createDocument({
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

        const updatedCycles = this.updateCurrentCycleDocuments(contract, {
            signedContractUrl: url,
            signedContractPath: path,
            signedContractDocumentId: document.id,
        });

        // Mettre à jour le contrat avec l'URL, le chemin et l'ID document du contrat signé, et activer le contrat
        const updatedContract = await this.creditContractRepository.updateContract(contractId, {
            signedContractUrl: url,
            signedContractPath: path,
            signedContractDocumentId: document.id,
            creditCycles: updatedCycles,
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

    /**
     * Remplace le contrat signé déjà téléversé par un nouveau PDF.
     * Interdit si statut DISCHARGED ou CLOSED. Cleanup ancien fichier/document (best effort).
     */
    async replaceSignedContract(contractId: string, file: File, adminId: string): Promise<CreditContract> {
        const contract = await this.creditContractRepository.getContractById(contractId);
        if (!contract) {
            throw new Error('Contrat introuvable');
        }
        if (['DISCHARGED', 'CLOSED'].includes(contract.status)) {
            throw new Error('Contrat clôturé : remplacement interdit');
        }
        if (!contract.signedContractUrl) {
            throw new Error('Aucun contrat signé à remplacer');
        }

        // 1) Cleanup ancien fichier et document (best effort)
        if (contract.signedContractPath) {
            try {
                const storage = getStorageInstance();
                const fileRef = ref(storage, contract.signedContractPath);
                await deleteObject(fileRef);
            } catch (err) {
                console.error('Erreur suppression ancien fichier Storage (signedContractPath):', err);
            }
        }
        if (contract.signedContractDocumentId) {
            try {
                await this.documentRepository.deleteDocument(contract.signedContractDocumentId);
            } catch (err) {
                console.error('Erreur suppression ancien document:', err);
            }
        }

        // 2) Upload nouveau fichier
        const { url, path } = await this.documentRepository.uploadDocumentFile(
            file,
            contract.clientId,
            'CREDIT_SPECIALE_CONTRACT_SIGNED'
        );

        // 3) Créer nouvelle entrée document
        const doc = await this.documentRepository.createDocument({
            type: 'CREDIT_SPECIALE_CONTRACT_SIGNED',
            format: 'pdf',
            libelle: `Contrat signé crédit ${contract.creditType}`,
            path,
            url,
            size: file.size,
            memberId: contract.clientId,
            contractId: contract.id,
            createdBy: adminId,
            updatedBy: adminId,
        });

        const updatedCycles = this.updateCurrentCycleDocuments(contract, {
            signedContractUrl: url,
            signedContractPath: path,
            signedContractDocumentId: doc.id,
        });

        // 4) Mettre à jour le contrat (sans changer le statut)
        const updatedContract = await this.creditContractRepository.updateContract(contractId, {
            signedContractUrl: url,
            signedContractPath: path,
            signedContractDocumentId: doc.id,
            creditCycles: updatedCycles,
            updatedBy: adminId,
            updatedAt: new Date(),
        });

        if (!updatedContract) {
            throw new Error('Erreur lors de la mise à jour du contrat');
        }
        return updatedContract;
    }

    // ==================== CLÔTURE DE CONTRAT ====================

    /**
     * Valide le remboursement final (décharge) - Phase 1
     * Précondition : montant restant = 0 (calculé à partir des paiements réels)
     */
    async validateDischarge(contractId: string, motif: string, adminId: string): Promise<CreditContract> {
        const contract = await this.creditContractRepository.getContractById(contractId);
        if (!contract) {
            throw new Error('Contrat introuvable');
        }
        
        // Calculer le montant restant réel à partir des paiements (même logique que l'UI)
        const payments = await this.creditPaymentRepository.getPaymentsByCreditId(contractId);
        const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
        
        // Calculer le montant total à rembourser (capital + intérêts)
        const interestRate = contract.interestRate || 10;
        const totalInterest = (contract.amount * interestRate) / 100;
        const totalAmountToRepay = contract.amount + totalInterest;
        
        const realRemainingAmount = totalAmountToRepay - totalPaid;
        
        // Tolérance de 0.1 pour les erreurs d'arrondi (même que l'UI)
        if (realRemainingAmount > 0.1) {
            throw new Error(`Le montant restant doit être 0 pour valider le remboursement final (reste: ${Math.round(realRemainingAmount).toLocaleString('fr-FR')} FCFA)`);
        }
        if (!motif || motif.trim().length < 10 || motif.trim().length > 500) {
            throw new Error('Le motif doit contenir entre 10 et 500 caractères');
        }

        const updatedContract = await this.creditContractRepository.updateContract(contractId, {
            status: 'DISCHARGED',
            dischargeMotif: motif.trim(),
            dischargedAt: new Date(),
            dischargedBy: adminId,
            updatedBy: adminId,
        });

        if (!updatedContract) {
            throw new Error('Erreur lors de la mise à jour du contrat');
        }

        return updatedContract;
    }

    /**
     * Génère et enregistre la quittance remplie - Phase 2
     * Le PDF est généré côté client et passé en paramètre
     */
    async generateQuittancePDF(contractId: string, pdfFile: File): Promise<{ url: string; documentId: string }> {
        const contract = await this.creditContractRepository.getContractById(contractId);
        if (!contract) {
            throw new Error('Contrat introuvable');
        }

        const { url, path, size } = await this.documentRepository.uploadDocumentFile(
            pdfFile,
            contract.clientId,
            'CREDIT_SPECIALE_QUITTANCE'
        );

        const document = await this.documentRepository.createDocument({
            type: 'CREDIT_SPECIALE_QUITTANCE',
            format: 'pdf',
            libelle: `Quittance crédit ${contract.creditType} - ${contract.clientFirstName} ${contract.clientLastName}`,
            path,
            url,
            size,
            memberId: contract.clientId,
            contractId: contract.id,
            createdBy: contract.createdBy,
            updatedBy: contract.createdBy,
        });

        return {
            url,
            documentId: document.id || '',
        };
    }

    /**
     * Téléverse la quittance signée par le membre - Phase 3
     * Enregistre aussi les données du remboursement final (moyen de paiement, date/heure, commentaire).
     */
    async uploadSignedQuittance(contractId: string, file: File, adminId: string, data: SignedQuittanceUploadData): Promise<CreditContract> {
        const contract = await this.creditContractRepository.getContractById(contractId);
        if (!contract) {
            throw new Error('Contrat introuvable');
        }

        if (file.type !== 'application/pdf') {
            throw new Error('Le fichier doit être un PDF');
        }
        const maxSize = 5 * 1024 * 1024; // 5 MB
        if (file.size > maxSize) {
            throw new Error('Le fichier ne doit pas dépasser 5 MB');
        }

        const { url, path, size } = await this.documentRepository.uploadDocumentFile(
            file,
            contract.clientId,
            'CREDIT_SPECIALE_QUITTANCE_SIGNED'
        );

        const document = await this.documentRepository.createDocument({
            type: 'CREDIT_SPECIALE_QUITTANCE_SIGNED',
            format: 'pdf',
            libelle: `Quittance signée crédit ${contract.creditType} - ${contract.clientFirstName} ${contract.clientLastName}`,
            path,
            url,
            size,
            memberId: contract.clientId,
            contractId: contract.id,
            createdBy: adminId,
            updatedBy: adminId,
        });

        const [y, m, d] = data.repaidAtDate.split('-').map(Number);
        const [h, min] = data.repaidAtTime.split(':').map(Number);
        const finalRepaymentRepaidAt = new Date(y, m - 1, d, h, min, 0, 0);

        const updatedContract = await this.creditContractRepository.updateContract(contractId, {
            signedQuittanceUrl: url,
            signedQuittanceDocumentId: document.id,
            finalRepaymentPaymentMode: data.paymentMode,
            finalRepaymentWithFees: data.paymentMode === 'airtel_money' || data.paymentMode === 'mobicash' ? data.withFees : undefined,
            finalRepaymentMethodOther: data.paymentMode === 'other' ? (data.methodOther?.trim() ?? '') : undefined,
            finalRepaymentRepaidAt,
            finalRepaymentComment: data.comment?.trim() || undefined,
            updatedBy: adminId,
        });

        if (!updatedContract) {
            throw new Error('Erreur lors de la mise à jour du contrat');
        }

        return updatedContract;
    }

    /**
     * Remplace la quittance signée existante : supprime l'ancienne (Storage + document), téléverse la nouvelle,
     * met à jour les données remboursement final et enregistre l'admin + motif de modification.
     */
    async replaceSignedQuittance(
        contractId: string,
        file: File,
        adminId: string,
        adminDisplayName: string,
        data: SignedQuittanceUploadData,
        modificationMotif: string
    ): Promise<CreditContract> {
        const contract = await this.creditContractRepository.getContractById(contractId);
        if (!contract) {
            throw new Error('Contrat introuvable');
        }
        if (!contract.signedQuittanceUrl || !contract.signedQuittanceDocumentId) {
            throw new Error('Aucune quittance signée à remplacer');
        }
        if (file.type !== 'application/pdf') {
            throw new Error('Le fichier doit être un PDF');
        }
        const maxSize = 5 * 1024 * 1024; // 5 MB
        if (file.size > maxSize) {
            throw new Error('Le fichier ne doit pas dépasser 5 MB');
        }
        const trimmedMotif = modificationMotif?.trim() ?? '';
        if (trimmedMotif.length < 10 || trimmedMotif.length > 500) {
            throw new Error('Le motif de modification doit contenir entre 10 et 500 caractères');
        }

        const oldDocument = await this.documentRepository.getDocumentById(contract.signedQuittanceDocumentId);
        if (oldDocument?.path) {
            try {
                await this.documentRepository.deleteFile(oldDocument.path);
            } catch (err) {
                console.warn('Erreur suppression ancien fichier quittance Storage:', err);
            }
            try {
                await this.documentRepository.deleteDocument(contract.signedQuittanceDocumentId);
            } catch (err) {
                console.warn('Erreur suppression ancien document quittance:', err);
            }
        }

        const { url, path, size } = await this.documentRepository.uploadDocumentFile(
            file,
            contract.clientId,
            'CREDIT_SPECIALE_QUITTANCE_SIGNED'
        );

        const document = await this.documentRepository.createDocument({
            type: 'CREDIT_SPECIALE_QUITTANCE_SIGNED',
            format: 'pdf',
            libelle: `Quittance signée crédit ${contract.creditType} - ${contract.clientFirstName} ${contract.clientLastName}`,
            path,
            url,
            size,
            memberId: contract.clientId,
            contractId: contract.id,
            createdBy: adminId,
            updatedBy: adminId,
        });

        const [y, m, d] = data.repaidAtDate.split('-').map(Number);
        const [h, min] = data.repaidAtTime.split(':').map(Number);
        const finalRepaymentRepaidAt = new Date(y, m - 1, d, h, min, 0, 0);

        const updatedContract = await this.creditContractRepository.updateContract(contractId, {
            signedQuittanceUrl: url,
            signedQuittanceDocumentId: document.id,
            finalRepaymentPaymentMode: data.paymentMode,
            finalRepaymentWithFees: data.paymentMode === 'airtel_money' || data.paymentMode === 'mobicash' ? data.withFees : undefined,
            finalRepaymentMethodOther: data.paymentMode === 'other' ? (data.methodOther?.trim() ?? '') : undefined,
            finalRepaymentRepaidAt,
            finalRepaymentComment: data.comment?.trim() || undefined,
            finalRepaymentModifiedBy: adminId,
            finalRepaymentModifiedByName: adminDisplayName.trim() || undefined,
            finalRepaymentModifiedAt: new Date(),
            finalRepaymentModificationMotif: trimmedMotif,
            updatedBy: adminId,
        });

        if (!updatedContract) {
            throw new Error('Erreur lors de la mise à jour du contrat');
        }
        return updatedContract;
    }

    /**
     * Clôture le contrat - Phase 4
     * Précondition : contrat DISCHARGED et quittance signée téléversée
     */
    async closeContract(contractId: string, data: { closedAt: Date; closedBy: string; motifCloture: string }): Promise<CreditContract> {
        const contract = await this.creditContractRepository.getContractById(contractId);
        if (!contract) {
            throw new Error('Contrat introuvable');
        }
        if (contract.status !== 'DISCHARGED') {
            throw new Error('Le contrat doit être déchargé avant la clôture');
        }
        if (!contract.signedQuittanceUrl) {
            throw new Error('La quittance signée doit être téléversée avant la clôture');
        }
        if (!data.motifCloture || data.motifCloture.trim().length < 10 || data.motifCloture.trim().length > 500) {
            throw new Error('Le motif de clôture doit contenir entre 10 et 500 caractères');
        }

        const updatedContract = await this.creditContractRepository.updateContract(contractId, {
            status: 'CLOSED',
            closedAt: data.closedAt,
            closedBy: data.closedBy,
            motifCloture: data.motifCloture.trim(),
            updatedBy: data.closedBy,
        });

        if (!updatedContract) {
            throw new Error('Erreur lors de la mise à jour du contrat');
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

            // Un seul rajout autorisé par contrat
            if (contract.rajoutEffectue === true) {
                return {
                    eligible: false,
                    reason: 'Un rajout a déjà été effectué sur ce contrat. Un seul rajout est autorisé.',
                    currentContract: contract,
                    paymentsCount: 0,
                    unpaidPenaltiesCount: 0,
                };
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
        remainingCapital: number;
        remainingDue: number;
        suggestedMinMonthlyPayment?: number;
    }> {
        try {
            const contract = await this.creditContractRepository.getContractById(contractId);
            if (!contract) {
                throw new Error('Contrat introuvable');
            }

            // Récupérer les paiements effectués
            const payments = getCreditPaymentsForCurrentCycle(
                contract,
                await this.creditPaymentRepository.getPaymentsByCreditId(contractId)
            ).filter(
                (payment) =>
                    payment.amount > 0 ||
                    payment.comment?.includes('Paiement de 0 FCFA') ||
                    payment.comment?.includes('Paiement de pénalités uniquement')
            );
            const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

            let remainingCapital = contract.amount;
            let remainingDue = contract.creditType === 'SPECIALE'
                ? Math.round(contract.amount + (contract.amount * contract.interestRate) / 100)
                : contract.totalAmount;

            if (contract.creditType === 'SPECIALE') {
                const history = buildCreditSpecialeHistory(contract, payments, {
                    projectUntilZero: true,
                });
                const nextDue = getNextDueFromCreditSpecialeHistory(history);
                const lastRecorded = history
                    .filter((month) => month.hasPaymentRecord || month.isRest)
                    .at(-1);

                if (lastRecorded) {
                    remainingCapital = Math.max(0, Math.round(lastRecorded.nextCapitalActual));
                }

                if (nextDue) {
                    remainingCapital = Math.max(0, Math.round(nextDue.capitalStart));
                    remainingDue = Math.max(0, Math.round(nextDue.amountDue));
                } else {
                    remainingCapital = 0;
                    remainingDue = 0;
                }
            } else {
                remainingCapital = Math.max(0, contract.totalAmount - totalPaid);
                remainingDue = remainingCapital;
            }

            return {
                originalAmount: contract.amount,
                interestRate: contract.interestRate,
                totalPaid,
                remainingCapital,
                remainingDue,
            };
        } catch (error) {
            console.error('Erreur lors du calcul des montants d\'extension:', error);
            throw error;
        }
    }

    /**
     * Rajoute un montant au contrat (augmentation de crédit).
     * L'augmentation ouvre un nouveau cycle dans le même contrat : l'historique est conservé,
     * mais les échéances repartent à M1 sur la base "capital reporté + montant ajouté".
     */
    async extendContract(
        contractId: string,
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
    ): Promise<{ updatedContract: CreditContract }> {
        const eligibility = await this.checkExtensionEligibility(contractId);
        if (!eligibility.eligible) {
            throw new Error(eligibility.reason || 'Le contrat ne peut pas être augmenté');
        }

        const contract = eligibility.currentContract!;
        const extensionAmounts = await this.calculateExtensionAmounts(contractId);
        const initialAmount = contract.initialAmount ?? contract.amount;
        const carriedCapital = Math.max(0, extensionAmounts.remainingCapital);
        const newAmount = carriedCapital + additionalAmount;
        const now = new Date();
        const normalizedDuration = contract.creditType === 'SPECIALE'
            ? Math.min(Math.max(1, simulationData.duration), 7)
            : simulationData.duration;
        const amountRemaining = contract.creditType === 'SPECIALE'
            ? Math.round(newAmount + (newAmount * simulationData.interestRate) / 100)
            : Math.round(simulationData.totalAmount);

        const existingCycles = getCreditContractCycles(contract);
        const currentCycleNumber = existingCycles[existingCycles.length - 1]?.cycleNumber ?? 1;
        const currentCycleContractUrl = this.normalizeOptionalString(contract.contractUrl);
        const currentCycleSignedContractUrl = this.normalizeOptionalString(contract.signedContractUrl);
        const currentCycleSignedContractPath = this.normalizeOptionalString(contract.signedContractPath);
        const currentCycleSignedContractDocumentId = this.normalizeOptionalString(contract.signedContractDocumentId);
        const creditCycles = [
            ...existingCycles.map((cycle) =>
                cycle.cycleNumber === currentCycleNumber
                    ? {
                        ...cycle,
                        restMonths: cycle.restMonths ?? contract.restMonths ?? [],
                        contractUrl: currentCycleContractUrl ?? cycle.contractUrl,
                        signedContractUrl: currentCycleSignedContractUrl ?? cycle.signedContractUrl,
                        signedContractPath: currentCycleSignedContractPath ?? cycle.signedContractPath,
                        signedContractDocumentId: currentCycleSignedContractDocumentId ?? cycle.signedContractDocumentId,
                    }
                    : cycle
            ),
            {
                cycleNumber: currentCycleNumber + 1,
                type: 'AUGMENTATION' as const,
                amount: newAmount,
                interestRate: simulationData.interestRate,
                monthlyPaymentAmount: simulationData.monthlyPaymentAmount,
                totalAmount: simulationData.totalAmount,
                duration: normalizedDuration,
                firstPaymentDate: simulationData.firstPaymentDate,
                startedAt: now,
                additionalAmount,
                carriedCapital,
                cause,
                desiredDate,
                restMonths: [],
                createdBy: adminId,
            },
        ];

        const updated = await this.creditContractRepository.updateContract(contractId, {
            creditCycles,
            initialAmount,
            rajoutAmount: additionalAmount,
            rajoutEffectue: true,
            amount: newAmount,
            interestRate: simulationData.interestRate,
            totalAmount: simulationData.totalAmount,
            duration: normalizedDuration,
            monthlyPaymentAmount: simulationData.monthlyPaymentAmount,
            firstPaymentDate: simulationData.firstPaymentDate,
            nextDueAt: simulationData.firstPaymentDate,
            amountPaid: 0,
            amountRemaining,
            // Nouveau cycle => nouveau lot documentaire obligatoire (PDF contrat + contrat signé).
            contractUrl: '',
            signedContractUrl: '',
            signedContractPath: '',
            signedContractDocumentId: '',
            fixedTransitionMode: undefined,
            fixedTransitionAt: undefined,
            fixedTransitionBy: undefined,
            fixedTransitionReason: undefined,
            fixedTransitionStartMonth: undefined,
            emergencyContact: emergencyContact ?? contract.emergencyContact,
            restMonths: [],
            status: 'ACTIVE',
            extendedAt: now,
            updatedBy: adminId,
        });

        if (!updated) {
            throw new Error('Échec de la mise à jour du contrat');
        }

        try {
            await this.notificationService.createNotification({
                module: 'credit_speciale',
                entityId: contractId,
                type: 'status_update',
                title: 'Rajout de crédit enregistré',
                message: `Un rajout de ${additionalAmount.toLocaleString('fr-FR')} FCFA a été enregistré pour ${contract.clientFirstName} ${contract.clientLastName}. Nouveau cycle sur ${newAmount.toLocaleString('fr-FR')} FCFA (capital reporté inclus).`,
                metadata: {
                    contractId,
                    additionalAmount,
                    newAmount,
                    carriedCapital,
                    clientId: contract.clientId,
                },
            });
        } catch {
            // Ne pas faire échouer l'opération
        }

        return { updatedContract: updated };
    }

    async switchToFixedPhase(
        contractId: string,
        reason: string,
        adminId: string
    ): Promise<CreditContract> {
        const trimmedReason = reason.trim();
        if (trimmedReason.length < 10) {
            throw new Error('La raison du basculement doit contenir au moins 10 caractères');
        }

        const contract = await this.creditContractRepository.getContractById(contractId);
        if (!contract) {
            throw new Error('Contrat introuvable');
        }

        if (contract.creditType !== 'SPECIALE') {
            throw new Error('Seuls les crédits spéciaux peuvent basculer en partie fixe');
        }

        const currentCycle = getCreditContractCycles(contract).at(-1);
        if (!currentCycle) {
            throw new Error('Aucun cycle actif trouvé pour ce contrat');
        }

        const allPayments = await this.getPaymentsByCreditId(contractId);
        const cyclePayments = this.getPaymentsForCycle(contract, allPayments, currentCycle.cycleNumber)
            .filter((payment) =>
                payment.amount > 0 ||
                payment.comment?.includes('Paiement de 0 FCFA') ||
                (!payment.comment?.includes('Paiement de pénalités uniquement') && payment.amount === 0)
            );

        const cycleContract = this.buildContractSnapshotForCycle(contract, currentCycle.cycleNumber);
        const historyBeforeSwitch = buildCreditSpecialeHistory(cycleContract, cyclePayments, {
            projectUntilZero: true,
        });
        const nextDueBeforeSwitch = getNextDueFromCreditSpecialeHistory(historyBeforeSwitch);

        if (!nextDueBeforeSwitch || nextDueBeforeSwitch.capitalStart <= 0) {
            throw new Error('Aucun solde restant à basculer en partie fixe');
        }

        if (nextDueBeforeSwitch.phase === 'FIXE') {
            throw new Error('Le contrat est déjà en partie fixe');
        }

        const now = new Date();
        const fixedTransitionStartMonth = nextDueBeforeSwitch.month;
        const updatedCycles = getCreditContractCycles(contract).map((cycle) =>
            cycle.cycleNumber === currentCycle.cycleNumber
                ? {
                    ...cycle,
                    fixedTransitionMode: 'MANUAL' as const,
                    fixedTransitionAt: now,
                    fixedTransitionBy: adminId,
                    fixedTransitionReason: trimmedReason,
                    fixedTransitionStartMonth,
                }
                : cycle
        );

        const switchedCycleContract = {
            ...cycleContract,
            fixedTransitionMode: 'MANUAL' as const,
            fixedTransitionAt: now,
            fixedTransitionBy: adminId,
            fixedTransitionReason: trimmedReason,
            fixedTransitionStartMonth,
        };
        const historyAfterSwitch = buildCreditSpecialeHistory(switchedCycleContract, cyclePayments, {
            projectUntilZero: true,
        });
        const nextDueAfterSwitch = getNextDueFromCreditSpecialeHistory(historyAfterSwitch);

        const updatedContract = await this.creditContractRepository.updateContract(contractId, {
            creditCycles: updatedCycles,
            fixedTransitionMode: 'MANUAL',
            fixedTransitionAt: now,
            fixedTransitionBy: adminId,
            fixedTransitionReason: trimmedReason,
            fixedTransitionStartMonth,
            amountRemaining: Math.round(nextDueAfterSwitch?.amountDue ?? nextDueBeforeSwitch.capitalStart),
            nextDueAt: nextDueAfterSwitch?.date ?? nextDueBeforeSwitch.date,
            updatedBy: adminId,
        });

        if (!updatedContract) {
            throw new Error('Échec du basculement en partie fixe');
        }

        try {
            await this.notificationService.createNotification({
                module: 'credit_speciale',
                entityId: contractId,
                type: 'status_update',
                title: 'Basculement en partie fixe',
                message: `Le contrat de ${contract.clientFirstName} ${contract.clientLastName} a été basculé manuellement en partie fixe.`,
                metadata: {
                    contractId,
                    cycleNumber: currentCycle.cycleNumber,
                    fixedTransitionStartMonth,
                    fixedTransitionReason: trimmedReason,
                    fixedTransitionBy: adminId,
                },
            });
        } catch {
            // Ne pas faire échouer le basculement si la notification échoue
        }

        return updatedContract;
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
