'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ListPagination } from '@/components/ui/list-pagination'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import routes from '@/constantes/routes'
import { useCreditContractsRealtimeSync } from '@/hooks/credit-speciale/useCreditContractsRealtimeSync'
import { useCreditContractMutations, useCreditContracts } from '@/hooks/useCreditSpeciale'
import { cn } from '@/lib/utils'
import type { CreditContractFilters } from '@/repositories/credit-speciale/ICreditContractRepository'
import { CreditContract, CreditContractStatus, CreditType } from '@/types/types'
import {
    AlertCircle,
    Calendar,
    ChevronDown,
    CheckCircle2,
    Download,
    Eye,
    FileText,
    Filter,
    Grid3X3,
    List,
    Loader2,
    MoreVertical,
    RefreshCw,
    Search,
    Shield,
    Trash2,
    Upload,
    User,
} from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'
import DocumentViewerModal from '@/components/documents/DocumentViewerModal'
import CreditSpecialeContractPDFModal from './CreditSpecialeContractPDFModal'
import DeleteCreditContractModal from './DeleteCreditContractModal'
import StatisticsCreditContrats from './StatisticsCreditContrats'

type ViewMode = 'grid' | 'list'
type CreditTypeFilter = CreditType | 'all'
type ContractTabValue = 'all' | 'active' | 'currentMonth' | 'closed' | 'discharged' | 'overdue'
type CreditContractFilterState = {
  search: string
  status: CreditContractStatus | 'all'
  creditType: CreditTypeFilter
  createdAtFrom?: Date
  createdAtTo?: Date
  nextDueAtFrom?: Date
  nextDueAtTo?: Date
  overdueOnly?: boolean
  amountMin?: number
  amountMax?: number
  totalAmountMin?: number
  totalAmountMax?: number
  monthlyAmountMin?: number
  monthlyAmountMax?: number
  paidAmountMin?: number
  paidAmountMax?: number
  remainingAmountMin?: number
  remainingAmountMax?: number
  durationMonthsMin?: number
  durationMonthsMax?: number
  interestRateMin?: number
  interestRateMax?: number
}

type ContractTabItem = {
  value: ContractTabValue
  label: string
  icon: React.ComponentType<{ className?: string }>
  isDanger?: boolean
}

const CONTRACT_TAB_VALUES: ContractTabValue[] = ['all', 'active', 'currentMonth', 'closed', 'discharged', 'overdue']
const isContractTabValue = (value: string | null): value is ContractTabValue =>
  value !== null && CONTRACT_TAB_VALUES.includes(value as ContractTabValue)

const CLOSED_CREDIT_STATUSES: CreditContractStatus[] = ['CLOSED', 'DISCHARGED']

function getCurrentMonthRange(): { start: Date; end: Date } {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

function normalizeToDate(value: unknown): Date | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value as string | number)
  return Number.isNaN(date.getTime()) ? null : date
}

function hasActiveContractFilters(filters: CreditContractFilterState, options?: { ignoreCreditType?: boolean }): boolean {
  return Boolean(
    filters.search.trim() ||
      filters.status !== 'all' ||
      (!options?.ignoreCreditType && filters.creditType !== 'all') ||
      filters.createdAtFrom ||
      filters.createdAtTo ||
      filters.nextDueAtFrom ||
      filters.nextDueAtTo ||
      filters.overdueOnly ||
      typeof filters.amountMin === 'number' ||
      typeof filters.amountMax === 'number' ||
      typeof filters.totalAmountMin === 'number' ||
      typeof filters.totalAmountMax === 'number' ||
      typeof filters.monthlyAmountMin === 'number' ||
      typeof filters.monthlyAmountMax === 'number' ||
      typeof filters.paidAmountMin === 'number' ||
      typeof filters.paidAmountMax === 'number' ||
      typeof filters.remainingAmountMin === 'number' ||
      typeof filters.remainingAmountMax === 'number' ||
      typeof filters.durationMonthsMin === 'number' ||
      typeof filters.durationMonthsMax === 'number' ||
      typeof filters.interestRateMin === 'number' ||
      typeof filters.interestRateMax === 'number'
  )
}

interface ListContratsProps {
  forcedCreditType?: CreditType
  contractDetailsBasePath?: string
}

/** Afficher « Modifier contrat signé » : contrat déjà signé et pas DISCHARGED/CLOSED (doc § 2.1–2.2) */
function canReplaceSignedContract(contract: CreditContract): boolean {
  return Boolean(contract.signedContractUrl) && !['DISCHARGED', 'CLOSED'].includes(contract.status)
}

/** L'accès au détail n'est autorisé qu'après téléversement du contrat signé */
function canOpenContractDetail(contract: CreditContract): boolean {
  return Boolean(contract.signedContractUrl)
}

/** Autoriser le téléversement du contrat signé pour l'activation initiale ou après augmentation */
function canUploadSignedContract(contract: CreditContract): boolean {
  const uploadableStatuses: CreditContractStatus[] = ['PENDING', 'ACTIVE', 'PARTIAL', 'OVERDUE', 'BLOCKED']
  return !contract.signedContractUrl && uploadableStatuses.includes(contract.status)
}

/** Contrat de remboursement disponible quand la quittance signée a été téléversée */
function canViewRepaymentContract(contract: CreditContract): boolean {
  return Boolean(contract.signedQuittanceUrl)
}

/** Nom de fichier normalisé pour un document lié à un contrat de crédit spécial. */
function creditDocFilename(contract: CreditContract, label: string) {
  const last = String(contract.clientLastName ?? '').toUpperCase().replace(/\s+/g, '_')
  const first = String(contract.clientFirstName ?? '').toUpperCase().replace(/\s+/g, '_')
  return `${last}_${first}_${label}.pdf`
}

/** Document en cours de consultation dans la modale d'aperçu. */
type ViewerDoc = { url?: string; filename: string; title: string; subtitle?: string }

// Composant skeleton moderne
const ModernSkeleton = ({ viewMode: _viewMode }: { viewMode: ViewMode }) => (
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

// Composant de filtres
const ContractFilters = ({
  filters,
  onFiltersChange,
  onReset,
  activeTab,
  showCreditTypeFilter,
}: {
  filters: CreditContractFilterState
  onFiltersChange: (filters: CreditContractFilterState) => void
  onReset: () => void
  activeTab: ContractTabValue
  showCreditTypeFilter: boolean
}) => {
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false)
  const defaultFilters: CreditContractFilterState = {
    search: '',
    status: 'all',
    creditType: 'all',
    createdAtFrom: undefined,
    createdAtTo: undefined,
    nextDueAtFrom: undefined,
    nextDueAtTo: undefined,
    overdueOnly: false,
    amountMin: undefined,
    amountMax: undefined,
    totalAmountMin: undefined,
    totalAmountMax: undefined,
    monthlyAmountMin: undefined,
    monthlyAmountMax: undefined,
    paidAmountMin: undefined,
    paidAmountMax: undefined,
    remainingAmountMin: undefined,
    remainingAmountMax: undefined,
    durationMonthsMin: undefined,
    durationMonthsMax: undefined,
    interestRateMin: undefined,
    interestRateMax: undefined,
  }
  const safeFilters: CreditContractFilterState = { ...defaultFilters, ...filters }

  const isCreatedAtRangeActive = Boolean(safeFilters.createdAtFrom || safeFilters.createdAtTo)
  const isNextDueRangeActive = Boolean(safeFilters.nextDueAtFrom || safeFilters.nextDueAtTo)
  const isOverdueTab = activeTab === 'overdue'
  const forcedStatusByTab: CreditContractStatus | null =
    activeTab === 'closed' ? 'CLOSED' : activeTab === 'discharged' ? 'DISCHARGED' : null
  const isStatusLockedByTab = Boolean(forcedStatusByTab)
  const statusValue = (isStatusLockedByTab ? forcedStatusByTab : safeFilters.status) || 'all'
  const hasCustomStatus = !isStatusLockedByTab && statusValue !== 'all'
  const creditTypeValue = safeFilters.creditType || 'all'

  const statusLabels: Record<string, string> = {
    all: 'Tous les statuts',
    DRAFT: 'Brouillon',
    PENDING: 'En attente',
    APPROVED: 'Approuvé',
    SIMULATED: 'Simulé',
    ACTIVE: 'Actif',
    PARTIAL: 'Partiel',
    OVERDUE: 'En retard',
    BLOCKED: 'Bloqué',
    TRANSFORMED: 'Transformé',
    EXTENDED: 'Étendu',
    DISCHARGED: 'Déchargé',
    CLOSED: 'Clos',
  }

  const creditTypeLabels: Record<string, string> = {
    all: 'Tous les types',
    SPECIALE: 'Spéciale',
    FIXE: 'Fixe',
    AIDE: 'Aide',
  }

  const activeFilterLabels = [
    safeFilters.search.trim() ? `Recherche: ${safeFilters.search.trim()}` : null,
    hasCustomStatus ? `Statut: ${statusLabels[statusValue] || statusValue}` : null,
    showCreditTypeFilter && creditTypeValue !== 'all'
      ? `Type: ${creditTypeLabels[creditTypeValue] || creditTypeValue}`
      : null,
    isCreatedAtRangeActive ? 'Période de création' : null,
    isNextDueRangeActive ? 'Prochaine échéance' : null,
    !isOverdueTab && safeFilters.overdueOnly ? 'Retard uniquement' : null,
    typeof safeFilters.amountMin === 'number' || typeof safeFilters.amountMax === 'number'
      ? 'Montant emprunté'
      : null,
    typeof safeFilters.totalAmountMin === 'number' || typeof safeFilters.totalAmountMax === 'number'
      ? 'Montant total'
      : null,
    typeof safeFilters.monthlyAmountMin === 'number' || typeof safeFilters.monthlyAmountMax === 'number'
      ? 'Mensualité'
      : null,
    typeof safeFilters.paidAmountMin === 'number' || typeof safeFilters.paidAmountMax === 'number'
      ? 'Montant déjà versé'
      : null,
    typeof safeFilters.remainingAmountMin === 'number' || typeof safeFilters.remainingAmountMax === 'number'
      ? 'Montant restant'
      : null,
    typeof safeFilters.durationMonthsMin === 'number' || typeof safeFilters.durationMonthsMax === 'number'
      ? 'Durée'
      : null,
    typeof safeFilters.interestRateMin === 'number' || typeof safeFilters.interestRateMax === 'number'
      ? "Taux d'intérêt"
      : null,
  ].filter(Boolean) as string[]

  const activeFiltersCount = activeFilterLabels.length
  const basicFiltersCount =
    (safeFilters.search.trim() ? 1 : 0) +
    (hasCustomStatus ? 1 : 0) +
    (showCreditTypeFilter && creditTypeValue !== 'all' ? 1 : 0)
  const advancedFiltersCount = Math.max(activeFiltersCount - basicFiltersCount, 0)

  const controlClassName = 'h-11 rounded-xl border-2 border-slate-200 bg-white focus:ring-0 focus-visible:ring-0 focus-visible:border-[#234D65]'
  const miniInputClassName = 'h-10 rounded-lg border-slate-200 bg-white focus-visible:ring-0 focus-visible:border-[#234D65]'

  return (
    <Card className="relative overflow-hidden border border-slate-200/80 bg-white shadow-md">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#234D65] via-[#2c5a73] to-[#cbb171]" />
      <CardContent className="space-y-5 p-4 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-gradient-to-br from-[#234D65] to-[#2c5a73] p-2.5 shadow-sm">
              <Filter className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Filtres et Recherche</h3>
              <p className="text-sm text-slate-600">Affinez la liste des contrats en quelques critères.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                'rounded-full border-slate-300 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700',
                activeFiltersCount === 0 && 'border-slate-200 text-slate-500'
              )}
            >
              {activeFiltersCount} filtre{activeFiltersCount > 1 ? 's' : ''} actif{activeFiltersCount > 1 ? 's' : ''}
            </Badge>
            <Button
              variant="outline"
              onClick={() => setIsFiltersExpanded((prev) => !prev)}
              className={cn(
                'h-10 rounded-xl border-2 transition-colors cursor-pointer',
                isFiltersExpanded
                  ? 'border-[#234D65] bg-[#234D65] text-white hover:bg-[#2c5a73]'
                  : 'border-slate-300 text-slate-700 hover:border-[#234D65] hover:bg-[#234D65]/5 hover:text-[#234D65]'
              )}
            >
              Filtres avancés
              {advancedFiltersCount > 0 ? ` (${advancedFiltersCount})` : ''}
              <ChevronDown className={cn('ml-2 h-4 w-4 transition-transform', isFiltersExpanded ? 'rotate-180' : '')} />
            </Button>
            <Button
              variant="outline"
              onClick={onReset}
              className="h-10 rounded-xl border-2 border-slate-300 text-slate-700 cursor-pointer hover:border-[#234D65] hover:bg-[#234D65]/5 hover:text-[#234D65]"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Réinitialiser
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-12">
          <div className={cn('space-y-1.5', showCreditTypeFilter ? 'xl:col-span-6' : 'xl:col-span-9')}>
            <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recherche</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                placeholder="Nom, prénom, contact ou matricule..."
                className={cn(controlClassName, 'pl-10')}
                value={safeFilters.search || ''}
                onChange={(e) => onFiltersChange({ ...safeFilters, search: e.target.value })}
              />
            </div>
          </div>

          <div className={cn('space-y-1.5', showCreditTypeFilter ? 'xl:col-span-3' : 'xl:col-span-3')}>
            <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Statut</Label>
            <Select
              value={statusValue}
              onValueChange={(value) => onFiltersChange({ ...safeFilters, status: value as CreditContractStatus | 'all' })}
              disabled={isStatusLockedByTab}
            >
              <SelectTrigger className={cn(controlClassName, 'disabled:opacity-70')}>
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                {isStatusLockedByTab ? (
                  <SelectItem value={statusValue}>{statusLabels[statusValue] || statusValue}</SelectItem>
                ) : (
                  <>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="DRAFT">Brouillon</SelectItem>
                    <SelectItem value="PENDING">En attente</SelectItem>
                    <SelectItem value="APPROVED">Approuvé</SelectItem>
                    <SelectItem value="SIMULATED">Simulé</SelectItem>
                    <SelectItem value="ACTIVE">Actif</SelectItem>
                    <SelectItem value="PARTIAL">Partiel</SelectItem>
                    <SelectItem value="OVERDUE">En retard</SelectItem>
                    <SelectItem value="BLOCKED">Bloqué</SelectItem>
                    <SelectItem value="TRANSFORMED">Transformé</SelectItem>
                    <SelectItem value="EXTENDED">Étendu</SelectItem>
                    <SelectItem value="DISCHARGED">Déchargé</SelectItem>
                    <SelectItem value="CLOSED">Clos</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          {showCreditTypeFilter && (
            <div className="space-y-1.5 xl:col-span-3">
              <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Type de crédit</Label>
              <Select
                value={creditTypeValue}
                onValueChange={(value) => onFiltersChange({ ...safeFilters, creditType: value as CreditTypeFilter })}
              >
                <SelectTrigger className={controlClassName}>
                  <SelectValue placeholder="Tous les types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="SPECIALE">Spéciale</SelectItem>
                  <SelectItem value="FIXE">Fixe</SelectItem>
                  <SelectItem value="AIDE">Aide</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {isFiltersExpanded && (
          <>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-slate-600">Période de création</Label>
                  {isNextDueRangeActive && (
                    <span className="text-[11px] font-medium text-slate-500">Désactivé par l&apos;échéance</span>
                  )}
                </div>
                <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_auto_1fr]">
                  <Input
                    type="date"
                    className={miniInputClassName}
                    value={safeFilters.createdAtFrom ? new Date(safeFilters.createdAtFrom).toISOString().slice(0, 10) : ''}
                    onChange={(e) =>
                      onFiltersChange({
                        ...safeFilters,
                        createdAtFrom: e.target.value ? new Date(e.target.value) : undefined,
                        nextDueAtFrom: undefined,
                        nextDueAtTo: undefined,
                      })
                    }
                    disabled={isNextDueRangeActive}
                  />
                  <span className="text-center text-sm text-slate-400">→</span>
                  <Input
                    type="date"
                    className={miniInputClassName}
                    value={safeFilters.createdAtTo ? new Date(safeFilters.createdAtTo).toISOString().slice(0, 10) : ''}
                    onChange={(e) =>
                      onFiltersChange({
                        ...safeFilters,
                        createdAtTo: e.target.value ? new Date(e.target.value) : undefined,
                        nextDueAtFrom: undefined,
                        nextDueAtTo: undefined,
                      })
                    }
                    disabled={isNextDueRangeActive}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-slate-600">Prochaine échéance</Label>
                  {isCreatedAtRangeActive && (
                    <span className="text-[11px] font-medium text-slate-500">Désactivé par la création</span>
                  )}
                </div>
                <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_auto_1fr]">
                  <Input
                    type="date"
                    className={miniInputClassName}
                    value={safeFilters.nextDueAtFrom ? new Date(safeFilters.nextDueAtFrom).toISOString().slice(0, 10) : ''}
                    onChange={(e) =>
                      onFiltersChange({
                        ...safeFilters,
                        nextDueAtFrom: e.target.value ? new Date(e.target.value) : undefined,
                        createdAtFrom: undefined,
                        createdAtTo: undefined,
                      })
                    }
                    disabled={isCreatedAtRangeActive}
                  />
                  <span className="text-center text-sm text-slate-400">→</span>
                  <Input
                    type="date"
                    className={miniInputClassName}
                    value={safeFilters.nextDueAtTo ? new Date(safeFilters.nextDueAtTo).toISOString().slice(0, 10) : ''}
                    onChange={(e) =>
                      onFiltersChange({
                        ...safeFilters,
                        nextDueAtTo: e.target.value ? new Date(e.target.value) : undefined,
                        createdAtFrom: undefined,
                        createdAtTo: undefined,
                      })
                    }
                    disabled={isCreatedAtRangeActive}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <Label className="mb-3 block text-xs font-semibold uppercase tracking-wide text-slate-600">Filtres de montants (FCFA)</Label>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
                  <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Montant emprunté</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      min={0}
                      placeholder="Min"
                      className={miniInputClassName}
                      value={safeFilters.amountMin ?? ''}
                      onChange={(e) => onFiltersChange({ ...safeFilters, amountMin: e.target.value === '' ? undefined : Number(e.target.value) })}
                    />
                    <Input
                      type="number"
                      min={0}
                      placeholder="Max"
                      className={miniInputClassName}
                      value={safeFilters.amountMax ?? ''}
                      onChange={(e) => onFiltersChange({ ...safeFilters, amountMax: e.target.value === '' ? undefined : Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
                  <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Montant total</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      min={0}
                      placeholder="Min"
                      className={miniInputClassName}
                      value={safeFilters.totalAmountMin ?? ''}
                      onChange={(e) => onFiltersChange({ ...safeFilters, totalAmountMin: e.target.value === '' ? undefined : Number(e.target.value) })}
                    />
                    <Input
                      type="number"
                      min={0}
                      placeholder="Max"
                      className={miniInputClassName}
                      value={safeFilters.totalAmountMax ?? ''}
                      onChange={(e) => onFiltersChange({ ...safeFilters, totalAmountMax: e.target.value === '' ? undefined : Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
                  <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Mensualité</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      min={0}
                      placeholder="Min"
                      className={miniInputClassName}
                      value={safeFilters.monthlyAmountMin ?? ''}
                      onChange={(e) => onFiltersChange({ ...safeFilters, monthlyAmountMin: e.target.value === '' ? undefined : Number(e.target.value) })}
                    />
                    <Input
                      type="number"
                      min={0}
                      placeholder="Max"
                      className={miniInputClassName}
                      value={safeFilters.monthlyAmountMax ?? ''}
                      onChange={(e) => onFiltersChange({ ...safeFilters, monthlyAmountMax: e.target.value === '' ? undefined : Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
                  <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Montant déjà versé</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      min={0}
                      placeholder="Min"
                      className={miniInputClassName}
                      value={safeFilters.paidAmountMin ?? ''}
                      onChange={(e) => onFiltersChange({ ...safeFilters, paidAmountMin: e.target.value === '' ? undefined : Number(e.target.value) })}
                    />
                    <Input
                      type="number"
                      min={0}
                      placeholder="Max"
                      className={miniInputClassName}
                      value={safeFilters.paidAmountMax ?? ''}
                      onChange={(e) => onFiltersChange({ ...safeFilters, paidAmountMax: e.target.value === '' ? undefined : Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
                  <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Montant restant</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      min={0}
                      placeholder="Min"
                      className={miniInputClassName}
                      value={safeFilters.remainingAmountMin ?? ''}
                      onChange={(e) => onFiltersChange({ ...safeFilters, remainingAmountMin: e.target.value === '' ? undefined : Number(e.target.value) })}
                    />
                    <Input
                      type="number"
                      min={0}
                      placeholder="Max"
                      className={miniInputClassName}
                      value={safeFilters.remainingAmountMax ?? ''}
                      onChange={(e) => onFiltersChange({ ...safeFilters, remainingAmountMax: e.target.value === '' ? undefined : Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
                  <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Durée contrat (mois)</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      placeholder="Min"
                      className={miniInputClassName}
                      value={safeFilters.durationMonthsMin ?? ''}
                      onChange={(e) => onFiltersChange({ ...safeFilters, durationMonthsMin: e.target.value === '' ? undefined : Number(e.target.value) })}
                    />
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      placeholder="Max"
                      className={miniInputClassName}
                      value={safeFilters.durationMonthsMax ?? ''}
                      onChange={(e) => onFiltersChange({ ...safeFilters, durationMonthsMax: e.target.value === '' ? undefined : Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
                  <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Taux d&apos;intérêt (%)</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      min={0}
                      placeholder="Min"
                      className={miniInputClassName}
                      value={safeFilters.interestRateMin ?? ''}
                      onChange={(e) => onFiltersChange({ ...safeFilters, interestRateMin: e.target.value === '' ? undefined : Number(e.target.value) })}
                    />
                    <Input
                      type="number"
                      min={0}
                      placeholder="Max"
                      className={miniInputClassName}
                      value={safeFilters.interestRateMax ?? ''}
                      onChange={(e) => onFiltersChange({ ...safeFilters, interestRateMax: e.target.value === '' ? undefined : Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-100 pt-2 md:flex-row md:items-start md:justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-[#234D65] focus:ring-[#234D65]"
                  checked={isOverdueTab ? true : !!safeFilters.overdueOnly}
                  onChange={(e) => onFiltersChange({ ...safeFilters, overdueOnly: e.target.checked })}
                  disabled={isOverdueTab}
                />
                Afficher uniquement les contrats en retard
              </label>

              {activeFilterLabels.length > 0 && (
                <div className="flex flex-wrap gap-2 md:justify-end">
                  {activeFilterLabels.map((label) => (
                    <Badge
                      key={label}
                      variant="outline"
                      className="border-[#234D65]/25 bg-[#234D65]/5 px-2.5 py-1 text-xs font-medium text-[#234D65]"
                    >
                      {label}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// Composant principal
const ListContrats = ({
  forcedCreditType,
  contractDetailsBasePath = routes.admin.creditSpecialeContrats,
}: ListContratsProps) => {
  useCreditContractsRealtimeSync(true)
  const router = useRouter()
  const searchParams = useSearchParams()
  const isCreditTypeLocked = Boolean(forcedCreditType)
  const normalizedContractDetailsBasePath = contractDetailsBasePath.replace(/\/$/, '')

  const searchParamCreditType = searchParams.get('creditType')
  const initialCreditType: CreditTypeFilter =
    searchParamCreditType === 'SPECIALE' || searchParamCreditType === 'FIXE' || searchParamCreditType === 'AIDE'
      ? searchParamCreditType
      : 'all'
  const searchParamTab = searchParams.get('tab')
  const initialTab: ContractTabValue = isContractTabValue(searchParamTab) ? searchParamTab : 'all'
  
  // Initialiser les états depuis l'URL
  const [activeTab, setActiveTab] = useState<ContractTabValue>(initialTab)
  const [filters, setFilters] = useState<CreditContractFilterState>({
    search: searchParams.get('search') || '',
    status: (searchParams.get('status') as CreditContractStatus | 'all') || 'all',
    creditType: forcedCreditType || initialCreditType,
    createdAtFrom: undefined,
    createdAtTo: undefined,
    nextDueAtFrom: undefined,
    nextDueAtTo: undefined,
    overdueOnly: false,
    amountMin: undefined,
    amountMax: undefined,
    totalAmountMin: undefined,
    totalAmountMax: undefined,
    monthlyAmountMin: undefined,
    monthlyAmountMax: undefined,
    paidAmountMin: undefined,
    paidAmountMax: undefined,
    remainingAmountMin: undefined,
    remainingAmountMax: undefined,
    durationMonthsMin: undefined,
    durationMonthsMax: undefined,
    interestRateMin: undefined,
    interestRateMax: undefined,
  })
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1)
  const [itemsPerPage] = useState(Number(searchParams.get('limit')) || 12)
  const [viewMode, setViewMode] = useState<ViewMode>((searchParams.get('view') as ViewMode) || 'grid')
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    if (!forcedCreditType) return
    setFilters((prev) => {
      if (prev.creditType === forcedCreditType) return prev
      return { ...prev, creditType: forcedCreditType }
    })
  }, [forcedCreditType])

  const tabItems: ContractTabItem[] = [
    { value: 'all', label: 'Tous', icon: FileText },
    { value: 'active', label: 'Actif', icon: CheckCircle2 },
    { value: 'currentMonth', label: 'Mois en cours', icon: Calendar },
    { value: 'closed', label: 'Clos', icon: Shield },
    { value: 'discharged', label: 'Déchargé', icon: Download },
    { value: 'overdue', label: 'Retard', icon: AlertCircle, isDanger: true },
  ]

  // Synchroniser l'URL avec l'état
  useEffect(() => {
    const params = new URLSearchParams()
    if (filters.search) params.set('search', filters.search)
    if (filters.status !== 'all') params.set('status', filters.status)
    if (!isCreditTypeLocked && filters.creditType !== 'all') params.set('creditType', filters.creditType)
    if (currentPage > 1) params.set('page', currentPage.toString())
    if (itemsPerPage !== 12) params.set('limit', itemsPerPage.toString())
    if (viewMode !== 'grid') params.set('view', viewMode)
    if (activeTab !== 'all') params.set('tab', activeTab)
    
    const queryString = params.toString()
    const newUrl = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname
    const expectedSearch = queryString ? `?${queryString}` : ''
    
    if (window.location.search !== expectedSearch) {
      router.replace(newUrl, { scroll: false })
    }
  }, [filters, currentPage, itemsPerPage, viewMode, activeTab, router, isCreditTypeLocked])

  // Hooks pour récupérer les données
  const effectiveCreditType: CreditTypeFilter = forcedCreditType || filters.creditType
  const statusFilter = filters.status === 'all' ? 'all' : filters.status
  const tabStatusFilter: CreditContractStatus | 'all' =
    activeTab === 'closed'
      ? 'CLOSED'
      : activeTab === 'discharged'
      ? 'DISCHARGED'
      : statusFilter

  const queryFilters: CreditContractFilters = {
    status: tabStatusFilter,
    creditType: effectiveCreditType === 'all' ? 'all' : effectiveCreditType,
    search: filters.search || undefined,
    overdueOnly: activeTab === 'overdue' ? true : Boolean(filters.overdueOnly),
    dateFrom: filters.createdAtFrom,
    dateTo: filters.createdAtTo,
    // Toujours trier côté Firestore sur createdAt pour éviter les résultats vides
    // quand un index composite nextDueAt n'est pas disponible.
    // Le tri nextDueAt (Retard / Mois en cours) est ensuite appliqué en mémoire.
    orderByField: 'createdAt',
    orderByDirection: 'desc',
  }

  const { data: contrats = [], isLoading, error } = useCreditContracts(queryFilters)
  const { uploadSignedContract, replaceSignedContract } = useCreditContractMutations()
  
  // États pour les modals
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedContractForUpload, setSelectedContractForUpload] = useState<CreditContract | null>(null)
  const [contractFile, setContractFile] = useState<File | undefined>()
  const [showReplaceModal, setShowReplaceModal] = useState(false)
  const [selectedContractForReplace, setSelectedContractForReplace] = useState<CreditContract | null>(null)
  const [replaceFile, setReplaceFile] = useState<File | undefined>()
  const [showContractPDFModal, setShowContractPDFModal] = useState(false)
  const [selectedContractForPDF, setSelectedContractForPDF] = useState<CreditContract | null>(null)
  const [selectedContractForOverview, setSelectedContractForOverview] = useState<CreditContract | null>(null)
  const [showDeleteContractModal, setShowDeleteContractModal] = useState(false)
  const [selectedContractForDelete, setSelectedContractForDelete] = useState<CreditContract | null>(null)
  const [viewerDoc, setViewerDoc] = useState<ViewerDoc | null>(null)
  const isUploadActivationFlow = selectedContractForUpload?.status === 'PENDING'

  // Ouvre la modale d'aperçu/téléchargement (mécanisme mobile unifié).
  const openCreditDocument = (contract: CreditContract, url: string | undefined | null, label: string, title: string) => {
    setViewerDoc({
      url: url ?? undefined,
      filename: creditDocFilename(contract, label),
      title,
      subtitle: `${contract.clientFirstName ?? ''} ${contract.clientLastName ?? ''}`.trim() || undefined,
    })
  }

  // Reset page when filters or tab change
  React.useEffect(() => {
    setCurrentPage(1)
  }, [filters, activeTab])

  // Gestionnaires d'événements
  const handleFiltersChange = (newFilters: CreditContractFilterState) => {
    setFilters({
      ...newFilters,
      creditType: forcedCreditType || newFilters.creditType,
    })
    setCurrentPage(1)
  }

  const handleResetFilters = () => {
    setFilters({
      search: '',
      status: 'all',
      creditType: forcedCreditType || 'all',
      createdAtFrom: undefined,
      createdAtTo: undefined,
      nextDueAtFrom: undefined,
      nextDueAtTo: undefined,
      overdueOnly: false,
      amountMin: undefined,
      amountMax: undefined,
      totalAmountMin: undefined,
      totalAmountMax: undefined,
      monthlyAmountMin: undefined,
      monthlyAmountMax: undefined,
      paidAmountMin: undefined,
      paidAmountMax: undefined,
      remainingAmountMin: undefined,
      remainingAmountMax: undefined,
      durationMonthsMin: undefined,
      durationMonthsMax: undefined,
      interestRateMin: undefined,
      interestRateMax: undefined,
    })
    setCurrentPage(1)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleRefresh = async () => {
    // Le refetch est géré automatiquement par React Query
  }

  const exportToExcel = async () => {
    if (!filteredContrats || filteredContrats.length === 0) {
      toast.error('Aucun contrat à exporter')
      return
    }

    setIsExporting(true)
    try {
      const XLSX = await import('xlsx')
      const rows = buildExportRows()
      
      const headers = [
        'ID',
        'Type de crédit',
        'Client',
        'Statut',
        'Montant emprunté (FCFA)',
        'Montant total (FCFA)',
        'Durée (mois)',
        'Mensualité (FCFA)',
        'Montant versé (FCFA)',
        'Montant restant (FCFA)',
        'Garant',
        'Garant membre',
        'Date premier versement',
        'Prochaine échéance',
        'Date de création',
      ]

      const tabLabels: Record<ContractTabValue, string> = {
        all: 'Tous',
        active: 'Actif',
        currentMonth: 'Mois en cours',
        closed: 'Clos',
        discharged: 'Déchargé',
        overdue: 'Retard',
      }
      const tabLabel = tabLabels[activeTab]
      const exportModuleLabel = forcedCreditType
        ? `CRÉDIT ${getCreditTypeLabel(forcedCreditType).toUpperCase()}`
        : 'CRÉDIT SPÉCIALE'
      const sheetData = [
        [`LISTE DES CONTRATS DE ${exportModuleLabel}`],
        [`Onglet: ${tabLabel}`],
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
      
      const filename = `contrats_credit_${activeTab}_${new Date().toISOString().slice(0, 10)}.xlsx`
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
    if (!filteredContrats || filteredContrats.length === 0) {
      toast.error('Aucun contrat à exporter')
      return
    }

    setIsExporting(true)
    try {
      const { jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const horizontalMargin = 14

      const tabLabels: Record<ContractTabValue, string> = {
        all: 'Tous',
        active: 'Actif',
        currentMonth: 'Mois en cours',
        closed: 'Clos',
        discharged: 'Déchargé',
        overdue: 'Retard',
      }
      const tabLabel = tabLabels[activeTab]
      const exportModuleLabel = forcedCreditType
        ? `Crédit ${getCreditTypeLabel(forcedCreditType)}`
        : 'Crédit Spéciale'

      doc.setFont('times', 'bold')
      doc.setTextColor(20, 33, 50)
      doc.setFontSize(16)
      doc.text(`Liste des Contrats de ${exportModuleLabel}`, horizontalMargin, 14)

      doc.setFont('times', 'normal')
      doc.setTextColor(70, 70, 70)
      doc.setFontSize(10)
      doc.text(`Type: ${tabLabel}`, horizontalMargin, 20)
      doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, horizontalMargin, 24)
      doc.text(`Total: ${filteredContrats.length} contrat(s)`, horizontalMargin, 28)
      doc.setDrawColor(35, 77, 101)
      doc.setLineWidth(0.3)
      doc.line(horizontalMargin, 31, pageWidth - horizontalMargin, 31)

      const rows = buildExportRows().map((row) => [
        row[0],  // ID Contrat
        row[2],  // Client
        row[3],  // Statut
        row[4],  // Montant FCFA
        row[5],  // Total FCFA
        row[6],  // Durée
        row[7],  // Mensualité FCFA
        row[8],  // Versé FCFA
        row[9],  // Restant FCFA
        row[10], // Garant
        row[12], // 1ère échéance
        row[13], // Prochaine échéance
        row[14], // Créé le
      ])
      const headers = [
        'ID Contrat',
        'Client',
        'Statut',
        'Montant FCFA',
        'Total FCFA',
        'Durée',
        'Mensualité FCFA',
        'Versé FCFA',
        'Restant FCFA',
        'Garant',
        '1ère échéance',
        'Prochaine échéance',
        'Créé le',
      ]

      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 35,
        tableWidth: pageWidth - horizontalMargin * 2,
        theme: 'grid',
        styles: {
          font: 'times',
          fontSize: 7,
          cellPadding: 1.8,
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
        margin: { top: 35, right: horizontalMargin, bottom: 14, left: horizontalMargin },
        columnStyles: {
          2: { halign: 'center' },
          3: { halign: 'right' },
          4: { halign: 'right' },
          5: { halign: 'center' },
          6: { halign: 'right' },
          7: { halign: 'right' },
          8: { halign: 'right' },
          10: { halign: 'center' },
          11: { halign: 'center' },
          12: { halign: 'center' },
        },
      })

      const totalPages = doc.getNumberOfPages()
      for (let page = 1; page <= totalPages; page++) {
        doc.setPage(page)
        doc.setFont('times', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(75, 85, 99)
        doc.text(`Page ${page}/${totalPages}`, pageWidth / 2, pageHeight - 6, { align: 'center' })
      }

      const filename = `contrats_credit_${activeTab}_${new Date().toISOString().slice(0, 10)}.pdf`
      doc.save(filename)
      toast.success('Exporter PDF généré')
    } catch (error) {
      console.error('Erreur lors de l\'export PDF:', error)
      toast.error('Erreur lors de l\'export PDF')
    } finally {
      setIsExporting(false)
    }
  }

  // Fonctions utilitaires
  const getCreditTypeLabel = (type: string) => {
    const labels = {
      SPECIALE: 'Spéciale',
      FIXE: 'Fixe',
      AIDE: 'Aide',
    }
    return labels[type as keyof typeof labels] || type
  }

  const getStatusColor = (status: CreditContractStatus) => {
    const colors = {
      DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
      PENDING: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      APPROVED: 'bg-blue-100 text-blue-700 border-blue-200',
      SIMULATED: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      ACTIVE: 'bg-green-100 text-green-700 border-green-200',
      OVERDUE: 'bg-orange-100 text-orange-700 border-orange-200',
      PARTIAL: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      TRANSFORMED: 'bg-purple-100 text-purple-700 border-purple-200',
      BLOCKED: 'bg-red-100 text-red-700 border-red-200',
      DISCHARGED: 'bg-gray-100 text-gray-700 border-gray-200',
      CLOSED: 'bg-gray-100 text-gray-700 border-gray-200',
      EXTENDED: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    }
    return colors[status] || colors.DRAFT
  }

  const getStatusLabel = (status: CreditContractStatus) => {
    const labels = {
      DRAFT: 'Brouillon',
      PENDING: 'En attente',
      APPROVED: 'Approuvé',
      SIMULATED: 'Simulé',
      ACTIVE: 'Actif',
      OVERDUE: 'En retard',
      PARTIAL: 'Partiel',
      TRANSFORMED: 'Transformé',
      BLOCKED: 'Bloqué',
      DISCHARGED: 'Déchargé',
      CLOSED: 'Clos',
      EXTENDED: 'Étendu',
    }
    return labels[status] || status
  }

  const getStatusDot = (status: CreditContractStatus) => {
    const dots: Record<string, { dot: string; text: string }> = {
      DRAFT:       { dot: 'bg-slate-300',  text: 'text-slate-600'  },
      PENDING:     { dot: 'bg-amber-400',  text: 'text-amber-700'  },
      APPROVED:    { dot: 'bg-blue-400',   text: 'text-blue-700'   },
      SIMULATED:   { dot: 'bg-indigo-400', text: 'text-indigo-700' },
      ACTIVE:      { dot: 'bg-emerald-500',text: 'text-emerald-700'},
      OVERDUE:     { dot: 'bg-orange-500', text: 'text-orange-700' },
      PARTIAL:     { dot: 'bg-amber-400',  text: 'text-amber-700'  },
      TRANSFORMED: { dot: 'bg-purple-400', text: 'text-purple-700' },
      BLOCKED:     { dot: 'bg-red-400',    text: 'text-red-700'    },
      DISCHARGED:  { dot: 'bg-gray-400',   text: 'text-gray-500'   },
      CLOSED:      { dot: 'bg-gray-400',   text: 'text-gray-500'   },
      EXTENDED:    { dot: 'bg-cyan-400',   text: 'text-cyan-700'   },
    }
    return dots[status] || dots.DRAFT
  }

  /**
   * Vérifie si un contrat est en retard
   */
  const isContractOverdue = (contract: CreditContract): boolean => {
    // Un contrat PARTIAL = partiellement remboursé, pas forcément "en retard".
    // "En retard" doit refléter une échéance dépassée (nextDueAt < aujourd'hui) ou un statut OVERDUE explicite.
    if (contract.status === 'OVERDUE') {
      return true
    }
    
    if ((contract.status === 'ACTIVE' || contract.status === 'PARTIAL') && contract.nextDueAt) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const nextDue = contract.nextDueAt instanceof Date 
        ? contract.nextDueAt 
        : new Date(contract.nextDueAt)
      nextDue.setHours(0, 0, 0, 0)
      
      if (nextDue < today) {
        return true
      }
    }
    
    return false
  }

  const filteredContrats = React.useMemo(() => {
    let items = [...contrats]
    const matchesRange = (value: number, min?: number, max?: number) => {
      if (typeof min === 'number' && value < min) return false
      if (typeof max === 'number' && value > max) return false
      return true
    }

    const searchValue = filters.search.trim().toLowerCase()
    if (searchValue) {
      items = items.filter((contract) => {
        const fullName = `${contract.clientFirstName || ''} ${contract.clientLastName || ''}`.toLowerCase()
        const contacts = (contract.clientContacts || []).join(' ').toLowerCase()
        return (
          contract.id.toLowerCase().includes(searchValue) ||
          fullName.includes(searchValue) ||
          (contract.clientFirstName || '').toLowerCase().includes(searchValue) ||
          (contract.clientLastName || '').toLowerCase().includes(searchValue) ||
          (contract.clientId || '').toLowerCase().includes(searchValue) ||
          contacts.includes(searchValue)
        )
      })
    }

    if (!isCreditTypeLocked && filters.creditType !== 'all') {
      items = items.filter((contract) => contract.creditType === filters.creditType)
    }

    if (activeTab === 'active') {
      items = items.filter((contract) => !CLOSED_CREDIT_STATUSES.includes(contract.status))
    }

    if (activeTab === 'closed') {
      items = items.filter((contract) => contract.status === 'CLOSED')
    }

    if (activeTab === 'discharged') {
      items = items.filter((contract) => contract.status === 'DISCHARGED')
    }

    if (activeTab === 'currentMonth') {
      const { start, end } = getCurrentMonthRange()
      items = items.filter((contract) => {
        const nextDueAt = normalizeToDate(contract.nextDueAt)
        return Boolean(nextDueAt && nextDueAt >= start && nextDueAt <= end)
      })
    }

    if (activeTab === 'overdue') {
      items = items.filter((contract) => isContractOverdue(contract))
    }

    if (filters.status !== 'all' && activeTab !== 'closed' && activeTab !== 'discharged') {
      items = items.filter((contract) => contract.status === filters.status)
    }

    if (filters.overdueOnly && activeTab !== 'overdue') {
      items = items.filter((contract) => isContractOverdue(contract))
    }

    if (activeTab === 'overdue' || activeTab === 'currentMonth') {
      items = items.sort((a, b) => {
        const aDue = normalizeToDate(a.nextDueAt)
        const bDue = normalizeToDate(b.nextDueAt)
        const aTime = aDue ? aDue.getTime() : Number.POSITIVE_INFINITY
        const bTime = bDue ? bDue.getTime() : Number.POSITIVE_INFINITY
        return aTime - bTime
      })
    }

    if (filters.createdAtFrom) {
      items = items.filter((contract) => {
        const createdAt = normalizeToDate(contract.createdAt)
        return Boolean(createdAt && createdAt >= filters.createdAtFrom!)
      })
    }

    if (filters.createdAtTo) {
      const createdAtTo = new Date(filters.createdAtTo)
      createdAtTo.setHours(23, 59, 59, 999)
      items = items.filter((contract) => {
        const createdAt = normalizeToDate(contract.createdAt)
        return Boolean(createdAt && createdAt <= createdAtTo)
      })
    }

    if (filters.nextDueAtFrom) {
      items = items.filter((contract) => {
        const nextDueAt = normalizeToDate(contract.nextDueAt)
        return Boolean(nextDueAt && nextDueAt >= filters.nextDueAtFrom!)
      })
    }

    if (filters.nextDueAtTo) {
      const nextDueAtTo = new Date(filters.nextDueAtTo)
      nextDueAtTo.setHours(23, 59, 59, 999)
      items = items.filter((contract) => {
        const nextDueAt = normalizeToDate(contract.nextDueAt)
        return Boolean(nextDueAt && nextDueAt <= nextDueAtTo)
      })
    }

    items = items.filter((contract) =>
      matchesRange(contract.amount, filters.amountMin, filters.amountMax) &&
      matchesRange(contract.totalAmount, filters.totalAmountMin, filters.totalAmountMax) &&
      matchesRange(contract.monthlyPaymentAmount, filters.monthlyAmountMin, filters.monthlyAmountMax) &&
      matchesRange(contract.amountPaid, filters.paidAmountMin, filters.paidAmountMax) &&
      matchesRange(contract.amountRemaining, filters.remainingAmountMin, filters.remainingAmountMax) &&
      matchesRange(contract.duration, filters.durationMonthsMin, filters.durationMonthsMax) &&
      matchesRange(contract.interestRate, filters.interestRateMin, filters.interestRateMax)
    )

    return items
  }, [activeTab, contrats, filters, isCreditTypeLocked])

  // Fonction pour construire les lignes d'export
  const formatAmount = (amount: number): string => {
    const roundedAmount = Math.round(amount)
    return roundedAmount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  }

  const buildExportRows = () => {
    return filteredContrats.map((contrat: CreditContract) => [
      contrat.id,
      getCreditTypeLabel(contrat.creditType),
      `${contrat.clientFirstName} ${contrat.clientLastName}`,
      getStatusLabel(contrat.status),
      formatAmount(contrat.amount),
      formatAmount(contrat.totalAmount),
      contrat.duration,
      formatAmount(contrat.monthlyPaymentAmount),
      formatAmount(contrat.amountPaid),
      formatAmount(contrat.amountRemaining),
      contrat.guarantorId ? `${contrat.guarantorFirstName} ${contrat.guarantorLastName}` : 'Aucun',
      contrat.guarantorIsMember ? 'Oui' : 'Non',
      contrat.firstPaymentDate ? new Date(contrat.firstPaymentDate).toLocaleDateString('fr-FR') : '',
      contrat.nextDueAt ? new Date(contrat.nextDueAt).toLocaleDateString('fr-FR') : '',
      contrat.createdAt ? new Date(contrat.createdAt).toLocaleDateString('fr-FR') : '',
    ])
  }

  // Pagination
  const totalPages = Math.ceil(filteredContrats.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentContrats = filteredContrats.slice(startIndex, endIndex)

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
                Affichage {startIndex + 1}-{Math.min(endIndex, filteredContrats.length)} sur{' '}
                {filteredContrats.length} contrats
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
    <>
    <div className="space-y-8 animate-in fade-in-0 duration-500">
      {/* Carrousel de statistiques (chargé une fois, mêmes stats pour tous les onglets) */}
      <StatisticsCreditContrats creditType={forcedCreditType} />

      {/* Filtres */}
      <ContractFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onReset={handleResetFilters}
        activeTab={activeTab}
        showCreditTypeFilter={!isCreditTypeLocked}
      />

      {/* Barre d'actions moderne */}
      <Card className="relative overflow-hidden border border-slate-200/80 bg-white shadow-md">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#234D65] via-[#2c5a73] to-[#cbb171]" />
        <CardContent className="p-4 md:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-gradient-to-br from-[#234D65] to-[#2c5a73] p-2.5 shadow-sm">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-black bg-gradient-to-r from-[#234D65] to-[#2c5a73] bg-clip-text text-transparent">
                  Liste des Contrats
                </h2>
                <p className="text-gray-600 font-medium">
                  {filteredContrats.length.toLocaleString()} contrat{filteredContrats.length !== 1 ? 's' : ''} • Page {currentPage}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Boutons de vue (cards/liste) */}
              <div className="flex w-full sm:w-auto items-center rounded-xl border border-slate-200 bg-slate-100/80 p-1">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className={`h-10 flex-1 sm:flex-none px-4 rounded-lg cursor-pointer transition-all duration-200 ${viewMode === 'grid'
                    ? 'bg-white text-[#234D65] shadow-sm hover:bg-white'
                    : 'text-slate-600 hover:bg-white hover:text-[#234D65]'
                    }`}
                >
                  <Grid3X3 className="h-4 w-4 mr-2" />
                  Grille
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className={`h-10 flex-1 sm:flex-none px-4 rounded-lg cursor-pointer transition-all duration-200 ${viewMode === 'list'
                    ? 'bg-white text-[#234D65] shadow-sm hover:bg-white'
                    : 'text-slate-600 hover:bg-white hover:text-[#234D65]'
                    }`}
                >
                  <List className="h-4 w-4 mr-2" />
                  Liste
                </Button>
              </div>

              {/* Actions */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
                className="h-10 w-full sm:w-auto rounded-xl border-2 border-[#234D65]/40 bg-white px-4 text-[#234D65] cursor-pointer transition-all duration-200 hover:bg-[#234D65] hover:text-white disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isExporting || filteredContrats.length === 0}
                    className="h-10 w-full sm:w-auto rounded-xl border-2 border-emerald-300 bg-white px-4 text-emerald-700 cursor-pointer transition-all duration-200 hover:border-emerald-400 hover:bg-emerald-50 disabled:opacity-50"
                  >
                    {isExporting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin mr-2" />
                        Export...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
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
                    <Download className="h-4 w-4 mr-2 text-emerald-700" />
                    Exporter Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      if (!isExporting) exportToPDF()
                    }}
                    className="cursor-pointer"
                  >
                    <Download className="h-4 w-4 mr-2 text-rose-700" />
                    Exporter PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      {renderPagination()}

      {/* Onglets de contrat - proche de la liste (comme caisse spéciale) */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          if (isContractTabValue(value)) {
            setActiveTab(value)
          }
        }}
        className="w-full"
      >
        <div className="hidden lg:flex items-center gap-2 border-b border-gray-200">
          <div className="flex-1 min-w-0">
            <TabsList className="relative flex w-full flex-nowrap overflow-x-auto scrollbar-hide bg-transparent p-0 h-auto gap-0.5">
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
        <div className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'
            : 'space-y-6'
        }>
          {[...Array(itemsPerPage)].map((_, i) => (
            <ModernSkeleton key={i} viewMode={viewMode} />
          ))}
        </div>
      ) : currentContrats.length > 0 ? (
        <>
          {viewMode === 'grid' && (
          <div className="rounded-b-2xl border-x border-b border-[#234D65]/20 bg-gradient-to-b from-[#234D65]/[0.04] to-slate-50/30 p-4 md:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
            {currentContrats.map((contract, _index) => {
              const fullName = `${contract.clientFirstName || ''} ${contract.clientLastName || ''}`.trim()
              const displayName = fullName || 'Client non renseigné'
              const primaryContact = contract.clientContacts?.[0] || '—'
              const initials = `${(contract.clientFirstName || '')[0] || ''}${(contract.clientLastName || '')[0] || ''}`.toUpperCase() || 'CS'
              const hasSignedContract = Boolean(contract.signedContractUrl)
              const scoreValue = contract.score

              return (
                <div
                  key={contract.id}
                  className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500"
                  style={{ animationDelay: `${_index * 0.05}s` }}
                >
                  <Card className={cn(
                    'group relative h-full flex flex-col rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-200 hover:border-gray-200 hover:shadow-md',
                    isContractOverdue(contract) && 'border-red-200'
                  )}>
                    <CardContent className="p-6 relative z-10 flex-1 flex flex-col">
                      {/* Header : avatar + nom à gauche, statut dot + type à droite */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar className="size-9 shrink-0 rounded-xl">
                            <AvatarFallback className="rounded-xl bg-[#234D65] text-white font-semibold text-xs">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-gray-900">{displayName}</p>
                            <p className="truncate text-xs text-gray-400">{primaryContact}</p>
                            <p className="truncate font-mono text-[10px] text-gray-400">{contract.id}</p>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span className={`flex items-center gap-1.5 text-xs font-semibold ${getStatusDot(contract.status).text}`}>
                            <span className={`w-2 h-2 rounded-full shrink-0 ${getStatusDot(contract.status).dot}`} />
                            {getStatusLabel(contract.status)}
                          </span>
                          <span className="text-[10px] font-medium text-gray-400">{getCreditTypeLabel(contract.creditType)}</span>
                          {isContractOverdue(contract) && (
                            <span className="flex items-center gap-1 text-[10px] font-semibold text-red-600">
                              <AlertCircle className="h-3 w-3" /> Retard
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 rounded-xl bg-gray-50 p-3 text-sm">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                          <div className="min-w-0">
                            <p className="text-[11px] uppercase tracking-wide text-slate-500">Montant emprunté</p>
                            <p className="font-extrabold text-[#234D65] whitespace-nowrap">{(contract.amount || 0).toLocaleString('fr-FR')} FCFA</p>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] uppercase tracking-wide text-slate-500">Mensualité</p>
                            <p className="font-semibold leading-tight text-slate-900 break-words">{(contract.monthlyPaymentAmount || 0).toLocaleString('fr-FR')} FCFA</p>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] uppercase tracking-wide text-slate-500">Durée</p>
                            <p className="font-semibold text-slate-900">{contract.duration} mois</p>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] uppercase tracking-wide text-slate-500">Prochaine échéance</p>
                            <p className="font-medium text-slate-900">
                              {contract.nextDueAt ? new Date(contract.nextDueAt).toLocaleDateString('fr-FR') : '—'}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
                          <div className="flex items-center gap-1.5">
                            {hasSignedContract ? (
                              <>
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                <span className="text-xs font-medium text-emerald-700">Contrat signé disponible</span>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="h-3.5 w-3.5 text-orange-500" />
                                <span className="text-xs font-medium text-orange-600">Contrat signé à téléverser</span>
                              </>
                            )}
                          </div>
                          <span className="text-xs font-semibold text-slate-700">
                            Score: {scoreValue !== undefined ? `${scoreValue}/10` : 'N/A'}
                          </span>
                        </div>

                        <div className="mt-2 text-xs text-slate-600">
                          Versé: {(contract.amountPaid || 0).toLocaleString('fr-FR')} FCFA • Reste: {Math.round(contract.amountRemaining || 0).toLocaleString('fr-FR')} FCFA
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-200 mt-auto">
                        <div className="space-y-2">
                          {hasSignedContract ? (
                            <>
                              <Button
                                onClick={() => {
                                  if (!canOpenContractDetail(contract)) return
                                  router.push(`${normalizedContractDetailsBasePath}/${contract.id}`)
                                }}
                                disabled={!canOpenContractDetail(contract)}
                                className="w-full h-9 bg-[#234D65] hover:bg-[#2c5a73] text-white text-sm font-semibold"
                              >
                                <Eye className="h-4 w-4" />
                                Ouvrir
                              </Button>
                              <Button
                                onClick={() => setSelectedContractForOverview(contract)}
                                variant="outline"
                                className="w-full h-9 text-xs border-gray-200 text-gray-600 hover:border-[#234D65] hover:text-[#234D65]"
                              >
                                <User className="h-4 w-4" />
                                Voir toutes les infos
                              </Button>
                              <Button
                                onClick={() => openCreditDocument(contract, contract.signedContractUrl, 'CONTRAT_SIGNE', 'Contrat signé')}
                                variant="outline"
                                className="w-full h-9 text-xs border-gray-200 text-gray-600 hover:border-[#234D65] hover:text-[#234D65]"
                              >
                                <FileText className="h-4 w-4" />
                                Voir contrat
                              </Button>
                              {canReplaceSignedContract(contract) && (
                                <Button
                                  onClick={() => { setSelectedContractForReplace(contract); setReplaceFile(undefined); setShowReplaceModal(true) }}
                                  variant="outline"
                                  className="w-full h-9 text-xs border-amber-200 text-amber-700 hover:bg-amber-50"
                                >
                                  <FileText className="h-4 w-4" />
                                  Modifier contrat signé
                                </Button>
                              )}
                            </>
                          ) : (
                            <>
                              {canUploadSignedContract(contract) && (
                                <Button
                                  onClick={() => { setSelectedContractForUpload(contract); setShowUploadModal(true) }}
                                  variant="outline"
                                  className="w-full h-9 text-xs border-amber-200 text-amber-700 hover:bg-amber-50"
                                >
                                  <Upload className="h-4 w-4" />
                                  {contract.status === 'PENDING' ? 'Téléverser contrat signé' : 'Téléverser nouveau contrat signé'}
                                </Button>
                              )}
                              <Button
                                onClick={() => setSelectedContractForOverview(contract)}
                                variant="outline"
                                className="w-full h-9 text-xs border-gray-200 text-gray-600 hover:border-[#234D65] hover:text-[#234D65]"
                              >
                                <User className="h-4 w-4" />
                                Voir toutes les infos
                              </Button>
                            </>
                          )}

                          {!['DISCHARGED', 'CLOSED'].includes(contract.status) && (
                            <Button
                              onClick={contract.contractUrl
                                ? () => openCreditDocument(contract, contract.contractUrl, 'CONTRAT', 'Contrat')
                                : () => { setSelectedContractForPDF(contract); setShowContractPDFModal(true) }}
                              variant="outline"
                              className="w-full h-9 text-xs border-gray-200 text-gray-600 hover:border-[#234D65] hover:text-[#234D65]"
                            >
                              <Download className="h-4 w-4" />
                              Télécharger contrat
                            </Button>
                          )}
                          {canViewRepaymentContract(contract) && (
                            <Button
                              onClick={() => openCreditDocument(contract, contract.signedQuittanceUrl, 'QUITTANCE', 'Contrat de remboursement')}
                              variant="outline"
                              className="w-full h-9 text-xs border-blue-200 text-blue-700 hover:bg-blue-50"
                            >
                              <Eye className="h-4 w-4" />
                              Contrat de remboursement
                            </Button>
                          )}
                          <Button
                            onClick={() => { setSelectedContractForDelete(contract); setShowDeleteContractModal(true) }}
                            variant="outline"
                            className="w-full h-9 text-xs border-red-200 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                            Supprimer
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )
            })}
          </div>
          </div>
          )}

          {viewMode === 'list' && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-x-auto">
              <table className="min-w-[1200px] w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left px-4 py-3">Photo</th>
                    <th className="text-left px-4 py-3">Matricule contrat</th>
                    <th className="text-center px-4 py-3">Statut</th>
                    <th className="text-left px-4 py-3">Type</th>
                    <th className="text-left px-4 py-3">Nom</th>
                    <th className="text-left px-4 py-3">Prénom</th>
                    <th className="text-left px-4 py-3">Matricule</th>
                    <th className="text-left px-4 py-3">Contacts</th>
                    <th className="text-left px-4 py-3">Contact urgent</th>
                    <th className="text-right px-4 py-3">Montant</th>
                    <th className="text-right px-4 py-3">Versé</th>
                    <th className="text-right px-4 py-3">Reste</th>
                    <th className="text-right px-4 py-3">Prochaine échéance</th>
                    <th className="text-left px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {currentContrats.map((contract) => (
                    <tr key={contract.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3">
                        <Avatar className="size-9 border border-gray-200 shadow-sm">
                          <AvatarFallback className="bg-slate-100 text-slate-600 font-semibold text-xs">
                            {`${(contract.clientFirstName || '')[0] || ''}${(contract.clientLastName || '')[0] || ''}`.toUpperCase() || '—'}
                          </AvatarFallback>
                        </Avatar>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-900 break-all">{contract.id}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(contract.status)}`}>
                          {getStatusLabel(contract.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">{getCreditTypeLabel(contract.creditType)}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{contract.clientLastName || '—'}</td>
                      <td className="px-4 py-3 text-gray-700">{contract.clientFirstName || '—'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-900 break-all">{contract.clientId || '—'}</td>
                      <td className="px-4 py-3 text-xs break-all">{contract.clientContacts?.length ? contract.clientContacts.join(' / ') : '—'}</td>
                      <td className="px-4 py-3 text-xs">
                        {contract.emergencyContact ? (
                          <div>
                            <div>{contract.emergencyContact.lastName || '—'} {contract.emergencyContact.firstName || ''}</div>
                            <div>{contract.emergencyContact.phone1 || '—'}</div>
                          </div>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-green-700">{contract.amount.toLocaleString('fr-FR')} FCFA</td>
                      <td className="px-4 py-3 text-right">{contract.amountPaid.toLocaleString('fr-FR')} FCFA</td>
                      <td className="px-4 py-3 text-right font-medium text-orange-600">{Math.round(contract.amountRemaining).toLocaleString('fr-FR')} FCFA</td>
                      <td className="px-4 py-3 text-right text-gray-700">
                        {contract.nextDueAt ? (contract.nextDueAt instanceof Date ? contract.nextDueAt.toLocaleDateString('fr-FR') : new Date(contract.nextDueAt).toLocaleDateString('fr-FR')) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full data-[state=open]:bg-gray-100" title="Actions">
                                <MoreVertical className="h-4 w-4 text-gray-600" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="min-w-[200px]">
                              <DropdownMenuItem
                                onClick={() => {
                                  if (!canOpenContractDetail(contract)) return
                                  router.push(`${normalizedContractDetailsBasePath}/${contract.id}`)
                                }}
                                disabled={!canOpenContractDetail(contract)}
                                className="cursor-pointer"
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Ouvrir
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setSelectedContractForOverview(contract)}
                                className="cursor-pointer"
                              >
                                <User className="h-4 w-4 mr-2" />
                                Voir toutes les infos
                              </DropdownMenuItem>
                              {!['DISCHARGED', 'CLOSED'].includes(contract.status) && (
                                <DropdownMenuItem
                                  onClick={contract.contractUrl
                                    ? () => openCreditDocument(contract, contract.contractUrl, 'CONTRAT', 'Contrat')
                                    : () => { setSelectedContractForPDF(contract); setShowContractPDFModal(true) }}
                                  className="cursor-pointer"
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Télécharger contrat
                                </DropdownMenuItem>
                              )}
                              {contract.signedContractUrl && (
                                <DropdownMenuItem onClick={() => openCreditDocument(contract, contract.signedContractUrl, 'CONTRAT_SIGNE', 'Contrat signé')} className="cursor-pointer">
                                  <Eye className="h-4 w-4 mr-2" />
                                  Voir contrat
                                </DropdownMenuItem>
                              )}
                              {canViewRepaymentContract(contract) && (
                                <DropdownMenuItem onClick={() => openCreditDocument(contract, contract.signedQuittanceUrl, 'QUITTANCE', 'Contrat de remboursement')} className="cursor-pointer">
                                  <Eye className="h-4 w-4 mr-2" />
                                  Contrat de remboursement
                                </DropdownMenuItem>
                              )}
                              {canUploadSignedContract(contract) && (
                                <DropdownMenuItem onClick={() => { setSelectedContractForUpload(contract); setShowUploadModal(true) }} className="cursor-pointer">
                                  <Upload className="h-4 w-4 mr-2" />
                                  {contract.status === 'PENDING' ? 'Téléverser contrat signé' : 'Téléverser nouveau contrat signé'}
                                </DropdownMenuItem>
                              )}
                              {canReplaceSignedContract(contract) && (
                                <DropdownMenuItem onClick={() => { setSelectedContractForReplace(contract); setReplaceFile(undefined); setShowReplaceModal(true) }} className="cursor-pointer">
                                  <FileText className="h-4 w-4 mr-2" />
                                  Modifier contrat signé
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => { setSelectedContractForDelete(contract); setShowDeleteContractModal(true) }}
                                className="cursor-pointer text-red-700 focus:text-red-700"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))}
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
                  {(activeTab !== 'all' || hasActiveContractFilters(filters, { ignoreCreditType: isCreditTypeLocked }))
                    ? 'Essayez de modifier vos critères de recherche ou de réinitialiser les filtres.'
                    : 'Il n\'y a pas encore de contrats enregistrés dans le système.'
                  }
                </p>
              </div>
              <div className="flex justify-center space-x-4">
                {(activeTab !== 'all' || hasActiveContractFilters(filters, { ignoreCreditType: isCreditTypeLocked })) && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      handleResetFilters()
                      setActiveTab('all')
                    }}
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
    </div>

      {/* Modal récapitulatif complet du contrat */}
      {selectedContractForOverview && (
        <Dialog
          open={!!selectedContractForOverview}
          onOpenChange={(open) => {
            if (!open) setSelectedContractForOverview(null)
          }}
        >
          <DialogContent className="!w-[95vw] !max-w-[1200px] p-0 overflow-hidden border-0 shadow-2xl">
            {(() => {
              const contract = selectedContractForOverview
              const fullName = `${contract.clientFirstName || ''} ${contract.clientLastName || ''}`.trim() || 'Client non renseigné'
              const initials = `${(contract.clientFirstName || '')[0] || ''}${(contract.clientLastName || '')[0] || ''}`.toUpperCase() || 'CS'
              const contact1 = contract.clientContacts?.[0] || '—'
              const contact2 = contract.clientContacts?.[1] || '—'
              const emergency = contract.emergencyContact
              const hasSignedContract = Boolean(contract.signedContractUrl)
              const statusLabel = getStatusLabel(contract.status)
              const creditTypeLabel = getCreditTypeLabel(contract.creditType)

              return (
                <div className="bg-gradient-to-b from-white via-white to-slate-50/80 text-sm">
                  <DialogHeader className="border-b border-[#234D65]/15 bg-gradient-to-r from-[#234D65] via-[#285773] to-[#234D65] px-6 py-5 text-white">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <DialogTitle className="text-xl font-semibold tracking-tight text-white">Détails complets du contrat</DialogTitle>
                        <p className="mt-1 text-sm text-white/85">
                          Informations détaillées du contrat de crédit spéciale
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={cn('border text-xs font-semibold', getStatusColor(contract.status))}>
                          {statusLabel}
                        </Badge>
                        <Badge
                          className={cn(
                            'border text-xs font-semibold',
                            hasSignedContract
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-orange-200 bg-orange-50 text-orange-700'
                          )}
                        >
                          {hasSignedContract ? 'Contrat signé disponible' : 'Contrat signé à téléverser'}
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
                              <AvatarFallback className="rounded-xl bg-gradient-to-br from-[#234D65] to-[#2c5a73] text-white text-base font-semibold">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1 space-y-1">
                              <p className="truncate text-base font-semibold text-slate-900">{fullName}</p>
                              <p className="font-mono text-xs text-slate-500">{contract.clientId || 'Matricule non renseigné'}</p>
                              <div className="flex flex-wrap gap-2 pt-1">
                                <Badge className="border border-[#234D65]/25 bg-[#234D65]/10 text-[#234D65] hover:bg-[#234D65]/15">
                                  <User className="mr-1 h-3.5 w-3.5" />
                                  {creditTypeLabel}
                                </Badge>
                                <Badge className="border border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200">
                                  ID: {contract.id}
                                </Badge>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Contact principal</p>
                              <p className="mt-1 text-sm font-medium text-slate-800">{contact1}</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Contact secondaire</p>
                              <p className="mt-1 text-sm font-medium text-slate-800">{contact2}</p>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-[#234D65]/15 bg-white p-4 shadow-sm">
                          <div className="mb-3 flex items-center gap-2">
                            <Shield className="h-4 w-4 text-[#234D65]" />
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#234D65]">Garant</p>
                          </div>
                          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                            <p className="text-[11px] uppercase tracking-wide text-slate-500">Identité</p>
                            <p className="mt-1 font-medium text-slate-900">
                              {contract.guarantorId
                                ? `${contract.guarantorFirstName || ''} ${contract.guarantorLastName || ''}`.trim()
                                : 'Aucun garant'}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {contract.guarantorId
                                ? contract.guarantorIsMember ? 'Garant membre' : 'Garant externe'
                                : '—'}
                            </p>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-[#234D65]/15 bg-white p-4 shadow-sm">
                          <div className="mb-3 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-[#234D65]" />
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#234D65]">Contact urgent</p>
                          </div>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                              <p className="text-[11px] uppercase tracking-wide text-slate-500">Nom complet</p>
                              <p className="mt-1 font-medium text-slate-900">
                                {emergency ? `${emergency.lastName || '—'} ${emergency.firstName || ''}`.trim() : '—'}
                              </p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                              <p className="text-[11px] uppercase tracking-wide text-slate-500">Téléphone</p>
                              <p className="mt-1 font-medium text-slate-900">{emergency?.phone1 || '—'}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="rounded-2xl border border-[#234D65]/15 bg-white p-4 shadow-sm">
                          <div className="mb-3 flex items-center gap-2">
                            <FileText className="h-4 w-4 text-[#234D65]" />
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#234D65]">Montants</p>
                          </div>
                          <div className="grid grid-cols-1 gap-3">
                            <div className="rounded-xl bg-gradient-to-r from-[#234D65]/10 to-[#234D65]/5 px-3 py-2.5">
                              <p className="text-[11px] uppercase tracking-wide text-[#234D65]/80">Montant emprunté</p>
                              <p className="text-lg font-semibold text-[#234D65]">{(contract.amount || 0).toLocaleString('fr-FR')} FCFA</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
                              <p className="text-[11px] uppercase tracking-wide text-slate-500">Montant total</p>
                              <p className="text-base font-semibold text-slate-900">{(contract.totalAmount || 0).toLocaleString('fr-FR')} FCFA</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
                              <p className="text-[11px] uppercase tracking-wide text-slate-500">Mensualité</p>
                              <p className="text-base font-semibold text-slate-900">{(contract.monthlyPaymentAmount || 0).toLocaleString('fr-FR')} FCFA</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
                              <p className="text-[11px] uppercase tracking-wide text-slate-500">Déjà versé</p>
                              <p className="text-base font-semibold text-slate-900">{(contract.amountPaid || 0).toLocaleString('fr-FR')} FCFA</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
                              <p className="text-[11px] uppercase tracking-wide text-slate-500">Reste à payer</p>
                              <p className="text-base font-semibold text-slate-900">{Math.round(contract.amountRemaining || 0).toLocaleString('fr-FR')} FCFA</p>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-[#234D65]/15 bg-white p-4 shadow-sm">
                          <div className="mb-3 flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-[#234D65]" />
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#234D65]">Calendrier du contrat</p>
                          </div>
                          <div className="space-y-3">
                            <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
                              <p className="text-[11px] uppercase tracking-wide text-slate-500">Durée prévue</p>
                              <p className="text-base font-semibold text-slate-900">{contract.duration || 0} mois</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
                              <p className="text-[11px] uppercase tracking-wide text-slate-500">Première échéance</p>
                              <p className="text-base font-semibold text-slate-900">
                                {contract.firstPaymentDate ? new Date(contract.firstPaymentDate).toLocaleDateString('fr-FR') : '—'}
                              </p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
                              <p className="text-[11px] uppercase tracking-wide text-slate-500">Prochaine échéance</p>
                              <p className="text-base font-semibold text-slate-900">
                                {contract.nextDueAt ? new Date(contract.nextDueAt).toLocaleDateString('fr-FR') : '—'}
                              </p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
                              <p className="text-[11px] uppercase tracking-wide text-slate-500">Date de création</p>
                              <p className="text-base font-semibold text-slate-900">
                                {contract.createdAt ? new Date(contract.createdAt).toLocaleDateString('fr-FR') : '—'}
                              </p>
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

      {/* Modal de téléversement de contrat */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="sm:max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Téléverser le contrat signé
            </DialogTitle>
            <DialogDescription>
              {isUploadActivationFlow
                ? 'Téléversez le contrat signé par le client. Le contrat sera automatiquement activé après l\'upload.'
                : 'Téléversez le nouveau contrat signé par le client après augmentation du crédit.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedContractForUpload && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Contrat :</strong> #{selectedContractForUpload.id.slice(-6)} - {selectedContractForUpload.clientFirstName} {selectedContractForUpload.clientLastName}
                </p>
              </div>
            )}
            
            <div>
              <Label htmlFor="contractFile" className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Fichier du contrat signé (PDF) *
              </Label>
              <Input
                id="contractFile"
                type="file"
                accept="application/pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    setContractFile(file)
                  }
                }}
                disabled={uploadSignedContract.isPending}
                required
              />
              {contractFile && (
                <div className="mt-2 text-sm text-gray-600">
                  Fichier sélectionné : {contractFile.name} ({(contractFile.size / 1024).toFixed(2)} KB)
                </div>
              )}
            </div>

            {isUploadActivationFlow && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note :</strong> Après l'upload, le contrat sera automatiquement activé et les fonds seront considérés comme remis au client.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowUploadModal(false)
                setContractFile(undefined)
                setSelectedContractForUpload(null)
              }}
              disabled={uploadSignedContract.isPending}
            >
              Annuler
            </Button>
            <Button
              onClick={async () => {
                if (!contractFile || !selectedContractForUpload) {
                  toast.error('Veuillez sélectionner un fichier')
                  return
                }

                try {
                  await uploadSignedContract.mutateAsync({
                    contractId: selectedContractForUpload.id,
                    signedContractFile: contractFile,
                  })
                  setShowUploadModal(false)
                  setContractFile(undefined)
                  setSelectedContractForUpload(null)
                  toast.success(
                    isUploadActivationFlow
                      ? 'Contrat signé uploadé et contrat activé avec succès'
                      : 'Nouveau contrat signé téléversé avec succès'
                  )
                } catch (error: any) {
                  toast.error(error?.message || 'Erreur lors de l\'upload du contrat signé')
                }
              }}
              disabled={!contractFile || uploadSignedContract.isPending}
              className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65]"
            >
              {uploadSignedContract.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Upload en cours...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  {isUploadActivationFlow ? 'Uploader et activer' : 'Uploader le contrat signé'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de remplacement du contrat signé */}
      <Dialog open={showReplaceModal} onOpenChange={setShowReplaceModal}>
        <DialogContent className="sm:max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Modifier le contrat signé
            </DialogTitle>
            <DialogDescription>
              Le fichier précédent sera remplacé par le nouveau PDF. Le statut du contrat ne change pas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedContractForReplace && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  <strong>Contrat :</strong> #{selectedContractForReplace.id.slice(-6)} - {selectedContractForReplace.clientFirstName} {selectedContractForReplace.clientLastName}
                </p>
              </div>
            )}
            <div>
              <Label htmlFor="replaceFile" className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Nouveau fichier du contrat signé (PDF) *
              </Label>
              <Input
                id="replaceFile"
                type="file"
                accept="application/pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) setReplaceFile(file)
                }}
                disabled={replaceSignedContract.isPending}
              />
              {replaceFile && (
                <div className="mt-2 text-sm text-gray-600">
                  Fichier sélectionné : {replaceFile.name} ({(replaceFile.size / 1024).toFixed(2)} KB)
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowReplaceModal(false)
                setReplaceFile(undefined)
                setSelectedContractForReplace(null)
              }}
              disabled={replaceSignedContract.isPending}
            >
              Annuler
            </Button>
            <Button
              onClick={async () => {
                if (!replaceFile || !selectedContractForReplace) {
                  toast.error('Veuillez sélectionner un fichier')
                  return
                }
                try {
                  await replaceSignedContract.mutateAsync({
                    contractId: selectedContractForReplace.id,
                    file: replaceFile,
                  })
                  setShowReplaceModal(false)
                  setReplaceFile(undefined)
                  setSelectedContractForReplace(null)
                } catch (error: any) {
                  toast.error(error?.message || 'Erreur lors du remplacement du contrat signé')
                }
              }}
              disabled={!replaceFile || replaceSignedContract.isPending}
              className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65]"
            >
              {replaceSignedContract.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Remplacement en cours...
                </>
              ) : (
                'Remplacer'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedContractForPDF && (
        <CreditSpecialeContractPDFModal
          isOpen={showContractPDFModal}
          onClose={() => {
            setShowContractPDFModal(false)
            setSelectedContractForPDF(null)
          }}
          contract={selectedContractForPDF}
        />
      )}
      <DocumentViewerModal
        isOpen={!!viewerDoc}
        onClose={() => setViewerDoc(null)}
        url={viewerDoc?.url}
        filename={viewerDoc?.filename ?? 'document.pdf'}
        title={viewerDoc?.title ?? 'Document'}
        subtitle={viewerDoc?.subtitle}
      />
      <DeleteCreditContractModal
        isOpen={showDeleteContractModal}
        onClose={() => {
          setShowDeleteContractModal(false)
          setSelectedContractForDelete(null)
        }}
        contract={selectedContractForDelete}
        onSuccess={() => {
          setShowDeleteContractModal(false)
          setSelectedContractForDelete(null)
        }}
      />
    </>
  )
}

export default ListContrats
