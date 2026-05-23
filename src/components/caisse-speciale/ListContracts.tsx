'use client'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import routes from '@/constantes/routes'
import { listRefunds } from '@/db/caisse/refunds.db'
import { useCaisseContracts, useCaisseContractsStats } from '@/domains/financial/caisse-speciale/contrats/hooks'
import { useCaisseSpecialeContractsRealtimeSync } from '@/hooks/caisse-speciale/useCaisseSpecialeContractsRealtimeSync'
import { useMembersByIds } from '@/domains/memberships/hooks'
import { useDebounce } from '@/hooks/useDebounce'
import { cn } from '@/lib/utils'
import {
    AlertCircle,
    BarChart3,
    Calendar,
    CheckCircle,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Clock,
    DollarSign,
    Download,
    Eye,
    FileEdit,
    FileText,
    Filter,
    Grid3X3,
    Users as GroupIcon,
    List,
    MoreVertical,
    Plus,
    RefreshCw,
    Search,
    Trash2,
    TrendingUp,
    Upload,
    User,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import React, { useEffect, useRef, useState } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import { toast } from 'sonner'
import CaisseSpecialePDFModal from './CaisseSpecialePDFModal'
import ContractPdfUploadModal from './ContractPdfUploadModal'
import DeleteCaisseSpecialeContractModal from './DeleteCaisseSpecialeContractModal'
import ReplaceCaisseSpecialeContractPdfModal from './ReplaceCaisseSpecialeContractPdfModal'
import ValidateMemberSignedCSModal from './ValidateMemberSignedCSModal'
import ViewUploadedContractModal from './ViewUploadedContractModal'

type ViewMode = 'grid' | 'list'

type CaisseSpecificType =
  | 'STANDARD'
  | 'JOURNALIERE'
  | 'LIBRE'
  | 'STANDARD_CHARITABLE'
  | 'JOURNALIERE_CHARITABLE'
  | 'LIBRE_CHARITABLE'

type GroupedCaisseTabValue = 'STANDARD_GROUP' | 'JOURNALIERE_GROUP' | 'LIBRE_GROUP'

type CaisseTypeTabValue =
  | 'all'
  | GroupedCaisseTabValue
  | 'overdue'
  | 'currentMonth'

type GroupedCaisseSubFilterValue = 'all' | CaisseSpecificType

type CaisseTypeTabItem = {
  value: CaisseTypeTabValue
  label: string
  icon: React.ComponentType<{ className?: string }>
  isDanger?: boolean
}

const GROUPED_CAISSE_TAB_VALUES: GroupedCaisseTabValue[] = [
  'STANDARD_GROUP',
  'JOURNALIERE_GROUP',
  'LIBRE_GROUP',
]

const isGroupedCaisseTab = (value: string): value is GroupedCaisseTabValue =>
  GROUPED_CAISSE_TAB_VALUES.includes(value as GroupedCaisseTabValue)

const isCaisseTypeTabValue = (value: string): value is CaisseTypeTabValue =>
  value === 'all' || value === 'overdue' || value === 'currentMonth' || isGroupedCaisseTab(value)

const GROUPED_CAISSE_TAB_TO_TYPES: Record<GroupedCaisseTabValue, [CaisseSpecificType, CaisseSpecificType]> = {
  STANDARD_GROUP: ['STANDARD', 'STANDARD_CHARITABLE'],
  JOURNALIERE_GROUP: ['JOURNALIERE', 'JOURNALIERE_CHARITABLE'],
  LIBRE_GROUP: ['LIBRE', 'LIBRE_CHARITABLE'],
}

type ContractRefundDocuments = {
  FINAL?: any
  EARLY?: any
}

const GROUPED_CAISSE_SUBFILTER_OPTIONS: Record<
  GroupedCaisseTabValue,
  { value: GroupedCaisseSubFilterValue; label: string }[]
> = {
  STANDARD_GROUP: [
    { value: 'all', label: 'Tous' },
    { value: 'STANDARD', label: 'Standard' },
    { value: 'STANDARD_CHARITABLE', label: 'Standard charitable' },
  ],
  JOURNALIERE_GROUP: [
    { value: 'all', label: 'Tous' },
    { value: 'JOURNALIERE', label: 'Journalier' },
    { value: 'JOURNALIERE_CHARITABLE', label: 'Journalier charitable' },
  ],
  LIBRE_GROUP: [
    { value: 'all', label: 'Tous' },
    { value: 'LIBRE', label: 'Libre' },
    { value: 'LIBRE_CHARITABLE', label: 'Libre charitable' },
  ],
}

// Hook personnalisé pour le carousel avec drag/swipe
const useCarousel = (itemCount: number, itemsPerView: number = 1) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [startPos, setStartPos] = useState(0)
  const [translateX, setTranslateX] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const maxIndex = Math.max(0, itemCount - itemsPerView)

  const goTo = (index: number) => {
    const clampedIndex = Math.max(0, Math.min(index, maxIndex))
    setCurrentIndex(clampedIndex)
    setTranslateX(-clampedIndex * (100 / itemsPerView))
  }

  const goNext = () => goTo(currentIndex + 1)
  const goPrev = () => goTo(currentIndex - 1)

  const handleStart = (clientX: number) => {
    setIsDragging(true)
    setStartPos(clientX)
  }
  const handleMove = (clientX: number) => {
    if (!isDragging || !containerRef.current) return
    const diff = clientX - startPos
    const containerWidth = containerRef.current.offsetWidth
    const percentage = (diff / containerWidth) * 100
    const maxDrag = 30
    const clampedPercentage = Math.max(-maxDrag, Math.min(maxDrag, percentage))
    setTranslateX(-currentIndex * (100 / itemsPerView) + clampedPercentage)
  }
  const handleEnd = () => {
    if (!isDragging || !containerRef.current) return
    const dragDistance = translateX + currentIndex * (100 / itemsPerView)
    const threshold = 15
    if (dragDistance > threshold && currentIndex > 0) {
      goPrev()
    } else if (dragDistance < -threshold && currentIndex < maxIndex) {
      goNext()
    } else {
      setTranslateX(-currentIndex * (100 / itemsPerView))
    }
    setIsDragging(false)
  }

  const handleMouseDown = (e: React.MouseEvent) => { e.preventDefault(); handleStart(e.clientX) }
  const handleMouseMove = (e: React.MouseEvent) => { handleMove(e.clientX) }
  const handleMouseUp = () => { handleEnd() }
  const handleTouchStart = (e: React.TouchEvent) => { handleStart(e.touches[0].clientX) }
  const handleTouchMove = (e: React.TouchEvent) => { handleMove(e.touches[0].clientX) }
  const handleTouchEnd = () => { handleEnd() }

  useEffect(() => {
    if (!isDragging) return
    const handleGlobalMouseMove = (e: MouseEvent) => handleMove(e.clientX)
    const handleGlobalMouseUp = () => handleEnd()
    document.addEventListener('mousemove', handleGlobalMouseMove)
    document.addEventListener('mouseup', handleGlobalMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove)
      document.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [isDragging, startPos, currentIndex, itemsPerView, translateX, handleEnd, handleMove])

  return {
    currentIndex,
    goTo,
    goNext,
    goPrev,
    canGoPrev: currentIndex > 0,
    canGoNext: currentIndex < maxIndex,
    translateX,
    containerRef,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    isDragging,
  }
}

// Composant pour les statistiques modernes
const StatsCard = ({
  title,
  value,
  subtitle,
  percentage,
  color,
  icon: Icon,
  trend
}: {
  title: string
  value: number | string
  subtitle?: string
  percentage: number
  color: string
  icon: React.ComponentType<any>
  trend?: 'up' | 'down' | 'neutral'
}) => {
  const data = [
    { name: 'value', value: percentage, fill: color },
    { name: 'remaining', value: 100 - percentage, fill: '#f3f4f6' }
  ]

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-white to-gray-50/50 border-0 shadow-md">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-xl bg-gradient-to-br transition-transform duration-300 group-hover:scale-110`} style={{ backgroundColor: `${color}15`, color: color }}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600 uppercase tracking-wider">{title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                {trend && (
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${trend === 'up' ? 'bg-green-100 text-green-700' :
                    trend === 'down' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                    <TrendingUp className={`w-3 h-3 ${trend === 'down' ? 'rotate-180' : ''}`} />
                    {percentage.toFixed(0)}%
                  </div>
                )}
              </div>
              {subtitle && (
                <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
              )}
            </div>
          </div>
          <div className="w-12 h-12">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={16}
                  outerRadius={22}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Composant Carrousel des statistiques avec drag/swipe
const StatsCarousel = ({ stats, totalPaidSum }: { stats: any; totalPaidSum: number }) => {
  const _formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF'
    }).format(amount)
  }

  const statsData = [
    { title: 'Total', value: stats.total, percentage: 100, color: '#6b7280', icon: FileText },
    { title: 'Montant Total', value: new Intl.NumberFormat('fr-FR').format(totalPaidSum || 0), percentage: 100, color: '#0ea5e9', icon: DollarSign, trend: 'up' as const },
    { title: 'Actifs', value: stats.active, percentage: stats.activePercentage, color: '#10b981', icon: CheckCircle, trend: 'up' as const },
    { title: 'En Retard', value: stats.late, percentage: stats.latePercentage, color: '#ef4444', icon: Clock, trend: stats.latePercentage > 20 ? 'up' as const : 'neutral' as const },
    { title: 'Individuels', value: stats.individual, percentage: stats.individualPercentage, color: '#3b82f6', icon: User, trend: 'neutral' as const },
    { title: 'Groupes', value: stats.group, percentage: stats.groupPercentage, color: '#8b5cf6', icon: GroupIcon, trend: 'neutral' as const },
    // Statistiques des tontines closes (toujours affichées même à 0)
    {
      title: 'Standard Closes',
      value: `${stats.closedStats?.STANDARD?.count || 0}`,
      percentage: 100,
      color: '#059669',
      icon: DollarSign,
      trend: 'up' as const
    },
    {
      title: 'Journalière Closes',
      value: `${stats.closedStats?.JOURNALIERE?.count || 0}`,
      percentage: 100,
      color: '#dc2626',
      icon: Calendar,
      trend: 'up' as const
    },
    {
      title: 'Libre Closes',
      value: `${stats.closedStats?.LIBRE?.count || 0}`,
      percentage: 100,
      color: '#7c3aed',
      icon: BarChart3,
      trend: 'up' as const
    },
  ]

  const [itemsPerView, setItemsPerView] = useState(1)
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth
      if (w >= 1280) setItemsPerView(4)
      else if (w >= 1024) setItemsPerView(3)
      else if (w >= 768) setItemsPerView(2)
      else setItemsPerView(1)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const { goNext, goPrev, canGoPrev, canGoNext, translateX, containerRef, handleMouseDown, handleTouchStart, handleTouchMove, handleTouchEnd, isDragging } = useCarousel(statsData.length, itemsPerView)

  return (
    <div className="relative">
      <div className="absolute top-1/2 -translate-y-1/2 left-0 z-10">
        <Button variant="outline" size="icon" className={cn('h-10 w-10 rounded-full bg-white/90 backdrop-blur-sm shadow-lg border-0 transition-all duration-300 cursor-pointer', canGoPrev ? 'hover:bg-white hover:scale-110 text-gray-700' : 'opacity-50 cursor-not-allowed')} onClick={goPrev} disabled={!canGoPrev}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
      </div>
      <div className="absolute top-1/2 -translate-y-1/2 right-0 z-10">
        <Button variant="outline" size="icon" className={cn('h-10 w-10 rounded-full bg-white/90 backdrop-blur-sm shadow-lg border-0 transition-all duration-300 cursor-pointer', canGoNext ? 'hover:bg-white hover:scale-110 text-gray-700' : 'opacity-50 cursor-not-allowed')} onClick={goNext} disabled={!canGoNext}>
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>
      <div ref={containerRef} className="ml-8 overflow-hidden py-2" onMouseDown={handleMouseDown} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
        <div className={cn('flex transition-transform duration-300 ease-out gap-4', isDragging && 'transition-none')} style={{ transform: `translateX(${translateX}%)`, cursor: isDragging ? 'grabbing' : 'grab' }}>
          {statsData.map((stat, index) => (
            <div key={index} className="flex-shrink-0" style={{ width: `calc(${100 / itemsPerView}% - ${(4 * (itemsPerView - 1)) / itemsPerView}rem)` }}>
              <StatsCard {...stat} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Composant skeleton moderne
const ModernSkeleton = ({ viewMode: _viewMode }: { viewMode: ViewMode }) => (
  <Card className="group animate-pulse border border-[#234D65]/15 bg-gradient-to-br from-white via-slate-50/60 to-[#234D65]/[0.03] shadow-sm">
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
}: {
  filters: any
  onFiltersChange: (filters: any) => void
  onReset: () => void
  activeTab: CaisseTypeTabValue
}) => {
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false)
  const safeFilters = {
    search: '',
    status: 'all',
    contractType: 'all',
    caisseType: 'all',
    createdAtFrom: undefined,
    createdAtTo: undefined,
    nextDueAtFrom: undefined,
    nextDueAtTo: undefined,
    overdueOnly: false,
    monthlyAmountMin: undefined,
    monthlyAmountMax: undefined,
    contractAmountMin: undefined,
    contractAmountMax: undefined,
    bonusAmountMin: undefined,
    bonusAmountMax: undefined,
    penaltiesAmountMin: undefined,
    penaltiesAmountMax: undefined,
    paidAmountMin: undefined,
    paidAmountMax: undefined,
    durationMonthsMin: undefined,
    durationMonthsMax: undefined,
    paymentCountMin: undefined,
    paymentCountMax: undefined,
    ...filters,
  }
  const isCreatedAtRangeActive = Boolean(safeFilters.createdAtFrom || safeFilters.createdAtTo)
  const isNextDueRangeActive = Boolean(safeFilters.nextDueAtFrom || safeFilters.nextDueAtTo)
  const isCaisseTabLocked = isGroupedCaisseTab(activeTab)
  const caisseTypeValue = isCaisseTabLocked ? 'all' : (safeFilters.caisseType || 'all')
  const isOverdueTab = activeTab === 'overdue'
  const isLateStatus =
    safeFilters.status === 'LATE_NO_PENALTY' || safeFilters.status === 'LATE_WITH_PENALTY'
  const statusValue = isOverdueTab
    ? (isLateStatus ? safeFilters.status : 'LATE_NO_PENALTY')
    : (safeFilters.status || 'all')

  const statusLabels: Record<string, string> = {
    all: 'Tous les statuts',
    ACTIVE: 'Actif',
    LATE_NO_PENALTY: 'Retard (J+0..3)',
    LATE_WITH_PENALTY: 'Retard (J+4..12)',
    RESCINDED: 'Cloture en urgence',
    CLOSED: 'Cloture finale',
  }
  const contractTypeLabels: Record<string, string> = {
    all: 'Tous les types',
    INDIVIDUAL: 'Individuels',
    GROUP: 'Groupes',
  }
  const caisseTypeLabels: Record<string, string> = {
    all: 'Tous les types de contrat',
    STANDARD: 'Standard',
    JOURNALIERE: 'Journalière',
    LIBRE: 'Libre',
    STANDARD_CHARITABLE: 'Standard Charitable',
    JOURNALIERE_CHARITABLE: 'Journalière Charitable',
    LIBRE_CHARITABLE: 'Libre Charitable',
  }

  const defaultStatusValue = isOverdueTab ? 'LATE_NO_PENALTY' : 'all'
  const hasCustomStatus = statusValue !== defaultStatusValue

  const activeFilterLabels = [
    safeFilters.search?.trim() ? `Recherche: ${safeFilters.search.trim()}` : null,
    hasCustomStatus ? `Statut: ${statusLabels[statusValue] || statusValue}` : null,
    safeFilters.contractType !== 'all'
      ? `Contrat: ${contractTypeLabels[safeFilters.contractType] || safeFilters.contractType}`
      : null,
    !isCaisseTabLocked && caisseTypeValue !== 'all'
      ? `Caisse: ${caisseTypeLabels[caisseTypeValue] || caisseTypeValue}`
      : null,
    isCreatedAtRangeActive ? 'Période de création' : null,
    isNextDueRangeActive ? 'Prochaine échéance' : null,
    !isOverdueTab && safeFilters.overdueOnly ? 'Retard uniquement' : null,
    typeof safeFilters.monthlyAmountMin === 'number' || typeof safeFilters.monthlyAmountMax === 'number'
      ? 'Montant à verser'
      : null,
    typeof safeFilters.contractAmountMin === 'number' || typeof safeFilters.contractAmountMax === 'number'
      ? 'Montant contrat'
      : null,
    typeof safeFilters.bonusAmountMin === 'number' || typeof safeFilters.bonusAmountMax === 'number'
      ? 'Montant bonus'
      : null,
    typeof safeFilters.penaltiesAmountMin === 'number' || typeof safeFilters.penaltiesAmountMax === 'number'
      ? 'Montant pénalité cumulée'
      : null,
    typeof safeFilters.paidAmountMin === 'number' || typeof safeFilters.paidAmountMax === 'number'
      ? 'Montant déjà versé'
      : null,
    typeof safeFilters.durationMonthsMin === 'number' || typeof safeFilters.durationMonthsMax === 'number'
      ? 'Durée contrat'
      : null,
    typeof safeFilters.paymentCountMin === 'number' || typeof safeFilters.paymentCountMax === 'number'
      ? 'Nombre de versements effectués'
      : null,
  ].filter(Boolean) as string[]

  const activeFiltersCount = activeFilterLabels.length
  const advancedFiltersCount = activeFilterLabels.filter(
    (label) =>
      label !== (safeFilters.search?.trim() ? `Recherche: ${safeFilters.search.trim()}` : '') &&
      label !== (hasCustomStatus ? `Statut: ${statusLabels[statusValue] || statusValue}` : '') &&
      label !== (!isCaisseTabLocked && caisseTypeValue !== 'all'
        ? `Caisse: ${caisseTypeLabels[caisseTypeValue] || caisseTypeValue}`
        : '') &&
      label !== (safeFilters.contractType !== 'all'
        ? `Contrat: ${contractTypeLabels[safeFilters.contractType] || safeFilters.contractType}`
        : '')
  ).length
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
          <div className="space-y-1.5 xl:col-span-5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recherche</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                placeholder="Nom, prénom ou matricule..."
                className={cn(controlClassName, 'pl-10')}
                value={safeFilters.search || ''}
                onChange={(e) => onFiltersChange({ ...safeFilters, search: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1.5 xl:col-span-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Statut</Label>
            <Select
              value={statusValue}
              onValueChange={(value) => onFiltersChange({ ...safeFilters, status: value })}
            >
              <SelectTrigger className={controlClassName}>
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                {!isOverdueTab && <SelectItem value="all">Tous les statuts</SelectItem>}
                {!isOverdueTab && <SelectItem value="ACTIVE">Actif</SelectItem>}
                <SelectItem value="LATE_NO_PENALTY">Retard (J+0..3)</SelectItem>
                <SelectItem value="LATE_WITH_PENALTY">Retard (J+4..12)</SelectItem>
                {!isOverdueTab && <SelectItem value="RESCINDED">Cloture en urgence</SelectItem>}
                {!isOverdueTab && <SelectItem value="CLOSED">Cloture finale</SelectItem>}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 xl:col-span-3">
            <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Type de caisse</Label>
            <Select
              value={caisseTypeValue}
              onValueChange={(value) => onFiltersChange({ ...safeFilters, caisseType: value })}
              disabled={isCaisseTabLocked}
            >
              <SelectTrigger className={cn(controlClassName, 'disabled:opacity-70')}>
                <SelectValue placeholder="Tous les types de contrat" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types de contrat</SelectItem>
                <SelectItem value="STANDARD">Standard</SelectItem>
                <SelectItem value="JOURNALIERE">Journalière</SelectItem>
                <SelectItem value="LIBRE">Libre</SelectItem>
                <SelectItem value="STANDARD_CHARITABLE">Standard Charitable</SelectItem>
                <SelectItem value="JOURNALIERE_CHARITABLE">Journalière Charitable</SelectItem>
                <SelectItem value="LIBRE_CHARITABLE">Libre Charitable</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 xl:col-span-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Profil contrat</Label>
            <Select
              value={safeFilters.contractType || 'all'}
              onValueChange={(value) => onFiltersChange({ ...safeFilters, contractType: value })}
            >
              <SelectTrigger className={controlClassName}>
                <SelectValue placeholder="Tous les profils" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="INDIVIDUAL">Individuels</SelectItem>
                <SelectItem value="GROUP">Groupes</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Montant à verser</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  min={0}
                  placeholder="Min"
                  className={miniInputClassName}
                  value={safeFilters.monthlyAmountMin ?? ''}
                  onChange={(e) =>
                    onFiltersChange({
                      ...safeFilters,
                      monthlyAmountMin: e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
                />
                <Input
                  type="number"
                  min={0}
                  placeholder="Max"
                  className={miniInputClassName}
                  value={safeFilters.monthlyAmountMax ?? ''}
                  onChange={(e) =>
                    onFiltersChange({
                      ...safeFilters,
                      monthlyAmountMax: e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Montant contrat</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  min={0}
                  placeholder="Min"
                  className={miniInputClassName}
                  value={safeFilters.contractAmountMin ?? ''}
                  onChange={(e) =>
                    onFiltersChange({
                      ...safeFilters,
                      contractAmountMin: e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
                />
                <Input
                  type="number"
                  min={0}
                  placeholder="Max"
                  className={miniInputClassName}
                  value={safeFilters.contractAmountMax ?? ''}
                  onChange={(e) =>
                    onFiltersChange({
                      ...safeFilters,
                      contractAmountMax: e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Montant bonus</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  min={0}
                  placeholder="Min"
                  className={miniInputClassName}
                  value={safeFilters.bonusAmountMin ?? ''}
                  onChange={(e) =>
                    onFiltersChange({
                      ...safeFilters,
                      bonusAmountMin: e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
                />
                <Input
                  type="number"
                  min={0}
                  placeholder="Max"
                  className={miniInputClassName}
                  value={safeFilters.bonusAmountMax ?? ''}
                  onChange={(e) =>
                    onFiltersChange({
                      ...safeFilters,
                      bonusAmountMax: e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Pénalité cumulée</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  min={0}
                  placeholder="Min"
                  className={miniInputClassName}
                  value={safeFilters.penaltiesAmountMin ?? ''}
                  onChange={(e) =>
                    onFiltersChange({
                      ...safeFilters,
                      penaltiesAmountMin: e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
                />
                <Input
                  type="number"
                  min={0}
                  placeholder="Max"
                  className={miniInputClassName}
                  value={safeFilters.penaltiesAmountMax ?? ''}
                  onChange={(e) =>
                    onFiltersChange({
                      ...safeFilters,
                      penaltiesAmountMax: e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
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
                  onChange={(e) =>
                    onFiltersChange({
                      ...safeFilters,
                      paidAmountMin: e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
                />
                <Input
                  type="number"
                  min={0}
                  placeholder="Max"
                  className={miniInputClassName}
                  value={safeFilters.paidAmountMax ?? ''}
                  onChange={(e) =>
                    onFiltersChange({
                      ...safeFilters,
                      paidAmountMax: e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
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
                  onChange={(e) =>
                    onFiltersChange({
                      ...safeFilters,
                      durationMonthsMin: e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
                />
                <Input
                  type="number"
                  min={0}
                  step={1}
                  placeholder="Max"
                  className={miniInputClassName}
                  value={safeFilters.durationMonthsMax ?? ''}
                  onChange={(e) =>
                    onFiltersChange({
                      ...safeFilters,
                      durationMonthsMax: e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Nombre de versements effectués</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  min={0}
                  step={1}
                  placeholder="Min"
                  className={miniInputClassName}
                  value={safeFilters.paymentCountMin ?? ''}
                  onChange={(e) =>
                    onFiltersChange({
                      ...safeFilters,
                      paymentCountMin: e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
                />
                <Input
                  type="number"
                  min={0}
                  step={1}
                  placeholder="Max"
                  className={miniInputClassName}
                  value={safeFilters.paymentCountMax ?? ''}
                  onChange={(e) =>
                    onFiltersChange({
                      ...safeFilters,
                      paymentCountMax: e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
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

// ─── STATUS META (grid card) ─────────────────────────────────────────────────
const STATUS_META_CS: Record<string, { label: string; dot: string; text: string }> = {
  ACTIVE:                   { label: 'Actif',             dot: 'bg-emerald-500', text: 'text-emerald-700' },
  LATE_NO_PENALTY:          { label: 'En retard',         dot: 'bg-amber-500',   text: 'text-amber-700'   },
  LATE_WITH_PENALTY:        { label: 'En retard',         dot: 'bg-orange-500',  text: 'text-orange-700'  },
  DEFAULTED_AFTER_J12:      { label: 'Défaillant',        dot: 'bg-red-500',     text: 'text-red-700'     },
  DRAFT:                    { label: 'Brouillon',         dot: 'bg-gray-400',    text: 'text-gray-500'    },
  CLOSED:                   { label: 'Clos',              dot: 'bg-gray-400',    text: 'text-gray-500'    },
  RESCINDED:                { label: 'Résilié',           dot: 'bg-red-400',     text: 'text-red-600'     },
  EARLY_WITHDRAW_REQUESTED: { label: 'Retrait anticipé',  dot: 'bg-blue-500',    text: 'text-blue-700'    },
  FINAL_REFUND_PENDING:     { label: 'Remb. final',       dot: 'bg-indigo-500',  text: 'text-indigo-700'  },
  EARLY_REFUND_PENDING:     { label: 'Remb. anticipé',    dot: 'bg-blue-400',    text: 'text-blue-600'    },
}

const CAISSE_TYPE_SHORT: Record<string, string> = {
  STANDARD:               'Standard',
  JOURNALIERE:            'Journalière',
  LIBRE:                  'Libre',
  STANDARD_CHARITABLE:    'Standard Chari.',
  JOURNALIERE_CHARITABLE: 'Journ. Chari.',
  LIBRE_CHARITABLE:       'Libre Chari.',
}

interface ContractCSGridCardProps {
  contract:        any
  member:          any | undefined
  hasPdf:          boolean
  canReplace:      boolean
  hasRefundFinal:  boolean
  hasRefundEarly:  boolean
  isGroup:         boolean
  onView:             () => void
  onViewPdf:          () => void
  onUpload:           () => void
  onDownload:         () => void
  onValidate:         () => void
  onReplace:          () => void
  onDelete:           () => void
  onViewRefundFinal:  () => void
  onViewRefundEarly:  () => void
}

function ContractCSGridCard({
  contract, member, hasPdf, canReplace, hasRefundFinal, hasRefundEarly, isGroup,
  onView, onViewPdf, onUpload, onDownload, onValidate, onReplace, onDelete,
  onViewRefundFinal, onViewRefundEarly,
}: ContractCSGridCardProps) {
  const isOverdue        = contract.status === 'LATE_NO_PENALTY' || contract.status === 'LATE_WITH_PENALTY'
  const firstName        = contract.memberFirstName || member?.firstName || ''
  const lastName         = contract.memberLastName  || member?.lastName  || ''
  const displayName      = `${firstName} ${lastName}`.trim() || (isGroup ? 'Contrat groupe' : 'Membre')
  const initials         = isGroup ? '' : `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase() || 'CS'
  const primaryContact   = member?.contacts?.[0] || member?.email || contract.memberEmail || '—'

  const isSigned            = contract.memberSignedStatus === 'VALIDATED'
  const isPendingValidation = contract.memberSignedStatus === 'PENDING_ADMIN'
  const isRejected          = contract.memberSignedStatus === 'REJECTED'

  const paid     = contract.currentMonthIndex ?? 0
  const total    = contract.monthsPlanned     ?? 0
  const paidAmt  = contract.nominalPaid       ?? 0
  const progress = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0

  const statusMeta = STATUS_META_CS[contract.status] ?? { label: contract.status, dot: 'bg-gray-400', text: 'text-gray-500' }
  const typeLabel  = CAISSE_TYPE_SHORT[contract.caisseType] ?? contract.caisseType ?? 'CS'

  const nextDue = contract.nextDueAt
    ? new Date(contract.nextDueAt).toLocaleDateString('fr-FR')
    : '—'

  return (
    <Card className={cn(
      'group relative flex flex-col overflow-hidden border-0 bg-white shadow-md transition-all duration-200 hover:shadow-lg',
      isOverdue && 'ring-1 ring-red-300'
    )}>
      {/* Top accent bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-[#234D65] via-[#2c5a73] to-[#cbb171]" />

      <CardContent className="flex flex-1 flex-col gap-3 p-4 pt-5">
        {/* Header : avatar + nom + statut */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="size-10 shrink-0 rounded-xl ring-1 ring-[#234D65]/15">
              {member?.photoURL ? (
                <AvatarImage src={member.photoURL} alt={displayName} className="h-full w-full object-cover object-center" />
              ) : (
                <AvatarFallback className="rounded-xl bg-gradient-to-br from-[#234D65] to-[#2c5a73] text-sm font-semibold text-white">
                  {isGroup ? <GroupIcon className="h-4 w-4" /> : initials}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{displayName}</p>
              <p className="truncate text-xs text-slate-500">{primaryContact}</p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className={cn('flex items-center gap-1 text-xs font-semibold', statusMeta.text)}>
              <span className={cn('h-1.5 w-1.5 rounded-full', statusMeta.dot)} />
              {statusMeta.label}
            </span>
            <Badge className="border border-[#234D65]/20 bg-[#234D65]/[0.08] text-[10px] font-medium text-[#234D65]">
              {typeLabel}
            </Badge>
          </div>
        </div>

        {/* Stats 2×2 */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Mensualité</p>
            <p className="mt-0.5 text-sm font-bold text-slate-900">
              {(contract.monthlyAmount || 0).toLocaleString('fr-FR')}{' '}
              <span className="text-[10px] font-normal text-slate-500">FCFA</span>
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Mois payés</p>
            <p className="mt-0.5 text-sm font-bold text-slate-900">
              {paid} <span className="text-[10px] font-normal text-slate-500">/ {total}</span>
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Prochaine échéance</p>
            <p className="mt-0.5 text-sm font-bold text-slate-900">{nextDue}</p>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Total versé</p>
            <p className="mt-0.5 text-sm font-bold text-slate-900">
              {paidAmt.toLocaleString('fr-FR')}{' '}
              <span className="text-[10px] font-normal text-slate-500">FCFA</span>
            </p>
          </div>
        </div>

        {/* Barre de progression */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] text-slate-500">
            <span>Progression</span>
            <span className="font-semibold text-[#234D65]">{progress}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#234D65] to-[#cbb171] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Statut de signature */}
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
          ) : hasPdf ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
              <AlertCircle className="h-3 w-3" /> En attente signature membre
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-orange-600">
              <AlertCircle className="h-3 w-3" /> Document à téléverser
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="mt-auto flex flex-wrap gap-1.5 border-t border-slate-100 pt-3">
          <Button variant="outline" size="sm" onClick={onView}
            className="h-8 cursor-pointer rounded-lg border-[#234D65]/30 px-3 text-xs text-[#234D65] hover:bg-[#234D65] hover:text-white">
            <Eye className="mr-1.5 h-3.5 w-3.5" />Ouvrir
          </Button>

          {(isSigned || hasPdf) ? (
            <Button variant="outline" size="sm" onClick={onViewPdf}
              className="h-8 cursor-pointer rounded-lg border-[#234D65]/30 px-3 text-xs text-[#234D65] hover:bg-[#234D65] hover:text-white">
              <FileText className="mr-1.5 h-3.5 w-3.5" />Voir
            </Button>
          ) : isPendingValidation ? (
            <Button variant="outline" size="sm" onClick={onValidate}
              className="h-8 cursor-pointer rounded-lg border-blue-300 px-3 text-xs text-blue-700 hover:bg-blue-600 hover:text-white">
              <CheckCircle className="mr-1.5 h-3.5 w-3.5" />Valider
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={onUpload}
              className="h-8 cursor-pointer rounded-lg border-orange-300 px-3 text-xs text-orange-600 hover:bg-orange-500 hover:text-white">
              <Plus className="mr-1.5 h-3.5 w-3.5" />Téléverser
            </Button>
          )}

          {isPendingValidation && (hasPdf || isSigned) && (
            <Button variant="outline" size="sm" onClick={onValidate}
              className="h-8 cursor-pointer rounded-lg border-blue-300 px-3 text-xs text-blue-700 hover:bg-blue-600 hover:text-white">
              <CheckCircle className="mr-1.5 h-3.5 w-3.5" />Valider sig.
            </Button>
          )}

          <Button variant="outline" size="sm" onClick={onDownload}
            className="h-8 cursor-pointer rounded-lg border-[#234D65]/30 px-3 text-xs text-[#234D65] hover:bg-[#234D65] hover:text-white">
            <Download className="mr-1.5 h-3.5 w-3.5" />Télécharger
          </Button>

          {canReplace && (
            <Button variant="outline" size="sm" onClick={onReplace}
              className="h-8 cursor-pointer rounded-lg border-[#234D65]/30 px-3 text-xs text-[#234D65] hover:bg-[#234D65] hover:text-white">
              <FileEdit className="mr-1.5 h-3.5 w-3.5" />Modifier
            </Button>
          )}

          {hasRefundFinal && (
            <Button variant="outline" size="sm" onClick={onViewRefundFinal}
              className="h-8 cursor-pointer rounded-lg border-[#234D65]/30 px-3 text-xs text-[#234D65] hover:bg-[#234D65] hover:text-white">
              <Eye className="mr-1.5 h-3.5 w-3.5" />Remboursement
            </Button>
          )}

          {hasRefundEarly && (
            <Button variant="outline" size="sm" onClick={onViewRefundEarly}
              className="h-8 cursor-pointer rounded-lg border-[#234D65]/30 px-3 text-xs text-[#234D65] hover:bg-[#234D65] hover:text-white">
              <Eye className="mr-1.5 h-3.5 w-3.5" />Résiliation
            </Button>
          )}

          <Button variant="outline" size="sm" onClick={onDelete}
            className="h-8 cursor-pointer rounded-lg border-red-200 px-3 text-xs text-red-600 hover:bg-red-600 hover:text-white">
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />Supprimer
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Composant principal
const ListContracts = () => {
  // Synchronisation temps réel multi-admin (contrats + demandes liées)
  useCaisseSpecialeContractsRealtimeSync(true)

  const router = useRouter()

  const tabItems: CaisseTypeTabItem[] = [
    { value: 'all', label: 'Tous', icon: FileText },
    { value: 'STANDARD_GROUP', label: 'Standard', icon: FileText },
    { value: 'JOURNALIERE_GROUP', label: 'Journalier', icon: Calendar },
    { value: 'LIBRE_GROUP', label: 'Libre', icon: FileText },
    { value: 'currentMonth', label: 'Mois en cours', icon: Calendar },
    { value: 'overdue', label: 'Retard', icon: AlertCircle, isDanger: true },
  ]
  
  // Fonction de navigation vers la création de contrat
  const handleCreateContract = () => {
    router.push(routes.admin.caisseSpecialeCreateContract)
  }
  
  // État pour l'onglet actif (Tous les contrats / Standard / Journalier / Libre / Retard / Mois en cours)
  const [activeTab, setActiveTab] = useState<CaisseTypeTabValue>('all')
  const [groupedCaisseSubFilters, setGroupedCaisseSubFilters] = useState<
    Record<GroupedCaisseTabValue, GroupedCaisseSubFilterValue>
  >({
    STANDARD_GROUP: 'all',
    JOURNALIERE_GROUP: 'all',
    LIBRE_GROUP: 'all',
  })
  
  // États
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    contractType: 'all',
    caisseType: 'all',
    createdAtFrom: undefined as Date | undefined,
    createdAtTo: undefined as Date | undefined,
    nextDueAtFrom: undefined as Date | undefined,
    nextDueAtTo: undefined as Date | undefined,
    overdueOnly: false,
    monthlyAmountMin: undefined as number | undefined,
    monthlyAmountMax: undefined as number | undefined,
    contractAmountMin: undefined as number | undefined,
    contractAmountMax: undefined as number | undefined,
    bonusAmountMin: undefined as number | undefined,
    bonusAmountMax: undefined as number | undefined,
    penaltiesAmountMin: undefined as number | undefined,
    penaltiesAmountMax: undefined as number | undefined,
    paidAmountMin: undefined as number | undefined,
    paidAmountMax: undefined as number | undefined,
    durationMonthsMin: undefined as number | undefined,
    durationMonthsMax: undefined as number | undefined,
    paymentCountMin: undefined as number | undefined,
    paymentCountMax: undefined as number | undefined,
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(12)
  const [pageCursors, setPageCursors] = useState<Record<number, string | null>>({ 1: null })
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [isExporting, setIsExporting] = useState(false)
  const [selectedContractForPDF, setSelectedContractForPDF] = useState<any>(null)
  const [isPDFModalOpen, setIsPDFModalOpen] = useState(false)
  const [selectedContractForUpload, setSelectedContractForUpload] = useState<any>(null)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [selectedContractForViewUploaded, setSelectedContractForViewUploaded] = useState<any>(null)
  const [selectedViewDocumentId, setSelectedViewDocumentId] = useState<string | undefined>(undefined)
  const [isViewUploadedModalOpen, setIsViewUploadedModalOpen] = useState(false)
  const [selectedContractForValidation, setSelectedContractForValidation] = useState<any>(null)
  const [isValidationModalOpen, setIsValidationModalOpen] = useState(false)
  const [selectedContractForOverview, setSelectedContractForOverview] = useState<{
    contract: any
    member?: any
  } | null>(null)
  const [contractToDelete, setContractToDelete] = useState<any>(null)
  const [contractToReplacePdf, setContractToReplacePdf] = useState<any>(null)
  const [contractRefunds, setContractRefunds] = useState<Record<string, ContractRefundDocuments>>({})
  const debouncedSearch = useDebounce(filters.search, 300)
  const activeGroupedCaisseSubFilter = isGroupedCaisseTab(activeTab)
    ? groupedCaisseSubFilters[activeTab]
    : 'all'

  const effectiveFilters = React.useMemo(() => {
    const nextFilters: any = { ...filters, caisseTypes: undefined }

    const searchValue = debouncedSearch.trim()
    if (searchValue.length >= 2) {
      nextFilters.search = searchValue
    } else {
      nextFilters.search = ''
    }

    if (activeTab === 'overdue') {
      nextFilters.overdueOnly = true
      if (
        nextFilters.status !== 'LATE_NO_PENALTY' &&
        nextFilters.status !== 'LATE_WITH_PENALTY'
      ) {
        nextFilters.status = 'LATE_NO_PENALTY'
      }
    }

    if (activeTab === 'currentMonth') {
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
      nextFilters.nextDueAtFrom = start
      nextFilters.nextDueAtTo = end
      nextFilters.createdAtFrom = undefined
      nextFilters.createdAtTo = undefined
    }

    if (isGroupedCaisseTab(activeTab)) {
      const groupedTypes = GROUPED_CAISSE_TAB_TO_TYPES[activeTab]
      if (activeGroupedCaisseSubFilter === 'all') {
        nextFilters.caisseType = 'all'
        nextFilters.caisseTypes = groupedTypes
      } else {
        nextFilters.caisseType = activeGroupedCaisseSubFilter
      }
    }

    const hasCreatedRange = Boolean(nextFilters.createdAtFrom || nextFilters.createdAtTo)
    const hasNextDueRange = Boolean(nextFilters.nextDueAtFrom || nextFilters.nextDueAtTo)
    if (hasCreatedRange && hasNextDueRange) {
      nextFilters.nextDueAtFrom = undefined
      nextFilters.nextDueAtTo = undefined
    }

    return nextFilters
  }, [filters, activeTab, debouncedSearch, activeGroupedCaisseSubFilter])

  const hasAnyActiveFilter = React.useMemo(() => {
    return Boolean(
      filters.search.trim() ||
      filters.status !== 'all' ||
      filters.contractType !== 'all' ||
      filters.caisseType !== 'all' ||
      filters.createdAtFrom ||
      filters.createdAtTo ||
      filters.nextDueAtFrom ||
      filters.nextDueAtTo ||
      filters.overdueOnly ||
      typeof filters.monthlyAmountMin === 'number' ||
      typeof filters.monthlyAmountMax === 'number' ||
      typeof filters.contractAmountMin === 'number' ||
      typeof filters.contractAmountMax === 'number' ||
      typeof filters.bonusAmountMin === 'number' ||
      typeof filters.bonusAmountMax === 'number' ||
      typeof filters.penaltiesAmountMin === 'number' ||
      typeof filters.penaltiesAmountMax === 'number' ||
      typeof filters.paidAmountMin === 'number' ||
      typeof filters.paidAmountMax === 'number' ||
      typeof filters.durationMonthsMin === 'number' ||
      typeof filters.durationMonthsMax === 'number' ||
      typeof filters.paymentCountMin === 'number' ||
      typeof filters.paymentCountMax === 'number'
    )
  }, [filters])

  const pagination = React.useMemo(
    () => ({ limit: itemsPerPage, cursor: pageCursors[currentPage] || null }),
    [itemsPerPage, pageCursors, currentPage]
  )

  // Hooks V2
  const { data: contractsPage, isLoading, error, refetch } = useCaisseContracts(effectiveFilters, pagination)
  const statsFilters = React.useMemo(() => ({}), [])
  const { data: stats } = useCaisseContractsStats(statsFilters)

  // Données des membres et groupes (à récupérer depuis Firestore si nécessaire)
  const membersData = { data: [] as any[] }
  const groupsData: any[] = []

  const contractsData = contractsPage?.items || []
  const totalCount = contractsPage?.total || 0

  // Reset page when filters or tab change
  useEffect(() => {
    setCurrentPage(1)
    setPageCursors({ 1: null })
  }, [filters, activeTab, activeGroupedCaisseSubFilter])

  // Charger les refunds pour chaque contrat
  useEffect(() => {
    const loadRefunds = async () => {
      if (!contractsData || contractsData.length === 0) return
      
      const refundsMap: Record<string, ContractRefundDocuments> = {}
      
      for (const contract of contractsData) {
        if (!contract.id) continue
        try {
          const refunds = await listRefunds(contract.id)
          const finalRefundWithDoc = refunds.find(
            (r: any) => r.type === 'FINAL' && r.document?.url
          )
          const earlyRefundWithDoc = refunds.find(
            (r: any) => r.type === 'EARLY' && r.document?.url
          )
          if (finalRefundWithDoc || earlyRefundWithDoc) {
            refundsMap[contract.id] = {
              FINAL: finalRefundWithDoc,
              EARLY: earlyRefundWithDoc,
            }
          }
        } catch (error) {
          console.error(`Erreur lors du chargement des refunds pour ${contract.id}:`, error)
        }
      }
      
      setContractRefunds(refundsMap)
    }
    
    loadRefunds()
  }, [contractsData])

  // Gestionnaires d'événements
  const handleFiltersChange = (newFilters: any) => {
    setFilters(newFilters)
    setCurrentPage(1)
    setPageCursors({ 1: null })
  }

  const handleResetFilters = () => {
    setFilters({
      search: '',
      status: 'all',
      contractType: 'all',
      caisseType: 'all',
      createdAtFrom: undefined,
      createdAtTo: undefined,
      nextDueAtFrom: undefined,
      nextDueAtTo: undefined,
      overdueOnly: false,
      monthlyAmountMin: undefined,
      monthlyAmountMax: undefined,
      contractAmountMin: undefined,
      contractAmountMax: undefined,
      bonusAmountMin: undefined,
      bonusAmountMax: undefined,
      penaltiesAmountMin: undefined,
      penaltiesAmountMax: undefined,
      paidAmountMin: undefined,
      paidAmountMax: undefined,
      durationMonthsMin: undefined,
      durationMonthsMax: undefined,
      paymentCountMin: undefined,
      paymentCountMax: undefined,
    })
    setGroupedCaisseSubFilters({
      STANDARD_GROUP: 'all',
      JOURNALIERE_GROUP: 'all',
      LIBRE_GROUP: 'all',
    })
    setCurrentPage(1)
    setPageCursors({ 1: null })
  }

  const handleNextPage = () => {
    if (!contractsPage?.nextCursor) return
    setPageCursors((prev) => ({ ...prev, [currentPage + 1]: contractsPage.nextCursor }))
    setCurrentPage((prev) => prev + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handlePrevPage = () => {
    if (currentPage === 1) return
    setCurrentPage((prev) => prev - 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleRefresh = async () => {
    await refetch()
  }

  const handleViewContractPDF = (contract: any) => {
    setSelectedContractForPDF(contract)
    setIsPDFModalOpen(true)
  }

  const handleClosePDFModal = () => {
    setIsPDFModalOpen(false)
    setSelectedContractForPDF(null)
  }

  const handleUploadPDF = (contract: any) => {
    setSelectedContractForUpload(contract)
    setIsUploadModalOpen(true)
  }

  const handleCloseUploadModal = () => {
    setIsUploadModalOpen(false)
    setSelectedContractForUpload(null)
  }

  const handleUploadSuccess = () => {
    // Rafraîchir la liste des contrats après téléversement
    refetch()
  }

  const handleViewUploadedContractPDF = (contract: any, documentId?: string) => {
    setSelectedContractForViewUploaded(contract)
    setSelectedViewDocumentId(documentId)
    setIsViewUploadedModalOpen(true)
  }

  const handleValidateContract = (contract: any) => {
    setSelectedContractForValidation(contract)
    setIsValidationModalOpen(true)
  }

  const handleViewRefundPDF = (contractId: string, type: 'FINAL' | 'EARLY') => {
    const refund = contractRefunds[contractId]?.[type]
    if (refund && refund.document && refund.document.url) {
      window.open(refund.document.url, '_blank')
    } else {
      toast.error('Document non disponible')
    }
  }

  const handleCloseViewUploadedModal = () => {
    setIsViewUploadedModalOpen(false)
    setSelectedContractForViewUploaded(null)
    setSelectedViewDocumentId(undefined)
  }

  const formatAmountWithSpaces = (value: number | string | undefined | null): string => {
    const numeric = typeof value === 'number' ? value : Number(value ?? 0)
    if (!Number.isFinite(numeric)) return '0'

    const rounded = Math.round(numeric)
    const sign = rounded < 0 ? '-' : ''
    const digits = String(Math.abs(rounded))

    return `${sign}${digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}`
  }

  const buildExportData = () => {
    return contractsData.map((contract: any) => {
      const _toISO = (v: any) => {
        try {
          if (!v) return ''
          const d = v?.toDate ? v.toDate() : v instanceof Date ? v : new Date(v)
          return isNaN(d.getTime()) ? '' : d.toISOString()
        } catch {
          return ''
        }
      }

      const toDate = (v: any) => {
        try {
          if (!v) return ''
          const d = v?.toDate ? v.toDate() : v instanceof Date ? v : new Date(v)
          return isNaN(d.getTime()) ? '' : d.toLocaleDateString('fr-FR')
        } catch {
          return ''
        }
      }

      return {
        'ID Contrat': contract?.id || '',
        'Type': getContractType(contract),
        'Nom': getContractDisplayName(contract),
        'Statut': getStatusLabel(contract.status),
        'Montant mensuel (FCFA)': contract?.monthlyAmount || 0,
        'Durée (mois)': contract?.monthsPlanned || 0,
        'Montant total (FCFA)': (contract?.monthlyAmount || 0) * (contract?.monthsPlanned || 0),
        'Montant versé (FCFA)': contract?.nominalPaid || 0,
        'Montant restant (FCFA)': ((contract?.monthlyAmount || 0) * (contract?.monthsPlanned || 0)) - (contract?.nominalPaid || 0),
        'Prochaine échéance': toDate(contract?.nextDueAt),
        'Date de création': toDate(contract?.createdAt),
        'Dernière modification': toDate(contract?.updatedAt),
        'Type de caisse': contract?.caisseType || '',
        'Date premier versement': toDate(contract?.firstPaymentDate),
        'Jours de retard': contract?.daysLate || 0,
        'Pénalités (FCFA)': contract?.penalties || 0,
        'Bonus (FCFA)': contract?.bonuses || 0,
        'ID Membre': contract?.memberId || '',
        'ID Groupe': contract?.groupeId || '',
        'CreatedAt ISO': _toISO(contract?.createdAt),
      }
    })
  }

  const exportToExcel = async () => {
    if (contractsData.length === 0) {
      toast.error('Aucun contrat à exporter')
      return
    }

    setIsExporting(true)
    try {
      const exportData = buildExportData()
      const XLSX = await import('xlsx')
      const worksheet = XLSX.utils.json_to_sheet(exportData)
      worksheet['!cols'] = Object.keys(exportData[0] || {}).map(() => ({ wch: 22 }))
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Contrats')
      const filename = `contrats-caisse-speciale-${new Date().toISOString().split('T')[0]}.xlsx`
      XLSX.writeFile(workbook, filename)
      toast.success('Exporter Excel généré')
    } catch (error) {
      console.error('Erreur lors de l\'export:', error)
      toast.error('Erreur lors de l\'export Excel')
    } finally {
      setIsExporting(false)
    }
  }

  const exportToPDF = async () => {
    if (contractsData.length === 0) {
      toast.error('Aucun contrat à exporter')
      return
    }

    setIsExporting(true)
    try {
      const { jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const activeTabLabel = tabItems.find((tab) => tab.value === activeTab)?.label || 'Tous'
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const horizontalMargin = 20

      const rows = buildExportData().map((row) => [
        row['ID Contrat'],
        row['Type'],
        row['Nom'],
        row['Statut'],
        formatAmountWithSpaces(row['Montant mensuel (FCFA)']),
        `${row['Durée (mois)']} mois`,
        formatAmountWithSpaces(row['Montant total (FCFA)']),
        formatAmountWithSpaces(row['Montant versé (FCFA)']),
        formatAmountWithSpaces(row['Montant restant (FCFA)']),
        row['Prochaine échéance'],
        row['Date de création'],
        row['Type de caisse'],
      ])

      doc.setFont('times', 'bold')
      doc.setTextColor(20, 33, 50)
      doc.setFontSize(16)
      doc.text('Liste des Contrats Caisse Spéciale', horizontalMargin, 14)

      doc.setFont('times', 'normal')
      doc.setTextColor(70, 70, 70)
      doc.setFontSize(10)
      doc.text(`Type: ${activeTabLabel}`, horizontalMargin, 20)
      doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, horizontalMargin, 24)
      doc.text(`Total: ${rows.length} contrat(s)`, horizontalMargin, 28)
      doc.setDrawColor(35, 77, 101)
      doc.setLineWidth(0.3)
      doc.line(horizontalMargin, 31, pageWidth - horizontalMargin, 31)

      const headers = [
        'ID',
        'Type',
        'Nom',
        'Statut',
        'Mensualité FCFA',
        'Durée',
        'Total FCFA',
        'Versé FCFA',
        'Restant FCFA',
        'Prochaine échéance',
        'Créé le',
        'Caisse',
      ]

      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 35,
        tableWidth: pageWidth - horizontalMargin * 2,
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
        margin: { top: 35, right: horizontalMargin, bottom: 14, left: horizontalMargin },
        columnStyles: {
          // Largeurs calibrées pour totaliser exactement la largeur utile (257mm)
          0: { cellWidth: 34 },
          1: { cellWidth: 15, halign: 'center' },
          2: { cellWidth: 30 },
          3: { cellWidth: 21 },
          4: { cellWidth: 22, halign: 'right' },
          5: { cellWidth: 14, halign: 'center' },
          6: { cellWidth: 22, halign: 'right' },
          7: { cellWidth: 22, halign: 'right' },
          8: { cellWidth: 22, halign: 'right' },
          9: { cellWidth: 21, halign: 'center' },
          10: { cellWidth: 18, halign: 'center' },
          11: { cellWidth: 16, halign: 'center' },
        },
      })

      // Pagination centrée en pied de page: "Page X/Y"
      const totalPages = doc.getNumberOfPages()
      for (let page = 1; page <= totalPages; page++) {
        doc.setPage(page)
        doc.setFont('times', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(75, 85, 99)
        doc.text(`Page ${page}/${totalPages}`, pageWidth / 2, pageHeight - 6, { align: 'center' })
      }

      const filename = `contrats-caisse-speciale-${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(filename)
      toast.success('Exporter PDF généré')
    } catch (error) {
      console.error('Erreur lors de l\'export:', error)
      toast.error('Erreur lors de l\'export PDF')
    } finally {
      setIsExporting(false)
    }
  }

  // Fonctions utilitaires
  const isGroupContract = (contract: any) => {
    return contract.contractType === 'GROUP' || (contract.groupeId && !contract.memberId)
  }

  const getContractType = (contract: any) => {
    if (contract.contractType === 'GROUP') return 'Groupe'
    if (contract.contractType === 'INDIVIDUAL') return 'Individuel'
    if (isGroupContract(contract)) return 'Groupe'
    return 'Individuel'
  }

  // Fonction pour obtenir le nom affiché (groupe ou personne)
  const getContractDisplayName = (contract: any) => {
    if (isGroupContract(contract)) {
      // Recherche du nom du groupe
      if (groupsData && contract.groupeId) {
        const group = groupsData.find((g: any) => g.id === contract.groupeId)
        return group ? group.name : `Groupe ${contract.groupeId.slice(-6)}`
      }
      return `Groupe ${contract.groupeId?.slice(-6) || 'N/A'}`
    } else {
      // Recherche du nom de la personne
      if (membersData && contract.memberId) {
        const member = membersData.data?.find((m: any) => m.id === contract.memberId)
        if (member) {
          return `${member.firstName} ${member.lastName}`
        }
      }
      return `Membre ${contract.memberId?.slice(-6) || 'N/A'}`
    }
  }

  // Fonction pour obtenir le nom du membre (version améliorée)
  const getMemberName = (contract: any) => {
    if (contract.contractType === 'INDIVIDUAL' && contract.memberId) {
      const member = membersMap.get(normalizeMemberId(contract.memberId))
      if (member) {
        return {
          firstName: member.firstName,
          lastName: member.lastName
        }
      }
    }
    return getContractDisplayName(contract)
  }

  // Fonction pour obtenir le label du type de contrat
  const getContractTypeLabel = (contract: any) => {
    const type = contract.caisseType || 'STANDARD'
    switch (type) {
      case 'STANDARD':
        return 'Standard'
      case 'STANDARD_CHARITABLE':
        return 'Standard charitable'
      case 'JOURNALIERE':
        return 'Journalière'
      case 'JOURNALIERE_CHARITABLE':
        return 'Journalière charitable'
      case 'LIBRE':
        return 'Libre'
      case 'LIBRE_CHARITABLE':
        return 'Libre charitable'
      default:
        return String(type).replace(/_/g, ' ')
    }
  }

  // Fonction pour vérifier si le contrat a un PDF valide
  const hasValidContractPdf = (contract: any) => {
    const contractPdf = contract.contractPdf
    if (!contractPdf || typeof contractPdf !== 'object') {
      return false
    }
    
    // Vérifier que toutes les propriétés requises sont présentes
    const requiredProperties = ['fileSize', 'originalFileName', 'path', 'uploadedAt', 'url']
    return requiredProperties.every(prop => Object.prototype.hasOwnProperty.call(contractPdf, prop) && contractPdf[prop] !== null && contractPdf[prop] !== undefined)
  }

  const getStatusColor = (status: string) => {
    const colors = {
      DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
      ACTIVE: 'bg-green-100 text-green-700 border-green-200',
      LATE_NO_PENALTY: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      LATE_WITH_PENALTY: 'bg-orange-100 text-orange-700 border-orange-200',
      DEFAULTED_AFTER_J12: 'bg-red-100 text-red-700 border-red-200',
      EARLY_WITHDRAW_REQUESTED: 'bg-blue-100 text-blue-700 border-blue-200',
      FINAL_REFUND_PENDING: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      EARLY_REFUND_PENDING: 'bg-blue-100 text-blue-700 border-blue-200',
      RESCINDED: 'bg-red-100 text-red-700 border-red-200',
      CLOSED: 'bg-gray-100 text-gray-700 border-gray-200'
    }
    return colors[status as keyof typeof colors] || colors.DRAFT
  }

  const getStatusLabel = (status: string) => {
    const labels = {
      DRAFT: 'Brouillon',
      ACTIVE: 'Actif',
      LATE_NO_PENALTY: 'Retard (J+0..3)',
      LATE_WITH_PENALTY: 'Retard (J+4..12)',
      DEFAULTED_AFTER_J12: 'Résilié (&gt;J+12)',
      EARLY_WITHDRAW_REQUESTED: 'Retrait anticipé',
      FINAL_REFUND_PENDING: 'Remboursement final',
      EARLY_REFUND_PENDING: 'Remboursement anticipé',
      RESCINDED: 'Résilié',
      CLOSED: 'Clos'
    }
    return labels[status as keyof typeof labels] || status
  }

  /** Contrat éligible au remplacement du PDF (téléversé + statut DRAFT/ACTIVE/LATE_*). */
  const ALLOWED_REPLACE_PDF_STATUSES = ['DRAFT', 'ACTIVE', 'LATE_NO_PENALTY', 'LATE_WITH_PENALTY']
  const canReplaceContractPdf = (contract: any) => {
    if (!contract?.id) return false
    return hasValidContractPdf(contract) && ALLOWED_REPLACE_PDF_STATUSES.includes(contract.status)
  }

  /**
   * Vérifie si un contrat est en retard
   */
  const isContractOverdue = (contract: any): boolean => {
    // Vérifier les statuts de retard
    if (contract.status === 'LATE_NO_PENALTY' || contract.status === 'LATE_WITH_PENALTY') {
      return true
    }
    
    // Vérifier nextDueAt pour les contrats ACTIVE
    if (contract.status === 'ACTIVE' && contract.nextDueAt) {
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

  // Pagination (serveur)
  const totalPages = Math.ceil(totalCount / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, totalCount)
  const currentContracts = contractsData

  // Récupérer les informations des membres pour les contrats individuels (via domaine memberships)
  const individualContractMemberIds = React.useMemo(() => {
    const ids = contractsData
      ?.filter((contract: any) => contract.contractType === 'INDIVIDUAL' && contract.memberId)
      .map((contract: any) => String(contract.memberId).trim().replace(/\s/g, ''))
      .filter(Boolean) || []
    return Array.from(new Set(ids))
  }, [contractsData])

  const { data: membersDataFromHook, isLoading: membersLoading, error: membersError } = useMembersByIds(individualContractMemberIds)

  // DEBUG: logs récupération membres (contrats caisse spéciale)
  React.useEffect(() => {
    console.log('[ListContracts] memberIds demandés:', individualContractMemberIds)
    console.log('[ListContracts] useMembersByIds:', {
      membersLoading,
      membersError: membersError != null ? String(membersError) : null,
      membersCount: membersDataFromHook?.length ?? 0,
      membersSample: membersDataFromHook?.slice(0, 2).map((m: any) => ({ id: m?.id, matricule: m?.matricule, firstName: m?.firstName, lastName: m?.lastName })),
    })
  }, [individualContractMemberIds, membersLoading, membersError, membersDataFromHook])

  // Map des membres : clé par id, matricule et id normalisé (sans espaces) pour retrouver le membre
  const membersMap = React.useMemo(() => {
    if (!membersDataFromHook) return new Map<string, any>()
    const map = new Map<string, any>()
    for (const member of membersDataFromHook) {
      if (member?.id) {
        map.set(String(member.id).trim(), member)
        map.set(String(member.id).trim().replace(/\s/g, ''), member)
      }
      if (member?.matricule && member.matricule !== member.id) {
        map.set(String(member.matricule).trim(), member)
        map.set(String(member.matricule).trim().replace(/\s/g, ''), member)
      }
    }
    console.log('[ListContracts] membersMap size:', map.size, 'keys (sample):', Array.from(map.keys()).slice(0, 6))
    return map
  }, [membersDataFromHook])

  const normalizeMemberId = (memberId: string | undefined) =>
    memberId ? String(memberId).trim().replace(/\s/g, '') : ''

  // DEBUG: log lookup membre pour les premiers contrats affichés
  React.useEffect(() => {
    if (!currentContracts?.length || membersMap.size === 0) return
    const toLog = currentContracts.slice(0, 5).map((c: any) => {
      const raw = c.memberId
      const norm = normalizeMemberId(raw)
      const member = raw ? membersMap.get(norm) : undefined
      return {
        contractId: c.id,
        memberIdRaw: raw,
        memberIdNormalized: norm,
        memberFound: !!member,
        memberName: member ? `${member.firstName} ${member.lastName}` : null,
      }
    })
    console.log('[ListContracts] Lookup membre par contrat (échantillon):', toLog)
  }, [currentContracts, membersMap])

  const computedStats = React.useMemo(() => {
    if (!stats) return null
    const total = stats.total || 0
    const active = stats.active || 0
    const late = stats.late || 0
    const group = stats.group || 0
    const individual = stats.individual || 0

    return {
      total,
      active,
      late,
      group,
      individual,
      activePercentage: total > 0 ? (active / total) * 100 : 0,
      latePercentage: total > 0 ? (late / total) * 100 : 0,
      individualPercentage: total > 0 ? (individual / total) * 100 : 0,
      groupPercentage: total > 0 ? (group / total) * 100 : 0,
      closedStats: {},
      byCaisseType: stats.byCaisseType || {},
    }
  }, [stats])

  // Montant total : somme des nominalPaid de tous les contrats (tous statuts), fournie par les stats
  const totalPaidSum = stats?.totalPaidSum ?? 0

  // Gestion des erreurs
  if (error) {
    return (
      <div className="space-y-8 animate-in fade-in-0 duration-500">
        <Alert className="border-0 bg-gradient-to-r from-red-50 to-rose-50 shadow-lg">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <AlertDescription className="text-red-700 font-medium">
            Une erreur est survenue lors du chargement des contrats : {error instanceof Error ? error.message : String(error)}
            <Button
              variant="link"
              className="p-0 h-auto ml-2 text-red-700 underline font-bold cursor-pointer hover:text-red-800"
              onClick={handleRefresh}
            >
              Réessayer maintenant
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const renderPagination = () => {
    if (totalPages <= 1) return null
    return (
      <Card className="border border-[#234D65]/20 bg-gradient-to-r from-white to-slate-50/60 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Affichage {totalCount === 0 ? 0 : startIndex + 1}-{endIndex} sur {totalCount} contrats
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className="border-[#234D65]/35 px-3 py-1 text-[#234D65] cursor-pointer hover:bg-[#234D65] hover:text-white"
              >
                Précédent
              </Button>
              <span className="text-sm text-gray-600">
                Page {currentPage} sur {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={!contractsPage?.nextCursor}
                className="border-[#234D65]/35 px-3 py-1 text-[#234D65] cursor-pointer hover:bg-[#234D65] hover:text-white"
              >
                Suivant
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in-0 duration-500">
      {/* Carrousel de statistiques */}
      {computedStats && <StatsCarousel stats={computedStats} totalPaidSum={totalPaidSum} />}

      {/* Diagramme circulaire par type de caisse */}
      {computedStats && computedStats.byCaisseType && Object.keys(computedStats.byCaisseType).length > 0 && (() => {
        const CAISSE_TYPE_LABELS: Record<string, string> = {
          STANDARD: 'Standard',
          JOURNALIERE: 'Journalière',
          LIBRE: 'Libre',
          STANDARD_CHARITABLE: 'Standard Charitable',
          JOURNALIERE_CHARITABLE: 'Journalière Charitable',
          LIBRE_CHARITABLE: 'Libre Charitable',
        }
        const COLORS = ['#234D65', '#2C5A73', '#CBB171', '#F97316', '#EF4444']
        
        const byCaisseTypeData = Object.entries(computedStats.byCaisseType)
          .filter(([_, count]) => (count as number) > 0)
          .map(([type, count]) => ({
            type,
            label: CAISSE_TYPE_LABELS[type] || type,
            count: count as number
          }))

        return (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="lg:col-span-2">
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-gray-800">Répartition par type de caisse</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="h-60 flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie 
                          data={byCaisseTypeData} 
                          dataKey="count" 
                          nameKey="label" 
                          cx="50%" 
                          cy="50%" 
                          outerRadius={90} 
                          label
                        >
                          {byCaisseTypeData.map((entry, index) => (
                            <Cell key={`caisse-type-${entry.type}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 flex-1">
                    {byCaisseTypeData.map((entry, index) => (
                      <div key={entry.type} className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-3">
                          <span 
                            className="inline-block h-2 w-2 rounded-full" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }} 
                          />
                          <span className="font-medium text-gray-700">{entry.label}</span>
                        </div>
                        <span className="text-sm text-gray-500">{entry.count} contrat{entry.count > 1 ? 's' : ''}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )
      })()}

      {/* Filtres */}
      <ContractFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onReset={handleResetFilters}
        activeTab={activeTab}
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
                  {totalCount.toLocaleString()} contrat{totalCount !== 1 ? 's' : ''} • Page {currentPage}
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
                  Cards
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
                  Table
                </Button>
              </div>

              {/* Actions avec animations */}
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
                    disabled={isExporting || contractsData.length === 0}
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

              <Button
                size="sm"
                onClick={handleCreateContract}
                className="h-10 w-full sm:w-auto rounded-xl border-0 bg-gradient-to-r from-[#234D65] to-[#2c5a73] px-4 text-white cursor-pointer shadow-sm transition-all duration-200 hover:from-[#2c5a73] hover:to-[#234D65] hover:shadow-md"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nouveau Contrat
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {renderPagination()}

      {/* Onglets pour filtrer par type et période (rattachés à la liste) */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          if (isCaisseTypeTabValue(value)) {
            setActiveTab(value)
          }
        }}
        className="w-full"
      >
        {/* Tabs desktop : style onglets classeur */}
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

        {/* Tabs mobile/tablette (badges carousel sans boutons) */}
        <div className="lg:hidden">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tabItems.map(({ value, label, icon: Icon, isDanger }) => {
              const isActive = activeTab === value
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    if (isCaisseTypeTabValue(value)) {
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

        {isGroupedCaisseTab(activeTab) && (
          <div className="mt-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-2">
            <div className="flex flex-wrap items-center gap-2">
              {GROUPED_CAISSE_SUBFILTER_OPTIONS[activeTab].map((option) => {
                const isActive = activeGroupedCaisseSubFilter === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setGroupedCaisseSubFilters((prev) => ({
                        ...prev,
                        [activeTab]: option.value,
                      }))
                    }
                    className={cn(
                      'rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all',
                      isActive
                        ? 'border-[#234D65] bg-white text-[#234D65] shadow-sm'
                        : 'border-slate-200 bg-white/80 text-slate-600 hover:border-[#234D65]/40 hover:text-[#234D65]'
                    )}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </Tabs>

      {/* Liste des contrats */}
      {isLoading ? (
        <div className="rounded-b-2xl border-x border-b border-[#234D65]/20 bg-gradient-to-b from-[#234D65]/[0.04] to-slate-50/35 p-4 md:p-5">
          <div className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
              : 'space-y-4'
          }>
            {[...Array(itemsPerPage)].map((_, i) => (
              <ModernSkeleton key={i} viewMode={viewMode} />
            ))}
          </div>
        </div>
      ) : currentContracts.length > 0 ? (
        <>
          {viewMode === 'grid' && (
            <div className="rounded-b-2xl border-x border-b border-[#234D65]/20 bg-gradient-to-b from-[#234D65]/[0.04] to-slate-50/30 p-4 md:p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
                {currentContracts.map((contract: any, _index: number) => {
                  const member = contract.memberId ? membersMap.get(normalizeMemberId(contract.memberId)) : undefined
                  return (
                    <div key={contract.id} className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${_index * 0.05}s` }}>
                      <ContractCSGridCard
                        contract={contract}
                        member={member}
                        hasPdf={hasValidContractPdf(contract)}
                        canReplace={canReplaceContractPdf(contract)}
                        hasRefundFinal={!!contractRefunds[contract.id]?.FINAL?.document?.url}
                        hasRefundEarly={!!contractRefunds[contract.id]?.EARLY?.document?.url}
                        isGroup={isGroupContract(contract)}
                        onView={() => router.push(routes.admin.caisseSpecialeContractDetails(contract.id))}
                        onViewPdf={() => handleViewUploadedContractPDF(contract)}
                        onUpload={() => handleUploadPDF(contract)}
                        onDownload={() => handleViewContractPDF(contract)}
                        onValidate={() => handleValidateContract(contract)}
                        onReplace={() => setContractToReplacePdf(contract)}
                        onDelete={() => setContractToDelete(contract)}
                        onViewRefundFinal={() => handleViewRefundPDF(contract.id, 'FINAL')}
                        onViewRefundEarly={() => handleViewRefundPDF(contract.id, 'EARLY')}
                      />
                    </div>
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
                    <th className="text-right px-4 py-3">Prochaine</th>
                    <th className="text-left px-4 py-3">PDF</th>
                    <th className="text-right px-4 py-3">Versé</th>
                    <th className="text-left px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentContracts.map((contract: any) => {
                    const member = contract.memberId ? membersMap.get(normalizeMemberId(contract.memberId)) : undefined
                    const contacts = member?.contacts?.length ? member.contacts.join(' / ') : '—'
                    const emergency = contract.emergencyContact
                    const fullName = member ? `${member.firstName} ${member.lastName}` : ''
                    const initials = member
                      ? `${member.firstName?.[0] || ''}${member.lastName?.[0] || ''}`.toUpperCase()
                      : 'CS'

                    return (
                      <tr key={contract.id} className="transition-colors hover:bg-[#234D65]/[0.045]">
                        <td className="px-4 py-3">
                          <Avatar className="size-10 rounded-lg ring-1 ring-[#234D65]/15">
                            {member?.photoURL ? (
                              <AvatarImage src={member.photoURL} alt={`Photo de ${fullName}`} className="h-full w-full object-cover object-center" />
                            ) : (
                              <AvatarFallback className="rounded-lg bg-gradient-to-br from-[#234D65] to-[#2c5a73] text-white font-semibold">
                                {isGroupContract(contract) ? <GroupIcon className="h-4 w-4" /> : initials}
                              </AvatarFallback>
                            )}
                          </Avatar>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-900 break-all">{contract.id}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(contract.status)}`}>
                            {getStatusLabel(contract.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3">{getContractTypeLabel(contract)}</td>
                        <td className="px-4 py-3">{member?.lastName || '—'}</td>
                        <td className="px-4 py-3">{member?.firstName || '—'}</td>
                        <td className="px-4 py-3 font-mono text-xs">{member?.matricule || '—'}</td>
                        <td className="px-4 py-3">{contacts}{member?.email ? ` • ${member.email}` : ''}</td>
                        <td className="px-4 py-3 text-xs">
                          <div>{emergency?.lastName || '—'} {emergency?.firstName || ''}</div>
                          <div>{emergency?.phone1 || '—'}</div>
                        </td>
                        <td className="px-4 py-3 text-right">{(contract.monthlyAmount || 0).toLocaleString('fr-FR')} FCFA</td>
                        <td className="px-4 py-3 text-right">{contract.monthsPlanned} mois</td>
                        <td className="px-4 py-3 text-right">{contract.firstPaymentDate ? new Date(contract.firstPaymentDate).toLocaleDateString('fr-FR') : '—'}</td>
                        <td className="px-4 py-3 text-right">{contract.nextDueAt ? new Date(contract.nextDueAt).toLocaleDateString('fr-FR') : '—'}</td>
                        <td className="px-4 py-3">
                          {hasValidContractPdf(contract) ? (
                            <span className="inline-flex items-center gap-1 text-green-600 text-xs">
                              <CheckCircle className="h-3 w-3" /> Disponible
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-orange-500 text-xs">
                              <AlertCircle className="h-3 w-3" /> À téléverser
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">{(contract.nominalPaid || 0).toLocaleString('fr-FR')} FCFA</td>
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
                              <DropdownMenuContent align="end" className="min-w-[200px]">
                                <DropdownMenuItem
                                  onClick={() => router.push(`/caisse-speciale/contrats/${contract.id}`)}
                                  className="cursor-pointer"
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  Ouvrir
                                </DropdownMenuItem>
                                {hasValidContractPdf(contract) ? (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => handleViewUploadedContractPDF(contract)}
                                      className="cursor-pointer"
                                    >
                                      <FileText className="h-4 w-4 mr-2" />
                                      Voir contrat
                                    </DropdownMenuItem>
                                    {canReplaceContractPdf(contract) && (
                                      <DropdownMenuItem
                                        onClick={() => setContractToReplacePdf(contract)}
                                        className="cursor-pointer"
                                      >
                                        <FileEdit className="h-4 w-4 mr-2" />
                                        Modifier contrat
                                      </DropdownMenuItem>
                                    )}
                                  </>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={() => handleUploadPDF(contract)}
                                    className="cursor-pointer"
                                  >
                                    <Upload className="h-4 w-4 mr-2" />
                                    Téléverser le document PDF
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => handleViewContractPDF(contract)}
                                  className="cursor-pointer"
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Télécharger contrat
                                </DropdownMenuItem>
                                {contractRefunds[contract.id]?.FINAL?.document?.url && (
                                  <DropdownMenuItem
                                    onClick={() => handleViewRefundPDF(contract.id, 'FINAL')}
                                    className="cursor-pointer"
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    Contrat de remboursement
                                  </DropdownMenuItem>
                                )}
                                {contractRefunds[contract.id]?.EARLY?.document?.url && (
                                  <DropdownMenuItem
                                    onClick={() => handleViewRefundPDF(contract.id, 'EARLY')}
                                    className="cursor-pointer"
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    Contrat de résiliation
                                  </DropdownMenuItem>
                                )}
                                {contract.memberSignedStatus === 'PENDING_ADMIN' && (
                                  <DropdownMenuItem
                                    onClick={() => handleValidateContract(contract)}
                                    className="cursor-pointer text-amber-700 focus:text-amber-700 focus:bg-amber-50"
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Valider contrat signé
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => setContractToDelete(contract)}
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
        <Card className="rounded-t-none rounded-b-2xl border-x border-b border-[#234D65]/20 bg-gradient-to-b from-white via-slate-50/40 to-[#234D65]/[0.05] shadow-sm">
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
                    className="h-12 px-6 border-2 border-gray-300 cursor-pointer hover:border-gray-400 transition-all duration-300 hover:scale-105"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Réinitialiser les filtres
                  </Button>
                )}
                <Button
                  onClick={handleCreateContract}
                  className="h-12 px-6 bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65] text-white border-0 cursor-pointer shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un contrat
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal PDF */}
      {selectedContractForPDF && (
        <CaisseSpecialePDFModal
          isOpen={isPDFModalOpen}
          onClose={handleClosePDFModal}
          contractId={selectedContractForPDF.id}
          contractData={selectedContractForPDF}
        />
      )}

      {/* Modal Téléversement PDF */}
      {selectedContractForUpload && (
        <ContractPdfUploadModal
          isOpen={isUploadModalOpen}
          onClose={handleCloseUploadModal}
          contractId={selectedContractForUpload.id}
          contractName={`Contrat #${selectedContractForUpload.id.slice(-6)}`}
          onSuccess={handleUploadSuccess}
          contract={selectedContractForUpload}
        />
      )}

      {/* Modal Contrat Uploadé */}
      {selectedContractForViewUploaded && (
        <ViewUploadedContractModal
          isOpen={isViewUploadedModalOpen}
          onClose={handleCloseViewUploadedModal}
          contract={selectedContractForViewUploaded}
          documentId={selectedViewDocumentId}
        />
      )}

      {/* Modal Validation contrat signé membre */}
      {selectedContractForValidation && (
        <ValidateMemberSignedCSModal
          open={isValidationModalOpen}
          onOpenChange={(open) => {
            setIsValidationModalOpen(open)
            if (!open) setSelectedContractForValidation(null)
          }}
          contract={selectedContractForValidation}
        />
      )}

      {/* Modal récapitulatif complet du contrat */}
      {selectedContractForOverview && (
        <Dialog open={!!selectedContractForOverview} onOpenChange={(open) => { if (!open) setSelectedContractForOverview(null) }}>
          <DialogContent className="!w-[95vw] !max-w-[1400px] p-0 overflow-hidden border-0 shadow-2xl">
            {(() => {
              const contract = selectedContractForOverview.contract
              const member = selectedContractForOverview.member
              const emergency = contract?.emergencyContact
              const emergencyMember = emergency?.memberId ? membersMap.get(normalizeMemberId(emergency.memberId)) : undefined
              const hasPdf = hasValidContractPdf(contract)
              const contractStatus = getStatusLabel(contract?.status || 'DRAFT')
              const memberFullName = `${member?.firstName || ''} ${member?.lastName || ''}`.trim() || 'Membre non renseigné'
              const memberInitials = `${member?.firstName?.[0] || ''}${member?.lastName?.[0] || ''}`.toUpperCase() || 'CS'
              const contacts = member?.contacts?.length ? member.contacts.join(' • ') : '—'
              const memberEmail = member?.email || '—'
              const firstPaymentDate = contract?.firstPaymentDate ? new Date(contract.firstPaymentDate).toLocaleDateString('fr-FR') : '—'
              const nextDueDate = contract?.nextDueAt ? new Date(contract.nextDueAt).toLocaleDateString('fr-FR') : '—'
              const monthlyAmount = (contract?.monthlyAmount || 0).toLocaleString('fr-FR')
              const paidAmount = (contract?.nominalPaid || 0).toLocaleString('fr-FR')
              const durationMonths = contract?.monthsPlanned || 0

              return (
                <div className="bg-gradient-to-b from-white via-white to-slate-50/80 text-sm">
                  <DialogHeader className="border-b border-[#234D65]/15 bg-gradient-to-r from-[#234D65] via-[#285773] to-[#234D65] px-6 py-5 text-white">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <DialogTitle className="text-xl font-semibold tracking-tight text-white">Détails complets du contrat</DialogTitle>
                        <p className="mt-1 text-sm text-white/85">Vue détaillée harmonisée avec le thème Caisse Spéciale</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={cn('border bg-white/90 text-xs font-semibold', getStatusColor(contract?.status || 'DRAFT'))}>
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
                              {member?.photoURL ? (
                                <AvatarImage src={member.photoURL} alt={`Photo de ${memberFullName}`} className="h-full w-full object-cover object-center" />
                              ) : (
                                <AvatarFallback className="rounded-xl bg-gradient-to-br from-[#234D65] to-[#2c5a73] text-white text-base font-semibold">
                                  {isGroupContract(contract) ? <GroupIcon className="h-5 w-5" /> : memberInitials}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div className="min-w-0 flex-1 space-y-1">
                              <p className="truncate text-base font-semibold text-slate-900">{memberFullName}</p>
                              <p className="font-mono text-xs text-slate-500">{member?.matricule || 'Matricule non renseigné'}</p>
                              <div className="flex flex-wrap gap-2 pt-1">
                                <Badge className="border border-[#234D65]/25 bg-[#234D65]/10 text-[#234D65] hover:bg-[#234D65]/15">
                                  <User className="mr-1 h-3.5 w-3.5" />
                                  {getContractTypeLabel(contract)}
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
                              <p className="mt-1 font-medium text-slate-900">{emergency?.phone1 || (emergency as any)?.phone || '—'}</p>
                            </div>
                          </div>
                          {emergency?.memberId && (
                            emergencyMember ? (
                              <div className="mt-3 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                                <Avatar className="size-8 shrink-0 rounded-lg">
                                  {emergencyMember.photoURL ? (
                                    <AvatarImage src={emergencyMember.photoURL} className="object-cover" alt="" />
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
                              <p className="text-[11px] uppercase tracking-wide text-slate-500">Total versé</p>
                              <p className="text-base font-semibold text-slate-900">{paidAmount} FCFA</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
                              <p className="text-[11px] uppercase tracking-wide text-slate-500">Durée prévue</p>
                              <p className="text-base font-semibold text-slate-900">{durationMonths} mois</p>
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
                              <p className="text-[11px] uppercase tracking-wide text-slate-500">Prochaine échéance</p>
                              <p className="text-base font-semibold text-slate-900">{nextDueDate}</p>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-[#234D65]/15 bg-white p-4 shadow-sm">
                          <div className="mb-2 flex items-center gap-2">
                            <FileText className="h-4 w-4 text-[#234D65]" />
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#234D65]">Document</p>
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

      {/* Modal Suppression contrat */}
      <DeleteCaisseSpecialeContractModal
        isOpen={!!contractToDelete}
        onClose={() => setContractToDelete(null)}
        contract={contractToDelete}
        onSuccess={() => setContractToDelete(null)}
      />

      {/* Modal Modifier contrat (remplacer PDF) */}
      <ReplaceCaisseSpecialeContractPdfModal
        isOpen={!!contractToReplacePdf}
        onClose={() => setContractToReplacePdf(null)}
        contract={contractToReplacePdf}
        onSuccess={() => {
          setContractToReplacePdf(null)
          refetch()
        }}
      />
    </div>
  )
}

export default ListContracts
