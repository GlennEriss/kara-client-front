'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ListPagination } from '@/components/ui/list-pagination'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
import routes from '@/constantes/routes'
import { useCaisseSpecialeDemands, useCaisseSpecialeDemandsStats } from '@/hooks/caisse-speciale/useCaisseSpecialeDemands'
import { useCaisseSpecialeDemandesRealtimeSync } from '@/hooks/caisse-speciale/useCaisseSpecialeDemandesRealtimeSync'
import { useDebounce } from '@/hooks/useDebounce'
import { useMember } from '@/hooks/useMembers'
import { cn } from '@/lib/utils'
import type { CaisseSpecialeDemandFilters } from '@/types/types'
import { CaisseSpecialeDemand, CaisseSpecialeDemandStatus } from '@/types/types'
import { useQueryClient } from '@tanstack/react-query'
import {
    AlertCircle,
    CheckCircle,
    ChevronDown,
    Clock,
    Eye,
    FileEdit,
    FileText,
    Filter,
    Grid3X3,
    List,
    MoreVertical,
    Plus,
    RefreshCw,
    RotateCcw,
    Search,
    Trash2,
    XCircle,
} from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import React, { useEffect, useState } from 'react'
import AcceptDemandModal from './AcceptDemandModal'
import CreateDemandModal from './CreateDemandModal'
import DeleteDemandModal from './DeleteDemandModal'
import RejectDemandModal from './RejectDemandModal'
import ReopenDemandModal from './ReopenDemandModal'
import StatisticsCaisseSpecialeDemandes from './StatisticsCaisseSpecialeDemandes'
import { StatusFilterBadgesCarousel } from './StatusFilterBadgesCarousel'

type ViewMode = 'grid' | 'list'
type DemandSortOption =
  | 'date_desc'
  | 'date_asc'
  | 'alphabetical_asc'
  | 'alphabetical_desc'
  | 'requested_amount_asc'
  | 'requested_amount_desc'

const statusUiConfig: Record<CaisseSpecialeDemandStatus, {
  label: string
  color: string
  dot: string
  text: string
}> = {
  PENDING:   { label: 'En attente', color: 'bg-amber-100 text-amber-800 border-amber-200', dot: 'bg-amber-400',  text: 'text-amber-700'  },
  APPROVED:  { label: 'Acceptée',   color: 'bg-green-100 text-green-800 border-green-200', dot: 'bg-green-500',  text: 'text-green-700'  },
  REJECTED:  { label: 'Refusée',    color: 'bg-red-100 text-red-800 border-red-200',       dot: 'bg-red-400',    text: 'text-red-700'    },
  CONVERTED: { label: 'Convertie',  color: 'bg-blue-100 text-blue-800 border-blue-200',    dot: 'bg-blue-400',   text: 'text-blue-700'   },
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

// Carte de demande avec chargement des infos membre
const DemandCard = ({
  demande,
  setAcceptModalState,
  setRejectModalState,
  setReopenModalState,
  setDeleteModalState,
}: {
  demande: CaisseSpecialeDemand
  setAcceptModalState: (s: { isOpen: boolean; demand: CaisseSpecialeDemand | null }) => void
  setRejectModalState: (s: { isOpen: boolean; demand: CaisseSpecialeDemand | null }) => void
  setReopenModalState: (s: { isOpen: boolean; demand: CaisseSpecialeDemand | null }) => void
  setDeleteModalState: (s: { isOpen: boolean; demand: CaisseSpecialeDemand | null; memberMatricule?: string }) => void
}) => {
  const router = useRouter()
  const { data: member, isLoading: isLoadingMember } = useMember(demande.memberId)
  const statusInfo = statusUiConfig[demande.status] || statusUiConfig.PENDING
  const canAcceptOrReject = demande.status === 'PENDING'
  const canReopen = demande.status === 'REJECTED'
  const demandReason = (demande.cause || (demande as CaisseSpecialeDemand & { reason?: string }).reason || '').trim()

  // Extraire les contacts
  let memberPhone: string | undefined
  if (member) {
    if (Array.isArray(member.contacts) && member.contacts.length > 0) {
      memberPhone = typeof member.contacts[0] === 'string' ? member.contacts[0] : String(member.contacts[0])
    } else if (typeof member.contacts === 'string') {
      memberPhone = member.contacts
    }
  }

  const memberPhotoUrl = member?.photoURL || ''
  const memberInitials = `${(member?.firstName || '')[0] || ''}${(member?.lastName || '')[0] || ''}`.toUpperCase()
  const requestedTotalAmount = Number(demande.monthlyAmount || 0) * Number(demande.monthsPlanned || 0)

  return (
    <Card className="group flex h-full flex-col rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-200 hover:border-gray-200 hover:shadow-md">
      <CardContent className="p-4 md:p-5 flex-1 flex flex-col gap-4">
        {/* Header : avatar + nom à gauche, statut dot + menu à droite */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="size-9 shrink-0 rounded-xl">
              {memberPhotoUrl ? (
                <AvatarImage
                  src={memberPhotoUrl}
                  alt={`Photo de ${member?.firstName || ''} ${member?.lastName || ''}`}
                  className="h-full w-full object-cover object-center"
                />
              ) : null}
              <AvatarFallback className="rounded-xl bg-[#234D65] text-[11px] font-semibold text-white">
                {memberInitials || '--'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              {isLoadingMember ? (
                <span className="text-sm text-gray-400 animate-pulse">Chargement...</span>
              ) : (
                <>
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {`${member?.firstName ?? ''} ${member?.lastName ?? ''}`.trim() || '—'}
                  </p>
                  <p className="truncate text-xs text-gray-400">
                    {memberPhone || member?.email || '—'}
                  </p>
                </>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <span className={cn('flex items-center gap-1.5 text-xs font-semibold', statusInfo.text)}>
              <span className={cn('w-2 h-2 rounded-full shrink-0', statusInfo.dot)} />
              {statusInfo.label}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-80 transition-all group-hover:opacity-100"
                  title="Actions"
                >
                  <MoreVertical className="h-4 w-4 text-[#234D65]" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[190px]">
                <DropdownMenuItem
                  onClick={() => router.push(`/caisse-speciale/demandes/${demande.id}`)}
                  className="cursor-pointer"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Voir détails
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => router.push(routes.admin.caisseSpecialeDemandEdit(demande.id))}
                  className="cursor-pointer"
                >
                  <FileEdit className="h-4 w-4 mr-2" />
                  Modifier
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setDeleteModalState({ isOpen: true, demand: demande, memberMatricule: member?.matricule })}
                  className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Matricule */}
        <div className="rounded-lg bg-[#234D65]/[0.06] px-2.5 py-1.5 text-xs font-mono font-semibold text-[#234D65]">
          {member?.matricule || demande.memberId || '—'}
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-xl bg-gray-50 p-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Total demandé</p>
            <p className="font-bold text-[#234D65] tabular-nums text-sm">
              {requestedTotalAmount.toLocaleString('fr-FR')} <span className="text-[10px] font-normal text-gray-400">FCFA</span>
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Mensualité</p>
            <p className="font-bold text-gray-900 tabular-nums text-sm">
              {demande.monthlyAmount.toLocaleString('fr-FR')} <span className="text-[10px] font-normal text-gray-400">FCFA</span>
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Nb de mois</p>
            <p className="font-bold text-gray-900 tabular-nums text-sm">{demande.monthsPlanned} <span className="text-[10px] font-normal text-gray-400">mois</span></p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Date souhaitée</p>
            <p className="font-bold text-gray-900 tabular-nums text-sm">
              {demande.desiredDate ? new Date(demande.desiredDate).toLocaleDateString('fr-FR') : '—'}
            </p>
          </div>
        </div>

        <div className="mt-auto min-h-[3.25rem] border-t border-slate-200 pt-3 text-sm">
          <span className="text-slate-500">Motif: </span>
          <span className="font-medium text-slate-900">{demandReason || '—'}</span>
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-200 pt-3">
          {canAcceptOrReject && (
            <>
              <Button
                onClick={() => setAcceptModalState({ isOpen: true, demand: demande })}
                className="h-9 w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Accepter
              </Button>
              <Button
                variant="outline"
                onClick={() => setRejectModalState({ isOpen: true, demand: demande })}
                className="h-9 w-full border-red-200 text-red-600 hover:bg-red-50"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Refuser
              </Button>
            </>
          )}

          {canReopen && (
            <Button
              variant="outline"
              onClick={() => setReopenModalState({ isOpen: true, demand: demande })}
              className="h-9 w-full border-blue-200 text-blue-600 hover:bg-blue-50"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Réouvrir
            </Button>
          )}

          <Button
            onClick={() => router.push(`/caisse-speciale/demandes/${demande.id}`)}
            className="h-9 w-full bg-[#234D65] hover:bg-[#2c5a73] text-white text-sm font-semibold"
          >
            <Eye className="h-4 w-4 mr-2" />
            Voir détails
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

const MemberTableCell = ({ demande }: { demande: CaisseSpecialeDemand }) => {
  const { data: member } = useMember(demande.memberId)
  const memberPhotoUrl = member?.photoURL || ''
  const memberInitials = `${(member?.firstName || '')[0] || ''}${(member?.lastName || '')[0] || ''}`.toUpperCase()
  return (
    <div className="flex items-center gap-2">
      <Avatar className="h-10 w-10 shrink-0">
        {memberPhotoUrl ? (
          <AvatarImage src={memberPhotoUrl} alt={`Photo de ${member?.firstName || ''} ${member?.lastName || ''}`} className="h-full w-full object-cover object-center" />
        ) : null}
        <AvatarFallback className="bg-[#234D65] text-[11px] font-semibold text-white">
          {memberInitials || '--'}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <div className="font-medium">
          {member?.firstName || '—'} {member?.lastName || '—'}
        </div>
        <div className="text-xs text-gray-500">
          {member?.matricule || demande.memberId || '—'}
        </div>
      </div>
    </div>
  )
}

// Ligne du tableau (composant pour pouvoir utiliser useMember)
const DemandTableRow = ({
  demande,
  setAcceptModalState,
  setRejectModalState,
  setReopenModalState,
  setDeleteModalState,
}: {
  demande: CaisseSpecialeDemand
  setAcceptModalState: (s: { isOpen: boolean; demand: CaisseSpecialeDemand | null }) => void
  setRejectModalState: (s: { isOpen: boolean; demand: CaisseSpecialeDemand | null }) => void
  setReopenModalState: (s: { isOpen: boolean; demand: CaisseSpecialeDemand | null }) => void
  setDeleteModalState: (s: { isOpen: boolean; demand: CaisseSpecialeDemand | null; memberMatricule?: string }) => void
}) => {
  const router = useRouter()
  const { data: member } = useMember(demande.memberId)
  const statusInfo = statusUiConfig[demande.status] || statusUiConfig.PENDING
  return (
    <TableRow className="border-b border-slate-100 transition-colors hover:bg-[#234D65]/[0.045]">
      <TableCell>
        <Badge className={cn('text-xs border', statusInfo.color)}>{statusInfo.label}</Badge>
      </TableCell>
      <TableCell>
        <MemberTableCell demande={demande} />
      </TableCell>
      <TableCell className="hidden md:table-cell">{member?.contacts?.[0] || member?.email || '—'}</TableCell>
      <TableCell className="hidden lg:table-cell">{(Number(demande.monthlyAmount || 0) * Number(demande.monthsPlanned || 0)).toLocaleString('fr-FR')} FCFA</TableCell>
      <TableCell className="hidden lg:table-cell">{demande.monthsPlanned} mois</TableCell>
      <TableCell className="hidden md:table-cell">{demande.desiredDate ? new Date(demande.desiredDate).toLocaleDateString('fr-FR') : '—'}</TableCell>
      <TableCell className="text-right">
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
                onClick={() => router.push(`/caisse-speciale/demandes/${demande.id}`)}
                className="cursor-pointer"
              >
                <Eye className="h-4 w-4 mr-2" />
                Voir détails
              </DropdownMenuItem>
              {demande.status === 'PENDING' && (
                <>
                  <DropdownMenuItem
                    onClick={() => router.push(routes.admin.caisseSpecialeDemandEdit(demande.id))}
                    className="cursor-pointer"
                  >
                    <FileEdit className="h-4 w-4 mr-2" />
                    Modifier
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setAcceptModalState({ isOpen: true, demand: demande })}
                    className="cursor-pointer"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Accepter
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setRejectModalState({ isOpen: true, demand: demande })}
                    className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Refuser
                  </DropdownMenuItem>
                </>
              )}
              {demande.status === 'REJECTED' && (
                <DropdownMenuItem
                  onClick={() => setReopenModalState({ isOpen: true, demand: demande })}
                  className="cursor-pointer"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Réouvrir
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => setDeleteModalState({ isOpen: true, demand: demande, memberMatricule: member?.matricule })}
                className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  )
}

// Composant principal
const ListDemandes = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()

  // Synchronisation temps réel multi-admin (actions demandes)
  useCaisseSpecialeDemandesRealtimeSync(true)
  
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'converted'>(
    (searchParams.get('tab') as any) || 'all'
  )
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1)
  const [itemsPerPage] = useState(Number(searchParams.get('limit')) || 12)
  const [viewMode, setViewMode] = useState<ViewMode>((searchParams.get('view') as ViewMode) || 'grid')
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const [caisseTypeFilter, setCaisseTypeFilter] = useState<string>(searchParams.get('caisseType') || 'all')
  const [createdAtFrom, setCreatedAtFrom] = useState<string>(searchParams.get('createdAtFrom') || '')
  const [createdAtTo, setCreatedAtTo] = useState<string>(searchParams.get('createdAtTo') || '')
  const [desiredDateFrom, setDesiredDateFrom] = useState<string>(searchParams.get('desiredDateFrom') || '')
  const [desiredDateTo, setDesiredDateTo] = useState<string>(searchParams.get('desiredDateTo') || '')
  const [currentMonthOnly, setCurrentMonthOnly] = useState<boolean>(searchParams.get('currentMonthOnly') === '1')
  const [requestedAmountMin, setRequestedAmountMin] = useState<string>(searchParams.get('requestedAmountMin') || '')
  const [requestedAmountMax, setRequestedAmountMax] = useState<string>(searchParams.get('requestedAmountMax') || '')
  const [monthsPlannedMin, setMonthsPlannedMin] = useState<string>(searchParams.get('monthsPlannedMin') || '')
  const [monthsPlannedMax, setMonthsPlannedMax] = useState<string>(searchParams.get('monthsPlannedMax') || '')
  const [monthlyAmountMin, setMonthlyAmountMin] = useState<string>(searchParams.get('monthlyAmountMin') || '')
  const [monthlyAmountMax, setMonthlyAmountMax] = useState<string>(searchParams.get('monthlyAmountMax') || '')
  const [memberGender, setMemberGender] = useState<'all' | 'Homme' | 'Femme'>(
    (searchParams.get('memberGender') as 'all' | 'Homme' | 'Femme') || 'all'
  )
  const [sortOption, setSortOption] = useState<DemandSortOption>(
    (searchParams.get('sort') as DemandSortOption) || 'date_desc'
  )
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(() =>
    Boolean(
      searchParams.get('createdAtFrom') ||
      searchParams.get('createdAtTo') ||
      searchParams.get('desiredDateFrom') ||
      searchParams.get('desiredDateTo') ||
      searchParams.get('currentMonthOnly') === '1' ||
      searchParams.get('requestedAmountMin') ||
      searchParams.get('requestedAmountMax') ||
      searchParams.get('monthsPlannedMin') ||
      searchParams.get('monthsPlannedMax') ||
      searchParams.get('monthlyAmountMin') ||
      searchParams.get('monthlyAmountMax')
    )
  )
  const debouncedSearch = useDebounce(searchQuery, 300)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [acceptModalState, setAcceptModalState] = useState<{
    isOpen: boolean
    demand: CaisseSpecialeDemand | null
  }>({
    isOpen: false,
    demand: null,
  })
  const [rejectModalState, setRejectModalState] = useState<{
    isOpen: boolean
    demand: CaisseSpecialeDemand | null
  }>({
    isOpen: false,
    demand: null,
  })
  const [reopenModalState, setReopenModalState] = useState<{
    isOpen: boolean
    demand: CaisseSpecialeDemand | null
  }>({
    isOpen: false,
    demand: null,
  })
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean
    demand: CaisseSpecialeDemand | null
    memberMatricule?: string
  }>({
    isOpen: false,
    demand: null,
  })
  // Synchroniser l'URL avec l'état
  useEffect(() => {
    const params = new URLSearchParams()
    if (activeTab !== 'all') params.set('tab', activeTab)
    if (currentPage > 1) params.set('page', currentPage.toString())
    if (itemsPerPage !== 12) params.set('limit', itemsPerPage.toString())
    if (viewMode !== 'grid') params.set('view', viewMode)
    if (sortOption !== 'date_desc') params.set('sort', sortOption)
    if (caisseTypeFilter !== 'all') params.set('caisseType', caisseTypeFilter)
    if (createdAtFrom) params.set('createdAtFrom', createdAtFrom)
    if (createdAtTo) params.set('createdAtTo', createdAtTo)
    if (desiredDateFrom) params.set('desiredDateFrom', desiredDateFrom)
    if (desiredDateTo) params.set('desiredDateTo', desiredDateTo)
    if (currentMonthOnly) params.set('currentMonthOnly', '1')
    if (requestedAmountMin) params.set('requestedAmountMin', requestedAmountMin)
    if (requestedAmountMax) params.set('requestedAmountMax', requestedAmountMax)
    if (monthsPlannedMin) params.set('monthsPlannedMin', monthsPlannedMin)
    if (monthsPlannedMax) params.set('monthsPlannedMax', monthsPlannedMax)
    if (monthlyAmountMin) params.set('monthlyAmountMin', monthlyAmountMin)
    if (monthlyAmountMax) params.set('monthlyAmountMax', monthlyAmountMax)
    if (memberGender !== 'all') params.set('memberGender', memberGender)
    
    const queryString = params.toString()
    const newUrl = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname
    
    if (window.location.search !== `?${queryString}`) {
      router.replace(newUrl, { scroll: false })
    }
  }, [
    activeTab,
    currentPage,
    itemsPerPage,
    viewMode,
    sortOption,
    caisseTypeFilter,
    createdAtFrom,
    createdAtTo,
    desiredDateFrom,
    desiredDateTo,
    currentMonthOnly,
    requestedAmountMin,
    requestedAmountMax,
    monthsPlannedMin,
    monthsPlannedMax,
    monthlyAmountMin,
    monthlyAmountMax,
    memberGender,
    router,
  ])

  // Hooks pour récupérer les données
  const getStatusFilter = () => {
    return activeTab === 'all' 
      ? undefined 
      : activeTab === 'pending' 
        ? 'PENDING' 
        : activeTab === 'approved'
          ? 'APPROVED'
          : activeTab === 'rejected'
            ? 'REJECTED'
            : 'CONVERTED'
  }

  const currentMonthDateRange = React.useMemo(() => {
    if (!currentMonthOnly) return { from: undefined as Date | undefined, to: undefined as Date | undefined }
    const now = new Date()
    const from = new Date(now.getFullYear(), now.getMonth(), 1)
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    return { from, to }
  }, [currentMonthOnly])

  const queryFilters: CaisseSpecialeDemandFilters = {
    status: getStatusFilter(),
    page: currentPage,
    limit: itemsPerPage,
    search: debouncedSearch.trim().length >= 2 ? debouncedSearch.trim() : undefined,
    caisseType: caisseTypeFilter !== 'all'
      ? (caisseTypeFilter as
          | 'STANDARD'
          | 'JOURNALIERE'
          | 'LIBRE'
          | 'STANDARD_CHARITABLE'
          | 'JOURNALIERE_CHARITABLE'
          | 'LIBRE_CHARITABLE')
      : undefined,
    createdAtFrom: currentMonthDateRange.from || (createdAtFrom ? new Date(createdAtFrom) : undefined),
    createdAtTo: currentMonthDateRange.to || (createdAtTo ? new Date(createdAtTo + 'T23:59:59') : undefined),
    desiredDateFrom: desiredDateFrom ? new Date(desiredDateFrom) : undefined,
    desiredDateTo: desiredDateTo ? new Date(desiredDateTo + 'T23:59:59') : undefined,
    requestedAmountMin: requestedAmountMin === '' ? undefined : Number(requestedAmountMin),
    requestedAmountMax: requestedAmountMax === '' ? undefined : Number(requestedAmountMax),
    monthsPlannedMin: monthsPlannedMin === '' ? undefined : Number(monthsPlannedMin),
    monthsPlannedMax: monthsPlannedMax === '' ? undefined : Number(monthsPlannedMax),
    monthlyAmountMin: monthlyAmountMin === '' ? undefined : Number(monthlyAmountMin),
    monthlyAmountMax: monthlyAmountMax === '' ? undefined : Number(monthlyAmountMax),
    memberGender,
    sortBy: sortOption.startsWith('alphabetical')
      ? 'alphabetical'
      : sortOption.startsWith('requested_amount')
        ? 'requestedAmount'
        : 'date',
    sortOrder: sortOption.endsWith('_asc') ? 'asc' : 'desc',
  }

  const resetFilters = () => {
    setSearchQuery('')
    setCaisseTypeFilter('all')
    setCreatedAtFrom('')
    setCreatedAtTo('')
    setDesiredDateFrom('')
    setDesiredDateTo('')
    setCurrentMonthOnly(false)
    setRequestedAmountMin('')
    setRequestedAmountMax('')
    setMonthsPlannedMin('')
    setMonthsPlannedMax('')
    setMonthlyAmountMin('')
    setMonthlyAmountMax('')
    setMemberGender('all')
    setSortOption('date_desc')
    setCurrentPage(1)
  }

  const { data, isLoading, error } = useCaisseSpecialeDemands(queryFilters)
  const demandes = data?.items ?? []
  const totalCount = data?.total ?? 0
  
  // Stats globales pour les compteurs des tabs
  const globalStatsFilters: CaisseSpecialeDemandFilters = {}
  const { data: statsData } = useCaisseSpecialeDemandsStats(globalStatsFilters)

  // Reset page when tab or filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [
    activeTab,
    debouncedSearch,
    caisseTypeFilter,
    createdAtFrom,
    createdAtTo,
    desiredDateFrom,
    desiredDateTo,
    currentMonthOnly,
    requestedAmountMin,
    requestedAmountMax,
    monthsPlannedMin,
    monthsPlannedMax,
    monthlyAmountMin,
    monthlyAmountMax,
    memberGender,
    sortOption,
  ])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['caisseSpecialeDemands'] })
    queryClient.invalidateQueries({ queryKey: ['caisseSpecialeDemandsStats'] })
  }

  // Les demandes sont déjà paginées côté serveur
  const currentDemandes = demandes
  const totalPages = Math.ceil(totalCount / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, totalCount)

  // Stats
  const stats = React.useMemo(() => {
    if (statsData) {
      return {
        total: statsData.total,
        pending: statsData.pending,
        approved: statsData.approved,
        rejected: statsData.rejected,
        converted: statsData.converted,
      }
    }
    return {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      converted: 0,
    }
  }, [statsData])

  const activeFiltersCount = React.useMemo(() => {
    let count = 0
    if (debouncedSearch.trim().length >= 2) count += 1
    if (sortOption !== 'date_desc') count += 1
    if (caisseTypeFilter !== 'all') count += 1
    if (memberGender !== 'all') count += 1
    if (createdAtFrom) count += 1
    if (createdAtTo) count += 1
    if (desiredDateFrom) count += 1
    if (desiredDateTo) count += 1
    if (currentMonthOnly) count += 1
    if (requestedAmountMin !== '') count += 1
    if (requestedAmountMax !== '') count += 1
    if (monthsPlannedMin !== '') count += 1
    if (monthsPlannedMax !== '') count += 1
    if (monthlyAmountMin !== '') count += 1
    if (monthlyAmountMax !== '') count += 1
    return count
  }, [
    debouncedSearch,
    sortOption,
    caisseTypeFilter,
    memberGender,
    createdAtFrom,
    createdAtTo,
    desiredDateFrom,
    desiredDateTo,
    currentMonthOnly,
    requestedAmountMin,
    requestedAmountMax,
    monthsPlannedMin,
    monthsPlannedMax,
    monthlyAmountMin,
    monthlyAmountMax,
  ])

  const activeAdvancedFiltersCount = React.useMemo(() => {
    let count = 0
    if (createdAtFrom) count += 1
    if (createdAtTo) count += 1
    if (desiredDateFrom) count += 1
    if (desiredDateTo) count += 1
    if (currentMonthOnly) count += 1
    if (requestedAmountMin !== '') count += 1
    if (requestedAmountMax !== '') count += 1
    if (monthsPlannedMin !== '') count += 1
    if (monthsPlannedMax !== '') count += 1
    if (monthlyAmountMin !== '') count += 1
    if (monthlyAmountMax !== '') count += 1
    return count
  }, [
    createdAtFrom,
    createdAtTo,
    desiredDateFrom,
    desiredDateTo,
    currentMonthOnly,
    requestedAmountMin,
    requestedAmountMax,
    monthsPlannedMin,
    monthsPlannedMax,
    monthlyAmountMin,
    monthlyAmountMax,
  ])

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
                Affichage {totalCount === 0 ? 0 : startIndex + 1}-{endIndex} sur {totalCount} demandes
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
      {/* Statistiques EN PREMIER (C.1) - chargées une seule fois */}
      <StatisticsCaisseSpecialeDemandes />

      {/* Barre filtres : version allégée et structurée */}
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
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
                className="h-10 rounded-xl border-2 border-[#234D65]/40 text-[#234D65] hover:bg-[#234D65] hover:text-white"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={resetFilters}
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

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(300px,2fr)_minmax(180px,1fr)_minmax(220px,1fr)_minmax(180px,1fr)]">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500">Recherche</Label>
              <div className="relative group">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-[#234D65]" />
                <Input
                  placeholder="Nom, prénom, matricule..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-11 rounded-xl border-2 border-slate-200 bg-white pl-10 focus-visible:border-[#234D65] focus-visible:ring-0"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500">Tri</Label>
              <Select
                value={sortOption}
                onValueChange={(v: DemandSortOption) => {
                  setSortOption(v)
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="h-11 rounded-xl border-2 border-slate-200 bg-white focus:border-[#234D65] focus:ring-0">
                  <SelectValue placeholder="Trier par" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-2 border-slate-200 shadow-xl">
                  <SelectItem value="date_desc">Plus récentes</SelectItem>
                  <SelectItem value="date_asc">Plus anciennes</SelectItem>
                  <SelectItem value="alphabetical_asc">Nom A→Z</SelectItem>
                  <SelectItem value="alphabetical_desc">Nom Z→A</SelectItem>
                  <SelectItem value="requested_amount_asc">Montant total: croissant</SelectItem>
                  <SelectItem value="requested_amount_desc">Montant total: décroissant</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500">Type de caisse</Label>
              <Select
                value={caisseTypeFilter}
                onValueChange={(v) => {
                  setCaisseTypeFilter(v)
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="h-11 rounded-xl border-2 border-slate-200 bg-white focus:border-[#234D65] focus:ring-0">
                  <SelectValue placeholder="Type de caisse" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-2 border-slate-200 shadow-xl">
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="STANDARD">Standard</SelectItem>
                  <SelectItem value="JOURNALIERE">Journalière</SelectItem>
                  <SelectItem value="LIBRE">Libre</SelectItem>
                  <SelectItem value="STANDARD_CHARITABLE">Standard Charitable</SelectItem>
                  <SelectItem value="JOURNALIERE_CHARITABLE">Journalière Charitable</SelectItem>
                  <SelectItem value="LIBRE_CHARITABLE">Libre Charitable</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500">Sexe du demandeur</Label>
              <Select
                value={memberGender}
                onValueChange={(v: 'all' | 'Homme' | 'Femme') => {
                  setMemberGender(v)
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="h-11 rounded-xl border-2 border-slate-200 bg-white focus:border-[#234D65] focus:ring-0">
                  <SelectValue placeholder="Sexe" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-2 border-slate-200 shadow-xl">
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="Homme">Homme</SelectItem>
                  <SelectItem value="Femme">Femme</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isFiltersExpanded && (
            <div className="rounded-2xl border border-[#234D65]/15 bg-gradient-to-br from-[#234D65]/[0.04] via-white to-slate-50 p-4 md:p-5">
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div className="space-y-4 rounded-xl border border-slate-200/80 bg-white/80 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Montants</p>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-500">Montant total demandé (FCFA)</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        min="0"
                        placeholder="Min"
                        value={requestedAmountMin}
                        onChange={(e) => setRequestedAmountMin(e.target.value)}
                        className="h-10 rounded-lg border-slate-200 bg-white focus-visible:ring-0 focus-visible:border-[#234D65]"
                      />
                      <Input
                        type="number"
                        min="0"
                        placeholder="Max"
                        value={requestedAmountMax}
                        onChange={(e) => setRequestedAmountMax(e.target.value)}
                        className="h-10 rounded-lg border-slate-200 bg-white focus-visible:ring-0 focus-visible:border-[#234D65]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-500">Mensualité (FCFA)</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        min="0"
                        placeholder="Min"
                        value={monthlyAmountMin}
                        onChange={(e) => setMonthlyAmountMin(e.target.value)}
                        className="h-10 rounded-lg border-slate-200 bg-white focus-visible:ring-0 focus-visible:border-[#234D65]"
                      />
                      <Input
                        type="number"
                        min="0"
                        placeholder="Max"
                        value={monthlyAmountMax}
                        onChange={(e) => setMonthlyAmountMax(e.target.value)}
                        className="h-10 rounded-lg border-slate-200 bg-white focus-visible:ring-0 focus-visible:border-[#234D65]"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 rounded-xl border border-slate-200/80 bg-white/80 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Durée et dates</p>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-500">Période de création</Label>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCurrentMonthOnly((prev) => !prev)}
                      className={cn(
                        'h-10 w-full justify-start rounded-lg border transition-colors',
                        currentMonthOnly
                          ? 'border-[#234D65] bg-[#234D65]/10 text-[#234D65] hover:bg-[#234D65]/15'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-[#234D65]/30'
                      )}
                    >
                      {currentMonthOnly ? 'Mois actuel (activé)' : 'Filtrer sur le mois actuel'}
                    </Button>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-500">Nombre de mois</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        min="0"
                        placeholder="Min"
                        value={monthsPlannedMin}
                        onChange={(e) => setMonthsPlannedMin(e.target.value)}
                        className="h-10 rounded-lg border-slate-200 bg-white focus-visible:ring-0 focus-visible:border-[#234D65]"
                      />
                      <Input
                        type="number"
                        min="0"
                        placeholder="Max"
                        value={monthsPlannedMax}
                        onChange={(e) => setMonthsPlannedMax(e.target.value)}
                        className="h-10 rounded-lg border-slate-200 bg-white focus-visible:ring-0 focus-visible:border-[#234D65]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-500">Date de création</Label>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <Input
                        type="date"
                        value={createdAtFrom}
                        onChange={(e) => setCreatedAtFrom(e.target.value)}
                        className="h-10 rounded-lg border-slate-200 bg-white focus-visible:ring-0 focus-visible:border-[#234D65]"
                      />
                      <Input
                        type="date"
                        value={createdAtTo}
                        onChange={(e) => setCreatedAtTo(e.target.value)}
                        className="h-10 rounded-lg border-slate-200 bg-white focus-visible:ring-0 focus-visible:border-[#234D65]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-500">Date souhaitée</Label>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <Input
                        type="date"
                        value={desiredDateFrom}
                        onChange={(e) => setDesiredDateFrom(e.target.value)}
                        className="h-10 rounded-lg border-slate-200 bg-white focus-visible:ring-0 focus-visible:border-[#234D65]"
                      />
                      <Input
                        type="date"
                        value={desiredDateTo}
                        onChange={(e) => setDesiredDateTo(e.target.value)}
                        className="h-10 rounded-lg border-slate-200 bg-white focus-visible:ring-0 focus-visible:border-[#234D65]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 pt-3">
            <div className="hidden items-center rounded-xl bg-gray-100 p-1 md:flex">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('grid')}
                className={`h-10 rounded-lg px-4 text-sm font-medium transition-all duration-200 ${viewMode === 'grid'
                  ? 'bg-white text-[#234D65] shadow-sm hover:bg-white'
                  : 'text-gray-500 hover:bg-transparent hover:text-gray-700'
                  }`}
              >
                <Grid3X3 className="mr-2 h-4 w-4" />
                Cards
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('list')}
                className={`h-10 rounded-lg px-4 text-sm font-medium transition-all duration-200 ${viewMode === 'list'
                  ? 'bg-white text-[#234D65] shadow-sm hover:bg-white'
                  : 'text-gray-500 hover:bg-transparent hover:text-gray-700'
                  }`}
              >
                <List className="mr-2 h-4 w-4" />
                Table
              </Button>
            </div>

            <p className="ml-auto text-xs font-medium text-slate-500">
              {totalCount.toLocaleString()} demande{totalCount > 1 ? 's' : ''} trouvée{totalCount > 1 ? 's' : ''}
            </p>
          </div>
        </CardContent>
      </Card>

      {renderPagination()}

      {/* Tabs de statut (rattachés à la liste) */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
        {/* Tabs desktop : style onglets classeur */}
        <div className="hidden lg:flex items-center gap-2 border-b border-gray-200">
          <div className="flex-1 min-w-0">
            <TabsList className="relative flex w-full flex-nowrap overflow-x-auto scrollbar-hide bg-transparent p-0 h-auto gap-0.5">
              <TabsTrigger
                value="all"
                className="shrink-0 min-w-[110px] px-3 py-2.5 text-sm rounded-t-lg rounded-b-none border-x border-t border-gray-200 bg-gray-50/70 font-semibold text-gray-600 transition-all data-[state=active]:z-10 data-[state=active]:bg-white data-[state=active]:text-[#234D65] data-[state=active]:border-[#234D65] data-[state=active]:shadow-none hover:bg-gray-100 hover:text-[#234D65]"
              >
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="whitespace-nowrap">Toutes</span>
                  <span className="ml-0.5 px-1.5 py-0.5 text-[11px] font-semibold rounded-full bg-gray-200/80 text-gray-700 shrink-0">
                    {stats.total}
                  </span>
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="pending"
                className="shrink-0 min-w-[110px] px-3 py-2.5 text-sm rounded-t-lg rounded-b-none border-x border-t border-gray-200 bg-gray-50/70 font-semibold text-gray-600 transition-all data-[state=active]:z-10 data-[state=active]:bg-white data-[state=active]:text-[#234D65] data-[state=active]:border-[#234D65] data-[state=active]:shadow-none hover:bg-gray-100 hover:text-[#234D65]"
              >
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span className="whitespace-nowrap">En attente</span>
                  <span className="ml-0.5 px-1.5 py-0.5 text-[11px] font-semibold rounded-full bg-gray-200/80 text-gray-700 shrink-0">
                    {stats.pending}
                  </span>
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="approved"
                className="shrink-0 min-w-[110px] px-3 py-2.5 text-sm rounded-t-lg rounded-b-none border-x border-t border-gray-200 bg-gray-50/70 font-semibold text-gray-600 transition-all data-[state=active]:z-10 data-[state=active]:bg-white data-[state=active]:text-[#234D65] data-[state=active]:border-[#234D65] data-[state=active]:shadow-none hover:bg-gray-100 hover:text-[#234D65]"
              >
                <span className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  <span className="whitespace-nowrap">Acceptées</span>
                  <span className="ml-0.5 px-1.5 py-0.5 text-[11px] font-semibold rounded-full bg-gray-200/80 text-gray-700 shrink-0">
                    {stats.approved}
                  </span>
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="rejected"
                className="shrink-0 min-w-[110px] px-3 py-2.5 text-sm rounded-t-lg rounded-b-none border-x border-t border-gray-200 bg-gray-50/70 font-semibold text-gray-600 transition-all data-[state=active]:z-10 data-[state=active]:bg-white data-[state=active]:text-[#234D65] data-[state=active]:border-[#234D65] data-[state=active]:shadow-none hover:bg-gray-100 hover:text-[#234D65]"
              >
                <span className="flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  <span className="whitespace-nowrap">Refusées</span>
                  <span className="ml-0.5 px-1.5 py-0.5 text-[11px] font-semibold rounded-full bg-gray-200/80 text-gray-700 shrink-0">
                    {stats.rejected}
                  </span>
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="converted"
                className="shrink-0 min-w-[110px] px-3 py-2.5 text-sm rounded-t-lg rounded-b-none border-x border-t border-gray-200 bg-gray-50/70 font-semibold text-gray-600 transition-all data-[state=active]:z-10 data-[state=active]:bg-white data-[state=active]:text-[#234D65] data-[state=active]:border-[#234D65] data-[state=active]:shadow-none hover:bg-gray-100 hover:text-[#234D65]"
              >
                <span className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  <span className="whitespace-nowrap">Converties</span>
                  <span className="ml-0.5 px-1.5 py-0.5 text-[11px] font-semibold rounded-full bg-gray-200/80 text-gray-700 shrink-0">
                    {stats.converted}
                  </span>
                </span>
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* Badges carousel - Vue mobile et tablette */}
        <div className="lg:hidden">
          <StatusFilterBadgesCarousel
            value={activeTab}
            onChange={(value) => setActiveTab(value)}
            counts={{
              all: stats.total,
              pending: stats.pending,
              approved: stats.approved,
              rejected: stats.rejected,
              converted: stats.converted,
            }}
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
          {viewMode === 'list' ? (
            <Card className="overflow-hidden rounded-t-none rounded-b-2xl border-x border-b border-[#234D65]/20 bg-gradient-to-b from-white to-slate-50/40 shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-[#234D65]/20 bg-gradient-to-r from-[#234D65]/10 via-[#234D65]/[0.06] to-transparent">
                    <TableHead className="w-[120px] font-semibold text-[#234D65]">Statut</TableHead>
                    <TableHead className="font-semibold text-[#234D65]">Membre</TableHead>
                    <TableHead className="hidden font-semibold text-[#234D65] md:table-cell">Contact</TableHead>
                    <TableHead className="hidden font-semibold text-[#234D65] lg:table-cell">Montant total</TableHead>
                    <TableHead className="hidden font-semibold text-[#234D65] lg:table-cell">Durée</TableHead>
                    <TableHead className="hidden font-semibold text-[#234D65] md:table-cell">Date souhaitée</TableHead>
                    <TableHead className="text-right font-semibold text-[#234D65]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentDemandes.map((demande) => (
                    <DemandTableRow
                      key={demande.id}
                      demande={demande}
                      setAcceptModalState={setAcceptModalState}
                      setRejectModalState={setRejectModalState}
                      setReopenModalState={setReopenModalState}
                      setDeleteModalState={setDeleteModalState}
                    />
                  ))}
                </TableBody>
              </Table>
            </Card>
          ) : (
            <div className="rounded-b-2xl border-x border-b border-[#234D65]/20 bg-gradient-to-b from-[#234D65]/[0.04] to-slate-50/30 p-4 md:p-5">
              <div className="grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
                {currentDemandes.map((demande, index) => (
                  <div
                    key={demande.id}
                    className="animate-in fade-in-0 slide-in-from-bottom-3 duration-500"
                    style={{ animationDelay: `${Math.min(index, 8) * 55}ms` }}
                  >
                    <DemandCard
                      demande={demande}
                      setAcceptModalState={setAcceptModalState}
                      setRejectModalState={setRejectModalState}
                      setReopenModalState={setReopenModalState}
                      setDeleteModalState={setDeleteModalState}
                    />
                  </div>
                ))}
              </div>
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
                  Aucune demande trouvée
                </h3>
                <p className="text-gray-600 text-lg max-w-md mx-auto leading-relaxed">
                  Il n'y a pas encore de demandes enregistrées dans le système.
                </p>
              </div>
              <div className="flex justify-center">
                <Button 
                  onClick={() => router.push(routes.admin.caisseSpecialeNewDemand)}
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
      <CreateDemandModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {/* Modal d'acceptation */}
      <AcceptDemandModal
        isOpen={acceptModalState.isOpen}
        onClose={() => setAcceptModalState({ isOpen: false, demand: null })}
        demand={acceptModalState.demand}
        onSuccess={() => {
          // Le cache React Query sera invalidé automatiquement par le hook
        }}
      />

      {/* Modal de refus */}
      <RejectDemandModal
        isOpen={rejectModalState.isOpen}
        onClose={() => setRejectModalState({ isOpen: false, demand: null })}
        demand={rejectModalState.demand}
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

      {/* Modal de suppression */}
      <DeleteDemandModal
        isOpen={deleteModalState.isOpen}
        onClose={() => setDeleteModalState({ isOpen: false, demand: null })}
        demand={deleteModalState.demand}
        memberMatricule={deleteModalState.memberMatricule}
        onSuccess={() => {
          // Le cache React Query sera invalidé automatiquement par le hook
        }}
      />
    </div>
  )
}

export default ListDemandes
