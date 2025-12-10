'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Clock, CheckCircle, DollarSign, AlertCircle } from 'lucide-react'
import type { Placement, CommissionPaymentPlacement } from '@/types/types'
import { usePlacementCommissions } from '@/hooks/usePlacements'

interface PlacementCardProps {
  placement: Placement
  onDetailsClick: () => void
  onEarlyExitClick: () => void
  onPayCommissionClick: (commissionId: string) => void
}

export default function PlacementCard({
  placement,
  onDetailsClick,
  onEarlyExitClick,
  onPayCommissionClick,
}: PlacementCardProps) {
  const { data: commissions = [] } = usePlacementCommissions(placement.id)
  
  // Trouver la prochaine commission due
  const nextDueCommission = commissions.find(c => c.status === 'Due')
  const paidCommissions = commissions.filter(c => c.status === 'Paid').length
  const totalCommissions = commissions.length

  return (
    <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white border-0 shadow-md overflow-hidden">
      <div className="h-1.5 bg-gradient-to-r from-[#234D65] to-[#2c5a73]" />
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="text-gray-800 font-bold">Placement #{placement.id.slice(0, 8)}</span>
          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
            placement.status === 'Active' ? 'bg-green-100 text-green-700' :
            placement.status === 'Draft' ? 'bg-yellow-100 text-yellow-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {placement.status}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center gap-2 text-gray-600">
          <span className="font-medium text-gray-500">Bienfaiteur:</span>
          <span className="font-semibold text-gray-800">{placement.benefactorId.slice(0, 12)}...</span>
        </div>
        
        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg">
          <div>
            <p className="text-xs text-gray-500 font-medium">Montant</p>
            <p className="text-xl font-black text-[#234D65]">{placement.amount.toLocaleString()}</p>
            <p className="text-xs text-gray-500">FCFA</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 font-medium">Taux</p>
            <p className="text-2xl font-black text-green-600">{placement.rate}%</p>
          </div>
        </div>

        {/* Affichage des commissions - Uniquement si le placement est Active */}
        {placement.status === 'Active' && commissions.length > 0 && (
          <div className={`p-3 rounded-lg border ${
            nextDueCommission 
              ? 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200' 
              : 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <DollarSign className={`h-4 w-4 ${nextDueCommission ? 'text-orange-600' : 'text-green-600'}`} />
                <span className={`text-xs font-semibold ${nextDueCommission ? 'text-orange-700' : 'text-green-700'}`}>
                  Commissions
                </span>
              </div>
              <span className={`text-xs font-medium ${nextDueCommission ? 'text-orange-600' : 'text-green-600'}`}>
                {paidCommissions}/{totalCommissions} payées
              </span>
            </div>
            {nextDueCommission ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Prochaine échéance:</span>
                  <span className="text-xs font-semibold text-gray-800">
                    {new Date(nextDueCommission.dueDate).toLocaleDateString('fr-FR')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Montant:</span>
                  <span className="text-sm font-bold text-[#234D65]">
                    {nextDueCommission.amount.toLocaleString()} FCFA
                  </span>
                </div>
                <Button
                  size="sm"
                  className="w-full mt-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-xs font-semibold shadow-md"
                  onClick={() => onPayCommissionClick(nextDueCommission.id)}
                >
                  <DollarSign className="h-3 w-3 mr-1" />
                  Payer cette commission
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-xs font-medium">Toutes les commissions sont payées</span>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Période</p>
              <p className="font-bold text-gray-800">{placement.periodMonths} mois</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Mode</p>
              <p className="font-bold text-gray-800 text-xs">
                {placement.payoutMode === 'MonthlyCommission_CapitalEnd' ? 'Mensuel' : 'Final'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            size="sm"
            variant="secondary"
            className="text-xs"
            onClick={onDetailsClick}
          >
            Détails
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs"
            onClick={onEarlyExitClick}
          >
            Retrait anticipé
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

