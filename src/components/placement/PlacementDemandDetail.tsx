'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  User,
  DollarSign,
  Percent,
  AlertCircle,
  RotateCcw,
  CreditCard,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { usePlacementDemand } from '@/hooks/placement/usePlacementDemands'
import { PlacementDemandStatus } from '@/types/types'
import { cn } from '@/lib/utils'
import routes from '@/constantes/routes'
import AcceptDemandModal from './AcceptDemandModal'
import RejectDemandModal from './RejectDemandModal'
import ReopenDemandModal from './ReopenDemandModal'
import { useState } from 'react'
import { usePlacementDemandMutations } from '@/hooks/placement/usePlacementDemands'

interface PlacementDemandDetailProps {
  demandId: string
}

export default function PlacementDemandDetail({ demandId }: PlacementDemandDetailProps) {
  const router = useRouter()
  const { data: demand, isLoading, error } = usePlacementDemand(demandId)
  const { convert } = usePlacementDemandMutations()
  
  const [acceptModalOpen, setAcceptModalOpen] = useState(false)
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [reopenModalOpen, setReopenModalOpen] = useState(false)

  const getStatusColor = (status: PlacementDemandStatus) => {
    const colors = {
      PENDING: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      APPROVED: 'bg-green-100 text-green-700 border-green-200',
      REJECTED: 'bg-red-100 text-red-700 border-red-200',
      CONVERTED: 'bg-blue-100 text-blue-700 border-blue-200',
    }
    return colors[status] || colors.PENDING
  }

  const getStatusLabel = (status: PlacementDemandStatus) => {
    const labels = {
      PENDING: 'En attente',
      APPROVED: 'Acceptée',
      REJECTED: 'Refusée',
      CONVERTED: 'Convertie',
    }
    return labels[status] || status
  }

  const getPayoutModeLabel = (mode: string) => {
    return mode === 'MonthlyCommission_CapitalEnd' 
      ? 'Commission mensuelle + Capital en fin'
      : 'Capital + Commission en fin'
  }

  const handleConvertToPlacement = async () => {
    if (!demand) return
    try {
      const result = await convert.mutateAsync({
        demandId: demand.id,
      })
      if (result?.placement) {
        router.push(`/placements/${result.placement.id}`)
      }
    } catch (error) {
      console.error('Erreur lors de la conversion:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !demand) {
    return (
      <div className="space-y-6">
        <Button
          variant="outline"
          onClick={() => router.push(routes.admin.placementDemandes)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour à la liste
        </Button>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error instanceof Error ? error.message : 'Demande introuvable'}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => router.push(routes.admin.placementDemandes)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour à la liste
        </Button>
        <Badge className={cn('px-3 py-1', getStatusColor(demand.status))}>
          {getStatusLabel(demand.status)}
        </Badge>
      </div>

      {/* Informations générales */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Informations générales
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">ID de la demande:</span>
              <span className="font-mono font-medium">{demand.id}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Date de création:</span>
              <span className="font-medium">
                {new Date(demand.createdAt).toLocaleDateString('fr-FR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informations du bienfaiteur */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Bienfaiteur
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Nom:</span>
              <span className="font-medium">{demand.benefactorName || 'Non renseigné'}</span>
            </div>
            {demand.benefactorPhone && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Téléphone:</span>
                <span className="font-medium">{demand.benefactorPhone}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Informations de la demande */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Informations de la demande
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Montant:</span>
              <span className="font-semibold text-green-600">
                {demand.amount.toLocaleString('fr-FR')} FCFA
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Taux de commission:</span>
              <span className="font-medium">{demand.rate}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Durée prévue:</span>
              <span className="font-medium">{demand.periodMonths} mois</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Mode de paiement:</span>
              <span className="font-medium">{getPayoutModeLabel(demand.payoutMode)}</span>
            </div>
            {demand.desiredDate && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600 flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Date souhaitée:
                </span>
                <span className="font-medium">
                  {new Date(demand.desiredDate).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
            )}
            {demand.cause && (
              <div className="col-span-2">
                <span className="text-gray-600 block mb-2">Cause / Motif:</span>
                <p className="text-gray-700 whitespace-pre-wrap">{demand.cause}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Contact d'urgence */}
      {demand.urgentContact && (
        <Card>
          <CardHeader>
            <CardTitle>Contact d'urgence</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Nom:</span>
                <span className="font-medium">
                  {demand.urgentContact.name} {demand.urgentContact.firstName || ''}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Téléphone:</span>
                <span className="font-medium">{demand.urgentContact.phone}</span>
              </div>
              {demand.urgentContact.relationship && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Relation:</span>
                  <span className="font-medium">{demand.urgentContact.relationship}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Informations de décision */}
      {demand.decisionMadeAt && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {demand.status === 'APPROVED' ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              Décision
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Date de la décision:</span>
                <span className="font-medium">
                  {new Date(demand.decisionMadeAt).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              {demand.decisionMadeByName && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Décision par:</span>
                  <span className="font-medium">{demand.decisionMadeByName}</span>
                </div>
              )}
              {demand.decisionReason && (
                <div className="col-span-2">
                  <span className="text-gray-600 block mb-2">Raison:</span>
                  <p className="text-gray-700 whitespace-pre-wrap">{demand.decisionReason}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Informations de réouverture */}
      {demand.reopenedAt && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-blue-600" />
              Réouverture
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Réouverte le:</span>
                <span className="font-medium">
                  {new Date(demand.reopenedAt).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              {demand.reopenedByName && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Réouverte par:</span>
                  <span className="font-medium">{demand.reopenedByName}</span>
                </div>
              )}
              {demand.reopenReason && (
                <div className="col-span-2">
                  <span className="text-gray-600 block mb-2">Motif de réouverture:</span>
                  <p className="text-gray-700 whitespace-pre-wrap">{demand.reopenReason}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lien vers le placement */}
      {demand.placementId && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 mb-1">Placement créé:</p>
                <p className="font-mono font-medium">{demand.placementId}</p>
              </div>
              <Button
                onClick={() => router.push(`/placements/${demand.placementId}`)}
                className="bg-[#234D65] hover:bg-[#2c5a73]"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Voir le placement
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-3">
            {demand.status === 'PENDING' && (
              <>
                <Button
                  onClick={() => setAcceptModalOpen(true)}
                  className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Accepter la demande
                </Button>
                <Button
                  onClick={() => setRejectModalOpen(true)}
                  variant="destructive"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Refuser la demande
                </Button>
              </>
            )}
            {demand.status === 'REJECTED' && (
              <Button
                onClick={() => setReopenModalOpen(true)}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Réouvrir la demande
              </Button>
            )}
            {demand.status === 'APPROVED' && !demand.placementId && (
              <Button
                onClick={handleConvertToPlacement}
                disabled={convert.isPending}
                className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65]"
              >
                {convert.isPending ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Conversion...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Créer le placement
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <AcceptDemandModal
        isOpen={acceptModalOpen}
        onClose={() => setAcceptModalOpen(false)}
        demand={demand}
        onSuccess={() => {
          setAcceptModalOpen(false)
        }}
      />

      <RejectDemandModal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        demand={demand}
        onSuccess={() => {
          setRejectModalOpen(false)
        }}
      />

      <ReopenDemandModal
        isOpen={reopenModalOpen}
        onClose={() => setReopenModalOpen(false)}
        demand={demand}
        onSuccess={() => {
          setReopenModalOpen(false)
        }}
      />
    </div>
  )
}

