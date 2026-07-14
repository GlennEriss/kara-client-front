'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { usePlacementCommissions } from '@/hooks/usePlacements'
import { useMember } from '@/hooks/useMembers'
import type { Placement } from '@/types/types'
import { AlertCircle, Calendar, CheckCircle, Clock, DollarSign, Edit, ExternalLink, Eye, FileText, Trash2, Upload } from 'lucide-react'

interface PlacementCardProps {
  placement: Placement
  onDetailsClick?: () => void
  onPayCommissionClick: (commissionId: string) => void
  onDeleteClick?: () => void
  onOpenClick?: () => void
  onUploadContractClick?: () => void
  onViewContractClick?: () => void
  onDownloadContractClick?: () => void
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
  onDownloadContractClick,
  onEditClick,
}: PlacementCardProps) {
  const { data: commissions = [] } = usePlacementCommissions(placement.id)
  const { data: member } = useMember(placement.benefactorId)
  
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
    <Card className="group flex flex-col rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-200 hover:border-gray-200 hover:shadow-md">
      <CardContent className="space-y-3 text-sm pt-5">
        {/* Header : avatar + bienfaiteur pleine largeur, statut sur sa propre
            ligne (un statut long à droite tronquait le nom). */}
        <div className="flex items-start gap-3">
          <Avatar className="size-9 shrink-0 rounded-xl">
            {member?.photoURL ? (
              <AvatarImage src={member.photoURL} alt={`Photo de ${placement.benefactorName || 'membre'}`} className="h-full w-full object-cover object-center" />
            ) : null}
            <AvatarFallback className="rounded-xl bg-[#234D65] text-[11px] font-semibold text-white">
              {`${member?.firstName?.[0] || ''}${member?.lastName?.[0] || ''}`.toUpperCase() || 'MB'}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-900">
              {placement.benefactorName || (member ? `${member.firstName || ''} ${member.lastName || ''}`.trim() : placement.benefactorId.slice(0, 12))}
            </p>
            <p className="truncate text-xs text-gray-400">
              {placement.benefactorPhone || `#${placement.id.slice(0, 8)}`}
            </p>
          </div>
        </div>
        <span className={`flex items-center gap-1.5 text-xs font-semibold ${
          placement.status === 'Active' ? 'text-emerald-700' :
          placement.status === 'Draft' ? 'text-amber-700' :
          'text-gray-600'
        }`}>
          <span className={`h-2 w-2 rounded-full shrink-0 ${
            placement.status === 'Active' ? 'bg-emerald-500' :
            placement.status === 'Draft' ? 'bg-amber-400' :
            'bg-gray-400'
          }`} />
          {statusLabel[placement.status] || placement.status}
        </span>
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
        
        <div className="grid grid-cols-2 gap-3 rounded-xl bg-gray-50 p-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Montant</p>
            <p className="font-bold text-[#234D65] tabular-nums text-sm">{placement.amount.toLocaleString()} <span className="text-[10px] font-normal text-gray-400">FCFA</span></p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Taux</p>
            <p className="font-bold text-gray-900 tabular-nums text-sm">{placement.rate}<span className="text-[10px] font-normal text-gray-400">%</span></p>
          </div>
        </div>

        {/* Affichage des commissions - Uniquement si le placement est Active */}
        {placement.status === 'Active' && commissions.length > 0 && (
          <div className={`p-3 rounded-lg border ${
            nextDueCommission
              ? 'bg-orange-50 border-orange-200'
              : 'bg-green-50 border-green-200'
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
                  className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
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

        {(placement.startDate || placement.endDate) && (
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200">
            {placement.startDate && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Date de début</p>
                  <p className="font-bold text-gray-800 text-xs">
                    {new Date(placement.startDate).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            )}
            {placement.endDate && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Date de fin</p>
                  <p className="font-bold text-gray-800 text-xs">
                    {new Date(placement.endDate).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2 pt-2">
          {onOpenClick && (
            <Button
              size="sm"
              onClick={onOpenClick}
              className="w-full h-9 bg-[#234D65] hover:bg-[#2c5a73] text-white text-sm font-semibold"
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              Ouvrir
            </Button>
          )}

          {placement.status === 'Draft' && onEditClick && (
            <Button
              size="sm"
              variant="outline"
              className="w-full h-9 text-xs border-blue-200 text-blue-700 hover:bg-blue-50"
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
              className="w-full h-9 text-xs border-red-200 text-red-600 hover:bg-red-50"
              onClick={onDeleteClick}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Supprimer
            </Button>
          )}

          {/* Contrat: télécharger (template ou PDF téléversé) */}
          {onDownloadContractClick && (
            <Button
              size="sm"
              variant="outline"
              className="w-full h-9 text-xs border-gray-200 text-gray-600 hover:border-[#234D65] hover:text-[#234D65]"
              onClick={onDownloadContractClick}
            >
              <FileText className="w-4 h-4 mr-1" />
              Télécharger contrat
            </Button>
          )}

          {/* Contrat: téléverser si manquant */}
          {!placement.contractDocumentId && onUploadContractClick && (
            <Button
              size="sm"
              variant="outline"
              className="w-full h-9 text-xs border-amber-200 text-amber-700 hover:bg-amber-50"
              onClick={onUploadContractClick}
            >
              <Upload className="w-4 h-4 mr-1" />
              Téléverser contrat
            </Button>
          )}

          {/* Contrat: voir si disponible */}
          {placement.contractDocumentId && onViewContractClick && (
            <Button
              size="sm"
              variant="outline"
              className="w-full h-9 text-xs border-gray-200 text-gray-600 hover:border-[#234D65] hover:text-[#234D65]"
              onClick={onViewContractClick}
            >
              <Eye className="w-4 h-4 mr-1" />
              Voir contrat
            </Button>
          )}

          {/* Détails seulement pour les placements actifs avec contrat */}
          {placement.status === 'Active' && placement.contractDocumentId && onDetailsClick && (
            <Button
              size="sm"
              variant="outline"
              className="w-full h-9 text-xs border-gray-200 text-gray-600 hover:border-[#234D65] hover:text-[#234D65]"
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
