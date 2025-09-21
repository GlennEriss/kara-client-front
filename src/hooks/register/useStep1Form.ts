import { IdentityFormMediatorFactory } from "@/factories/IdentityFormMediatorFactory";
import { useCallback, useState } from "react";
import { useFormContext } from "react-hook-form";
import { RegisterFormData } from "@/schemas/schemas";

export default function useStep1Form() {
    const form = useFormContext<RegisterFormData>()
    const mediator = IdentityFormMediatorFactory.create(form)
    
    // États pour la gestion de la photo
    const [isDragOver, setIsDragOver] = useState(false)
    
    // Gestion de l'upload de photo avec compression via le médiateur
    const handlePhotoUpload = useCallback(async (file: File) => {
        if (file && file.type.startsWith('image/')) {
            try {
                await mediator.handlePhotoUpload(file)
            } catch (error) {
                console.error('Erreur lors de l\'upload:', error)
            }
        }
    }, [mediator])

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) handlePhotoUpload(file)
    }, [handlePhotoUpload])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragOver(false)
        const file = e.dataTransfer.files[0]
        if (file) handlePhotoUpload(file)
    }, [handlePhotoUpload])

    return { 
        form, 
        mediator, 
        isDragOver, 
        setIsDragOver,
        handlePhotoUpload,
        handleFileChange,
        handleDrop
    }
}   