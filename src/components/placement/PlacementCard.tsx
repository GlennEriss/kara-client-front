'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { usePlacementCommissions } from '@/hooks/usePlacements'
import { useMember } from '@/hooks/useMembers'
import type { Placement } from '@/types/types'
import { AlertCircle, Calendar, CheckCircle, Clock, DollarSign, Edit, ExternalLink, Eye, FileText, Phone, Trash2, Upload } from 'lucide-react'

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
          <Avatar className="h-10 w-10 border border-gray-200 shadow-sm">
            {member?.photoURL ? (
              <AvatarImage src={member.photoURL} alt={`Photo de ${placement.benefactorName || 'membre'}`} />
            ) : null}
            <AvatarFallback className="bg-[#234D65] text-white text-xs font-semibold">
              {`${member?.firstName?.[0] || ''}${member?.lastName?.[0] || ''}`.toUpperCase() || 'MB'}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-0.5">
            <div className="text-xs text-gray-500">Bienfaiteur</div>
            <div className="font-semibold text-gray-800">
              {placement.benefactorName || (member ? `${member.firstName || ''} ${member.lastName || ''}`.trim() : placement.benefactorId.slice(0, 12))}
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
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 bg-white cursor-pointer text-[#224D62] border border-[#224D62] hover:bg-[#224D62] hover:text-white"
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              Ouvrir
            </Button>
          )}

          {placement.status === 'Draft' && onEditClick && (
            <Button
              size="sm"
              variant="outline"
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 border-2 border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400"
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
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 border-2 border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400"
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
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 border-2 border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400"
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
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 border-2 border-orange-300 text-orange-700 hover:bg-orange-50 hover:border-orange-400"
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
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 border-2 border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400"
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
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 border-2 border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400"
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
