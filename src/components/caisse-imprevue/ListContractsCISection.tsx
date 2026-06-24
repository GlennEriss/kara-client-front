'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ListPagination } from '@/components/ui/list-pagination'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import routes from '@/constantes/routes'
import ContractsFiltersV2 from '@/domains/financial/caisse-imprevue/components/contracts/filters/ContractsFiltersV2'
import { useContractsCI, type ContractCIFilters } from '@/domains/financial/caisse-imprevue/hooks/useContractsCI'
import { useContractPaymentStats } from '@/hooks/caisse-imprevue'
import { useSubscriptionsCICache } from '@/domains/financial/caisse-imprevue/hooks/useSubscriptionsCICache'
import { useMembers } from '@/hooks/useMembers'
import { useCaisseImprevueContractsRealtimeSync } from '@/hooks/caisse-imprevue/useCaisseImprevueContractsRealtimeSync'
import { cn } from '@/lib/utils'
import { CONTRACT_CI_STATUS_LABELS, ContractCI, ContractCIStatus } from '@/types/types'
import {
    AlertCircle,
    Ban,
    Calendar,
    CalendarDays,
    CheckCircle,
    ChevronDown,
    Download,
    DollarSign,
    Eye,
    FileEdit,
    FileText,
    Grid3X3,
    List,
    MoreVertical,
    Plus,
    RefreshCw,
    Trash2,
    User
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import React, { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import DeleteContractCIModal from './DeleteContractCIModal'
import ReplaceContractCIModal from './ReplaceContractCIModal'
import StatisticsCI from './StatisticsCI'
import UploadContractCIModal from './UploadContractCIModal'
import ValidateMemberSignedModal from './ValidateMemberSignedModal'
import ViewContractCIModal from './ViewContractCIModal'
import ViewRefundDocumentCIModal from './ViewRefundDocumentCIModal'
import ViewUploadedContractCIModal from './ViewUploadedContractCIModal'

const STATUS_COLORS: Record<ContractCIStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-700 border-green-200',
  FINISHED: 'bg-blue-100 text-blue-700 border-blue-200',
  CANCELED: 'bg-red-100 text-red-700 border-red-200'
}

const STATUS_META_GRID: Record<ContractCIStatus, { label: string; dot: string; text: string }> = {
  ACTIVE:   { label: 'Actif',    dot: 'bg-emerald-500', text: 'text-emerald-700' },
  FINISHED: { label: 'Terminé',  dot: 'bg-blue-400',    text: 'text-blue-700'   },
  CANCELED: { label: 'Résilié',  dot: 'bg-gray-400',    text: 'text-gray-500'   },
}

const FREQUENCY_LABELS = {
  DAILY: 'Quotidien',
  MONTHLY: 'Mensuel'
}

type ViewMode = 'grid' | 'list'
type ContractTabValue = 'all' | 'DAILY' | 'MONTHLY' | 'overdue' | 'currentMonth' | 'rescinded'

type ContractTabItem = {
  value: ContractTabValue
  label: string
  icon: React.ComponentType<{ className?: string }>
  isDanger?: boolean
}

const CONTRACT_TAB_VALUES: ContractTabValue[] = ['all', 'DAILY', 'MONTHLY', 'currentMonth', 'overdue', 'rescinded']
const isContractTabValue = (value: string): value is ContractTabValue =>
  CONTRACT_TAB_VALUES.includes(value as ContractTabValue)

/** Afficher « Modifier contrat » : contractStartId existant et statut ACTIVE (doc § 2.1–2.2). */
function canReplaceContractCI(contract: ContractCI): boolean {
  return Boolean(contract.contractStartId) && contract.status === 'ACTIVE'
}

/** Formate une date contrat (string YYYY-MM-DD, Timestamp, Date) en fr-FR ou "—" si invalide */
function formatContractDate(value: string | Date | { toDate?: () => Date } | undefined): string {
  if (!value) return '—'
  const date = typeof value === 'string' ? new Date(value) : value instanceof Date ? value : (value as { toDate?: () => Date })?.toDate?.() ?? null
  if (!date || isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('fr-FR')
}

function getCurrentMonthRange(): { start: Date; end: Date } {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

function hasActiveContractFilters(filters: ContractCIFilters): boolean {
  return Boolean(
    (filters.search && filters.search.trim() !== '') ||
      (filters.status && filters.status !== 'all') ||
      (filters.paymentFrequency && filters.paymentFrequency !== 'all') ||
      filters.subscriptionCIID ||
      filters.createdAtFrom ||
      filters.createdAtTo ||
      filters.nextDueAtFrom ||
      filters.nextDueAtTo ||
      filters.overdueOnly ||
      typeof filters.monthlyAmountMin === 'number' ||
      typeof filters.monthlyAmountMax === 'number' ||
      typeof filters.contractAmountMin === 'number' ||
      typeof filters.contractAmountMax === 'number' ||
      typeof filters.paidAmountMin === 'number' ||
      typeof filters.paidAmountMax === 'number' ||
      typeof filters.durationMonthsMin === 'number' ||
      typeof filters.durationMonthsMax === 'number' ||
      typeof filters.supportRemainingAmountMin === 'number' ||
      typeof filters.supportRemainingAmountMax === 'number' ||
      typeof filters.supportRepaidAmountMin === 'number' ||
      typeof filters.supportRepaidAmountMax === 'number' ||
      typeof filters.supportCountMin === 'number' ||
      typeof filters.supportCountMax === 'number' ||
      typeof filters.paymentCountMin === 'number' ||
      typeof filters.paymentCountMax === 'number'
  )
}

// Composant skeleton moderne
const ModernSkeleton = () => (
  <Card className="group animate-pulse bg-gradient-to-br from-white to-gray-50/50 border-0 shadow-md">
    <CardContent className="p-6">
      <div className="flex items-center space-x-4">
        <Skeleton className="h-12 w-12 rounded-full bg-gradient-to-br from-gray-200 to-gray-300" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-3/4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full" />
          <Skeleton className="h-3 w-1/2 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full" />
          <Skeleton className="h-3 w-2/3 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-3 w-full bg-gradient-to-r from-gray-200 to-gray-300 rounded-full" />
        <Skeleton className="h-3 w-3/4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full" />
      </div>
    </CardContent>
  </Card>
)

type ContractCIGridCardProps = {
  contract: ContractCI
  member?: any
  memberPhotoUrl?: string
  index: number
  isOverdue: boolean
  onView: () => void
  onOverview: () => void
  onViewUploaded: () => void
  onDownload: () => void
  onUpload: () => void
  onValidate: () => void
  onReplace: () => void
  onViewRefund: (type: 'FINAL' | 'EARLY') => void
  onDelete: () => void
  getContractEndDate: (contract: ContractCI) => string
}

function ContractCIGridCard({
  contract,
  member,
  memberPhotoUrl,
  isOverdue,
  onView,
  onOverview,
  onViewUploaded,
  onDownload,
  onUpload,
  onValidate,
  onReplace,
  onViewRefund,
  onDelete,
  getContractEndDate,
}: ContractCIGridCardProps) {
  const { data: paymentStats } = useContractPaymentStats(contract.id)

  const firstName = contract.memberFirstName || member?.firstName || ''
  const lastName = contract.memberLastName || member?.lastName || ''
  const displayName = `${firstName} ${lastName}`.trim() || 'Membre'
  const initials = `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase() || 'CI'
  const contacts = contract.memberContacts?.length
    ? contract.memberContacts
    : member?.contacts?.length
      ? member.contacts
      : []
  const primaryContact = contacts[0] || '—'

  const isSigned = Boolean(contract.contractStartId)
  const isPendingValidation = contract.memberSignedStatus === 'PENDING_ADMIN'
  const isRejected = contract.memberSignedStatus === 'REJECTED'
  const statusMeta = STATUS_META_GRID[contract.status] ?? STATUS_META_GRID.ACTIVE

  const paid = paymentStats?.paidMonthsCount ?? 0
  const paidAmount = paymentStats?.totalAmountPaid ?? 0
  const total = contract.subscriptionCIDuration || 0
  const progress = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0

  return (
    <Card
      className={cn(
        'group flex flex-col rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-200 hover:border-gray-200 hover:shadow-md',
        isOverdue && 'border-red-200'
      )}
    >
      <CardContent className="flex flex-1 flex-col gap-3 p-4 pt-5">
        {/* Header: avatar + nom + statut */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="size-9 shrink-0 rounded-xl">
              {memberPhotoUrl || contract.memberPhotoUrl ? (
                <AvatarImage
                  src={memberPhotoUrl || contract.memberPhotoUrl}
                  alt={displayName}
                  className="h-full w-full object-cover object-center"
                />
              ) : (
                <AvatarFallback className="rounded-xl bg-[#234D65] text-xs font-semibold text-white">
                  {initials}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900">{displayName}</p>
              <p className="truncate text-xs text-gray-400">{primaryContact}</p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className={cn('flex items-center gap-1.5 text-xs font-semibold', statusMeta.text)}>
              <span className={cn('h-2 w-2 rounded-full shrink-0', statusMeta.dot)} />
              {statusMeta.label}
            </span>
            <span className="text-[10px] font-medium text-gray-400">
              {FREQUENCY_LABELS[contract.paymentFrequency] || contract.paymentFrequency}
            </span>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 rounded-xl bg-gray-50 p-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Mensualité</p>
            <p className="font-bold text-[#234D65] tabular-nums text-sm">
              {(contract.subscriptionCIAmountPerMonth || 0).toLocaleString('fr-FR')} <span className="text-[10px] font-normal text-gray-400">FCFA</span>
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Mois payés</p>
            <p className="font-bold text-gray-900 tabular-nums text-sm">
              {paid} <span className="text-[10px] font-normal text-gray-400">/ {total}</span>
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Date fin</p>
            <p className="font-bold text-gray-900 tabular-nums text-sm">{getContractEndDate(contract)}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Total versé</p>
            <p className="font-bold text-gray-900 tabular-nums text-sm">
              {paidAmount.toLocaleString('fr-FR')} <span className="text-[10px] font-normal text-gray-400">FCFA</span>
            </p>
          </div>
        </div>

        {/* Progression */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-gray-400">
            <span>Progression</span>
            <span className="font-semibold text-[#234D65] tabular-nums">{progress}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#234D65] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Signature status */}
        <div>
          {isSigned ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
              <CheckCircle className="h-3 w-3" /> Contrat signé
            </span>
          ) : isPendingValidation ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
              <CheckCircle className="h-3 w-3" /> En attente de validation
            </span>
          ) : isRejected ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-600">
              <AlertCircle className="h-3 w-3" /> Document refusé
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-orange-600">
              <AlertCircle className="h-3 w-3" /> Document à téléverser
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="mt-auto space-y-2 border-t border-gray-100 pt-3">
          <Button
            size="sm"
            onClick={onView}
            className="w-full h-9 bg-[#234D65] hover:bg-[#2c5a73] text-white text-xs font-semibold"
          >
            <Eye className="mr-1.5 h-3.5 w-3.5" />
            Ouvrir
          </Button>
          <div className="flex flex-wrap gap-1.5">

          {isSigned ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onViewUploaded}
              className="h-8 cursor-pointer rounded-lg border-[#234D65]/30 px-3 text-xs text-[#234D65] hover:bg-[#234D65] hover:text-white"
            >
              <FileText className="mr-1.5 h-3.5 w-3.5" />
              Voir
            </Button>
          ) : isPendingValidation ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onValidate}
              className="h-8 cursor-pointer rounded-lg border-blue-300 px-3 text-xs text-blue-700 hover:bg-blue-600 hover:text-white"
            >
              <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
              Valider
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={onUpload}
              className="h-8 cursor-pointer rounded-lg border-orange-300 px-3 text-xs text-orange-600 hover:bg-orange-500 hover:text-white"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Téléverser
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={onDownload}
            className="h-8 cursor-pointer rounded-lg border-[#234D65]/30 px-3 text-xs text-[#234D65] hover:bg-[#234D65] hover:text-white"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Télécharger
          </Button>

          {canReplaceContractCI(contract) && (
            <Button
              variant="outline"
              size="sm"
              onClick={onReplace}
              className="h-8 cursor-pointer rounded-lg border-[#234D65]/30 px-3 text-xs text-[#234D65] hover:bg-[#234D65] hover:text-white"
            >
              <FileEdit className="mr-1.5 h-3.5 w-3.5" />
              Modifier contrat
            </Button>
          )}

          {contract.status === 'FINISHED' && contract.finalRefundDocumentId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewRefund('FINAL')}
              className="h-8 cursor-pointer rounded-lg border-[#234D65]/30 px-3 text-xs text-[#234D65] hover:bg-[#234D65] hover:text-white"
            >
              <Eye className="mr-1.5 h-3.5 w-3.5" />
              Remboursement
            </Button>
          )}

          {contract.status === 'CANCELED' && contract.earlyRefundDocumentId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewRefund('EARLY')}
              className="h-8 cursor-pointer rounded-lg border-[#234D65]/30 px-3 text-xs text-[#234D65] hover:bg-[#234D65] hover:text-white"
            >
              <Eye className="mr-1.5 h-3.5 w-3.5" />
              Résiliation
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            className="h-8 cursor-pointer rounded-lg border-red-200 px-3 text-xs text-red-600 hover:bg-red-600 hover:text-white"
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Supprimer
          </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function ListContractsCISection() {
  const router = useRouter()
  useCaisseImprevueContractsRealtimeSync(true)

  const tabItems: ContractTabItem[] = [
    { value: 'all', label: 'Tous', icon: FileText },
    { value: 'DAILY', label: 'Journalier', icon: CalendarDays },
    { value: 'MONTHLY', label: 'Mensuel', icon: Calendar },
    { value: 'currentMonth', label: 'Mois en cours', icon: Calendar },
    { value: 'overdue', label: 'Retard', icon: AlertCircle, isDanger: true },
    { value: 'rescinded', label: 'Résiliés', icon: Ban },
  ]
  
  // État pour l'onglet actif (Tous, Journalier, Mensuel, Retard, Mois en cours)
  const [activeTab, setActiveTab] = useState<ContractTabValue>('all')
  
  // États
  const [filters, setFilters] = useState<ContractCIFilters>({
    search: '',
    status: 'all' as ContractCIStatus | 'all',
    paymentFrequency: 'all',
    subscriptionCIID: undefined,
    createdAtFrom: undefined,
    createdAtTo: undefined,
    nextDueAtFrom: undefined,
    nextDueAtTo: undefined,
    overdueOnly: false,
    monthlyAmountMin: undefined,
    monthlyAmountMax: undefined,
    contractAmountMin: undefined,
    contractAmountMax: undefined,
    paidAmountMin: undefined,
    paidAmountMax: undefined,
    durationMonthsMin: undefined,
    durationMonthsMax: undefined,
    supportRemainingAmountMin: undefined,
    supportRemainingAmountMax: undefined,
    supportRepaidAmountMin: undefined,
    supportRepaidAmountMax: undefined,
    supportCountMin: undefined,
    supportCountMax: undefined,
    paymentCountMin: undefined,
    paymentCountMax: undefined,
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [isExporting, setIsExporting] = useState(false)
  const itemsPerPage = 14

  // États pour les modals
  const [selectedContractForPDF, setSelectedContractForPDF] = useState<ContractCI | null>(null)
  const [isPDFModalOpen, setIsPDFModalOpen] = useState(false)
  const [selectedContractForUpload, setSelectedContractForUpload] = useState<ContractCI | null>(null)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [selectedContractForView, setSelectedContractForView] = useState<ContractCI | null>(null)
  const [selectedViewDocumentId, setSelectedViewDocumentId] = useState<string | undefined>(undefined)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [selectedContractForRefund, setSelectedContractForRefund] = useState<ContractCI | null>(null)
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false)
  const [refundType, setRefundType] = useState<'FINAL' | 'EARLY' | null>(null)
  const [showDeleteContractCIModal, setShowDeleteContractCIModal] = useState(false)
  const [selectedContractForDelete, setSelectedContractForDelete] = useState<ContractCI | null>(null)
  const [showReplaceContractCIModal, setShowReplaceContractCIModal] = useState(false)
  const [selectedContractForReplace, setSelectedContractForReplace] = useState<ContractCI | null>(null)
  const [showValidateMemberSignedModal, setShowValidateMemberSignedModal] = useState(false)
  const [selectedContractForValidation, setSelectedContractForValidation] = useState<ContractCI | null>(null)
  const [selectedContractForOverview, setSelectedContractForOverview] = useState<{ contract: ContractCI; member?: any } | null>(null)
  const { data: subscriptions } = useSubscriptionsCICache()

  // Construire les filtres effectifs (aligné sur caisse-spéciale)
  const effectiveFilters = useMemo<ContractCIFilters>(() => {
    const nextFilters: ContractCIFilters = {
      ...filters,
      paymentFrequency:
        activeTab === 'DAILY' || activeTab === 'MONTHLY'
          ? activeTab
          : (filters.paymentFrequency || 'all'),
      overdueOnly: activeTab === 'overdue' ? true : Boolean(filters.overdueOnly),
    }

    if (activeTab === 'currentMonth') {
      const { start, end } = getCurrentMonthRange()
      nextFilters.nextDueAtFrom = start
      nextFilters.nextDueAtTo = end
      nextFilters.createdAtFrom = undefined
      nextFilters.createdAtTo = undefined
    }

    const hasCreatedRange = Boolean(nextFilters.createdAtFrom || nextFilters.createdAtTo)
    const hasNextDueRange = Boolean(nextFilters.nextDueAtFrom || nextFilters.nextDueAtTo)
    if (hasCreatedRange && hasNextDueRange) {
      nextFilters.nextDueAtFrom = undefined
      nextFilters.nextDueAtTo = undefined
    }

    return nextFilters
  }, [filters, activeTab])

  // Hook pour récupérer les contrats
  const { data: contracts, isLoading, error, refetch } = useContractsCI(effectiveFilters)
  
  // Onglet « Résiliés » = contrats terminés/résiliés (CANCELED + FINISHED).
  // Les autres onglets (Tous inclus) ne montrent que les contrats en cours.
  const filteredContracts = useMemo(() => {
    const base = contracts || []
    const isTerminated = (status: string) => status === 'CANCELED' || status === 'FINISHED'
    return activeTab === 'rescinded'
      ? base.filter((c) => isTerminated(c.status))
      : base.filter((c) => !isTerminated(c.status))
  }, [contracts, activeTab])

  const subscriptionOptions = useMemo(
    () =>
      (subscriptions || []).map((subscription) => ({
        id: subscription.id,
        code: subscription.code,
        label: subscription.label,
      })),
    [subscriptions]
  )

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filters, activeTab])

  // Gestionnaires d'événements
  const handleFiltersChange = (newFilters: ContractCIFilters) => {
    setFilters(newFilters)
    setCurrentPage(1)
  }

  const handleResetFilters = () => {
    setFilters({ 
      search: '', 
      status: 'all',
      paymentFrequency: 'all',
      subscriptionCIID: undefined,
      createdAtFrom: undefined,
      createdAtTo: undefined,
      nextDueAtFrom: undefined,
      nextDueAtTo: undefined,
      overdueOnly: false,
      monthlyAmountMin: undefined,
      monthlyAmountMax: undefined,
      contractAmountMin: undefined,
      contractAmountMax: undefined,
      paidAmountMin: undefined,
      paidAmountMax: undefined,
      durationMonthsMin: undefined,
      durationMonthsMax: undefined,
      supportRemainingAmountMin: undefined,
      supportRemainingAmountMax: undefined,
      supportRepaidAmountMin: undefined,
      supportRepaidAmountMax: undefined,
      supportCountMin: undefined,
      supportCountMax: undefined,
      paymentCountMin: undefined,
      paymentCountMax: undefined,
    })
    setCurrentPage(1)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleRefresh = async () => {
    await refetch()
  }

  const handleViewContract = (contractId: string) => {
    router.push(routes.admin.caisseImprevueContractDetails(contractId))
  }

  const handleCreateContract = () => {
    router.push(routes.admin.caisseImprevueCreateContract)
  }

  const handleDownloadContract = (contract: ContractCI) => {
    const bestDocumentId = contract.contractStartId || contract.memberSignedDocumentId || undefined
    if (bestDocumentId) {
      setSelectedContractForView(contract)
      setSelectedViewDocumentId(bestDocumentId)
      setIsViewModalOpen(true)
    } else {
      setSelectedContractForPDF(contract)
      setIsPDFModalOpen(true)
    }
  }

  const handleUploadContract = (contract: ContractCI) => {
    setSelectedContractForUpload(contract)
    setIsUploadModalOpen(true)
  }

  const handleViewUploadedContract = (contract: ContractCI) => {
    setSelectedContractForView(contract)
    setIsViewModalOpen(true)
  }

  const handleClosePDFModal = () => {
    setIsPDFModalOpen(false)
    setSelectedContractForPDF(null)
  }

  const handleCloseUploadModal = () => {
    setIsUploadModalOpen(false)
    setSelectedContractForUpload(null)
  }

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false)
    setSelectedContractForView(null)
    setSelectedViewDocumentId(undefined)
  }

  const handleViewRefundDocument = (contract: ContractCI, type: 'FINAL' | 'EARLY') => {
    setSelectedContractForRefund(contract)
    setRefundType(type)
    setIsRefundModalOpen(true)
  }

  const handleCloseRefundModal = () => {
    setIsRefundModalOpen(false)
    setSelectedContractForRefund(null)
    setRefundType(null)
  }

  const handleUploadSuccess = () => {
    refetch()
  }

  // Fonctions d'export
  const formatAmountWithSpaces = (value: number | string | undefined | null): string => {
    const numeric = typeof value === 'number' ? value : Number(value ?? 0)
    if (!Number.isFinite(numeric)) return '0'

    const rounded = Math.round(numeric)
    const sign = rounded < 0 ? '-' : ''
    const digits = String(Math.abs(rounded))

    return `${sign}${digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}`
  }

  const getExportTypeLabel = (): string => {
    if (activeTab === 'DAILY') return 'Journalier'
    if (activeTab === 'MONTHLY') return 'Mensuel'
    if (activeTab === 'overdue') return 'Retard'
    if (activeTab === 'currentMonth') return 'Mois en cours'
    return 'Tous'
  }

  const buildExportRows = () => {
    const contractsToExport = filteredContracts || contracts || []
    if (!contractsToExport || contractsToExport.length === 0) return []
    
    return contractsToExport.map((contract) => {
      const frequencyLabel = contract.paymentFrequency === 'DAILY' ? 'Journalier' : 'Mensuel'
      const statusLabel = CONTRACT_CI_STATUS_LABELS[contract.status]
      
      const startDate = contract.firstPaymentDate ? new Date(contract.firstPaymentDate) : null
      const endDate = startDate && !isNaN(startDate.getTime()) ? new Date(startDate) : null
      if (endDate) {
        endDate.setMonth(endDate.getMonth() + (contract.subscriptionCIDuration || 0))
      }
      
      return [
        contract.id,
        frequencyLabel,
        `${contract.memberFirstName} ${contract.memberLastName}`,
        statusLabel,
        formatAmountWithSpaces(contract.subscriptionCIAmountPerMonth),
        formatAmountWithSpaces(contract.subscriptionCINominal),
        contract.subscriptionCIDuration,
        formatContractDate(contract.firstPaymentDate).replace('—', ''),
        endDate ? endDate.toLocaleDateString('fr-FR') : '',
        contract.totalMonthsPaid,
        contract.subscriptionCIDuration - contract.totalMonthsPaid,
      ]
    })
  }

  const exportToExcel = async () => {
    if (!contracts || contracts.length === 0) {
      toast.error('Aucun contrat à exporter')
      return
    }

    setIsExporting(true)
    try {
      const XLSX = await import('xlsx')
      const rows = buildExportRows()
      
      const headers = [
        'ID',
        'Type',
        'Membre',
        'Statut',
        'Montant mensuel (FCFA)',
        'Nominal (FCFA)',
        'Durée (mois)',
        'Date début',
        'Date de fin',
        'Mois payés',
        'Versements en attente',
      ]

      const sheetData = [
        ['LISTE DES CONTRATS CAISSE IMPRÉVUE'],
        [`Type: ${activeTab === 'all' ? 'Tous' : activeTab === 'DAILY' ? 'Journalier' : 'Mensuel'}`],
        [`Généré le ${new Date().toLocaleDateString('fr-FR')}`],
        [],
        headers,
        ...rows,
      ]

      const worksheet = XLSX.utils.aoa_to_sheet(sheetData)
      
      // Fusionner les cellules pour les en-têtes
      worksheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: headers.length - 1 } },
      ]

      // Définir la largeur des colonnes
      worksheet['!cols'] = headers.map(() => ({ wch: 20 }))

      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Contrats')
      
      const filename = `contrats_ci_${activeTab === 'all' ? 'tous' : activeTab.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.xlsx`
      XLSX.writeFile(workbook, filename)
      toast.success('Exporter Excel généré')
    } catch (error) {
      console.error('Erreur lors de l\'export Excel:', error)
      toast.error('Erreur lors de l\'export Excel')
    } finally {
      setIsExporting(false)
    }
  }

  const exportToPDF = async () => {
    if (!contracts || contracts.length === 0) {
      toast.error('Aucun contrat à exporter')
      return
    }

    setIsExporting(true)
    try {
      const { jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

      const typeLabel = getExportTypeLabel()
      const rows = buildExportRows()
      const headers = [
        'ID Contrat',
        'Type',
        'Membre',
        'Statut',
        'Mensualité FCFA',
        'Nominal FCFA',
        'Durée',
        'Date début',
        'Date fin',
        'Mois payés',
        'Restants',
      ]

      // En-tête document
      doc.setFont('times', 'bold')
      doc.setTextColor(20, 33, 50)
      doc.setFontSize(16)
      doc.text('Liste des Contrats - Caisse Imprévue', 14, 14)

      doc.setFont('times', 'normal')
      doc.setTextColor(70, 70, 70)
      doc.setFontSize(10)
      doc.text(`Type: ${typeLabel}`, 14, 20)
      doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 14, 24)
      doc.text(`Total: ${rows.length} contrat(s)`, 14, 28)
      doc.setDrawColor(35, 77, 101)
      doc.setLineWidth(0.3)
      doc.line(14, 31, 283, 31)

      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 35,
        theme: 'grid',
        styles: {
          font: 'times',
          fontSize: 8,
          cellPadding: 2,
          lineColor: [226, 232, 240],
          lineWidth: 0.15,
          textColor: [30, 41, 59],
          valign: 'middle',
          overflow: 'linebreak',
        },
        headStyles: {
          font: 'times',
          fillColor: [35, 77, 101],
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center',
          lineColor: [35, 77, 101],
          lineWidth: 0.2,
        },
        bodyStyles: {
          font: 'times',
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { top: 35, right: 14, bottom: 14, left: 14 },
        columnStyles: {
          0: { cellWidth: 36 },
          1: { cellWidth: 17, halign: 'center' },
          2: { cellWidth: 38 },
          3: { cellWidth: 25 },
          4: { cellWidth: 24, halign: 'right' },
          5: { cellWidth: 24, halign: 'right' },
          6: { cellWidth: 16, halign: 'center' },
          7: { cellWidth: 20, halign: 'center' },
          8: { cellWidth: 20, halign: 'center' },
          9: { cellWidth: 17, halign: 'center' },
          10: { cellWidth: 16, halign: 'center' },
        },
      })

      // Pagination en pied de page (Page X/Y)
      const totalPages = doc.getNumberOfPages()
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()

      for (let page = 1; page <= totalPages; page++) {
        doc.setPage(page)
        doc.setFont('times', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(75, 85, 99)
        doc.text(`Page ${page}/${totalPages}`, pageWidth / 2, pageHeight - 6, { align: 'center' })
      }

      const filename = `contrats_ci_${activeTab === 'all' ? 'tous' : activeTab.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.pdf`
      doc.save(filename)
      toast.success('Exporter PDF généré')
    } catch (error) {
      console.error('Erreur lors de l\'export PDF:', error)
      toast.error('Erreur lors de l\'export PDF')
    } finally {
      setIsExporting(false)
    }
  }

  // Pagination
  const totalPages = Math.ceil((filteredContracts?.length || 0) / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentContracts = useMemo(
    () => filteredContracts.slice(startIndex, endIndex),
    [filteredContracts, startIndex, endIndex]
  )
  const currentMemberIds = useMemo(
    () => Array.from(new Set(currentContracts.map((c) => c.memberId).filter(Boolean))),
    [currentContracts]
  )
  const { data: currentMembers } = useMembers(currentMemberIds)
  const memberPhotoById = useMemo(() => {
    const map: Record<string, string> = {}
    ;(currentMembers || []).forEach((member) => {
      if (member?.id && member.photoURL) {
        map[member.id] = member.photoURL
      }
    })
    return map
  }, [currentMembers])
  const memberById = useMemo(() => {
    const map: Record<string, any> = {}
    ;(currentMembers || []).forEach((member) => {
      if (member?.id) {
        map[member.id] = member
      }
    })
    return map
  }, [currentMembers])

  const getStatusColor = (status: ContractCIStatus) =>
    STATUS_COLORS[status] || 'bg-slate-100 text-slate-700 border-slate-200'

  const hasValidContractPdf = (contract: ContractCI) => Boolean(contract.contractStartId)

  const getContractEndDate = (contract: ContractCI) => {
    if (!contract.firstPaymentDate) return '—'
    const start = new Date(contract.firstPaymentDate)
    if (Number.isNaN(start.getTime())) return '—'
    const end = new Date(start)
    end.setMonth(end.getMonth() + (contract.subscriptionCIDuration || 0))
    return end.toLocaleDateString('fr-FR')
  }

  const hasAnyActiveFilter = hasActiveContractFilters(filters) || activeTab !== 'all'

  const renderPagination = () => {
    if (totalPages <= 1) return null

    return (
      <Card className="border border-[#234D65]/20 bg-gradient-to-r from-white to-slate-50/60 shadow-sm">
        <CardContent className="p-4">
          <ListPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPrev={() => handlePageChange(currentPage - 1)}
            onNext={() => handlePageChange(currentPage + 1)}
            summary={
              <>
                Affichage {startIndex + 1}-{Math.min(endIndex, filteredContracts?.length || 0)} sur{' '}
                {filteredContracts?.length || 0} contrats
              </>
            }
          />
        </CardContent>
      </Card>
    )
  }

  // Gestion des erreurs
  if (error) {
    return (
      <div className="space-y-8 animate-in fade-in-0 duration-500">
        <Alert className="border-0 bg-gradient-to-r from-red-50 to-rose-50 shadow-lg">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <AlertDescription className="text-red-700 font-medium">
            Une erreur est survenue lors du chargement des contrats : {error instanceof Error ? error.message : 'Erreur inconnue'}
            <Button
              variant="link"
              className="p-0 h-auto ml-2 text-red-700 underline font-bold hover:text-red-800"
              onClick={handleRefresh}
            >
              Réessayer maintenant
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in-0 duration-500">
      {/* Carrousel de statistiques (chargé une fois, mêmes stats pour tous les onglets) */}
      <StatisticsCI />

      {/* Filtres : filtre "Type de contrat" visible uniquement dans l'onglet Tous (et Retard / Mois en cours) */}
      <ContractsFiltersV2
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onReset={handleResetFilters}
        subscriptions={subscriptionOptions}
        showPaymentFrequencyFilter={activeTab === 'all' || activeTab === 'overdue' || activeTab === 'currentMonth'}
        isOverdueTab={activeTab === 'overdue'}
      />

      {/* Barre d'actions - design aligné avec caisse spéciale */}
      <Card className="relative overflow-hidden border border-slate-200/80 bg-white shadow-md">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#234D65] via-[#2c5a73] to-[#cbb171]" />
        <CardContent className="p-4 md:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-gradient-to-br from-[#234D65] to-[#2c5a73] p-2.5 shadow-sm">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] bg-clip-text text-xl font-black text-transparent md:text-2xl">
                  Liste des Contrats
                </h2>
                <p className="font-medium text-gray-600">
                  {(filteredContracts?.length || 0).toLocaleString()} contrat{(filteredContracts?.length || 0) !== 1 ? 's' : ''} • Page {currentPage}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex w-full items-center rounded-xl border border-slate-200 bg-slate-100/80 p-1 sm:w-auto">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className={`h-10 flex-1 cursor-pointer rounded-lg px-4 transition-all duration-200 sm:flex-none ${viewMode === 'grid'
                      ? 'bg-white text-[#234D65] shadow-sm hover:bg-white'
                      : 'text-slate-600 hover:bg-white hover:text-[#234D65]'
                    }`}
                >
                  <Grid3X3 className="mr-2 h-4 w-4" />
                  Cards
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className={`h-10 flex-1 cursor-pointer rounded-lg px-4 transition-all duration-200 sm:flex-none ${viewMode === 'list'
                      ? 'bg-white text-[#234D65] shadow-sm hover:bg-white'
                      : 'text-slate-600 hover:bg-white hover:text-[#234D65]'
                    }`}
                >
                  <List className="mr-2 h-4 w-4" />
                  Table
                </Button>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
                className="h-10 w-full cursor-pointer rounded-xl border-2 border-[#234D65]/40 bg-white px-4 text-[#234D65] transition-all duration-200 hover:bg-[#234D65] hover:text-white disabled:opacity-50 sm:w-auto"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isExporting || filteredContracts.length === 0}
                    className="h-10 w-full cursor-pointer rounded-xl border-2 border-emerald-300 bg-white px-4 text-emerald-700 transition-all duration-200 hover:border-emerald-400 hover:bg-emerald-50 disabled:opacity-50 sm:w-auto"
                  >
                    {isExporting ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-emerald-300 border-t-emerald-600" />
                        Export...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Exporter
                        <ChevronDown className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[180px]">
                  <DropdownMenuItem
                    onClick={() => {
                      if (!isExporting) exportToExcel()
                    }}
                    className="cursor-pointer"
                  >
                    <Download className="mr-2 h-4 w-4 text-emerald-700" />
                    Exporter Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      if (!isExporting) exportToPDF()
                    }}
                    className="cursor-pointer"
                  >
                    <Download className="mr-2 h-4 w-4 text-rose-700" />
                    Exporter PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                size="sm"
                onClick={handleCreateContract}
                className="h-10 w-full cursor-pointer rounded-xl border-0 bg-gradient-to-r from-[#234D65] to-[#2c5a73] px-4 text-white shadow-sm transition-all duration-200 hover:from-[#2c5a73] hover:to-[#234D65] hover:shadow-md sm:w-auto"
              >
                <Plus className="mr-2 h-4 w-4" />
                Nouveau Contrat
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {renderPagination()}

      {/* Onglets pour filtrer par type de contrat (rattachés à la liste) */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          if (isContractTabValue(value)) {
            setActiveTab(value)
          }
        }}
        className="w-full"
      >
        {/* Tabs desktop : style onglets classeur */}
        <div className="hidden lg:flex items-center gap-2 border-b border-gray-200">
          <div className="flex-1 min-w-0">
            <TabsList className="relative flex w-full flex-wrap bg-transparent p-0 h-auto gap-0.5">
              {tabItems.map(({ value, label, icon: Icon, isDanger }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className={cn(
                    'shrink-0 min-w-[110px] px-3 py-2.5 text-sm rounded-t-lg rounded-b-none border-x border-t border-gray-200 bg-gray-50/70 font-semibold text-gray-600 transition-all data-[state=active]:z-10 data-[state=active]:bg-white data-[state=active]:text-[#234D65] data-[state=active]:border-[#234D65] data-[state=active]:shadow-none hover:bg-gray-100 hover:text-[#234D65]',
                    isDanger ? 'data-[state=active]:text-red-700 data-[state=active]:border-red-300' : ''
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="whitespace-nowrap">{label}</span>
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </div>

        {/* Tabs mobile/tablette (badges scrollables) */}
        <div className="lg:hidden">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tabItems.map(({ value, label, icon: Icon, isDanger }) => {
              const isActive = activeTab === value
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    if (isContractTabValue(value)) {
                      setActiveTab(value)
                    }
                  }}
                  className="shrink-0"
                >
                  <Badge
                    className={cn(
                      'px-3 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-2',
                      isActive
                        ? isDanger
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-[#234D65] text-white border-transparent'
                        : isDanger
                        ? 'bg-white text-red-600 border-red-200'
                        : 'bg-white text-gray-700 border-gray-200'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </Badge>
                </button>
              )
            })}
          </div>
        </div>
      </Tabs>

      {/* Liste des contrats */}
      {isLoading ? (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-2'}>
          {[...Array(itemsPerPage)].map((_, i) => (
            <ModernSkeleton key={i} />
          ))}
        </div>
      ) : currentContracts.length > 0 ? (
        <>
          {viewMode === 'grid' && (
            <div className="rounded-b-2xl border-x border-b border-gray-200 bg-gray-50/30 p-4 md:p-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 items-stretch">
                {currentContracts.map((contract: ContractCI, index: number) => {
                  const member = memberById[contract.memberId]
                  return (
                    <ContractCIGridCard
                      key={contract.id}
                      contract={contract}
                      member={member}
                      memberPhotoUrl={memberPhotoById[contract.memberId]}
                      index={index}
                      isOverdue={activeTab === 'overdue'}
                      onView={() => handleViewContract(contract.id)}
                      onOverview={() => setSelectedContractForOverview({ contract, member })}
                      onViewUploaded={() => handleViewUploadedContract(contract)}
                      onDownload={() => handleDownloadContract(contract)}
                      onUpload={() => handleUploadContract(contract)}
                      onValidate={() => { setSelectedContractForValidation(contract); setShowValidateMemberSignedModal(true) }}
                      onReplace={() => { setSelectedContractForReplace(contract); setShowReplaceContractCIModal(true) }}
                      onViewRefund={(type) => handleViewRefundDocument(contract, type)}
                      onDelete={() => { setSelectedContractForDelete(contract); setShowDeleteContractCIModal(true) }}
                      getContractEndDate={getContractEndDate}
                    />
                  )
                })}
              </div>
            </div>
          )}

          {viewMode === 'list' && (
            <div className="overflow-x-auto rounded-t-none rounded-b-2xl border-x border-b border-[#234D65]/20 bg-gradient-to-b from-white to-slate-50/35 shadow-sm">
              <table className="min-w-[1400px] w-full text-sm">
                <thead className="bg-gradient-to-r from-[#234D65]/10 via-[#234D65]/[0.06] to-transparent text-[#234D65]">
                  <tr>
                    <th className="text-left px-4 py-3">Photo</th>
                    <th className="text-left px-4 py-3">Matricule contrat</th>
                    <th className="text-center px-4 py-3">Statut</th>
                    <th className="text-left px-4 py-3">Type</th>
                    <th className="text-left px-4 py-3">Nom</th>
                    <th className="text-left px-4 py-3">Prénom</th>
                    <th className="text-left px-4 py-3">Matricule membre</th>
                    <th className="text-left px-4 py-3">Contacts</th>
                    <th className="text-left px-4 py-3">Contact urgent</th>
                    <th className="text-right px-4 py-3">Mensualité</th>
                    <th className="text-right px-4 py-3">Durée</th>
                    <th className="text-right px-4 py-3">Début</th>
                    <th className="text-right px-4 py-3">Date de fin</th>
                    <th className="text-left px-4 py-3">PDF</th>
                    <th className="text-right px-4 py-3">Versé</th>
                    <th className="text-left px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentContracts.map((contract: ContractCI) => {
                    const member = memberById[contract.memberId]
                    const fullName = `${contract.memberFirstName || member?.firstName || ''} ${contract.memberLastName || member?.lastName || ''}`.trim()
                    const initials = `${(contract.memberFirstName || member?.firstName || '')[0] || ''}${(contract.memberLastName || member?.lastName || '')[0] || ''}`.toUpperCase() || 'CI'
                    const contacts = contract.memberContacts?.length
                      ? contract.memberContacts.join(' / ')
                      : member?.contacts?.length
                        ? member.contacts.join(' / ')
                        : '—'
                    const emergency = contract.emergencyContact
                    const hasPdf = hasValidContractPdf(contract)
                    const paidAmount = (contract.totalMonthsPaid || 0) * (contract.subscriptionCIAmountPerMonth || 0)

                    return (
                      <tr key={contract.id} className="transition-colors hover:bg-[#234D65]/[0.045]">
                        <td className="px-4 py-3">
                          <Avatar className="size-10 rounded-lg ring-1 ring-[#234D65]/15">
                            {(contract.memberPhotoUrl || memberPhotoById[contract.memberId]) ? (
                              <AvatarImage
                                src={contract.memberPhotoUrl || memberPhotoById[contract.memberId]}
                                alt={`Photo de ${fullName || 'Membre'}`}
                                className="h-full w-full object-cover object-center"
                              />
                            ) : (
                              <AvatarFallback className="rounded-lg bg-gradient-to-br from-[#234D65] to-[#2c5a73] text-white font-semibold">
                                {initials}
                              </AvatarFallback>
                            )}
                          </Avatar>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-900 break-all">{contract.id}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(contract.status)}`}>
                            {CONTRACT_CI_STATUS_LABELS[contract.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3">{FREQUENCY_LABELS[contract.paymentFrequency] || contract.paymentFrequency}</td>
                        <td className="px-4 py-3">{contract.memberLastName || member?.lastName || '—'}</td>
                        <td className="px-4 py-3">{contract.memberFirstName || member?.firstName || '—'}</td>
                        <td className="px-4 py-3 font-mono text-xs">{member?.matricule || contract.memberId || '—'}</td>
                        <td className="px-4 py-3">
                          {contacts}
                          {(contract.memberEmail || member?.email) ? ` • ${contract.memberEmail || member?.email}` : ''}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <div>{emergency?.lastName || '—'} {emergency?.firstName || ''}</div>
                          <div>{emergency?.phone1 || '—'}</div>
                        </td>
                        <td className="px-4 py-3 text-right">{(contract.subscriptionCIAmountPerMonth || 0).toLocaleString('fr-FR')} FCFA</td>
                        <td className="px-4 py-3 text-right">{contract.subscriptionCIDuration} mois</td>
                        <td className="px-4 py-3 text-right">{formatContractDate(contract.firstPaymentDate)}</td>
                        <td className="px-4 py-3 text-right">{getContractEndDate(contract)}</td>
                        <td className="px-4 py-3">
                          {hasPdf ? (
                            <span className="inline-flex items-center gap-1 text-green-600 text-xs">
                              <CheckCircle className="h-3 w-3" /> Disponible
                            </span>
                          ) : contract.memberSignedStatus === 'PENDING_ADMIN' ? (
                            <span className="inline-flex items-center gap-1 text-blue-600 text-xs">
                              <CheckCircle className="h-3 w-3" /> À valider
                            </span>
                          ) : contract.memberSignedStatus === 'REJECTED' ? (
                            <span className="inline-flex items-center gap-1 text-red-500 text-xs">
                              <AlertCircle className="h-3 w-3" /> Refusé
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-orange-500 text-xs">
                              <AlertCircle className="h-3 w-3" /> À téléverser
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">{paidAmount.toLocaleString('fr-FR')} FCFA</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-full cursor-pointer data-[state=open]:bg-gray-100"
                                  title="Actions"
                                >
                                  <MoreVertical className="h-4 w-4 text-gray-600" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="min-w-[210px]">
                                <DropdownMenuItem
                                  onClick={() => handleViewContract(contract.id)}
                                  disabled={!contract.contractStartId}
                                  className="cursor-pointer"
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  Ouvrir
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setSelectedContractForOverview({ contract, member })}
                                  className="cursor-pointer"
                                >
                                  <User className="h-4 w-4 mr-2" />
                                  Détails complets du contrat
                                </DropdownMenuItem>
                                {hasPdf ? (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => handleViewUploadedContract(contract)}
                                      className="cursor-pointer"
                                    >
                                      <FileText className="h-4 w-4 mr-2" />
                                      Voir contrat
                                    </DropdownMenuItem>
                                    {canReplaceContractCI(contract) && (
                                      <DropdownMenuItem
                                        onClick={() => { setSelectedContractForReplace(contract); setShowReplaceContractCIModal(true) }}
                                        className="cursor-pointer"
                                      >
                                        <FileEdit className="h-4 w-4 mr-2" />
                                        Modifier contrat
                                      </DropdownMenuItem>
                                    )}
                                  </>
                                ) : contract.memberSignedStatus === 'PENDING_ADMIN' ? (
                                  <DropdownMenuItem
                                    onClick={() => { setSelectedContractForValidation(contract); setShowValidateMemberSignedModal(true) }}
                                    className="cursor-pointer text-blue-700 focus:text-blue-700"
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Valider la signature
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={() => handleUploadContract(contract)}
                                    className="cursor-pointer"
                                  >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Téléverser le document PDF
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => handleDownloadContract(contract)}
                                  className="cursor-pointer"
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Télécharger contrat
                                </DropdownMenuItem>
                                {contract.status === 'FINISHED' && contract.finalRefundDocumentId && (
                                  <DropdownMenuItem
                                    onClick={() => handleViewRefundDocument(contract, 'FINAL')}
                                    className="cursor-pointer"
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    Contrat de remboursement
                                  </DropdownMenuItem>
                                )}
                                {contract.status === 'CANCELED' && contract.earlyRefundDocumentId && (
                                  <DropdownMenuItem
                                    onClick={() => handleViewRefundDocument(contract, 'EARLY')}
                                    className="cursor-pointer"
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    Contrat de résiliation
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => { setSelectedContractForDelete(contract); setShowDeleteContractCIModal(true) }}
                                  className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Supprimer
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {renderPagination()}
        </>
      ) : (
        <Card className="bg-gradient-to-br from-white via-gray-50/50 to-white border-0 shadow-2xl">
          <CardContent className="text-center p-16">
            <div className="space-y-6">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center shadow-inner">
                <FileText className="h-10 w-10 text-gray-400" />
              </div>
    <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Aucun contrat trouvé
                </h3>
                <p className="text-gray-600 text-lg max-w-md mx-auto leading-relaxed">
                  {hasAnyActiveFilter
                    ? 'Essayez de modifier vos critères de recherche ou de réinitialiser les filtres.'
                    : 'Il n\'y a pas encore de contrats enregistrés dans le système.'
                  }
                </p>
              </div>
              <div className="flex justify-center space-x-4">
                {hasAnyActiveFilter && (
                  <Button
                    variant="outline"
                    onClick={handleResetFilters}
                    className="h-12 px-6 border-2 border-gray-300 hover:border-gray-400 transition-all duration-300 hover:scale-105"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Réinitialiser les filtres
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal récapitulatif complet du contrat */}
      {selectedContractForOverview && (
        <Dialog open={!!selectedContractForOverview} onOpenChange={(open) => { if (!open) setSelectedContractForOverview(null) }}>
          <DialogContent className="!w-[95vw] !max-w-[1400px] p-0 overflow-hidden border-0 shadow-2xl">
            {(() => {
              const contract = selectedContractForOverview.contract
              const member = selectedContractForOverview.member
              const emergency = contract?.emergencyContact
              const emergencyMember = emergency?.memberId ? memberById[emergency.memberId] : undefined
              const hasPdf = hasValidContractPdf(contract)
              const contractStatus = CONTRACT_CI_STATUS_LABELS[contract?.status] || '—'
              const memberFirstName = contract?.memberFirstName || member?.firstName || ''
              const memberLastName = contract?.memberLastName || member?.lastName || ''
              const memberFullName = `${memberFirstName} ${memberLastName}`.trim() || 'Membre non renseigné'
              const memberInitials = `${memberFirstName[0] || ''}${memberLastName[0] || ''}`.toUpperCase() || 'CI'
              const contacts = contract?.memberContacts?.length
                ? contract.memberContacts.join(' • ')
                : member?.contacts?.length
                  ? member.contacts.join(' • ')
                  : '—'
              const memberEmail = contract?.memberEmail || member?.email || '—'
              const firstPaymentDate = formatContractDate(contract?.firstPaymentDate)
              const endDate = getContractEndDate(contract)
              const monthlyAmount = (contract?.subscriptionCIAmountPerMonth || 0).toLocaleString('fr-FR')
              const totalNominal = (contract?.subscriptionCINominal || 0).toLocaleString('fr-FR')
              const paidAmountValue = (contract?.totalMonthsPaid || 0) * (contract?.subscriptionCIAmountPerMonth || 0)
              const paidAmount = paidAmountValue.toLocaleString('fr-FR')
              const durationMonths = contract?.subscriptionCIDuration || 0
              const remainingMonths = Math.max(durationMonths - (contract?.totalMonthsPaid || 0), 0)

              return (
                <div className="bg-gradient-to-b from-white via-white to-slate-50/80 text-sm">
                  <DialogHeader className="border-b border-[#234D65]/15 bg-gradient-to-r from-[#234D65] via-[#285773] to-[#234D65] px-6 py-5 text-white">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <DialogTitle className="text-xl font-semibold tracking-tight text-white">Détails complets du contrat</DialogTitle>
                        <p className="mt-1 text-sm text-white/85">Vue détaillée harmonisée avec le thème Caisse Spéciale</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={cn('border bg-white/90 text-xs font-semibold', getStatusColor(contract?.status))}>
                          {contractStatus}
                        </Badge>
                        <Badge
                          className={cn(
                            'border text-xs font-semibold',
                            hasPdf
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-orange-200 bg-orange-50 text-orange-700'
                          )}
                        >
                          {hasPdf ? 'PDF disponible' : 'PDF manquant'}
                        </Badge>
                      </div>
                    </div>
                  </DialogHeader>

                  <div className="max-h-[78vh] overflow-y-auto px-5 py-5 sm:px-6">
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.35fr_1fr]">
                      <div className="space-y-4">
                        <div className="rounded-2xl border border-[#234D65]/15 bg-white p-4 shadow-sm">
                          <div className="flex items-start gap-4">
                            <Avatar className="size-14 rounded-xl ring-2 ring-[#234D65]/15">
                              {(contract?.memberPhotoUrl || memberPhotoById[contract?.memberId]) ? (
                                <AvatarImage
                                  src={contract?.memberPhotoUrl || memberPhotoById[contract?.memberId]}
                                  alt={`Photo de ${memberFullName}`}
                                  className="h-full w-full object-cover object-center"
                                />
                              ) : (
                                <AvatarFallback className="rounded-xl bg-gradient-to-br from-[#234D65] to-[#2c5a73] text-white text-base font-semibold">
                                  {memberInitials}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div className="min-w-0 flex-1 space-y-1">
                              <p className="truncate text-base font-semibold text-slate-900">{memberFullName}</p>
                              <p className="font-mono text-xs text-slate-500">{member?.matricule || contract?.memberId || 'Matricule non renseigné'}</p>
                              <div className="flex flex-wrap gap-2 pt-1">
                                <Badge className="border border-[#234D65]/25 bg-[#234D65]/10 text-[#234D65] hover:bg-[#234D65]/15">
                                  <User className="mr-1 h-3.5 w-3.5" />
                                  {FREQUENCY_LABELS[contract.paymentFrequency] || contract.paymentFrequency}
                                </Badge>
                                <Badge className="border border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200">
                                  ID: {contract?.id?.slice(-8) || '—'}
                                </Badge>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Contacts</p>
                              <p className="mt-1 text-sm font-medium text-slate-800">{contacts}</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Email</p>
                              <p className="mt-1 text-sm font-medium text-slate-800 break-all">{memberEmail}</p>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-[#234D65]/15 bg-white p-4 shadow-sm">
                          <div className="mb-3 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-[#234D65]" />
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#234D65]">Contact urgent</p>
                          </div>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                              <p className="text-[11px] uppercase tracking-wide text-slate-500">Nom</p>
                              <p className="mt-1 font-medium text-slate-900">{emergency?.lastName || '—'}</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                              <p className="text-[11px] uppercase tracking-wide text-slate-500">Prénom</p>
                              <p className="mt-1 font-medium text-slate-900">{emergency?.firstName || '—'}</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                              <p className="text-[11px] uppercase tracking-wide text-slate-500">Téléphone</p>
                              <p className="mt-1 font-medium text-slate-900">{emergency?.phone1 || '—'}</p>
                            </div>
                          </div>
                          {emergency?.memberId && (
                            emergencyMember ? (
                              <div className="mt-3 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                                <Avatar className="size-8 shrink-0 rounded-lg">
                                  {(emergencyMember.photoURL || memberPhotoById[emergencyMember.id]) ? (
                                    <AvatarImage src={emergencyMember.photoURL || memberPhotoById[emergencyMember.id]} className="object-cover" alt="" />
                                  ) : (
                                    <AvatarFallback className="rounded-lg bg-emerald-600 text-white text-xs font-semibold">
                                      {`${emergencyMember.firstName?.[0] || ''}${emergencyMember.lastName?.[0] || ''}`.toUpperCase() || 'M'}
                                    </AvatarFallback>
                                  )}
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                  <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">Membre KARA</p>
                                  <p className="text-sm font-semibold text-emerald-900">{emergencyMember.firstName} {emergencyMember.lastName}</p>
                                  <p className="font-mono text-[11px] text-emerald-700">{emergencyMember.matricule}</p>
                                </div>
                                <span className="shrink-0 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">Membre</span>
                              </div>
                            ) : (
                              <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
                                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                                <p className="text-xs text-red-700">Ce membre n'existe pas ou le matricule est incorrect.</p>
                              </div>
                            )
                          )}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="rounded-2xl border border-[#234D65]/15 bg-white p-4 shadow-sm">
                          <div className="mb-3 flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-[#234D65]" />
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#234D65]">Montants</p>
                          </div>
                          <div className="grid grid-cols-1 gap-3">
                            <div className="rounded-xl bg-gradient-to-r from-[#234D65]/10 to-[#234D65]/5 px-3 py-2.5">
                              <p className="text-[11px] uppercase tracking-wide text-[#234D65]/80">Mensualité</p>
                              <p className="text-lg font-semibold text-[#234D65]">{monthlyAmount} FCFA</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
                              <p className="text-[11px] uppercase tracking-wide text-slate-500">Nominal total</p>
                              <p className="text-base font-semibold text-slate-900">{totalNominal} FCFA</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
                              <p className="text-[11px] uppercase tracking-wide text-slate-500">Total versé</p>
                              <p className="text-base font-semibold text-slate-900">{paidAmount} FCFA</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
                              <p className="text-[11px] uppercase tracking-wide text-slate-500">Mois payés</p>
                              <p className="text-base font-semibold text-slate-900">{contract?.totalMonthsPaid || 0} / {durationMonths}</p>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-[#234D65]/15 bg-white p-4 shadow-sm">
                          <div className="mb-3 flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-[#234D65]" />
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#234D65]">Échéances</p>
                          </div>
                          <div className="space-y-3">
                            <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
                              <p className="text-[11px] uppercase tracking-wide text-slate-500">Début d'échéance</p>
                              <p className="text-base font-semibold text-slate-900">{firstPaymentDate}</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
                              <p className="text-[11px] uppercase tracking-wide text-slate-500">Date de fin</p>
                              <p className="text-base font-semibold text-slate-900">{endDate}</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
                              <p className="text-[11px] uppercase tracking-wide text-slate-500">Mois restants</p>
                              <p className="text-base font-semibold text-slate-900">{remainingMonths} mois</p>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-[#234D65]/15 bg-white p-4 shadow-sm">
                          <div className="mb-2 flex items-center gap-2">
                            <FileText className="h-4 w-4 text-[#234D65]" />
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#234D65]">Forfait & document</p>
                          </div>
                          <div className="space-y-3">
                            <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
                              <p className="text-[11px] uppercase tracking-wide text-slate-500">Forfait</p>
                              <p className="text-base font-semibold text-slate-900">{contract?.subscriptionCILabel || contract?.subscriptionCICode || '—'}</p>
                            </div>
                            <div
                              className={cn(
                                'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold',
                                hasPdf
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                  : 'border-orange-200 bg-orange-50 text-orange-700'
                              )}
                            >
                              {hasPdf ? <CheckCircle className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                              {hasPdf ? 'Contrat PDF disponible' : 'Contrat PDF à téléverser'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 flex justify-end">
                      <Button
                        variant="outline"
                        onClick={() => setSelectedContractForOverview(null)}
                        className="rounded-xl border-[#234D65]/30 px-5 text-[#234D65] cursor-pointer hover:bg-[#234D65]/10 hover:text-[#234D65]"
                      >
                        Fermer
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })()}
          </DialogContent>
        </Dialog>
      )}

      {/* Modals */}
      {selectedContractForPDF && (
        <ViewContractCIModal
          isOpen={isPDFModalOpen}
          onClose={handleClosePDFModal}
          contract={selectedContractForPDF}
        />
      )}

      {selectedContractForUpload && (
        <UploadContractCIModal
          isOpen={isUploadModalOpen}
          onClose={handleCloseUploadModal}
          contract={selectedContractForUpload}
          onSuccess={handleUploadSuccess}
        />
      )}

      {selectedContractForView && (
        <ViewUploadedContractCIModal
          isOpen={isViewModalOpen}
          onClose={handleCloseViewModal}
          contract={selectedContractForView}
          documentId={selectedViewDocumentId}
        />
      )}

      {selectedContractForRefund && refundType && (
        <ViewRefundDocumentCIModal
          isOpen={isRefundModalOpen}
          onClose={handleCloseRefundModal}
          contract={selectedContractForRefund}
          refundType={refundType}
        />
      )}

      <DeleteContractCIModal
        isOpen={showDeleteContractCIModal}
        onClose={() => {
          setShowDeleteContractCIModal(false)
          setSelectedContractForDelete(null)
        }}
        contract={selectedContractForDelete}
        onSuccess={() => {
          setShowDeleteContractCIModal(false)
          setSelectedContractForDelete(null)
        }}
      />

      <ReplaceContractCIModal
        isOpen={showReplaceContractCIModal}
        onClose={() => {
          setShowReplaceContractCIModal(false)
          setSelectedContractForReplace(null)
        }}
        contract={selectedContractForReplace}
        onSuccess={() => {
          setShowReplaceContractCIModal(false)
          setSelectedContractForReplace(null)
        }}
      />
      {selectedContractForValidation && (
        <ValidateMemberSignedModal
          open={showValidateMemberSignedModal}
          onOpenChange={(open) => {
            setShowValidateMemberSignedModal(open)
            if (!open) setSelectedContractForValidation(null)
          }}
          contract={selectedContractForValidation}
        />
      )}
    </div>
  )
}
