'use client'

import React, { useState, useRef } from 'react'
import { useFieldArray } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { SelectCountry } from '@/components/ui/select-country'
import { 
  User, 
  Calendar, 
  Mail, 
  Phone, 
  Plus, 
  Trash2, 
  Camera,
  CheckCircle,
  AlertCircle,
  MapPin,
  FileText,
  Church,
  Hash,
  CreditCard,
  Lightbulb
} from 'lucide-react'
import { cn } from '@/lib/utils'
interface Step1Props {
  form: any // Type du form de react-hook-form
}



// Données pour les selects (corrigées pour correspondre au schéma)
// Données pour les selects
const CIVILITY_OPTIONS = [
  { value: 'Monsieur', label: 'Monsieur' },
  { value: 'Madame', label: 'Madame' },
  { value: 'Mademoiselle', label: 'Mademoiselle' }
]

const GENDER_OPTIONS = [
  { value: 'Homme', label: 'Homme' },
  { value: 'Femme', label: 'Femme' }
]

const IDENTITY_DOCUMENT_OPTIONS = [
  { value: 'Passeport', label: 'Passeport' },
  { value: 'Carte de séjour', label: 'Carte de séjour' },
  { value: 'Carte scolaire', label: 'Carte scolaire' },
  { value: 'Carte consulaire', label: 'Carte consulaire' },
  { value: 'Carte d\'identité', label: 'Carte d\'identité' },
  { value: 'NIP', label: 'NIP' },
  { value: 'CNI', label: 'CNI' },
  { value: 'Autre', label: 'Autre' }
]

const MARITAL_STATUS_OPTIONS = [
  { value: 'Célibataire', label: 'Célibataire' },
  { value: 'En couple', label: 'En couple' },
  { value: 'Marié(e)', label: 'Marié(e)' },
  { value: 'Veuf/Veuve', label: 'Veuf/Veuve' },
  { value: 'Divorcé(e)', label: 'Divorcé(e)' },
  { value: 'Concubinage', label: 'Concubinage' },
  { value: 'Pacsé(e)', label: 'Pacsé(e)' },
  { value: 'Séparé(e)', label: 'Séparé(e)' }
]

export default function Step1({ form }: Step1Props) {
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { register, watch, setValue, setError, clearErrors, formState: { errors }, control } = form

  // Field array pour les contacts
  const { fields, append, remove } = useFieldArray({
    control,
    name: "identity.contacts"
  })

  // Watch pour les animations et la situation matrimoniale
  const watchedFields = watch([
    'identity.civility',
    'identity.lastName',
    'identity.firstName', 
    'identity.email',
    'identity.birthDate',
    'identity.birthPlace',
    'identity.birthCertificateNumber',
    'identity.prayerPlace',
    'identity.nationality',
    'identity.identityDocumentNumber',
    'identity.photo',
    'identity.maritalStatus',
    'identity.spouseLastName',
    'identity.spouseFirstName',
    'identity.spousePhone'
  ])

  // Vérifier si la situation matrimoniale nécessite des infos conjoint
  const maritalStatus = watch('identity.maritalStatus')
  const requiresSpouseInfo = ['En couple', 'Marié(e)', 'Concubinage', 'Pacsé(e)'].includes(maritalStatus)

  // Nettoyer les champs du conjoint si la situation matrimoniale ne le nécessite pas
  React.useEffect(() => {
    if (!requiresSpouseInfo) {
      setValue('identity.spouseLastName', '')
      setValue('identity.spouseFirstName', '')
      setValue('identity.spousePhone', '')
      // Nettoyer aussi les erreurs éventuelles
      clearErrors(['identity.spouseLastName', 'identity.spouseFirstName', 'identity.spousePhone'])
    }
  }, [requiresSpouseInfo, setValue, clearErrors])

  // Définir la nationalité par défaut au chargement (Gabon)
  React.useEffect(() => {
    if (!watch('identity.nationality')) {
      setValue('identity.nationality', 'GA')
    }
  }, [])

  // Validation de la photo obligatoire et restauration de la preview
  React.useEffect(() => {
    const photo = watch('identity.photo')
    if (!photo) {
      setError('identity.photo', {
        type: 'required',
        message: 'Une photo est requise'
      })
    } else {
      clearErrors('identity.photo')
      // Restaurer la preview si on a une photo mais pas de preview
      if (photo && !photoPreview && typeof photo === 'string' && photo.startsWith('data:')) {
        setPhotoPreview(photo)
      }
    }
  }, [watchedFields[9], setError, clearErrors, photoPreview])

  // Gestion de l'upload de photo
  const handlePhotoUpload = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string
        setPhotoPreview(dataUrl)
        setValue('identity.photo', dataUrl) // Stocker comme data URL pour la persistance
        clearErrors('identity.photo') // Effacer l'erreur quand une photo est sélectionnée
      }
      reader.readAsDataURL(file)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handlePhotoUpload(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handlePhotoUpload(file)
  }

  const addContact = () => {
    if (fields.length < 2) {
      append('')
    }
  }

  return (
    <div className="space-y-6 sm:space-y-8 w-full max-w-full overflow-x-hidden">
      {/* Header avec animation */}
      <div className="text-center space-y-3 animate-in fade-in-0 slide-in-from-top-4 duration-500 px-2">
        <div className="inline-flex items-center space-x-3 px-5 sm:px-6 py-3 bg-gradient-to-r from-[#224D62]/10 via-[#CBB171]/10 to-[#224D62]/10 rounded-full shadow-lg border border-[#224D62]/20">
          <User className="w-6 h-6 text-[#224D62]" />
          <span className="text-[#224D62] font-bold text-base sm:text-lg">Informations d'identité</span>
        </div>
        <p className="text-[#224D62]/80 text-sm sm:text-base break-words font-medium">
          Renseignez vos informations personnelles pour créer votre profil
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8 w-full">
        {/* Section Photo */}
        <div className="lg:col-span-1 w-full min-w-0">
          <div className="text-center space-y-4 w-full">
            <Label className="text-sm sm:text-base font-bold text-[#224D62]">
              Photo de profil <span className="text-red-500">*</span>
            </Label>
            
            {/* Zone d'upload simplifiée */}
            <div
              className={cn(
                "relative w-32 h-32 sm:w-40 sm:h-40 mx-auto rounded-full border-2 border-dashed transition-all duration-300 cursor-pointer group",
                isDragOver 
                  ? "border-[#224D62] bg-[#224D62]/5 shadow-lg scale-105" 
                  : "border-[#224D62]/30 hover:border-[#224D62]/50 hover:bg-[#224D62]/5 hover:scale-105",
                photoPreview && "border-solid border-[#224D62]/50 bg-[#224D62]/5"
              )}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
              onDragLeave={() => setIsDragOver(false)}
              onClick={() => fileInputRef.current?.click()}
            >
              {photoPreview ? (
                <div className="w-full h-full rounded-full overflow-hidden">
                  <Avatar className="w-full h-full">
                    <AvatarImage src={photoPreview} alt="Photo de profil" />
                                      <AvatarFallback className="bg-[#224D62]/10">
                    <Camera className="w-8 h-8 sm:w-10 sm:h-10 text-[#224D62]" />
                  </AvatarFallback>
                  </Avatar>
                  {/* Badge de succès */}
                  <div className="absolute -top-2 -right-2">
                    <Badge className="bg-gradient-to-r from-[#CBB171] to-[#224D62] text-white text-xs shadow-sm">
                      <CheckCircle className="w-3 h-3 mr-1" />
                    </Badge>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full rounded-full flex items-center justify-center bg-gradient-to-r from-[#224D62]/10 to-[#CBB171]/10 group-hover:from-[#224D62]/20 group-hover:to-[#CBB171]/20 transition-all duration-300">
                  <Camera className="w-8 h-8 sm:w-10 sm:h-10 text-[#224D62] group-hover:scale-110 transition-transform" />
                </div>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            
            {/* Texte d'aide */}
            <div className="space-y-1">
              <p className="text-sm text-gray-600 font-medium">
                Cliquez pour ajouter une photo
              </p>
              <p className="text-xs text-gray-500">
                PNG, JPG, WebP (max 5MB)
              </p>
            </div>
            
            {errors?.identity?.photo && (
              <div className="flex items-center justify-center space-x-1 text-red-500 text-sm animate-in slide-in-from-top-2 duration-300 break-words">
                <AlertCircle className="w-4 h-4" />
                <span className="font-medium">{errors.identity.photo.message}</span>
              </div>
            )}
          </div>
        </div>

        {/* Section Formulaire */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6 w-full min-w-0">
          {/* Civilité */}
          <div className="space-y-3 animate-in fade-in-0 slide-in-from-left-4 duration-600 w-full">
            <Label className="text-sm font-bold text-[#224D62]">
              Civilité <span className="text-red-500">*</span>
            </Label>
            <div className="flex flex-wrap gap-4 sm:gap-6">
              {CIVILITY_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center space-x-2 cursor-pointer group"
                >
                  <input
                    type="radio"
                    {...register('identity.civility')}
                    value={option.value}
                    className="w-4 h-4 border-[#224D62]/30 transition-all duration-200"
                    style={{
                      accentColor: '#224D62'
                    }}
                  />
                  <span className="text-sm font-medium text-[#224D62] group-hover:text-[#CBB171] transition-colors duration-200">
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
            {errors?.identity?.civility && (
              <div className="flex items-center space-x-1 text-red-500 text-sm animate-in slide-in-from-left-2 duration-300 break-words font-medium">
                <AlertCircle className="w-4 h-4" />
                <span>{errors.identity.civility.message}</span>
              </div>
            )}
          </div>

          {/* Nom et Prénom */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 w-full">
            <div className="space-y-3 animate-in fade-in-0 slide-in-from-left-4 duration-700 w-full min-w-0">
              <Label htmlFor="lastName" className="text-sm font-bold text-[#224D62]">
                Nom <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="lastName"
                  {...register('identity.lastName')}
                  placeholder="Votre nom de famille"
                  className={cn(
                    "h-12 pl-4 pr-12 border-2 border-[#224D62]/30 focus:border-[#224D62] focus:ring-4 focus:ring-[#224D62]/10 transition-all duration-300 w-full rounded-lg font-medium",
                    errors?.identity?.lastName && "border-red-300 focus:border-red-400 focus:ring-red-100 bg-red-50",
                    watchedFields[1] && !errors?.identity?.lastName && "border-[#CBB171] focus:border-[#CBB171] focus:ring-[#CBB171]/10 bg-[#CBB171]/5"
                  )}
                />
                {watchedFields[1] && !errors?.identity?.lastName && (
                  <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#CBB171] animate-in zoom-in-50 duration-200" />
                )}
              </div>
              {errors?.identity?.lastName && (
                <div className="flex items-center space-x-1 text-red-500 text-sm animate-in slide-in-from-left-2 duration-300 break-words font-medium">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.identity.lastName.message}</span>
                </div>
              )}
            </div>

            <div className="space-y-3 animate-in fade-in-0 slide-in-from-right-4 duration-700 delay-100 w-full min-w-0">
              <Label htmlFor="firstName" className="text-sm font-bold text-[#224D62]">
                Prénom <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="firstName"
                  {...register('identity.firstName')}
                  placeholder="Votre prénom"
                  className={cn(
                    "h-12 pl-4 pr-12 border-2 border-[#224D62]/30 focus:border-[#224D62] focus:ring-4 focus:ring-[#224D62]/10 transition-all duration-300 w-full rounded-lg font-medium",
                    errors?.identity?.firstName && "border-red-300 focus:border-red-400 focus:ring-red-100 bg-red-50",
                    watchedFields[2] && !errors?.identity?.firstName && "border-[#CBB171] focus:border-[#CBB171] focus:ring-[#CBB171]/10 bg-[#CBB171]/5"
                  )}
                />
                {watchedFields[2] && !errors?.identity?.firstName && (
                  <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#CBB171] animate-in zoom-in-50 duration-200" />
                )}
              </div>
              {errors?.identity?.firstName && (
                <div className="flex items-center space-x-1 text-red-500 text-sm animate-in slide-in-from-right-2 duration-300 break-words font-medium">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.identity.firstName.message}</span>
                </div>
              )}
            </div>
          </div>

          {/* Email et Date de naissance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 w-full">
            <div className="space-y-2 animate-in fade-in-0 slide-in-from-left-4 duration-700 delay-200 w-full min-w-0">
              <Label htmlFor="email" className="text-xs sm:text-sm font-medium text-[#224D62]">
                Email (optionnel)
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171]" />
                <Input
                  id="email"
                  type="email"
                  {...register('identity.email')}
                  placeholder="votre@email.com"
                  className={cn(
                    "pl-10 pr-10 border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20 transition-all duration-300 w-full",
                    errors?.identity?.email && "border-red-300 focus:border-red-500 bg-red-50/50",
                    watchedFields[3] && !errors?.identity?.email && "border-[#CBB171] bg-[#CBB171]/5"
                  )}
                />
                {watchedFields[3] && !errors?.identity?.email && (
                  <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171] animate-in zoom-in-50 duration-200" />
                )}
              </div>
              {errors?.identity?.email && (
                <div className="flex items-center space-x-1 text-red-500 text-xs animate-in slide-in-from-left-2 duration-300 break-words">
                  <AlertCircle className="w-3 h-3" />
                  <span>{errors.identity.email.message}</span>
                </div>
              )}
            </div>

            <div className="space-y-2 animate-in fade-in-0 slide-in-from-right-4 duration-700 delay-300 w-full min-w-0">
              <Label htmlFor="birthDate" className="text-xs sm:text-sm font-medium text-[#224D62]">
                Date de naissance <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171]" />
                <Input
                  id="birthDate"
                  type="date"
                  {...register('identity.birthDate')}
                  className={cn(
                    "pl-10 pr-10 border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20 transition-all duration-300 w-full",
                    errors?.identity?.birthDate && "border-red-300 focus:border-red-500 bg-red-50/50",
                    watchedFields[4] && !errors?.identity?.birthDate && "border-[#CBB171] bg-[#CBB171]/5"
                  )}
                />
                {watchedFields[4] && !errors?.identity?.birthDate && (
                  <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171] animate-in zoom-in-50 duration-200" />
                )}
              </div>
              {errors?.identity?.birthDate && (
                <div className="flex items-center space-x-1 text-red-500 text-xs animate-in slide-in-from-right-2 duration-300 break-words">
                  <AlertCircle className="w-3 h-3" />
                  <span>{errors.identity.birthDate.message}</span>
                </div>
              )}
            </div>
          </div>

          {/* Lieu de naissance et Numéro d'acte de naissance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 w-full">
            <div className="space-y-2 animate-in fade-in-0 slide-in-from-left-4 duration-700 delay-400 w-full min-w-0">
              <Label htmlFor="birthPlace" className="text-xs sm:text-sm font-medium text-[#224D62]">
                Lieu de naissance <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171]" />
                <Input
                  id="birthPlace"
                  {...register('identity.birthPlace')}
                  placeholder="Ville, Pays"
                  className={cn(
                    "pl-10 pr-10 border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20 transition-all duration-300 w-full",
                    errors?.identity?.birthPlace && "border-red-300 focus:border-red-500 bg-red-50/50",
                    watchedFields[5] && !errors?.identity?.birthPlace && "border-[#CBB171] bg-[#CBB171]/5"
                  )}
                />
                {watchedFields[5] && !errors?.identity?.birthPlace && (
                  <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171] animate-in zoom-in-50 duration-200" />
                )}
              </div>
              {errors?.identity?.birthPlace && (
                <div className="flex items-center space-x-1 text-red-500 text-xs animate-in slide-in-from-left-2 duration-300 break-words">
                  <AlertCircle className="w-3 h-3" />
                  <span>{errors.identity.birthPlace.message}</span>
                </div>
              )}
            </div>

            <div className="space-y-2 animate-in fade-in-0 slide-in-from-right-4 duration-700 delay-500 w-full min-w-0">
              <Label htmlFor="birthCertificateNumber" className="text-xs sm:text-sm font-medium text-[#224D62]">
                Numéro d'acte de naissance <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171]" />
                <Input
                  id="birthCertificateNumber"
                  {...register('identity.birthCertificateNumber')}
                  placeholder="Numéro de l'acte"
                  className={cn(
                    "pl-10 pr-10 border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20 transition-all duration-300 w-full",
                    errors?.identity?.birthCertificateNumber && "border-red-300 focus:border-red-500 bg-red-50/50",
                    watchedFields[6] && !errors?.identity?.birthCertificateNumber && "border-[#CBB171] bg-[#CBB171]/5"
                  )}
                />
                {watchedFields[6] && !errors?.identity?.birthCertificateNumber && (
                  <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171] animate-in zoom-in-50 duration-200" />
                )}
              </div>
              {errors?.identity?.birthCertificateNumber && (
                <div className="flex items-center space-x-1 text-red-500 text-xs animate-in slide-in-from-right-2 duration-300 break-words">
                  <AlertCircle className="w-3 h-3" />
                  <span>{errors.identity.birthCertificateNumber.message}</span>
                </div>
              )}
            </div>
          </div>

          {/* Lieu de prière et Code entremetteur */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 w-full">
            <div className="space-y-2 animate-in fade-in-0 slide-in-from-left-4 duration-700 delay-600 w-full min-w-0">
              <Label htmlFor="prayerPlace" className="text-xs sm:text-sm font-medium text-[#224D62]">
                Lieu de prière <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Church className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171]" />
                <Input
                  id="prayerPlace"
                  {...register('identity.prayerPlace')}
                  placeholder="Mosquée, Église, etc."
                  className={cn(
                    "pl-10 pr-10 border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20 transition-all duration-300 w-full",
                    errors?.identity?.prayerPlace && "border-red-300 focus:border-red-500 bg-red-50/50",
                    watchedFields[7] && !errors?.identity?.prayerPlace && "border-[#CBB171] bg-[#CBB171]/5"
                  )}
                />
                {watchedFields[7] && !errors?.identity?.prayerPlace && (
                  <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171] animate-in zoom-in-50 duration-200" />
                )}
              </div>
              {errors?.identity?.prayerPlace && (
                <div className="flex items-center space-x-1 text-red-500 text-xs animate-in slide-in-from-left-2 duration-300 break-words">
                  <AlertCircle className="w-3 h-3" />
                  <span>{errors.identity.prayerPlace.message}</span>
                </div>
              )}
            </div>

            <div className="space-y-2 animate-in fade-in-0 slide-in-from-right-4 duration-700 delay-700 w-full min-w-0">
              <Label htmlFor="intermediaryCode" className="text-xs sm:text-sm font-medium text-[#224D62]">
                Qui vous a référé?
              </Label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171]" />
                <Input
                  id="intermediaryCode"
                  {...register('identity.intermediaryCode')}
                  placeholder="Code de référence"
                  className="pl-10 border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20 transition-all duration-300 w-full"
                />
              </div>
              {errors?.identity?.intermediaryCode && (
                <div className="flex items-center space-x-1 text-red-500 text-xs animate-in slide-in-from-right-2 duration-300 break-words">
                  <AlertCircle className="w-3 h-3" />
                  <span>{errors.identity.intermediaryCode.message}</span>
                </div>
              )}
            </div>
          </div>

          {/* Contacts */}
          <div className="space-y-3 sm:space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-700 delay-800 w-full min-w-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 w-full">
              <Label className="text-xs sm:text-sm font-medium text-[#224D62]">
                Numéros de téléphone <span className="text-red-500">*</span>
              </Label>
              {fields.length < 2 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addContact}
                  className="border-[#CBB171] text-[#CBB171] hover:bg-[#CBB171]/10 transition-all duration-300 hover:scale-105 w-full sm:w-auto"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Ajouter
                </Button>
              )}
            </div>
            
            <div className="space-y-2 sm:space-y-3 w-full">
              {fields.map((field, index) => (
                <div key={field.id} className="flex space-x-2 animate-in slide-in-from-left-4 duration-300 w-full min-w-0" style={{ animationDelay: `${index * 100}ms` }}>
                  <div className="flex-1 relative min-w-0">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171]" />
                    <Input
                      {...register(`identity.contacts.${index}`)}
                      placeholder={`Téléphone ${index + 1}`}
                      className="pl-10 border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20 transition-all duration-300 w-full"
                    />
                  </div>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => remove(index)}
                      className="border-red-300 text-red-500 hover:bg-red-50 transition-all duration-300 hover:scale-105"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {errors?.identity?.contacts && (
              <div className="flex items-center space-x-1 text-red-500 text-xs animate-in slide-in-from-bottom-2 duration-300 break-words">
                <AlertCircle className="w-3 h-3" />
                <span>{errors.identity.contacts.message}</span>
              </div>
            )}
          </div>

          {/* Selects et Checkbox */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 w-full">
            {/* Sexe */}
            <div className="space-y-2 animate-in fade-in-0 slide-in-from-left-4 duration-700 delay-900 w-full min-w-0">
              <Label className="text-xs sm:text-sm font-medium text-[#224D62]">
                Sexe <span className="text-red-500">*</span>
              </Label>
              <Select 
                onValueChange={(value) => setValue('identity.gender', value)}
                defaultValue={watch('identity.gender')}
              >
                <SelectTrigger className="border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20 transition-all duration-300 w-full">
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {GENDER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Nationalité */}
            <div className="space-y-2 animate-in fade-in-0 slide-in-from-right-4 duration-700 delay-950 w-full min-w-0">
              <Label className="text-xs sm:text-sm font-medium text-[#224D62]">
                Nationalité <span className="text-red-500">*</span>
              </Label>
              <SelectCountry
                value={watch('identity.nationality')}
                onValueChange={(value) => setValue('identity.nationality', value)}
                error={errors?.identity?.nationality?.message}
                showValidation={!!watchedFields[8]}
                placeholder="Sélectionner nationalité"
                defaultValue="GA"
              />
            </div>

            {/* Pièce d'identité */}
            <div className="space-y-2 animate-in fade-in-0 slide-in-from-left-4 duration-700 delay-1000 w-full min-w-0">
              <Label className="text-xs sm:text-sm font-medium text-[#224D62]">
                Pièce d'identité <span className="text-red-500">*</span>
              </Label>
              <Select 
                onValueChange={(value) => setValue('identity.identityDocument', value)}
                defaultValue={watch('identity.identityDocument')}
              >
                <SelectTrigger className="border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20 transition-all duration-300 w-full">
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {IDENTITY_DOCUMENT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Numéro de pièce d'identité */}
            <div className="space-y-2 animate-in fade-in-0 slide-in-from-right-4 duration-700 delay-1050 w-full min-w-0">
              <Label htmlFor="identityDocumentNumber" className="text-xs sm:text-sm font-medium text-[#224D62]">
                Numéro de pièce d'identité <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171]" />
                <Input
                  id="identityDocumentNumber"
                  {...register('identity.identityDocumentNumber')}
                  placeholder="Numéro de votre pièce d'identité"
                  className={cn(
                    "pl-10 pr-10 border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20 transition-all duration-300 w-full",
                    errors?.identity?.identityDocumentNumber && "border-red-300 focus:border-red-500 bg-red-50/50",
                    watchedFields[9] && !errors?.identity?.identityDocumentNumber && "border-[#CBB171] bg-[#CBB171]/5"
                  )}
                />
                {watchedFields[9] && !errors?.identity?.identityDocumentNumber && (
                  <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171] animate-in zoom-in-50 duration-200" />
                )}
              </div>
              {errors?.identity?.identityDocumentNumber && (
                <div className="flex items-center space-x-1 text-red-500 text-xs animate-in slide-in-from-right-2 duration-300 break-words">
                  <AlertCircle className="w-3 h-3" />
                  <span>{errors.identity.identityDocumentNumber.message}</span>
                </div>
              )}
            </div>
          </div>

          {/* Situation matrimoniale (seule) */}
          <div className="space-y-2 animate-in fade-in-0 slide-in-from-left-4 duration-700 delay-1100 w-full max-w-md">
            <Label className="text-xs sm:text-sm font-medium text-[#224D62]">
              Situation matrimoniale <span className="text-red-500">*</span>
            </Label>
            <Select 
              onValueChange={(value) => setValue('identity.maritalStatus', value)}
              defaultValue={watch('identity.maritalStatus')}
            >
              <SelectTrigger className="border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20 transition-all duration-300 w-full">
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent>
                {MARITAL_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Informations du conjoint (conditionnelles) */}
          {requiresSpouseInfo && (
            <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-500 w-full">
              {/* Header pour les infos conjoint */}
              <div className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-[#CBB171]/10 to-[#224D62]/10 rounded-lg border border-[#CBB171]/30">
                <User className="w-5 h-5 text-[#224D62]" />
                <Label className="text-sm font-bold text-[#224D62]">
                  Informations du conjoint <span className="text-red-500">*</span>
                </Label>
              </div>

              {/* Nom et Prénom du conjoint */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 w-full">
                <div className="space-y-2 w-full min-w-0">
                  <Label htmlFor="spouseLastName" className="text-xs sm:text-sm font-medium text-[#224D62]">
                    Nom du conjoint <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171]" />
                    <Input
                      id="spouseLastName"
                      {...register('identity.spouseLastName')}
                      placeholder="Nom du conjoint"
                      className={cn(
                        "pl-10 pr-10 border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20 transition-all duration-300 w-full",
                        errors?.identity?.spouseLastName && "border-red-300 focus:border-red-500 bg-red-50/50",
                        watchedFields[12] && !errors?.identity?.spouseLastName && "border-[#CBB171] bg-[#CBB171]/5"
                      )}
                    />
                    {watchedFields[12] && !errors?.identity?.spouseLastName && (
                      <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171] animate-in zoom-in-50 duration-200" />
                    )}
                  </div>
                  {errors?.identity?.spouseLastName && (
                    <div className="flex items-center space-x-1 text-red-500 text-xs animate-in slide-in-from-left-2 duration-300 break-words">
                      <AlertCircle className="w-3 h-3" />
                      <span>{errors.identity.spouseLastName.message}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2 w-full min-w-0">
                  <Label htmlFor="spouseFirstName" className="text-xs sm:text-sm font-medium text-[#224D62]">
                    Prénom du conjoint <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171]" />
                    <Input
                      id="spouseFirstName"
                      {...register('identity.spouseFirstName')}
                      placeholder="Prénom du conjoint"
                      className={cn(
                        "pl-10 pr-10 border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20 transition-all duration-300 w-full",
                        errors?.identity?.spouseFirstName && "border-red-300 focus:border-red-500 bg-red-50/50",
                        watchedFields[13] && !errors?.identity?.spouseFirstName && "border-[#CBB171] bg-[#CBB171]/5"
                      )}
                    />
                    {watchedFields[13] && !errors?.identity?.spouseFirstName && (
                      <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171] animate-in zoom-in-50 duration-200" />
                    )}
                  </div>
                  {errors?.identity?.spouseFirstName && (
                    <div className="flex items-center space-x-1 text-red-500 text-xs animate-in slide-in-from-right-2 duration-300 break-words">
                      <AlertCircle className="w-3 h-3" />
                      <span>{errors.identity.spouseFirstName.message}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Téléphone du conjoint */}
              <div className="w-full max-w-md">
                <div className="space-y-2 w-full min-w-0">
                  <Label htmlFor="spousePhone" className="text-xs sm:text-sm font-medium text-[#224D62]">
                    Téléphone du conjoint <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171]" />
                    <Input
                      id="spousePhone"
                      {...register('identity.spousePhone')}
                      placeholder="Numéro du conjoint"
                      className={cn(
                        "pl-10 pr-10 border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20 transition-all duration-300 w-full",
                        errors?.identity?.spousePhone && "border-red-300 focus:border-red-500 bg-red-50/50",
                        watchedFields[14] && !errors?.identity?.spousePhone && "border-[#CBB171] bg-[#CBB171]/5"
                      )}
                    />
                    {watchedFields[14] && !errors?.identity?.spousePhone && (
                      <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171] animate-in zoom-in-50 duration-200" />
                    )}
                  </div>
                  {errors?.identity?.spousePhone && (
                    <div className="flex items-center space-x-1 text-red-500 text-xs animate-in slide-in-from-left-2 duration-300 break-words">
                      <AlertCircle className="w-3 h-3" />
                      <span>{errors.identity.spousePhone.message}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}


        </div>
      </div>

      {/* Message d'aide */}
      <div className="text-center p-4 sm:p-6 bg-gradient-to-r from-[#224D62]/5 via-[#CBB171]/5 to-[#224D62]/10 rounded-xl border border-[#224D62]/20 animate-in fade-in-0 slide-in-from-bottom-4 duration-700 delay-1300 w-full max-w-full break-words shadow-lg">
        <div className="flex items-center justify-center space-x-3">
          <Lightbulb className="w-6 h-6 text-[#CBB171]" />
          <p className="text-sm sm:text-base text-[#224D62] font-bold">
            <strong>Conseil :</strong> Assurez-vous que vos informations correspondent exactement à vos documents officiels
          </p>
        </div>
      </div>
    </div>
  )
}