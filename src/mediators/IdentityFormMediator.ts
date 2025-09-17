import { UseFormReturn } from "react-hook-form";
import { RegisterFormData } from "@/schemas/schemas";
import { compressImage, IMAGE_COMPRESSION_PRESETS, getImageInfo } from "@/lib/utils";

export class IdentityFormMediator {
    private form: UseFormReturn<RegisterFormData>
    private isCompressing: boolean = false

    constructor(form: UseFormReturn<RegisterFormData>) {
        this.form = form
    }

    getForm(): UseFormReturn<RegisterFormData> {
        return this.form
    }

    /**
     * Gère l'upload et la compression de la photo
     * @param file - Le fichier image à compresser
     * @returns Promise avec les informations de compression
     */
    async handlePhotoUpload(file: File): Promise<{
        success: boolean;
        compressedDataUrl?: string;
        compressionInfo?: string;
        error?: string;
    }> {
        if (!file || !file.type.startsWith('image/')) {
            return {
                success: false,
                error: 'Fichier invalide. Veuillez sélectionner une image.'
            }
        }

        this.isCompressing = true

        try {
            // Compresser l'image en WebP avec le preset profile
            const compressedDataUrl = await compressImage(file, IMAGE_COMPRESSION_PRESETS.profile)
            
            // Obtenir les informations sur l'image compressée
            const imageInfo = getImageInfo(compressedDataUrl)
            
            // Mettre à jour le formulaire avec la photo compressée
            this.form.setValue('identity.photo', compressedDataUrl)
            this.form.clearErrors('identity.photo')
            
            return {
                success: true,
                compressedDataUrl,
                compressionInfo: `${imageInfo.format} • ${imageInfo.sizeText}`
            }
            
        } catch (error) {
            console.error('Erreur lors de la compression:', error)
            this.form.setError('identity.photo', {
                type: 'compression',
                message: 'Erreur lors de la compression de l\'image'
            })
            
            return {
                success: false,
                error: 'Erreur lors de la compression de l\'image'
            }
        } finally {
            this.isCompressing = false
        }
    }

    /**
     * Valide que la photo est présente
     */
    validatePhoto(): boolean {
        const photo = this.form.getValues('identity.photo')
        if (!photo) {
            this.form.setError('identity.photo', {
                type: 'required',
                message: 'Une photo est requise'
            })
            return false
        }
        this.form.clearErrors('identity.photo')
        return true
    }

    /**
     * Retourne l'état de compression
     */
    getIsCompressing(): boolean {
        return this.isCompressing
    }

    /**
     * Nettoie un numéro de téléphone et ajoute automatiquement le préfixe +241
     * La validation des opérateurs est gérée par le schéma Zod
     */
    cleanPhoneNumber(value: string): string {
        // Nettoyer le numéro (garder seulement les chiffres)
        const digits = value.replace(/\D/g, '')
        
        // Si vide, retourner juste le préfixe
        if (digits.length === 0) {
            return '+241'
        }
        
        // Si le numéro commence déjà par 241, ajouter le +
        if (digits.startsWith('241')) {
            // Limiter à 11 chiffres total (241 + 8 chiffres)
            return '+' + digits.substring(0, 11)
        }
        
        // Si le numéro ne commence pas par 241, l'ajouter automatiquement
        // Limiter à 8 chiffres après +241
        const phoneDigits = digits.substring(0, 8)
        return '+241' + phoneDigits
    }

    /**
     * Initialise le tableau de contacts s'il n'existe pas
     */
    initializeContacts(): void {
        const currentContacts = this.form.getValues('identity.contacts')
        if (!currentContacts || currentContacts.length === 0) {
            this.form.setValue('identity.contacts', ['+241'])
        }
    }

    /**
     * Ajoute un nouveau contact au tableau avec le préfixe +241
     */
    addContact(): void {
        const currentContacts = this.form.getValues('identity.contacts') || []
        this.form.setValue('identity.contacts', [...currentContacts, '+241'])
    }

    /**
     * Supprime un contact du tableau
     */
    removeContact(index: number): void {
        const currentContacts = this.form.getValues('identity.contacts') || []
        if (currentContacts.length > 1) {
            const newContacts = currentContacts.filter((_, i) => i !== index)
            this.form.setValue('identity.contacts', newContacts)
        }
    }

    /**
     * Met à jour un contact spécifique avec nettoyage automatique et préfixe +241
     */
    updateContact(index: number, value: string): void {
        const cleanedValue = this.cleanPhoneNumber(value)
        this.form.setValue(`identity.contacts.${index}`, cleanedValue)
    }

    /**
     * Retourne les contacts actuels
     */
    getContacts(): string[] {
        const contacts = this.form.getValues('identity.contacts') || []
        return contacts.filter((contact): contact is string => typeof contact === 'string')
    }

    /**
     * Retourne le nombre de contacts
     */
    getContactsCount(): number {
        return this.getContacts().length
    }

    /**
     * Vérifie si on peut ajouter un autre contact (max 3)
     */
    canAddContact(): boolean {
        return this.getContactsCount() < 3
    }

    /**
     * Vérifie si on peut supprimer un contact (min 1)
     */
    canRemoveContact(): boolean {
        return this.getContactsCount() > 1
    }

    /**
     * Met à jour le numéro de téléphone du conjoint avec nettoyage automatique et préfixe +241
     */
    updateSpousePhone(value: string): void {
        const cleanedValue = this.cleanPhoneNumber(value)
        this.form.setValue('identity.spousePhone', cleanedValue)
    }
}