/**
 * Carte d'informations de paiement
 */

'use client'

import { CreditCard, Calendar } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ModernCard } from './shared/ModernCard'
import { InfoField } from './shared/InfoField'
import { formatDateDetailed } from '../../utils/details'
import type { MembershipRequest } from '../../entities'

interface DetailsPaymentCardProps {
  request: MembershipRequest
}

export function DetailsPaymentCard({ request }: DetailsPaymentCardProps) {
  const isPaid = request.isPaid || false
  const payments = request.payments || []

  return (
    <ModernCard 
      title="Informations de paiement" 
      icon={CreditCard} 
      iconColor="text-emerald-600" 
      className="bg-gradient-to-br from-emerald-50/30 to-emerald-100/20"
    >
      <div className="space-y-4" data-testid="details-payment-card">
        <div className="flex items-center gap-3">
          <Badge
            variant={isPaid ? 'default' : 'destructive'}
            className={`px-3 py-1.5 text-sm font-semibold ${
              isPaid 
                ? 'bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 border-emerald-300' 
                : 'bg-gradient-to-r from-red-50 to-rose-50 text-red-700 border-red-300'
            }`}
            data-testid="details-payment-status"
          >
            {isPaid ? 'Payé' : 'Non payé'}
          </Badge>
        </div>

        {isPaid && payments.length > 0 && (
          <div className="space-y-3">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
              Détails du paiement
            </label>
            {payments
              .sort((a, b) => {
                const dateA = a.date instanceof Date ? a.date : new Date(a.date)
                const dateB = b.date instanceof Date ? b.date : new Date(b.date)
                return dateB.getTime() - dateA.getTime()
              })
              .map((payment, index) => (
                <div 
                  key={index} 
                  className="p-3 lg:p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <InfoField
                      label="Montant"
                      value={`${payment.amount.toLocaleString('fr-FR')} FCFA`}
                      icon={CreditCard}
                      color="text-emerald-600"
                      data-testid="details-payment-amount"
                    />
                    <InfoField
                      label="Date"
                      value={formatDateDetailed(payment.date)}
                      icon={Calendar}
                      color="text-blue-600"
                      data-testid="details-payment-date"
                    />
                    <InfoField
                      label="Mode de paiement"
                      value={payment.mode || 'Non spécifié'}
                      icon={CreditCard}
                      color="text-purple-600"
                      data-testid="details-payment-mode"
                    />
                  </div>
                </div>
              ))}
          </div>
        )}

        {!isPaid && (
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
            <p className="text-gray-600 text-sm">Aucun paiement enregistré pour cette demande.</p>
          </div>
        )}
      </div>
    </ModernCard>
  )
}
