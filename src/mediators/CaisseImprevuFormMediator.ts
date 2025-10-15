import { ICaisseImprevueService } from "@/services/caisse-imprevue/ICaisseImprevueService";
import { ServiceFactory } from "@/factories/ServiceFactory";
import { User } from "@/types/types";
import { CaisseImprevueGlobalFormData } from "@/schemas/caisse-imprevue.schema";
import { toast } from "sonner";

export class CaisseImprevuFormMediator {
    public static instance: CaisseImprevuFormMediator | null = null
    private service: ICaisseImprevueService
    private currentStep: number = 1
    private totalSteps: number = 3
    private goToNextStep: (() => void) | null = null
    
    private constructor() {
        if (CaisseImprevuFormMediator.instance) {
            throw new Error("CaisseImprevuFormMediator is a singleton")
        }
        CaisseImprevuFormMediator.instance = this
        this.service = ServiceFactory.getCaisseImprevueService()
    }

    public static getInstance(): CaisseImprevuFormMediator {
        if (!CaisseImprevuFormMediator.instance) {
            CaisseImprevuFormMediator.instance = new CaisseImprevuFormMediator()
        }
        return CaisseImprevuFormMediator.instance
    }

    /**
     * Définir le contexte de navigation pour le médiateur
     */
    public setNavigationContext(currentStep: number, totalSteps: number, goToNextStep: () => void) {
        this.currentStep = currentStep
        this.totalSteps = totalSteps
        this.goToNextStep = goToNextStep
    }

    /**
     * Recherche de membres par requête unique
     * La requête peut être un matricule, un prénom ou un nom
     * @param searchQuery - La requête de recherche
     * @returns Liste des membres trouvés
     */
    async searchMembers(searchQuery: string): Promise<User[]> {
        return this.service.searchMembers(searchQuery)
    }

    /**
     * Récupère tous les forfaits de Caisse Imprévue
     * @returns Liste de tous les forfaits
     */
    async getSubscriptionsCI() {
        return this.service.getAllSubscriptions()
    }

    /**
     * Récupère uniquement les forfaits actifs de Caisse Imprévue
     * Filtre et tri effectués directement dans Firestore
     * @returns Liste des forfaits actifs triés par code alphabétique
     */
    async getActiveSubscriptionsCI() {
        return this.service.getActiveSubscriptions()
    }

    /**
     * Callback appelé lors de la soumission valide du formulaire
     * @param data - Les données validées du formulaire
     */
    onSubmit = async (data: CaisseImprevueGlobalFormData) => {
        console.log('✅ Formulaire validé pour l\'étape', this.currentStep, ':', data)
        
        // Si ce n'est pas la dernière étape, passer à la suivante
        if (this.currentStep < this.totalSteps) {
            console.log('➡️ Passage à l\'étape suivante')
            this.goToNextStep?.()
            return
        }
        
        // Dernière étape : soumission finale
        console.log('🚀 Soumission finale de la demande')
        
        try {
            // TODO: Implémenter la logique de création de la demande
            // await this.service.createCaisseImprevueRequest(data)
            
            toast.success('Demande créée avec succès!')
        } catch (error) {
            console.error('❌ Erreur lors de la soumission:', error)
            toast.error('Erreur lors de la création de la demande')
        }
    }

    /**
     * Callback appelé lors de la soumission invalide du formulaire
     * @param errors - Les erreurs de validation
     */
    onInvalid = (errors: any) => {
        console.error('❌ Erreurs de validation à l\'étape', this.currentStep, ':', errors)
        
        // Extraire les erreurs du step actuel
        const stepKey = `step${this.currentStep}` as keyof typeof errors
        const stepErrors = errors[stepKey]
        
        if (stepErrors) {
            // Trouver la première erreur de l'étape
            const firstFieldError = Object.values(stepErrors)[0] as any
            const errorMessage = firstFieldError?.message || 'Veuillez corriger les erreurs du formulaire'
            
            toast.error(errorMessage)
        } else {
            toast.error('Veuillez corriger les erreurs du formulaire')
        }
    }
}