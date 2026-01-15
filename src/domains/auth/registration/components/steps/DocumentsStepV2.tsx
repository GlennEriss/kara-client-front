'use client'

import { useState, useRef, useEffect } from 'react'
import { useFormContext } from 'react-hook-form'
import {
  FileText,
  Upload,
  Camera,
  Calendar,
  MapPin,
  CreditCard,
  Check,
  AlertCircle,
  X,
  Shield,
  Sparkles,
  Eye,
  CheckCircle2,
  AlertTriangle,
  IdCard,       
  Book,
  Landmark,
  Badge,
  Clipboard
} from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn, compressImage, IMAGE_COMPRESSION_PRESETS } from '@/lib/utils'
import type { RegisterFormData } from '@/schemas/schemas'

const DOCUMENT_TYPES = [
  { value: 'CNI', label: 'Carte Nationale d\'Identité', icon: IdCard },
  { value: 'Passeport', label: 'Passeport', icon: Book },
  { value: 'Carte de séjour', label: 'Carte de séjour', icon: FileText },
  { value: 'Carte consulaire', label: 'Carte consulaire', icon: Landmark },
  { value: 'NIP', label: 'NIP', icon: Badge },
  { value: 'Autre', label: 'Autre document', icon: Clipboard },
] as const

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

// Générer les années
const currentYear = new Date().getFullYear()
const YEARS_ISSUING = Array.from({ length: 30 }, (_, i) => ({
  value: String(currentYear - i),
  label: String(currentYear - i)
}))
const YEARS_EXPIRY = Array.from({ length: 20 }, (_, i) => ({
  value: String(currentYear + i),
  label: String(currentYear + i)
}))

export default function DocumentsStepV2() {
  const { register, watch, setValue, getValues, formState: { errors, isSubmitted } } = useFormContext<RegisterFormData>()

  const getPreviewValue = (value: string | File | undefined): string | null => {
    if (typeof value === 'string') return value
    return null
  }

  const [frontPreview, setFrontPreview] = useState<string | null>(() => getPreviewValue(watch('documents.documentPhotoFront')))
  const [backPreview, setBackPreview] = useState<string | null>(() => getPreviewValue(watch('documents.documentPhotoBack')))
  const [isCompressingFront, setIsCompressingFront] = useState(false)
  const [isCompressingBack, setIsCompressingBack] = useState(false)

  // Fonction helper pour parser les dates
  const parseDate = (date: string | undefined) => {
    if (date && date.includes('-')) {
      const [year, month, day] = date.split('-')
      return { year: year || '', month: month || '', day: day || '' }
    }
    return { year: '', month: '', day: '' }
  }

  const termsAccepted = watch('documents.termsAccepted')
  const documentType = watch('documents.identityDocument')
  const issuingDate = watch('documents.issuingDate')
  const expirationDate = watch('documents.expirationDate')

  // Initialiser les dates depuis les valeurs du formulaire au montage
  const initialIssuingDate = getValues('documents.issuingDate')
  const initialExpirationDate = getValues('documents.expirationDate')
  const initialParsedIssuing = parseDate(initialIssuingDate)
  const initialParsedExpiry = parseDate(initialExpirationDate)

  // États pour les dates (jour/mois/année séparés)
  const [issuingDay, setIssuingDay] = useState(initialParsedIssuing.day)
  const [issuingMonth, setIssuingMonth] = useState(initialParsedIssuing.month)
  const [issuingYear, setIssuingYear] = useState(initialParsedIssuing.year)
  const [expiryDay, setExpiryDay] = useState(initialParsedExpiry.day)
  const [expiryMonth, setExpiryMonth] = useState(initialParsedExpiry.month)
  const [expiryYear, setExpiryYear] = useState(initialParsedExpiry.year)

  const frontInputRef = useRef<HTMLInputElement>(null)
  const backInputRef = useRef<HTMLInputElement>(null)

  // Initialiser les dates depuis les valeurs du formulaire quand elles changent
  useEffect(() => {
    // Date de délivrance
    const currentIssuingDate = issuingDate || getValues('documents.issuingDate')
    const parsedIssuing = parseDate(currentIssuingDate)
    if (parsedIssuing.day !== issuingDay || parsedIssuing.month !== issuingMonth || parsedIssuing.year !== issuingYear) {
      setIssuingYear(parsedIssuing.year)
      setIssuingMonth(parsedIssuing.month)
      setIssuingDay(parsedIssuing.day)
    }

    // Date d'expiration
    const currentExpirationDate = expirationDate || getValues('documents.expirationDate')
    const parsedExpiry = parseDate(currentExpirationDate)
    if (parsedExpiry.day !== expiryDay || parsedExpiry.month !== expiryMonth || parsedExpiry.year !== expiryYear) {
      setExpiryYear(parsedExpiry.year)
      setExpiryMonth(parsedExpiry.month)
      setExpiryDay(parsedExpiry.day)
    }
  }, [issuingDate, expirationDate, getValues]) // eslint-disable-line react-hooks/exhaustive-deps

  // Mettre à jour les dates quand les selects changent
  const updateIssuingDate = (day: string, month: string, year: string) => {
    if (day && month && year) {
      const newDate = `${year}-${month}-${day}`
      const currentDate = getValues('documents.issuingDate')
      // Ne mettre à jour que si la date est différente pour éviter les boucles
      if (currentDate !== newDate) {
        setValue('documents.issuingDate', newDate, { shouldValidate: true, shouldDirty: false })
      }
    }
  }

  const updateExpiryDate = (day: string, month: string, year: string) => {
    if (day && month && year) {
      const newDate = `${year}-${month}-${day}`
      const currentDate = getValues('documents.expirationDate')
      // Ne mettre à jour que si la date est différente pour éviter les boucles
      if (currentDate !== newDate) {
        setValue('documents.expirationDate', newDate, { shouldValidate: true, shouldDirty: false })
      }
    }
  }

  const handlePhotoUpload = async (file: File, isBack: boolean = false) => {
    if (!file || !file.type.startsWith('image/')) return

    const setCompressing = isBack ? setIsCompressingBack : setIsCompressingFront
    const setPreview = isBack ? setBackPreview : setFrontPreview
    const fieldName = isBack ? 'documents.documentPhotoBack' : 'documents.documentPhotoFront'

    setCompressing(true)

    try {
      const compressed = await compressImage(file, IMAGE_COMPRESSION_PRESETS.document)
      setPreview(compressed)
      setValue(fieldName, compressed)
    } catch (error) {
      console.error('Erreur de compression:', error)
    } finally {
      setCompressing(false)
    }
  }

  const removePhoto = (isBack: boolean) => {
    if (isBack) {
      setBackPreview(null)
      setValue('documents.documentPhotoBack', '')
      if (backInputRef.current) backInputRef.current.value = ''
    } else {
      setFrontPreview(null)
      setValue('documents.documentPhotoFront', '')
      if (frontInputRef.current) frontInputRef.current.value = ''
    }
  }

  // Calculer la progression
  const validationItems = [
    { label: 'Type de document', valid: !!documentType },
    { label: 'Numéro du document', valid: !!watch('documents.identityDocumentNumber') },
    { label: 'Photo recto', valid: !!frontPreview },
    { label: 'Date de délivrance', valid: !!watch('documents.issuingDate') },
    { label: 'Date d\'expiration', valid: !!watch('documents.expirationDate') },
    { label: 'Lieu de délivrance', valid: !!watch('documents.issuingPlace') },
    { label: 'Conditions acceptées', valid: !!termsAccepted },
  ]
  const completedCount = validationItems.filter(i => i.valid).length

  // Composant zone d'upload stylisée
  const PhotoUploadZone = ({
    isBack = false,
    preview,
    isCompressing,
    required = false
  }: {
    isBack?: boolean
    preview: string | null
    isCompressing: boolean
    required?: boolean
  }) => (
    <div className={cn(
      "relative rounded-2xl border-2 transition-all duration-300 overflow-hidden",
      preview 
        ? "border-purple-400 bg-purple-50" 
        : "border-dashed border-purple-200 hover:border-purple-400 hover:bg-purple-50/50"
    )}>
      <div
        onClick={() => (isBack ? backInputRef : frontInputRef).current?.click()}
        className={cn(
          "relative w-full h-52 cursor-pointer group",
          isCompressing && "pointer-events-none"
        )}
      >
        {isCompressing ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-purple-200 border-t-purple-500 animate-spin" />
              <Camera className="w-6 h-6 text-purple-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <p className="text-sm font-medium text-purple-600">Compression en cours...</p>
          </div>
        ) : preview ? (
          <>
            <img src={preview} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
              <div className="flex gap-2">
                <button
                  type="button"
                  className="px-3 py-1.5 bg-white/90 rounded-full text-sm font-medium text-slate-700 flex items-center gap-1 hover:bg-white transition-colors"
                >
                  <Camera className="w-4 h-4" />
                  Changer
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removePhoto(isBack) }}
                  className="px-3 py-1.5 bg-red-500 rounded-full text-sm font-medium text-white flex items-center gap-1 hover:bg-red-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                  Supprimer
                </button>
              </div>
            </div>
            
            {/* Badge de confirmation */}
            <div className="absolute top-3 right-3">
              <div className="px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full text-xs font-bold text-white flex items-center gap-1 shadow-lg">
                <Check className="w-3 h-3" />
                {isBack ? 'Verso' : 'Recto'}
              </div>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-6 group-hover:scale-105 transition-transform">
            <div className={cn(
              "w-20 h-20 rounded-2xl flex items-center justify-center transition-all",
              "bg-gradient-to-br from-purple-100 to-pink-100 group-hover:from-purple-200 group-hover:to-pink-200"
            )}>
              <Upload className="w-10 h-10 text-purple-500 group-hover:text-purple-600 transition-colors" />
            </div>
            <div className="text-center">
              <p className="text-base font-semibold text-slate-700">
                Photo {isBack ? 'verso' : 'recto'} {required && <span className="text-red-500">*</span>}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Cliquez ou déposez une image
              </p>
              <p className="text-xs text-purple-500 mt-1">
                PNG, JPG, WebP (max 5MB)
              </p>
            </div>
          </div>
        )}
      </div>

      <input
        ref={isBack ? backInputRef : frontInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handlePhotoUpload(file, isBack)
        }}
      />
    </div>
  )

  return (
    <div className="space-y-8">
      {/* En-tête avec animation */}
      <div className="text-center pb-6 animate-in fade-in-0 slide-in-from-top-4 duration-500">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full shadow-lg shadow-purple-500/20 mb-3">
          <Shield className="w-5 h-5 text-white" />
          <span className="text-white font-bold">Vérification d'identité</span>
        </div>
        <p className="text-slate-500 text-sm max-w-md mx-auto">
          Téléchargez les photos de votre document d'identité
        </p>
      </div>

      {/* Progression */}
      <div className="bg-gradient-to-r from-slate-50 to-purple-50/30 rounded-2xl p-4 border border-slate-200 animate-in fade-in-0 zoom-in-95 duration-500 delay-100">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-slate-700">Progression</span>
          <span className={cn(
            "text-sm font-bold",
            completedCount === validationItems.length ? "text-green-600" : "text-purple-600"
          )}>
            {completedCount}/{validationItems.length}
          </span>
        </div>
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full rounded-full transition-all duration-500",
              completedCount === validationItems.length 
                ? "bg-gradient-to-r from-green-500 to-emerald-500" 
                : "bg-gradient-to-r from-purple-500 to-pink-500"
            )}
            style={{ width: `${(completedCount / validationItems.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Type et numéro de document */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200 animate-in fade-in-0 slide-in-from-left-4 duration-500 delay-150">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <h3 className="font-bold text-slate-800">Informations du document</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-slate-700 font-semibold text-sm">Type de document *</Label>
            <Select
              value={documentType}
              onValueChange={(v) => {
                setValue('documents.identityDocument', v)
                // Réinitialiser le champ personnalisé si on change de type
                if (v !== 'Autre') {
                  setValue('documents.customDocumentType', '')
                }
              }}
            >
              <SelectTrigger className={cn(
                "h-12 rounded-xl border-2 transition-all bg-white",
                documentType ? "border-purple-400" : "border-purple-200 hover:border-purple-400"
              )}>
                <SelectValue placeholder="Sélectionnez..." />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map(d => {
                  const IconComponent = d.icon
                  return (
                    <SelectItem key={d.value} value={d.value}>
                      <span className="flex items-center gap-2">
                        <IconComponent className="w-4 h-4" />
                        <span>{d.label}</span>
                      </span>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
            {errors.documents?.identityDocument && (
              <p className="text-xs text-red-500">{errors.documents.identityDocument.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-slate-700 font-semibold text-sm flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-purple-600" />
              Numéro de document *
            </Label>
            <Input
              {...register('documents.identityDocumentNumber')}
              placeholder="Ex: 123456789"
              className={cn(
                "h-12 rounded-xl border-2 transition-all bg-white font-mono tracking-wider",
                watch('documents.identityDocumentNumber') 
                  ? "border-purple-400" 
                  : "border-purple-200 hover:border-purple-400 focus:border-purple-500"
              )}
            />
            {errors.documents?.identityDocumentNumber && (
              <p className="text-xs text-red-500">{errors.documents.identityDocumentNumber.message}</p>
            )}
          </div>
        </div>

        {/* Champ conditionnel pour le type de document personnalisé */}
        {documentType === 'Autre' && (
          <div className="space-y-2 animate-in fade-in-0 slide-in-from-top-4 duration-300">
            <Label className="text-slate-700 font-semibold text-sm flex items-center gap-2">
              <Clipboard className="w-4 h-4 text-purple-600" />
              Précisez le nom du document *
            </Label>
            <Input
              {...register('documents.customDocumentType')}
              placeholder="Ex: Attestation, Permis de conduire, Carte d'étudiant..."
              className={cn(
                "h-12 rounded-xl border-2 transition-all bg-white",
                watch('documents.customDocumentType') 
                  ? "border-purple-400" 
                  : "border-purple-200 hover:border-purple-400 focus:border-purple-500",
                errors.documents?.customDocumentType && "border-red-300"
              )}
            />
            {errors.documents?.customDocumentType && (isSubmitted || watch('documents.customDocumentType')) && (
              <p className="text-xs text-red-500 mt-1">{errors.documents.customDocumentType.message}</p>
            )}
            <p className="text-xs text-slate-500 mt-1">
              Indiquez le type exact de votre document d'identité
            </p>
          </div>
        )}
      </div>

      {/* Photos du document */}
      <div className="animate-in fade-in-0 slide-in-from-right-4 duration-500 delay-200">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
            <Camera className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Photos du document</h3>
            <p className="text-xs text-slate-500">Prenez des photos claires et lisibles</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <PhotoUploadZone
            preview={frontPreview}
            isCompressing={isCompressingFront}
            required
          />
          <PhotoUploadZone
            isBack
            preview={backPreview}
            isCompressing={isCompressingBack}
          />
        </div>
      </div>

      {/* Dates et lieu - Cards colorées */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-in fade-in-0 slide-in-from-left-4 duration-500 delay-250">
        {/* Date de délivrance */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-5 border border-blue-200">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-white" />
            </div>
            <Label className="text-slate-700 font-semibold text-sm">Délivrance *</Label>
          </div>
          
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Jour</Label>
              <Select value={issuingDay} onValueChange={(v) => { setIssuingDay(v); updateIssuingDate(v, issuingMonth, issuingYear) }}>
                <SelectTrigger className="h-11 rounded-lg border-2 border-blue-200 hover:border-blue-400 focus:border-blue-500 bg-white w-full transition-colors">
                  <SelectValue placeholder="Sélectionnez le jour" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {DAYS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Mois</Label>
              <Select value={issuingMonth} onValueChange={(v) => { setIssuingMonth(v); updateIssuingDate(issuingDay, v, issuingYear) }}>
                <SelectTrigger className="h-11 rounded-lg border-2 border-blue-200 hover:border-blue-400 focus:border-blue-500 bg-white w-full transition-colors">
                  <SelectValue placeholder="Sélectionnez le mois" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Année</Label>
              <Select value={issuingYear} onValueChange={(v) => { setIssuingYear(v); updateIssuingDate(issuingDay, issuingMonth, v) }}>
                <SelectTrigger className="h-11 rounded-lg border-2 border-blue-200 hover:border-blue-400 focus:border-blue-500 bg-white w-full transition-colors">
                  <SelectValue placeholder="Sélectionnez l'année" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {YEARS_ISSUING.map(y => <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          {errors.documents?.issuingDate && (issuingDay || issuingMonth || issuingYear) && (
            <p className="text-xs text-red-500 mt-3 font-medium">{errors.documents.issuingDate.message}</p>
          )}
        </div>

        {/* Date d'expiration */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-5 border border-amber-200">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-white" />
            </div>
            <Label className="text-slate-700 font-semibold text-sm">Expiration *</Label>
          </div>
          
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Jour</Label>
              <Select value={expiryDay} onValueChange={(v) => { setExpiryDay(v); updateExpiryDate(v, expiryMonth, expiryYear) }}>
                <SelectTrigger className="h-11 rounded-lg border-2 border-amber-200 hover:border-amber-400 focus:border-amber-500 bg-white w-full transition-colors">
                  <SelectValue placeholder="Sélectionnez le jour" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {DAYS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Mois</Label>
              <Select value={expiryMonth} onValueChange={(v) => { setExpiryMonth(v); updateExpiryDate(expiryDay, v, expiryYear) }}>
                <SelectTrigger className="h-11 rounded-lg border-2 border-amber-200 hover:border-amber-400 focus:border-amber-500 bg-white w-full transition-colors">
                  <SelectValue placeholder="Sélectionnez le mois" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Année</Label>
              <Select value={expiryYear} onValueChange={(v) => { setExpiryYear(v); updateExpiryDate(expiryDay, expiryMonth, v) }}>
                <SelectTrigger className="h-11 rounded-lg border-2 border-amber-200 hover:border-amber-400 focus:border-amber-500 bg-white w-full transition-colors">
                  <SelectValue placeholder="Sélectionnez l'année" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {YEARS_EXPIRY.map(y => <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          {errors.documents?.expirationDate && (expiryDay || expiryMonth || expiryYear || isSubmitted) && (
            <p className="text-xs text-red-500 mt-3 font-medium">{errors.documents.expirationDate.message}</p>
          )}
        </div>

        {/* Lieu de délivrance */}
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-5 border border-emerald-200">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-white" />
            </div>
            <Label className="text-slate-700 font-semibold text-sm">Lieu *</Label>
          </div>
          
          <Input
            {...register('documents.issuingPlace')}
            placeholder="Ex: Libreville"
            className={cn(
              "h-10 rounded-lg border-2 transition-all bg-white",
              watch('documents.issuingPlace') 
                ? "border-emerald-400" 
                : "border-emerald-200 hover:border-emerald-400 focus:border-emerald-500"
            )}
          />
          {errors.documents?.issuingPlace && (
            <p className="text-xs text-red-500 mt-2">{errors.documents.issuingPlace.message}</p>
          )}
        </div>
      </div>

      {/* Récapitulatif validation */}
      <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-2xl p-5 border border-slate-200 animate-in fade-in-0 slide-in-from-bottom-4 duration-500 delay-300">
        <div className="flex items-center gap-2 mb-4">
          <Eye className="w-5 h-5 text-slate-600" />
          <span className="text-sm font-semibold text-slate-700">État de validation</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {validationItems.slice(0, -1).map((item) => (
            <div 
              key={item.label} 
              className={cn(
                "flex items-center gap-2 p-3 rounded-xl transition-all",
                item.valid 
                  ? "bg-green-100 border border-green-200" 
                  : "bg-red-50 border border-red-100"
              )}
            >
              {item.valid ? (
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              )}
              <span className={cn(
                "text-xs font-medium",
                item.valid ? "text-green-700" : "text-red-600"
              )}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Checkbox conditions - Design amélioré */}
      <div
        className={cn(
          "p-6 rounded-2xl border-2 transition-all duration-500 animate-in fade-in-0 slide-in-from-bottom-4 duration-500 delay-350",
          termsAccepted
            ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-300"
            : "bg-gradient-to-r from-red-50 to-rose-50 border-red-200"
        )}
      >
        <div className="flex items-start gap-4">
          <div 
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-all",
              termsAccepted 
                ? "bg-gradient-to-br from-green-500 to-emerald-500 shadow-lg shadow-green-500/30" 
                : "bg-red-100 hover:bg-red-200"
            )}
            onClick={() => setValue('documents.termsAccepted', !termsAccepted)}
          >
            {termsAccepted ? (
              <Check className="w-5 h-5 text-white" />
            ) : (
              <X className="w-5 h-5 text-red-400" />
            )}
          </div>
          
          <div className="flex-1">
            <label
              htmlFor="termsAccepted"
              onClick={() => setValue('documents.termsAccepted', !termsAccepted)}
              className={cn(
                "text-base font-semibold cursor-pointer",
                termsAccepted ? "text-green-800" : "text-red-700"
              )}
            >
              J'accepte les conditions *
            </label>
            <p className={cn(
              "text-sm mt-1",
              termsAccepted ? "text-green-600" : "text-red-600"
            )}>
              Je confirme avoir lu et approuvé les conditions d'utilisation.
              J'accepte que mes documents soient utilisés pour la vérification de mon identité.
            </p>
            
            {termsAccepted && (
              <div className="flex items-center gap-2 mt-3 animate-in fade-in zoom-in duration-300">
                <Sparkles className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium text-green-600">Merci pour votre confiance !</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
