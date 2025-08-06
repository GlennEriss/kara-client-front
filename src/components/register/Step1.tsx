'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
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
  Lightbulb,
  Loader2,
  XCircle
} from 'lucide-react'
import { cn, compressImage, IMAGE_COMPRESSION_PRESETS, getImageInfo } from '@/lib/utils'
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
  { value: 'Veuf/Veuve', label: 'Veuf/Veuve' },
  { value: 'Marié(e)', label: 'Marié(e)' },
  { value: 'Concubinage', label: 'Concubinage' }
]

export default function Step1({ form }: Step1Props) {
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [isCompressing, setIsCompressing] = useState(false)
  const [compressionInfo, setCompressionInfo] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // États pour la vérification des numéros de téléphone
  const [phoneCheckStates, setPhoneCheckStates] = useState<{
    [index: number]: {
      isChecking: boolean
      exists: boolean | null
      message: string
      details?: any
    }
  }>({})

  const { register, watch, setValue, setError, clearErrors, formState: { errors }, control } = form

  // Field array pour les contacts
  const { fields, append, remove } = useFieldArray({
    control,
    name: "identity.contacts"
  })

  // S'assurer qu'il y ait toujours au moins un champ de contact
  React.useEffect(() => {
    if (fields.length === 0) {
      append('')
    }
  }, [fields.length, append])

  // Nettoyer les contacts vides au blur/changement
  const cleanEmptyContacts = React.useCallback(() => {
    const contacts = watch('identity.contacts') || []
    const cleanedContacts = contacts.filter((contact: string) => contact && contact.trim() !== '')
    
    // S'assurer qu'il y a au moins un champ, même vide
    if (cleanedContacts.length === 0) {
      cleanedContacts.push('')
    }
    
    // Mettre à jour seulement si nécessaire
    if (cleanedContacts.length !== contacts.length) {
      setValue('identity.contacts', cleanedContacts)
    }
  }, [watch, setValue])

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
    'identity.photo',
    'identity.gender',
    'identity.maritalStatus',
    'identity.spouseLastName',
    'identity.spouseFirstName',
    'identity.spousePhone',
    'identity.hasCar'
  ])

  // Vérifier si la situation matrimoniale nécessite des infos conjoint
  const maritalStatus = watch('identity.maritalStatus')
  const requiresSpouseInfo = ['Marié(e)', 'Concubinage'].includes(maritalStatus)

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

  // Lier la civilité au sexe automatiquement
  React.useEffect(() => {
    const civility = watch('identity.civility')
    if (civility) {
      // Définir le sexe selon la civilité
      const gender = civility === 'Monsieur' ? 'Homme' : 'Femme'
      setValue('identity.gender', gender)
      // Nettoyer les erreurs éventuelles du sexe
      clearErrors('identity.gender')
    }
  }, [watch('identity.civility'), setValue, clearErrors])

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

  // Nettoyer automatiquement les erreurs quand les champs sont corrigés
  React.useEffect(() => {
    const subscription = watch((value: any) => {
      // Nettoyer les erreurs de civilité
      if (value.identity?.civility && errors.identity?.civility) {
        clearErrors('identity.civility')
      }
      
      // Nettoyer les erreurs de nom
      if (value.identity?.lastName && value.identity.lastName.length >= 2 && errors.identity?.lastName) {
        clearErrors('identity.lastName')
      }
      
      // Nettoyer les erreurs de prénom
      if (value.identity?.firstName && value.identity.firstName.length >= 2 && errors.identity?.firstName) {
        clearErrors('identity.firstName')
      }
      
      // Nettoyer les erreurs de date de naissance
      if (value.identity?.birthDate && errors.identity?.birthDate) {
        clearErrors('identity.birthDate')
      }
      
      // Nettoyer les erreurs de lieu de naissance
      if (value.identity?.birthPlace && value.identity.birthPlace.length >= 2 && errors.identity?.birthPlace) {
        clearErrors('identity.birthPlace')
      }
      
      // Nettoyer les erreurs de numéro d'acte de naissance
      if (value.identity?.birthCertificateNumber && value.identity.birthCertificateNumber.length >= 2 && errors.identity?.birthCertificateNumber) {
        clearErrors('identity.birthCertificateNumber')
      }
      
      // Nettoyer les erreurs de lieu de prière
      if (value.identity?.prayerPlace && value.identity.prayerPlace.length >= 2 && errors.identity?.prayerPlace) {
        clearErrors('identity.prayerPlace')
      }
      
      // Nettoyer les erreurs de nationalité
      if (value.identity?.nationality && errors.identity?.nationality) {
        clearErrors('identity.nationality')
      }
      
      // Nettoyer les erreurs de situation matrimoniale
      if (value.identity?.maritalStatus && errors.identity?.maritalStatus) {
        clearErrors('identity.maritalStatus')
      }
      
      // Nettoyer les erreurs de hasCar
      if (value.identity?.hasCar !== undefined && errors.identity?.hasCar) {
        clearErrors('identity.hasCar')
      }
      
      // Nettoyer les erreurs de contacts
      if (value.identity?.contacts && Array.isArray(value.identity.contacts) && value.identity.contacts.some((contact: string) => contact && contact.trim().length >= 8) && errors.identity?.contacts) {
        clearErrors('identity.contacts')
      }
      
      // Nettoyer les erreurs du conjoint si nécessaire
      if (requiresSpouseInfo) {
        if (value.identity?.spouseLastName && value.identity.spouseLastName.length >= 2 && errors.identity?.spouseLastName) {
          clearErrors('identity.spouseLastName')
        }
        if (value.identity?.spouseFirstName && value.identity.spouseFirstName.length >= 2 && errors.identity?.spouseFirstName) {
          clearErrors('identity.spouseFirstName')
        }
        if (value.identity?.spousePhone && value.identity.spousePhone.length >= 8 && errors.identity?.spousePhone) {
          clearErrors('identity.spousePhone')
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [watch, clearErrors, errors.identity, requiresSpouseInfo])

  // Gestion de l'upload de photo avec compression
  const handlePhotoUpload = async (file: File) => {
    if (file && file.type.startsWith('image/')) {
      setIsCompressing(true)
      setCompressionInfo(null)
      
      try {
        // Compresser l'image en WebP avec le preset profile
        const compressedDataUrl = await compressImage(file, IMAGE_COMPRESSION_PRESETS.profile)
        
        // Obtenir les informations sur l'image compressée
        const imageInfo = getImageInfo(compressedDataUrl)
        
        // Mettre à jour les états
        setPhotoPreview(compressedDataUrl)
        setValue('identity.photo', compressedDataUrl)
        clearErrors('identity.photo')
        setCompressionInfo(`${imageInfo.format} • ${imageInfo.sizeText}`)
        
      } catch (error) {
        console.error('Erreur lors de la compression:', error)
        setError('identity.photo', {
          type: 'compression',
          message: 'Erreur lors de la compression de l\'image'
        })
      } finally {
        setIsCompressing(false)
      }
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
      // Vérifier qu'il n'y a pas déjà un champ vide
      const contacts = watch('identity.contacts') || []
      const hasEmptyField = contacts.some((contact: string) => !contact || contact.trim() === '')
      
      if (!hasEmptyField) {
        append('')
      }
    }
  }

  // Fonction de vérification des numéros de téléphone
  const checkPhoneNumber = useCallback(async (phoneNumber: string, index: number) => {
    if (!phoneNumber || phoneNumber.length < 8) {
      setPhoneCheckStates(prev => ({
        ...prev,
        [index]: { isChecking: false, exists: null, message: '' }
      }))
      return
    }

    setPhoneCheckStates(prev => ({
      ...prev,
      [index]: { ...prev[index], isChecking: true }
    }))

    try {
      const response = await fetch('/api/check-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber })
      })

      const data = await response.json()

      if (response.ok) {
        setPhoneCheckStates(prev => ({
          ...prev,
          [index]: {
            isChecking: false,
            exists: data.exists,
            message: data.message,
            details: data.details
          }
        }))
      } else {
        setPhoneCheckStates(prev => ({
          ...prev,
          [index]: {
            isChecking: false,
            exists: null,
            message: 'Erreur lors de la vérification'
          }
        }))
      }
    } catch (error) {
      console.error('Erreur lors de la vérification du téléphone:', error)
      setPhoneCheckStates(prev => ({
        ...prev,
        [index]: {
          isChecking: false,
          exists: null,
          message: 'Erreur de connexion'
        }
      }))
    }
  }, [])

  // Surveiller les changements des numéros de téléphone avec debouncing
  useEffect(() => {
    let timeouts: NodeJS.Timeout[] = []
    
    const subscription = watch((value: any) => {
      // Nettoyer les anciens timeouts
      timeouts.forEach(timeout => clearTimeout(timeout))
      timeouts = []
      
      const contactValues = value.identity?.contacts || []
      // Filtrer les contacts vides pour éviter les erreurs de validation
      const validContacts = contactValues.filter((contact: string) => contact && contact.trim() !== '')
      
      validContacts.forEach((phoneNumber: string, index: number) => {
        const timeoutId = setTimeout(() => {
          checkPhoneNumber(phoneNumber.trim(), index)
        }, 1000) // Debounce de 1 seconde
        timeouts.push(timeoutId)
      })

      // Nettoyer les états de vérification pour les champs vides
      contactValues.forEach((phoneNumber: string, index: number) => {
        if (!phoneNumber || phoneNumber.trim() === '') {
          setPhoneCheckStates(prev => ({
            ...prev,
            [index]: { isChecking: false, exists: null, message: '' }
          }))
        }
      })
    })

    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout))
      subscription.unsubscribe()
    }
  }, [watch, checkPhoneNumber])

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
              {isCompressing ? (
                <div className="w-full h-full rounded-full flex items-center justify-center bg-gradient-to-r from-[#224D62]/10 to-[#CBB171]/10">
                  <div className="flex flex-col items-center space-y-2">
                    <Loader2 className="w-8 h-8 text-[#224D62] animate-spin" />
                    <span className="text-xs text-[#224D62] font-medium">Compression...</span>
                  </div>
                </div>
              ) : photoPreview ? (
                <div className="w-full h-full rounded-full overflow-hidden">
                  <Avatar className="w-full h-full">
                    <AvatarImage src={photoPreview} alt="Photo de profil" />
                    <AvatarFallback className="bg-[#224D62]/10">
                      <Camera className="w-8 h-8 sm:w-10 sm:h-10 text-[#224D62]" />
                    </AvatarFallback>
                  </Avatar>
                  {/* Badge de succès avec info compression */}
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
                PNG, JPG, WebP (max 5MB) → Compressé en WebP
              </p>
              {compressionInfo && (
                <div className="flex items-center justify-center space-x-1 text-[#CBB171] text-xs animate-in fade-in-0 duration-300">
                  <CheckCircle className="w-3 h-3" />
                  <span>{compressionInfo}</span>
                </div>
              )}
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
              {fields.length < 2 && (() => {
                const contacts = watch('identity.contacts') || []
                const hasEmptyField = contacts.some((contact: string) => !contact || contact.trim() === '')
                return !hasEmptyField && (
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
                )
              })()}
            </div>
            
            <div className="space-y-2 sm:space-y-3 w-full">
              {fields.map((field, index) => {
                const phoneCheckState = phoneCheckStates[index] || { isChecking: false, exists: null, message: '' }
                
                return (
                  <div key={field.id} className="space-y-2 animate-in slide-in-from-left-4 duration-300 w-full min-w-0" style={{ animationDelay: `${index * 100}ms` }}>
                    <div className="flex space-x-2 w-full min-w-0">
                      <div className="flex-1 relative min-w-0">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171]" />
                        <Input
                          {...register(`identity.contacts.${index}`)}
                          placeholder={`Téléphone ${index + 1}`}
                          onBlur={cleanEmptyContacts}
                          className={cn(
                            "pl-10 border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20 transition-all duration-300 w-full",
                            phoneCheckState.exists === true && "border-red-300 focus:border-red-400 focus:ring-red-100 bg-red-50",
                            phoneCheckState.exists === false && "border-green-300 focus:border-green-400 focus:ring-green-100 bg-green-50"
                          )}
                        />
                      </div>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            remove(index)
                            // Nettoyer l'état de vérification pour cet index
                            setPhoneCheckStates(prev => {
                              const newState = { ...prev }
                              delete newState[index]
                              return newState
                            })
                            // Nettoyer les contacts vides après suppression
                            setTimeout(cleanEmptyContacts, 0)
                          }}
                          className="border-red-300 text-red-500 hover:bg-red-50 transition-all duration-300 hover:scale-105"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    
                    {/* Messages de vérification */}
                    {phoneCheckState.isChecking && (
                      <div className="flex items-center space-x-2 text-blue-600 text-sm">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Vérification du numéro...</span>
                      </div>
                    )}
                    
                    {phoneCheckState.exists === true && (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 text-red-600 text-sm">
                          <XCircle className="w-4 h-4" />
                          <span>Ce numéro est déjà utilisé !</span>
                        </div>
                        {phoneCheckState.details && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
                            <p className="font-medium text-red-800">
                              Demande existante: {phoneCheckState.details.firstName} {phoneCheckState.details.lastName}
                            </p>
                            <p className="text-red-600">
                              Statut: {phoneCheckState.details.status === 'pending' ? 'En attente' : 
                                      phoneCheckState.details.status === 'approved' ? 'Approuvée' : 
                                      phoneCheckState.details.status === 'rejected' ? 'Rejetée' : 
                                      phoneCheckState.details.status}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {phoneCheckState.exists === false && (
                      <div className="flex items-center space-x-2 text-green-600 text-sm">
                        <CheckCircle className="w-4 h-4" />
                        <span>Numéro disponible</span>
                      </div>
                    )}
                    
                    {phoneCheckState.message && phoneCheckState.exists === null && !phoneCheckState.isChecking && (
                      <div className="flex items-center space-x-2 text-red-600 text-sm">
                        <XCircle className="w-4 h-4" />
                        <span>{phoneCheckState.message}</span>
                      </div>
                    )}
                  </div>
                )
              })}
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
            {/* Sexe - Désactivé et automatique selon la civilité */}
            {/* <div className="space-y-2 animate-in fade-in-0 slide-in-from-left-4 duration-700 delay-900 w-full min-w-0">
              <Label className="text-xs sm:text-sm font-medium text-[#224D62]">
                Sexe <span className="text-red-500">*</span>
                <span className="text-xs text-gray-500 ml-2">(Automatique selon la civilité)</span>
              </Label>
              <div className="relative">
                <Select 
                  onValueChange={(value) => setValue('identity.gender', value)}
                  defaultValue={watch('identity.gender')}
                  disabled={true}
                >
                  <SelectTrigger className="border-[#CBB171]/30 bg-gray-50 cursor-not-allowed transition-all duration-300 w-full">
                    <SelectValue placeholder="Sélectionné automatiquement" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENDER_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <CheckCircle className="w-4 h-4 text-[#CBB171]" />
                </div>
              </div>
              <div className="flex items-center space-x-1 text-[#CBB171] text-xs animate-in slide-in-from-left-2 duration-300">
                <span>✓ {watch('identity.gender') || 'Sera défini selon votre civilité'}</span>
              </div>
              {errors?.identity?.gender && (
                <div className="flex items-center space-x-1 text-red-500 text-xs animate-in slide-in-from-left-2 duration-300 break-words">
                  <AlertCircle className="w-3 h-3" />
                  <span>{errors.identity.gender.message}</span>
                </div>
              )}
            </div> */}

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


          </div>

          {/* Situation matrimoniale et Question voiture */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 w-full">
            {/* Situation matrimoniale */}
            <div className="space-y-2 animate-in fade-in-0 slide-in-from-left-4 duration-700 delay-1100 w-full min-w-0">
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

            {/* Question voiture */}
            <div className="space-y-2 animate-in fade-in-0 slide-in-from-right-4 duration-700 delay-1150 w-full min-w-0">
              <Label className="text-xs sm:text-sm font-medium text-[#224D62]">
                Possédez-vous une voiture ? <span className="text-red-500">*</span>
              </Label>
              <div className="flex space-x-4">
                <label className="flex items-center space-x-2 cursor-pointer group">
                  <input
                    type="radio"
                    name="identity.hasCar"
                    checked={watch('identity.hasCar') === true}
                    onChange={() => setValue('identity.hasCar', true)}
                    className="w-4 h-4 border-[#224D62]/30 transition-all duration-200"
                    style={{ accentColor: '#224D62' }}
                  />
                  <span className="text-sm font-medium text-[#224D62] group-hover:text-[#CBB171] transition-colors duration-200">
                    Oui
                  </span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer group">
                  <input
                    type="radio"
                    name="identity.hasCar"
                    checked={watch('identity.hasCar') === false}
                    onChange={() => setValue('identity.hasCar', false)}
                    className="w-4 h-4 border-[#224D62]/30 transition-all duration-200"
                    style={{ accentColor: '#224D62' }}
                  />
                  <span className="text-sm font-medium text-[#224D62] group-hover:text-[#CBB171] transition-colors duration-200">
                    Non
                  </span>
                </label>
              </div>
              {(watch('identity.hasCar') === true || watch('identity.hasCar') === false) && (
                <div className="flex items-center space-x-1 text-[#CBB171] text-xs animate-in slide-in-from-right-2 duration-300">
                  <CheckCircle className="w-3 h-3" />
                  <span>Réponse enregistrée: {watch('identity.hasCar') ? 'Oui' : 'Non'}</span>
                </div>
              )}
            </div>
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
                        watchedFields[11] && !errors?.identity?.spouseLastName && "border-[#CBB171] bg-[#CBB171]/5"
                      )}
                    />
                    {watchedFields[11] && !errors?.identity?.spouseLastName && (
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
                        watchedFields[12] && !errors?.identity?.spouseFirstName && "border-[#CBB171] bg-[#CBB171]/5"
                      )}
                    />
                    {watchedFields[12] && !errors?.identity?.spouseFirstName && (
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
                        watchedFields[13] && !errors?.identity?.spousePhone && "border-[#CBB171] bg-[#CBB171]/5"
                      )}
                    />
                    {watchedFields[13] && !errors?.identity?.spousePhone && (
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