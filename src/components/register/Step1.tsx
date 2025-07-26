'use client'

import React, { useState, useRef } from 'react'
import { useFieldArray } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { 
  User, 
  Calendar, 
  Mail, 
  Phone, 
  Plus, 
  Trash2, 
  Upload, 
  Camera,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { RegisterFormData } from '@/types/schemas'

interface Step1Props {
  form: any // Type du form de react-hook-form
}

// Données pour les selects
const GENDER_OPTIONS = [
  { value: 'Masculin', label: 'Masculin' },
  { value: 'Féminin', label: 'Féminin' },
  { value: 'Autre', label: 'Autre' }
]

const IDENTITY_DOCUMENT_OPTIONS = [
  { value: 'Passeport', label: 'Passeport' },
  { value: 'Carte de séjour', label: 'Carte de séjour' },
  { value: 'Carte scolaire', label: 'Carte scolaire' },
  { value: 'Carte consulaire', label: 'Carte consulaire' },
  { value: 'Carte d\'identité', label: 'Carte d\'identité' },
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

  const { register, watch, setValue, formState: { errors }, control } = form

  // Field array pour les contacts
  const { fields, append, remove } = useFieldArray({
    control,
    name: "identity.contacts"
  })

  // Watch pour les animations
  const watchedFields = watch([
    'identity.lastName',
    'identity.firstName', 
    'identity.email',
    'identity.birthDate'
  ])

  // Gestion de l'upload de photo
  const handlePhotoUpload = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
      setValue('identity.photo', file)
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
      <div className="text-center space-y-2 animate-in fade-in-0 slide-in-from-top-4 duration-500 px-2">
        <div className="inline-flex items-center space-x-2 px-3 sm:px-4 py-2 bg-[#224D62]/10 rounded-full">
          <User className="w-5 h-5 text-[#224D62]" />
          <span className="text-[#224D62] font-medium text-sm sm:text-base">Informations d'identité</span>
        </div>
        <p className="text-gray-600 text-xs sm:text-sm break-words">
          Renseignez vos informations personnelles pour créer votre profil
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8 w-full">
        {/* Section Photo */}
        <div className="lg:col-span-1 w-full min-w-0">
          <Card className="border-2 border-dashed border-[#CBB171]/30 bg-gradient-to-br from-[#CBB171]/5 to-[#224D62]/5 transition-all duration-300 hover:border-[#CBB171]/50 w-full">
            <CardContent className="p-4 sm:p-6 w-full">
              <div className="text-center space-y-4 w-full">
                <Label className="text-xs sm:text-sm font-medium text-[#224D62]">
                  Photo de profil (optionnel)
                </Label>
                {/* Zone d'upload avec drag & drop */}
                <div
                  className={cn(
                    "relative border-2 border-dashed rounded-xl p-4 sm:p-6 transition-all duration-300 cursor-pointer group w-full",
                    isDragOver 
                      ? "border-[#224D62] bg-[#224D62]/5" 
                      : "border-[#CBB171]/40 hover:border-[#CBB171]/60",
                    photoPreview && "border-solid border-[#224D62]/20"
                  )}
                  onDrop={handleDrop}
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
                  onDragLeave={() => setIsDragOver(false)}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {photoPreview ? (
                    <div className="space-y-3">
                      <Avatar className="w-20 h-20 sm:w-24 sm:h-24 mx-auto ring-4 ring-[#CBB171]/20">
                        <AvatarImage src={photoPreview} alt="Photo de profil" />
                        <AvatarFallback className="bg-[#224D62]/10">
                          <Camera className="w-8 h-8 text-[#224D62]" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-center">
                        <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs sm:text-sm">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Photo ajoutée
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center space-y-3">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto bg-[#CBB171]/10 rounded-full flex items-center justify-center group-hover:bg-[#CBB171]/20 transition-colors">
                        <Upload className="w-8 h-8 text-[#CBB171] group-hover:scale-110 transition-transform" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs sm:text-sm font-medium text-[#224D62]">
                          Cliquez ou glissez votre photo
                        </p>
                        <p className="text-xs text-gray-500">
                          PNG, JPG, WebP (max 5MB)
                        </p>
                      </div>
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
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Section Formulaire */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6 w-full min-w-0">
          {/* Nom et Prénom */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 w-full">
            <div className="space-y-2 animate-in fade-in-0 slide-in-from-left-4 duration-700 w-full min-w-0">
              <Label htmlFor="lastName" className="text-xs sm:text-sm font-medium text-[#224D62]">
                Nom <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="lastName"
                  {...register('identity.lastName')}
                  placeholder="Votre nom de famille"
                  className={cn(
                    "pl-4 pr-10 border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20 transition-all duration-300 w-full",
                    errors?.identity?.lastName && "border-red-300 focus:border-red-500 bg-red-50/50",
                    watchedFields[0] && !errors?.identity?.lastName && "border-green-300 bg-green-50/30"
                  )}
                />
                {watchedFields[0] && !errors?.identity?.lastName && (
                  <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-500 animate-in zoom-in-50 duration-200" />
                )}
              </div>
              {errors?.identity?.lastName && (
                <div className="flex items-center space-x-1 text-red-500 text-xs animate-in slide-in-from-left-2 duration-300 break-words">
                  <AlertCircle className="w-3 h-3" />
                  <span>{errors.identity.lastName.message}</span>
                </div>
              )}
            </div>

            <div className="space-y-2 animate-in fade-in-0 slide-in-from-right-4 duration-700 delay-100 w-full min-w-0">
              <Label htmlFor="firstName" className="text-xs sm:text-sm font-medium text-[#224D62]">
                Prénom <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="firstName"
                  {...register('identity.firstName')}
                  placeholder="Votre prénom"
                  className={cn(
                    "pl-4 pr-10 border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20 transition-all duration-300 w-full",
                    errors?.identity?.firstName && "border-red-300 focus:border-red-500 bg-red-50/50",
                    watchedFields[1] && !errors?.identity?.firstName && "border-green-300 bg-green-50/30"
                  )}
                />
                {watchedFields[1] && !errors?.identity?.firstName && (
                  <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-500 animate-in zoom-in-50 duration-200" />
                )}
              </div>
              {errors?.identity?.firstName && (
                <div className="flex items-center space-x-1 text-red-500 text-xs animate-in slide-in-from-right-2 duration-300 break-words">
                  <AlertCircle className="w-3 h-3" />
                  <span>{errors.identity.firstName.message}</span>
                </div>
              )}
            </div>
          </div>

          {/* Email et Date de naissance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 w-full">
            <div className="space-y-2 animate-in fade-in-0 slide-in-from-left-4 duration-700 delay-200 w-full min-w-0">
              <Label htmlFor="email" className="text-xs sm:text-sm font-medium text-[#224D62]">
                Email <span className="text-red-500">*</span>
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
                    watchedFields[2] && !errors?.identity?.email && "border-green-300 bg-green-50/30"
                  )}
                />
                {watchedFields[2] && !errors?.identity?.email && (
                  <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-500 animate-in zoom-in-50 duration-200" />
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
                    watchedFields[3] && !errors?.identity?.birthDate && "border-green-300 bg-green-50/30"
                  )}
                />
                {watchedFields[3] && !errors?.identity?.birthDate && (
                  <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-500 animate-in zoom-in-50 duration-200" />
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

          {/* Contacts */}
          <div className="space-y-3 sm:space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-700 delay-400 w-full min-w-0">
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

          {/* Selects */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 w-full">
            {/* Sexe */}
            <div className="space-y-2 animate-in fade-in-0 slide-in-from-left-4 duration-700 delay-500 w-full min-w-0">
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

            {/* Pièce d'identité */}
            <div className="space-y-2 animate-in fade-in-0 slide-in-from-bottom-4 duration-700 delay-600 w-full min-w-0">
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

            {/* Situation matrimoniale */}
            <div className="space-y-2 animate-in fade-in-0 slide-in-from-right-4 duration-700 delay-700 w-full min-w-0">
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
          </div>
        </div>
      </div>

      {/* Message d'aide */}
      <div className="text-center p-3 sm:p-4 bg-[#224D62]/5 rounded-lg border border-[#CBB171]/20 animate-in fade-in-0 slide-in-from-bottom-4 duration-700 delay-800 w-full max-w-full break-words">
        <p className="text-xs sm:text-sm text-[#224D62]">
          💡 <strong>Conseil :</strong> Assurez-vous que vos informations correspondent exactement à vos documents officiels
        </p>
      </div>
    </div>
  )
} 