"use client"

import { backOr } from '@/lib/backNavigation'
import CommissionReceiptModal from '@/components/placement/CommissionReceiptModal'
import PayCommissionModal, { CommissionPaymentFormData } from '@/components/placement/PayCommissionModal'
import PlacementDocumentUploadModal from '@/components/placement/PlacementDocumentUploadModal'
import PlacementEarlyExitQuittanceModal from '@/components/placement/PlacementEarlyExitQuittanceModal'
import PlacementFinalQuittanceModal from '@/components/placement/PlacementFinalQuittanceModal'
import ViewPlacementDocumentModal from '@/components/placement/ViewPlacementDocumentModal'
import EarlyWithdrawalRequestModal from '@/components/shared/EarlyWithdrawalRequestModal'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DetailHeroSkeleton } from '@/components/ui/detail-hero'
import { StatStrip } from '@/components/ui/stat-strip'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import routes from '@/constantes/routes'
import { useAuth } from '@/hooks/useAuth'
import { useMember } from '@/hooks/useMembers'
import { useCalculateEarlyExit, useEarlyExit, usePlacement, usePlacementCommissions, usePlacementMutations } from '@/hooks/usePlacements'
import { cn } from '@/lib/utils'
import {
  buildPlacementFacturePage1Data,
  generatePlacementFacturePDF,
  mapCommissionToPlacementVersement,
} from '@/services/placement/facturePlacementPdfExport'
import type { CommissionPaymentPlacement } from '@/types/types'
import { roundFcfa, sumCommissionAmounts } from '@/utils/placementMoney'
import { useQueryClient } from '@tanstack/react-query'
import {
    AlertCircle,
    ArrowLeft,
    DollarSign,
    FileDown,
    FileText,
    History,
    Receipt,
    Upload,
    X,
} from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

function PayCommissionWrapper({
  placementId,
  commissionId,
  benefactorId,
  adminId,
  onClose,
  onPaid,
}: {
  placementId: string | null
  commissionId: string | null
  benefactorId?: string | null
  adminId?: string | null
  onClose: () => void
  onPaid: () => void
}) {
  const { data: commissions = [] } = usePlacementCommissions(placementId || undefined)
  const commission = useMemo(
    () => (commissionId ? commissions.find((c) => c.id === commissionId) : null),
    [commissionId, commissions]
  )

  if (!placementId || !commissionId || !commission) return null

  const handleSubmit = async (data: CommissionPaymentFormData) => {
    try {
      const { ServiceFactory } = await import('@/factories/ServiceFactory')
      const service = ServiceFactory.getPlacementService()
      const paidDate = new Date(`${data.date}T${data.time}`)
      if (!benefactorId || !adminId) throw new Error('Utilisateur non authentifié')
      await service.payCommissionWithProof(placementId, commissionId, data.proofFile, benefactorId, paidDate, adminId, {
        paidAmount: data.amount,
        paymentMode: data.mode,
        withFees: data.withFees,
        paymentMethodOther: data.paymentMethodOther,
      })
      onPaid()
      onClose()
      toast.success('Commission payée')
    } catch (error: any) {
      toast.error(error?.message || 'Erreur lors du paiement')
    }
  }

  return (
    <PayCommissionModal
      isOpen
      onClose={onClose}
      onSubmit={handleSubmit}
      commission={commission as CommissionPaymentPlacement}
      isPaying={false}
    />
  )
}

export default function PlacementDetailsPage() {
  const params = useParams() as { id: string }
  const router = useRouter()
  const id = params.id
  const { user } = useAuth()

  const { data: placement, isLoading, isError, error } = usePlacement(id)
  const { data: commissions = [], refetch: refetchCommissions } = usePlacementCommissions(id)
  const { data: earlyExit } = useEarlyExit(id)
  // Date de retrait saisie dans le modal : le service recalcule la commission
  // sur cette date, l'affichage doit donc suivre la même base.
  const [earlyExitDate, setEarlyExitDate] = useState<string | null>(null)
  const earlyExitEffectiveDate = useMemo(() => {
    if (!earlyExitDate) return null
    const parsed = new Date(`${earlyExitDate}T00:00:00`)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }, [earlyExitDate])
  const { data: calculatedEarlyExit } = useCalculateEarlyExit(id, earlyExitEffectiveDate)
  const { requestEarlyExit } = usePlacementMutations()
  const { data: member } = useMember(placement?.benefactorId)
  const qc = useQueryClient()

  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [payCommissionId, setPayCommissionId] = useState<string | null>(null)
  const [viewProofId, setViewProofId] = useState<string | null>(null)
  const [viewReceiptCommissionId, setViewReceiptCommissionId] = useState<string | null>(null)
const [showFinalQuittance, setShowFinalQuittance] = useState(false)
const [showEarlyExitQuittance, setShowEarlyExitQuittance] = useState(false)
const [showUrgentModal, setShowUrgentModal] = useState(false)
const [finalQuittanceId, setFinalQuittanceId] = useState<string | null>(null)
const [earlyExitAddendumId, setEarlyExitAddendumId] = useState<string | null>(null)
const [earlyExitQuittanceId, setEarlyExitQuittanceId] = useState<string | null>(null)
const [showAddendumUpload, setShowAddendumUpload] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
const [showCloseModal, setShowCloseModal] = useState(false)
const [closeFile, setCloseFile] = useState<File | null>(null)
const [closingReason, setClosingReason] = useState('')
  const [commissionViewFormat, setCommissionViewFormat] = useState<'cards' | 'timeline' | 'table'>('cards')
  const [contractTab, setContractTab] = useState<'versements' | 'historique'>('versements')
  const [isGeneratingGlobalFacture, setIsGeneratingGlobalFacture] = useState(false)
  const [isGeneratingSingleFactureId, setIsGeneratingSingleFactureId] = useState<string | null>(null)
  const [showEarlyExitForm, setShowEarlyExitForm] = useState(false)

  const payoutLabel = useMemo(() => {
    if (placement?.payoutMode === 'MonthlyCommission_CapitalEnd') return 'Commission mensuelle + capital à la fin'
    if (placement?.payoutMode === 'CapitalPlusCommission_End') return 'Capital + commissions à la fin'
    return ''
  }, [placement])

  const statusColor = useMemo(() => {
    switch (placement?.status) {
      case 'Active':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'Draft':
        return 'bg-amber-100 text-amber-700 border-amber-200'
      case 'Closed':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'EarlyExit':
        return 'bg-red-100 text-red-700 border-red-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }, [placement?.status])

  const statusLabel = useMemo(() => {
    const map: Record<string, string> = {
      Draft: 'Brouillon',
      Active: 'Actif',
      Closed: 'Clos',
      EarlyExit: 'Sortie anticipée',
    }
    return placement?.status ? map[placement.status] || placement.status : ''
  }, [placement?.status])

const commissionStats = useMemo(() => {
  const totalAmount = sumCommissionAmounts(commissions, ['Due', 'Paid', 'Partial'])
  const paid = commissions.filter(c => c.status === 'Paid')
  const paidAmount = sumCommissionAmounts(
    paid.map((commission) => ({
      ...commission,
      amount: roundFcfa(commission.paidAmount ?? commission.amount),
    })),
  )
  const due = commissions
    .filter(c => c.status === 'Due' || c.status === 'Partial')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
  const nextDue = due[0]
  const progress = totalAmount > 0 ? Math.min(100, Math.round((paidAmount / totalAmount) * 100)) : 0
  const overdueCount = due.filter(c => new Date(c.dueDate).getTime() < Date.now()).length
  return { totalAmount, paidAmount, progress, nextDue, overdueCount, paidCount: paid.length }
}, [commissions])

const sortedCommissions = useMemo(
  () => [...commissions].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()),
  [commissions]
)

const paidCommissions = useMemo(
  () =>
    [...commissions]
      .filter((c) => c.status === 'Paid')
      .sort((a, b) => new Date(b.paidAt || b.dueDate).getTime() - new Date(a.paidAt || a.dueDate).getTime()),
  [commissions]
)

const commissionStatusLabel = (status: string) => {
  if (status === 'Paid') return 'Payée'
  if (status === 'Due') return 'À payer'
  if (status === 'Partial') return 'Partielle'
  if (status === 'Canceled') return 'Annulée'
  return status
}

const paymentModeLabel = (mode?: string, paymentMethodOther?: string) => {
  if (!mode) return '-'
  if (mode === 'airtel_money') return 'Airtel Money'
  if (mode === 'mobicash') return 'Mobicash'
  if (mode === 'cash') return 'Espèce'
  if (mode === 'bank_transfer') return 'Virement bancaire'
  if (mode === 'other') return paymentMethodOther?.trim() || 'Autre'
  return mode
}

const handleGenerateSingleFacture = async (commission: CommissionPaymentPlacement) => {
  if (!placement) return
  try {
    setIsGeneratingSingleFactureId(commission.id)
    const page1Data = buildPlacementFacturePage1Data(placement, member)
    const versement = mapCommissionToPlacementVersement({ placement, commission })
    await generatePlacementFacturePDF({
      page1Data,
      versements: [versement],
      filename: `facture_versement_placement_${placement.id}_${commission.id}.pdf`,
      title: 'FACTURE VERSEMENT PLACEMENT',
    })
    toast.success('Facture du versement générée')
  } catch (error: any) {
    toast.error(error?.message || 'Erreur lors de la génération de la facture')
  } finally {
    setIsGeneratingSingleFactureId(null)
  }
}

const handleGenerateGlobalFacture = async () => {
  if (!placement) return
  if (paidCommissions.length === 0) {
    toast.error('Aucun versement payé à inclure dans la facture globale')
    return
  }
  try {
    setIsGeneratingGlobalFacture(true)
    const page1Data = buildPlacementFacturePage1Data(placement, member)
    const versements = paidCommissions.map((commission) => mapCommissionToPlacementVersement({ placement, commission }))
    await generatePlacementFacturePDF({
      page1Data,
      versements,
      filename: `facture_globale_placement_${placement.id}.pdf`,
      title: 'HISTORIQUE VERSEMENTS PLACEMENT',
    })
    toast.success('Facture globale générée')
  } catch (error: any) {
    toast.error(error?.message || 'Erreur lors de la génération de la facture globale')
  } finally {
    setIsGeneratingGlobalFacture(false)
  }
}

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
          <DetailHeroSkeleton cards={2} />
        </div>
      </div>
    )
  }

  if (isError || !placement) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="max-w-md border-0 shadow-2xl">
          <CardContent className="p-8 text-center space-y-4">
            <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="h-10 w-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Erreur de chargement</h2>
            <p className="text-gray-600">{error instanceof Error ? error.message : 'Impossible de charger le placement'}</p>
            <Button onClick={() => backOr(router, '/placements')} className="bg-gradient-to-r from-[#234D65] to-[#2c5a73]">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const dueSorted = [...commissions].sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
  const derivedStart = placement.startDate || dueSorted[0]?.dueDate
  const derivedEnd = placement.endDate || dueSorted[dueSorted.length - 1]?.dueDate
  const derivedNext = placement.nextCommissionDate || dueSorted.find(
    c => c.status === 'Due' || c.status === 'Partial',
  )?.dueDate
  const nextDate = derivedNext ? new Date(derivedNext).toLocaleDateString('fr-FR') : '—'
  // Une échéance dont la date est passée n'est pas « prochaine » : elle est en
  // retard. Sans commission générée (brouillon), il n'y a rien à annoncer.
  const hasGeneratedCommissions = commissions.length > 0
  const isNextOverdue = Boolean(
    derivedNext && hasGeneratedCommissions && new Date(derivedNext).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0)
  )
  const nextCommissionLabel = !hasGeneratedCommissions
    ? 'Commissions non générées'
    : isNextOverdue
      ? 'Échéance en retard'
      : 'Prochaine commission'
  const hasContract = !!placement.contractDocumentId
  const unpaidCommissions = commissions.filter((commission) => commission.status !== 'Paid')
  const allCommissionsPaid = commissions.length > 0 && unpaidCommissions.length === 0
  const canClosePlacement = placement.status === 'Active' && allCommissionsPaid

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 lg:p-8 overflow-x-hidden">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Barre d'actions + badges — gabarit commun aux fiches contrat */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              variant="outline"
              onClick={() => backOr(router, routes.admin.placements)}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour
            </Button>

            {hasContract && (
              <Button
                variant="outline"
                onClick={() => setIsViewOpen(true)}
                className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                <FileText className="h-4 w-4" />
                Voir le contrat
              </Button>
            )}

            {!hasContract && placement.status !== 'Closed' && placement.status !== 'EarlyExit' && (
              <Button
                variant="outline"
                onClick={() => setIsUploadOpen(true)}
                disabled={!user?.uid}
                className="gap-2 border-orange-300 text-orange-700 hover:bg-orange-50"
              >
                <Upload className="h-4 w-4" />
                Téléverser le contrat
              </Button>
            )}

            {placement.urgentContact && (
              <Button
                variant="outline"
                onClick={() => setShowUrgentModal(true)}
                className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
              >
                <AlertCircle className="h-4 w-4" />
                Contact urgent
              </Button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge className={cn('border px-3 py-1 text-sm font-semibold', statusColor)}>
              {statusLabel}
            </Badge>
            <Badge variant="outline" className="border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-700">
              {payoutLabel}
            </Badge>
          </div>
        </div>

        {/* Titre principal */}
        <Card className="border-0 shadow-xl bg-gradient-to-r from-[#234D65] to-[#2c5a73] overflow-hidden">
          <CardHeader className="overflow-hidden">
            <CardTitle className="text-xl sm:text-2xl lg:text-3xl font-black text-white flex items-center gap-3 break-words">
              <DollarSign className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 shrink-0" />
              <span className="break-words">{placement.benefactorName || placement.benefactorId}</span>
            </CardTitle>
            <div className="space-y-1 text-blue-100 break-words">
              <p className="text-sm sm:text-base break-words">
                Placement <span className="font-mono text-xs sm:text-sm break-all">#{placement.id}</span>
              </p>
              {placement.benefactorPhone && (
                <p className="text-sm break-words">{placement.benefactorPhone}</p>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Chiffres clés — bande plate, même gabarit que les fiches contrat */}
        <StatStrip
          stats={[
            {
              title: 'Capital placé',
              value: `${roundFcfa(placement.amount).toLocaleString('fr-FR')} FCFA`,
              accent: true,
            },
            { title: 'Taux', value: `${placement.rate}% / mois` },
            { title: 'Durée', value: `${placement.periodMonths} mois` },
            {
              title: 'Commissions versées',
              value: `${commissionStats.paidAmount.toLocaleString('fr-FR')} FCFA`,
              subtitle: `${commissionStats.progress}% de ${commissionStats.totalAmount.toLocaleString('fr-FR')}`,
              accent: true,
            },
            {
              title: 'Échéances payées',
              value: `${commissionStats.paidCount} / ${commissions.length || '—'}`,
              subtitle: commissionStats.overdueCount > 0
                ? `${commissionStats.overdueCount} en retard`
                : undefined,
            },
            {
              title: 'Contrat',
              value: hasContract ? 'Téléversé' : 'En attente',
            },
          ]}
        />

        {/* Dates — même bande plate, pour ne pas empiler des cartes */}
        <StatStrip
          className="sm:grid-cols-2 lg:grid-cols-4"
          stats={[
            {
              title: 'Début du placement',
              value: derivedStart ? new Date(derivedStart).toLocaleDateString('fr-FR') : '—',
            },
            {
              title: 'Fin du placement',
              value: derivedEnd ? new Date(derivedEnd).toLocaleDateString('fr-FR') : '—',
            },
            {
              // Événement distinct du début : n'entre pas dans l'échéancier.
              title: 'Remise des fonds',
              value: placement.handoverDate
                ? `${new Date(placement.handoverDate).toLocaleDateString('fr-FR')}${placement.handoverTime ? ` à ${placement.handoverTime}` : ''}`
                : '—',
            },
            {
              title: nextCommissionLabel,
              value: hasGeneratedCommissions ? nextDate : '—',
              accent: isNextOverdue,
              danger: isNextOverdue,
            },
          ]}
        />

        {!hasContract && placement.status !== 'Closed' && placement.status !== 'EarlyExit' && (
          <Alert className="border-amber-200 bg-amber-50">
            <AlertDescription className="text-sm text-amber-800">
              Téléversez le contrat signé pour activer le placement et générer les commissions.
            </AlertDescription>
          </Alert>
        )}

        {/* Capital / sortie anticipée */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-[#234D65]">Capital / Sortie anticipée</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={() => setShowFinalQuittance(true)}
                disabled={placement.status !== 'Closed' && !canClosePlacement}
              >
                Quittance finale
              </Button>
              <Button
                variant="default"
                disabled={!canClosePlacement}
                onClick={() => setShowCloseModal(true)}
                className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] text-white hover:from-[#1a3a4d] hover:to-[#234D65]"
              >
                Clôturer le placement
              </Button>
              {!earlyExit && placement.status === 'Active' && (
                <Button
                  variant="outline"
                  className="border-orange-300 text-orange-700 hover:bg-orange-50"
                  onClick={() => setShowEarlyExitForm(true)}
                >
                  Demander retrait anticipé
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={() => setShowEarlyExitQuittance(true)}
                disabled={!earlyExit}
              >
                Quittance sortie anticipée
              </Button>
              {earlyExit && (
                <Button
                  variant="outline"
                  onClick={() => setShowAddendumUpload(true)}
                >
                  Avenant retrait anticipé
                </Button>
              )}
            </div>
            {placement.status !== 'Closed' && !canClosePlacement && (
              <Alert className="border-amber-200 bg-amber-50">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-sm text-amber-800">
                  {placement.status !== 'Active'
                    ? 'Clôture indisponible : le placement doit être actif.'
                    : commissions.length === 0
                    ? 'Clôture indisponible : aucune commission n’a encore été générée.'
                    : `Clôture indisponible : ${unpaidCommissions.length} commission${unpaidCommissions.length > 1 ? 's ne sont' : " n’est"} pas encore au statut payé.`}
                </AlertDescription>
              </Alert>
            )}
            {!earlyExit && (
              <p className="text-xs text-gray-500">Aucune sortie anticipée enregistrée.</p>
            )}
            {earlyExit && (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-[#234D65]">Retrait anticipé enregistré</p>
                <StatStrip
                  className="sm:grid-cols-2 lg:grid-cols-4"
                  stats={[
                    {
                      title: 'Montant à verser',
                      value: `${roundFcfa(earlyExit.payoutAmount).toLocaleString('fr-FR')} FCFA`,
                      accent: true,
                    },
                    {
                      title: 'Date du versement',
                      value: earlyExit.paymentDate
                        ? new Date(earlyExit.paymentDate).toLocaleDateString('fr-FR')
                        : '—',
                    },
                    {
                      title: 'Moyen de paiement',
                      value: paymentModeLabel(earlyExit.paymentMode, earlyExit.paymentMethodOther),
                    },
                    ...(earlyExit.paymentMode === 'airtel_money' || earlyExit.paymentMode === 'mobicash'
                      ? [{
                          title: 'Frais mobile money',
                          value: earlyExit.withFees === true
                            ? 'Avec frais'
                            : earlyExit.withFees === false
                              ? 'Sans frais'
                              : '—',
                        }]
                      : []),
                  ]}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Documents liés */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-[#234D65]">Documents liés</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 text-sm">
            {placement.contractDocumentId && (
              <Button variant="ghost" size="sm" onClick={() => setViewProofId(placement.contractDocumentId!)}>
                <FileText className="h-4 w-4 mr-1" /> Contrat
              </Button>
            )}
            {(placement.finalQuittanceDocumentId || finalQuittanceId) && (
              <Button variant="ghost" size="sm" onClick={() => setViewProofId(placement.finalQuittanceDocumentId || finalQuittanceId!)}>
                <FileText className="h-4 w-4 mr-1" /> Quittance finale
              </Button>
            )}
            {(placement.earlyExitQuittanceDocumentId || earlyExitQuittanceId) && (
              <Button variant="ghost" size="sm" onClick={() => setViewProofId(placement.earlyExitQuittanceDocumentId || earlyExitQuittanceId!)}>
                <FileText className="h-4 w-4 mr-1" /> Quittance sortie
              </Button>
            )}
            {(placement.earlyExitAddendumDocumentId || earlyExitAddendumId) && (
              <Button variant="ghost" size="sm" onClick={() => setViewProofId(placement.earlyExitAddendumDocumentId || earlyExitAddendumId!)}>
                <FileText className="h-4 w-4 mr-1" /> Avenant retrait
              </Button>
            )}
            {!placement.contractDocumentId && !finalQuittanceId && !earlyExitQuittanceId && !earlyExitAddendumId && (
              <span className="text-xs text-gray-500">Aucun document lié pour le moment.</span>
            )}
          </CardContent>
        </Card>

        {/* Progression des commissions — les montants et actions sont déjà dans
            la bande de chiffres clés et la barre d'actions. */}
        {hasGeneratedCommissions && (
          <Card className="border-0 shadow-md">
            <CardContent className="p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm text-slate-700">
                <span>
                  Commissions payées&nbsp;: <b>{commissionStats.paidCount}</b> / {commissions.length}
                </span>
                <span className="tabular-nums text-slate-500">
                  {commissionStats.paidAmount.toLocaleString('fr-FR')} / {commissionStats.totalAmount.toLocaleString('fr-FR')} FCFA
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full bg-gradient-to-r from-[#234D65] to-[#2c5a73]"
                  style={{ width: `${commissionStats.progress}%` }}
                />
              </div>
              {commissionStats.overdueCount > 0 && (
                <p className="text-xs font-semibold text-red-600">
                  {commissionStats.overdueCount} échéance{commissionStats.overdueCount > 1 ? 's' : ''} en retard
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="border-0 shadow-md">
          <Tabs
            value={contractTab}
            onValueChange={(value) => setContractTab(value as 'versements' | 'historique')}
            className="w-full"
          >
            <CardHeader className="space-y-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <CardTitle className="text-[#234D65]">Contrat et versements</CardTitle>
                {contractTab === 'historique' && paidCommissions.length > 0 && (
                  <Button
                    size="sm"
                    onClick={handleGenerateGlobalFacture}
                    disabled={isGeneratingGlobalFacture}
                    className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] text-white hover:from-[#1a3a4d] hover:to-[#234D65]"
                  >
                    <FileDown className="mr-2 h-4 w-4" />
                    {isGeneratingGlobalFacture ? 'Génération...' : 'Facture globale PDF'}
                  </Button>
                )}
              </div>
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="versements" className="flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  Versements
                </TabsTrigger>
                <TabsTrigger value="historique" className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Historique
                </TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent className="pt-0">
              <TabsContent value="versements" className="mt-0 space-y-4">
                {commissions.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-200 p-6 text-sm text-gray-600">
                    Aucune commission générée (placement en brouillon ou contrat manquant).
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant={commissionViewFormat === 'cards' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCommissionViewFormat('cards')}
                        className="text-xs"
                      >
                        Cartes
                      </Button>
                      <Button
                        variant={commissionViewFormat === 'timeline' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCommissionViewFormat('timeline')}
                        className="text-xs"
                      >
                        Timeline
                      </Button>
                      <Button
                        variant={commissionViewFormat === 'table' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCommissionViewFormat('table')}
                        className="text-xs"
                      >
                        Tableau
                      </Button>
                    </div>

                    {commissionViewFormat === 'cards' && (
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {sortedCommissions.map((c) => {
                          const isPaid = c.status === 'Paid'
                          const isOverdue = c.status === 'Due' && new Date(c.dueDate).getTime() < Date.now()
                          return (
                            <Card key={`sched-${c.id}`} className="border border-gray-100 shadow-sm">
                              <CardContent className="space-y-2 p-3">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-xs text-gray-500">Échéance</p>
                                    <p className="text-sm font-semibold text-gray-900">
                                      {new Date(c.dueDate).toLocaleDateString('fr-FR')}
                                    </p>
                                  </div>
                                  <span
                                    className={cn(
                                      'rounded-full px-2 py-1 text-[11px] font-semibold',
                                      isPaid
                                        ? 'bg-green-100 text-green-700'
                                        : isOverdue
                                        ? 'bg-red-100 text-red-700'
                                        : 'bg-amber-100 text-amber-700'
                                    )}
                                  >
                                    {isPaid ? 'Payée' : isOverdue ? 'En retard' : 'À payer'}
                                  </span>
                                </div>
                                <p className="text-sm font-semibold text-gray-700">
                                  Commission : {roundFcfa(c.amount).toLocaleString('fr-FR')} FCFA
                                </p>
                                <div className="flex flex-wrap items-center gap-2">
                                  {isPaid && c.proofDocumentId && (
                                    <Button variant="secondary" size="sm" className="text-xs" onClick={() => setViewProofId(c.proofDocumentId!)}>
                                      <FileText className="mr-1 h-4 w-4" /> Voir preuve
                                    </Button>
                                  )}
                                  {isPaid && c.receiptDocumentId && (
                                    <Button variant="secondary" size="sm" className="text-xs" onClick={() => setViewReceiptCommissionId(c.id)}>
                                      <FileText className="mr-1 h-4 w-4" /> Reçu
                                    </Button>
                                  )}
                                  {!isPaid && placement.status === 'Active' && (
                                    <Button variant="outline" size="sm" className="text-xs" onClick={() => setPayCommissionId(c.id)}>
                                      Payer
                                    </Button>
                                  )}
                                  {!isPaid && placement.status !== 'Active' && (
                                    <span className="text-[11px] text-gray-400">Activer pour payer</span>
                                  )}
                                  {isPaid && !c.proofDocumentId && (
                                    <span className="text-[11px] text-gray-400">Preuve manquante</span>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          )
                        })}
                      </div>
                    )}

                    {commissionViewFormat === 'timeline' && (
                      <div className="space-y-4">
                        {sortedCommissions.map((c) => {
                          const isPaid = c.status === 'Paid'
                          const isOverdue = c.status === 'Due' && new Date(c.dueDate).getTime() < Date.now()
                          return (
                            <div key={c.id} className="flex items-start gap-3">
                              <div className="flex flex-col items-center">
                                <div
                                  className={cn(
                                    'h-3 w-3 rounded-full border-2',
                                    isPaid
                                      ? 'border-green-500 bg-green-100'
                                      : isOverdue
                                      ? 'border-red-500 bg-red-100'
                                      : 'border-amber-400 bg-amber-50'
                                  )}
                                />
                                {sortedCommissions.indexOf(c) < sortedCommissions.length - 1 && (
                                  <div className="h-full min-h-[40px] w-px flex-1 bg-gray-200" />
                                )}
                              </div>
                              <div className="flex-1 rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                                <div className="flex items-center justify-between">
                                  <div className="space-y-0.5">
                                    <p className="text-sm font-semibold text-gray-900">
                                      {new Date(c.dueDate).toLocaleDateString('fr-FR')}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      Commission : {roundFcfa(c.amount).toLocaleString('fr-FR')} FCFA
                                    </p>
                                  </div>
                                  <span
                                    className={cn(
                                      'rounded-full px-2 py-1 text-[11px] font-semibold',
                                      isPaid
                                        ? 'bg-green-100 text-green-700'
                                        : isOverdue
                                        ? 'bg-red-100 text-red-700'
                                        : 'bg-amber-100 text-amber-700'
                                    )}
                                  >
                                    {isPaid ? 'Payée' : isOverdue ? 'En retard' : 'À payer'}
                                  </span>
                                </div>
                                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                                  {c.proofDocumentId ? (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 px-2"
                                      onClick={() => setViewProofId(c.proofDocumentId!)}
                                    >
                                      <FileText className="mr-1 h-4 w-4" /> Voir preuve
                                    </Button>
                                  ) : (
                                    <span className="text-gray-400">Aucune preuve</span>
                                  )}
                                  {c.receiptDocumentId && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 px-2"
                                      onClick={() => setViewReceiptCommissionId(c.id)}
                                    >
                                      <FileText className="mr-1 h-4 w-4" /> Reçu
                                    </Button>
                                  )}
                                  {!isPaid && placement.status === 'Active' && (
                                    <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => setPayCommissionId(c.id)}>
                                      Payer
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {commissionViewFormat === 'table' && (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100 text-sm">
                          <thead className="bg-gray-50 text-gray-600">
                            <tr>
                              <th className="px-4 py-3 text-left font-semibold">Échéance</th>
                              <th className="px-4 py-3 text-left font-semibold">Commission</th>
                              <th className="px-4 py-3 text-left font-semibold">Statut</th>
                              <th className="px-4 py-3 text-left font-semibold">Preuve</th>
                              <th className="px-4 py-3 text-left font-semibold">Reçu/Quittance</th>
                              <th className="px-4 py-3 text-left font-semibold">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {commissions.map((c) => (
                              <tr key={c.id} className="hover:bg-slate-50">
                                <td className="px-4 py-3 text-gray-800">{new Date(c.dueDate).toLocaleDateString('fr-FR')}</td>
                                <td className="px-4 py-3 font-semibold text-gray-900">{roundFcfa(c.amount).toLocaleString('fr-FR')} FCFA</td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`rounded-full px-2 py-1 text-xs ${
                                      c.status === 'Paid'
                                        ? 'bg-green-100 text-green-700'
                                        : c.status === 'Due'
                                        ? 'bg-amber-100 text-amber-700'
                                        : 'bg-gray-100 text-gray-600'
                                    }`}
                                  >
                                    {commissionStatusLabel(c.status)}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  {c.proofDocumentId ? (
                                    <Button variant="ghost" size="sm" onClick={() => setViewProofId(c.proofDocumentId!)}>
                                      <FileText className="mr-1 h-4 w-4" /> Voir
                                    </Button>
                                  ) : (
                                    <span className="text-xs text-gray-400">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  {c.receiptDocumentId ? (
                                    <Button variant="ghost" size="sm" onClick={() => setViewReceiptCommissionId(c.id)}>
                                      <FileText className="mr-1 h-4 w-4" /> Ouvrir
                                    </Button>
                                  ) : (
                                    <span className="text-xs text-gray-400">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  {c.status === 'Due' && placement.status === 'Active' ? (
                                    <Button size="sm" variant="outline" onClick={() => setPayCommissionId(c.id)}>
                                      Payer
                                    </Button>
                                  ) : (
                                    <span className="text-xs text-gray-500">—</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              <TabsContent value="historique" className="mt-0 space-y-4">
                <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-sm text-slate-700">
                  Historique des versements validés avec export PDF par versement et facture globale.
                </div>
                {paidCommissions.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-200 p-6 text-sm text-gray-600">
                    Aucun versement payé pour l’instant.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="min-w-full divide-y divide-gray-100 text-sm">
                      <thead className="bg-gray-50 text-gray-600">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold">Date échéance</th>
                          <th className="px-4 py-3 text-left font-semibold">Date versement</th>
                          <th className="px-4 py-3 text-left font-semibold">Commission payée</th>
                          <th className="px-4 py-3 text-left font-semibold">Preuve</th>
                          <th className="px-4 py-3 text-left font-semibold">Reçu</th>
                          <th className="px-4 py-3 text-left font-semibold">Facture</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 bg-white">
                        {paidCommissions.map((commission) => (
                          <tr key={`history-${commission.id}`} className="hover:bg-slate-50">
                            <td className="px-4 py-3 text-gray-800">
                              {new Date(commission.dueDate).toLocaleDateString('fr-FR')}
                            </td>
                            <td className="px-4 py-3 text-gray-800">
                              {commission.paidAt ? new Date(commission.paidAt).toLocaleDateString('fr-FR') : '-'}
                            </td>
                            <td className="px-4 py-3 font-semibold text-gray-900">
                              {roundFcfa(commission.paidAmount ?? commission.amount).toLocaleString('fr-FR')} FCFA
                            </td>
                            <td className="px-4 py-3">
                              {commission.proofDocumentId ? (
                                <Button variant="ghost" size="sm" onClick={() => setViewProofId(commission.proofDocumentId!)}>
                                  <FileText className="mr-1 h-4 w-4" />
                                  Voir
                                </Button>
                              ) : (
                                <span className="text-xs text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {commission.receiptDocumentId ? (
                                <Button variant="ghost" size="sm" onClick={() => setViewReceiptCommissionId(commission.id)}>
                                  <FileText className="mr-1 h-4 w-4" />
                                  Ouvrir
                                </Button>
                              ) : (
                                <span className="text-xs text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleGenerateSingleFacture(commission)}
                                disabled={isGeneratingSingleFactureId !== null}
                              >
                                <FileDown className="mr-1 h-4 w-4" />
                                {isGeneratingSingleFactureId === commission.id ? 'Génération...' : 'Facture PDF'}
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>

      <PlacementDocumentUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        placementId={placement.id}
        documentType="PLACEMENT_CONTRACT"
        title="Téléverser le contrat"
        description="Ajoutez le contrat signé pour activer le placement."
        onUploaded={() => {
          setIsUploadOpen(false)
          qc.invalidateQueries({ queryKey: ['placement', placement.id] })
          qc.invalidateQueries({ queryKey: ['placement', placement.id, 'commissions'] })
          qc.invalidateQueries({ queryKey: ['placements'] })
          toast.success('Contrat téléversé')
        }}
        benefactorId={placement.benefactorId}
      />

      {placement.contractDocumentId && (
        <ViewPlacementDocumentModal
          isOpen={isViewOpen}
          onClose={() => setIsViewOpen(false)}
          documentId={placement.contractDocumentId}
          title="Contrat de placement"
        />
      )}

      <PayCommissionWrapper
        placementId={placement.id}
        commissionId={payCommissionId}
      benefactorId={placement.benefactorId}
      adminId={user?.uid || null}
        onClose={() => setPayCommissionId(null)}
        onPaid={() => {
          refetchCommissions()
        }}
      />

      {viewProofId && (
        <ViewPlacementDocumentModal
          isOpen={!!viewProofId}
          onClose={() => setViewProofId(null)}
          documentId={viewProofId}
          title="Preuve de commission"
        />
      )}

      {viewReceiptCommissionId && placement && (() => {
        const commission = commissions.find(c => c.id === viewReceiptCommissionId)
        return commission ? (
          <CommissionReceiptModal
            isOpen={!!viewReceiptCommissionId}
            onClose={() => setViewReceiptCommissionId(null)}
            placement={placement}
            commission={commission}
          />
        ) : null
      })()}

      {showFinalQuittance && (
        <PlacementFinalQuittanceModal
          isOpen={showFinalQuittance}
          onClose={() => setShowFinalQuittance(false)}
          placement={placement}
          onGenerated={(docId) => setFinalQuittanceId(docId)}
        />
      )}

      {showEarlyExitQuittance && earlyExit && (
        <PlacementEarlyExitQuittanceModal
          isOpen={showEarlyExitQuittance}
          onClose={() => setShowEarlyExitQuittance(false)}
          placement={placement}
          earlyExit={earlyExit}
          onGenerated={(docId) => {
            setEarlyExitQuittanceId(docId)
            refetchCommissions()
          }}
        />
      )}

      {showAddendumUpload && earlyExit && (
        <PlacementDocumentUploadModal
          isOpen={showAddendumUpload}
          onClose={() => setShowAddendumUpload(false)}
          placementId={placement.id}
          benefactorId={placement.benefactorId}
          documentType="PLACEMENT_EARLY_EXIT_ADDENDUM"
          title="Avenant de retrait anticipé"
          description="Téléversez l'avenant de retrait anticipé signé."
          onUploaded={(docId) => {
            setEarlyExitAddendumId(docId)
            setShowAddendumUpload(false)
            toast.success('Avenant téléversé')
          }}
        />
      )}

      {placement && (
        <EarlyWithdrawalRequestModal
          isOpen={showEarlyExitForm}
          onClose={() => setShowEarlyExitForm(false)}
          isSubmitting={requestEarlyExit.isPending}
          memberDisplayName={
            placement.benefactorName ||
            `${member?.firstName || ''} ${member?.lastName || ''}`.trim() ||
            'Bienfaiteur'
          }
          contractDisplayLabel={`Placement #${placement.id}`}
          monthlyAmountLabel={`Capital placé : ${roundFcfa(placement.amount).toLocaleString('fr-FR')} FCFA`}
          // Pas de repli sur le capital seul : tant que le calcul n'a pas
          // abouti, le montant reste à 0 et la soumission est bloquée, plutôt
          // que de verrouiller un montant sans la commission de sortie.
          maxAmount={Math.max(0, roundFcfa(calculatedEarlyExit?.payoutAmount ?? 0))}
          maxAmountLabel="Montant à verser"
          lockAmount
          onWithdrawalDateChange={setEarlyExitDate}
          onSubmit={async (formData) => {
            if (!user?.uid) {
              toast.error('Utilisateur non authentifié')
              throw new Error('Utilisateur non authentifié')
            }

            await requestEarlyExit.mutateAsync({
              placementId: placement.id,
              commissionDue: Math.max(0, roundFcfa(calculatedEarlyExit?.commissionDue ?? 0)),
              payoutAmount: formData.withdrawalAmount,
              withdrawalAmount: formData.withdrawalAmount,
              withdrawalDate: formData.withdrawalDate,
              withdrawalTime: formData.withdrawalTime,
              withdrawalProof: formData.withdrawalProof,
              reason: formData.reason,
              documentPdf: formData.documentPdf,
              paymentMode: formData.withdrawalMode,
              paymentDate: new Date(`${formData.withdrawalDate}T${formData.withdrawalTime}`),
              benefactorId: placement.benefactorId,
              adminId: user.uid,
            })

            qc.invalidateQueries({ queryKey: ['placement', placement.id, 'early-exit'] })
            qc.invalidateQueries({ queryKey: ['placement', placement.id] })
            qc.invalidateQueries({ queryKey: ['placements'] })
            toast.success('Demande de retrait anticipé créée')
          }}
        />
      )}

      {showUrgentModal && placement.urgentContact && (
        <Dialog open={showUrgentModal} onOpenChange={setShowUrgentModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Contact urgent</DialogTitle>
              <DialogDescription>Informations du contact urgent</DialogDescription>
            </DialogHeader>
            <div className="space-y-2 text-sm text-gray-700">
              <div className="font-semibold text-gray-900">
                {placement.urgentContact.name}
                {placement.urgentContact.firstName ? ` ${placement.urgentContact.firstName}` : ''}
              </div>
              <div>{placement.urgentContact.phone}</div>
              {placement.urgentContact.phone2 && <div>{placement.urgentContact.phone2}</div>}
              {placement.urgentContact.relationship && (
                <div className="text-gray-500 text-xs">Lien : {placement.urgentContact.relationship}</div>
              )}
              {(placement.urgentContact.typeId || placement.urgentContact.idNumber) && (
                <div className="text-gray-500 text-xs">
                  {placement.urgentContact.typeId} {placement.urgentContact.idNumber}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Clôture placement */}
      <Dialog open={showCloseModal} onOpenChange={setShowCloseModal}>
        <DialogContent className="sm:max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Clôturer le placement</DialogTitle>
            <DialogDescription>
              Indiquez le motif de clôture et téléversez la quittance finale.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="closing-reason" className="text-sm font-medium">
                Motif de clôture *
              </label>
              <Textarea
                id="closing-reason"
                placeholder="Décrivez la raison de la clôture du placement (minimum 10 caractères)"
                className="min-h-[100px]"
                value={closingReason}
                onChange={(e) => setClosingReason(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Minimum 10 caractères, maximum 500 caractères
              </p>
            </div>
            <div className="space-y-2">
              <label htmlFor="final-quittance" className="text-sm font-medium">
                Quittance finale *
              </label>
              <Input
                id="final-quittance"
                type="file"
                accept="application/pdf"
                onChange={(e) => setCloseFile(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-gray-500">
                Téléversez la quittance finale signée du placement. Format accepté : PDF uniquement, taille maximale : 10 MB.
              </p>
              {closeFile && (
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                  <FileText className="h-4 w-4 text-gray-600" />
                  <span className="text-sm text-gray-700 flex-1">{closeFile.name}</span>
                  <span className="text-xs text-gray-500">
                    {(closeFile.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => setCloseFile(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowCloseModal(false)
                  setClosingReason('')
                  setCloseFile(null)
                }}
                disabled={isClosing}
              >
                Annuler
              </Button>
              <Button
                onClick={async () => {
                  if (!user?.uid) return
                  if (!canClosePlacement) {
                    toast.error('Toutes les commissions doivent être payées avant la clôture')
                    return
                  }
                  if (!closingReason || closingReason.trim().length < 10) {
                    toast.error('Le motif de clôture est requis (minimum 10 caractères)')
                    return
                  }
                  if (!closeFile) {
                    toast.error('La quittance finale est requise')
                    return
                  }
                  if (closeFile.type !== 'application/pdf') {
                    toast.error('Le fichier doit être un PDF')
                    return
                  }
                  if (closeFile.size > 10 * 1024 * 1024) {
                    toast.error('La taille du fichier ne peut pas dépasser 10MB')
                    return
                  }
                  setIsClosing(true)
                  try {
                    const { ServiceFactory } = await import('@/factories/ServiceFactory')
                    const service = ServiceFactory.getPlacementService()
                    const updated = await service.closePlacement(placement.id, closeFile, closingReason.trim(), user.uid)
                    await Promise.all([
                      qc.invalidateQueries({ queryKey: ['placement', placement.id] }),
                      qc.invalidateQueries({ queryKey: ['placement', placement.id, 'commissions'] }),
                      qc.invalidateQueries({ queryKey: ['placements'] }),
                    ])
                    setFinalQuittanceId(updated.finalQuittanceDocumentId || null)
                    toast.success('Placement clôturé')
                    setShowCloseModal(false)
                    setClosingReason('')
                    setCloseFile(null)
                  } catch (e: any) {
                    toast.error(e?.message || 'Erreur lors de la clôture')
                  } finally {
                    setIsClosing(false)
                  }
                }}
                disabled={isClosing || !closeFile || !canClosePlacement}
                className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] text-white hover:from-[#1a3a4d] hover:to-[#234D65]"
              >
                {isClosing ? 'Clôture...' : 'Clôturer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
