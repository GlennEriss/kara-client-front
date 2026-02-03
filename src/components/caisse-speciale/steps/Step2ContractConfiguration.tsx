"use client"

import React, { useEffect } from 'react'
import { useContractForm } from '@/providers/ContractFormProvider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Settings, 
  DollarSign, 
  Calendar, 
  AlertTriangle,
  CheckCircle,
  Loader2,
  Info
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCaisseSettingsValidation } from '@/hooks/useCaisseSettingsValidation'

export function Step2ContractConfiguration() {
  const { state, updateFormData, validateCurrentStep } = useContractForm()
  const { formData } = state

  // Validation des paramètres de la Caisse Spéciale
  const { isValid, isLoading: isValidating, error: validationError, settings } = useCaisseSettingsValidation(formData.caisseType)

  // Validation de l'étape
  useEffect(() => {
    const isValid = Boolean(
      formData.caisseType &&
      formData.monthlyAmount > 0 &&
      formData.monthsPlanned > 0 &&
      (
        (formData.caisseType !== 'LIBRE' && formData.caisseType !== 'LIBRE_CHARITABLE') ||
        formData.monthlyAmount >= 100000
      )
    )
    validateCurrentStep(isValid)
  }, [formData.caisseType, formData.monthlyAmount, formData.monthsPlanned, validateCurrentStep])

  // Gestion du changement de type de caisse
  const handleCaisseTypeChange = (
    type:
      | 'STANDARD'
      | 'JOURNALIERE'
      | 'LIBRE'
      | 'STANDARD_CHARITABLE'
      | 'JOURNALIERE_CHARITABLE'
      | 'LIBRE_CHARITABLE'
  ) => {
    const isLibreType = type === 'LIBRE' || type === 'LIBRE_CHARITABLE'
    const isDailyType = type === 'JOURNALIERE' || type === 'JOURNALIERE_CHARITABLE'
    updateFormData({ 
      caisseType: type,
      // Ajuster le montant minimum pour LIBRE
      monthlyAmount: isLibreType && formData.monthlyAmount < 100000 ? 100000 : formData.monthlyAmount,
      // Ajuster la durée pour JOURNALIERE
      monthsPlanned: isDailyType && formData.monthsPlanned > 12 ? 12 : formData.monthsPlanned
    })
  }

  // Gestion du changement de montant
  const handleAmountChange = (value: string) => {
    const amount = Number(value)
    if (!isNaN(amount) && amount >= 0) {
      updateFormData({ monthlyAmount: amount })
    }
  }

  // Gestion du changement de durée
  const handleMonthsChange = (value: string) => {
    if (value === '') {
      updateFormData({ monthsPlanned: 0 })
      return
    }

    const months = Number(value)
    if (Number.isNaN(months)) {
      return
    }

    const maxMonths =
      formData.caisseType === 'JOURNALIERE' || formData.caisseType === 'JOURNALIERE_CHARITABLE'
        ? 12
        : 60
    const sanitizedMonths = Math.max(0, Math.floor(months))
    updateFormData({ monthsPlanned: Math.min(sanitizedMonths, maxMonths) })
  }

  const isDaily = formData.caisseType === 'JOURNALIERE' || formData.caisseType === 'JOURNALIERE_CHARITABLE'
  const isLibre = formData.caisseType === 'LIBRE' || formData.caisseType === 'LIBRE_CHARITABLE'
  const isCharitable = formData.caisseType?.endsWith('_CHARITABLE')

  return (
    <div className="space-y-6">
      {/* Titre de l'étape */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Configuration du contrat
        </h2>
        <p className="text-gray-600">
          Définissez le montant, la durée et le type de caisse
        </p>
      </div>

      {/* Sélection du type de caisse */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg text-gray-900 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Type de caisse
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Caisse Standard */}
            <Button
              variant={formData.caisseType === 'STANDARD' ? 'default' : 'outline'}
              onClick={() => handleCaisseTypeChange('STANDARD')}
              className={cn(
                "h-24 flex flex-col items-center justify-center gap-2 transition-all duration-300",
                formData.caisseType === 'STANDARD'
                  ? "bg-[#234D65] hover:bg-[#2c5a73] text-white shadow-lg"
                  : "border-2 border-gray-300 hover:border-[#234D65] hover:bg-[#234D65]/5"
              )}
            >
              <DollarSign className="w-6 h-6" />
              <span className="font-semibold">Standard</span>
              <span className="text-xs opacity-80">Versement mensuel fixe</span>
            </Button>

            {/* Caisse Journalière */}
            <Button
              variant={formData.caisseType === 'JOURNALIERE' ? 'default' : 'outline'}
              onClick={() => handleCaisseTypeChange('JOURNALIERE')}
              className={cn(
                "h-24 flex flex-col items-center justify-center gap-2 transition-all duration-300",
                formData.caisseType === 'JOURNALIERE'
                  ? "bg-[#234D65] hover:bg-[#2c5a73] text-white shadow-lg"
                  : "border-2 border-gray-300 hover:border-[#234D65] hover:bg-[#234D65]/5"
              )}
            >
              <Calendar className="w-6 h-6" />
              <span className="font-semibold">Journalière</span>
              <span className="text-xs opacity-80">Contributions quotidiennes</span>
            </Button>

            {/* Caisse Libre */}
            <Button
              variant={formData.caisseType === 'LIBRE' ? 'default' : 'outline'}
              onClick={() => handleCaisseTypeChange('LIBRE')}
              className={cn(
                "h-24 flex flex-col items-center justify-center gap-2 transition-all duration-300",
                formData.caisseType === 'LIBRE'
                  ? "bg-[#234D65] hover:bg-[#2c5a73] text-white shadow-lg"
                  : "border-2 border-gray-300 hover:border-[#234D65] hover:bg-[#234D65]/5"
              )}
            >
              <DollarSign className="w-6 h-6" />
              <span className="font-semibold">Libre</span>
              <span className="text-xs opacity-80">Versements flexibles</span>
            </Button>

            {/* Caisse Standard Charitable */}
            <Button
              variant={formData.caisseType === 'STANDARD_CHARITABLE' ? 'default' : 'outline'}
              onClick={() => handleCaisseTypeChange('STANDARD_CHARITABLE')}
              className={cn(
                "h-24 flex flex-col items-center justify-center gap-2 transition-all duration-300",
                formData.caisseType === 'STANDARD_CHARITABLE'
                  ? "bg-[#234D65] hover:bg-[#2c5a73] text-white shadow-lg"
                  : "border-2 border-gray-300 hover:border-[#234D65] hover:bg-[#234D65]/5"
              )}
            >
              <DollarSign className="w-6 h-6" />
              <span className="font-semibold">Standard Charitable</span>
              <span className="text-xs opacity-80">Versement mensuel fixe</span>
            </Button>

            {/* Caisse Journalière Charitable */}
            <Button
              variant={formData.caisseType === 'JOURNALIERE_CHARITABLE' ? 'default' : 'outline'}
              onClick={() => handleCaisseTypeChange('JOURNALIERE_CHARITABLE')}
              className={cn(
                "h-24 flex flex-col items-center justify-center gap-2 transition-all duration-300",
                formData.caisseType === 'JOURNALIERE_CHARITABLE'
                  ? "bg-[#234D65] hover:bg-[#2c5a73] text-white shadow-lg"
                  : "border-2 border-gray-300 hover:border-[#234D65] hover:bg-[#234D65]/5"
              )}
            >
              <Calendar className="w-6 h-6" />
              <span className="font-semibold">Journalière Charitable</span>
              <span className="text-xs opacity-80">Contributions quotidiennes</span>
            </Button>

            {/* Caisse Libre Charitable */}
            <Button
              variant={formData.caisseType === 'LIBRE_CHARITABLE' ? 'default' : 'outline'}
              onClick={() => handleCaisseTypeChange('LIBRE_CHARITABLE')}
              className={cn(
                "h-24 flex flex-col items-center justify-center gap-2 transition-all duration-300",
                formData.caisseType === 'LIBRE_CHARITABLE'
                  ? "bg-[#234D65] hover:bg-[#2c5a73] text-white shadow-lg"
                  : "border-2 border-gray-300 hover:border-[#234D65] hover:bg-[#234D65]/5"
              )}
            >
              <DollarSign className="w-6 h-6" />
              <span className="font-semibold">Libre Charitable</span>
              <span className="text-xs opacity-80">Versements flexibles</span>
            </Button>
          </div>

          {/* Informations sur le type sélectionné */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-700">
                {formData.caisseType === 'STANDARD' && (
                  <p>
                    <strong>Caisse Standard :</strong> Versement mensuel fixe. Vous devez verser exactement le montant défini chaque mois.
                  </p>
                )}
                {formData.caisseType === 'JOURNALIERE' && (
                  <p>
                    <strong>Caisse Journalière :</strong> Objectif mensuel atteint par contributions quotidiennes. Durée limitée à 12 mois maximum.
                  </p>
                )}
                {formData.caisseType === 'LIBRE' && (
                  <p>
                    <strong>Caisse Libre :</strong> Versements flexibles avec un minimum de 100 000 FCFA par mois. Vous pouvez verser plus selon vos possibilités.
                  </p>
                )}
                {formData.caisseType === 'STANDARD_CHARITABLE' && (
                  <p>
                    <strong>Caisse Standard Charitable :</strong> Même règles que la caisse standard, appliquées aux contrats caritatifs.
                  </p>
                )}
                {formData.caisseType === 'JOURNALIERE_CHARITABLE' && (
                  <p>
                    <strong>Caisse Journalière Charitable :</strong> Même règles que la caisse journalière, appliquées aux contrats caritatifs.
                  </p>
                )}
                {formData.caisseType === 'LIBRE_CHARITABLE' && (
                  <p>
                    <strong>Caisse Libre Charitable :</strong> Même règles que la caisse libre, appliquées aux contrats caritatifs.
                  </p>
                )}
                {isCharitable && (
                  <p className="mt-2 text-xs text-blue-600">
                    Variante caritative : les bonus et pénalités sont définis dans les paramètres dédiés.
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration financière */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg text-gray-900 flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Configuration financière
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Montant mensuel */}
            <div>
              <Label htmlFor="monthly-amount" className="text-sm font-medium text-gray-700 mb-2 block">
                {isDaily ? 'Objectif mensuel' : 'Montant mensuel'}
                {isLibre && <span className="text-red-600 ml-1">*</span>}
              </Label>
              <div className="relative">
                <Input
                  id="monthly-amount"
                  type="number"
                  min={isLibre ? 100000 : 100}
                  step={100}
                  value={formData.monthlyAmount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  className="pl-10 h-11 border-2 border-gray-200 focus:border-[#234D65] focus:ring-2 focus:ring-[#234D65]/20"
                  placeholder={isLibre ? "100000" : "10000"}
                />
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                  FCFA
                </span>
              </div>
              {isDaily && (
                <p className="text-xs text-gray-500 mt-1">
                  L'objectif est atteint par contributions quotidiennes sur le mois.
                </p>
              )}
              {isLibre && (
                <p className="text-xs text-gray-500 mt-1">
                  Le total versé par mois doit être au moins 100 000 FCFA.
                </p>
              )}
              {formData.monthlyAmount > 0 && (
                <div className="mt-2">
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    {formData.monthlyAmount.toLocaleString('fr-FR')} FCFA
                  </Badge>
                </div>
              )}
            </div>

            {/* Durée */}
            <div>
              <Label htmlFor="months-planned" className="text-sm font-medium text-gray-700 mb-2 block">
                Durée du contrat
                {isDaily && <span className="text-orange-600 ml-1">*</span>}
              </Label>
              <Input
                id="months-planned"
                type="number"
                min={1}
                max={isDaily ? 12 : 60}
                value={formData.monthsPlanned || ''}
                onChange={(e) => handleMonthsChange(e.target.value)}
                className="h-11 border-2 border-gray-200 focus:border-[#234D65] focus:ring-2 focus:ring-[#234D65]/20"
                placeholder="12"
              />
              {isDaily && (
                <p className="text-xs text-gray-500 mt-1">
                  Durée limitée à 12 mois maximum pour les contrats journaliers.
                </p>
              )}
              {formData.monthsPlanned > 0 && (
                <div className="mt-2">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                    {formData.monthsPlanned} mois
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* Résumé financier */}
          {formData.monthlyAmount > 0 && formData.monthsPlanned > 0 && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <DollarSign className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold text-green-900">Résumé financier</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-green-700">Montant total du contrat:</span>
                  <span className="font-medium text-green-900">
                    {(formData.monthlyAmount * formData.monthsPlanned).toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">Durée:</span>
                  <span className="font-medium text-green-900">
                    {formData.monthsPlanned} mois
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Validation des paramètres */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg text-gray-900 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Validation des paramètres
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isValidating && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span className="text-blue-700 font-medium">Vérification des paramètres...</span>
              </div>
            </div>
          )}

          {!isValidating && !isValid && validationError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="text-red-700">
                  <div className="font-medium mb-1">Paramètres manquants</div>
                  <div className="text-sm">{validationError}</div>
                  <div className="mt-2 text-red-600 text-sm">
                    Veuillez configurer les paramètres de la Caisse Spéciale dans l'administration avant de créer un contrat.
                  </div>
                </div>
              </div>
            </div>
          )}

          {!isValidating && isValid && settings && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <div className="text-green-700">
                  <div className="font-medium mb-1">Paramètres configurés</div>
                  <div className="text-sm">
                    Version active depuis le {new Date(settings.effectiveAt?.toDate?.() || settings.effectiveAt).toLocaleDateString('fr-FR')}
                  </div>
                  <div className="mt-2 text-green-600 text-sm">
                    Vous pouvez maintenant créer un contrat avec ce type de caisse.
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
