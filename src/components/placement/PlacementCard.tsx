'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Clock, CheckCircle, DollarSign, AlertCircle, Trash2, ExternalLink, Phone, User, Upload, FileText, Eye, Edit } from 'lucide-react'
import type { Placement, CommissionPaymentPlacement } from '@/types/types'
import { usePlacementCommissions } from '@/hooks/usePlacements'

interface PlacementCardProps {
  placement: Placement
  onDetailsClick?: () => void
  onPayCommissionClick: (commissionId: string) => void
  onDeleteClick?: () => void
  onOpenClick?: () => void
  onUploadContractClick?: () => void
  onViewContractClick?: () => void
  onEditClick?: () => void
}

export default function PlacementCard({
  placement,
  onDetailsClick,
  onPayCommissionClick,
  onDeleteClick,
  onOpenClick,
  onUploadContractClick,
  onViewContractClick,
  onEditClick,
}: PlacementCardProps) {
  const { data: commissions = [] } = usePlacementCommissions(placement.id)
  
  // Trouver la prochaine commission due
  const nextDueCommission = commissions.find(c => c.status === 'Due')
  const paidCommissions = commissions.filter(c => c.status === 'Paid').length
  const totalCommissions = commissions.length
  const nextDate = placement.nextCommissionDate || nextDueCommission?.dueDate

  const statusLabel: Record<string, string> = {
    Draft: 'Brouillon',
    Active: 'Actif',
    Closed: 'Clos',
    EarlyExit: 'Sortie anticipée',
    Canceled: 'Annulé',
  }

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
            {statusLabel[placement.status] || placement.status}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center gap-3 text-gray-600">
          <User className="h-4 w-4 text-gray-400" />
          <div className="space-y-0.5">
            <div className="text-xs text-gray-500">Bienfaiteur</div>
            <div className="font-semibold text-gray-800">
              {placement.benefactorName || placement.benefactorId.slice(0, 12)}
            </div>
            {placement.benefactorPhone && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Phone className="h-3 w-3" />
                <span>{placement.benefactorPhone}</span>
              </div>
            )}
          </div>
        </div>
        {placement.urgentContact && (
          <div className="flex items-center gap-3 text-gray-600 rounded-lg bg-slate-50 px-3 py-2">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <div className="space-y-0.5">
              <div className="text-xs text-amber-700 font-semibold">Contact urgent</div>
              <div className="text-sm font-semibold text-gray-800">
                {placement.urgentContact.name}
                {placement.urgentContact.firstName ? ` ${placement.urgentContact.firstName}` : ''}
              </div>
              <div className="text-xs text-gray-600">{placement.urgentContact.phone}</div>
              {placement.urgentContact.phone2 && (
                <div className="text-[11px] text-gray-500">{placement.urgentContact.phone2}</div>
              )}
              {placement.urgentContact.relationship && (
                <div className="text-[11px] text-gray-500">{placement.urgentContact.relationship}</div>
              )}
              {(placement.urgentContact.idNumber || placement.urgentContact.typeId) && (
                <div className="text-[11px] text-gray-500">
                  {placement.urgentContact.typeId ? `${placement.urgentContact.typeId} ` : ''}
                  {placement.urgentContact.idNumber || ''}
                </div>
              )}
            </div>
          </div>
        )}
        
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
                    {nextDate ? new Date(nextDate).toLocaleDateString('fr-FR') : '-'}
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
              <p className="text-xs text-gray-500">Type</p>
              <p className="font-bold text-gray-800 text-xs">
                {placement.payoutMode === 'MonthlyCommission_CapitalEnd' ? 'Mensuel' : 'Final'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 flex-wrap">
          {onOpenClick && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={onOpenClick}
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              Ouvrir
            </Button>
          )}
          {placement.status === 'Draft' && onEditClick && (
            <Button
              size="sm"
              variant="default"
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
              onClick={onEditClick}
            >
              <Edit className="w-4 h-4 mr-1" />
              Modifier
            </Button>
          )}
          {placement.status === 'Draft' && onDeleteClick && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={onDeleteClick}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Supprimer
            </Button>
          )}
          {/* Bouton Téléverser le contrat si pas de contrat */}
          {!placement.contractDocumentId && onUploadContractClick && (
            <Button
              size="sm"
              variant="default"
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
              onClick={onUploadContractClick}
            >
              <Upload className="w-4 h-4 mr-1" />
              Téléverser
            </Button>
          )}
          {/* Bouton Voir le document si contrat existe */}
          {placement.contractDocumentId && onViewContractClick && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={onViewContractClick}
            >
              <Eye className="w-4 h-4 mr-1" />
              Voir le document
            </Button>
          )}
          {/* Bouton Détails seulement pour les placements actifs avec contrat (pour voir commissions, etc.) */}
          {placement.status === 'Active' && placement.contractDocumentId && onDetailsClick && (
            <Button
              size="sm"
              variant="secondary"
              className="text-xs"
              onClick={onDetailsClick}
            >
              Détails
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

