import { ICaisseImprevueService } from "@/services/caisse-imprevue/ICaisseImprevueService";
import { ServiceFactory } from "@/factories/ServiceFactory";
import { User, ContractCI, EmergencyContactCI } from "@/types/types";
import { CaisseImprevueGlobalFormData } from "@/schemas/caisse-imprevue.schema";
import { toast } from "sonner";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import routes from "@/constantes/routes";

export class CaisseImprevuFormMediator {
    public static instance: CaisseImprevuFormMediator | null = null
    private service: ICaisseImprevueService
    private currentStep: number = 1
    private totalSteps: number = 3
    private goToNextStep: (() => void) | null = null
    private router: AppRouterInstance | null = null
    private userId: string | null = null

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

        // Si ce n'est pas la dernière étape, passer à la suivante
        if (this.currentStep < this.totalSteps) {
            console.log('➡️ Passage à l\'étape suivante')
            this.goToNextStep?.()
            return
        }

        try {
            if (!this.userId) {
                toast.error('Utilisateur non connecté')
                return
            }

            // Générer l'ID personnalisé du contrat: MK_CI_CONTRACT_{MEMBERID}_{DATE}_{HEURE}
            const now = new Date()
            const day = String(now.getDate()).padStart(2, '0')
            const month = String(now.getMonth() + 1).padStart(2, '0')
            const year = String(now.getFullYear()).slice(-2)
            const hours = String(now.getHours()).padStart(2, '0')
            const minutes = String(now.getMinutes()).padStart(2, '0')

            const contractId = `MK_CI_CONTRACT_${data.step1.memberId}_${day}${month}${year}_${hours}${minutes}`

            // Upload de la photo du document d'identité du contact d'urgence
            toast.info('Upload de la photo du document en cours...', { duration: 2000 })

            const { url: documentPhotoUrl } = await this.service.uploadEmergencyContactImage(
                data.step3.documentPhotoUrl,
                data.step1.memberId,
                contractId
            )

            console.log('✅ Photo du document uploadée avec succès!')

            // Transformer emergencyContact du step3 en objet EmergencyContactCI
            const emergencyContact: EmergencyContactCI = {
                lastName: data.step3.lastName,
                firstName: data.step3.firstName,
                phone1: data.step3.phone1,
                phone2: data.step3.phone2,
                relationship: data.step3.relationship,
                idNumber: data.step3.idNumber,
                typeId: data.step3.typeId,
                documentPhotoUrl: documentPhotoUrl, // URL finale après re-upload
            }

            // Préparer les données du contrat
            const contractData: Omit<ContractCI, 'createdAt' | 'updatedAt'> = {
                id: contractId,
                // Step 1 - Membre
                memberId: data.step1.memberId,
                memberFirstName: data.step1.memberFirstName,
                memberLastName: data.step1.memberLastName,
                memberContacts: data.step1.memberContacts,
                memberEmail: data.step1.memberEmail,
                memberGender: data.step1.memberGender,
                memberBirthDate: data.step1.memberBirthDate,
                memberNationality: data.step1.memberNationality,
                memberAddress: data.step1.memberAddress,
                memberProfession: data.step1.memberProfession,
                memberPhotoUrl: data.step1.memberPhotoUrl,
                // Step 2 - Forfait
                subscriptionCIID: data.step2.subscriptionCIID,
                subscriptionCICode: data.step2.subscriptionCICode,
                subscriptionCILabel: data.step2.subscriptionCILabel,
                subscriptionCIAmountPerMonth: data.step2.subscriptionCIAmountPerMonth,
                subscriptionCINominal: data.step2.subscriptionCINominal,
                subscriptionCIDuration: data.step2.subscriptionCIDuration,
                subscriptionCISupportMin: data.step2.subscriptionCISupportMin,
                subscriptionCISupportMax: data.step2.subscriptionCISupportMax,
                paymentFrequency: data.step2.paymentFrequency,
                firstPaymentDate: data.step2.firstPaymentDate,
                // Step 3 - Contact d'urgence
                emergencyContact,
                // Support (initialisé vide pour nouveau contrat)
                currentSupportId: undefined,
                supportHistory: [],
                totalMonthsPaid: 0,
                isEligibleForSupport: false,
                // Métadonnées
                status: 'ACTIVE',
                createdBy: this.userId,
                updatedBy: this.userId,
            }

            // Créer le contrat via le service
            const contract = await this.service.createContractCI(contractData)

            console.log('✅ Contrat créé avec succès:', contract)

            toast.success('Contrat créé avec succès!', {
                description: `Le contrat ${contractId} a été créé pour ${data.step1.memberFirstName} ${data.step1.memberLastName}`,
            })

            // Redirection après succès
            if (this.router) {
                this.router?.push(routes.admin.caisseImprevue)
            }
        } catch (error) {
            console.error('❌ Erreur lors de la soumission:', error)
            toast.error('Erreur lors de la création du contrat', {
                description: error instanceof Error ? error.message : 'Une erreur inattendue s\'est produite'
            })
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

    /**
     * Définir le router Next.js pour la navigation
     */
    setRouter(router: AppRouterInstance) {
        this.router = router
    }

    /**
     * Définir l'ID de l'utilisateur connecté
     */
    setUserId(userId: string) {
        this.userId = userId
    }
}