/**
 * Étape 3 : Contact d'urgence
 * 
 * Exclusion automatique du membre sélectionné dans Step 1
 */

'use client'

import { useState, useRef } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ImageCompressionService } from '@/services/imageCompressionService'
import { getStorageInstance } from '@/firebase/storage'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { toast } from 'sonner'
import { Upload, X, Loader2 } from 'lucide-react'
import type { CaisseImprevueDemandFormInput } from '../../../hooks/useDemandForm'
import { DOCUMENT_TYPE_OPTIONS } from '@/constantes/document-types'

interface Step3ContactProps {
  form: UseFormReturn<CaisseImprevueDemandFormInput>
}

export function Step3Contact({ form }: Step3ContactProps) {
  const memberId = form.watch('memberId')
  const [isUploading, setIsUploading] = useState(false)
  const [isCompressing, setIsCompressing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const documentPhotoUrl = form.watch('emergencyContact.documentPhotoUrl')

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validation du type de fichier
    if (!ImageCompressionService.isValidImageFile(file)) {
      toast.error('Le fichier doit être une image (JPG, PNG ou WEBP)')
      return
    }

    // Validation de la taille (10 MB max avant compression)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('La taille de l\'image ne doit pas dépasser 10 MB')
      return
    }

    const originalSize = ImageCompressionService.formatFileSize(file.size)
    setIsCompressing(true)

    try {
      // Étape 1 : Compression de l'image
      toast.info('Compression de l\'image en cours...', { duration: 2000 })
      const compressedFile = await ImageCompressionService.compressDocumentImage(file)
      const compressedSize = ImageCompressionService.formatFileSize(compressedFile.size)

      setIsCompressing(false)
      setIsUploading(true)

      // Étape 2 : Upload vers Firebase Storage
      toast.info('Upload de l\'image...', { duration: 2000 })
      const storage = getStorageInstance()
      const timestamp = Date.now()
      const fileName = `emergency-contact-ci-${timestamp}-${file.name}`
      const filePath = `emergency-contacts-ci/${fileName}`
      const storageRef = ref(storage, filePath)

      // Upload du fichier compressé
      await uploadBytes(storageRef, compressedFile)

      // Étape 3 : Récupérer l'URL de téléchargement
      const downloadURL = await getDownloadURL(storageRef)

      // Étape 4 : Mettre à jour la valeur du formulaire
      form.setValue('emergencyContact.documentPhotoUrl', downloadURL, { shouldValidate: true })

      toast.success('Photo uploadée avec succès!', {
        description: `Taille réduite de ${originalSize} à ${compressedSize}`,
        duration: 4000,
      })
    } catch (error) {
      console.error('Erreur lors du traitement:', error)
      toast.error('Erreur lors de l\'upload de la photo', {
        description: error instanceof Error ? error.message : 'Une erreur inattendue s\'est produite',
      })
    } finally {
      setIsCompressing(false)
      setIsUploading(false)
    }
  }

  const handleRemovePhoto = () => {
    form.setValue('emergencyContact.documentPhotoUrl', '', { shouldValidate: true })
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="contact-lastName">
          Nom du contact <span className="text-red-500">*</span>
        </Label>
        <Input
          id="contact-lastName"
          {...form.register('emergencyContact.lastName', { required: 'Le nom est requis' })}
        />
      </div>

      <div>
        <Label htmlFor="contact-firstName">Prénom du contact</Label>
        <Input id="contact-firstName" {...form.register('emergencyContact.firstName')} />
      </div>

      <div>
        <Label htmlFor="contact-phone1">
          Téléphone principal <span className="text-red-500">*</span>
        </Label>
        <Input
          id="contact-phone1"
          {...form.register('emergencyContact.phone1', { required: 'Le téléphone est requis' })}
        />
      </div>

      <div>
        <Label htmlFor="contact-relationship">
          Lien avec le demandeur <span className="text-red-500">*</span>
        </Label>
        <Input
          id="contact-relationship"
          {...form.register('emergencyContact.relationship', { required: 'Le lien est requis' })}
          placeholder="Ex: Frère, Sœur, Ami..."
        />
      </div>

      <div>
        <Label htmlFor="contact-typeId">
          Type de pièce d'identité <span className="text-red-500">*</span>
        </Label>
        <Select
          value={form.watch('emergencyContact.typeId')}
          onValueChange={(value) => form.setValue('emergencyContact.typeId', value)}
        >
          <SelectTrigger id="contact-typeId">
            <SelectValue placeholder="Sélectionner" />
          </SelectTrigger>
          <SelectContent>
            {DOCUMENT_TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="contact-idNumber">
          Numéro de pièce <span className="text-red-500">*</span>
        </Label>
        <Input
          id="contact-idNumber"
          {...form.register('emergencyContact.idNumber', { required: 'Le numéro est requis' })}
        />
      </div>

      <div>
        <Label htmlFor="contact-photo">
          Photo de la pièce d'identité <span className="text-red-500">*</span>
        </Label>
        <div className="space-y-2">
          <Input
            ref={fileInputRef}
            id="contact-photo"
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={isUploading || isCompressing}
            className="hidden"
            data-testid="step3-document-photo-input"
          />
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || isCompressing}
              className="w-full sm:w-auto"
            >
              {isCompressing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Compression...
                </>
              ) : isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Upload...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  {documentPhotoUrl ? 'Remplacer la photo' : 'Sélectionner une photo'}
                </>
              )}
            </Button>
            {documentPhotoUrl && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleRemovePhoto}
                disabled={isUploading || isCompressing}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
          {documentPhotoUrl && (
            <div className="mt-2">
              <img
                src={documentPhotoUrl}
                alt="Photo pièce identité"
                className="max-w-full h-auto max-h-48 rounded-lg border"
              />
            </div>
          )}
          <p className="text-xs text-kara-neutral-500">
            Formats acceptés : JPG, PNG, WEBP (max 10 MB)
          </p>
        </div>
        {form.formState.errors.emergencyContact?.documentPhotoUrl && (
          <p className="text-xs text-red-500 mt-1">
            {form.formState.errors.emergencyContact.documentPhotoUrl.message}
          </p>
        )}
      </div>

      {memberId && (
        <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800">
          ℹ️ Le membre sélectionné ({memberId}) sera automatiquement exclu de la recherche de contact
        </div>
      )}
    </div>
  )
}
