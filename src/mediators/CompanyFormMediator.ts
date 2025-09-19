import { RegisterFormData } from "@/schemas/schemas";
import { UseFormReturn } from "react-hook-form"
import { ServiceFactory } from "@/factories/ServiceFactory"
import { ICompanySuggestionsService, CompanySuggestion } from "@/services/interfaces/IService"

export class CompanyFormMediator {
    private form: UseFormReturn<RegisterFormData>
    private companySuggestionsService: ICompanySuggestionsService

    constructor(form: UseFormReturn<RegisterFormData>) {
        this.form = form
        this.companySuggestionsService = ServiceFactory.getCompanySuggestionsService()
    }

    getForm(): UseFormReturn<RegisterFormData> {
        return this.form
    }

    /**
     * Recherche des suggestions d'entreprises via le service
     */
    async searchCompanies(query: string): Promise<CompanySuggestion[]> {
        return await this.companySuggestionsService.searchCompanies(query)
    }

    /**
     * Charge l'adresse d'une entreprise existante via le service
     */
    async loadCompanyAddress(companyName: string): Promise<void> {
        try {
            const address = await this.companySuggestionsService.loadCompanyAddress(companyName)
            
            if (address) {
                // Remplir automatiquement les champs d'adresse
                if (address.province) {
                    this.form.setValue('company.companyAddress.province', address.province)
                }
                if (address.city) {
                    this.form.setValue('company.companyAddress.city', address.city)
                }
                if (address.district) {
                    this.form.setValue('company.companyAddress.district', address.district)
                }
                
            }
        } catch (error) {
            console.error('Erreur lors du chargement de l\'adresse:', error)
        }
    }

    /**
     * Sélectionne une suggestion d'entreprise
     */
    selectCompanySuggestion(suggestion: CompanySuggestion): void {
        if (suggestion.isNew) {
            // Extraire le nom de l'entreprise depuis "Créer "nom""
            const companyName = suggestion.name.replace(/^Créer "(.+)"$/, '$1')
            this.form.setValue('company.companyName', companyName)
        } else {
            this.form.setValue('company.companyName', suggestion.name)
            
            // Si l'entreprise a une adresse, pré-remplir les champs d'adresse
            if (suggestion.hasAddress && suggestion.id) {
                this.loadCompanyAddress(suggestion.name)
            }
        }
        
        // Déclencher la validation
        this.form.trigger('company.companyName')
    }

    /**
     * Sélectionne une suggestion de profession
     */
    selectProfessionSuggestion(suggestion: CompanySuggestion): void {
        if (suggestion.isNew) {
            const professionName = suggestion.name.replace(/^Créer "(.+)"$/, '$1')
            this.form.setValue('company.profession', professionName)
        } else {
            this.form.setValue('company.profession', suggestion.name)
        }
        
        this.form.trigger('company.profession')
    }

    /**
     * Obtient les valeurs actuelles du formulaire company
     */
    getCurrentValues(): Partial<RegisterFormData['company']> {
        return this.form.getValues('company') || {}
    }

    /**
     * Met à jour une valeur du formulaire company
     */
    updateValue(field: keyof RegisterFormData['company'], value: any): void {
        this.form.setValue(`company.${field}` as any, value)
        this.form.trigger(`company.${field}` as any)
    }
}