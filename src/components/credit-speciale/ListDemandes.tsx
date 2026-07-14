'use client'

import { useMyAccess } from '@/hooks/useMyAccess'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ListPagination } from '@/components/ui/list-pagination'
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import MemberSearchInput from '@/components/vehicule/MemberSearchInput'
import routes from '@/constantes/routes'
import CreditFixeSimulationModal from '@/domains/financial/credit-speciale/fixe/simulation/components/CreditFixeSimulationModal'
import { useCreditDemandesRealtimeSync } from '@/hooks/credit-speciale/useCreditDemandesRealtimeSync'
import { useCreditContractMutations, useCreditDemands, useCreditDemandsStats } from '@/hooks/useCreditSpeciale'
import { useMember } from '@/hooks/useMembers'
import { cn } from '@/lib/utils'
import type { CreditDemandFilters } from '@/repositories/credit-speciale/ICreditDemandRepository'
import type { CustomSimulation, StandardSimulation } from '@/types/types'
import { CreditDemand, CreditDemandStatus, CreditType } from '@/types/types'
import {
    AlertCircle,
    Calculator,
    CheckCircle,
    ChevronDown,
    Clock,
    Download,
    Edit,
    Eye,
    FileText,
    Filter,
    Grid3X3,
    List,
    Loader2,
    MoreVertical,
    Plus,
    RefreshCw,
    RotateCcw,
    Search,
    Trash2,
    XCircle,
} from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import React, { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import ContractCreationModal from './ContractCreationModal'
import CreateCreditDemandModal from './CreateCreditDemandModal'
import CreditSimulationModal from './CreditSimulationModal'
import DeleteCreditDemandModal from './DeleteCreditDemandModal'
import EditCreditDemandModal from './EditCreditDemandModal'
import ReopenDemandModal from './ReopenDemandModal'
import StatisticsCreditDemandes from './StatisticsCreditDemandes'
import ValidateDemandModal from './ValidateDemandModal'

type ViewMode = 'grid' | 'list'
type DemandTab = 'all' | 'pending' | 'approved' | 'rejected'
type CreditTypeFilter = CreditType | 'all'

/** Carousel de badges pour les onglets (vue mobile), comme credit-fixe/simulation et caisse-speciale/demandes */
function DemandTabBadgesCarousel({
  value,
  onChange,
  stats,
}: {
  value: DemandTab
  onChange: (tab: DemandTab) => void
  stats: { total: number; pending: number; approved: number; rejected: number }
}) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!scrollRef.current) return
    const activeEl = scrollRef.current.querySelector(`[data-value="${value}"]`)
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [value])

  const tabs: { value: DemandTab; label: string; icon: React.ReactNode; count: number }[] = [
    { value: 'all', label: 'Toutes', icon: <FileText className="w-4 h-4" />, count: stats.total },
    { value: 'pending', label: 'En attente', icon: <Clock className="w-4 h-4" />, count: stats.pending },
    { value: 'approved', label: 'Approuvées', icon: <CheckCircle className="w-4 h-4" />, count: stats.approved },
    { value: 'rejected', label: 'Rejetées', icon: <XCircle className="w-4 h-4" />, count: stats.rejected },
  ]

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto no-scrollbar py-1 px-1 touch-pan-x"
        style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
      >
        {tabs.map((tab) => {
          const isActive = value === tab.value
          return (
            <button
              key={tab.value}
              type="button"
              data-value={tab.value}
              onClick={() => onChange(tab.value)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-full border-2 font-medium text-sm whitespace-nowrap transition-all duration-200 shrink-0',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-kara-primary-dark',
                'active:scale-95',
                isActive
                  ? 'bg-kara-primary-dark text-white border-kara-primary-dark shadow-lg shadow-kara-primary-dark/20'
                  : 'bg-gray-100 text-gray-700 border-gray-200',
                isActive && 'scale-105'
              )}
              style={{ scrollSnapAlign: 'center' }}
            >
              {tab.icon}
              <span>{tab.label}</span>
              <span className={cn('ml-1 px-2 py-0.5 rounded-full text-xs font-bold min-w-[24px] text-center', isActive ? 'bg-white/30' : 'bg-white/80 text-gray-700')}>
                {tab.count > 99 ? '99+' : tab.count}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface DemandFiltersState {
  search: string
  status: CreditDemandStatus | 'all'
  creditType: CreditTypeFilter
  guarantorId: string
  dateFrom: string
  dateTo: string
  updatedAtFrom: string
  updatedAtTo: string
  desiredDateFrom: string
  desiredDateTo: string
  amountMin: string
  amountMax: string
  monthlyAmountMin: string
  monthlyAmountMax: string
}


/** Module de permission correspondant au type de crédit d'une demande. */
function creditPermissionModule(creditType?: string): string {
  if (creditType === 'FIXE') return 'creditFixe'
  if (creditType === 'AIDE') return 'creditAide'
  return 'creditSpeciale'
}

interface ListDemandesProps {
  forcedCreditType?: CreditType
  demandDetailsBasePath?: string
}

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
const DemandFilters = ({
  filters,
  onFiltersChange,
  onReset,
  onRefresh,
  isRefreshing = false,
  onStatusChange,
  activeTab,
  showCreditTypeFilter,
}: {
  filters: DemandFiltersState
  onFiltersChange: (filters: DemandFiltersState) => void
  onReset: () => void
  onRefresh?: () => void
  isRefreshing?: boolean
  onStatusChange?: (status: CreditDemandStatus | 'all') => void
  activeTab: DemandTab
  showCreditTypeFilter: boolean
}) => {
  const { data: selectedGuarantor } = useMember(filters.guarantorId)
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false)

  const activeFiltersCount = React.useMemo(() => {
    let count = 0
    if (filters.search !== '') count += 1
    if (filters.status !== 'all') count += 1
    if (showCreditTypeFilter && filters.creditType !== 'all') count += 1
    if (filters.guarantorId !== '') count += 1
    if (filters.dateFrom !== '') count += 1
    if (filters.dateTo !== '') count += 1
    if (filters.updatedAtFrom !== '') count += 1
    if (filters.updatedAtTo !== '') count += 1
    if (filters.desiredDateFrom !== '') count += 1
    if (filters.desiredDateTo !== '') count += 1
    if (filters.amountMin !== '') count += 1
    if (filters.amountMax !== '') count += 1
    if (filters.monthlyAmountMin !== '') count += 1
    if (filters.monthlyAmountMax !== '') count += 1
    return count
  }, [filters, showCreditTypeFilter])

  const activeAdvancedFiltersCount = React.useMemo(() => {
    let count = 0
    if (filters.guarantorId !== '') count += 1
    if (filters.dateFrom !== '') count += 1
    if (filters.dateTo !== '') count += 1
    if (filters.updatedAtFrom !== '') count += 1
    if (filters.updatedAtTo !== '') count += 1
    if (filters.desiredDateFrom !== '') count += 1
    if (filters.desiredDateTo !== '') count += 1
    if (filters.amountMin !== '') count += 1
    if (filters.amountMax !== '') count += 1
    if (filters.monthlyAmountMin !== '') count += 1
    if (filters.monthlyAmountMax !== '') count += 1
    return count
  }, [
    filters.guarantorId,
    filters.dateFrom,
    filters.dateTo,
    filters.updatedAtFrom,
    filters.updatedAtTo,
    filters.desiredDateFrom,
    filters.desiredDateTo,
    filters.amountMin,
    filters.amountMax,
    filters.monthlyAmountMin,
    filters.monthlyAmountMax,
  ])

  return (
    <Card className="relative overflow-hidden border border-slate-200/80 bg-white shadow-md">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#234D65] via-[#2c5a73] to-[#cbb171]" />
      <CardContent className="space-y-4 p-4 md:p-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-gradient-to-br from-[#234D65] to-[#2c5a73] p-2.5 shadow-sm">
              <Filter className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">Filtres et recherche</h3>
                {activeFiltersCount > 0 && (
                  <Badge className="rounded-full bg-[#234D65]/10 px-2.5 py-0.5 text-xs font-semibold text-[#234D65] border border-[#234D65]/20">
                    {activeFiltersCount} filtre{activeFiltersCount > 1 ? 's' : ''} actif{activeFiltersCount > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-slate-600">
                Recherche rapide en haut, critères numériques dans les filtres avancés.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="h-10 rounded-xl border-2 border-[#234D65]/40 text-[#234D65] hover:bg-[#234D65] hover:text-white"
              >
                <RefreshCw className={cn('mr-2 h-4 w-4', isRefreshing && 'animate-spin')} />
                Actualiser
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              className="h-10 rounded-xl border-2 border-slate-200 text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            >
              Réinitialiser
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFiltersExpanded((prev) => !prev)}
              className={cn(
                'h-10 rounded-xl border-2 transition-colors',
                isFiltersExpanded
                  ? 'border-[#234D65] bg-[#234D65] text-white hover:bg-[#2c5a73]'
                  : 'border-slate-200 bg-white text-[#234D65] hover:bg-[#234D65]/5'
              )}
            >
              Filtres avancés
              {activeAdvancedFiltersCount > 0 ? ` (${activeAdvancedFiltersCount})` : ''}
              <ChevronDown className={cn('ml-2 h-4 w-4 transition-transform', isFiltersExpanded ? 'rotate-180' : '')} />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-1.5 xl:col-span-2">
            <Label className="text-xs font-semibold text-slate-500">Recherche</Label>
            <div className="relative group">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-[#234D65]" />
              <Input
                placeholder="ID, client, contact..."
                value={filters.search}
                onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
                className="h-11 rounded-xl border-2 border-slate-200 bg-white pl-10 focus-visible:border-[#234D65] focus-visible:ring-0"
              />
            </div>
          </div>

          {activeTab === 'all' && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500">Statut</Label>
              <Select
                value={filters.status || 'all'}
                onValueChange={(value) => {
                  const newStatus = value as CreditDemandStatus | 'all'
                  onFiltersChange({ ...filters, status: newStatus })
                  if (onStatusChange) onStatusChange(newStatus)
                }}
              >
                <SelectTrigger className="h-11 rounded-xl border-2 border-slate-200 bg-white focus:border-[#234D65] focus:ring-0">
                  <SelectValue placeholder="Tous les statuts" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-2 border-slate-200 shadow-xl">
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="PENDING">En attente</SelectItem>
                  <SelectItem value="APPROVED">Approuvée</SelectItem>
                  <SelectItem value="REJECTED">Refusée</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {showCreditTypeFilter && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500">Type de crédit</Label>
              <Select
                value={filters.creditType || 'all'}
                onValueChange={(value) => onFiltersChange({ ...filters, creditType: value as CreditTypeFilter })}
              >
                <SelectTrigger className="h-11 rounded-xl border-2 border-slate-200 bg-white focus:border-[#234D65] focus:ring-0">
                  <SelectValue placeholder="Type de crédit" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-2 border-slate-200 shadow-xl">
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
          <div className="rounded-2xl border border-[#234D65]/15 bg-gradient-to-br from-[#234D65]/[0.04] via-white to-slate-50 p-4 md:p-5">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <div className="space-y-4 rounded-xl border border-slate-200/80 bg-white/80 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Montants</p>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-500">Montant du crédit (FCFA)</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      min="0"
                      placeholder="Min"
                      value={filters.amountMin}
                      onChange={(e) => onFiltersChange({ ...filters, amountMin: e.target.value })}
                      className="h-10 rounded-lg border-slate-200 bg-white focus-visible:ring-0 focus-visible:border-[#234D65]"
                    />
                    <Input
                      type="number"
                      min="0"
                      placeholder="Max"
                      value={filters.amountMax}
                      onChange={(e) => onFiltersChange({ ...filters, amountMax: e.target.value })}
                      className="h-10 rounded-lg border-slate-200 bg-white focus-visible:ring-0 focus-visible:border-[#234D65]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-500">Mensualité prévue (FCFA)</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      min="0"
                      placeholder="Min"
                      value={filters.monthlyAmountMin}
                      onChange={(e) => onFiltersChange({ ...filters, monthlyAmountMin: e.target.value })}
                      className="h-10 rounded-lg border-slate-200 bg-white focus-visible:ring-0 focus-visible:border-[#234D65]"
                    />
                    <Input
                      type="number"
                      min="0"
                      placeholder="Max"
                      value={filters.monthlyAmountMax}
                      onChange={(e) => onFiltersChange({ ...filters, monthlyAmountMax: e.target.value })}
                      className="h-10 rounded-lg border-slate-200 bg-white focus-visible:ring-0 focus-visible:border-[#234D65]"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 rounded-xl border border-slate-200/80 bg-white/80 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Dates</p>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-500">Garant</Label>
                  <div className="rounded-lg border border-slate-200 bg-white p-1.5 focus-within:border-[#234D65]">
                    <MemberSearchInput
                      value={filters.guarantorId || ''}
                      onChange={(memberId) => onFiltersChange({ ...filters, guarantorId: memberId })}
                      placeholder="Rechercher un garant..."
                      label=""
                      isRequired={false}
                      initialDisplayName={selectedGuarantor ? `${selectedGuarantor.firstName} ${selectedGuarantor.lastName}` : ''}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-500">Date de création</Label>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) => onFiltersChange({ ...filters, dateFrom: e.target.value })}
                      className="h-10 rounded-lg border-slate-200 bg-white focus-visible:ring-0 focus-visible:border-[#234D65]"
                    />
                    <Input
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) => onFiltersChange({ ...filters, dateTo: e.target.value })}
                      className="h-10 rounded-lg border-slate-200 bg-white focus-visible:ring-0 focus-visible:border-[#234D65]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-500">Date de modification</Label>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Input
                      type="date"
                      value={filters.updatedAtFrom}
                      onChange={(e) => onFiltersChange({ ...filters, updatedAtFrom: e.target.value })}
                      className="h-10 rounded-lg border-slate-200 bg-white focus-visible:ring-0 focus-visible:border-[#234D65]"
                    />
                    <Input
                      type="date"
                      value={filters.updatedAtTo}
                      onChange={(e) => onFiltersChange({ ...filters, updatedAtTo: e.target.value })}
                      className="h-10 rounded-lg border-slate-200 bg-white focus-visible:ring-0 focus-visible:border-[#234D65]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-500">Date souhaitée du crédit</Label>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Input
                      type="date"
                      value={filters.desiredDateFrom}
                      onChange={(e) => onFiltersChange({ ...filters, desiredDateFrom: e.target.value })}
                      className="h-10 rounded-lg border-slate-200 bg-white focus-visible:ring-0 focus-visible:border-[#234D65]"
                    />
                    <Input
                      type="date"
                      value={filters.desiredDateTo}
                      onChange={(e) => onFiltersChange({ ...filters, desiredDateTo: e.target.value })}
                      className="h-10 rounded-lg border-slate-200 bg-white focus-visible:ring-0 focus-visible:border-[#234D65]"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Composant principal
const ListDemandes = ({
  forcedCreditType,
  demandDetailsBasePath = routes.admin.creditSpecialeDemandes,
}: ListDemandesProps) => {
  useCreditDemandesRealtimeSync(true)
  const router = useRouter()
  const searchParams = useSearchParams()
  // Permissions fines (module selon le type de crédit de chaque demande).
  const { can } = useMyAccess()
  const isCreditTypeLocked = Boolean(forcedCreditType)
  const normalizedDetailsBasePath = demandDetailsBasePath.replace(/\/$/, '')

  const searchParamStatus = searchParams.get('status')
  const initialStatus: CreditDemandStatus | 'all' =
    searchParamStatus === 'PENDING' || searchParamStatus === 'APPROVED' || searchParamStatus === 'REJECTED'
      ? searchParamStatus
      : 'all'

  const searchParamCreditType = searchParams.get('creditType')
  const initialCreditType: CreditTypeFilter =
    searchParamCreditType === 'SPECIALE' || searchParamCreditType === 'FIXE' || searchParamCreditType === 'AIDE'
      ? searchParamCreditType
      : 'all'

  const searchParamTab = searchParams.get('tab')
  const initialTab: DemandTab =
    searchParamTab === 'pending' || searchParamTab === 'approved' || searchParamTab === 'rejected'
      ? searchParamTab
      : 'all'
  
  // Initialiser les états depuis l'URL
  const [filters, setFilters] = useState<DemandFiltersState>({
    search: searchParams.get('search') || '',
    status: initialStatus,
    creditType: forcedCreditType || initialCreditType,
    guarantorId: searchParams.get('guarantorId') || '',
    dateFrom: searchParams.get('dateFrom') || '',
    dateTo: searchParams.get('dateTo') || '',
    updatedAtFrom: searchParams.get('updatedAtFrom') || '',
    updatedAtTo: searchParams.get('updatedAtTo') || '',
    desiredDateFrom: searchParams.get('desiredDateFrom') || '',
    desiredDateTo: searchParams.get('desiredDateTo') || '',
    amountMin: searchParams.get('amountMin') || '',
    amountMax: searchParams.get('amountMax') || '',
    monthlyAmountMin: searchParams.get('monthlyAmountMin') || '',
    monthlyAmountMax: searchParams.get('monthlyAmountMax') || '',
  })
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1)
  const itemsPerPage = Number(searchParams.get('limit')) || 12
  const [viewMode, setViewMode] = useState<ViewMode>((searchParams.get('view') as ViewMode) || 'grid')
  const [activeTab, setActiveTab] = useState<DemandTab>(initialTab)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [validateModalState, setValidateModalState] = useState<{
    isOpen: boolean
    demand: CreditDemand | null
    action: 'approve' | 'reject'
  }>({
    isOpen: false,
    demand: null,
    action: 'approve',
  })
  const [reopenModalState, setReopenModalState] = useState<{
    isOpen: boolean
    demand: CreditDemand | null
  }>({
    isOpen: false,
    demand: null,
  })
  const [simulationModalState, setSimulationModalState] = useState<{
    isOpen: boolean
    demand: CreditDemand | null
  }>({
    isOpen: false,
    demand: null,
  })
  const [contractCreationState, setContractCreationState] = useState<{
    isOpen: boolean
    demand: CreditDemand | null
    simulation: StandardSimulation | CustomSimulation | null
  }>({
    isOpen: false,
    demand: null,
    simulation: null,
  })
  const [editModalState, setEditModalState] = useState<{
    isOpen: boolean
    demand: CreditDemand | null
  }>({ isOpen: false, demand: null })
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean
    demand: CreditDemand | null
  }>({ isOpen: false, demand: null })
  const [isExporting, setIsExporting] = useState(false)
  const { createFromDemand } = useCreditContractMutations()

  // Synchroniser l'URL avec l'état
  useEffect(() => {
    if (!forcedCreditType) return
    setFilters((prev) => {
      if (prev.creditType === forcedCreditType) return prev
      return { ...prev, creditType: forcedCreditType }
    })
  }, [forcedCreditType])

  // Synchroniser l'URL avec l'état
  useEffect(() => {
    const params = new URLSearchParams()
    if (filters.search) params.set('search', filters.search)
    if (filters.status !== 'all') params.set('status', filters.status)
    if (!isCreditTypeLocked && filters.creditType !== 'all') params.set('creditType', filters.creditType)
    if (filters.guarantorId) params.set('guarantorId', filters.guarantorId)
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
    if (filters.dateTo) params.set('dateTo', filters.dateTo)
    if (filters.updatedAtFrom) params.set('updatedAtFrom', filters.updatedAtFrom)
    if (filters.updatedAtTo) params.set('updatedAtTo', filters.updatedAtTo)
    if (filters.desiredDateFrom) params.set('desiredDateFrom', filters.desiredDateFrom)
    if (filters.desiredDateTo) params.set('desiredDateTo', filters.desiredDateTo)
    if (filters.amountMin) params.set('amountMin', filters.amountMin)
    if (filters.amountMax) params.set('amountMax', filters.amountMax)
    if (filters.monthlyAmountMin) params.set('monthlyAmountMin', filters.monthlyAmountMin)
    if (filters.monthlyAmountMax) params.set('monthlyAmountMax', filters.monthlyAmountMax)
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
  // Le filtre de statut dans le formulaire a la priorité sur l'onglet actif
  const getStatusFilter = () => {
    // Si un filtre de statut est défini dans le formulaire, l'utiliser
    if (filters.status && filters.status !== 'all') {
      return filters.status
    }
    // Sinon, utiliser l'onglet actif
    return activeTab === 'all' 
      ? 'all' 
      : activeTab === 'pending' 
        ? 'PENDING' 
        : activeTab === 'approved'
          ? 'APPROVED'
          : 'REJECTED'
  }

  const effectiveCreditType: CreditTypeFilter = forcedCreditType || filters.creditType

  const queryFilters: CreditDemandFilters = {
    status: getStatusFilter(),
    creditType: effectiveCreditType === 'all' ? 'all' : effectiveCreditType,
    search: filters.search || undefined,
    guarantorId: filters.guarantorId || undefined,
    dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
    dateTo: filters.dateTo ? new Date(filters.dateTo) : undefined,
  }

  const { data: demandes = [], isLoading, error } = useCreditDemands(queryFilters)
  
  // Stats globales (sans aucun filtre) pour les compteurs des tabs
  // Les compteurs doivent toujours afficher le total réel, indépendamment des filtres appliqués
  const globalStatsFilters: CreditDemandFilters = {
    status: 'all', // Pas de filtre de statut pour avoir toutes les stats
    ...(forcedCreditType ? { creditType: forcedCreditType } : {}),
  }
  const { data: statsData } = useCreditDemandsStats(globalStatsFilters)

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1)
  }, [
    filters.search,
    filters.status,
    filters.creditType,
    filters.guarantorId,
    filters.dateFrom,
    filters.dateTo,
    filters.updatedAtFrom,
    filters.updatedAtTo,
    filters.desiredDateFrom,
    filters.desiredDateTo,
    filters.amountMin,
    filters.amountMax,
    filters.monthlyAmountMin,
    filters.monthlyAmountMax,
    activeTab,
  ])

  // Gestionnaires d'événements
  const handleFiltersChange = (newFilters: DemandFiltersState) => {
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
      guarantorId: '',
      dateFrom: '',
      dateTo: '',
      updatedAtFrom: '',
      updatedAtTo: '',
      desiredDateFrom: '',
      desiredDateTo: '',
      amountMin: '',
      amountMax: '',
      monthlyAmountMin: '',
      monthlyAmountMax: '',
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

  const parseDateOnly = (value?: string | Date | null): Date | null => {
    if (!value) return null

    if (value instanceof Date) {
      return new Date(value.getFullYear(), value.getMonth(), value.getDate())
    }

    const trimmedValue = value.trim()
    if (!trimmedValue) return null

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmedValue)) {
      const [day, month, year] = trimmedValue.split('/').map(Number)
      return new Date(year, month - 1, day)
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)) {
      const [year, month, day] = trimmedValue.split('-').map(Number)
      return new Date(year, month - 1, day)
    }

    const parsedDate = new Date(trimmedValue)
    if (Number.isNaN(parsedDate.getTime())) return null
    return new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate())
  }

  const formatAmount = (amount?: number): string => {
    if (amount == null) return ''
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  }

  const buildExportRows = () => {
    return filteredDemandes.map((demande: CreditDemand) => [
      demande.id,
      getCreditTypeLabel(demande.creditType),
      `${demande.clientFirstName} ${demande.clientLastName}`,
      getStatusLabel(demande.status),
      formatAmount(demande.amount),
      demande.guarantorId ? `${demande.guarantorFirstName} ${demande.guarantorLastName}` : 'Aucun',
      demande.guarantorIsMember ? 'Oui' : 'Non',
      demande.createdAt ? new Date(demande.createdAt).toLocaleDateString('fr-FR') : '',
      demande.updatedAt ? new Date(demande.updatedAt).toLocaleDateString('fr-FR') : '',
    ])
  }

  const exportToExcel = async () => {
    if (isExporting) return
    if (!filteredDemandes || filteredDemandes.length === 0) {
      toast.error('Aucune demande à exporter')
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
        'Montant (FCFA)',
        'Garant',
        'Garant membre',
        'Date de création',
        'Dernière mise à jour',
      ]

      const tabLabel = activeTab === 'all' 
        ? 'Toutes' 
        : activeTab === 'pending' 
          ? 'En attente' 
          : activeTab === 'approved'
            ? 'Approuvées'
            : 'Rejetées'
      const exportModuleLabel = forcedCreditType
        ? `CRÉDIT ${getCreditTypeLabel(forcedCreditType).toUpperCase()}`
        : 'CRÉDIT SPÉCIALE'
      const sheetData = [
        [`LISTE DES DEMANDES DE ${exportModuleLabel}`],
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
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Demandes')
      
      const filename = `demandes_credit_${activeTab}_${new Date().toISOString().slice(0, 10)}.xlsx`
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
    if (isExporting) return
    if (!filteredDemandes || filteredDemandes.length === 0) {
      toast.error('Aucune demande à exporter')
      return
    }

    setIsExporting(true)
    try {
      const { jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default
      const doc = new jsPDF('landscape')

      // En-tête
      doc.setFontSize(16)
      const exportModuleLabel = forcedCreditType
        ? `Crédit ${getCreditTypeLabel(forcedCreditType)}`
        : 'Crédit Spéciale'
      doc.text(`Liste des Demandes de ${exportModuleLabel}`, 14, 14)
      doc.setFontSize(10)
      const tabLabel = activeTab === 'all' 
        ? 'Toutes' 
        : activeTab === 'pending' 
          ? 'En attente' 
          : activeTab === 'approved'
            ? 'Approuvées'
            : 'Rejetées'
      doc.text(`Onglet: ${tabLabel}`, 14, 20)
      doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 14, 24)
      doc.text(`Total: ${filteredDemandes.length} demande(s)`, 14, 28)

      const rows = buildExportRows()
      const headers = [
        'ID',
        'Type',
        'Client',
        'Statut',
        'Montant',
        'Garant',
        'Garant membre',
        'Date création',
        'Dernière MAJ',
      ]

      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 32,
        styles: { fontSize: 7, cellPadding: 1.5 },
        headStyles: { fillColor: [35, 77, 101], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        margin: { top: 32 },
      })

      const filename = `demandes_credit_${activeTab}_${new Date().toISOString().slice(0, 10)}.pdf`
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
  const getStatusColor = (status: CreditDemandStatus) => {
    const colors = {
      PENDING: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      APPROVED: 'bg-green-100 text-green-700 border-green-200',
      REJECTED: 'bg-red-100 text-red-700 border-red-200',
    }
    return colors[status] || colors.PENDING
  }

  const getStatusDot = (status: CreditDemandStatus) => {
    const dots: Record<string, { dot: string; text: string }> = {
      PENDING:  { dot: 'bg-amber-400',  text: 'text-amber-700'  },
      APPROVED: { dot: 'bg-green-500',  text: 'text-green-700'  },
      REJECTED: { dot: 'bg-red-400',    text: 'text-red-700'    },
    }
    return dots[status] || dots.PENDING
  }

  const getStatusLabel = (status: CreditDemandStatus) => {
    const labels = {
      PENDING: 'En attente',
      APPROVED: 'Approuvée',
      REJECTED: 'Refusée',
    }
    return labels[status] || status
  }

  const getCreditTypeLabel = (type: string) => {
    const labels = {
      SPECIALE: 'Spéciale',
      FIXE: 'Fixe',
      AIDE: 'Aide',
    }
    return labels[type as keyof typeof labels] || type
  }

  const filteredDemandes = React.useMemo(() => {
    const amountMin = filters.amountMin !== '' ? Number(filters.amountMin) : null
    const amountMax = filters.amountMax !== '' ? Number(filters.amountMax) : null
    const monthlyAmountMin = filters.monthlyAmountMin !== '' ? Number(filters.monthlyAmountMin) : null
    const monthlyAmountMax = filters.monthlyAmountMax !== '' ? Number(filters.monthlyAmountMax) : null

    const createdAtFrom = parseDateOnly(filters.dateFrom)
    const createdAtTo = parseDateOnly(filters.dateTo)
    const updatedAtFrom = parseDateOnly(filters.updatedAtFrom)
    const updatedAtTo = parseDateOnly(filters.updatedAtTo)
    const desiredDateFrom = parseDateOnly(filters.desiredDateFrom)
    const desiredDateTo = parseDateOnly(filters.desiredDateTo)

    return demandes.filter((demande) => {
      if (amountMin !== null && !Number.isNaN(amountMin) && Number(demande.amount || 0) < amountMin) return false
      if (amountMax !== null && !Number.isNaN(amountMax) && Number(demande.amount || 0) > amountMax) return false

      const monthlyAmount = Number(demande.monthlyPaymentAmount || 0)
      if (monthlyAmountMin !== null && !Number.isNaN(monthlyAmountMin) && monthlyAmount < monthlyAmountMin) return false
      if (monthlyAmountMax !== null && !Number.isNaN(monthlyAmountMax) && monthlyAmount > monthlyAmountMax) return false

      const createdAt = parseDateOnly(demande.createdAt)
      if (createdAtFrom && (!createdAt || createdAt < createdAtFrom)) return false
      if (createdAtTo && (!createdAt || createdAt > createdAtTo)) return false

      const updatedAt = parseDateOnly(demande.updatedAt)
      if (updatedAtFrom && (!updatedAt || updatedAt < updatedAtFrom)) return false
      if (updatedAtTo && (!updatedAt || updatedAt > updatedAtTo)) return false

      const desiredDate = parseDateOnly(demande.desiredDate)
      if (desiredDateFrom && (!desiredDate || desiredDate < desiredDateFrom)) return false
      if (desiredDateTo && (!desiredDate || desiredDate > desiredDateTo)) return false

      return true
    })
  }, [
    demandes,
    filters.amountMin,
    filters.amountMax,
    filters.monthlyAmountMin,
    filters.monthlyAmountMax,
    filters.dateFrom,
    filters.dateTo,
    filters.updatedAtFrom,
    filters.updatedAtTo,
    filters.desiredDateFrom,
    filters.desiredDateTo,
  ])
  const hasActiveFilters =
    filters.search !== '' ||
    filters.status !== 'all' ||
    (!isCreditTypeLocked && filters.creditType !== 'all') ||
    filters.guarantorId !== '' ||
    filters.dateFrom !== '' ||
    filters.dateTo !== '' ||
    filters.updatedAtFrom !== '' ||
    filters.updatedAtTo !== '' ||
    filters.desiredDateFrom !== '' ||
    filters.desiredDateTo !== '' ||
    filters.amountMin !== '' ||
    filters.amountMax !== '' ||
    filters.monthlyAmountMin !== '' ||
    filters.monthlyAmountMax !== ''

  // Pagination
  const totalPages = Math.ceil(filteredDemandes.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentDemandes = filteredDemandes.slice(startIndex, endIndex)

  // Stats
  const stats = React.useMemo(() => {
    if (statsData) {
      return {
        total: statsData.total,
        pending: statsData.pending,
        approved: statsData.approved,
        rejected: statsData.rejected,
        pendingPercentage: statsData.total > 0 ? (statsData.pending / statsData.total) * 100 : 0,
        approvedPercentage: statsData.total > 0 ? (statsData.approved / statsData.total) * 100 : 0,
        rejectedPercentage: statsData.total > 0 ? (statsData.rejected / statsData.total) * 100 : 0,
      }
    }
    return {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      pendingPercentage: 0,
      approvedPercentage: 0,
      rejectedPercentage: 0,
    }
  }, [statsData])

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
                Affichage {startIndex + 1}-{Math.min(endIndex, filteredDemandes.length)} sur{' '}
                {filteredDemandes.length} demandes
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
            Une erreur est survenue lors du chargement des demandes : {error instanceof Error ? error.message : 'Erreur inconnue'}
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
      {/* Statistiques */}
      <StatisticsCreditDemandes 
        status={
          activeTab === 'all' 
            ? undefined 
            : activeTab === 'pending' 
              ? 'PENDING' 
              : activeTab === 'approved'
                ? 'APPROVED'
                : 'REJECTED'
        }
        creditType={forcedCreditType}
      />

      {/* Filtres */}
      <DemandFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onReset={handleResetFilters}
        onRefresh={handleRefresh}
        isRefreshing={isLoading}
        activeTab={activeTab}
        showCreditTypeFilter={!isCreditTypeLocked}
        onStatusChange={(status) => {
          // Synchroniser l'onglet actif avec le filtre de statut
          if (status === 'all') {
            setActiveTab('all')
          } else if (status === 'PENDING') {
            setActiveTab('pending')
          } else if (status === 'APPROVED') {
            setActiveTab('approved')
          } else if (status === 'REJECTED') {
            setActiveTab('rejected')
          }
        }}
      />

      {/* Barre d'actions */}
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
                  Liste des Demandes
                </h2>
                <p className="font-medium text-gray-600">
                  {filteredDemandes.length.toLocaleString()} demande{filteredDemandes.length !== 1 ? 's' : ''} • Page {currentPage}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex w-full items-center rounded-xl border border-slate-200 bg-slate-100/80 p-1 sm:w-auto">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className={`h-10 flex-1 cursor-pointer rounded-lg px-4 transition-all duration-200 sm:flex-none ${
                    viewMode === 'grid'
                      ? 'bg-white text-[#234D65] shadow-sm hover:bg-white'
                      : 'text-slate-600 hover:bg-white hover:text-[#234D65]'
                  }`}
                >
                  <Grid3X3 className="mr-2 h-4 w-4" />
                  Grille
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className={`h-10 flex-1 cursor-pointer rounded-lg px-4 transition-all duration-200 sm:flex-none ${
                    viewMode === 'list'
                      ? 'bg-white text-[#234D65] shadow-sm hover:bg-white'
                      : 'text-slate-600 hover:bg-white hover:text-[#234D65]'
                  }`}
                >
                  <List className="mr-2 h-4 w-4" />
                  Liste
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
                    disabled={isExporting || filteredDemandes.length === 0}
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
                onClick={() => setIsCreateModalOpen(true)}
                className="h-10 w-full cursor-pointer rounded-xl border-0 bg-gradient-to-r from-[#234D65] to-[#2c5a73] px-4 text-white shadow-sm transition-all duration-200 hover:from-[#2c5a73] hover:to-[#234D65] hover:shadow-md sm:w-auto"
              >
                <Plus className="mr-2 h-4 w-4" />
                Nouvelle Demande
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {renderPagination()}

      {/* Tabs de statut (rattachés à la liste) */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as DemandTab)} className="w-full">
        {/* Tabs desktop : style onglets classeur */}
        <div className="hidden lg:flex items-center gap-2 border-b border-gray-200">
          <div className="min-w-0 flex-1">
            <TabsList className="relative flex h-auto w-full flex-nowrap gap-0.5 overflow-x-auto bg-transparent p-0 scrollbar-hide">
              <TabsTrigger
                value="all"
                className="shrink-0 min-w-[110px] rounded-b-none rounded-t-lg border-x border-t border-gray-200 bg-gray-50/70 px-3 py-2.5 text-sm font-semibold text-gray-600 transition-all hover:bg-gray-100 hover:text-[#234D65] data-[state=active]:z-10 data-[state=active]:border-[#234D65] data-[state=active]:bg-white data-[state=active]:text-[#234D65] data-[state=active]:shadow-none"
              >
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="whitespace-nowrap">Toutes</span>
                  <span className="ml-0.5 shrink-0 rounded-full bg-gray-200/80 px-1.5 py-0.5 text-[11px] font-semibold text-gray-700">
                    {stats.total}
                  </span>
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="pending"
                className="shrink-0 min-w-[110px] rounded-b-none rounded-t-lg border-x border-t border-gray-200 bg-gray-50/70 px-3 py-2.5 text-sm font-semibold text-gray-600 transition-all hover:bg-gray-100 hover:text-[#234D65] data-[state=active]:z-10 data-[state=active]:border-[#234D65] data-[state=active]:bg-white data-[state=active]:text-[#234D65] data-[state=active]:shadow-none"
              >
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span className="whitespace-nowrap">En attente</span>
                  <span className="ml-0.5 shrink-0 rounded-full bg-gray-200/80 px-1.5 py-0.5 text-[11px] font-semibold text-gray-700">
                    {stats.pending}
                  </span>
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="approved"
                className="shrink-0 min-w-[110px] rounded-b-none rounded-t-lg border-x border-t border-gray-200 bg-gray-50/70 px-3 py-2.5 text-sm font-semibold text-gray-600 transition-all hover:bg-gray-100 hover:text-[#234D65] data-[state=active]:z-10 data-[state=active]:border-[#234D65] data-[state=active]:bg-white data-[state=active]:text-[#234D65] data-[state=active]:shadow-none"
              >
                <span className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  <span className="whitespace-nowrap">Acceptées</span>
                  <span className="ml-0.5 shrink-0 rounded-full bg-gray-200/80 px-1.5 py-0.5 text-[11px] font-semibold text-gray-700">
                    {stats.approved}
                  </span>
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="rejected"
                className="shrink-0 min-w-[110px] rounded-b-none rounded-t-lg border-x border-t border-gray-200 bg-gray-50/70 px-3 py-2.5 text-sm font-semibold text-gray-600 transition-all hover:bg-gray-100 hover:text-[#234D65] data-[state=active]:z-10 data-[state=active]:border-[#234D65] data-[state=active]:bg-white data-[state=active]:text-[#234D65] data-[state=active]:shadow-none"
              >
                <span className="flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  <span className="whitespace-nowrap">Refusées</span>
                  <span className="ml-0.5 shrink-0 rounded-full bg-gray-200/80 px-1.5 py-0.5 text-[11px] font-semibold text-gray-700">
                    {stats.rejected}
                  </span>
                </span>
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* Badges carousel - Vue mobile et tablette */}
        <div className="lg:hidden">
          <DemandTabBadgesCarousel
            value={activeTab}
            onChange={(tab) => setActiveTab(tab)}
            stats={stats}
          />
        </div>
      </Tabs>

      {/* Liste des demandes */}
      {isLoading ? (
        <div className="rounded-b-2xl border-x border-b border-[#234D65]/20 bg-gradient-to-b from-[#234D65]/[0.04] to-slate-50/40 p-4 md:p-5">
          <div className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3'
              : 'space-y-4'
          }>
            {[...Array(itemsPerPage)].map((_, i) => (
              <ModernSkeleton key={i} viewMode={viewMode} />
            ))}
          </div>
        </div>
      ) : currentDemandes.length > 0 ? (
        <>
          {viewMode === 'grid' ? (
            <div className="rounded-b-2xl border-x border-b border-[#234D65]/20 bg-gradient-to-b from-[#234D65]/[0.04] to-slate-50/30 p-4 md:p-5">
              <div className="grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
              {currentDemandes.map((demande, index) => (
                <div
                  key={demande.id}
                  className="animate-in fade-in-0 slide-in-from-bottom-3 duration-500"
                  style={{ animationDelay: `${Math.min(index, 8) * 55}ms` }}
                >
                <Card
                  className="group relative flex h-full flex-col rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-200 hover:border-gray-200 hover:shadow-md"
                >
                  <CardContent className="p-6 relative z-10 flex-1 flex flex-col gap-4">
                    {/* Header : avatar + nom à gauche, statut dot + menu + type à droite */}
                    <div className="flex items-start justify-between gap-2">
                      {/* Nom pleine largeur ; le statut passe sous l'en-tête (il tronquait le nom). */}
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <Avatar className="size-9 shrink-0 rounded-xl">
                          <AvatarFallback className="rounded-xl bg-[#234D65] text-[11px] font-semibold text-white">
                            {`${(demande.clientFirstName || '')[0] || ''}${(demande.clientLastName || '')[0] || ''}`.toUpperCase() || 'CS'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-gray-900">
                            {`${demande.clientLastName || ''} ${demande.clientFirstName || ''}`.trim() || '—'}
                          </p>
                          <p className="truncate font-mono text-[11px] text-gray-400">#{demande.id}</p>
                          <span className={`mt-1 flex items-center gap-1.5 text-xs font-semibold ${getStatusDot(demande.status).text}`}>
                            <span className={`w-2 h-2 rounded-full shrink-0 ${getStatusDot(demande.status).dot}`} />
                            {getStatusLabel(demande.status)}
                          </span>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <div className="flex items-center gap-1">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0 opacity-80 transition-all group-hover:opacity-100"
                                title="Actions"
                              >
                                <MoreVertical className="h-4 w-4 text-[#234D65]" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="min-w-[190px]">
                              <DropdownMenuItem
                                onClick={() => router.push(`${normalizedDetailsBasePath}/${demande.id}`)}
                                className="cursor-pointer"
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Voir détails
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setEditModalState({ isOpen: true, demand: demande })}
                                disabled={demande.status !== 'PENDING'}
                                className="cursor-pointer"
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Modifier
                              </DropdownMenuItem>
                              {can(`${creditPermissionModule(demande.creditType)}.delete`) && (
<DropdownMenuItem
                                onClick={() => setDeleteModalState({ isOpen: true, demand: demande })}
                                className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Supprimer
                              </DropdownMenuItem>
)}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <span className="text-[10px] font-medium text-gray-400">
                          {getCreditTypeLabel(demande.creditType)}
                        </span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3 rounded-xl bg-gray-50 p-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Montant</p>
                        <p className="font-bold text-[#234D65] tabular-nums text-sm">
                          {demande.amount != null ? (
                            <>{demande.amount.toLocaleString('fr-FR')} <span className="text-[10px] font-normal text-gray-400">FCFA</span></>
                          ) : (
                            <span className="text-gray-400 font-normal text-xs">À définir</span>
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Date souhaitée</p>
                        <p className="text-sm font-medium text-gray-700">
                          {demande.desiredDate
                            ? new Date(demande.desiredDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                            : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Garant</p>
                        <p className="text-sm font-medium text-gray-700 truncate">
                          {demande.guarantorId
                            ? `${demande.guarantorFirstName || ''} ${demande.guarantorLastName || ''}`.trim() || '—'
                            : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Score</p>
                        <p className={cn("font-bold tabular-nums text-sm",
                          demande.score !== undefined && demande.score >= 8 ? "text-green-700" :
                          demande.score !== undefined && demande.score >= 5 ? "text-amber-700" :
                          demande.score !== undefined ? "text-red-700" :
                          "text-gray-400"
                        )}>
                          {demande.score !== undefined ? `${demande.score}/10` : 'N/A'}
                        </p>
                      </div>
                    </div>

                    {/* Actions alignées verticalement */}
                    <div className="pt-3 border-t border-gray-100 mt-auto flex flex-col gap-2">
                      {demande.status === 'PENDING' && can(`${creditPermissionModule(demande.creditType)}.validate`) && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => setValidateModalState({ isOpen: true, demand: demande, action: 'approve' })}
                            className="w-full h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approuver
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setValidateModalState({ isOpen: true, demand: demande, action: 'reject' })}
                            className="w-full h-9 text-xs border-red-200 text-red-600 hover:bg-red-50"
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Rejeter
                          </Button>
                        </>
                      )}
                      {demande.status === 'APPROVED' && (
                        demande.contractId ? (
                          <Badge className="w-full justify-center py-2 bg-green-100 text-green-700 border border-green-300">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Contrat déjà créé
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => setSimulationModalState({ isOpen: true, demand: demande })}
                            disabled={createFromDemand.isPending}
                            className="w-full h-9 bg-[#234D65] hover:bg-[#2c5a73] text-white text-sm font-semibold"
                          >
                            {createFromDemand.isPending ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                Création...
                              </>
                            ) : (
                              <>
                                <Calculator className="h-4 w-4 mr-1" />
                                Créer le contrat
                              </>
                            )}
                          </Button>
                        )
                      )}
                      {demande.status === 'REJECTED' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setReopenModalState({ isOpen: true, demand: demande })}
                          className="w-full h-9 text-xs border-blue-200 text-blue-600 hover:bg-blue-50"
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Réouvrir
                        </Button>
                      )}
                      <Button
                        onClick={() => router.push(`${normalizedDetailsBasePath}/${demande.id}`)}
                        className="w-full h-9 bg-[#234D65] hover:bg-[#2c5a73] text-white text-sm font-semibold"
                      >
                        <Eye className="h-4 w-4" />
                        Voir détails
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                </div>
              ))}
              </div>
            </div>
          ) : (
            <Card className="overflow-hidden rounded-t-none rounded-b-2xl border-x border-b border-[#234D65]/20 bg-gradient-to-b from-white to-slate-50/40 shadow-sm">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-[#234D65]/20 bg-gradient-to-r from-[#234D65]/10 via-[#234D65]/[0.06] to-transparent">
                        <TableHead className="min-w-[240px] font-semibold text-[#234D65]">Demande</TableHead>
                        <TableHead className="min-w-[220px] font-semibold text-[#234D65]">Client</TableHead>
                        <TableHead className="min-w-[170px] font-semibold text-[#234D65]">Montant / Date</TableHead>
                        <TableHead className="min-w-[180px] font-semibold text-[#234D65]">Garant</TableHead>
                        <TableHead className="min-w-[120px] font-semibold text-[#234D65]">Score</TableHead>
                        <TableHead className="min-w-[320px] font-semibold text-[#234D65]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentDemandes.map((demande) => (
                        <TableRow key={demande.id} className="align-top">
                          <TableCell>
                            <div className="space-y-2">
                              <p className="font-mono text-xs text-gray-700 break-all">#{demande.id}</p>
                              <div className="flex flex-wrap gap-1.5">
                                <Badge className="bg-blue-100 text-blue-700 border border-blue-200">
                                  {getCreditTypeLabel(demande.creditType)}
                                </Badge>
                                <Badge className={cn("border", getStatusColor(demande.status))}>
                                  {getStatusLabel(demande.status)}
                                </Badge>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-medium text-gray-900">{demande.clientLastName} {demande.clientFirstName}</p>
                              <p className="text-xs text-gray-500">{demande.clientContacts?.[0] || 'Sans contact'}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-semibold text-green-600">{demande.amount != null ? `${demande.amount.toLocaleString('fr-FR')} FCFA` : 'À définir'}</p>
                              <p className="text-xs text-gray-500">
                                {demande.desiredDate
                                  ? new Date(demande.desiredDate).toLocaleDateString('fr-FR', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: 'numeric'
                                    })
                                  : 'Date souhaitée: —'}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-gray-900">
                                {demande.guarantorId
                                  ? `${demande.guarantorLastName || ''} ${demande.guarantorFirstName || ''}`.trim()
                                  : '—'}
                              </p>
                              <p className="text-xs text-gray-500">
                                {demande.guarantorId
                                  ? (demande.guarantorIsMember ? 'Membre' : 'Externe')
                                  : 'Sans garant'}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={cn(
                              "font-bold text-xs px-2 py-1",
                              demande.score !== undefined && demande.score >= 8 ? "bg-green-100 text-green-700 border border-green-300" :
                              demande.score !== undefined && demande.score >= 5 ? "bg-yellow-100 text-yellow-700 border border-yellow-300" :
                              demande.score !== undefined ? "bg-red-100 text-red-700 border border-red-300" :
                              "bg-gray-100 text-gray-500 border border-gray-300"
                            )}>
                              {demande.score !== undefined ? `${demande.score}/10` : 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-2">
                              {demande.status === 'PENDING' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setEditModalState({ isOpen: true, demand: demande })}
                                    className="h-8 border-[#224D62] text-[#224D62] hover:bg-[#224D62] hover:text-white"
                                  >
                                    <Edit className="h-3.5 w-3.5 mr-1" />
                                    Modifier
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => setValidateModalState({ isOpen: true, demand: demande, action: 'approve' })}
                                    className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                                  >
                                    <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                    Approuver
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => setValidateModalState({ isOpen: true, demand: demande, action: 'reject' })}
                                    className="h-8 bg-red-600 hover:bg-red-700 text-white"
                                  >
                                    <XCircle className="h-3.5 w-3.5 mr-1" />
                                    Rejeter
                                  </Button>
                                </>
                              )}
                              {demande.status === 'APPROVED' && !demande.contractId && (
                                <Button
                                  size="sm"
                                  onClick={() => setSimulationModalState({ isOpen: true, demand: demande })}
                                  disabled={createFromDemand.isPending}
                                  className="h-8 bg-[#234D65] hover:bg-[#2c5a73] text-white"
                                >
                                  {createFromDemand.isPending ? (
                                    <>
                                      <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                                      Création...
                                    </>
                                  ) : (
                                    <>
                                      <Calculator className="h-3.5 w-3.5 mr-1" />
                                      Créer contrat
                                    </>
                                  )}
                                </Button>
                              )}
                              {demande.status === 'REJECTED' && (
                                <Button
                                  size="sm"
                                  onClick={() => setReopenModalState({ isOpen: true, demand: demande })}
                                  className="h-8 bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                                  Réouvrir
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setDeleteModalState({ isOpen: true, demand: demande })}
                                className="h-8 border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400"
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-1" />
                                Supprimer
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => router.push(`${normalizedDetailsBasePath}/${demande.id}`)}
                                className="h-8 border-[#224D62] text-[#224D62] hover:bg-[#224D62] hover:text-white"
                              >
                                <Eye className="h-3.5 w-3.5 mr-1" />
                                Voir détails
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {renderPagination()}
        </>
      ) : (
        <Card className="rounded-t-none rounded-b-2xl border-x border-b border-[#234D65]/20 bg-gradient-to-b from-white via-slate-50/40 to-[#234D65]/[0.05] shadow-sm">
          <CardContent className="text-center p-16">
            <div className="space-y-6">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center shadow-inner">
                <FileText className="h-10 w-10 text-gray-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Aucune demande trouvée
                </h3>
                <p className="text-gray-600 text-lg max-w-md mx-auto leading-relaxed">
                  {hasActiveFilters
                    ? 'Essayez de modifier vos critères de recherche ou de réinitialiser les filtres.'
                    : 'Il n\'y a pas encore de demandes enregistrées dans le système.'
                  }
                </p>
              </div>
              <div className="flex justify-center space-x-4">
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    onClick={handleResetFilters}
                    className="h-12 px-6 border-2 border-gray-300 hover:border-gray-400 transition-all duration-300 hover:scale-105"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Réinitialiser les filtres
                  </Button>
                )}
                <Button 
                  onClick={() => setIsCreateModalOpen(true)}
                  className="h-12 px-6 bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une demande
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal de création */}
      <CreateCreditDemandModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        initialCreditType={forcedCreditType}
        lockCreditType={isCreditTypeLocked}
      />

      {/* Modal de modification */}
      {editModalState.demand && (
        <EditCreditDemandModal
          isOpen={editModalState.isOpen}
          onClose={() => setEditModalState({ isOpen: false, demand: null })}
          demand={editModalState.demand}
          lockCreditType={isCreditTypeLocked}
        />
      )}

      {/* Modal de suppression */}
      {deleteModalState.demand && (
        <DeleteCreditDemandModal
          isOpen={deleteModalState.isOpen}
          onClose={() => setDeleteModalState({ isOpen: false, demand: null })}
          demand={deleteModalState.demand}
        />
      )}

      {/* Modal de validation/rejet */}
      <ValidateDemandModal
        isOpen={validateModalState.isOpen}
        onClose={() => setValidateModalState({ isOpen: false, demand: null, action: 'approve' })}
        demand={validateModalState.demand}
        action={validateModalState.action}
        onSuccess={() => {
          // Le cache React Query sera invalidé automatiquement par le hook
        }}
      />

      {/* Modal de réouverture */}
      <ReopenDemandModal
        isOpen={reopenModalState.isOpen}
        onClose={() => setReopenModalState({ isOpen: false, demand: null })}
        demand={reopenModalState.demand}
        onSuccess={() => {
          // Le cache React Query sera invalidé automatiquement par le hook
        }}
      />

      {/* Modal de simulation */}
      {simulationModalState.demand && (
        (simulationModalState.demand.creditType === 'FIXE' || simulationModalState.demand.creditType === 'AIDE') ? (
          <CreditFixeSimulationModal
            isOpen={simulationModalState.isOpen}
            onClose={() => setSimulationModalState({ isOpen: false, demand: null })}
            creditType={simulationModalState.demand.creditType}
            initialAmount={simulationModalState.demand.amount}
            lockAmount
            onSimulationComplete={(simulation: StandardSimulation | CustomSimulation) => {
              setSimulationModalState({ isOpen: false, demand: null })
              setContractCreationState({
                isOpen: true,
                demand: simulationModalState.demand,
                simulation,
              })
            }}
          />
        ) : (
          <CreditSimulationModal
            isOpen={simulationModalState.isOpen}
            onClose={() => setSimulationModalState({ isOpen: false, demand: null })}
            creditType={simulationModalState.demand.creditType}
            initialAmount={simulationModalState.demand.amount}
            initialMonthlyPayment={simulationModalState.demand.monthlyPaymentAmount}
            lockAmount
            onSimulationComplete={(simulation: StandardSimulation | CustomSimulation) => {
              // Fermer le modal de simulation et ouvrir le modal de création de contrat
              setSimulationModalState({ isOpen: false, demand: null })
              setContractCreationState({
                isOpen: true,
                demand: simulationModalState.demand,
                simulation,
              })
            }}
          />
        )
      )}

      {/* Modal de création de contrat multi-étapes */}
      {contractCreationState.demand && contractCreationState.simulation && (
        <ContractCreationModal
          isOpen={contractCreationState.isOpen}
          onClose={() => setContractCreationState({ isOpen: false, demand: null, simulation: null })}
          demand={contractCreationState.demand}
          simulation={contractCreationState.simulation}
          contractListPath={
            contractCreationState.demand.creditType === 'FIXE'
              ? routes.admin.creditFixeContrats
              : contractCreationState.demand.creditType === 'AIDE'
                ? routes.admin.creditAideContrats
                : routes.admin.creditSpecialeContrats
          }
        />
      )}
    </div>
  )
}

export default ListDemandes
