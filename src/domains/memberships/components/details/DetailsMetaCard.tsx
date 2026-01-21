/**
 * Carte de métadonnées (admin traiteur, dates, corrections, etc.)
 */

'use client'

import { FileText, Calendar, CheckCircle, UserCheck, Zap, AlertCircle, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ModernCard } from './shared/ModernCard'
import { InfoField } from './shared/InfoField'
import { StatusBadgeV2 } from '../shared'
import { formatDateDetailed } from '../../utils/details'
import { toast } from 'sonner'
import type { MembershipRequest } from '../../entities'

interface DetailsMetaCardProps {
  request: MembershipRequest
  admin?: { firstName?: string; lastName?: string } | null
  isLoadingAdmin?: boolean
}

export function DetailsMetaCard({ request, admin, isLoadingAdmin = false }: DetailsMetaCardProps) {
  return (
    <ModernCard 
      title="Informations sur la demande" 
      icon={FileText} 
      iconColor="text-orange-600" 
      className="bg-gradient-to-br from-orange-50/30 to-orange-100/20"
    >
      <div className="space-y-4 lg:space-y-6" data-testid="details-meta-card">
        <div className="p-3 lg:p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl border">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
            ID de la demande
          </label>
          <div className="flex items-center justify-between">
            <code className="font-mono text-xs lg:text-sm font-bold text-gray-900 bg-white px-2 lg:px-3 py-1 lg:py-2 rounded-lg border truncate flex-1 mr-2">{request.id}</code>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 lg:h-8 lg:w-8 p-0 flex-shrink-0"
              onClick={() => {
                navigator.clipboard.writeText(request.id)
                toast.success('ID copié !', { duration: 2000 })
              }}
            >
              <Copy className="w-3 h-3" />
            </Button>
          </div>
        </div>

        <div className="space-y-3 lg:space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
              Statut actuel
            </label>
            <div className="w-fit">
              <StatusBadgeV2 status={request.status} />
            </div>
          </div>

          <InfoField
            label="Date de création"
            value={formatDateDetailed(request.createdAt)}
            icon={Calendar}
            color="text-blue-600"
          />

          <InfoField
            label="Dernière modification"
            value={formatDateDetailed(request.updatedAt)}
            icon={Calendar}
            color="text-purple-600"
          />

          {request.processedAt && (
            <InfoField
              label="Date de traitement"
              value={formatDateDetailed(request.processedAt)}
              icon={CheckCircle}
              color="text-green-600"
              data-testid="details-processed-at"
            />
          )}

          {admin && (
            <InfoField
              label="Traité par"
              value={isLoadingAdmin ? 'Chargement...' : `${admin.firstName || ''} ${admin.lastName || ''}`.trim() || 'Admin'}
              icon={UserCheck}
              color="text-indigo-600"
              data-testid="details-processed-by"
            />
          )}

          {request.memberNumber && (
            <div className="p-3 lg:p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border-2 border-emerald-200">
              <label className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-2 block flex items-center gap-1">
                <Zap className="w-3 h-3" />
                Numéro de membre
              </label>
              <div className="flex items-center justify-between">
                <code className="font-mono text-base lg:text-lg font-black text-emerald-700 bg-white px-3 lg:px-4 py-1 lg:py-2 rounded-lg border border-emerald-300 truncate flex-1 mr-2">
                  {request.memberNumber}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 lg:h-8 lg:w-8 p-0 text-emerald-600 flex-shrink-0"
                  onClick={() => {
                    navigator.clipboard.writeText(request.memberNumber!)
                    toast.success('Numéro copié !', { duration: 2000 })
                  }}
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}

          {request.adminComments && (
            <div className="p-3 lg:p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
              <label className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2 block">
                Commentaires administrateur
              </label>
              <p className="text-sm text-blue-800 leading-relaxed">{request.adminComments}</p>
            </div>
          )}

          {request.reviewNote && (
            <div className="p-3 lg:p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200" data-testid="details-review-note">
              <label className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-2 block flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Note de révision
              </label>
              <p className="text-sm text-amber-800 leading-relaxed">{request.reviewNote}</p>
            </div>
          )}
        </div>
      </div>
    </ModernCard>
  )
}
