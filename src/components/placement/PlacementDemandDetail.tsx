'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DetailHeroSkeleton } from '@/components/ui/detail-hero'
import { StatStrip } from '@/components/ui/stat-strip'
import routes from '@/constantes/routes'
import { usePlacementDemand, usePlacementDemandMutations } from '@/hooks/placement/usePlacementDemands'
import { usePlacementDemandesRealtimeSync } from '@/hooks/placement/usePlacementDemandesRealtimeSync'
import { usePlacement } from '@/hooks/usePlacements'
import { backOr } from '@/lib/backNavigation'
import { cn } from '@/lib/utils'
import { PlacementDemandStatus } from '@/types/types'
import { roundFcfa } from '@/utils/placementMoney'
import {
    AlertCircle,
    ArrowLeft,
    CheckCircle,
    Clock,
    CreditCard,
    DollarSign,
    RotateCcw,
    XCircle,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import AcceptDemandModal from './AcceptDemandModal'
import RejectDemandModal from './RejectDemandModal'
import ReopenDemandModal from './ReopenDemandModal'

interface PlacementDemandDetailProps {
  demandId: string
}

const STATUS_COLORS: Record<PlacementDemandStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-700 border-amber-200',
  APPROVED: 'bg-green-100 text-green-700 border-green-200',
  REJECTED: 'bg-red-100 text-red-700 border-red-200',
  CONVERTED: 'bg-blue-100 text-blue-700 border-blue-200',
}

const STATUS_LABELS: Record<PlacementDemandStatus, string> = {
  PENDING: 'En attente',
  APPROVED: 'Acceptée',
  REJECTED: 'Refusée',
  CONVERTED: 'Convertie',
}

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

/** Motif cité (raison de décision, de réouverture, cause de la demande). */
function Quote({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{value}</p>
    </div>
  )
}

export default function PlacementDemandDetail({ demandId }: PlacementDemandDetailProps) {
  const router = useRouter()
  const { data: demand, isLoading, error } = usePlacementDemand(demandId)
  const { data: linkedPlacement } = usePlacement(demand?.placementId)
  const { convert } = usePlacementDemandMutations()
  usePlacementDemandesRealtimeSync(true)

  const [acceptModalOpen, setAcceptModalOpen] = useState(false)
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [reopenModalOpen, setReopenModalOpen] = useState(false)

  const getPayoutModeLabel = (mode: string) =>
    mode === 'MonthlyCommission_CapitalEnd'
      ? 'Commission mensuelle + capital à la fin'
      : 'Capital + commissions à la fin'

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
      const result = await convert.mutateAsync({ demandId: demand.id })
      if (result?.placement) {
        router.push(routes.admin.placementDetails(result.placement.id))
      }
    } catch (error) {
      console.error('Erreur lors de la conversion:', error)
    }
  }

  if (isLoading) {
    return <DetailHeroSkeleton cards={2} />
  }

  if (error || !demand) {
    return (
      <Card className="mx-auto max-w-md border-0 shadow-2xl">
        <CardContent className="space-y-4 p-8 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
            <AlertCircle className="h-10 w-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Demande introuvable</h2>
          <p className="text-gray-600">
            {error instanceof Error ? error.message : "Cette demande n'existe pas ou a été supprimée."}
          </p>
          <Button
            onClick={() => backOr(router, routes.admin.placementDemandes)}
            className="bg-gradient-to-r from-[#234D65] to-[#2c5a73]"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
        </CardContent>
      </Card>
    )
  }

  const benefactorName = demand.benefactorName || `Bienfaiteur ${demand.benefactorId.slice(0, 8)}`
  const isDecided = Boolean(demand.decisionMadeAt || demand.reopenedAt)

  return (
    <>
      {/* Barre d'actions + badge — gabarit des fiches de détail */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            onClick={() => backOr(router, routes.admin.placementDemandes)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Button>

          {demand.status === 'PENDING' && (
            <>
              <Button
                variant="outline"
                onClick={() => setAcceptModalOpen(true)}
                className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
              >
                <CheckCircle className="h-4 w-4" />
                Accepter
              </Button>
              <Button
                variant="outline"
                onClick={() => setRejectModalOpen(true)}
                className="gap-2 border-red-300 text-red-700 hover:bg-red-50"
              >
                <XCircle className="h-4 w-4" />
                Refuser
              </Button>
            </>
          )}

          {demand.status === 'REJECTED' && (
            <Button
              variant="outline"
              onClick={() => setReopenModalOpen(true)}
              className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              <RotateCcw className="h-4 w-4" />
              Réouvrir
            </Button>
          )}

          {demand.status === 'APPROVED' && !demand.placementId && (
            <Button
              onClick={handleConvertToPlacement}
              disabled={convert.isPending}
              className="gap-2 bg-gradient-to-r from-[#234D65] to-[#2c5a73] text-white"
            >
              {convert.isPending ? (
                <>
                  <Clock className="h-4 w-4 animate-spin" />
                  Conversion...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4" />
                  Créer le placement
                </>
              )}
            </Button>
          )}

          {demand.placementId && (
            <Button
              variant="outline"
              onClick={() => router.push(routes.admin.placementDetails(demand.placementId!))}
              className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              <CreditCard className="h-4 w-4" />
              Voir le placement
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge className={cn('border px-3 py-1 text-sm font-semibold', STATUS_COLORS[demand.status])}>
            {STATUS_LABELS[demand.status]}
          </Badge>
        </div>
      </div>

      {/* Titre principal */}
      <Card className="border-0 shadow-xl bg-gradient-to-r from-[#234D65] to-[#2c5a73] overflow-hidden">
        <CardHeader className="overflow-hidden">
          <CardTitle className="flex items-center gap-3 break-words text-xl font-black text-white sm:text-2xl lg:text-3xl">
            <DollarSign className="h-6 w-6 shrink-0 sm:h-7 sm:w-7 lg:h-8 lg:w-8" />
            <span className="break-words">{benefactorName}</span>
          </CardTitle>
          <div className="space-y-1 break-words text-blue-100">
            <p className="break-words text-sm sm:text-base">
              Demande de placement{' '}
              <span className="break-all font-mono text-xs sm:text-sm">#{demand.id}</span>
            </p>
            {demand.benefactorPhone && <p className="break-words text-sm">{demand.benefactorPhone}</p>}
          </div>
        </CardHeader>
      </Card>

      {/* Conditions demandées */}
      <StatStrip
        stats={[
          {
            title: 'Capital demandé',
            value: `${roundFcfa(demand.amount).toLocaleString('fr-FR')} FCFA`,
            accent: true,
          },
          { title: 'Taux', value: `${demand.rate}% / mois` },
          { title: 'Durée', value: `${demand.periodMonths} mois` },
          { title: 'Règlement', value: getPayoutModeLabel(demand.payoutMode) },
          {
            title: 'Début souhaité',
            value: demand.desiredDate ? formatDay(demand.desiredDate) : '—',
          },
          { title: 'Créée le', value: formatDateTime(demand.createdAt) },
        ]}
      />

      {demand.cause && (
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-[#234D65]">Cause / Motif</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-gray-700">{demand.cause}</p>
          </CardContent>
        </Card>
      )}

      {isDecided && (
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-[#234D65]">Décision</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <StatStrip
              className="sm:grid-cols-2 lg:grid-cols-4"
              stats={[
                ...(demand.decisionMadeAt
                  ? [
                      {
                        title: demand.status === 'REJECTED' ? 'Refusée le' : 'Acceptée le',
                        value: formatDateTime(demand.decisionMadeAt),
                      },
                      { title: 'Par', value: demand.decisionMadeByName || '—' },
                    ]
                  : []),
                ...(demand.reopenedAt
                  ? [
                      { title: 'Réouverte le', value: formatDateTime(demand.reopenedAt) },
                      { title: 'Réouverte par', value: demand.reopenedByName || '—' },
                    ]
                  : []),
              ]}
            />
            {demand.decisionReason && <Quote label="Motif de la décision" value={demand.decisionReason} />}
            {demand.reopenReason && <Quote label="Motif de réouverture" value={demand.reopenReason} />}
          </CardContent>
        </Card>
      )}

      {demand.urgentContact && (
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-[#234D65]">Contact d&apos;urgence</CardTitle>
          </CardHeader>
          <CardContent>
            <StatStrip
              className="sm:grid-cols-2 lg:grid-cols-3"
              stats={[
                {
                  title: 'Nom',
                  value: `${demand.urgentContact.name} ${demand.urgentContact.firstName || ''}`.trim(),
                },
                { title: 'Téléphone', value: demand.urgentContact.phone },
                ...(demand.urgentContact.relationship
                  ? [{ title: 'Relation', value: demand.urgentContact.relationship }]
                  : []),
              ]}
            />
          </CardContent>
        </Card>
      )}

      {demand.placementId && linkedPlacement && (
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-[#234D65]">Remise des fonds</CardTitle>
          </CardHeader>
          <CardContent>
            <StatStrip
              className="sm:grid-cols-2 lg:grid-cols-4"
              stats={[
                {
                  title: 'Moyen de paiement',
                  value: getPaymentModeLabel(
                    linkedPlacement.paymentMode,
                    linkedPlacement.paymentMethodOther
                  ),
                },
                ...(linkedPlacement.paymentMode === 'airtel_money' ||
                linkedPlacement.paymentMode === 'mobicash'
                  ? [
                      {
                        title: 'Frais mobile money',
                        value:
                          linkedPlacement.withFees === true
                            ? 'Avec frais'
                            : linkedPlacement.withFees === false
                              ? 'Sans frais'
                              : '—',
                      },
                    ]
                  : []),
                { title: 'Lieu', value: linkedPlacement.handoverLocation || '—' },
                {
                  title: 'Date et heure',
                  value: linkedPlacement.handoverDate
                    ? `${formatDay(linkedPlacement.handoverDate)}${linkedPlacement.handoverTime ? ` à ${linkedPlacement.handoverTime}` : ''}`
                    : '—',
                },
              ]}
            />
          </CardContent>
        </Card>
      )}

      <AcceptDemandModal
        isOpen={acceptModalOpen}
        onClose={() => setAcceptModalOpen(false)}
        demand={demand}
        onSuccess={() => setAcceptModalOpen(false)}
      />

      <RejectDemandModal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        demand={demand}
        onSuccess={() => setRejectModalOpen(false)}
      />

      <ReopenDemandModal
        isOpen={reopenModalOpen}
        onClose={() => setReopenModalOpen(false)}
        demand={demand}
        onSuccess={() => setReopenModalOpen(false)}
      />
    </>
  )
}
