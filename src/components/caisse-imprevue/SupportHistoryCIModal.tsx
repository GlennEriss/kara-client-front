'use client'

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  History,
  DollarSign,
  CheckCircle,
  Clock,
  User,
  Calendar,
  AlertCircle,
} from 'lucide-react'
import { useSupportHistory, useAdmin } from '@/hooks/caisse-imprevue'
import { SupportCI } from '@/types/types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface SupportHistoryCIModalProps {
  isOpen: boolean
  onClose: () => void
  contractId: string
}

export default function SupportHistoryCIModal({
  isOpen,
  onClose,
  contractId,
}: SupportHistoryCIModalProps) {
  const { data: supports = [], isLoading, isError } = useSupportHistory(contractId)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#224D62] flex items-center gap-2">
            <History className="h-6 w-6" />
            Historique des aides financières
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : isError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Erreur lors du chargement de l'historique des supports
              </AlertDescription>
            </Alert>
          ) : supports.length === 0 ? (
            <div className="text-center py-12">
              <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Aucun support enregistré pour ce contrat</p>
            </div>
          ) : (
            <div className="space-y-4">
              {supports.map((support) => (
                <SupportCard key={support.id} support={support} />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function SupportCard({ support }: { support: SupportCI }) {
  const { data: admin, isLoading: loadingAdmin } = useAdmin(support.approvedBy)

  const isRepaid = support.status === 'REPAID'
  const progressPercentage = (support.amountRepaid / support.amount) * 100

  return (
    <div className={`border-2 rounded-xl p-4 ${
      isRepaid ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'
    }`}>
      {/* En-tête */}
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-[#224D62]" />
            <span className="font-bold text-lg text-[#224D62]">
              {support.amount.toLocaleString('fr-FR')} FCFA
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="h-4 w-4" />
            Accordé le {format(support.approvedAt, 'dd MMM yyyy à HH:mm', { locale: fr })}
          </div>
        </div>
        <Badge className={isRepaid ? 'bg-green-600' : 'bg-orange-600'}>
          {isRepaid ? (
            <>
              <CheckCircle className="h-3 w-3 mr-1" />
              Remboursé
            </>
          ) : (
            <>
              <Clock className="h-3 w-3 mr-1" />
              En cours
            </>
          )}
        </Badge>
      </div>

      {/* Progression du remboursement */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Remboursé</span>
          <span className="font-semibold text-green-600">
            {support.amountRepaid.toLocaleString('fr-FR')} FCFA ({progressPercentage.toFixed(0)}%)
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              isRepaid ? 'bg-green-500' : 'bg-orange-500'
            }`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        {!isRepaid && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Restant</span>
            <span className="font-semibold text-orange-600">
              {support.amountRemaining.toLocaleString('fr-FR')} FCFA
            </span>
          </div>
        )}
      </div>

      {/* Approuvé par */}
      <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
        <User className="h-4 w-4" />
        <span>
          Approuvé par : {loadingAdmin ? (
            <Skeleton className="inline-block h-4 w-24" />
          ) : admin ? (
            <strong>{admin.firstName} {admin.lastName}</strong>
          ) : (
            support.approvedBy
          )}
        </span>
      </div>

      {/* Versements de remboursement */}
      {support.repayments.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm font-semibold text-gray-700 mb-2">
            Historique des remboursements ({support.repayments.length})
          </p>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {support.repayments.map((repayment, idx) => (
              <div
                key={repayment.id}
                className="flex items-center justify-between text-xs bg-white rounded p-2"
              >
                <span className="text-gray-600">
                  {format(repayment.createdAt, 'dd/MM/yyyy', { locale: fr })} à {repayment.time}
                </span>
                <span className="font-semibold text-green-600">
                  +{repayment.amount.toLocaleString('fr-FR')} FCFA
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Date de remboursement complet */}
      {isRepaid && support.repaidAt && (
        <div className="mt-3 pt-3 border-t border-green-200">
          <div className="flex items-center gap-2 text-sm text-green-700">
            <CheckCircle className="h-4 w-4" />
            <span>
              Remboursé intégralement le {format(support.repaidAt, 'dd MMMM yyyy', { locale: fr })}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

