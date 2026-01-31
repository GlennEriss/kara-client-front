/**
 * Étape 2 : Sélection du forfait + Fréquence de paiement
 * 
 * Design moderne avec cards sélectionnables et visuels attractifs
 */

'use client'

import { UseFormReturn } from 'react-hook-form'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useSubscriptionsCICache } from '../../../hooks/useSubscriptionsCICache'
import type { CaisseImprevueDemandFormInput } from '../../../hooks/useDemandForm'
import { cn } from '@/lib/utils'
import {
  Package,
  Check,
  CalendarDays,
  Calendar,
  CalendarClock,
  Coins,
  Clock,
  Shield,
  Sparkles,
} from 'lucide-react'

interface Step2ForfaitProps {
  form: UseFormReturn<CaisseImprevueDemandFormInput>
}

export function Step2Forfait({ form }: Step2ForfaitProps) {
  const { data: subscriptions, isLoading } = useSubscriptionsCICache()

  const selectedSubscriptionId = form.watch('subscriptionCIID')
  const selectedFrequency = form.watch('paymentFrequency')
  const desiredStartDate = form.watch('desiredStartDate')

  const handleSelectSubscription = (subId: string) => {
    const sub = subscriptions?.find((s) => s.id === subId)
    if (sub) {
      form.setValue('subscriptionCIID', sub.id, { shouldValidate: true })
      form.setValue('subscriptionCICode', sub.code)
      form.setValue('subscriptionCILabel', sub.label)
      form.setValue('subscriptionCIAmountPerMonth', sub.amountPerMonth)
      form.setValue('subscriptionCINominal', sub.nominal)
      form.setValue('subscriptionCIDuration', sub.durationInMonths)
      form.setValue('subscriptionCISupportMin', sub.supportMin)
      form.setValue('subscriptionCISupportMax', sub.supportMax)
    }
  }

  const handleSelectFrequency = (frequency: 'DAILY' | 'MONTHLY') => {
    form.setValue('paymentFrequency', frequency, { shouldValidate: true })
  }

  return (
    <div className="space-y-8">
      {/* Section Forfait */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#234D65] to-[#3a7ca5] flex items-center justify-center">
            <Package className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Choisissez votre forfait</h3>
            <p className="text-sm text-gray-500">Sélectionnez le forfait qui correspond à vos besoins</p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-36 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subscriptions?.map((sub, index) => {
              const isSelected = selectedSubscriptionId === sub.id
              const isPopular = index === 1 // Marquer le 2ème comme populaire

              return (
                <Card
                  key={sub.id}
                  className={cn(
                    'relative cursor-pointer transition-all duration-300 overflow-hidden',
                    'hover:shadow-lg hover:-translate-y-0.5',
                    isSelected
                      ? 'ring-2 ring-[#234D65] shadow-lg shadow-[#234D65]/20 bg-gradient-to-br from-[#234D65]/5 to-white'
                      : 'border-2 border-gray-200 hover:border-gray-300'
                  )}
                  onClick={() => handleSelectSubscription(sub.id)}
                >
                  {/* Badge populaire */}
                  {isPopular && !isSelected && (
                    <div className="absolute -top-1 -right-1">
                      <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 rounded-bl-lg rounded-tr-lg px-2 py-1 text-xs font-medium">
                        <Sparkles className="w-3 h-3 mr-1" />
                        Populaire
                      </Badge>
                    </div>
                  )}

                  {/* Check sélectionné */}
                  {isSelected && (
                    <div className="absolute top-3 right-3">
                      <div className="w-6 h-6 rounded-full bg-[#234D65] flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  )}

                  <CardContent className="p-5">
                    <div className="space-y-3">
                      {/* Nom du forfait */}
                      <div>
                        <h4 className={cn(
                          'font-bold text-lg',
                          isSelected ? 'text-[#234D65]' : 'text-gray-900'
                        )}>
                          {sub.label || sub.code}
                        </h4>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">
                          Code: {sub.code}
                        </p>
                      </div>

                      {/* Prix */}
                      <div className="flex items-baseline gap-1">
                        <span className={cn(
                          'text-2xl font-bold',
                          isSelected ? 'text-[#234D65]' : 'text-gray-900'
                        )}>
                          {sub.amountPerMonth.toLocaleString('fr-FR')}
                        </span>
                        <span className="text-sm text-gray-500">FCFA/mois</span>
                      </div>

                      {/* Détails */}
                      <div className="flex flex-wrap gap-2 pt-2">
                        <div className="flex items-center gap-1 text-xs text-gray-600 bg-gray-100 rounded-full px-2.5 py-1">
                          <Clock className="w-3 h-3" />
                          <span>{sub.durationInMonths} mois</span>
                        </div>
                        {sub.nominal && (
                          <div className="flex items-center gap-1 text-xs text-gray-600 bg-gray-100 rounded-full px-2.5 py-1">
                            <Shield className="w-3 h-3" />
                            <span>{sub.nominal.toLocaleString('fr-FR')} FCFA</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Résumé du forfait sélectionné */}
        {selectedSubscriptionId && subscriptions && (
          <div className="bg-gradient-to-r from-[#234D65]/10 to-[#3a7ca5]/10 rounded-xl p-4 border border-[#234D65]/20">
            <div className="flex items-center gap-2 mb-2">
              <Check className="w-5 h-5 text-[#234D65]" />
              <span className="font-medium text-[#234D65]">Forfait sélectionné</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {(() => {
                const sub = subscriptions.find((s) => s.id === selectedSubscriptionId)
                if (!sub) return null
                return (
                  <>
                    <div>
                      <p className="text-gray-500 text-xs">Montant mensuel</p>
                      <p className="font-semibold text-gray-900">
                        {sub.amountPerMonth.toLocaleString('fr-FR')} FCFA
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Durée</p>
                      <p className="font-semibold text-gray-900">{sub.durationInMonths} mois</p>
                    </div>
                    {sub.nominal && (
                      <div>
                        <p className="text-gray-500 text-xs">Capital nominal</p>
                        <p className="font-semibold text-gray-900">
                          {sub.nominal.toLocaleString('fr-FR')} FCFA
                        </p>
                      </div>
                    )}
                    {sub.supportMin && sub.supportMax && (
                      <div>
                        <p className="text-gray-500 text-xs">Support</p>
                        <p className="font-semibold text-gray-900">
                          {sub.supportMin.toLocaleString('fr-FR')} - {sub.supportMax.toLocaleString('fr-FR')} FCFA
                        </p>
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Section Fréquence */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Coins className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Fréquence de paiement</h3>
            <p className="text-sm text-gray-500">Comment souhaitez-vous effectuer vos versements ?</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Option Mensuel */}
          <Card
            className={cn(
              'relative cursor-pointer transition-all duration-300',
              'hover:shadow-md hover:-translate-y-0.5',
              selectedFrequency === 'MONTHLY'
                ? 'ring-2 ring-purple-500 shadow-lg shadow-purple-500/20 bg-gradient-to-br from-purple-50 to-white'
                : 'border-2 border-gray-200 hover:border-purple-200'
            )}
            onClick={() => handleSelectFrequency('MONTHLY')}
          >
            {selectedFrequency === 'MONTHLY' && (
              <div className="absolute top-3 right-3">
                <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              </div>
            )}
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center transition-colors',
                  selectedFrequency === 'MONTHLY'
                    ? 'bg-purple-500 text-white'
                    : 'bg-purple-100 text-purple-600'
                )}>
                  <Calendar className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h4 className={cn(
                    'font-semibold text-lg',
                    selectedFrequency === 'MONTHLY' ? 'text-purple-700' : 'text-gray-900'
                  )}>
                    Mensuel
                  </h4>
                  <p className="text-sm text-gray-500 mt-1">
                    Un seul versement par mois, idéal pour les salariés
                  </p>
                  <Badge
                    variant="secondary"
                    className="mt-2 bg-purple-100 text-purple-700 border-0"
                  >
                    Recommandé
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Option Quotidien */}
          <Card
            className={cn(
              'relative cursor-pointer transition-all duration-300',
              'hover:shadow-md hover:-translate-y-0.5',
              selectedFrequency === 'DAILY'
                ? 'ring-2 ring-pink-500 shadow-lg shadow-pink-500/20 bg-gradient-to-br from-pink-50 to-white'
                : 'border-2 border-gray-200 hover:border-pink-200'
            )}
            onClick={() => handleSelectFrequency('DAILY')}
          >
            {selectedFrequency === 'DAILY' && (
              <div className="absolute top-3 right-3">
                <div className="w-6 h-6 rounded-full bg-pink-500 flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              </div>
            )}
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center transition-colors',
                  selectedFrequency === 'DAILY'
                    ? 'bg-pink-500 text-white'
                    : 'bg-pink-100 text-pink-600'
                )}>
                  <CalendarDays className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h4 className={cn(
                    'font-semibold text-lg',
                    selectedFrequency === 'DAILY' ? 'text-pink-700' : 'text-gray-900'
                  )}>
                    Quotidien
                  </h4>
                  <p className="text-sm text-gray-500 mt-1">
                    Versements journaliers, flexible pour les commerçants
                  </p>
                  <Badge
                    variant="secondary"
                    className="mt-2 bg-pink-100 text-pink-700 border-0"
                  >
                    Flexible
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Section Date */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
            <CalendarClock className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Date de début souhaitée</h3>
            <p className="text-sm text-gray-500">Quand souhaitez-vous commencer ?</p>
          </div>
        </div>

        <div className="relative">
          <div className={cn(
            'flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200',
            desiredStartDate
              ? 'border-emerald-500 bg-emerald-50/50'
              : 'border-gray-200 hover:border-gray-300'
          )}>
            <div className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center',
              desiredStartDate
                ? 'bg-emerald-500 text-white'
                : 'bg-gray-100 text-gray-500'
            )}>
              <CalendarClock className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <label htmlFor="desiredStartDate" className="text-sm text-gray-500 block mb-1">
                Sélectionnez une date
              </label>
              <input
                id="desiredStartDate"
                type="date"
                {...form.register('desiredStartDate', { required: 'La date est requise' })}
                className={cn(
                  'w-full bg-transparent border-none outline-none text-lg font-medium',
                  'text-gray-900 cursor-pointer',
                  '[&::-webkit-calendar-picker-indicator]:cursor-pointer',
                  '[&::-webkit-calendar-picker-indicator]:opacity-50',
                  '[&::-webkit-calendar-picker-indicator]:hover:opacity-100'
                )}
              />
            </div>
            {desiredStartDate && (
              <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                <Check className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
