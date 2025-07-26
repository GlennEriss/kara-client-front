'use client'

import React, { useState } from 'react'
import { useFieldArray } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Shield, 
  FileText, 
  Calendar, 
  DollarSign,
  Users,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  Heart,
  Car,
  Home,
  Plane,
  ShieldCheck,
  ShieldX,
  Info,
  Award
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Step4Props {
  form: any // Type du form de react-hook-form
}

// Types d'assurance avec icônes
const INSURANCE_TYPES = [
  { value: 'Assurance maladie', label: 'Assurance maladie', icon: Heart },
  { value: 'Assurance vie', label: 'Assurance vie', icon: Shield },
  { value: 'Assurance auto', label: 'Assurance auto', icon: Car },
  { value: 'Assurance habitation', label: 'Assurance habitation', icon: Home },
  { value: 'Assurance voyage', label: 'Assurance voyage', icon: Plane },
  { value: 'Assurance professionnelle', label: 'Assurance professionnelle', icon: Award },
  { value: 'Mutuelle santé', label: 'Mutuelle santé', icon: Heart },
  { value: 'Assurance responsabilité civile', label: 'Assurance responsabilité civile', icon: ShieldCheck },
  { value: 'Autre', label: 'Autre', icon: FileText }
]

// Suggestions de compagnies d'assurance
const INSURANCE_COMPANIES = [
  'NSIA Assurances', 'SAHAM Assurance', 'GRAS SAVOYE', 'COLINA', 
  'AGF Assurances', 'AXA Assurances', 'SUNU Assurances', 'UAP Assurances',
  'SONAM', 'Star Assurances', 'Autre'
]

export default function Step4({ form }: Step4Props) {
  const [showCompanySuggestions, setShowCompanySuggestions] = useState(false)

  const { register, watch, setValue, formState: { errors }, control } = form

  // Field array pour les bénéficiaires
  const { fields, append, remove } = useFieldArray({
    control,
    name: "insurance.beneficiaries"
  })

  // Watch pour la logique conditionnelle et animations
  const hasInsurance = watch('insurance.hasInsurance')
  const selectedType = watch('insurance.insuranceType')
  const watchedFields = watch([
    'insurance.insuranceName',
    'insurance.policyNumber',
    'insurance.startDate',
    'insurance.expirationDate',
    'insurance.coverageAmount'
  ])

  const handleToggleInsurance = (checked: boolean) => {
    setValue('insurance.hasInsurance', checked)
    
    // Reset des champs si désactivé
    if (!checked) {
      setValue('insurance.insuranceName', '')
      setValue('insurance.insuranceType', 'Assurance maladie')
      setValue('insurance.policyNumber', '')
      setValue('insurance.startDate', '')
      setValue('insurance.expirationDate', '')
      setValue('insurance.coverageAmount', '')
      setValue('insurance.beneficiaries', [])
      setValue('insurance.additionalNotes', '')
    }
  }

  const handleCompanySelect = (company: string) => {
    setValue('insurance.insuranceName', company)
    setShowCompanySuggestions(false)
  }

  const addBeneficiary = () => {
    if (fields.length < 5) {
      append('')
    }
  }

  // Obtenir l'icône du type d'assurance sélectionné
  const getSelectedTypeIcon = () => {
    const type = INSURANCE_TYPES.find(t => t.value === selectedType)
    return type ? type.icon : Shield
  }

  const SelectedIcon = getSelectedTypeIcon()

  return (
    <div className="space-y-6 sm:space-y-8 w-full max-w-full overflow-x-hidden">
      {/* Header avec animation */}
      <div className="text-center space-y-2 animate-in fade-in-0 slide-in-from-top-4 duration-500 px-2">
        <div className="inline-flex items-center space-x-2 px-3 sm:px-4 py-2 bg-[#224D62]/10 rounded-full">
          <Shield className="w-5 h-5 text-[#224D62]" />
          <span className="text-[#224D62] font-medium text-sm sm:text-base">Couverture d'assurance</span>
        </div>
        <p className="text-gray-600 text-xs sm:text-sm break-words">
          Renseignez vos informations d'assurance pour une protection optimale (section optionnelle)
        </p>
      </div>

      {/* Toggle principal avec card attractive */}
      <Card className="border-2 border-[#CBB171]/20 bg-gradient-to-br from-[#224D62]/5 to-[#CBB171]/5 animate-in fade-in-0 zoom-in-95 duration-700 delay-200 w-full">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 w-full">
            <div className="flex items-center space-x-3 w-full min-w-0">
              <div className={cn(
                "w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-500",
                hasInsurance 
                  ? "bg-[#224D62] text-white" 
                  : "bg-gray-100 text-gray-400"
              )}>
                {hasInsurance ? <ShieldCheck className="w-6 h-6" /> : <ShieldX className="w-6 h-6" />}
              </div>
              <div className="min-w-0">
                <CardTitle className="text-base sm:text-lg text-[#224D62] truncate">
                  {hasInsurance ? "J'ai une assurance" : "Je n'ai pas d'assurance"}
                </CardTitle>
                <p className="text-xs sm:text-sm text-gray-600 mt-1 break-words">
                  {hasInsurance 
                    ? "Complétez les détails de votre couverture d'assurance" 
                    : "Activez pour renseigner vos informations d'assurance"
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <Label htmlFor="insurance-toggle" className="text-xs sm:text-sm font-medium text-[#224D62]">
                {hasInsurance ? "Assuré" : "Non assuré"}
              </Label>
              <Switch
                id="insurance-toggle"
                checked={hasInsurance}
                onCheckedChange={handleToggleInsurance}
                className="data-[state=checked]:bg-[#224D62]"
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Section conditionnelle des informations d'assurance */}
      <div className={cn(
        "transition-all duration-500 transform w-full",
        hasInsurance 
          ? "opacity-100 translate-y-0 scale-100" 
          : "opacity-30 -translate-y-4 scale-95 pointer-events-none"
      )}>
        {!hasInsurance && (
          <div className="text-center py-8 sm:py-12 space-y-4 w-full">
            <div className="w-16 sm:w-20 h-16 sm:h-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
              <ShieldX className="w-8 sm:w-10 h-8 sm:h-10 text-gray-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-base sm:text-lg font-medium text-gray-500">Section désactivée</h3>
              <p className="text-xs sm:text-sm text-gray-400 break-words">
                Activez le bouton ci-dessus pour renseigner vos informations d'assurance
              </p>
            </div>
          </div>
        )}
        {hasInsurance && (
          <div className="space-y-6 sm:space-y-8 animate-in fade-in-0 slide-in-from-bottom-4 duration-700 w-full">
            {/* Nom de l'assurance et Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6 w-full">
              {/* Nom de l'assurance */}
              <div className="space-y-2 animate-in fade-in-0 slide-in-from-left-4 duration-700 w-full min-w-0">
                <Label htmlFor="insuranceName" className="text-xs sm:text-sm font-medium text-[#224D62]">
                  Nom de l'assurance <span className="text-red-500">*</span>
                </Label>
                <div className="relative w-full min-w-0">
                  <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171] z-10" />
                  <Input
                    id="insuranceName"
                    {...register('insurance.insuranceName')}
                    placeholder="Ex: NSIA Assurances, AXA..."
                    onFocus={() => setShowCompanySuggestions(true)}
                    onBlur={() => setTimeout(() => setShowCompanySuggestions(false), 200)}
                    className={cn(
                      "pl-10 pr-10 border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20 transition-all duration-300 w-full",
                      errors?.insurance?.insuranceName && "border-red-300 focus:border-red-500 bg-red-50/50",
                      watchedFields[0] && !errors?.insurance?.insuranceName && "border-green-300 bg-green-50/30"
                    )}
                  />
                  {watchedFields[0] && !errors?.insurance?.insuranceName && (
                    <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-500 animate-in zoom-in-50 duration-200 z-10" />
                  )}
                  {/* Suggestions compagnies */}
                  {showCompanySuggestions && (
                    <Card className="absolute top-full left-0 right-0 mt-1 z-20 border border-[#CBB171]/30 shadow-lg animate-in fade-in-0 slide-in-from-top-2 duration-200 max-h-32 sm:max-h-48 overflow-y-auto w-full">
                      <CardContent className="p-2">
                        <div className="space-y-1">
                          {INSURANCE_COMPANIES.map((company) => (
                            <Button
                              key={company}
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start text-left hover:bg-[#224D62]/5 transition-colors text-xs sm:text-sm"
                              onMouseDown={() => handleCompanySelect(company)}
                            >
                              {company}
                            </Button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
                {errors?.insurance?.insuranceName && (
                  <div className="flex items-center space-x-1 text-red-500 text-xs animate-in slide-in-from-left-2 duration-300 break-words">
                    <AlertCircle className="w-3 h-3" />
                    <span>{errors.insurance.insuranceName.message}</span>
                  </div>
                )}
              </div>
              {/* Type d'assurance */}
              <div className="space-y-2 animate-in fade-in-0 slide-in-from-right-4 duration-700 delay-100 w-full min-w-0">
                <Label className="text-xs sm:text-sm font-medium text-[#224D62]">
                  Type d'assurance <span className="text-red-500">*</span>
                </Label>
                <Select 
                  onValueChange={(value) => setValue('insurance.insuranceType', value)}
                  defaultValue={watch('insurance.insuranceType')}
                >
                  <SelectTrigger className="border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20 transition-all duration-300 w-full">
                    <div className="flex items-center space-x-2">
                      <SelectedIcon className="w-4 h-4 text-[#CBB171]" />
                      <SelectValue placeholder="Sélectionner le type" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {INSURANCE_TYPES.map((type) => {
                      const IconComponent = type.icon
                      return (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center space-x-2">
                            <IconComponent className="w-4 h-4" />
                            <span>{type.label}</span>
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* Numéro de police et montant */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6 w-full">
              {/* Numéro de police */}
              <div className="space-y-2 animate-in fade-in-0 slide-in-from-left-4 duration-700 delay-200 w-full min-w-0">
                <Label htmlFor="policyNumber" className="text-xs sm:text-sm font-medium text-[#224D62]">
                  Numéro de police <span className="text-red-500">*</span>
                </Label>
                <div className="relative w-full min-w-0">
                  <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171]" />
                  <Input
                    id="policyNumber"
                    {...register('insurance.policyNumber')}
                    placeholder="Ex: POL-2024-001234"
                    className={cn(
                      "pl-10 pr-10 border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20 transition-all duration-300 w-full",
                      errors?.insurance?.policyNumber && "border-red-300 focus:border-red-500 bg-red-50/50",
                      watchedFields[1] && !errors?.insurance?.policyNumber && "border-green-300 bg-green-50/30"
                    )}
                  />
                  {watchedFields[1] && !errors?.insurance?.policyNumber && (
                    <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-500 animate-in zoom-in-50 duration-200" />
                  )}
                </div>
                {errors?.insurance?.policyNumber && (
                  <div className="flex items-center space-x-1 text-red-500 text-xs animate-in slide-in-from-left-2 duration-300 break-words">
                    <AlertCircle className="w-3 h-3" />
                    <span>{errors.insurance.policyNumber.message}</span>
                  </div>
                )}
              </div>
              {/* Montant de couverture */}
              <div className="space-y-2 animate-in fade-in-0 slide-in-from-right-4 duration-700 delay-300 w-full min-w-0">
                <Label htmlFor="coverageAmount" className="text-xs sm:text-sm font-medium text-[#224D62]">
                  Montant de couverture
                  <Badge variant="secondary" className="ml-2 bg-[#CBB171]/10 text-[#CBB171] text-[10px] sm:text-xs">
                    Optionnel
                  </Badge>
                </Label>
                <div className="relative w-full min-w-0">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171]" />
                  <Input
                    id="coverageAmount"
                    {...register('insurance.coverageAmount')}
                    placeholder="Ex: 50000.00"
                    className={cn(
                      "pl-10 border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20 transition-all duration-300 w-full",
                      watchedFields[4] && "border-[#CBB171]/50 bg-[#CBB171]/5"
                    )}
                  />
                </div>
                <div className="text-[10px] sm:text-xs text-gray-500">
                  Format: 50000.00 (en FCFA)
                </div>
              </div>
            </div>
            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6 w-full">
              {/* Date de début */}
              <div className="space-y-2 animate-in fade-in-0 slide-in-from-left-4 duration-700 delay-400 w-full min-w-0">
                <Label htmlFor="startDate" className="text-xs sm:text-sm font-medium text-[#224D62]">
                  Date de début <span className="text-red-500">*</span>
                </Label>
                <div className="relative w-full min-w-0">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171]" />
                  <Input
                    id="startDate"
                    type="date"
                    {...register('insurance.startDate')}
                    className={cn(
                      "pl-10 pr-10 border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20 transition-all duration-300 w-full",
                      errors?.insurance?.startDate && "border-red-300 focus:border-red-500 bg-red-50/50",
                      watchedFields[2] && !errors?.insurance?.startDate && "border-green-300 bg-green-50/30"
                    )}
                  />
                  {watchedFields[2] && !errors?.insurance?.startDate && (
                    <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-500 animate-in zoom-in-50 duration-200" />
                  )}
                </div>
                {errors?.insurance?.startDate && (
                  <div className="flex items-center space-x-1 text-red-500 text-xs animate-in slide-in-from-left-2 duration-300 break-words">
                    <AlertCircle className="w-3 h-3" />
                    <span>{errors.insurance.startDate.message}</span>
                  </div>
                )}
              </div>
              {/* Date d'expiration */}
              <div className="space-y-2 animate-in fade-in-0 slide-in-from-right-4 duration-700 delay-500 w-full min-w-0">
                <Label htmlFor="expirationDate" className="text-xs sm:text-sm font-medium text-[#224D62]">
                  Date d'expiration <span className="text-red-500">*</span>
                </Label>
                <div className="relative w-full min-w-0">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171]" />
                  <Input
                    id="expirationDate"
                    type="date"
                    {...register('insurance.expirationDate')}
                    className={cn(
                      "pl-10 pr-10 border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20 transition-all duration-300 w-full",
                      errors?.insurance?.expirationDate && "border-red-300 focus:border-red-500 bg-red-50/50",
                      watchedFields[3] && !errors?.insurance?.expirationDate && "border-green-300 bg-green-50/30"
                    )}
                  />
                  {watchedFields[3] && !errors?.insurance?.expirationDate && (
                    <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-500 animate-in zoom-in-50 duration-200" />
                  )}
                </div>
                {errors?.insurance?.expirationDate && (
                  <div className="flex items-center space-x-1 text-red-500 text-xs animate-in slide-in-from-right-2 duration-300 break-words">
                    <AlertCircle className="w-3 h-3" />
                    <span>{errors.insurance.expirationDate.message}</span>
                  </div>
                )}
              </div>
            </div>
            {/* Bénéficiaires */}
            <div className="space-y-3 sm:space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-700 delay-600 w-full min-w-0">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 w-full">
                <Label className="text-xs sm:text-sm font-medium text-[#224D62]">
                  Bénéficiaires 
                  <Badge variant="secondary" className="ml-2 bg-[#CBB171]/10 text-[#CBB171] text-[10px] sm:text-xs">
                    Optionnel
                  </Badge>
                </Label>
                {fields.length < 5 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addBeneficiary}
                    className="border-[#CBB171] text-[#CBB171] hover:bg-[#CBB171]/10 transition-all duration-300 hover:scale-105 w-full sm:w-auto"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Ajouter
                  </Button>
                )}
              </div>
              {fields.length > 0 && (
                <div className="space-y-2 sm:space-y-3 w-full">
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex space-x-2 animate-in slide-in-from-left-4 duration-300 w-full min-w-0" style={{ animationDelay: `${index * 100}ms` }}>
                      <div className="flex-1 relative min-w-0">
                        <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171]" />
                        <Input
                          {...register(`insurance.beneficiaries.${index}`)}
                          placeholder={`Bénéficiaire ${index + 1}`}
                          className="pl-10 border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20 transition-all duration-300 w-full"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => remove(index)}
                        className="border-red-300 text-red-500 hover:bg-red-50 transition-all duration-300 hover:scale-105"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              {fields.length === 0 && (
                <div className="text-center py-4 sm:py-6 border-2 border-dashed border-gray-200 rounded-lg w-full">
                  <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-xs sm:text-sm text-gray-500">Aucun bénéficiaire ajouté</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={addBeneficiary}
                    className="mt-2 text-[#CBB171] hover:bg-[#CBB171]/10 w-full sm:w-auto"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Ajouter le premier bénéficiaire
                  </Button>
                </div>
              )}
            </div>
            {/* Notes complémentaires */}
            <div className="space-y-2 animate-in fade-in-0 slide-in-from-bottom-4 duration-700 delay-700 w-full min-w-0">
              <Label htmlFor="additionalNotes" className="text-xs sm:text-sm font-medium text-[#224D62]">
                Notes complémentaires
                <Badge variant="secondary" className="ml-2 bg-[#CBB171]/10 text-[#CBB171] text-[10px] sm:text-xs">
                  Optionnel
                </Badge>
              </Label>
              <div className="relative w-full min-w-0">
                <Info className="absolute left-3 top-3 w-4 h-4 text-[#CBB171]" />
                <Textarea
                  id="additionalNotes"
                  {...register('insurance.additionalNotes')}
                  placeholder="Informations supplémentaires sur votre assurance..."
                  rows={3}
                  className="pl-10 border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20 transition-all duration-300 resize-none w-full"
                />
              </div>
            </div>
            {/* Résumé de l'assurance */}
            {(watchedFields[0] || selectedType) && (
              <Card className="border border-[#224D62]/20 bg-gradient-to-r from-[#224D62]/5 to-[#CBB171]/5 animate-in fade-in-0 slide-in-from-bottom-4 duration-700 w-full">
                <CardContent className="p-3 sm:p-4 w-full">
                  <div className="flex items-start space-x-3 w-full min-w-0">
                    <SelectedIcon className="w-5 h-5 text-[#224D62] mt-1 flex-shrink-0" />
                    <div className="space-y-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-[#224D62] truncate">Couverture d'assurance détectée</p>
                      <p className="text-[10px] sm:text-xs text-gray-600 truncate">
                        {selectedType && watchedFields[0] 
                          ? `${selectedType} chez ${watchedFields[0]}`
                          : selectedType 
                            ? `Type: ${selectedType}`
                            : `Assurance: ${watchedFields[0]}`
                        }
                        {watchedFields[1] && ` • Police: ${watchedFields[1]}`}
                        {watchedFields[4] && ` • Couverture: ${watchedFields[4]} FCFA`}
                      </p>
                      {fields.length > 0 && (
                        <p className="text-[10px] sm:text-xs text-[#CBB171]">
                          {fields.length} bénéficiaire{fields.length > 1 ? 's' : ''} ajouté{fields.length > 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
      {/* Message final */}
      <div className="text-center p-3 sm:p-4 bg-gradient-to-r from-[#224D62]/5 to-[#CBB171]/5 rounded-lg border border-[#224D62]/20 animate-in fade-in-0 slide-in-from-bottom-4 duration-700 delay-800 w-full max-w-full break-words">
        <p className="text-xs sm:text-sm text-[#224D62]">
          🛡️ <strong>Protection :</strong> Vos informations d'assurance nous permettent de mieux vous accompagner en cas de besoin
        </p>
      </div>
    </div>
  )
}