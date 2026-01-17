"use client"

import React, { useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Clock,
  DollarSign,
  FileDown,
  FileText,
  Upload,
  Calendar,
  Phone,
  User,
  X,
} from 'lucide-react'
import { usePlacement, usePlacementCommissions, useEarlyExit } from '@/hooks/usePlacements'
import { useAuth } from '@/hooks/useAuth'
import PlacementDocumentUploadModal from '@/components/placement/PlacementDocumentUploadModal'
import PayCommissionModal, { CommissionPaymentFormData } from '@/components/placement/PayCommissionModal'
import ViewPlacementDocumentModal from '@/components/placement/ViewPlacementDocumentModal'
import PlacementFinalQuittanceModal from '@/components/placement/PlacementFinalQuittanceModal'
import PlacementEarlyExitQuittanceModal from '@/components/placement/PlacementEarlyExitQuittanceModal'
import CommissionReceiptModal from '@/components/placement/CommissionReceiptModal'
import EarlyExitForm from '@/components/placement/EarlyExitForm'
import type { CommissionPaymentPlacement } from '@/types/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useQueryClient } from '@tanstack/react-query'

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
      await service.payCommissionWithProof(placementId, commissionId, data.proofFile, benefactorId, paidDate, adminId)
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
  const id = params.id
  const { user } = useAuth()

  const { data: placement, isLoading, isError, error } = usePlacement(id)
  const { data: commissions = [], refetch: refetchCommissions } = usePlacementCommissions(id)
const { data: earlyExit } = useEarlyExit(id)
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
  const [showEarlyExitForm, setShowEarlyExitForm] = useState(false)

  const payoutLabel = useMemo(() => {
    if (placement?.payoutMode === 'MonthlyCommission_CapitalEnd') return 'Commission mensuelle + capital à la fin'
    if (placement?.payoutMode === 'CapitalPlusCommission_End') return 'Capital + commissions à la fin'
    return ''
  }, [placement])

  const statusColor = useMemo(() => {
    switch (placement?.status) {
      case 'Active':
        return 'bg-green-100 text-green-700'
      case 'Draft':
        return 'bg-amber-100 text-amber-700'
      case 'Closed':
        return 'bg-blue-100 text-blue-700'
      case 'EarlyExit':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
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
  const totalAmount = commissions.reduce((s, c) => s + (c.amount || 0), 0)
  const paid = commissions.filter(c => c.status === 'Paid')
  const paidAmount = paid.reduce((s, c) => s + (c.amount || 0), 0)
  const due = commissions.filter(c => c.status === 'Due')
  const nextDue = due[0]
  const progress = totalAmount > 0 ? Math.min(100, Math.round((paidAmount / totalAmount) * 100)) : 0
  const overdueCount = due.filter(c => new Date(c.dueDate).getTime() < Date.now()).length
  return { totalAmount, paidAmount, progress, nextDue, overdueCount }
}, [commissions])

const sortedCommissions = useMemo(
  () => [...commissions].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()),
  [commissions]
)

const commissionStatusLabel = (status: string) => {
  if (status === 'Paid') return 'Payée'
  if (status === 'Due') return 'À payer'
  return status
}

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-72" />
            <Skeleton className="h-72 lg:col-span-2" />
          </div>
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
            <Button onClick={() => router.push('/placements')} className="bg-gradient-to-r from-[#234D65] to-[#2c5a73]">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour à la liste
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const dueSorted = [...commissions].sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
  const derivedStart = placement.startDate || dueSorted[0]?.dueDate
  const derivedEnd = placement.endDate || dueSorted[dueSorted.length - 1]?.dueDate
  const derivedNext = placement.nextCommissionDate || dueSorted.find(c => c.status === 'Due')?.dueDate
  const nextDate = derivedNext ? new Date(derivedNext).toLocaleDateString('fr-FR') : '-'
  const hasContract = !!placement.contractDocumentId

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs uppercase text-gray-500 font-semibold tracking-wide">Placement #{placement.id}</p>
            <h1 className="text-3xl font-black text-gray-900">Détails du placement</h1>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColor}`}>{statusLabel}</span>
              <Separator orientation="vertical" className="h-4" />
              <span className="font-medium text-gray-700">{payoutLabel}</span>
              {placement.urgentContact && (
                <>
                  <Separator orientation="vertical" className="h-4" />
                  <Button size="sm" variant="outline" onClick={() => setShowUrgentModal(true)}>
                    Contact urgent
                  </Button>
                </>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/placements')} className="bg-white">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            {!hasContract && placement.status !== 'Closed' && placement.status !== 'EarlyExit' && (
              <Button
                onClick={() => setIsUploadOpen(true)}
                className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] text-white"
                disabled={!user?.uid}
              >
                <Upload className="h-4 w-4 mr-2" />
                Téléverser le contrat
              </Button>
            )}
            {hasContract && (
              <Button variant="secondary" onClick={() => setIsViewOpen(true)}>
                <FileText className="h-4 w-4 mr-2" />
                Voir le contrat
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="border-0 shadow-md">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 text-[#234D65]">
                  <DollarSign className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold">Montant</p>
                  <p className="text-2xl font-black text-gray-900">{placement.amount.toLocaleString()} FCFA</p>
                  <p className="text-sm text-gray-600">Taux: {placement.rate}% — {placement.periodMonths} mois</p>
                </div>
              </div>
              <Separator />
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span>Début: {derivedStart ? new Date(derivedStart).toLocaleDateString('fr-FR') : '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span>Fin: {derivedEnd ? new Date(derivedEnd).toLocaleDateString('fr-FR') : '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span>Prochaine commission: {nextDate}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 text-emerald-700">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold">Bienfaiteur</p>
                  <p className="text-lg font-bold text-gray-900">
                    {placement.benefactorName || placement.benefactorId}
                  </p>
                  {placement.benefactorPhone && (
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <Phone className="h-4 w-4 text-gray-400" />
                      {placement.benefactorPhone}
                    </p>
                  )}
                </div>
              </div>
              {placement.urgentContact && (
                <div className="mt-2 rounded-lg border border-amber-100 bg-amber-50 p-3 space-y-1">
                  <div className="text-xs font-semibold text-amber-700 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    Contact urgent
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    {placement.urgentContact.name}
                    {placement.urgentContact.firstName ? ` ${placement.urgentContact.firstName}` : ''}
                  </p>
                  <p className="text-sm text-gray-700">{placement.urgentContact.phone}</p>
                  {placement.urgentContact.phone2 && (
                    <p className="text-xs text-gray-600">{placement.urgentContact.phone2}</p>
                  )}
                  {placement.urgentContact.relationship && (
                    <p className="text-xs text-gray-500">{placement.urgentContact.relationship}</p>
                  )}
                  {(placement.urgentContact.typeId || placement.urgentContact.idNumber) && (
                    <p className="text-[11px] text-gray-500">
                      {placement.urgentContact.typeId ? `${placement.urgentContact.typeId} ` : ''}
                      {placement.urgentContact.idNumber || ''}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-slate-50 to-gray-100 text-gray-700">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold">Contrat</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {hasContract ? 'Contrat téléversé' : 'En attente de contrat'}
                    </p>
                  </div>
                </div>
                {hasContract ? (
                  <Button size="sm" variant="secondary" onClick={() => setIsViewOpen(true)}>
                    <FileDown className="h-4 w-4 mr-2" />
                    Ouvrir
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => setIsUploadOpen(true)} disabled={!user?.uid}>
                    <Upload className="h-4 w-4 mr-2" />
                    Téléverser
                  </Button>
                )}
              </div>
              {!hasContract && (
                <Alert className="border-amber-200 bg-amber-50">
                  <AlertDescription className="text-sm text-amber-700">
                    Téléversez le contrat signé pour activer le placement.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Capital / sortie anticipée */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-gray-900">Capital / Sortie anticipée</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={() => setShowFinalQuittance(true)}
                disabled={placement.status !== 'Closed' && placement.status !== 'Active'}
              >
                Quittance finale
              </Button>
              <Button
                variant="default"
                disabled={placement.status === 'Closed'}
                onClick={() => setShowCloseModal(true)}
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
            {!earlyExit && (
              <p className="text-xs text-gray-500">Aucune sortie anticipée enregistrée.</p>
            )}
          </CardContent>
        </Card>

        {/* Documents liés */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-gray-900">Documents liés</CardTitle>
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

        {/* Stats contrat */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <p className="text-xs uppercase text-gray-500 font-semibold">Montants commissions</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {commissionStats.paidAmount.toLocaleString()} / {commissionStats.totalAmount.toLocaleString()} FCFA
              </p>
              <div className="mt-3">
                <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#234D65] to-[#2c5a73]"
                    style={{ width: `${commissionStats.progress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">{commissionStats.progress}% payés</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <p className="text-xs uppercase text-gray-500 font-semibold">Prochaine échéance</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                {commissionStats.nextDue
                  ? new Date(commissionStats.nextDue.dueDate).toLocaleDateString('fr-FR')
                  : 'Aucune'}
              </p>
              <p className="text-sm text-gray-600">
                {commissionStats.nextDue ? `${commissionStats.nextDue.amount.toLocaleString()} FCFA` : 'Toutes payées'}
              </p>
              {commissionStats.overdueCount > 0 && (
                <p className="text-xs text-red-600 font-semibold mt-2">
                  {commissionStats.overdueCount} échéance(s) en retard
                </p>
              )}
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md">
            <CardContent className="p-4 space-y-2">
              <p className="text-xs uppercase text-gray-500 font-semibold">Actions</p>
              <div className="flex flex-wrap gap-2">
                {!hasContract && placement.status !== 'Closed' && placement.status !== 'EarlyExit' && (
                  <Button size="sm" variant="outline" onClick={() => setIsUploadOpen(true)} disabled={!user?.uid}>
                    <Upload className="h-4 w-4 mr-2" />
                    Téléverser contrat
                  </Button>
                )}
                {placement.contractDocumentId && (
                  <Button size="sm" variant="secondary" onClick={() => setIsViewOpen(true)}>
                    <FileText className="h-4 w-4 mr-2" />
                    Voir contrat
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold text-gray-900">Commissions</CardTitle>
            {commissions.length > 0 && (
              <div className="flex items-center gap-2">
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
            )}
          </CardHeader>
          <CardContent className="p-0">
            {commissions.length === 0 ? (
              <div className="p-6 text-sm text-gray-600">Aucune commission générée (placement en brouillon ou contrat manquant).</div>
            ) : (
              <div className="p-4">
                {commissionViewFormat === 'cards' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {sortedCommissions.map((c) => {
                      const isPaid = c.status === 'Paid'
                      const isOverdue = c.status === 'Due' && new Date(c.dueDate).getTime() < Date.now()
                      return (
                        <Card key={`sched-${c.id}`} className="border border-gray-100 shadow-sm">
                          <CardContent className="p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs text-gray-500">Échéance</p>
                                <p className="text-sm font-semibold text-gray-900">{new Date(c.dueDate).toLocaleDateString('fr-FR')}</p>
                              </div>
                              <span
                                className={cn(
                                  'px-2 py-1 text-[11px] rounded-full font-semibold',
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
                            <p className="text-sm text-gray-700 font-semibold">{c.amount.toLocaleString()} FCFA</p>
                            <div className="flex items-center gap-2">
                              {isPaid && c.proofDocumentId && (
                                <Button variant="secondary" size="sm" className="text-xs" onClick={() => setViewProofId(c.proofDocumentId!)}>
                                  <FileText className="h-4 w-4 mr-1" /> Voir preuve
                                </Button>
                              )}
                              {isPaid && c.receiptDocumentId && (
                                <Button variant="secondary" size="sm" className="text-xs" onClick={() => setViewReceiptCommissionId(c.id)}>
                                  <FileText className="h-4 w-4 mr-1" /> Reçu
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
                                isPaid ? 'border-green-500 bg-green-100' : isOverdue ? 'border-red-500 bg-red-100' : 'border-amber-400 bg-amber-50'
                              )}
                            />
                            {sortedCommissions.indexOf(c) < sortedCommissions.length - 1 && (
                              <div className="flex-1 w-px bg-gray-200 h-full min-h-[40px]" />
                            )}
                          </div>
                          <div className="flex-1 rounded-lg border border-gray-100 bg-white shadow-sm p-3">
                            <div className="flex items-center justify-between">
                              <div className="space-y-0.5">
                                <p className="text-sm font-semibold text-gray-900">
                                  {new Date(c.dueDate).toLocaleDateString('fr-FR')}
                                </p>
                                <p className="text-xs text-gray-500">Montant: {c.amount.toLocaleString()} FCFA</p>
                              </div>
                              <span
                                className={cn(
                                  'px-2 py-1 text-[11px] rounded-full font-semibold',
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
                            <div className="flex items-center gap-2 mt-2 text-xs">
                              {c.proofDocumentId ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2"
                                  onClick={() => setViewProofId(c.proofDocumentId!)}
                                >
                                  <FileText className="h-4 w-4 mr-1" /> Voir preuve
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
                                  <FileText className="h-4 w-4 mr-1" /> Reçu
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
                          <th className="px-4 py-3 text-left font-semibold">Montant</th>
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
                            <td className="px-4 py-3 font-semibold text-gray-900">{c.amount.toLocaleString()} FCFA</td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-1 text-xs rounded-full ${
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
                                  <FileText className="h-4 w-4 mr-1" /> Voir
                                </Button>
                              ) : (
                                <span className="text-xs text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {c.receiptDocumentId ? (
                                <Button variant="ghost" size="sm" onClick={() => setViewReceiptCommissionId(c.id)}>
                                  <FileText className="h-4 w-4 mr-1" /> Ouvrir
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
              </div>
            )}
          </CardContent>
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

      {/* Modal de demande de retrait anticipé */}
      {showEarlyExitForm && placement && (
        <Dialog open={showEarlyExitForm} onOpenChange={setShowEarlyExitForm}>
          <DialogContent className="sm:max-w-lg max-w-[95vw]">
            <DialogHeader>
              <DialogTitle>Demander un retrait anticipé</DialogTitle>
              <DialogDescription>
                Les montants sont calculés automatiquement selon la règle : commission d'un mois si au moins 1 mois écoulé, sinon 0 commission.
              </DialogDescription>
            </DialogHeader>
            <EarlyExitForm 
              placementId={placement.id} 
              onClose={() => {
                setShowEarlyExitForm(false)
                qc.invalidateQueries({ queryKey: ['earlyExit', placement.id] })
                qc.invalidateQueries({ queryKey: ['placement', placement.id] })
              }} 
            />
          </DialogContent>
        </Dialog>
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
        <DialogContent className="max-w-2xl">
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
                    await qc.invalidateQueries({ queryKey: ['placement', placement.id] })
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
                disabled={isClosing || !closeFile}
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

