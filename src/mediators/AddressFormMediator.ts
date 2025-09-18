import { RegisterFormData } from "@/schemas/schemas"
import { UseFormReturn } from "react-hook-form"
import { PhotonService } from "@/services/photon"
import { PhotonResult } from "@/types/types"

export class AddressFormMediator {
    private form: UseFormReturn<RegisterFormData>
    private searchCache: Map<string, PhotonResult[]> = new Map()
    private isSearching: boolean = false
    private showResults: boolean = false
    private districtQuery: string = ''
    private searchResults: PhotonResult[] = []
    private selectedLocation: PhotonResult | null = null

    constructor(form: UseFormReturn<RegisterFormData>) {
        this.form = form
    }

    getForm(): UseFormReturn<RegisterFormData> {
        return this.form
    }

    // Méthodes de recherche de quartiers
    async searchDistricts(query: string): Promise<PhotonResult[]> {
        if (!PhotonService.isValidQuery(query)) {
            return []
        }

        const normalizedQuery = PhotonService.normalizeQuery(query)
        
        // Vérifier le cache d'abord
        if (this.searchCache.has(normalizedQuery)) {
            const cachedResults = this.searchCache.get(normalizedQuery)!
            this.setSearchResults(cachedResults)
            this.showResults = true
            return cachedResults
        }

        this.isSearching = true
        
        try {
            // Utiliser le service Photon
            const results = await PhotonService.searchDistricts(query)
            
            // Mettre en cache et mettre à jour les états
            this.searchCache.set(normalizedQuery, results)
            this.setSearchResults(results)
            this.showResults = true
            
            return results
        } catch (error) {
            console.error('Erreur lors de la recherche:', error)
            this.setSearchResults([])
            return []
        } finally {
            this.isSearching = false
        }
    }

    // Gestion du cache
    getSearchCache(): Map<string, PhotonResult[]> {
        return this.searchCache
    }

    clearSearchCache(): void {
        this.searchCache.clear()
    }

    getIsSearching(): boolean {
        return this.isSearching
    }

    getShowResults(): boolean {
        return this.showResults
    }

    hideResults(): void {
        this.showResults = false
    }

    // Getters pour les états
    getDistrictQuery(): string {
        return this.districtQuery
    }

    getSearchResults(): PhotonResult[] {
        return this.searchResults
    }

    getSelectedLocation(): PhotonResult | null {
        return this.selectedLocation
    }

    // Setters pour les états
    setDistrictQuery(query: string): void {
        this.districtQuery = query
    }

    setSearchResults(results: PhotonResult[]): void {
        this.searchResults = results
    }

    setSelectedLocation(location: PhotonResult | null): void {
        this.selectedLocation = location
    }

    // Méthode pour formater l'affichage des résultats
    formatResultDisplay(result: PhotonResult): string {
        return PhotonService.formatResultDisplay(result)
    }

    // Méthode pour sélectionner un résultat
    selectLocation(result: PhotonResult): void {
        // Mise à jour des états internes
        this.setSelectedLocation(result)
        this.setDistrictQuery(result.properties.name)
        
        // Mise à jour du formulaire avec les données de la localisation
        // Note: Photon API utilise 'county' au lieu de 'city'
        this.form.setValue('address.district', result.properties.name)
        this.form.setValue('address.city', result.properties.county || result.properties.city || '')
        this.form.setValue('address.province', result.properties.state || '')
        
        console.log('📝 Valeurs mises à jour:', {
            district: result.properties.name,
            city: result.properties.county || result.properties.city || '',
            province: result.properties.state || ''
        })
        
        // Vérifier les valeurs après setValue
        const currentValues = this.form.getValues()
        console.log('🔍 Valeurs actuelles du formulaire:', {
            district: currentValues.address?.district,
            city: currentValues.address?.city,
            province: currentValues.address?.province
        })
        
        // Forcer le re-render en déclenchant un changement
        this.form.trigger(['address.district', 'address.city', 'address.province'])
        
        // Nettoyage des erreurs
        this.form.clearErrors('address.district')
        this.form.clearErrors('address.city')
        this.form.clearErrors('address.province')
    }
}