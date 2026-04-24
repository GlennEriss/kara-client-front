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
        <Button variant="outline" size="icon" className={cn('h-10 w-10 rounded-full bg-white/90 backdrop-blur-sm shadow-lg border-0 transition-all duration-300', canGoPrev ? 'hover:bg-white hover:scale-110 text-gray-700' : 'opacity-50 cursor-not-allowed')} onClick={goPrev} disabled={!canGoPrev}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
      </div>
      <div className="absolute top-1/2 -translate-y-1/2 right-0 z-10">
        <Button variant="outline" size="icon" className={cn('h-10 w-10 rounded-full bg-white/90 backdrop-blur-sm shadow-lg border-0 transition-all duration-300', canGoNext ? 'hover:bg-white hover:scale-110 text-gray-700' : 'opacity-50 cursor-not-allowed')} onClick={goNext} disabled={!canGoNext}>
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
}: {
  filters: any
  onFiltersChange: (filters: any) => void
  onReset: () => void
  activeTab: CaisseTypeTabValue
}) => {
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
  ].filter(Boolean) as string[]

  const activeFiltersCount = activeFilterLabels.length

  return (
    <Card className="relative overflow-hidden border border-slate-200/70 bg-white shadow-xl">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#234D65] via-[#2c5a73] to-[#cbb171]" />
      <CardContent className="space-y-5 p-4 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-gradient-to-br from-[#234D65] to-[#2c5a73] p-2.5 shadow-md">
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
              onClick={onReset}
              className="h-10 border-slate-300 text-slate-700 hover:border-[#234D65] hover:bg-[#234D65]/5 hover:text-[#234D65]"
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
                className="h-11 border-slate-200 bg-white pl-10 focus-visible:ring-[#234D65]/30"
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
              <SelectTrigger className="h-11 border-slate-200 bg-white focus:ring-[#234D65]/30">
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
              <SelectTrigger className="h-11 border-slate-200 bg-white focus:ring-[#234D65]/30 disabled:opacity-70">
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
              <SelectTrigger className="h-11 border-slate-200 bg-white focus:ring-[#234D65]/30">
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

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <div className="mb-2 flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase tracking-wide text-slate-600">Période de création</Label>
              {isNextDueRangeActive && (
                <span className="text-[11px] font-medium text-slate-500">Désactivé par l&apos;échéance</span>
              )}
            </div>
            <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_auto_1fr]">
              <Input
                type="date"
                className="h-10 border-slate-200 bg-white focus-visible:ring-[#234D65]/30"
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
                className="h-10 border-slate-200 bg-white focus-visible:ring-[#234D65]/30"
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

          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <div className="mb-2 flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase tracking-wide text-slate-600">Prochaine échéance</Label>
              {isCreatedAtRangeActive && (
                <span className="text-[11px] font-medium text-slate-500">Désactivé par la création</span>
              )}
            </div>
            <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_auto_1fr]">
              <Input
                type="date"
                className="h-10 border-slate-200 bg-white focus-visible:ring-[#234D65]/30"
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
                className="h-10 border-slate-200 bg-white focus-visible:ring-[#234D65]/30"
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
  const [isViewUploadedModalOpen, setIsViewUploadedModalOpen] = useState(false)
  const [contractToDelete, setContractToDelete] = useState<any>(null)
  const [contractToReplacePdf, setContractToReplacePdf] = useState<any>(null)
  const [contractRefunds, setContractRefunds] = useState<Record<string, any>>({})
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
      
      const refundsMap: Record<string, any> = {}
      
      for (const contract of contractsData) {
        if (!contract.id) continue
        try {
          const refunds = await listRefunds(contract.id)
          // Récupérer le refund avec un document (EARLY ou FINAL)
          const refundWithDoc = refunds.find((r: any) => r.document && r.document.url)
          if (refundWithDoc) {
            refundsMap[contract.id] = refundWithDoc
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

  const handleViewUploadedContractPDF = (contract: any) => {
    setSelectedContractForViewUploaded(contract)
    setIsViewUploadedModalOpen(true)
  }

  const _handleViewRefundPDF = (contract: any) => {
    const refund = contractRefunds[contract.id]
    if (refund && refund.document && refund.document.url) {
      // Ouvrir le PDF dans un nouvel onglet
      window.open(refund.document.url, '_blank')
    } else {
      toast.error('Document non disponible')
    }
  }

  const handleCloseViewUploadedModal = () => {
    setIsViewUploadedModalOpen(false)
    setSelectedContractForViewUploaded(null)
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
      const doc = new jsPDF('landscape')

      doc.setFontSize(16)
      doc.text('Liste des Contrats Caisse Spéciale', 14, 14)
      doc.setFontSize(10)
      doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 14, 20)
      doc.text(`Total: ${contractsData.length} contrat(s)`, 14, 24)

      const rows = buildExportData().map((row) => [
        row['ID Contrat'],
        row['Type'],
        row['Nom'],
        row['Statut'],
        row['Montant mensuel (FCFA)'],
        row['Durée (mois)'],
        row['Montant total (FCFA)'],
        row['Montant versé (FCFA)'],
        row['Montant restant (FCFA)'],
        row['Prochaine échéance'],
        row['Date de création'],
        row['Type de caisse'],
      ])

      const headers = [
        'ID',
        'Type',
        'Nom',
        'Statut',
        'Mensualité',
        'Durée',
        'Total',
        'Versé',
        'Restant',
        'Prochaine échéance',
        'Créé le',
        'Caisse',
      ]

      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 28,
        styles: { fontSize: 7, cellPadding: 1.5 },
        headStyles: { fillColor: [35, 77, 101], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        margin: { top: 28 },
      })

      // Pagination centrée en pied de page: "Page X / Y"
      const totalPages = doc.getNumberOfPages()
      const pageHeight = doc.internal.pageSize.getHeight()
      const pageWidth = doc.internal.pageSize.getWidth()
      doc.setFontSize(9)
      doc.setTextColor(75, 85, 99)
      for (let page = 1; page <= totalPages; page++) {
        doc.setPage(page)
        doc.text(`Page ${page} / ${totalPages}`, pageWidth / 2, pageHeight - 8, { align: 'center' })
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
      case 'JOURNALIERE':
        return 'Journalière'
      case 'LIBRE':
        return 'Libre'
      default:
        return type
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

  /** Contrat éligible à la suppression : DRAFT/ACTIVE, sans aucun versement (pas de 1er versement) ni pénalités. */
  const canDeleteCaisseContract = (contract: any) => {
    if (!contract?.id) return false
    const status = contract.status
    if (status !== 'DRAFT' && status !== 'ACTIVE') return false
    // Masquer Supprimer dès qu'il y a un 1er versement (nominalPaid > 0) ou des pénalités
    const hasFirstPayment = (contract.nominalPaid ?? 0) > 0
    const hasPenalties = (contract.penaltiesTotal ?? 0) > 0
    if (hasFirstPayment || hasPenalties) return false
    return true
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

  const renderPagination = () => {
    if (totalPages <= 1) return null
    return (
      <Card className="bg-gradient-to-r from-white via-gray-50/30 to-white border-0 shadow-lg">
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
                className="px-3 py-1"
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
                className="px-3 py-1"
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
      <Card className="bg-gradient-to-r from-white via-gray-50/50 to-white border-0 shadow-xl">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-6 lg:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-[#234D65] to-[#2c5a73] shadow-lg">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black bg-gradient-to-r from-[#234D65] to-[#2c5a73] bg-clip-text text-transparent">
                  Liste des Contrats
                </h2>
                <p className="text-gray-600 font-medium">
                  {totalCount.toLocaleString()} contrat{totalCount !== 1 ? 's' : ''} • Page {currentPage}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Boutons de vue modernes */}
              <div className="flex items-center bg-gray-100 rounded-xl p-1 shadow-inner hidden lg:flex">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className={`h-10 px-4 rounded-lg transition-all duration-300 ${viewMode === 'grid'
                    ? 'bg-[#234D65] hover:bg-[#2c5a73] text-white shadow-lg scale-105'
                    : 'hover:bg-white hover:shadow-md'
                    }`}
                >
                  <Grid3X3 className="h-4 w-4 mr-2" />
                  Grille
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className={`h-10 px-4 rounded-lg transition-all duration-300 ${viewMode === 'list'
                    ? 'bg-[#234D65] hover:bg-[#2c5a73] text-white shadow-lg scale-105'
                    : 'hover:bg-white hover:shadow-md'
                    }`}
                >
                  <List className="h-4 w-4 mr-2" />
                  Liste
                </Button>
              </div>

              {/* Actions avec animations */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
                className="h-12 sm:h-10 w-full sm:w-auto px-4 bg-white border-2 border-[#234D65] text-[#234D65] hover:bg-[#234D65] hover:text-white transition-all duration-300 hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:hover:scale-100"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={exportToExcel}
                disabled={isExporting || contractsData.length === 0}
                className="h-12 sm:h-10 w-full sm:w-auto px-4 bg-white border-2 border-green-300 hover:border-green-400 hover:bg-green-50 text-green-700 hover:text-green-800 transition-all duration-300 hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:hover:scale-100"
              >
                {isExporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-green-300 border-t-green-600 rounded-full animate-spin mr-2" />
                    Export...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Exporter Excel
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={exportToPDF}
                disabled={isExporting || contractsData.length === 0}
                className="h-12 sm:h-10 w-full sm:w-auto px-4 bg-white border-2 border-red-300 hover:border-red-400 hover:bg-red-50 text-red-700 hover:text-red-800 transition-all duration-300 hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:hover:scale-100"
              >
                {isExporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin mr-2" />
                    Export...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Exporter PDF
                  </>
                )}
              </Button>

              <Button
                size="sm"
                onClick={handleCreateContract}
                className="h-12 sm:h-10 w-full sm:w-auto px-4 bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
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
        <div className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
            : 'space-y-6'
        }>
          {[...Array(itemsPerPage)].map((_, i) => (
            <ModernSkeleton key={i} viewMode={viewMode} />
          ))}
        </div>
      ) : currentContracts.length > 0 ? (
        <>
          {viewMode === 'grid' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
            {currentContracts.map((contract: any, _index: number) => (
              <div
                key={contract.id}
                className="animate-in fade-in-0 slide-in-from-bottom-4"
                style={{ animationDelay: `${_index * 0.05}s` }}
              >
                <Card className="group hover:shadow-xl transition-all duration-500 hover:-translate-y-2 bg-gradient-to-br from-white via-gray-50/30 to-white border-0 shadow-lg overflow-hidden relative h-full flex flex-col">
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-gray-100/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  {/* Badge "En retard" */}
                  {isContractOverdue(contract) && (
                    <Badge variant="destructive" className="absolute top-3 right-3 z-20 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      En retard
                    </Badge>
                  )}

                  <CardContent className="p-6 relative z-10 flex-1 flex flex-col">
                    {(() => {
                      const member = contract.memberId ? membersMap.get(normalizeMemberId(contract.memberId)) : undefined
                      const memberContacts = member?.contacts?.length ? member.contacts.join(' / ') : '—'
                      const memberEmail = member?.email ? ` • ${member.email}` : ''
                      const emergency = contract.emergencyContact
                      const fullName = member ? `${member.firstName} ${member.lastName}` : ''
                      const initials = member
                        ? `${member.firstName?.[0] || ''}${member.lastName?.[0] || ''}`.toUpperCase()
                        : 'CS'

                      return (
                        <>
                          <div className="flex items-start gap-3">
                            <div className="shrink-0">
                              <Avatar className="size-12 border border-gray-200 shadow-sm">
                                {member?.photoURL ? (
                                  <AvatarImage src={member.photoURL} alt={`Photo de ${fullName}`} />
                                ) : (
                                  <AvatarFallback className="bg-slate-100 text-slate-600 font-semibold">
                                    {isGroupContract(contract) ? <GroupIcon className="h-5 w-5" /> : initials}
                                  </AvatarFallback>
                                )}
                              </Avatar>
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs text-gray-500">Matricule contrat</div>
                              <div className="font-mono text-sm font-bold text-gray-900 break-all">{contract.id}</div>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 mt-3">
                            <Badge className={isGroupContract(contract) ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-blue-100 text-blue-700 border border-blue-200'}>
                              {getContractType(contract)}
                            </Badge>
                            <Badge className={`border ${getStatusColor(contract.status)}`}>
                              {getStatusLabel(contract.status)}
                            </Badge>
                            {isContractOverdue(contract) && (
                              <Badge variant="destructive" className="flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                Retard
                              </Badge>
                            )}
                          </div>

                          <div className="space-y-2 mt-4 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500">Type de contrat:</span>
                              <span className="font-medium text-gray-900">{getContractTypeLabel(contract)}</span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-gray-500">Nom:</span>
                              <span className="font-medium text-gray-900">{member?.lastName || '—'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500">Prénom:</span>
                              <span className="font-medium text-gray-900">{member?.firstName || '—'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500">Matricule membre:</span>
                              <span className="font-mono text-xs font-semibold text-gray-900 break-all">{member?.matricule || '—'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500">Contacts:</span>
                              <span className="font-medium text-gray-900 text-right">{memberContacts}{memberEmail}</span>
                            </div>

                            <div className="pt-2 text-gray-500">Contact urgent:</div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500">Nom:</span>
                              <span className="font-medium text-gray-900">{emergency?.lastName || '—'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500">Prénom:</span>
                              <span className="font-medium text-gray-900">{emergency?.firstName || '—'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500">Téléphone:</span>
                              <span className="font-medium text-gray-900">{emergency?.phone1 || (emergency as any)?.phone || '—'}</span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-gray-500">Mensualité:</span>
                              <span className="font-semibold text-green-600">
                                {(contract.monthlyAmount || 0).toLocaleString('fr-FR')} FCFA
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500">Durée:</span>
                              <span className="font-medium text-gray-900">{contract.monthsPlanned} mois</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500">Début d'échéance:</span>
                              <div className="flex items-center gap-1 text-gray-700">
                                <Calendar className="h-3 w-3" />
                                {contract.firstPaymentDate ? new Date(contract.firstPaymentDate).toLocaleDateString('fr-FR') : '—'}
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500">Prochaine échéance:</span>
                              <div className="flex items-center gap-1 text-gray-700">
                                <Calendar className="h-3 w-3" />
                                {contract.nextDueAt ? new Date(contract.nextDueAt).toLocaleDateString('fr-FR') : '—'}
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500">Contrat PDF:</span>
                              <div className="flex items-center gap-1">
                                {hasValidContractPdf(contract) ? (
                                  <>
                                    <CheckCircle className="h-3 w-3 text-green-600" />
                                    <span className="text-green-600 font-medium">Disponible</span>
                                  </>
                                ) : (
                                  <>
                                    <AlertCircle className="h-3 w-3 text-orange-500" />
                                    <span className="text-orange-500 font-medium">À téléverser</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="text-xs text-gray-600 pt-2">
                              Versé: {(contract.nominalPaid || 0).toLocaleString('fr-FR')} FCFA
                            </div>
                          </div>

                          <div className="pt-3 border-t border-gray-100 mt-auto">
                            <div className="space-y-2">
                              {hasValidContractPdf(contract) ? (
                                <>
                                  <Button
                                    onClick={() => router.push(`/caisse-speciale/contrats/${contract.id}`)}
                                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 bg-white cursor-pointer text-[#224D62] border border-[#224D62] hover:bg-[#224D62] hover:text-white"
                                  >
                                    <Eye className="h-4 w-4" />
                                    Ouvrir
                                  </Button>
                                  <Button
                                    onClick={() => handleViewUploadedContractPDF(contract)}
                                    variant="outline"
                                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 border-2 border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400"
                                  >
                                    <FileText className="h-4 w-4" />
                                    Voir contrat
                                  </Button>
                                  {canReplaceContractPdf(contract) && (
                                    <Button
                                      onClick={() => setContractToReplacePdf(contract)}
                                      variant="outline"
                                      className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border-2 border-amber-300 text-amber-700 hover:bg-amber-50 hover:border-amber-400"
                                    >
                                      <FileEdit className="h-4 w-4" />
                                      Modifier contrat
                                    </Button>
                                  )}
                                </>
                              ) : (
                                <Button
                                  onClick={() => handleUploadPDF(contract)}
                                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 bg-orange-100 text-orange-700 border border-orange-200 hover:bg-orange-200 hover:text-orange-800"
                                >
                                  <Upload className="h-4 w-4" />
                                  Téléverser le document PDF
                                </Button>
                              )}

                              <Button
                                onClick={() => handleViewContractPDF(contract)}
                                variant="outline"
                                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 border-2 border-[#234D65] text-[#234D65] hover:bg-[#234D65] hover:text-white"
                              >
                                <FileText className="h-4 w-4" />
                                Télécharger contrat
                              </Button>
                              {canDeleteCaisseContract(contract) && (
                                <Button
                                  onClick={() => setContractToDelete(contract)}
                                  variant="destructive"
                                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-red-600 hover:bg-red-700 text-white"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Supprimer
                                </Button>
                              )}
                            </div>
                          </div>
                        </>
                      )
                    })()}
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
          )}

          {viewMode === 'list' && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-x-auto">
              <table className="min-w-[1400px] w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
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
                <tbody className="divide-y divide-gray-100">
                  {currentContracts.map((contract: any) => {
                    const member = contract.memberId ? membersMap.get(normalizeMemberId(contract.memberId)) : undefined
                    const contacts = member?.contacts?.length ? member.contacts.join(' / ') : '—'
                    const emergency = contract.emergencyContact
                    const fullName = member ? `${member.firstName} ${member.lastName}` : ''
                    const initials = member
                      ? `${member.firstName?.[0] || ''}${member.lastName?.[0] || ''}`.toUpperCase()
                      : 'CS'

                    return (
                      <tr key={contract.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3">
                          <Avatar className="size-9 border border-gray-200 shadow-sm">
                            {member?.photoURL ? (
                              <AvatarImage src={member.photoURL} alt={`Photo de ${fullName}`} />
                            ) : (
                              <AvatarFallback className="bg-slate-100 text-slate-600 font-semibold">
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
                                  className="h-8 w-8 rounded-full data-[state=open]:bg-gray-100"
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
                                  <FileText className="h-4 w-4 mr-2" />
                                  Télécharger contrat
                                </DropdownMenuItem>
                                {canDeleteCaisseContract(contract) && (
                                  <DropdownMenuItem
                                    onClick={() => setContractToDelete(contract)}
                                    className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Supprimer
                                  </DropdownMenuItem>
                                )}
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
                  {Object.values(filters).some(f => f !== 'all' && f !== '')
                    ? 'Essayez de modifier vos critères de recherche ou de réinitialiser les filtres.'
                    : 'Il n\'y a pas encore de contrats enregistrés dans le système.'
                  }
                </p>
              </div>
              <div className="flex justify-center space-x-4">
                {Object.values(filters).some(f => f !== 'all' && f !== '') && (
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
                  onClick={handleCreateContract}
                  className="h-12 px-6 bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
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
        />
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
