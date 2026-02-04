import { ICaisseSpecialeService } from "./ICaisseSpecialeService";
import { CaisseSpecialeDemand, CaisseSpecialeDemandFilters, CaisseSpecialeDemandStats, CaisseContract } from "@/types/types";
import { ICaisseSpecialeDemandRepository } from "@/repositories/caisse-speciale/ICaisseSpecialeDemandRepository";
import { IMemberRepository } from "@/repositories/members/IMemberRepository";
import { IAdminRepository } from "@/repositories/admins/IAdminRepository";
import { RepositoryFactory } from "@/factories/RepositoryFactory";
import { ServiceFactory } from "@/factories/ServiceFactory";
import { NotificationService } from "@/services/notifications/NotificationService";
import { subscribe } from "@/services/caisse/mutations";
import { generateAllDemandSearchableTexts } from "@/utils/demandSearchableText";
import { getActiveSettings } from "@/db/caisse/settings.db";

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
        let memberLastName = '';
        let memberFirstName = '';
        let memberMatricule = '';

        if (data.memberId) {
            const member = await this.memberRepository.getMemberById(data.memberId);
            if (member) {
                memberLastName = member.lastName || '';
                memberFirstName = member.firstName || '';
                memberMatricule = member.matricule || '';
                memberName = `${memberFirstName} ${memberLastName}`.trim();
                if (member.matricule) {
                    const matriculePart = member.matricule.split('.')[0] || member.matricule.replace(/[^0-9]/g, '').slice(0, 4);
                    matriculeFormatted = matriculePart.padStart(4, '0');
                }
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

        // C.8 : Générer les 3 searchableText pour la recherche nom/prénom/matricule
        const searchableTexts = generateAllDemandSearchableTexts(memberLastName, memberFirstName, memberMatricule);

        const demandData = {
            ...data,
            contractType: 'INDIVIDUAL' as const, // Toujours individuel
            status: 'PENDING' as const,
            createdBy: adminId,
            ...searchableTexts,
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
        } catch {
            // Erreur lors de la création de la notification - continue sans
        }
        
        return demand;
    }

    async getDemandById(id: string): Promise<CaisseSpecialeDemand | null> {
        return await this.caisseSpecialeDemandRepository.getDemandById(id);
    }

    async getDemandsWithFilters(filters?: CaisseSpecialeDemandFilters): Promise<{ items: CaisseSpecialeDemand[]; total: number }> {
        return await this.caisseSpecialeDemandRepository.getDemandsWithFilters(filters);
    }

    async getDemandsStats(filters?: CaisseSpecialeDemandFilters): Promise<CaisseSpecialeDemandStats> {
        return await this.caisseSpecialeDemandRepository.getDemandsStats(filters);
    }

    async approveDemand(demandId: string, adminId: string, reason: string): Promise<CaisseSpecialeDemand | null> {
        // Récupérer la demande
        const demand = await this.getDemandById(demandId);
        if (!demand) {
            throw new Error('Demande introuvable');
        }
        if (demand.status !== 'PENDING') {
            throw new Error('Seules les demandes en attente peuvent être acceptées');
        }
        if (!demand.memberId) {
            throw new Error('La demande doit être associée à un membre');
        }

        // Récupérer le nom de l'admin
        const admin = await this.adminRepository.getAdminById(adminId);
        const adminName = admin ? `${admin.firstName || ''} ${admin.lastName || ''}`.trim() : adminId;

        // 1. Mettre à jour le statut de la demande à APPROVED
        const approvedDemand = await this.caisseSpecialeDemandRepository.updateDemandStatus(
            demandId,
            'APPROVED',
            adminId,
            reason,
            adminName
        );
        if (!approvedDemand) {
            throw new Error('Erreur lors de l\'acceptation de la demande');
        }

        // 2. Créer le contrat Caisse Spéciale à partir de la demande
        const contractId = await subscribe({
            memberId: demand.memberId,
            monthlyAmount: demand.monthlyAmount,
            monthsPlanned: demand.monthsPlanned,
            caisseType: demand.caisseType,
            firstPaymentDate: demand.desiredDate,
            emergencyContact: demand.emergencyContact, // Transférer le contact d'urgence de la demande
        });

        // 3. Mettre à jour la demande : statut CONVERTED + contractId + traçabilité
        const convertedDemand = await this.caisseSpecialeDemandRepository.updateDemand(demandId, {
            status: 'CONVERTED',
            contractId,
            convertedBy: adminId,
            convertedAt: new Date(),
            convertedByName: adminName,
            updatedBy: adminId,
        });

        // 4. Notifications
        let memberName = "Membre inconnu";
        if (demand.memberId) {
            const member = await this.memberRepository.getMemberById(demand.memberId);
            if (member) {
                memberName = `${member.firstName || ''} ${member.lastName || ''}`.trim();
            }
        }

        try {
            await this.notificationService.createNotification({
                module: 'caisse_speciale',
                entityId: demand.id,
                type: 'status_update' as any,
                title: 'Demande acceptée - Contrat créé',
                message: `Votre demande a été acceptée. Le contrat ${contractId} a été créé.`,
                metadata: {
                    demandId: demand.id,
                    contractId,
                    decisionMadeBy: adminId,
                    decisionMadeByName: adminName,
                    decisionReason: reason,
                    memberId: demand.memberId,
                },
            });

            if (demand.createdBy !== adminId) {
                await this.notificationService.createNotification({
                    module: 'caisse_speciale',
                    entityId: demand.id,
                    type: 'status_update' as any,
                    title: 'Demande acceptée - Contrat créé',
                    message: `La demande ${demand.id} de ${memberName} a été acceptée par ${adminName}. Contrat ${contractId} créé.`,
                    metadata: {
                        demandId: demand.id,
                        contractId,
                        decisionMadeBy: adminId,
                        decisionMadeByName: adminName,
                        createdBy: demand.createdBy,
                    },
                });
            }
        } catch (error) {
            console.error('Erreur lors de la création de la notification:', error);
        }

        return convertedDemand;
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

    async convertDemandToContract(demandId: string, adminId: string): Promise<{ demand: CaisseSpecialeDemand; contractId: string } | null> {
        const demand = await this.getDemandById(demandId);
        if (!demand || demand.status !== 'APPROVED') {
            throw new Error('La demande doit être acceptée pour être convertie en contrat');
        }

        if (demand.contractId) {
            throw new Error('Cette demande a déjà été convertie en contrat');
        }

        if (!demand.memberId) {
            throw new Error('La demande doit être associée à un membre');
        }

        const settings = await getActiveSettings(demand.caisseType as any);
        if (!settings?.id) {
            throw new Error('Paramètres non configurés pour ce type de caisse');
        }

        // Créer le contrat Caisse Spéciale à partir de la demande (même logique que approveDemand)
        const contractId = await subscribe({
            memberId: demand.memberId,
            monthlyAmount: demand.monthlyAmount,
            monthsPlanned: demand.monthsPlanned,
            caisseType: demand.caisseType,
            firstPaymentDate: demand.desiredDate,
            settingsVersion: settings.id,
            emergencyContact: demand.emergencyContact, // Transférer le contact d'urgence de la demande
        });

        // Récupérer le nom de l'admin pour la traçabilité
        const admin = await this.adminRepository.getAdminById(adminId);
        const adminName = admin ? `${admin.firstName || ''} ${admin.lastName || ''}`.trim() : adminId;

        // Mettre à jour la demande : statut CONVERTED + contractId + traçabilité (5.12)
        const updatedDemand = await this.caisseSpecialeDemandRepository.updateDemand(demandId, {
            status: 'CONVERTED',
            contractId,
            convertedBy: adminId,
            convertedAt: new Date(),
            convertedByName: adminName,
            updatedBy: adminId,
        });

        if (!updatedDemand) {
            throw new Error('Erreur lors de la mise à jour de la demande');
        }

        let memberName = "Membre inconnu";
        if (demand.memberId) {
            const member = await this.memberRepository.getMemberById(demand.memberId);
            if (member) {
                memberName = `${member.firstName || ''} ${member.lastName || ''}`.trim();
            }
        }

        // Notifications
        try {
            await this.notificationService.createNotification({
                module: 'caisse_speciale',
                entityId: demand.id,
                type: 'status_update' as any,
                title: 'Contrat créé depuis votre demande',
                message: `Votre demande a été convertie en contrat. Le contrat ${contractId} est maintenant actif.`,
                metadata: {
                    demandId: demand.id,
                    contractId,
                    decisionMadeBy: adminId,
                    decisionMadeByName: adminName,
                    memberId: demand.memberId,
                },
            });

            if (demand.createdBy !== adminId) {
                await this.notificationService.createNotification({
                    module: 'caisse_speciale',
                    entityId: demand.id,
                    type: 'status_update' as any,
                    title: 'Contrat créé depuis une demande',
                    message: `La demande ${demand.id} de ${memberName} a été convertie en contrat ${contractId} par ${adminName}.`,
                    metadata: {
                        demandId: demand.id,
                        contractId,
                        decisionMadeBy: adminId,
                        decisionMadeByName: adminName,
                        createdBy: demand.createdBy,
                    },
                });
            }
        } catch (error) {
            console.error('Erreur lors de la création de la notification:', error);
        }

        return {
            demand: updatedDemand,
            contractId,
        };
    }

    async deleteDemand(demandId: string): Promise<void> {
        const demand = await this.getDemandById(demandId);
        if (!demand) {
            throw new Error('Demande introuvable');
        }
        if (demand.status === 'CONVERTED' && demand.contractId) {
            throw new Error('Impossible de supprimer une demande déjà convertie en contrat');
        }
        await this.caisseSpecialeDemandRepository.deleteDemand(demandId);
    }
}
