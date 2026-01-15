'use client'

import React, { useState, useEffect } from 'react'
import { useFormContext } from 'react-hook-form'
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Globe, 
  Heart, 
  FileText, 
  Church, 
  Hash, 
  Car, 
  Camera,
  Check,
  Sparkles,
  Users
} from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import type { RegisterFormData } from '@/schemas/schemas'
import { GabonPhoneInputList } from '@/components/shared/GabonPhoneInput'
import GabonPhoneInput from '@/components/shared/GabonPhoneInput'

const CIVILITIES = ['Monsieur', 'Madame', 'Mademoiselle'] as const
const GENDERS = ['Homme', 'Femme'] as const
const MARITAL_STATUS = ['Célibataire', 'Marié(e)', 'Veuf/Veuve', 'Divorcé(e)', 'Concubinage'] as const
const RELIGIONS = ['Christianisme', 'Islam', 'Animisme', 'Sans religion', 'Autre'] as const
const NATIONALITIES = ['Gabonaise', 'Française', 'Camerounaise', 'Congolaise', 'Équato-Guinéenne', 'Autre'] as const



// Mois en français
const MONTHS = [
  { value: '01', label: 'Janvier' },
  { value: '02', label: 'Février' },
  { value: '03', label: 'Mars' },
  { value: '04', label: 'Avril' },
  { value: '05', label: 'Mai' },
  { value: '06', label: 'Juin' },
  { value: '07', label: 'Juillet' },
  { value: '08', label: 'Août' },
  { value: '09', label: 'Septembre' },
  { value: '10', label: 'Octobre' },
  { value: '11', label: 'Novembre' },
  { value: '12', label: 'Décembre' },
]

// Générer les jours
const DAYS = Array.from({ length: 31 }, (_, i) => ({
  value: String(i + 1).padStart(2, '0'),
  label: String(i + 1)
}))

// Générer les années (de 1940 à 2010)
const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: 71 }, (_, i) => ({
  value: String(currentYear - 18 - i),
  label: String(currentYear - 18 - i)
}))



export default function IdentityStepV2() {
  const { register, watch, setValue, getValues, formState: { errors, isSubmitted, touchedFields }, clearErrors } = useFormContext<RegisterFormData>()

  const contacts = watch('identity.contacts') || []
  const maritalStatus = watch('identity.maritalStatus')
  const hasCar = watch('identity.hasCar')
  const photo = watch('identity.photo')
  const birthDate = watch('identity.birthDate')
  const requiresSpouseInfo = ['Marié(e)', 'Concubinage'].includes(maritalStatus)

  // Fonction helper pour parser et initialiser les dates
  const parseBirthDate = (date: string | undefined) => {
    if (date && date.includes('-')) {
      const [year, month, day] = date.split('-')
      return { year: year || '', month: month || '', day: day || '' }
    }
    return { year: '', month: '', day: '' }
  }

  // Initialiser les états de date depuis birthDate au montage
  const initialBirthDate = getValues('identity.birthDate')
  const initialParsed = parseBirthDate(initialBirthDate)
  
  // États pour la date de naissance (jour/mois/année séparés)
  const [birthDay, setBirthDay] = useState(initialParsed.day)
  const [birthMonth, setBirthMonth] = useState(initialParsed.month)
  const [birthYear, setBirthYear] = useState(initialParsed.year)
  
  // État pour la prévisualisation de la photo
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  // Initialiser les états de date depuis birthDate quand birthDate change
  useEffect(() => {
    // Utiliser getValues pour obtenir la valeur actuelle
    const currentBirthDate = birthDate || getValues('identity.birthDate')
    const parsed = parseBirthDate(currentBirthDate)
    
    // Toujours mettre à jour pour s'assurer que les états sont synchronisés
    // (important lors de la réinitialisation du formulaire)
    if (parsed.day !== birthDay || parsed.month !== birthMonth || parsed.year !== birthYear) {
      setBirthYear(parsed.year)
      setBirthMonth(parsed.month)
      setBirthDay(parsed.day)
    }
  }, [birthDate, getValues]) // eslint-disable-line react-hooks/exhaustive-deps

  // Mettre à jour birthDate quand les selects changent
  useEffect(() => {
    if (birthDay && birthMonth && birthYear) {
      const newDate = `${birthYear}-${birthMonth}-${birthDay}`
      const currentDate = getValues('identity.birthDate')
      // Ne mettre à jour que si la date est différente pour éviter les boucles
      if (currentDate !== newDate) {
        setValue('identity.birthDate', newDate, { shouldValidate: true, shouldDirty: false })
      }
    }
  }, [birthDay, birthMonth, birthYear, setValue, getValues])

  // Initialiser photoPreview depuis la valeur du formulaire
  useEffect(() => {
    if (typeof photo === 'string' && photo.startsWith('data:')) {
      setPhotoPreview(photo)
    }
  }, [photo])

  // Ensure at least one contact field is present
  useEffect(() => {
    if (contacts.length === 0) {
      setValue('identity.contacts', [''])
    }
  }, [contacts.length, setValue])

  // Clear spouse info if marital status changes to not require it
  useEffect(() => {
    if (!requiresSpouseInfo) {
      setValue('identity.spouseLastName', '')
      setValue('identity.spouseFirstName', '')
      setValue('identity.spousePhone', '')
      clearErrors(['identity.spouseLastName', 'identity.spouseFirstName', 'identity.spousePhone'])
    }
  }, [requiresSpouseInfo, setValue, clearErrors])


  // Gérer l'upload de photo
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const result = event.target?.result as string
        setPhotoPreview(result)
        setValue('identity.photo', result)
      }
      reader.readAsDataURL(file)
    }
  }



  return (
    <div className="space-y-8">
      {/* En-tête avec animation */}
      <div className="text-center pb-6 animate-in fade-in-0 slide-in-from-top-4 duration-500">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-kara-primary-dark to-kara-primary-light rounded-full shadow-lg shadow-kara-primary-dark/20 mb-3">
          <Sparkles className="w-5 h-5 text-white animate-pulse" />
          <span className="text-white font-bold">Vos informations personnelles</span>
        </div>
        <p className="text-slate-500 text-sm max-w-md mx-auto">
          Créez votre profil en quelques étapes simples
        </p>
      </div>

      {/* Section Photo + Identité de base */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in-0 slide-in-from-left-4 duration-500 delay-100">
        {/* Photo de profil - Card dédiée */}
        <div className="lg:col-span-4">
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 border border-slate-200 h-full flex flex-col items-center justify-center">
            <label className="group cursor-pointer">
              <div className={cn(
                "relative w-32 h-32 rounded-full overflow-hidden transition-all duration-300",
                "bg-gradient-to-br from-kara-primary-dark/20 to-kara-primary-light/20",
                "border-4 border-dashed border-slate-300 group-hover:border-kara-primary-dark",
                "flex items-center justify-center",
                photoPreview && "border-solid border-kara-primary-light"
              )}>
                {photoPreview ? (
                  <>
                    <img src={photoPreview} alt="Photo" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="w-8 h-8 text-white" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  </>
                ) : (
                  <div className="text-center">
                    <Camera className="w-10 h-10 text-slate-400 group-hover:text-kara-primary-dark transition-colors mx-auto mb-2" />
                    <span className="text-xs text-slate-400 group-hover:text-kara-primary-dark">Ajouter photo</span>
                  </div>
                )}
              </div>
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handlePhotoUpload}
              />
            </label>
            <p className="text-xs text-slate-400 mt-3 text-center">
              Photo optionnelle<br />JPG, PNG (max 5MB)
            </p>
          </div>
        </div>

        {/* Informations de base */}
        <div className="lg:col-span-8 space-y-4">
          {/* Civilité + Genre */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-700 font-semibold text-sm flex items-center gap-2">
                <User className="w-4 h-4 text-kara-primary-dark" />
                Civilité *
              </Label>
              <Select onValueChange={(v) => setValue('identity.civility', v)} value={watch('identity.civility') || ''}>
                <SelectTrigger className="h-12 rounded-xl border-2 border-slate-200 hover:border-kara-primary-dark/30 focus:border-kara-primary-dark transition-all">
                  <SelectValue placeholder="Choisir..." />
                </SelectTrigger>
                <SelectContent>
                  {CIVILITIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.identity?.civility && (
                <p className="text-xs text-red-500">{errors.identity.civility.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700 font-semibold text-sm">Genre *</Label>
              <Select onValueChange={(v) => setValue('identity.gender', v)} value={watch('identity.gender') || ''}>
                <SelectTrigger className="h-12 rounded-xl border-2 border-slate-200 hover:border-kara-primary-dark/30 focus:border-kara-primary-dark transition-all">
                  <SelectValue placeholder="Choisir..." />
                </SelectTrigger>
                <SelectContent>
                  {GENDERS.map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.identity?.gender && (
                <p className="text-xs text-red-500">{errors.identity.gender.message}</p>
              )}
            </div>
          </div>

          {/* Nom + Prénom */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-700 font-semibold text-sm">Nom de famille *</Label>
              <Input
                {...register('identity.lastName')}
                placeholder="KOUMBA"
                className={cn(
                  "h-12 rounded-xl border-2 border-slate-200 hover:border-kara-primary-dark/30 focus:border-kara-primary-dark transition-all font-medium uppercase",
                  errors.identity?.lastName && "border-red-300 focus:border-red-400"
                )}
              />
              {errors.identity?.lastName && (
                <p className="text-xs text-red-500">{errors.identity.lastName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700 font-semibold text-sm">Prénom</Label>
              <Input
                {...register('identity.firstName')}
                placeholder="Jean-Pierre"
                className={cn(
                  "h-12 rounded-xl border-2 border-slate-200 hover:border-kara-primary-dark/30 focus:border-kara-primary-dark transition-all font-medium capitalize",
                  errors.identity?.firstName && "border-red-300 focus:border-red-400"
                )}
              />
              {errors.identity?.firstName && (
                <p className="text-xs text-red-500">{errors.identity.firstName.message}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Section Naissance - Card stylisée */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-200 animate-in fade-in-0 slide-in-from-right-4 duration-500 delay-150">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <h3 className="font-bold text-slate-800">Informations de naissance</h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Date de naissance avec 3 selects */}
          <div className="space-y-2">
            <Label className="text-slate-700 font-semibold text-sm">Date de naissance *</Label>
            <div className="flex gap-2">
              {/* Jour */}
              <Select value={birthDay} onValueChange={setBirthDay}>
                <SelectTrigger className="h-12 rounded-xl border-2 border-amber-200 hover:border-amber-400 focus:border-amber-500 transition-all flex-1 bg-white">
                  <SelectValue placeholder="Jour" />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Mois */}
              <Select value={birthMonth} onValueChange={setBirthMonth}>
                <SelectTrigger className="h-12 rounded-xl border-2 border-amber-200 hover:border-amber-400 focus:border-amber-500 transition-all flex-[2] bg-white">
                  <SelectValue placeholder="Mois" />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Année */}
              <Select value={birthYear} onValueChange={setBirthYear}>
                <SelectTrigger className="h-12 rounded-xl border-2 border-amber-200 hover:border-amber-400 focus:border-amber-500 transition-all flex-1 bg-white">
                  <SelectValue placeholder="Année" />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => (
                    <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {errors.identity?.birthDate && (
              <p className="text-xs text-red-500">{errors.identity.birthDate.message}</p>
            )}
          </div>

          {/* Lieu de naissance */}
          <div className="space-y-2">
            <Label className="text-slate-700 font-semibold text-sm">Lieu de naissance *</Label>
            <Input
              {...register('identity.birthPlace')}
              placeholder="Libreville, Gabon"
              className={cn(
                "h-12 rounded-xl border-2 border-amber-200 hover:border-amber-400 focus:border-amber-500 transition-all bg-white",
                errors.identity?.birthPlace && "border-red-300"
              )}
            />
            {errors.identity?.birthPlace && (
              <p className="text-xs text-red-500">{errors.identity.birthPlace.message}</p>
            )}
          </div>

          {/* Numéro d'acte de naissance */}
          <div className="space-y-2">
            <Label className="text-slate-700 font-semibold text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-600" />
              N° Acte de naissance *
            </Label>
            <Input
              {...register('identity.birthCertificateNumber')}
              placeholder="Ex: 1234/2020/LBV"
              className={cn(
                "h-12 rounded-xl border-2 border-amber-200 hover:border-amber-400 focus:border-amber-500 transition-all bg-white font-mono",
                errors.identity?.birthCertificateNumber && "border-red-300"
              )}
            />
            {errors.identity?.birthCertificateNumber && (
              <p className="text-xs text-red-500">{errors.identity.birthCertificateNumber.message}</p>
            )}
          </div>

          {/* Nationalité */}
          <div className="space-y-2">
            <Label className="text-slate-700 font-semibold text-sm flex items-center gap-2">
              <Globe className="w-4 h-4 text-amber-600" />
              Nationalité *
            </Label>
            <Select onValueChange={(v) => setValue('identity.nationality', v)} value={watch('identity.nationality') || ''}>
              <SelectTrigger className="h-12 rounded-xl border-2 border-amber-200 hover:border-amber-400 focus:border-amber-500 transition-all bg-white">
                <SelectValue placeholder="Sélectionnez..." />
              </SelectTrigger>
              <SelectContent>
                {NATIONALITIES.map((n) => (
                  <SelectItem key={n} value={n}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.identity?.nationality && (
              <p className="text-xs text-red-500">{errors.identity.nationality.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Section Contact - Card bleue */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200 animate-in fade-in-0 slide-in-from-left-4 duration-500 delay-200">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
            <Phone className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Contacts</h3>
            <p className="text-xs text-slate-500">Au moins un numéro requis</p>
          </div>
        </div>

        <GabonPhoneInputList
          values={contacts}
          onChange={(newContacts) => setValue('identity.contacts', newContacts, { shouldValidate: true })}
          maxContacts={3}
          error={errors.identity?.contacts?.message}
        />

        {/* Email */}
        <div className="mt-4 space-y-2">
          <Label className="text-slate-700 font-semibold text-sm flex items-center gap-2">
            <Mail className="w-4 h-4 text-blue-600" />
            Adresse email <span className="text-slate-400 font-normal">(optionnel)</span>
          </Label>
          <Input
            {...register('identity.email')}
            type="email"
            placeholder="votre@email.com"
            className={cn(
              "h-12 rounded-xl border-2 border-blue-200 hover:border-blue-400 focus:border-blue-500 transition-all bg-white",
              errors.identity?.email && "border-red-300"
            )}
          />
          {errors.identity?.email && (
            <p className="text-xs text-red-500">{errors.identity.email.message}</p>
          )}
        </div>
      </div>

      {/* Section Religion + Situation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in-0 slide-in-from-right-4 duration-500 delay-250">
        {/* Religion Card */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Church className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-bold text-slate-800">Religion</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-700 font-semibold text-sm">Religion *</Label>
              <Select onValueChange={(v) => setValue('identity.religion', v)} value={watch('identity.religion') || ''}>
                <SelectTrigger className="h-12 rounded-xl border-2 border-purple-200 hover:border-purple-400 focus:border-purple-500 transition-all bg-white">
                  <SelectValue placeholder="Sélectionnez..." />
                </SelectTrigger>
                <SelectContent>
                  {RELIGIONS.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.identity?.religion && (
                <p className="text-xs text-red-500">{errors.identity.religion.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700 font-semibold text-sm">Lieu de prière *</Label>
              <Input
                {...register('identity.prayerPlace')}
                placeholder="Ex: Église Saint-Michel, Mosquée..."
                className={cn(
                  "h-12 rounded-xl border-2 border-purple-200 hover:border-purple-400 focus:border-purple-500 transition-all bg-white",
                  errors.identity?.prayerPlace && "border-red-300"
                )}
              />
              {errors.identity?.prayerPlace && (
                <p className="text-xs text-red-500">{errors.identity.prayerPlace.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Situation Card */}
        <div className="bg-gradient-to-r from-rose-50 to-red-50 rounded-2xl p-6 border border-rose-200">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-red-500 flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-bold text-slate-800">Situation</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-700 font-semibold text-sm">Situation matrimoniale *</Label>
              <Select onValueChange={(v) => setValue('identity.maritalStatus', v)} value={watch('identity.maritalStatus') || ''}>
                <SelectTrigger className="h-12 rounded-xl border-2 border-rose-200 hover:border-rose-400 focus:border-rose-500 transition-all bg-white">
                  <SelectValue placeholder="Sélectionnez..." />
                </SelectTrigger>
                <SelectContent>
                  {MARITAL_STATUS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.identity?.maritalStatus && (
                <p className="text-xs text-red-500">{errors.identity.maritalStatus.message}</p>
              )}
            </div>

            {/* Référent / Code entremetteur */}
            <div className="space-y-2">
              <Label className="text-slate-700 font-semibold text-sm flex items-center gap-2">
                <Hash className="w-4 h-4 text-rose-600" />
                Qui vous a référé? *
              </Label>
              <Input
                {...register('identity.intermediaryCode')}
                placeholder="Ex: 1228.MK.0058"
                className={cn(
                  "h-12 rounded-xl border-2 border-rose-200 hover:border-rose-400 focus:border-rose-500 transition-all bg-white font-mono tracking-wider",
                  errors.identity?.intermediaryCode && "border-red-300"
                )}
              />
              <p className="text-xs text-rose-600">Format : XXXX.MK.XXXX</p>
              {errors.identity?.intermediaryCode && (
                <p className="text-xs text-red-500">{errors.identity.intermediaryCode.message}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Informations du conjoint (conditionnel) */}
      {requiresSpouseInfo && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200 animate-in fade-in-0 slide-in-from-bottom-4 duration-500 delay-350">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Informations du conjoint(e)</h3>
              <p className="text-xs text-blue-600 font-medium">
                {maritalStatus === 'Marié(e)' 
                  ? 'Ces informations sont requises car vous avez déclaré être marié(e)'
                  : 'Ces informations sont requises car vous avez déclaré être en concubinage'}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Nom et Prénom côte à côte */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-700 font-semibold text-sm">Nom du conjoint(e) *</Label>
                <Input
                  {...register('identity.spouseLastName')}
                  placeholder="MBOUMBA"
                  className={cn(
                    "h-12 rounded-xl border-2 border-blue-200 hover:border-blue-400 focus:border-blue-500 transition-all bg-white font-medium uppercase",
                    errors.identity?.spouseLastName && "border-red-300"
                  )}
                />
                {errors.identity?.spouseLastName && (isSubmitted || touchedFields.identity?.spouseLastName || watch('identity.spouseLastName')) && (
                  <p className="text-xs text-red-500 mt-1">{errors.identity.spouseLastName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700 font-semibold text-sm">Prénom du conjoint(e) *</Label>
                <Input
                  {...register('identity.spouseFirstName')}
                  placeholder="Marie"
                  className={cn(
                    "h-12 rounded-xl border-2 border-blue-200 hover:border-blue-400 focus:border-blue-500 transition-all bg-white font-medium capitalize",
                    errors.identity?.spouseFirstName && "border-red-300"
                  )}
                />
                {errors.identity?.spouseFirstName && (isSubmitted || touchedFields.identity?.spouseFirstName || watch('identity.spouseFirstName')) && (
                  <p className="text-xs text-red-500 mt-1">{errors.identity.spouseFirstName.message}</p>
                )}
              </div>
            </div>

            {/* Téléphone avec le composant unifié */}
            <div className="space-y-2">
              <Label className="text-slate-700 font-semibold text-sm flex items-center gap-2">
                <Phone className="w-4 h-4 text-blue-600" />
                Téléphone du conjoint(e) *
              </Label>
              <GabonPhoneInput
                value={watch('identity.spousePhone') || ''}
                onChange={(value) => setValue('identity.spousePhone', value, { shouldValidate: true })}
                error={errors.identity?.spousePhone?.message}
                placeholder="XX XX XX XX"
              />
            </div>
          </div>
        </div>
      )}

      {/* Question voiture */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-200 animate-in fade-in-0 slide-in-from-left-4 duration-500 delay-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300",
              hasCar 
                ? "bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/30" 
                : "bg-slate-200"
            )}>
              <Car className={cn("w-6 h-6 transition-colors", hasCar ? "text-white" : "text-slate-400")} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Possédez-vous une voiture ?</h3>
              <p className="text-xs text-slate-500">Cette information est importante pour nos services</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className={cn(
              "text-sm font-semibold transition-colors",
              hasCar ? "text-slate-400" : "text-slate-700"
            )}>Non</span>
            <Switch
              checked={hasCar === true}
              onCheckedChange={(checked) => setValue('identity.hasCar', checked)}
              className="data-[state=checked]:bg-emerald-500"
            />
            <span className={cn(
              "text-sm font-semibold transition-colors",
              hasCar ? "text-emerald-600" : "text-slate-400"
            )}>Oui</span>
          </div>
        </div>
        {errors.identity?.hasCar && (
          <p className="text-xs text-red-500 mt-2">{errors.identity.hasCar.message}</p>
        )}
      </div>
    </div>
  )
}
