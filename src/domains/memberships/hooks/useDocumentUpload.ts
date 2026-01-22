/**
 * Hook pour gérer l'upload et la compression des documents d'identité
 * 
 * Ce hook centralise la logique de :
 * - Compression d'images (WebP)
 * - Gestion des previews
 * - Gestion des états de chargement
 * - Gestion des erreurs
 * - Drag & drop
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { RegisterFormData } from '@/schemas/schemas'
import { compressImage, IMAGE_COMPRESSION_PRESETS, getImageInfo } from '@/lib/utils'

export interface UseDocumentUploadOptions {
  /**
   * Le formulaire react-hook-form
   */
  form: UseFormReturn<RegisterFormData>
  
  /**
   * Type de document : 'front' pour recto, 'back' pour verso
   */
  documentType: 'front' | 'back'
}

export interface UseDocumentUploadReturn {
  /**
   * URL de preview de l'image (data URL)
   */
  preview: string | null
  
  /**
   * État de compression en cours
   */
  isCompressing: boolean
  
  /**
   * Informations de compression (format, taille)
   */
  compressionInfo: string | null
  
  /**
   * État de drag over
   */
  isDragOver: boolean
  
  /**
   * Référence vers l'input file
   */
  fileInputRef: React.RefObject<HTMLInputElement | null>
  
  /**
   * Gérer l'upload d'un fichier
   */
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  
  /**
   * Gérer le drop d'un fichier
   */
  handleDrop: (e: React.DragEvent) => void
  
  /**
   * Gérer le drag over
   */
  handleDragOver: (e: React.DragEvent) => void
  
  /**
   * Gérer le drag leave
   */
  handleDragLeave: () => void
  
  /**
   * Ouvrir le sélecteur de fichier
   */
  openFileSelector: () => void
  
  /**
   * Réinitialiser le document
   */
  reset: () => void
}

/**
 * Hook pour gérer l'upload et la compression des documents d'identité
 * 
 * @example
 * ```tsx
 * const {
 *   preview,
 *   isCompressing,
 *   compressionInfo,
 *   isDragOver,
 *   fileInputRef,
 *   handleFileChange,
 *   handleDrop,
 *   handleDragOver,
 *   handleDragLeave,
 *   openFileSelector,
 *   reset
 * } = useDocumentUpload({ form, documentType: 'front' })
 * ```
 */
export function useDocumentUpload({ 
  form, 
  documentType 
}: UseDocumentUploadOptions): UseDocumentUploadReturn {
  const { watch, setValue, setError, clearErrors } = form
  
  const [preview, setPreview] = useState<string | null>(null)
  const [isCompressing, setIsCompressing] = useState(false)
  const [compressionInfo, setCompressionInfo] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  
  const fieldName = documentType === 'front' 
    ? 'documents.documentPhotoFront' 
    : 'documents.documentPhotoBack'
  
  // Restaurer la preview si elle existe dans le formulaire
  const existingPhoto = watch(fieldName)
  useEffect(() => {
    if (existingPhoto && !preview && typeof existingPhoto === 'string' && existingPhoto.startsWith('data:')) {
      setPreview(existingPhoto)
    }
  }, [existingPhoto, preview])
  
  /**
   * Gérer l'upload et la compression d'un fichier
   */
  const handlePhotoUpload = useCallback(async (file: File) => {
    if (!file || !file.type.startsWith('image/')) {
      setError(fieldName as any, {
        type: 'invalid',
        message: 'Le fichier doit être une image'
      })
      return
    }
    
    setIsCompressing(true)
    setCompressionInfo(null)
    
    try {
      // Compresser l'image en WebP avec le preset document
      const compressedDataUrl = await compressImage(file, IMAGE_COMPRESSION_PRESETS.document)
      
      // Obtenir les informations sur l'image compressée
      const imageInfo = getImageInfo(compressedDataUrl)
      
      // Mettre à jour les états
      setPreview(compressedDataUrl)
      setValue(fieldName as any, compressedDataUrl, { shouldValidate: true })
      setCompressionInfo(`${imageInfo.format} • ${imageInfo.sizeText}`)
      
      // Nettoyer les erreurs
      if (documentType === 'front') {
        clearErrors('documents.documentPhotoFront')
      }
      
    } catch (error) {
      console.error('Erreur lors de la compression:', error)
      setError(fieldName as any, {
        type: 'compression',
        message: 'Erreur lors de la compression de l\'image'
      })
    } finally {
      setIsCompressing(false)
    }
  }, [fieldName, documentType, setValue, setError, clearErrors])
  
  /**
   * Gérer le changement de fichier via l'input
   */
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handlePhotoUpload(file)
    }
  }, [handlePhotoUpload])
  
  /**
   * Gérer le drop d'un fichier
   */
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      handlePhotoUpload(file)
    }
  }, [handlePhotoUpload])
  
  /**
   * Gérer le drag over
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])
  
  /**
   * Gérer le drag leave
   */
  const handleDragLeave = useCallback(() => {
    setIsDragOver(false)
  }, [])
  
  /**
   * Ouvrir le sélecteur de fichier
   */
  const openFileSelector = useCallback(() => {
    fileInputRef.current?.click()
  }, [])
  
  /**
   * Réinitialiser le document
   */
  const reset = useCallback(() => {
    setPreview(null)
    setCompressionInfo(null)
    setIsCompressing(false)
    setIsDragOver(false)
    setValue(fieldName as any, '', { shouldValidate: true })
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [fieldName, setValue])
  
  return {
    preview,
    isCompressing,
    compressionInfo,
    isDragOver,
    fileInputRef,
    handleFileChange,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    openFileSelector,
    reset,
  }
}
