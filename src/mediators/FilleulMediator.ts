import { MediatorNavigation } from "./MediatorNavigation";
import { INavigation, Filleul } from "@/types/types";
import { ServiceFactory } from "@/factories/ServiceFactory";
import { IFilleulService } from "@/services/filleuls/IFilleulService";

export class FilleulMediator extends MediatorNavigation {
    private filleulService: IFilleulService;

    constructor(navigation: INavigation) {
        super(navigation);
        this.filleulService = ServiceFactory.getFilleulService();
    }

    /**
     * Récupère tous les filleuls d'un membre par son code intermédiaire
     * 
     * @param {string} intermediaryCode - Le code intermédiaire du parrain
     * @returns {Promise<Filleul[]>} - Liste des filleuls trouvés
     */
    async getFilleulsByIntermediaryCode(intermediaryCode: string): Promise<Filleul[]> {
        try {
            if (!intermediaryCode || intermediaryCode.trim().length === 0) {
                console.warn('Code intermédiaire vide ou invalide');
                return [];
            }

            const filleuls = await this.filleulService.getFilleulsByIntermediaryCode(intermediaryCode.trim());
            return filleuls;
        } catch (error) {
            console.error('Erreur lors de la récupération des filleuls:', error);
            return [];
        }
    }

    /**
     * Valide un code intermédiaire
     * 
     * @param {string} intermediaryCode - Le code à valider
     * @returns {boolean} - True si le code est valide
     */
    validateIntermediaryCode(intermediaryCode: string): boolean {
        return this.filleulService.validateIntermediaryCode(intermediaryCode);
    }

    /**
     * Formate un code intermédiaire
     * 
     * @param {string} intermediaryCode - Le code à formater
     * @returns {string} - Le code formaté
     */
    formatIntermediaryCode(intermediaryCode: string): string {
        return this.filleulService.formatIntermediaryCode(intermediaryCode);
    }

    /**
     * Obtient des statistiques sur les filleuls d'un parrain
     * 
     * @param {string} intermediaryCode - Le code intermédiaire du parrain
     * @returns {Promise<{total: number, thisYear: number, thisMonth: number}>} - Statistiques
     */
    async getFilleulsStats(intermediaryCode: string): Promise<{total: number, thisYear: number, thisMonth: number}> {
        return await this.filleulService.getFilleulsStats(intermediaryCode);
    }

    /**
     * Navigue vers la page de détails d'un filleul
     * 
     * @param {string} filleulId - L'ID du filleul
     */
    navigateToFilleulDetails(filleulId: string): void {
        (this as any).navigation.push(`/memberships/${filleulId}`);
    }

    /**
     * Navigue vers la liste des filleuls d'un membre
     * 
     * @param {string} memberId - L'ID du membre parrain
     */
    navigateToFilleulsList(memberId: string): void {
        (this as any).navigation.push(`/memberships/${memberId}/filleuls`);
    }
}