"use client"

import React, { useEffect, useState } from 'react'
import { useContractForm } from '@/providers/ContractFormProvider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Calendar, 
  Clock, 
  TrendingUp, 
  Info,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function Step3PaymentPlan() {
  const { state, updateFormData, validateCurrentStep } = useContractForm()
  const { formData } = state

  const [selectedDate, setSelectedDate] = useState(formData.firstPaymentDate || '')

  // Validation de l'étape
  useEffect(() => {
    const isValid = Boolean(selectedDate && isValidDate(selectedDate))
    validateCurrentStep(isValid)
  }, [selectedDate, validateCurrentStep])

  // Validation de la date
  const isValidDate = (date: string) => {
    if (!date) return false
    const selectedDate = new Date(date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return selectedDate >= today
  }

  // Gestion du changement de date
  const handleDateChange = (date: string) => {
    setSelectedDate(date)
    updateFormData({ firstPaymentDate: date })
  }

  // Calculs dérivés
  const startDate = selectedDate ? new Date(selectedDate) : null
  const endDate = startDate && formData.monthsPlanned 
    ? new Date(startDate.getFullYear(), startDate.getMonth() + formData.monthsPlanned, startDate.getDate())
    : null

  // Génération du calendrier de versements
  const generatePaymentSchedule = () => {
    if (!startDate || !formData.monthsPlanned) return []

    const schedule = []
    const currentDate = new Date(startDate)

    for (let month = 0; month < formData.monthsPlanned; month++) {
      const paymentDate = new Date(currentDate)
      paymentDate.setMonth(currentDate.getMonth() + month)
      
      schedule.push({
        month: month + 1,
        date: paymentDate,
        amount: formData.monthlyAmount,
        status: 'pending'
      })
    }

    return schedule
  }

  const paymentSchedule = generatePaymentSchedule()

  // Formatage des dates
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatShortDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Messages d'aide selon le type de caisse
  const getPaymentInfo = () => {
    switch (formData.caisseType) {
      case 'STANDARD':
        return {
          title: 'Versements mensuels',
          description: 'Un versement fixe de {amount} FCFA sera effectué chaque mois',
          icon: Calendar,
          color: 'bg-blue-100 text-blue-700'
        }
      case 'JOURNALIERE':
        return {
          title: 'Versements quotidiens',
          description: 'Objectif mensuel de {amount} FCFA atteint par des versements quotidiens',
          icon: Clock,
          color: 'bg-green-100 text-green-700'
        }
      case 'LIBRE':
        return {
          title: 'Versements flexibles',
          description: 'Versement minimum de {amount} FCFA par mois, avec possibilité de verser plus',
          icon: TrendingUp,
          color: 'bg-purple-100 text-purple-700'
        }
      default:
        return null
    }
  }

  const paymentInfo = getPaymentInfo()

  return (
    <div className="space-y-6">
      {/* Titre de l'étape */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Planification des versements
        </h2>
        <p className="text-gray-600">
          Définissez la date de début et visualisez le calendrier des versements
        </p>
      </div>

      {/* Sélection de la date de début */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg text-gray-900">
            Date de début du contrat
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-md">
            <Label htmlFor="start-date" className="text-sm font-medium text-gray-700 mb-2 block">
              Date du premier versement
            </Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="start-date"
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className={cn(
                  "pl-10 h-11 border-2 transition-all duration-300",
                  isValidDate(selectedDate)
                    ? "border-gray-200 focus:border-[#234D65] focus:ring-2 focus:ring-[#234D65]/20"
                    : "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                )}
              />
            </div>
            {!isValidDate(selectedDate) && selectedDate && (
              <div className="flex items-center gap-2 text-sm text-red-600 mt-2">
                <AlertCircle className="w-4 h-4" />
                La date de début ne peut pas être dans le passé
              </div>
            )}
            <p className="text-xs text-gray-500 mt-2">
              Sélectionnez une date future pour commencer le contrat
            </p>
          </div>

          {/* Informations sur le type de versement */}
          {paymentInfo && (
            <div className={cn("p-4 rounded-lg border-2", paymentInfo.color.replace('bg-', 'border-').replace(' text-', ' border-'))}>
              <div className="flex items-start gap-3">
                <div className={cn("p-2 rounded-lg", paymentInfo.color)}>
                  <paymentInfo.icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-2">{paymentInfo.title}</h4>
                  <p className="text-sm text-gray-600">
                    {paymentInfo.description.replace('{amount}', formData.monthlyAmount?.toLocaleString() || '0')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Résumé du contrat */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg text-gray-900">
            Résumé du contrat
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Informations générales */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Type de contrat:</span>
                <Badge variant="secondary">
                  {formData.contractType === 'INDIVIDUAL' ? 'Individuel' : 'Groupe'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Type de caisse:</span>
                <Badge variant="secondary">
                  {formData.caisseType}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Montant mensuel:</span>
                <span className="font-semibold text-gray-900">
                  {formData.monthlyAmount?.toLocaleString() || 0} FCFA
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Durée:</span>
                <span className="font-semibold text-gray-900">
                  {formData.monthsPlanned || 0} mois
                </span>
              </div>
            </div>

            {/* Dates importantes */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Date de début:</span>
                <span className="font-semibold text-gray-900">
                  {startDate ? formatShortDate(startDate) : 'Non définie'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Date de fin:</span>
                <span className="font-semibold text-gray-900">
                  {endDate ? formatShortDate(endDate) : 'Non définie'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Montant total:</span>
                <span className="font-semibold text-[#234D65]">
                  {((formData.monthlyAmount || 0) * (formData.monthsPlanned || 0)).toLocaleString()} FCFA
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendrier des versements */}
      {paymentSchedule.length > 0 && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900">
              Calendrier des versements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {paymentSchedule.map((payment, _index) => (
                <div
                  key={payment.month}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border transition-all duration-200",
                    index === 0
                      ? "bg-[#234D65]/5 border-[#234D65]/20"
                      : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold",
                      index === 0
                        ? "bg-[#234D65] text-white"
                        : "bg-gray-200 text-gray-700"
                    )}>
                      {payment.month}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {formatDate(payment.date)}
                      </div>
                      <div className="text-sm text-gray-500">
                        Mois {payment.month} sur {formData.monthsPlanned}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-900">
                      {payment.amount.toLocaleString()} FCFA
                    </span>
                    <Badge
                      variant={index === 0 ? 'default' : 'secondary'}
                      className={cn(
                        index === 0 && "bg-[#234D65] text-white"
                      )}
                    >
                      {index === 0 ? 'Premier versement' : 'En attente'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Note informative */}
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Informations importantes :</p>
                  <ul className="space-y-1 text-xs">
                    <li>• Le premier versement sera effectué à la date de début sélectionnée</li>
                    <li>• Les versements suivants auront lieu le même jour de chaque mois</li>
                    <li>• En cas de retard, des pénalités pourront s'appliquer selon les règles de la caisse</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
