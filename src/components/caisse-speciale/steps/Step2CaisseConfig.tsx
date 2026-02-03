"use client"

import React, { useEffect } from 'react'
import { useContractForm } from '@/providers/ContractFormProvider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Target, 
  Calendar, 
  DollarSign, 
  TrendingUp,
  Info,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function Step2CaisseConfig() {
  const { state, updateFormData, validateCurrentStep } = useContractForm()
  const { formData } = state

  // Validation de l'étape
  useEffect(() => {
    const isValid = formData.caisseType && 
                   formData.monthlyAmount >= 100 && 
                   formData.monthlyAmount <= 1000000 &&
                   formData.monthsPlanned >= 1 && 
                   formData.monthsPlanned <= 60
    
    validateCurrentStep(isValid)
  }, [formData.caisseType, formData.monthlyAmount, formData.monthsPlanned, validateCurrentStep])

  // Gestion des changements de valeurs
  const handleMonthlyAmountChange = (value: string) => {
    const amount = parseFloat(value) || 0
    updateFormData({ monthlyAmount: amount })
  }

  const handleMonthsPlannedChange = (value: string) => {
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

  // Calculs dérivés
  const totalAmount = formData.monthlyAmount * formData.monthsPlanned
  const isLibreValid =
    formData.caisseType === 'LIBRE' || formData.caisseType === 'LIBRE_CHARITABLE'
      ? formData.monthlyAmount >= 100000
      : true
  const isJournaliereValid =
    formData.caisseType === 'JOURNALIERE' || formData.caisseType === 'JOURNALIERE_CHARITABLE'
      ? formData.monthsPlanned <= 12
      : true

  // Messages d'aide selon le type de caisse
  const getCaisseInfo = () => {
    switch (formData.caisseType) {
      case 'STANDARD':
        return {
          title: 'Caisse Standard',
          description: 'Versement mensuel fixe avec objectif à atteindre',
          icon: Target,
          color: 'bg-blue-100 text-blue-700',
          features: ['Montant fixe mensuel', 'Objectif défini', 'Flexibilité de durée']
        }
      case 'JOURNALIERE':
        return {
          title: 'Caisse Journalière',
          description: 'Objectif mensuel atteint par contributions quotidiennes',
          icon: Calendar,
          color: 'bg-green-100 text-green-700',
          features: ['Objectif mensuel', 'Versements quotidiens', 'Durée max 12 mois']
        }
      case 'LIBRE':
        return {
          title: 'Caisse Libre',
          description: 'Montant mensuel minimum avec flexibilité totale',
          icon: TrendingUp,
          color: 'bg-purple-100 text-purple-700',
          features: ['Montant minimum 100 000 FCFA', 'Flexibilité maximale', 'Pas de limite de durée']
        }
      case 'STANDARD_CHARITABLE':
        return {
          title: 'Caisse Standard Charitable',
          description: 'Règles standard appliquées aux contrats caritatifs',
          icon: Target,
          color: 'bg-blue-100 text-blue-700',
          features: ['Montant fixe mensuel', 'Objectif défini', 'Variante caritative']
        }
      case 'JOURNALIERE_CHARITABLE':
        return {
          title: 'Caisse Journalière Charitable',
          description: 'Règles journalières appliquées aux contrats caritatifs',
          icon: Calendar,
          color: 'bg-green-100 text-green-700',
          features: ['Objectif mensuel', 'Versements quotidiens', 'Variante caritative']
        }
      case 'LIBRE_CHARITABLE':
        return {
          title: 'Caisse Libre Charitable',
          description: 'Règles libres appliquées aux contrats caritatifs',
          icon: TrendingUp,
          color: 'bg-purple-100 text-purple-700',
          features: ['Montant minimum 100 000 FCFA', 'Flexibilité maximale', 'Variante caritative']
        }
      default:
        return null
    }
  }

  const caisseInfo = getCaisseInfo()

  return (
    <div className="space-y-6">
      {/* Titre de l'étape */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Configuration de la caisse
        </h2>
        <p className="text-gray-600">
          Définissez le type de caisse, le montant mensuel et la durée du contrat
        </p>
      </div>

      {/* Sélection du type de caisse */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg text-gray-900">
            Type de caisse
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Caisse Standard */}
            <Button
              variant={formData.caisseType === 'STANDARD' ? 'default' : 'outline'}
              onClick={() => updateFormData({ caisseType: 'STANDARD' })}
              className={cn(
                "h-24 flex flex-col items-center justify-center gap-2 transition-all duration-300",
                formData.caisseType === 'STANDARD'
                  ? "bg-[#234D65] hover:bg-[#2c5a73] text-white shadow-lg"
                  : "border-2 border-gray-300 hover:border-[#234D65] hover:bg-[#234D65]/5"
              )}
            >
              <Target className="w-6 h-6" />
              <span className="font-semibold">Standard</span>
              <span className="text-xs opacity-80">Versement fixe</span>
            </Button>

            {/* Caisse Journalière */}
            <Button
              variant={formData.caisseType === 'JOURNALIERE' ? 'default' : 'outline'}
              onClick={() => updateFormData({ caisseType: 'JOURNALIERE' })}
              className={cn(
                "h-24 flex flex-col items-center justify-center gap-2 transition-all duration-300",
                formData.caisseType === 'JOURNALIERE'
                  ? "bg-[#234D65] hover:bg-[#2c5a73] text-white shadow-lg"
                  : "border-2 border-gray-300 hover:border-[#234D65] hover:bg-[#234D65]/5"
              )}
            >
              <Calendar className="w-6 h-6" />
              <span className="font-semibold">Journalière</span>
              <span className="text-xs opacity-80">Versements quotidiens</span>
            </Button>

            {/* Caisse Libre */}
            <Button
              variant={formData.caisseType === 'LIBRE' ? 'default' : 'outline'}
              onClick={() => updateFormData({ caisseType: 'LIBRE' })}
              className={cn(
                "h-24 flex flex-col items-center justify-center gap-2 transition-all duration-300",
                formData.caisseType === 'LIBRE'
                  ? "bg-[#234D65] hover:bg-[#2c5a73] text-white shadow-lg"
                  : "border-2 border-gray-300 hover:border-[#234D65] hover:bg-[#234D65]/5"
              )}
            >
              <TrendingUp className="w-6 h-6" />
              <span className="font-semibold">Libre</span>
              <span className="text-xs opacity-80">Flexibilité totale</span>
            </Button>

            {/* Caisse Standard Charitable */}
            <Button
              variant={formData.caisseType === 'STANDARD_CHARITABLE' ? 'default' : 'outline'}
              onClick={() => updateFormData({ caisseType: 'STANDARD_CHARITABLE' })}
              className={cn(
                "h-24 flex flex-col items-center justify-center gap-2 transition-all duration-300",
                formData.caisseType === 'STANDARD_CHARITABLE'
                  ? "bg-[#234D65] hover:bg-[#2c5a73] text-white shadow-lg"
                  : "border-2 border-gray-300 hover:border-[#234D65] hover:bg-[#234D65]/5"
              )}
            >
              <Target className="w-6 h-6" />
              <span className="font-semibold">Standard Charitable</span>
              <span className="text-xs opacity-80">Versement fixe</span>
            </Button>

            {/* Caisse Journalière Charitable */}
            <Button
              variant={formData.caisseType === 'JOURNALIERE_CHARITABLE' ? 'default' : 'outline'}
              onClick={() => updateFormData({ caisseType: 'JOURNALIERE_CHARITABLE' })}
              className={cn(
                "h-24 flex flex-col items-center justify-center gap-2 transition-all duration-300",
                formData.caisseType === 'JOURNALIERE_CHARITABLE'
                  ? "bg-[#234D65] hover:bg-[#2c5a73] text-white shadow-lg"
                  : "border-2 border-gray-300 hover:border-[#234D65] hover:bg-[#234D65]/5"
              )}
            >
              <Calendar className="w-6 h-6" />
              <span className="font-semibold">Journalière Charitable</span>
              <span className="text-xs opacity-80">Versements quotidiens</span>
            </Button>

            {/* Caisse Libre Charitable */}
            <Button
              variant={formData.caisseType === 'LIBRE_CHARITABLE' ? 'default' : 'outline'}
              onClick={() => updateFormData({ caisseType: 'LIBRE_CHARITABLE' })}
              className={cn(
                "h-24 flex flex-col items-center justify-center gap-2 transition-all duration-300",
                formData.caisseType === 'LIBRE_CHARITABLE'
                  ? "bg-[#234D65] hover:bg-[#2c5a73] text-white shadow-lg"
                  : "border-2 border-gray-300 hover:border-[#234D65] hover:bg-[#234D65]/5"
              )}
            >
              <TrendingUp className="w-6 h-6" />
              <span className="font-semibold">Libre Charitable</span>
              <span className="text-xs opacity-80">Flexibilité totale</span>
            </Button>
          </div>

          {/* Informations sur le type sélectionné */}
          {caisseInfo && (
            <div className={cn("p-4 rounded-lg border-2", caisseInfo.color.replace('bg-', 'border-').replace(' text-', ' border-'))}>
              <div className="flex items-start gap-3">
                <div className={cn("p-2 rounded-lg", caisseInfo.color)}>
                  <caisseInfo.icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-2">{caisseInfo.title}</h4>
                  <p className="text-sm text-gray-600 mb-3">{caisseInfo.description}</p>
                  <div className="space-y-1">
                    {caisseInfo.features.map((feature, _index) => (
                      <div key={_index} className="flex items-center gap-2 text-sm text-gray-700">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuration des montants et durée */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg text-gray-900">
            Paramètres financiers
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Montant mensuel */}
            <div className="space-y-2">
              <Label htmlFor="monthly-amount" className="text-sm font-medium text-gray-700">
                Montant mensuel (FCFA)
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="monthly-amount"
                  type="number"
                  value={formData.monthlyAmount || ''}
                  onChange={(e) => handleMonthlyAmountChange(e.target.value)}
                  placeholder="10000"
                  min="100"
                  max="1000000"
                  step="100"
                  className={cn(
                    "pl-10 h-11 border-2 transition-all duration-300",
                    isLibreValid
                      ? "border-gray-200 focus:border-[#234D65] focus:ring-2 focus:ring-[#234D65]/20"
                      : "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                  )}
                />
              </div>
              {!isLibreValid && (
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  Montant minimum requis : 100 000 FCFA pour une caisse Libre
                </div>
              )}
              <p className="text-xs text-gray-500">
                Montant entre 100 et 1 000 000 FCFA
              </p>
            </div>

            {/* Durée en mois */}
            <div className="space-y-2">
              <Label htmlFor="months-planned" className="text-sm font-medium text-gray-700">
                Durée (mois)
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="months-planned"
                  type="number"
                  value={formData.monthsPlanned || ''}
                  onChange={(e) => handleMonthsPlannedChange(e.target.value)}
                  placeholder="12"
                  min="1"
                  max="60"
                  className={cn(
                    "pl-10 h-11 border-2 transition-all duration-300",
                    isJournaliereValid
                      ? "border-gray-200 focus:border-[#234D65] focus:ring-2 focus:ring-[#234D65]/20"
                      : "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                  )}
                />
              </div>
              {!isJournaliereValid && (
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  Durée maximum : 12 mois pour une caisse Journalière
                </div>
              )}
              <p className="text-xs text-gray-500">
                Durée entre 1 et 60 mois
              </p>
            </div>
          </div>

          {/* Résumé des calculs */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-[#234D65]" />
              Résumé du contrat
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-[#234D65]">
                  {formData.monthlyAmount?.toLocaleString() || 0}
                </div>
                <div className="text-sm text-gray-600">FCFA/mois</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#234D65]">
                  {formData.monthsPlanned || 0}
                </div>
                <div className="text-sm text-gray-600">mois</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#234D65]">
                  {totalAmount.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">FCFA total</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
