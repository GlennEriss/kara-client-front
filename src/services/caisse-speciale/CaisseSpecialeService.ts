import { ICaisseSpecialeService } from "./ICaisseSpecialeService";
import { CaisseSpecialeDemand, CaisseSpecialeDemandFilters, CaisseSpecialeDemandStats, CaisseContract } from "@/types/types";
import { ICaisseSpecialeDemandRepository } from "@/repositories/caisse-speciale/ICaisseSpecialeDemandRepository";
import { IMemberRepository } from "@/repositories/members/IMemberRepository";
import { IAdminRepository } from "@/repositories/admins/IAdminRepository";
import { RepositoryFactory } from "@/factories/RepositoryFactory";
import { ServiceFactory } from "@/factories/ServiceFactory";
import { NotificationService } from "@/services/notifications/NotificationService";

export class CaisseSpecialeService implements ICaisseSpecialeService {
    readonly name = "CaisseSpecialeService";
    private notificationService: NotificationService;
    private memberRepository: IMemberRepository;
    private adminRepository: IAdminRepository;

    constructor(
        private caisseSpecialeDemandRepository: ICaisseSpecialeDemandRepository
    ) {
        this.notificationService = ServiceFactory.getNotificationService();
        this.memberRepository = RepositoryFactory.getMemberRepository();
        this.adminRepository = RepositoryFactory.getAdminRepository();
    }

    // ==================== DEMANDES ====================

    async createDemand(data: Omit<CaisseSpecialeDemand, 'id' | 'createdAt' | 'updatedAt'>, adminId: string): Promise<CaisseSpecialeDemand> {
        // Générer l'ID au format: MK_DEMANDE_CS_{matricule}_{date}_{heure}
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

        const customId = `MK_DEMANDE_CS_${matriculeFormatted}_${dateFormatted}_${timeFormatted}`;

        const demandData = {
            ...data,
            contractType: 'INDIVIDUAL' as const, // Toujours individuel
            status: 'PENDING' as const,
            createdBy: adminId,
        };

        const demand = await this.caisseSpecialeDemandRepository.createDemand(demandData, customId);
        
        // Notification pour tous les admins
        try {
            await this.notificationService.createNotification({
                module: 'caisse_speciale',
                entityId: demand.id,
                type: 'new_request' as any, // Utiliser 'new_request' comme type générique pour nouvelle demande
                title: 'Nouvelle demande de contrat Caisse Spéciale',
                message: `Une nouvelle demande a été créée par ${adminId} pour ${memberName}`,
                metadata: {
                    demandId: demand.id,
                    contractType: 'INDIVIDUAL',
                    memberId: data.memberId,
                    caisseType: data.caisseType,
                    monthlyAmount: data.monthlyAmount,
                    desiredDate: data.desiredDate,
                    createdBy: adminId,
                },
            });
        } catch (error) {
            console.error('Erreur lors de la création de la notification:', error);
        }
        
        return demand;
    }

    async getDemandById(id: string): Promise<CaisseSpecialeDemand | null> {
        return await this.caisseSpecialeDemandRepository.getDemandById(id);
    }

    async getDemandsWithFilters(filters?: CaisseSpecialeDemandFilters): Promise<CaisseSpecialeDemand[]> {
        return await this.caisseSpecialeDemandRepository.getDemandsWithFilters(filters);
    }

    async getDemandsStats(filters?: CaisseSpecialeDemandFilters): Promise<CaisseSpecialeDemandStats> {
        return await this.caisseSpecialeDemandRepository.getDemandsStats(filters);
    }

    async approveDemand(demandId: string, adminId: string, reason: string): Promise<CaisseSpecialeDemand | null> {
        // Récupérer le nom de l'admin
        const admin = await this.adminRepository.getAdminById(adminId);
        const adminName = admin ? `${admin.firstName || ''} ${admin.lastName || ''}`.trim() : adminId;

        const demand = await this.caisseSpecialeDemandRepository.updateDemandStatus(
            demandId,
            'APPROVED',
            adminId,
            reason,
            adminName
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

            // Notification au membre et à l'admin créateur
            try {
                await this.notificationService.createNotification({
                    module: 'caisse_speciale',
                    entityId: demand.id,
                    type: 'status_update' as any, // Utiliser 'status_update' comme type générique
                    title: 'Demande acceptée',
                    message: `Votre demande de contrat Caisse Spéciale a été acceptée. Raison : ${reason}`,
                    metadata: {
                        demandId: demand.id,
                        decisionMadeBy: adminId,
                        decisionMadeByName: adminName,
                        decisionReason: reason,
                        decisionMadeAt: demand.decisionMadeAt?.toISOString(),
                        memberId: demand.memberId,
                    },
                });

                // Notification à l'admin créateur si différent
                if (demand.createdBy !== adminId) {
                    await this.notificationService.createNotification({
                        module: 'caisse_speciale',
                        entityId: demand.id,
                        type: 'status_update' as any, // Utiliser 'status_update' comme type générique
                        title: 'Demande acceptée',
                        message: `La demande ${demand.id} de ${memberName} a été acceptée par ${adminName}`,
                        metadata: {
                            demandId: demand.id,
                            decisionMadeBy: adminId,
                            decisionMadeByName: adminName,
                            decisionReason: reason,
                            createdBy: demand.createdBy,
                        },
                    });
                }
            } catch (error) {
                console.error('Erreur lors de la création de la notification:', error);
            }
        }

        return demand;
    }

    async rejectDemand(demandId: string, adminId: string, reason: string): Promise<CaisseSpecialeDemand | null> {
        // Récupérer le nom de l'admin
        const admin = await this.adminRepository.getAdminById(adminId);
        const adminName = admin ? `${admin.firstName || ''} ${admin.lastName || ''}`.trim() : adminId;

        const demand = await this.caisseSpecialeDemandRepository.updateDemandStatus(
            demandId,
            'REJECTED',
            adminId,
            reason,
            adminName
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

            // Notification au membre et à l'admin créateur
            try {
                await this.notificationService.createNotification({
                    module: 'caisse_speciale',
                    entityId: demand.id,
                    type: 'status_update' as any, // Utiliser 'status_update' comme type générique
                    title: 'Demande refusée',
                    message: `Votre demande de contrat Caisse Spéciale a été refusée. Raison : ${reason}`,
                    metadata: {
                        demandId: demand.id,
                        decisionMadeBy: adminId,
                        decisionMadeByName: adminName,
                        decisionReason: reason,
                        decisionMadeAt: demand.decisionMadeAt?.toISOString(),
                        memberId: demand.memberId,
                    },
                });

                // Notification à l'admin créateur si différent
                if (demand.createdBy !== adminId) {
                    await this.notificationService.createNotification({
                        module: 'caisse_speciale',
                        entityId: demand.id,
                        type: 'status_update' as any, // Utiliser 'status_update' comme type générique
                        title: 'Demande refusée',
                        message: `La demande ${demand.id} de ${memberName} a été refusée par ${adminName}`,
                        metadata: {
                            demandId: demand.id,
                            decisionMadeBy: adminId,
                            decisionMadeByName: adminName,
                            decisionReason: reason,
                            createdBy: demand.createdBy,
                        },
                    });
                }
            } catch (error) {
                console.error('Erreur lors de la création de la notification:', error);
            }
        }

        return demand;
    }

    async reopenDemand(demandId: string, adminId: string, reason: string): Promise<CaisseSpecialeDemand | null> {
        const demand = await this.getDemandById(demandId);
        if (!demand) {
            throw new Error('Demande introuvable');
        }

        if (demand.status !== 'REJECTED') {
            throw new Error('Seules les demandes refusées peuvent être réouvertes');
        }

        // Récupérer le nom de l'admin
        const admin = await this.adminRepository.getAdminById(adminId);
        const adminName = admin ? `${admin.firstName || ''} ${admin.lastName || ''}`.trim() : adminId;

        // Mettre à jour la demande pour la réouvrir
        const updatedDemand = await this.caisseSpecialeDemandRepository.updateDemand(demandId, {
            status: 'PENDING',
            reopenedAt: new Date(),
            reopenedBy: adminId,
            reopenedByName: adminName,
            reopenReason: reason,
            updatedBy: adminId,
        });

        if (updatedDemand) {
            // Récupérer le nom du membre
            let memberName = "Membre inconnu";
            if (demand.memberId) {
                const member = await this.memberRepository.getMemberById(demand.memberId);
                if (member) {
                    memberName = `${member.firstName || ''} ${member.lastName || ''}`.trim();
                }
            }

            // Notification au membre et à tous les admins
            try {
                await this.notificationService.createNotification({
                    module: 'caisse_speciale',
                    entityId: demand.id,
                    type: 'status_update' as any,
                    title: 'Demande réouverte',
                    message: `Votre demande de contrat Caisse Spéciale a été réouverte. Motif : ${reason}`,
                    metadata: {
                        demandId: demand.id,
                        reopenedBy: adminId,
                        reopenedByName: adminName,
                        reopenReason: reason,
                        reopenedAt: new Date().toISOString(),
                        memberId: demand.memberId,
                    },
                });

                // Notification globale pour tous les admins
                await this.notificationService.createNotification({
                    module: 'caisse_speciale',
                    entityId: demand.id,
                    type: 'status_update' as any,
                    title: 'Demande réouverte',
                    message: `La demande ${demand.id} de ${memberName} a été réouverte par ${adminName}`,
                    metadata: {
                        demandId: demand.id,
                        reopenedBy: adminId,
                        reopenedByName: adminName,
                        reopenReason: reason,
                        reopenedAt: new Date().toISOString(),
                        memberId: demand.memberId,
                    },
                });
            } catch (error) {
                console.error('Erreur lors de la création de la notification:', error);
            }
        }

        return updatedDemand;
    }

    async convertDemandToContract(demandId: string, adminId: string, contractData?: Partial<CaisseContract>): Promise<{ demand: CaisseSpecialeDemand; contract: CaisseContract } | null> {
        const demand = await this.getDemandById(demandId);
        if (!demand || demand.status !== 'APPROVED') {
            throw new Error('La demande doit être acceptée pour être convertie en contrat');
        }

        if (demand.contractId) {
            throw new Error('Cette demande a déjà été convertie en contrat');
        }

        // TODO: Créer le contrat à partir de la demande
        // Pour l'instant, on retourne null car la création de contrat nécessite plus de logique
        // Cette méthode sera complétée lors de l'intégration avec le système de création de contrats existant
        
        // Mettre à jour la demande pour indiquer qu'elle a été convertie
        const updatedDemand = await this.caisseSpecialeDemandRepository.updateDemand(demandId, {
            status: 'CONVERTED',
            contractId: contractData?.id, // L'ID du contrat créé
            updatedBy: adminId,
        });

        if (updatedDemand && contractData?.id) {
            // Récupérer le nom du membre
            let memberName = "Membre inconnu";
            if (demand.memberId) {
                const member = await this.memberRepository.getMemberById(demand.memberId);
                if (member) {
                    memberName = `${member.firstName || ''} ${member.lastName || ''}`.trim();
                }
            }

            // Notification au membre et à tous les admins
            try {
                await this.notificationService.createNotification({
                    module: 'caisse_speciale',
                    entityId: contractData.id,
                    type: 'contract_created' as any, // Utiliser 'contract_created' comme type générique
                    title: 'Contrat créé depuis votre demande',
                    message: `Votre demande a été convertie en contrat. Le contrat ${contractData.id} est maintenant actif.`,
                    metadata: {
                        demandId: demand.id,
                        contractId: contractData.id,
                        memberId: demand.memberId,
                        convertedBy: adminId,
                    },
                });

                // Notification globale pour tous les admins
                await this.notificationService.createNotification({
                    module: 'caisse_speciale',
                    entityId: contractData.id,
                    type: 'contract_created' as any, // Utiliser 'contract_created' comme type générique
                    title: 'Contrat créé depuis une demande',
                    message: `La demande ${demand.id} de ${memberName} a été convertie en contrat ${contractData.id}`,
                    metadata: {
                        demandId: demand.id,
                        contractId: contractData.id,
                        memberId: demand.memberId,
                        convertedBy: adminId,
                    },
                });
            } catch (error) {
                console.error('Erreur lors de la création de la notification:', error);
            }
        }

        return updatedDemand && contractData ? {
            demand: updatedDemand,
            contract: contractData as CaisseContract,
        } : null;
    }
}

