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
            this.form.setValue('photo', compressedDataUrl)
            this.form.clearErrors('photo')
            
            return {
                success: true,
                compressedDataUrl,
                compressionInfo: `${imageInfo.format} • ${imageInfo.sizeText}`
            }
            
        } catch (error) {
            console.error('Erreur lors de la compression:', error)
            this.form.setError('photo', {
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
        const photo = this.form.getValues('photo')
        if (!photo) {
            this.form.setError('photo', {
                type: 'required',
                message: 'Une photo est requise'
            })
            return false
        }
        this.form.clearErrors('photo')
        return true
    }

    /**
     * Retourne l'état de compression
     */
    getIsCompressing(): boolean {
        return this.isCompressing
    }

    /**
     * Nettoie un numéro de téléphone en gardant seulement les chiffres et le +
     */
    cleanPhoneNumber(value: string): string {
        return value.replace(/[^\d+]/g, '')
    }

    /**
     * Ajoute un nouveau contact au tableau
     */
    addContact(): void {
        const currentContacts = this.form.getValues('contacts') || []
        this.form.setValue('contacts', [...currentContacts, ''])
    }

    /**
     * Supprime un contact du tableau
     */
    removeContact(index: number): void {
        const currentContacts = this.form.getValues('contacts') || []
        if (currentContacts.length > 1) {
            const newContacts = currentContacts.filter((_, i) => i !== index)
            this.form.setValue('contacts', newContacts)
        }
    }

    /**
     * Met à jour un contact spécifique avec nettoyage automatique
     */
    updateContact(index: number, value: string): void {
        const cleanedValue = this.cleanPhoneNumber(value)
        this.form.setValue(`contacts.${index}`, cleanedValue)
    }

    /**
     * Retourne les contacts actuels
     */
    getContacts(): string[] {
        const contacts = this.form.getValues('contacts') || []
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
     * Met à jour le numéro de téléphone du conjoint avec nettoyage automatique
     */
    updateSpousePhone(value: string): void {
        const cleanedValue = this.cleanPhoneNumber(value)
        this.form.setValue('spousePhone', cleanedValue)
    }
}