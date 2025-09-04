'use client'

import React, { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  FileText,
  Calendar,
  Camera,
  Upload,
  CheckCircle,
  AlertCircle,
  CreditCard,
  MapPin,
  Loader2
} from 'lucide-react'
import { cn, compressImage, IMAGE_COMPRESSION_PRESETS, getImageInfo } from '@/lib/utils'

interface Step4Props {
  form: any // Type du form de react-hook-form
}

// Options pour les types de documents d'identité
const IDENTITY_DOCUMENT_OPTIONS = [
  { value: 'Passeport', label: 'Passeport' },
  { value: 'Carte de séjour', label: 'Carte de séjour' },
  { value: 'Carte scolaire', label: 'Carte scolaire' },
  { value: 'Carte consulaire', label: 'Carte consulaire' },
  { value: 'NIP', label: 'NIP' },
  { value: 'CNI', label: 'CNI' },
  { value: 'Autre', label: 'Autre' }
]

export default function Step4({ form }: Step4Props) {
  const [frontPhotoPreview, setFrontPhotoPreview] = useState<string | null>(null)
  const [backPhotoPreview, setBackPhotoPreview] = useState<string | null>(null)
  const [isDragOverFront, setIsDragOverFront] = useState(false)
  const [isDragOverBack, setIsDragOverBack] = useState(false)
  const [isCompressingFront, setIsCompressingFront] = useState(false)
  const [isCompressingBack, setIsCompressingBack] = useState(false)
  const [frontCompressionInfo, setFrontCompressionInfo] = useState<string | null>(null)
  const [backCompressionInfo, setBackCompressionInfo] = useState<string | null>(null)
  const [termsAccepted, setTermsAccepted] = useState(false)

  const frontFileInputRef = useRef<HTMLInputElement>(null)
  const backFileInputRef = useRef<HTMLInputElement>(null)

  const { register, watch, setValue, setError, clearErrors, formState: { errors } } = form

  // Watch pour les animations et validation
  const watchedFields = watch([
    'documents.identityDocument',
    'documents.identityDocumentNumber',
    'documents.documentPhotoFront',
    'documents.documentPhotoBack',
    'documents.expirationDate',
    'documents.issuingPlace',
    'documents.issuingDate'
  ])

  // Validation des conditions acceptées
  React.useEffect(() => {
    if (!termsAccepted) {
      setError('documents.termsAccepted', {
        type: 'required',
        message: 'Vous devez accepter les conditions pour continuer'
      })
    } else {
      clearErrors('documents.termsAccepted')
    }
  }, [termsAccepted, setError, clearErrors])

  // Restaurer les previews des photos si elles existent
  React.useEffect(() => {
    const frontPhoto = watch('documents.documentPhotoFront')
    const backPhoto = watch('documents.documentPhotoBack')

    if (frontPhoto && !frontPhotoPreview && typeof frontPhoto === 'string' && frontPhoto.startsWith('data:')) {
      setFrontPhotoPreview(frontPhoto)
    }
    if (backPhoto && !backPhotoPreview && typeof backPhoto === 'string' && backPhoto.startsWith('data:')) {
      setBackPhotoPreview(backPhoto)
    }
  }, [watchedFields[2], watchedFields[3], frontPhotoPreview, backPhotoPreview, watch])

  // Validation en temps réel des champs obligatoires
  React.useEffect(() => {
    const frontPhoto = watch('documents.documentPhotoFront')
    const expirationDate = watch('documents.expirationDate')
    const issuingPlace = watch('documents.issuingPlace')
    const issuingDate = watch('documents.issuingDate')

    // Validation photo recto
    if (!frontPhoto) {
      setError('documents.documentPhotoFront', {
        type: 'required',
        message: 'La photo recto de la pièce d\'identité est requise'
      })
    } else {
      clearErrors('documents.documentPhotoFront')
    }

    // Validation date d'expiration
    if (!expirationDate || expirationDate.trim() === '') {
      setError('documents.expirationDate', {
        type: 'required',
        message: 'La date d\'expiration est requise'
      })
    } else {
      clearErrors('documents.expirationDate')
    }

    // Validation lieu de délivrance
    if (!issuingPlace || issuingPlace.trim() === '') {
      setError('documents.issuingPlace', {
        type: 'required',
        message: 'Le lieu de délivrance est requis'
      })
    } else if (issuingPlace.length < 2) {
      setError('documents.issuingPlace', {
        type: 'minLength',
        message: 'Le lieu de délivrance doit contenir au moins 2 caractères'
      })
    } else {
      clearErrors('documents.issuingPlace')
    }

    // Validation date de délivrance
    if (!issuingDate || issuingDate.trim() === '') {
      setError('documents.issuingDate', {
        type: 'required',
        message: 'La date de délivrance est requise'
      })
    } else {
      clearErrors('documents.issuingDate')
    }
  }, [
    watchedFields[2],
    watchedFields[4],
    watchedFields[5],
    watchedFields[6],
    setError,
    clearErrors,
    watch
  ])

  // Nettoyer automatiquement les erreurs quand les champs sont corrigés
  React.useEffect(() => {
    const subscription = watch((value: any) => {
      // Nettoyer les erreurs de type de document
      if (value.documents?.identityDocument && errors.documents?.identityDocument) {
        clearErrors('documents.identityDocument')
      }

      // Nettoyer les erreurs de numéro de document
      if (value.documents?.identityDocumentNumber && value.documents.identityDocumentNumber.length >= 2 && errors.documents?.identityDocumentNumber) {
        clearErrors('documents.identityDocumentNumber')
      }

      // Nettoyer les erreurs de photo verso
      if (value.documents?.documentPhotoBack && errors.documents?.documentPhotoBack) {
        clearErrors('documents.documentPhotoBack')
      }
    })

    return () => subscription.unsubscribe()
  }, [watch, clearErrors, errors.documents])

  // Gestion de l'upload des photos avec compression
  const handlePhotoUpload = async (file: File, isBack: boolean = false) => {
    if (file && file.type.startsWith('image/')) {
      // Définir les états de compression
      if (isBack) {
        setIsCompressingBack(true)
        setBackCompressionInfo(null)
      } else {
        setIsCompressingFront(true)
        setFrontCompressionInfo(null)
      }

      try {
        // Compresser l'image en WebP avec le preset document
        const compressedDataUrl = await compressImage(file, IMAGE_COMPRESSION_PRESETS.document)

        // Obtenir les informations sur l'image compressée
        const imageInfo = getImageInfo(compressedDataUrl)

        // Mettre à jour les états selon le type (recto/verso)
        if (isBack) {
          setBackPhotoPreview(compressedDataUrl)
          setValue('documents.documentPhotoBack', compressedDataUrl)
          setBackCompressionInfo(`${imageInfo.format} • ${imageInfo.sizeText}`)
        } else {
          setFrontPhotoPreview(compressedDataUrl)
          setValue('documents.documentPhotoFront', compressedDataUrl)
          clearErrors('documents.documentPhotoFront')
          setFrontCompressionInfo(`${imageInfo.format} • ${imageInfo.sizeText}`)
        }

      } catch (error) {
        console.error('Erreur lors de la compression:', error)
        const fieldName = isBack ? 'documents.documentPhotoBack' : 'documents.documentPhotoFront'
        setError(fieldName, {
          type: 'compression',
          message: 'Erreur lors de la compression de l\'image'
        })
      } finally {
        // Arrêter les états de compression
        if (isBack) {
          setIsCompressingBack(false)
        } else {
          setIsCompressingFront(false)
        }
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isBack: boolean = false) => {
    const file = e.target.files?.[0]
    if (file) handlePhotoUpload(file, isBack)
  }

  const handleDrop = (e: React.DragEvent, isBack: boolean = false) => {
    e.preventDefault()
    if (isBack) {
      setIsDragOverBack(false)
    } else {
      setIsDragOverFront(false)
    }
    const file = e.dataTransfer.files[0]
    if (file) handlePhotoUpload(file, isBack)
  }

  return (
    <div className="space-y-6 sm:space-y-8 w-full max-w-full overflow-x-hidden">
      {/* Header avec animation */}
      <div className="text-center space-y-3 animate-in fade-in-0 slide-in-from-top-4 duration-500 px-2">
        <div className="inline-flex items-center space-x-3 px-5 sm:px-6 py-3 bg-gradient-to-r from-[#224D62]/10 via-[#CBB171]/10 to-[#224D62]/10 rounded-full shadow-lg border border-[#224D62]/20">
          <FileText className="w-6 h-6 text-[#224D62]" />
          <span className="text-[#224D62] font-bold text-base sm:text-lg">Pièces d'identité</span>
        </div>
        <p className="text-[#224D62]/80 text-sm sm:text-base break-words font-medium">
          Téléchargez les photos de votre pièce d'identité et complétez les informations
        </p>
      </div>

      {/* Section principale - Type de document et numéro */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8 w-full">
        {/* Type de pièce d'identité */}
        <div className="space-y-2 animate-in fade-in-0 slide-in-from-left-4 duration-700 w-full min-w-0">
          <Label className="text-xs sm:text-sm font-medium text-[#224D62]">
            Type de pièce d'identité <span className="text-red-500">*</span>
          </Label>
          <Select
            onValueChange={(value) => setValue('documents.identityDocument', value)}
            defaultValue={watch('documents.identityDocument')}
          >
            <SelectTrigger className={cn(
              "border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20 transition-all duration-300 w-full",
              watchedFields[0] && "border-[#CBB171] bg-[#CBB171]/5"
            )}>
              <SelectValue placeholder="Sélectionner le type de document" />
            </SelectTrigger>
            <SelectContent>
              {IDENTITY_DOCUMENT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {watchedFields[0] && (
            <div className="flex items-center space-x-1 text-[#CBB171] text-xs animate-in slide-in-from-left-2 duration-300">
              <CheckCircle className="w-3 h-3" />
              <span>Type sélectionné: {watchedFields[0]}</span>
            </div>
          )}
        </div>

        {/* Numéro de pièce d'identité */}
        <div className="space-y-2 animate-in fade-in-0 slide-in-from-right-4 duration-700 delay-100 w-full min-w-0">
          <Label htmlFor="identityDocumentNumber" className="text-xs sm:text-sm font-medium text-[#224D62]">
            Numéro de pièce d'identité <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171]" />
            <Input
              id="identityDocumentNumber"
              {...register('documents.identityDocumentNumber')}
              placeholder="Numéro de votre pièce d'identité"
              className={cn(
                "pl-10 pr-10 border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20 transition-all duration-300 w-full",
                errors?.documents?.identityDocumentNumber && "border-red-300 focus:border-red-500 bg-red-50/50",
                watchedFields[1] && !errors?.documents?.identityDocumentNumber && "border-[#CBB171] bg-[#CBB171]/5"
              )}
            />
            {watchedFields[1] && !errors?.documents?.identityDocumentNumber && (
              <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171] animate-in zoom-in-50 duration-200" />
            )}
          </div>
          {errors?.documents?.identityDocumentNumber && (
            <div className="flex items-center space-x-1 text-red-500 text-xs animate-in slide-in-from-right-2 duration-300 break-words">
              <AlertCircle className="w-3 h-3" />
              <span>{errors.documents.identityDocumentNumber.message}</span>
            </div>
          )}
        </div>
      </div>

      {/* Section upload des photos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 w-full">
        {/* Photo recto (obligatoire) */}
        <Card className="border-2 border-[#224D62]/20 bg-gradient-to-br from-[#224D62]/5 to-[#CBB171]/5 animate-in fade-in-0 zoom-in-95 duration-700 delay-200">
          <CardHeader className="pb-4">
            <CardTitle className="text-base sm:text-lg text-[#224D62] flex items-center space-x-2">
              <Camera className="w-5 h-5" />
              <span>Photo recto <span className="text-red-500">*</span></span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Zone d'upload recto */}
            <div
              className={cn(
                "relative w-full h-48 sm:h-64 border-2 border-dashed rounded-lg transition-all duration-300 cursor-pointer group",
                isDragOverFront
                  ? "border-[#224D62] bg-[#224D62]/5 shadow-lg scale-105"
                  : "border-[#224D62]/30 hover:border-[#224D62]/50 hover:bg-[#224D62]/5",
                frontPhotoPreview && "border-solid border-[#224D62]/50 bg-[#224D62]/5"
              )}
              onDrop={(e) => handleDrop(e, false)}
              onDragOver={(e) => { e.preventDefault(); setIsDragOverFront(true) }}
              onDragLeave={() => setIsDragOverFront(false)}
              onClick={() => frontFileInputRef.current?.click()}
            >
              {isCompressingFront ? (
                <div className="w-full h-full flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="w-8 h-8 text-[#224D62] animate-spin" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-[#224D62]">Compression en cours...</p>
                    <p className="text-xs text-gray-500">Optimisation de l'image</p>
                  </div>
                </div>
              ) : frontPhotoPreview ? (
                <div className="w-full h-full rounded-lg overflow-hidden relative">
                  <img
                    src={frontPhotoPreview}
                    alt="Pièce d'identité recto"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-gradient-to-r from-[#CBB171] to-[#224D62] text-white text-xs">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Ajoutée
                    </Badge>
                  </div>
                  {frontCompressionInfo && (
                    <div className="absolute top-2 left-2">
                      <Badge variant="secondary" className="bg-white/90 text-[#224D62] text-xs">
                        {frontCompressionInfo}
                      </Badge>
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 right-2 flex space-x-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="flex-1 bg-white/90 text-[#224D62] hover:bg-white"
                      onClick={(e) => {
                        e.stopPropagation()
                        frontFileInputRef.current?.click()
                      }}
                    >
                      <Upload className="w-3 h-3 mr-1" />
                      Changer
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center space-y-3 group-hover:scale-105 transition-transform">
                  <Upload className="w-8 h-8 sm:w-12 sm:h-12 text-[#224D62]/60" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-[#224D62]">Télécharger la photo recto</p>
                    <p className="text-xs text-gray-500 mt-1">PNG, JPG, WebP → Optimisé automatiquement</p>
                  </div>
                </div>
              )}
              <input
                ref={frontFileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e, false)}
                className="hidden"
              />
            </div>
            {errors?.documents?.documentPhotoFront && (
              <div className="flex items-center space-x-1 text-red-500 text-xs animate-in slide-in-from-top-2 duration-300">
                <AlertCircle className="w-4 h-4" />
                <span>{errors.documents.documentPhotoFront.message}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Photo verso (optionnelle) */}
        <Card className="border-2 border-[#CBB171]/20 bg-gradient-to-br from-[#CBB171]/5 to-[#224D62]/5 animate-in fade-in-0 zoom-in-95 duration-700 delay-300">
          <CardHeader className="pb-4">
            <CardTitle className="text-base sm:text-lg text-[#224D62] flex items-center space-x-2">
              <Camera className="w-5 h-5" />
              <span>Photo verso</span>
              <Badge variant="secondary" className="ml-2 bg-[#CBB171]/10 text-[#CBB171] text-[10px] sm:text-xs">
                Optionnel
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Zone d'upload verso */}
            <div
              className={cn(
                "relative w-full h-48 sm:h-64 border-2 border-dashed rounded-lg transition-all duration-300 cursor-pointer group",
                isDragOverBack
                  ? "border-[#CBB171] bg-[#CBB171]/5 shadow-lg scale-105"
                  : "border-[#CBB171]/30 hover:border-[#CBB171]/50 hover:bg-[#CBB171]/5",
                backPhotoPreview && "border-solid border-[#CBB171]/50 bg-[#CBB171]/5"
              )}
              onDrop={(e) => handleDrop(e, true)}
              onDragOver={(e) => { e.preventDefault(); setIsDragOverBack(true) }}
              onDragLeave={() => setIsDragOverBack(false)}
              onClick={() => backFileInputRef.current?.click()}
            >
              {isCompressingBack ? (
                <div className="w-full h-full flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="w-8 h-8 text-[#CBB171] animate-spin" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-[#224D62]">Compression en cours...</p>
                    <p className="text-xs text-gray-500">Optimisation de l'image</p>
                  </div>
                </div>
              ) : backPhotoPreview ? (
                <div className="w-full h-full rounded-lg overflow-hidden relative">
                  <img
                    src={backPhotoPreview}
                    alt="Pièce d'identité verso"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-gradient-to-r from-[#224D62] to-[#CBB171] text-white text-xs">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Ajoutée
                    </Badge>
                  </div>
                  {backCompressionInfo && (
                    <div className="absolute top-2 left-2">
                      <Badge variant="secondary" className="bg-white/90 text-[#224D62] text-xs">
                        {backCompressionInfo}
                      </Badge>
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 right-2 flex space-x-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="flex-1 bg-white/90 text-[#224D62] hover:bg-white"
                      onClick={(e) => {
                        e.stopPropagation()
                        backFileInputRef.current?.click()
                      }}
                    >
                      <Upload className="w-3 h-3 mr-1" />
                      Changer
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center space-y-3 group-hover:scale-105 transition-transform">
                  <Upload className="w-8 h-8 sm:w-12 sm:h-12 text-[#CBB171]/60" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-[#224D62]">Télécharger la photo verso</p>
                    <p className="text-xs text-gray-500 mt-1">PNG, JPG, WebP → Optimisé automatiquement</p>
                  </div>
                </div>
              )}
              <input
                ref={backFileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e, true)}
                className="hidden"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Informations complémentaires du document */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 w-full">
        {/* Date de délivrance */}
        <div className="w-full max-w-md">
          <div className="space-y-2 animate-in fade-in-0 slide-in-from-left-4 duration-700 delay-600 w-full min-w-0">
            <Label htmlFor="issuingDate" className="text-xs sm:text-sm font-medium text-[#224D62]">
              Date de délivrance <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171]" />
              <Input
                id="issuingDate"
                type="date"
                {...register('documents.issuingDate')}
                className={cn(
                  "pl-10 border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20 transition-all duration-300 w-full",
                  errors?.documents?.issuingDate && "border-red-300 focus:border-red-500 bg-red-50/50",
                  watchedFields[6] && !errors?.documents?.issuingDate && "border-[#CBB171]/50 bg-[#CBB171]/5"
                )}
              />
            </div>
            {watchedFields[6] && !errors?.documents?.issuingDate && (
              <div className="flex items-center space-x-1 text-[#CBB171] text-xs animate-in slide-in-from-left-2 duration-300">
                <CheckCircle className="w-3 h-3" />
                <span>Date de délivrance ajoutée</span>
              </div>
            )}
            {errors?.documents?.issuingDate && (
              <div className="flex items-center space-x-1 text-red-500 text-xs animate-in slide-in-from-left-2 duration-300">
                <AlertCircle className="w-3 h-3" />
                <span>{errors.documents.issuingDate.message}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Date d'expiration */}
        <div className="space-y-2 animate-in fade-in-0 slide-in-from-left-4 duration-700 delay-400 w-full min-w-0">
          <Label htmlFor="expirationDate" className="text-xs sm:text-sm font-medium text-[#224D62]">
            Date d'expiration <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171]" />
            <Input
              id="expirationDate"
              type="date"
              {...register('documents.expirationDate')}
              className={cn(
                "pl-10 border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20 transition-all duration-300 w-full",
                errors?.documents?.expirationDate && "border-red-300 focus:border-red-500 bg-red-50/50",
                watchedFields[4] && !errors?.documents?.expirationDate && "border-[#CBB171]/50 bg-[#CBB171]/5"
              )}
            />
          </div>
          {watchedFields[4] && !errors?.documents?.expirationDate && (
            <div className="flex items-center space-x-1 text-[#CBB171] text-xs animate-in slide-in-from-left-2 duration-300">
              <CheckCircle className="w-3 h-3" />
              <span>Date d'expiration ajoutée</span>
            </div>
          )}
          {errors?.documents?.expirationDate && (
            <div className="flex items-center space-x-1 text-red-500 text-xs animate-in slide-in-from-left-2 duration-300">
              <AlertCircle className="w-3 h-3" />
              <span>{errors.documents.expirationDate.message}</span>
            </div>
          )}
        </div>

        {/* Lieu de délivrance */}
        <div className="space-y-2 animate-in fade-in-0 slide-in-from-right-4 duration-700 delay-500 w-full min-w-0">
          <Label htmlFor="issuingPlace" className="text-xs sm:text-sm font-medium text-[#224D62]">
            Lieu de délivrance <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171]" />
            <Input
              id="issuingPlace"
              {...register('documents.issuingPlace')}
              placeholder="Ex: Libreville, France..."
              className={cn(
                "pl-10 border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20 transition-all duration-300 w-full",
                errors?.documents?.issuingPlace && "border-red-300 focus:border-red-500 bg-red-50/50",
                watchedFields[5] && !errors?.documents?.issuingPlace && "border-[#CBB171]/50 bg-[#CBB171]/5"
              )}
            />
          </div>
          {watchedFields[5] && !errors?.documents?.issuingPlace && (
            <div className="flex items-center space-x-1 text-[#CBB171] text-xs animate-in slide-in-from-right-2 duration-300">
              <CheckCircle className="w-3 h-3" />
              <span>Lieu de délivrance ajouté</span>
            </div>
          )}
          {errors?.documents?.issuingPlace && (
            <div className="flex items-center space-x-1 text-red-500 text-xs animate-in slide-in-from-right-2 duration-300">
              <AlertCircle className="w-3 h-3" />
              <span>{errors.documents.issuingPlace.message}</span>
            </div>
          )}
        </div>
      </div>

      {/* Résumé du document et validation */}
      <Card className="border border-[#224D62]/20 bg-gradient-to-r from-[#224D62]/5 to-[#CBB171]/5 animate-in fade-in-0 slide-in-from-bottom-4 duration-700 w-full">
        <CardContent className="p-4 sm:p-6 w-full">
          <div className="flex items-start space-x-4 w-full min-w-0">
            <FileText className="w-6 h-6 text-[#224D62] mt-1 flex-shrink-0" />
            <div className="space-y-3 min-w-0 flex-1">
              <p className="text-sm sm:text-base font-medium text-[#224D62]">État de validation du document</p>

              {/* Grille des validations */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                {/* Photo recto */}
                <div className="flex items-center space-x-2">
                  {frontPhotoPreview ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  )}
                  <span className={frontPhotoPreview ? "text-green-600" : "text-red-600"}>
                    Photo recto {frontPhotoPreview ? "✓" : "(requis)"}
                  </span>
                </div>

                {/* Date d'expiration */}
                <div className="flex items-center space-x-2">
                  {watchedFields[4] && !errors?.documents?.expirationDate ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  )}
                  <span className={watchedFields[4] && !errors?.documents?.expirationDate ? "text-green-600" : "text-red-600"}>
                    Date d'expiration {watchedFields[4] && !errors?.documents?.expirationDate ? "✓" : "(requis)"}
                  </span>
                </div>

                {/* Lieu de délivrance */}
                <div className="flex items-center space-x-2">
                  {watchedFields[5] && !errors?.documents?.issuingPlace ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  )}
                  <span className={watchedFields[5] && !errors?.documents?.issuingPlace ? "text-green-600" : "text-red-600"}>
                    Lieu de délivrance {watchedFields[5] && !errors?.documents?.issuingPlace ? "✓" : "(requis)"}
                  </span>
                </div>

                {/* Date de délivrance */}
                <div className="flex items-center space-x-2">
                  {watchedFields[6] && !errors?.documents?.issuingDate ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  )}
                  <span className={watchedFields[6] && !errors?.documents?.issuingDate ? "text-green-600" : "text-red-600"}>
                    Date de délivrance {watchedFields[6] && !errors?.documents?.issuingDate ? "✓" : "(requis)"}
                  </span>
                </div>
              </div>

              {/* Informations du document si disponibles */}
              {(watchedFields[0] || watchedFields[1]) && (
                <div className="pt-3 border-t border-[#224D62]/10">
                  <p className="text-xs text-gray-500 mb-2">Informations du document:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600">
                    {watchedFields[0] && (
                      <div>
                        <span className="font-medium">Type:</span> {watchedFields[0]}
                      </div>
                    )}
                    {watchedFields[1] && (
                      <div className="truncate">
                        <span className="font-medium">Numéro:</span> {watchedFields[1]}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Message d'erreur si des champs sont manquants */}
      {(!frontPhotoPreview || !watchedFields[4] || !watchedFields[5] || !watchedFields[6] || !termsAccepted ||
        errors?.documents?.expirationDate || errors?.documents?.issuingPlace || errors?.documents?.issuingDate || errors?.documents?.termsAccepted) && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg animate-in fade-in-0 slide-in-from-top-2 duration-300 w-full">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-red-800 mb-1">Champs obligatoires manquants</h3>
                <p className="text-sm text-red-600">
                  Veuillez remplir tous les champs obligatoires avant de finaliser votre demande d'adhésion.
                </p>
              </div>
            </div>
          </div>
        )}

      {/* Checkbox Lu et approuvé */}
      <Card className="border border-[#224D62]/20 bg-gradient-to-r from-[#224D62]/5 to-[#CBB171]/5 animate-in fade-in-0 slide-in-from-bottom-4 duration-700 delay-700 w-full">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="termsAccepted"
              checked={termsAccepted}
              onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
              className="mt-1"
            />
            <div className="space-y-2">
              <Label htmlFor="termsAccepted" className="text-sm sm:text-base font-medium text-[#224D62] cursor-pointer">
                Lu et approuvé
              </Label>
              <p className="text-sm text-[#224D62]/80">
                Je confirme avoir lu et approuvé les conditions d'utilisation et la politique de confidentialité. 
                J'accepte que mes documents d'identité soient utilisés uniquement pour la vérification de mon identité 
                et stockés de manière sécurisée.
              </p>
            </div>
          </div>
          {errors?.documents?.termsAccepted && (
            <div className="flex items-center space-x-1 text-red-500 text-xs mt-2 animate-in slide-in-from-top-2 duration-300">
              <AlertCircle className="w-3 h-3" />
              <span>{errors.documents.termsAccepted.message}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Message final */}
      <div className="text-center p-4 sm:p-6 bg-gradient-to-r from-[#224D62]/5 via-[#CBB171]/5 to-[#224D62]/10 rounded-xl border border-[#224D62]/20 animate-in fade-in-0 slide-in-from-bottom-4 duration-700 delay-800 w-full max-w-full break-words shadow-lg">
        <div className="flex items-center justify-center space-x-3">
          <FileText className="w-6 h-6 text-[#CBB171]" />
          <p className="text-sm sm:text-base text-[#224D62] font-bold">
            <strong>Sécurité :</strong> Vos documents d'identité sont stockés de manière sécurisée et utilisés uniquement pour la vérification de votre identité
          </p>
        </div>
      </div>
    </div>
  )
}