'use client'

import { useState } from 'react'
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
import { cn } from '@/lib/utils'
import { useDocumentUpload } from '@/domains/memberships/hooks/useDocumentUpload'
import { useStep4Validation } from '@/domains/memberships/hooks/useStep4Validation'
import { DOCUMENT_TYPE_OPTIONS } from '@/domains/infrastructure/documents/constants/document-types'

interface Step4Props {
  form: any // Type du form de react-hook-form
}

export default function Step4({ form }: Step4Props) {
  const [termsAccepted, setTermsAccepted] = useState(false)

  const { register, watch, setValue, formState: { errors } } = form

  // Utiliser les hooks centralisés pour l'upload des documents
  const frontUpload = useDocumentUpload({ form, documentType: 'front' })
  const backUpload = useDocumentUpload({ form, documentType: 'back' })

  // Utiliser le hook centralisé pour la validation
  useStep4Validation({ form, termsAccepted })

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

  // L'upload est géré par useDocumentUpload

  return (
    <div className="space-y-6 sm:space-y-8 w-full max-w-full overflow-x-hidden">
      {/* Header avec animation */}
      <div className="text-center space-y-3 animate-in fade-in-0 slide-in-from-top-4 duration-500 px-2">
        <div className="inline-flex items-center space-x-3 px-5 sm:px-6 py-3 bg-linear-to-r from-kara-primary-dark/10 via-kara-primary-light/10 to-kara-primary-dark/10 rounded-full shadow-lg border border-kara-primary-dark/20">
          <FileText className="w-6 h-6 text-kara-primary-dark" />
          <span className="text-kara-primary-dark font-bold text-base sm:text-lg">Pièces d'identité</span>
        </div>
        <p className="text-kara-primary-dark/80 text-sm sm:text-base wrap-break-word font-medium">
          Téléchargez les photos de votre pièce d'identité et complétez les informations
        </p>
      </div>

      {/* Section principale - Type de document et numéro */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8 w-full">
        {/* Type de pièce d'identité */}
        <div className="space-y-2 animate-in fade-in-0 slide-in-from-left-4 duration-700 w-full min-w-0">
          <Label className="text-xs sm:text-sm font-medium text-kara-primary-dark">
            Type de pièce d'identité <span className="text-red-500">*</span>
          </Label>
          <Select
            onValueChange={(value) => setValue('documents.identityDocument', value)}
            defaultValue={watch('documents.identityDocument')}
          >
            <SelectTrigger className={cn(
              "border-kara-primary-light/30 focus:border-kara-primary-dark focus:ring-kara-primary-dark/20 transition-all duration-300 w-full",
              watchedFields[0] && "border-kara-primary-light bg-kara-primary-light/5"
            )}>
              <SelectValue placeholder="Sélectionner le type de document" />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {watchedFields[0] && (
            <div className="flex items-center space-x-1 text-kara-primary-light text-xs animate-in slide-in-from-left-2 duration-300">
              <CheckCircle className="w-3 h-3" />
              <span>Type sélectionné: {watchedFields[0]}</span>
            </div>
          )}
        </div>

        {/* Numéro de pièce d'identité */}
        <div className="space-y-2 animate-in fade-in-0 slide-in-from-right-4 duration-700 delay-100 w-full min-w-0">
          <Label htmlFor="identityDocumentNumber" className="text-xs sm:text-sm font-medium text-kara-primary-dark">
            Numéro de pièce d'identité <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-kara-primary-light" />
            <Input
              id="identityDocumentNumber"
              {...register('documents.identityDocumentNumber')}
              placeholder="Numéro de votre pièce d'identité"
              className={cn(
                "pl-10 pr-10 border-kara-primary-light/30 focus:border-kara-primary-dark focus:ring-kara-primary-dark/20 transition-all duration-300 w-full",
                errors?.documents?.identityDocumentNumber && "border-red-300 focus:border-red-500 bg-red-50/50",
                watchedFields[1] && !errors?.documents?.identityDocumentNumber && "border-kara-primary-light bg-kara-primary-light/5"
              )}
            />
            {watchedFields[1] && !errors?.documents?.identityDocumentNumber && (
              <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-kara-primary-light animate-in zoom-in-50 duration-200" />
            )}
          </div>
          {errors?.documents?.identityDocumentNumber && (
            <div className="flex items-center space-x-1 text-red-500 text-xs animate-in slide-in-from-right-2 duration-300 wrap-break-word">
              <AlertCircle className="w-3 h-3" />
              <span>{errors.documents.identityDocumentNumber.message}</span>
            </div>
          )}
        </div>
      </div>

      {/* Section upload des photos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 w-full">
        {/* Photo recto (obligatoire) */}
        <Card className="border-2 border-kara-primary-dark/20 bg-linear-to-br from-kara-primary-dark/5 to-kara-primary-light/5 animate-in fade-in-0 zoom-in-95 duration-700 delay-200">
          <CardHeader className="pb-4">
            <CardTitle className="text-base sm:text-lg text-kara-primary-dark flex items-center space-x-2">
              <Camera className="w-5 h-5" />
              <span>Photo recto <span className="text-red-500">*</span></span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Zone d'upload recto */}
            <div
              className={cn(
                "relative w-full h-48 sm:h-64 border-2 border-dashed rounded-lg transition-all duration-300 cursor-pointer group",
                frontUpload.isDragOver
                  ? "border-kara-primary-dark bg-kara-primary-dark/5 shadow-lg scale-105"
                  : "border-kara-primary-dark/30 hover:border-kara-primary-dark/50 hover:bg-kara-primary-dark/5",
                frontUpload.preview && "border-solid border-kara-primary-dark/50 bg-kara-primary-dark/5"
              )}
              onDrop={frontUpload.handleDrop}
              onDragOver={frontUpload.handleDragOver}
              onDragLeave={frontUpload.handleDragLeave}
              onClick={frontUpload.openFileSelector}
            >
              {frontUpload.isCompressing ? (
                <div className="w-full h-full flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="w-8 h-8 text-kara-primary-dark animate-spin" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-kara-primary-dark">Compression en cours...</p>
                    <p className="text-xs text-gray-500">Optimisation de l'image</p>
                  </div>
                </div>
              ) : frontUpload.preview ? (
                <div className="w-full h-full rounded-lg overflow-hidden relative">
                  <img
                    src={frontUpload.preview}
                    alt="Pièce d'identité recto"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-linear-to-r from-kara-primary-light to-kara-primary-dark text-white text-xs">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Ajoutée
                    </Badge>
                  </div>
                  {frontUpload.compressionInfo && (
                    <div className="absolute top-2 left-2">
                      <Badge variant="secondary" className="bg-white/90 text-kara-primary-dark text-xs">
                        {frontUpload.compressionInfo}
                      </Badge>
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 right-2 flex space-x-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="flex-1 bg-white/90 text-kara-primary-dark hover:bg-white"
                      onClick={(e) => {
                        e.stopPropagation()
                        frontUpload.openFileSelector()
                      }}
                    >
                      <Upload className="w-3 h-3 mr-1" />
                      Changer
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center space-y-3 group-hover:scale-105 transition-transform">
                  <Upload className="w-8 h-8 sm:w-12 sm:h-12 text-kara-primary-dark/60" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-kara-primary-dark">Télécharger la photo recto</p>
                    <p className="text-xs text-gray-500 mt-1">PNG, JPG, WebP → Optimisé automatiquement</p>
                  </div>
                </div>
              )}
              <input
                ref={frontUpload.fileInputRef}
                type="file"
                accept="image/*"
                onChange={frontUpload.handleFileChange}
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
        <Card className="border-2 border-kara-primary-light/20 bg-linear-to-br from-kara-primary-light/5 to-kara-primary-dark/5 animate-in fade-in-0 zoom-in-95 duration-700 delay-300">
          <CardHeader className="pb-4">
            <CardTitle className="text-base sm:text-lg text-kara-primary-dark flex items-center space-x-2">
              <Camera className="w-5 h-5" />
              <span>Photo verso</span>
              <Badge variant="secondary" className="ml-2 bg-kara-primary-light/10 text-kara-primary-light text-[10px] sm:text-xs">
                Optionnel
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Zone d'upload verso */}
            <div
              className={cn(
                "relative w-full h-48 sm:h-64 border-2 border-dashed rounded-lg transition-all duration-300 cursor-pointer group",
                backUpload.isDragOver
                  ? "border-kara-primary-light bg-kara-primary-light/5 shadow-lg scale-105"
                  : "border-kara-primary-light/30 hover:border-kara-primary-light/50 hover:bg-kara-primary-light/5",
                backUpload.preview && "border-solid border-kara-primary-light/50 bg-kara-primary-light/5"
              )}
              onDrop={backUpload.handleDrop}
              onDragOver={backUpload.handleDragOver}
              onDragLeave={backUpload.handleDragLeave}
              onClick={backUpload.openFileSelector}
            >
              {backUpload.isCompressing ? (
                <div className="w-full h-full flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="w-8 h-8 text-kara-primary-light animate-spin" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-kara-primary-dark">Compression en cours...</p>
                    <p className="text-xs text-gray-500">Optimisation de l'image</p>
                  </div>
                </div>
              ) : backUpload.preview ? (
                <div className="w-full h-full rounded-lg overflow-hidden relative">
                  <img
                    src={backUpload.preview}
                    alt="Pièce d'identité verso"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-linear-to-r from-kara-primary-dark to-kara-primary-light text-white text-xs">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Ajoutée
                    </Badge>
                  </div>
                  {backUpload.compressionInfo && (
                    <div className="absolute top-2 left-2">
                      <Badge variant="secondary" className="bg-white/90 text-kara-primary-dark text-xs">
                        {backUpload.compressionInfo}
                      </Badge>
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 right-2 flex space-x-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="flex-1 bg-white/90 text-kara-primary-dark hover:bg-white"
                      onClick={(e) => {
                        e.stopPropagation()
                        backUpload.openFileSelector()
                      }}
                    >
                      <Upload className="w-3 h-3 mr-1" />
                      Changer
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center space-y-3 group-hover:scale-105 transition-transform">
                  <Upload className="w-8 h-8 sm:w-12 sm:h-12 text-kara-primary-light/60" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-kara-primary-dark">Télécharger la photo verso</p>
                    <p className="text-xs text-gray-500 mt-1">PNG, JPG, WebP → Optimisé automatiquement</p>
                  </div>
                </div>
              )}
              <input
                ref={backUpload.fileInputRef}
                type="file"
                accept="image/*"
                onChange={backUpload.handleFileChange}
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
            <Label htmlFor="issuingDate" className="text-xs sm:text-sm font-medium text-kara-primary-dark">
              Date de délivrance <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-kara-primary-light" />
              <Input
                id="issuingDate"
                type="date"
                {...register('documents.issuingDate')}
                className={cn(
                  "pl-10 border-kara-primary-light/30 focus:border-kara-primary-dark focus:ring-kara-primary-dark/20 transition-all duration-300 w-full",
                  errors?.documents?.issuingDate && "border-red-300 focus:border-red-500 bg-red-50/50",
                  watchedFields[6] && !errors?.documents?.issuingDate && "border-kara-primary-light/50 bg-kara-primary-light/5"
                )}
              />
            </div>
            {watchedFields[6] && !errors?.documents?.issuingDate && (
              <div className="flex items-center space-x-1 text-kara-primary-light text-xs animate-in slide-in-from-left-2 duration-300">
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
          <Label htmlFor="expirationDate" className="text-xs sm:text-sm font-medium text-kara-primary-dark">
            Date d'expiration <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-kara-primary-light" />
            <Input
              id="expirationDate"
              type="date"
              {...register('documents.expirationDate')}
              className={cn(
                "pl-10 border-kara-primary-light/30 focus:border-kara-primary-dark focus:ring-kara-primary-dark/20 transition-all duration-300 w-full",
                errors?.documents?.expirationDate && "border-red-300 focus:border-red-500 bg-red-50/50",
                watchedFields[4] && !errors?.documents?.expirationDate && "border-kara-primary-light/50 bg-kara-primary-light/5"
              )}
            />
          </div>
          {watchedFields[4] && !errors?.documents?.expirationDate && (
            <div className="flex items-center space-x-1 text-kara-primary-light text-xs animate-in slide-in-from-left-2 duration-300">
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
          <Label htmlFor="issuingPlace" className="text-xs sm:text-sm font-medium text-kara-primary-dark">
            Lieu de délivrance <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-kara-primary-light" />
            <Input
              id="issuingPlace"
              {...register('documents.issuingPlace')}
              placeholder="Ex: Libreville, Gabon..."
              className={cn(
                "pl-10 border-kara-primary-light/30 focus:border-kara-primary-dark focus:ring-kara-primary-dark/20 transition-all duration-300 w-full",
                errors?.documents?.issuingPlace && "border-red-300 focus:border-red-500 bg-red-50/50",
                watchedFields[5] && !errors?.documents?.issuingPlace && "border-kara-primary-light/50 bg-kara-primary-light/5"
              )}
            />
          </div>
          {watchedFields[5] && !errors?.documents?.issuingPlace && (
            <div className="flex items-center space-x-1 text-kara-primary-light text-xs animate-in slide-in-from-right-2 duration-300">
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
      <Card className="border border-kara-primary-dark/20 bg-linear-to-r from-kara-primary-dark/5 to-kara-primary-light/5 animate-in fade-in-0 slide-in-from-bottom-4 duration-700 w-full">
        <CardContent className="p-4 sm:p-6 w-full">
          <div className="flex items-start space-x-4 w-full min-w-0">
            <FileText className="w-6 h-6 text-kara-primary-dark mt-1 shrink-0" />
            <div className="space-y-3 min-w-0 flex-1">
              <p className="text-sm sm:text-base font-medium text-kara-primary-dark">État de validation du document</p>

              {/* Grille des validations */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                {/* Photo recto */}
                <div className="flex items-center space-x-2">
                  {frontUpload.preview ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  )}
                  <span className={frontUpload.preview ? "text-green-600" : "text-red-600"}>
                    Photo recto {frontUpload.preview ? "✓" : "(requis)"}
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
                <div className="pt-3 border-t border-kara-primary-dark/10">
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
      {(!frontUpload.preview || !watchedFields[4] || !watchedFields[5] || !watchedFields[6] || !termsAccepted ||
        errors?.documents?.expirationDate || errors?.documents?.issuingPlace || errors?.documents?.issuingDate || errors?.documents?.termsAccepted) && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg animate-in fade-in-0 slide-in-from-top-2 duration-300 w-full">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
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
      <Card className={cn(
        "border-2 animate-in fade-in-0 slide-in-from-bottom-4 duration-700 delay-700 w-full transition-all",
        termsAccepted 
          ? "border-green-500 bg-linear-to-r from-green-50 to-green-100 shadow-lg" 
          : "border-red-300 bg-linear-to-r from-red-50 to-red-100"
      )}>
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-start space-x-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="termsAccepted"
                checked={termsAccepted}
                onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                className={cn(
                  "w-5 h-5 border-2 transition-all duration-200",
                  termsAccepted 
                    ? "border-green-600 bg-green-600 text-white" 
                    : "border-red-400 bg-white hover:border-red-500"
                )}
              />
              {termsAccepted && (
                <CheckCircle className="w-5 h-5 text-green-600 animate-in zoom-in-50 duration-200" />
              )}
            </div>
            <div className="space-y-3 flex-1">
              <Label 
                htmlFor="termsAccepted" 
                className={cn(
                  "text-sm sm:text-base font-bold cursor-pointer transition-colors duration-200",
                  termsAccepted ? "text-green-700" : "text-red-700"
                )}
              >
                Lu et approuvé <span className="text-red-500">*</span>
              </Label>
              <p className={cn(
                "text-sm transition-colors duration-200",
                termsAccepted ? "text-green-600" : "text-red-600"
              )}>
                Je confirme avoir lu et approuvé les conditions d'utilisation et la politique de confidentialité. 
                J'accepte que mes documents d'identité soient utilisés uniquement pour la vérification de mon identité 
                et stockés de manière sécurisée.
              </p>
              {termsAccepted && (
                <div className="flex items-center space-x-2 text-green-600 text-sm font-medium animate-in slide-in-from-left-2 duration-300">
                  <CheckCircle className="w-4 h-4" />
                  <span>Conditions acceptées ✓</span>
                </div>
              )}
            </div>
          </div>
          {errors?.documents?.termsAccepted && (
            <div className="flex items-center space-x-2 text-red-600 text-sm mt-3 p-3 bg-red-50 rounded-lg border border-red-200 animate-in slide-in-from-top-2 duration-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="font-medium">{errors.documents.termsAccepted.message}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Message final */}
      <div className="text-center p-4 sm:p-6 bg-linear-to-r from-kara-primary-dark/5 via-kara-primary-light/5 to-kara-primary-dark/10 rounded-xl border border-kara-primary-dark/20 animate-in fade-in-0 slide-in-from-bottom-4 duration-700 delay-800 w-full max-w-full wrap-break-word shadow-lg">
        <div className="flex items-center justify-center space-x-3">
          <FileText className="w-6 h-6 text-kara-primary-light" />
          <p className="text-sm sm:text-base text-kara-primary-dark font-bold">
            <strong>Sécurité :</strong> Vos documents d'identité sont stockés de manière sécurisée et utilisés uniquement pour la vérification de votre identité
          </p>
        </div>
      </div>
    </div>
  )
}