'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Briefcase, 
  Building, 
  MapPin, 
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  TrendingUp,
  Coffee,
  GraduationCap,
  UserX,
  Info
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Step3Props {
  form: any // Type du form de react-hook-form
}

// Suggestions de professions
const PROFESSION_SUGGESTIONS = [
  'Ingénieur', 'Médecin', 'Enseignant', 'Comptable', 'Avocat',
  'Informaticien', 'Commercial', 'Infirmier', 'Architecte', 'Entrepreneur',
  'Banquier', 'Journaliste', 'Pharmacien', 'Électricien', 'Mécanicien'
]

// Suggestions d'ancienneté
const SENIORITY_SUGGESTIONS = [
  '6 mois', '1 an', '2 ans', '3 ans', '5 ans', '10 ans', '15 ans', '20 ans'
]

export default function Step3({ form }: Step3Props) {
  const [showProfessionSuggestions, setShowProfessionSuggestions] = useState(false)
  const [showSenioritySuggestions, setShowSenioritySuggestions] = useState(false)

  const { register, watch, setValue, formState: { errors } } = form

  // Watch pour la logique conditionnelle et animations
  const isEmployed = watch('company.isEmployed')
  const watchedFields = watch([
    'company.companyName',
    'company.companyAddress.province',
    'company.companyAddress.city',
    'company.companyAddress.district',
    'company.profession',
    'company.seniority'
  ])

  const handleToggleEmployment = (checked: boolean) => {
    setValue('company.isEmployed', checked)
    
    // Reset des champs si désactivé
    if (!checked) {
      setValue('company.companyName', '')
      setValue('company.companyAddress.province', '')
      setValue('company.companyAddress.city', '')
      setValue('company.companyAddress.district', '')
      setValue('company.profession', '')
      setValue('company.seniority', '')
    }
  }

  const handleSuggestionClick = (field: string, value: string) => {
    setValue(field, value)
    if (field === 'company.profession') setShowProfessionSuggestions(false)
    if (field === 'company.seniority') setShowSenioritySuggestions(false)
  }

  return (
    <div className="space-y-6 sm:space-y-8 w-full max-w-full overflow-x-hidden">
      {/* Header avec animation */}
      <div className="text-center space-y-3 animate-in fade-in-0 slide-in-from-top-4 duration-500 px-2">
        <div className="inline-flex items-center space-x-3 px-5 sm:px-6 py-3 bg-gradient-to-r from-[#224D62]/10 via-[#CBB171]/10 to-[#224D62]/10 rounded-full shadow-lg border border-[#224D62]/20">
          <Briefcase className="w-6 h-6 text-[#224D62]" />
          <span className="text-[#224D62] font-bold text-base sm:text-lg">Informations professionnelles</span>
        </div>
        <p className="text-[#224D62]/80 text-sm sm:text-base break-words font-medium">
          Renseignez vos informations d'emploi (section optionnelle)
        </p>
      </div>

      {/* Toggle principal avec card attractive */}
      <Card className="border-2 border-[#224D62]/20 bg-gradient-to-br from-[#224D62]/5 via-[#CBB171]/5 to-[#224D62]/10 animate-in fade-in-0 zoom-in-95 duration-700 delay-200 w-full shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 w-full">
            <div className="flex items-center space-x-3 w-full min-w-0">
              <div className={cn(
                "w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-500",
                isEmployed 
                  ? "bg-[#224D62] text-white" 
                  : "bg-gray-100 text-gray-400"
              )}>
                {isEmployed ? <Users className="w-6 h-6" /> : <UserX className="w-6 h-6" />}
              </div>
              <div className="min-w-0">
                <CardTitle className="text-base sm:text-lg text-[#224D62] truncate">
                  {isEmployed ? "Je travaille actuellement" : "Je ne travaille pas actuellement"}
                </CardTitle>
                <p className="text-xs sm:text-sm text-gray-600 mt-1 break-words">
                  {isEmployed 
                    ? "Complétez les informations de votre entreprise" 
                    : "Activez pour renseigner vos informations professionnelles"
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <Label htmlFor="employment-toggle" className="text-xs sm:text-sm font-medium text-[#224D62]">
                {isEmployed ? "Employé" : "Sans emploi"}
              </Label>
              <Switch
                id="employment-toggle"
                checked={isEmployed}
                onCheckedChange={handleToggleEmployment}
                className="data-[state=checked]:bg-[#224D62]"
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Section conditionnelle des informations d'entreprise */}
      <div className={cn(
        "transition-all duration-500 transform w-full",
        isEmployed 
          ? "opacity-100 translate-y-0 scale-100" 
          : "opacity-30 -translate-y-4 scale-95 pointer-events-none"
      )}>
        {!isEmployed && (
          <div className="text-center py-8 sm:py-12 space-y-4 w-full">
            <div className="w-16 sm:w-20 h-16 sm:h-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
              <Coffee className="w-8 sm:w-10 h-8 sm:h-10 text-gray-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-base sm:text-lg font-medium text-gray-500">Section désactivée</h3>
              <p className="text-xs sm:text-sm text-gray-400 break-words">
                Activez le bouton ci-dessus pour renseigner vos informations professionnelles
              </p>
            </div>
          </div>
        )}
        {isEmployed && (
          <div className="space-y-6 sm:space-y-8 animate-in fade-in-0 slide-in-from-bottom-4 duration-700 w-full">
            {/* Nom de l'entreprise */}
            <div className="space-y-2 animate-in fade-in-0 slide-in-from-left-4 duration-700 w-full min-w-0">
              <Label htmlFor="companyName" className="text-xs sm:text-sm font-medium text-[#224D62]">
                Nom de l'entreprise <span className="text-red-500">*</span>
              </Label>
              <div className="relative w-full min-w-0">
                <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171]" />
                <Input
                  id="companyName"
                  {...register('company.companyName')}
                  placeholder="Ex: Total Gabon, Ministère de la Santé..."
                  className={cn(
                    "pl-10 pr-10 border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20 transition-all duration-300 w-full",
                    errors?.company?.companyName && "border-red-300 focus:border-red-500 bg-red-50/50",
                    watchedFields[0] && !errors?.company?.companyName && "border-[#CBB171] bg-[#CBB171]/5"
                  )}
                />
                {watchedFields[0] && !errors?.company?.companyName && (
                  <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171] animate-in zoom-in-50 duration-200" />
                )}
              </div>
              {errors?.company?.companyName && (
                <div className="flex items-center space-x-1 text-red-500 text-xs animate-in slide-in-from-left-2 duration-300 break-words">
                  <AlertCircle className="w-3 h-3" />
                  <span>{errors.company.companyName.message}</span>
                </div>
              )}
            </div>
            {/* Adresse de l'entreprise */}
            <div className="space-y-4 w-full min-w-0">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-[#224D62]" />
                <Label className="text-xs sm:text-sm font-medium text-[#224D62]">
                  Adresse de l'entreprise <span className="text-red-500">*</span>
                </Label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 w-full">
                {/* Province entreprise */}
                <div className="space-y-2 animate-in fade-in-0 slide-in-from-left-4 duration-700 delay-200 w-full min-w-0">
                  <Label htmlFor="companyProvince" className="text-[10px] sm:text-xs font-medium text-gray-600">
                    Province
                  </Label>
                  <Input
                    id="companyProvince"
                    {...register('company.companyAddress.province')}
                    placeholder="Province"
                    className={cn(
                      "border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20 transition-all duration-300 w-full",
                      errors?.company?.companyAddress?.province && "border-red-300 focus:border-red-500 bg-red-50/50",
                      watchedFields[1] && !errors?.company?.companyAddress?.province && "border-[#CBB171] bg-[#CBB171]/5"
                    )}
                  />
                </div>
                {/* Ville entreprise */}
                <div className="space-y-2 animate-in fade-in-0 slide-in-from-bottom-4 duration-700 delay-300 w-full min-w-0">
                  <Label htmlFor="companyCity" className="text-[10px] sm:text-xs font-medium text-gray-600">
                    Ville
                  </Label>
                  <Input
                    id="companyCity"
                    {...register('company.companyAddress.city')}
                    placeholder="Ville"
                    className={cn(
                      "border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20 transition-all duration-300 w-full",
                      errors?.company?.companyAddress?.city && "border-red-300 focus:border-red-500 bg-red-50/50",
                      watchedFields[2] && !errors?.company?.companyAddress?.city && "border-[#CBB171] bg-[#CBB171]/5"
                    )}
                  />
                </div>
                {/* Quartier entreprise */}
                <div className="space-y-2 animate-in fade-in-0 slide-in-from-right-4 duration-700 delay-400 w-full min-w-0">
                  <Label htmlFor="companyDistrict" className="text-[10px] sm:text-xs font-medium text-gray-600">
                    Quartier
                  </Label>
                  <Input
                    id="companyDistrict"
                    {...register('company.companyAddress.district')}
                    placeholder="Quartier"
                    className={cn(
                      "border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20 transition-all duration-300 w-full",
                      errors?.company?.companyAddress?.district && "border-red-300 focus:border-red-500 bg-red-50/50",
                      watchedFields[3] && !errors?.company?.companyAddress?.district && "border-[#CBB171] bg-[#CBB171]/5"
                    )}
                  />
                </div>
              </div>
            </div>
            {/* Profession et Ancienneté */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6 w-full">
              {/* Profession */}
              <div className="space-y-2 animate-in fade-in-0 slide-in-from-left-4 duration-700 delay-500 w-full min-w-0">
                <Label htmlFor="profession" className="text-xs sm:text-sm font-medium text-[#224D62]">
                  Profession <span className="text-red-500">*</span>
                </Label>
                <div className="relative w-full min-w-0">
                  <GraduationCap className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171] z-10" />
                  <Input
                    id="profession"
                    {...register('company.profession')}
                    placeholder="Ex: Ingénieur, Médecin..."
                    onFocus={() => setShowProfessionSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowProfessionSuggestions(false), 200)}
                    className={cn(
                      "pl-10 pr-10 border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20 transition-all duration-300 w-full",
                      errors?.company?.profession && "border-red-300 focus:border-red-500 bg-red-50/50",
                      watchedFields[4] && !errors?.company?.profession && "border-[#CBB171] bg-[#CBB171]/5"
                    )}
                  />
                                  {watchedFields[4] && !errors?.company?.profession && (
                  <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171] animate-in zoom-in-50 duration-200 z-10" />
                )}
                  {/* Suggestions professions */}
                  {showProfessionSuggestions && (
                    <Card className="absolute top-full left-0 right-0 mt-1 z-20 border border-[#CBB171]/30 shadow-lg animate-in fade-in-0 slide-in-from-top-2 duration-200 max-h-32 sm:max-h-48 overflow-y-auto w-full">
                      <CardContent className="p-2">
                        <div className="space-y-1">
                          {PROFESSION_SUGGESTIONS.map((profession) => (
                            <Button
                              key={profession}
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start text-left hover:bg-[#224D62]/5 transition-colors text-xs sm:text-sm"
                              onMouseDown={() => handleSuggestionClick('company.profession', profession)}
                            >
                              {profession}
                            </Button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
                {errors?.company?.profession && (
                  <div className="flex items-center space-x-1 text-red-500 text-xs animate-in slide-in-from-left-2 duration-300 break-words">
                    <AlertCircle className="w-3 h-3" />
                    <span>{errors.company.profession.message}</span>
                  </div>
                )}
              </div>
              {/* Ancienneté */}
              <div className="space-y-2 animate-in fade-in-0 slide-in-from-right-4 duration-700 delay-600 w-full min-w-0">
                <Label htmlFor="seniority" className="text-xs sm:text-sm font-medium text-[#224D62]">
                  Ancienneté <span className="text-red-500">*</span>
                </Label>
                <div className="relative w-full min-w-0">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171] z-10" />
                  <Input
                    id="seniority"
                    {...register('company.seniority')}
                    placeholder="Ex: 2 ans, 6 mois..."
                    onFocus={() => setShowSenioritySuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSenioritySuggestions(false), 200)}
                    className={cn(
                      "pl-10 pr-10 border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20 transition-all duration-300 w-full",
                      errors?.company?.seniority && "border-red-300 focus:border-red-500 bg-red-50/50",
                      watchedFields[5] && !errors?.company?.seniority && "border-[#CBB171] bg-[#CBB171]/5"
                    )}
                  />
                                  {watchedFields[5] && !errors?.company?.seniority && (
                  <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171] animate-in zoom-in-50 duration-200 z-10" />
                )}
                  {/* Suggestions ancienneté */}
                  {showSenioritySuggestions && (
                    <Card className="absolute top-full left-0 right-0 mt-1 z-20 border border-[#CBB171]/30 shadow-lg animate-in fade-in-0 slide-in-from-top-2 duration-200 w-full">
                      <CardContent className="p-2">
                        <div className="space-y-1">
                          {SENIORITY_SUGGESTIONS.map((seniority) => (
                            <Button
                              key={seniority}
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start text-left hover:bg-[#224D62]/5 transition-colors text-xs sm:text-sm"
                              onMouseDown={() => handleSuggestionClick('company.seniority', seniority)}
                            >
                              {seniority}
                            </Button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
                {errors?.company?.seniority && (
                  <div className="flex items-center space-x-1 text-red-500 text-xs animate-in slide-in-from-right-2 duration-300 break-words">
                    <AlertCircle className="w-3 h-3" />
                    <span>{errors.company.seniority.message}</span>
                  </div>
                )}
                <div className="text-[10px] sm:text-xs text-gray-500">
                  Format attendu: "2 ans" ou "6 mois"
                </div>
              </div>
            </div>
            {/* Résumé professionnel */}
            {(watchedFields[0] || watchedFields[4]) && (
              <Card className="border border-[#224D62]/20 bg-gradient-to-r from-[#224D62]/5 to-[#CBB171]/5 animate-in fade-in-0 slide-in-from-bottom-4 duration-700 w-full">
                <CardContent className="p-3 sm:p-4 w-full">
                  <div className="flex items-start space-x-3 w-full min-w-0">
                    <TrendingUp className="w-5 h-5 text-[#224D62] mt-1 flex-shrink-0" />
                    <div className="space-y-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-[#224D62] truncate">Profil professionnel détecté</p>
                      <p className="text-[10px] sm:text-xs text-gray-600 truncate">
                        {watchedFields[4] && watchedFields[0] 
                          ? `${watchedFields[4]} chez ${watchedFields[0]}`
                          : watchedFields[4] 
                            ? `Profession: ${watchedFields[4]}`
                            : `Entreprise: ${watchedFields[0]}`
                        }
                        {watchedFields[5] && ` • ${watchedFields[5]} d'expérience`}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
      {/* Message d'information */}
      <div className="text-center p-4 sm:p-6 bg-gradient-to-r from-[#224D62]/5 via-[#CBB171]/5 to-[#224D62]/10 rounded-xl border border-[#224D62]/20 animate-in fade-in-0 slide-in-from-bottom-4 duration-700 delay-800 w-full max-w-full break-words shadow-lg">
        <div className="flex items-center justify-center space-x-3">
          <Info className="w-6 h-6 text-[#CBB171]" />
          <p className="text-sm sm:text-base text-[#224D62] font-bold">
            <strong>Information :</strong> Ces données professionnelles nous aident à mieux vous connaître et adapter nos services
          </p>
        </div>
      </div>
    </div>
  )
}