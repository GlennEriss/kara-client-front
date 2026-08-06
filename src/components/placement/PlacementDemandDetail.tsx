'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    DetailField,
    DetailHero,
    DetailHeroSkeleton,
    DetailNotFound,
    DetailTextBlock,
} from '@/components/ui/detail-hero'
import routes from '@/constantes/routes'
import { usePlacementDemand, usePlacementDemandMutations } from '@/hooks/placement/usePlacementDemands'
import { usePlacementDemandesRealtimeSync } from '@/hooks/placement/usePlacementDemandesRealtimeSync'
import { usePlacement } from '@/hooks/usePlacements'
import { cn } from '@/lib/utils'
import { PlacementDemandStatus } from '@/types/types'
import {
    AlertCircle,
    CheckCircle,
    Clock,
    CreditCard,
    DollarSign,
    RotateCcw,
    User,
    XCircle
} from 'lucide-react'
import { backOr } from '@/lib/backNavigation'
import { useRouter } from 'next/navigation'
import * as React from 'react'
import { useState } from 'react'
import AcceptDemandModal from './AcceptDemandModal'
import RejectDemandModal from './RejectDemandModal'
import ReopenDemandModal from './ReopenDemandModal'

interface PlacementDemandDetailProps {
  demandId: string
}

const Field = DetailField
const TextBlock = DetailTextBlock

const formatDateTime = (value: Date | string) =>
  new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

const formatDay = (value: Date | string) =>
  new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

export default function PlacementDemandDetail({ demandId }: PlacementDemandDetailProps) {
  const router = useRouter()
  const { data: demand, isLoading, error } = usePlacementDemand(demandId)
  const { data: linkedPlacement } = usePlacement(demand?.placementId)
  const { convert } = usePlacementDemandMutations()
  usePlacementDemandesRealtimeSync(true)
  
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

  const getPaymentModeLabel = (mode?: string, methodOther?: string) => {
    if (mode === 'airtel_money') return 'Airtel Money'
    if (mode === 'mobicash') return 'Mobicash'
    if (mode === 'cash') return 'Espèce'
    if (mode === 'bank_transfer') return 'Virement bancaire'
    if (mode === 'other') return methodOther?.trim() || 'Autres'
    return '—'
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

  const hasActions =
    demand?.status === 'PENDING' ||
    demand?.status === 'REJECTED' ||
    (demand?.status === 'APPROVED' && !demand.placementId)

  if (isLoading) {
    return <DetailHeroSkeleton />
  }

  if (error || !demand) {
    return (
      <DetailNotFound
        title="Demande introuvable"
        message={error instanceof Error ? error.message : 'La demande n’a pas pu être chargée.'}
        onBack={() => backOr(router, routes.admin.placementDemandes)}
      />
    )
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <DetailHero
        eyebrow="Demande de placement"
        title="Détails de la demande"
        reference={demand.id}
        onBack={() => backOr(router, routes.admin.placementDemandes)}
        badge={
          <Badge className={cn('border px-3 py-1 text-sm font-semibold', getStatusColor(demand.status))}>
            {getStatusLabel(demand.status)}
          </Badge>
        }
        stats={[
          { label: 'Capital', value: `${demand.amount.toLocaleString('fr-FR')} FCFA` },
          { label: 'Taux', value: `${demand.rate}% / mois` },
          { label: 'Durée', value: `${demand.periodMonths} mois`, wide: true },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,1fr)]">
        <div className="space-y-6">
          <Card className="border-0 bg-white/95 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-[#234D65]">
                <DollarSign className="h-5 w-5" />
                Informations de la demande
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field
                  label="Capital"
                  value={`${demand.amount.toLocaleString('fr-FR')} FCFA`}
                  valueClassName="text-emerald-700"
                />
                <Field label="Taux de commission" value={`${demand.rate}% / mois`} />
                <Field label="Durée prévue" value={`${demand.periodMonths} mois`} />
                <Field label="Mode de règlement" value={getPayoutModeLabel(demand.payoutMode)} />
                {demand.desiredDate && (
                  <Field label="Date souhaitée" value={formatDay(demand.desiredDate)} />
                )}
                <Field label="Créée le" value={formatDateTime(demand.createdAt)} />
              </div>

              {demand.cause && <TextBlock label="Cause / Motif" value={demand.cause} />}
            </CardContent>
          </Card>

          {demand.decisionMadeAt && (
            <Card className="border-0 bg-white/95 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-[#234D65]">
                  {demand.status === 'APPROVED' ? (
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  Décision
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Date de la décision" value={formatDateTime(demand.decisionMadeAt)} />
                  {demand.decisionMadeByName && (
                    <Field label="Décision par" value={demand.decisionMadeByName} />
                  )}
                </div>
                {demand.decisionReason && <TextBlock label="Raison" value={demand.decisionReason} />}
              </CardContent>
            </Card>
          )}

          {demand.reopenedAt && (
            <Card className="border-0 bg-white/95 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-[#234D65]">
                  <RotateCcw className="h-5 w-5 text-blue-600" />
                  Réouverture
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Réouverte le" value={formatDateTime(demand.reopenedAt)} />
                  {demand.reopenedByName && (
                    <Field label="Réouverte par" value={demand.reopenedByName} />
                  )}
                </div>
                {demand.reopenReason && (
                  <TextBlock label="Motif de réouverture" value={demand.reopenReason} />
                )}
              </CardContent>
            </Card>
          )}

          {demand.placementId && linkedPlacement && (
            <Card className="border-0 bg-white/95 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-[#234D65]">
                  <CreditCard className="h-5 w-5" />
                  Informations de remise des fonds
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field
                    label="Moyen de paiement"
                    value={getPaymentModeLabel(linkedPlacement.paymentMode, linkedPlacement.paymentMethodOther)}
                  />
                  {(linkedPlacement.paymentMode === 'airtel_money' || linkedPlacement.paymentMode === 'mobicash') && (
                    <Field
                      label="Frais mobile money"
                      value={
                        linkedPlacement.withFees === true
                          ? 'Avec frais'
                          : linkedPlacement.withFees === false
                            ? 'Sans frais'
                            : '—'
                      }
                    />
                  )}
                  <Field label="Lieu de remise" value={linkedPlacement.handoverLocation || '—'} />
                  <Field
                    label="Date de remise"
                    value={linkedPlacement.handoverDate ? formatDay(linkedPlacement.handoverDate) : '—'}
                  />
                  <Field label="Heure de remise" value={linkedPlacement.handoverTime || '—'} />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="border-0 bg-white/95 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-[#234D65]">
                <User className="h-5 w-5" />
                Bienfaiteur
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3">
                <Field label="Nom" value={demand.benefactorName || 'Non renseigné'} />
                {demand.benefactorPhone && (
                  <Field label="Téléphone" value={demand.benefactorPhone} />
                )}
              </div>
            </CardContent>
          </Card>

          {demand.urgentContact && (
            <Card className="border-0 bg-white/95 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-[#234D65]">
                  <AlertCircle className="h-5 w-5" />
                  Contact d&apos;urgence
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3">
                  <Field
                    label="Nom"
                    value={`${demand.urgentContact.name} ${demand.urgentContact.firstName || ''}`.trim()}
                  />
                  <Field label="Téléphone" value={demand.urgentContact.phone} />
                  {demand.urgentContact.relationship && (
                    <Field label="Relation" value={demand.urgentContact.relationship} />
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {demand.placementId && (
            <Card className="border-0 bg-white/95 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-[#234D65]">
                  <CreditCard className="h-5 w-5" />
                  Placement créé
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Référence</p>
                  <p className="mt-1 break-all font-mono text-sm font-semibold text-emerald-900">
                    {demand.placementId}
                  </p>
                </div>
                <Button
                  onClick={() => router.push(routes.admin.placementDetails(demand.placementId!))}
                  className="w-full bg-[#234D65] hover:bg-[#2c5a73]"
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Voir le placement
                </Button>
              </CardContent>
            </Card>
          )}

          {hasActions && (
            <Card className="border-0 bg-white/95 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-[#234D65]">Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-3">
                  {demand.status === 'PENDING' && (
                    <>
                      <Button
                        onClick={() => setAcceptModalOpen(true)}
                        className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700"
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Accepter la demande
                      </Button>
                      <Button onClick={() => setRejectModalOpen(true)} variant="destructive">
                        <XCircle className="mr-2 h-4 w-4" />
                        Refuser la demande
                      </Button>
                    </>
                  )}
                  {demand.status === 'REJECTED' && (
                    <Button
                      onClick={() => setReopenModalOpen(true)}
                      className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
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
                          <Clock className="mr-2 h-4 w-4 animate-spin" />
                          Conversion...
                        </>
                      ) : (
                        <>
                          <CreditCard className="mr-2 h-4 w-4" />
                          Créer le placement
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

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
