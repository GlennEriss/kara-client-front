/**
 * Section domaine : liste des demandes de placement
 * Design aligné sur Caisse Spéciale (ListDemandes) : stats, onglets, filtres, barre d'actions, grille/table, pagination.
 */

'use client'

import { useMyAccess } from '@/hooks/useMyAccess'
import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { ListPagination } from '@/components/ui/list-pagination'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import {
  FileText,
  RefreshCw,
  Grid3X3,
  List,
  AlertCircle,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Eye,
  RotateCcw,
  CreditCard,
  MoreVertical,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { PlacementDemand, PlacementDemandStatus } from '@/types/types'
import { useQueryClient } from '@tanstack/react-query'
import { usePlacementDemands, usePlacementDemandsStats, usePlacementDemandMutations } from '@/hooks/placement/usePlacementDemands'
import { usePlacementDemandesRealtimeSync } from '@/hooks/placement/usePlacementDemandesRealtimeSync'
import type { PlacementDemandFilters } from '@/types/types'
import { useDebounce } from '@/hooks/useDebounce'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import routes from '@/constantes/routes'
import { StatusFilterBadgesCarousel } from '@/components/caisse-speciale/StatusFilterBadgesCarousel'
import StatisticsPlacementDemandes from '@/components/placement/StatisticsPlacementDemandes'
import AcceptDemandModal from '@/components/placement/AcceptDemandModal'
import RejectDemandModal from '@/components/placement/RejectDemandModal'
import ReopenDemandModal from '@/components/placement/ReopenDemandModal'
import { useMember } from '@/hooks/useMembers'
import ConvertDemandToPlacementModal from '@/components/placement/ConvertDemandToPlacementModal'
import type { ConvertDemandToPlacementInput } from '@/schemas/placement.schema'

type ViewMode = 'grid' | 'list'
type TabValue = 'all' | 'pending' | 'approved' | 'rejected' | 'converted'

const ModernSkeleton = ({ viewMode }: { viewMode: ViewMode }) => (
  <Card className="group animate-pulse bg-gradient-to-br from-white to-gray-50/50 border-0 shadow-md">
    <CardContent className="p-6">
      <div className="flex items-center space-x-4">
        <Skeleton className="h-12 w-12 rounded-full bg-gradient-to-br from-gray-200 to-gray-300" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-3/4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full" />
          <Skeleton className="h-3 w-1/2 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-3 w-full bg-gradient-to-r from-gray-200 to-gray-300 rounded-full" />
      </div>
    </CardContent>
  </Card>
)

const getPayoutModeLabel = (mode: string) =>
  mode === 'MonthlyCommission_CapitalEnd'
    ? 'Commission mensuelle + Capital en fin'
    : 'Capital + Commission en fin'

const STATUS_DOT: Record<string, { dot: string; text: string }> = {
  PENDING:   { dot: 'bg-amber-400', text: 'text-amber-700' },
  APPROVED:  { dot: 'bg-green-500', text: 'text-green-700' },
  REJECTED:  { dot: 'bg-red-400',   text: 'text-red-700'   },
  CONVERTED: { dot: 'bg-blue-400',  text: 'text-blue-700'  },
}

// Ligne du tableau : une colonne par champ (nom, prénom, matricule, contacts, contact urgent, motif, etc.)
function PlacementDemandTableRow({
  demande,
  getStatusColor,
  getStatusLabel,
  setAcceptModalState,
  setRejectModalState,
  setReopenModalState,
  setConvertModalState,
}: {
  demande: PlacementDemand
  getStatusColor: (s: PlacementDemandStatus) => string
  getStatusLabel: (s: PlacementDemandStatus) => string
  setAcceptModalState: (s: { isOpen: boolean; demand: PlacementDemand | null }) => void
  setRejectModalState: (s: { isOpen: boolean; demand: PlacementDemand | null }) => void
  setReopenModalState: (s: { isOpen: boolean; demand: PlacementDemand | null }) => void
  setConvertModalState: (s: { isOpen: boolean; demand: PlacementDemand | null }) => void
}) {
  const { can } = useMyAccess()
  const router = useRouter()
  const { data: member, isLoading: memberLoading } = useMember(demande.benefactorId)
  const uc = demande.urgentContact
  const contactsStr = member?.contacts && Array.isArray(member.contacts)
    ? member.contacts.map((c) => (typeof c === 'string' ? c : String(c))).join(' / ')
    : member?.contacts
      ? String(member.contacts)
      : '—'
  const urgentPhones = [uc?.phone, uc?.phone2].filter(Boolean).join(' / ') || '—'

  return (
    <TableRow>
      <TableCell className="align-top">{memberLoading ? '…' : (member?.lastName ?? '—')}</TableCell>
      <TableCell className="align-top">{memberLoading ? '…' : (member?.firstName ?? '—')}</TableCell>
      <TableCell className="align-top">{memberLoading ? '…' : (member?.matricule ?? '—')}</TableCell>
      <TableCell className="align-top text-sm">{memberLoading ? '…' : contactsStr}</TableCell>
      <TableCell className="align-top">{uc?.name ?? '—'}</TableCell>
      <TableCell className="align-top">{uc?.firstName ?? '—'}</TableCell>
      <TableCell className="align-top text-sm">{urgentPhones}</TableCell>
      <TableCell className="align-top text-sm max-w-[200px]">{demande.cause ?? '—'}</TableCell>
      <TableCell className="align-top">{demande.amount.toLocaleString('fr-FR')} FCFA</TableCell>
      <TableCell className="align-top">{demande.rate}%</TableCell>
      <TableCell className="align-top">{demande.periodMonths} mois</TableCell>
      <TableCell className="align-top">{getPayoutModeLabel(demande.payoutMode)}</TableCell>
      <TableCell className="align-top">{demande.desiredDate ? new Date(demande.desiredDate).toLocaleDateString('fr-FR') : '—'}</TableCell>
      <TableCell className="align-top">
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(demande.status)}`}>
          {getStatusLabel(demande.status)}
        </span>
      </TableCell>
      <TableCell className="align-top text-right">
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
                onClick={() => router.push(routes.admin.placementDemandDetails(demande.id))}
                className="cursor-pointer"
              >
                <Eye className="h-4 w-4 mr-2" />
                Voir détails
              </DropdownMenuItem>
              {demande.status === 'PENDING' && can('placements.validate') && (
                <>
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
              {demande.status === 'REJECTED' && can('placements.validate') && (
                <DropdownMenuItem
                  onClick={() => setReopenModalState({ isOpen: true, demand: demande })}
                  className="cursor-pointer"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Réouvrir
                </DropdownMenuItem>
              )}
              {demande.status === 'APPROVED' && !demande.placementId && can('placements.validate') && (
                <DropdownMenuItem
                  onClick={() => setConvertModalState({ isOpen: true, demand: demande })}
                  className="cursor-pointer"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Créer le placement
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  )
}

// Carte grille : bloc détaillé (nom, prénom, matricule, contacts, contact urgent, motif) + reste
function PlacementDemandCard({
  demande,
  getStatusLabel,
  getPayoutModeLabel,
  setAcceptModalState,
  setRejectModalState,
  setReopenModalState,
  setConvertModalState,
  convertPending,
}: {
  demande: PlacementDemand
  getStatusLabel: (s: PlacementDemandStatus) => string
  getPayoutModeLabel: (mode: string) => string
  setAcceptModalState: (s: { isOpen: boolean; demand: PlacementDemand | null }) => void
  setRejectModalState: (s: { isOpen: boolean; demand: PlacementDemand | null }) => void
  setReopenModalState: (s: { isOpen: boolean; demand: PlacementDemand | null }) => void
  setConvertModalState: (s: { isOpen: boolean; demand: PlacementDemand | null }) => void
  convertPending: boolean
}) {
  const { can } = useMyAccess()
  const router = useRouter()
  const { data: member, isLoading: memberLoading } = useMember(demande.benefactorId)
  const uc = demande.urgentContact
  const contactsStr = member?.contacts && Array.isArray(member.contacts)
    ? member.contacts.map((c) => (typeof c === 'string' ? c : String(c))).join(' / ')
    : member?.contacts
      ? String(member.contacts)
      : '—'
  const urgentPhones = [uc?.phone, uc?.phone2].filter(Boolean).join(' / ') || '—'

  return (
    <Card className="group flex h-full flex-col rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-200 hover:border-gray-200 hover:shadow-md">
      <CardContent className="p-6 relative z-10 flex-1 flex flex-col gap-4">
        {/* Header : avatar + nom à gauche, statut dot + type à droite */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="size-9 shrink-0 rounded-xl">
              {member?.photoURL ? (
                <AvatarImage src={member.photoURL} alt={`${member?.firstName || ''} ${member?.lastName || ''}`} className="h-full w-full object-cover object-center" />
              ) : null}
              <AvatarFallback className="rounded-xl bg-[#234D65] text-[11px] font-semibold text-white">
                {`${(member?.firstName || '')[0] || ''}${(member?.lastName || '')[0] || ''}`.toUpperCase() || 'BF'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              {memberLoading ? (
                <span className="text-sm text-gray-400 animate-pulse">Chargement...</span>
              ) : (
                <>
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {`${member?.lastName ?? ''} ${member?.firstName ?? ''}`.trim() || '—'}
                  </p>
                  <p className="truncate text-xs text-gray-400">Mat. {member?.matricule ?? '—'}</p>
                  {/* Statut sous le nom (à droite il tronquait les noms longs). */}
                  <span className={`mt-1 flex items-center gap-1.5 text-xs font-semibold ${(STATUS_DOT[demande.status] || STATUS_DOT.PENDING).text}`}>
                    <span className={`w-2 h-2 rounded-full shrink-0 ${(STATUS_DOT[demande.status] || STATUS_DOT.PENDING).dot}`} />
                    {getStatusLabel(demande.status)}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 rounded-xl bg-gray-50 p-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Montant</p>
            <p className="font-bold text-[#234D65] tabular-nums text-sm">{demande.amount.toLocaleString('fr-FR')} <span className="text-[10px] font-normal text-gray-400">FCFA</span></p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Taux</p>
            <p className="font-bold text-gray-900 tabular-nums text-sm">{demande.rate}<span className="text-[10px] font-normal text-gray-400">%</span></p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Durée</p>
            <p className="font-bold text-gray-900 tabular-nums text-sm">{demande.periodMonths} <span className="text-[10px] font-normal text-gray-400">mois</span></p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Date souhaitée</p>
            <p className="text-sm font-medium text-gray-700">{demande.desiredDate ? new Date(demande.desiredDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}</p>
          </div>
        </div>

        {/* Détails : type, contacts, contact urgent, motif */}
        <div className="space-y-1 text-xs text-gray-500">
          <p className="truncate">Règlement : <span className="text-gray-700">{getPayoutModeLabel(demande.payoutMode)}</span></p>
          <p className="truncate">Contacts : <span className="text-gray-700">{contactsStr}</span></p>
          <p className="truncate">Contact urgent : <span className="text-gray-700">{[uc?.name, uc?.firstName].filter(Boolean).join(' ') || '—'}{urgentPhones !== '—' ? ` · ${urgentPhones}` : ''}</span></p>
          {demande.cause != null && demande.cause !== '' && (
            <p className="italic line-clamp-2">« {demande.cause} »</p>
          )}
          {demande.decisionMadeByName && (
            <p className="truncate">Décision par : <span className="text-gray-700">{demande.decisionMadeByName}</span></p>
          )}
        </div>
        <div className="pt-3 border-t border-gray-100 mt-auto flex flex-col gap-2">
          {demande.status === 'PENDING' && can('placements.validate') && (
            <>
              <Button size="sm" onClick={() => setAcceptModalState({ isOpen: true, demand: demande })} className="w-full h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold">
                <CheckCircle className="h-4 w-4 mr-1" /> Accepter
              </Button>
              <Button size="sm" variant="outline" onClick={() => setRejectModalState({ isOpen: true, demand: demande })} className="w-full h-9 text-xs border-red-200 text-red-600 hover:bg-red-50">
                <XCircle className="h-4 w-4 mr-1" /> Refuser
              </Button>
            </>
          )}
          {demande.status === 'REJECTED' && can('placements.validate') && (
            <Button size="sm" variant="outline" onClick={() => setReopenModalState({ isOpen: true, demand: demande })} className="w-full h-9 text-xs border-blue-200 text-blue-600 hover:bg-blue-50">
              <RotateCcw className="h-4 w-4 mr-1" /> Réouvrir
            </Button>
          )}
          {demande.status === 'APPROVED' && !demande.placementId && can('placements.validate') && (
            <Button
              size="sm"
              onClick={() => setConvertModalState({ isOpen: true, demand: demande })}
              disabled={convertPending}
              className="w-full h-9 bg-[#234D65] hover:bg-[#2c5a73] text-white text-sm font-semibold"
            >
              {convertPending ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Création...</> : <><CreditCard className="h-4 w-4 mr-1" /> Créer le placement</>}
            </Button>
          )}
          {demande.status === 'APPROVED' && demande.placementId && (
            <Badge className="w-full justify-center py-2 bg-green-100 text-green-700 border border-green-300">
              <CheckCircle className="h-4 w-4 mr-1" /> Placement créé
            </Badge>
          )}
          <Button onClick={() => router.push(routes.admin.placementDemandDetails(demande.id))} className="w-full h-9 bg-[#234D65] hover:bg-[#2c5a73] text-white text-sm font-semibold">
            <Eye className="h-4 w-4" /> Voir détails
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function PlacementDemandesSection() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState<TabValue>((searchParams.get('tab') as TabValue) || 'all')
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1)
  const [itemsPerPage] = useState(Number(searchParams.get('limit')) || 12)
  const [viewMode, setViewMode] = useState<ViewMode>((searchParams.get('view') as ViewMode) || 'grid')
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const [payoutModeFilter, setPayoutModeFilter] = useState<string>(searchParams.get('payoutMode') || 'all')
  const debouncedSearch = useDebounce(searchQuery, 300)

  const [acceptModalState, setAcceptModalState] = useState<{ isOpen: boolean; demand: PlacementDemand | null }>({ isOpen: false, demand: null })
  const [rejectModalState, setRejectModalState] = useState<{ isOpen: boolean; demand: PlacementDemand | null }>({ isOpen: false, demand: null })
  const [reopenModalState, setReopenModalState] = useState<{ isOpen: boolean; demand: PlacementDemand | null }>({ isOpen: false, demand: null })
  const [convertModalState, setConvertModalState] = useState<{ isOpen: boolean; demand: PlacementDemand | null }>({ isOpen: false, demand: null })

  useEffect(() => {
    const params = new URLSearchParams()
    if (activeTab !== 'all') params.set('tab', activeTab)
    if (currentPage > 1) params.set('page', currentPage.toString())
    if (itemsPerPage !== 12) params.set('limit', itemsPerPage.toString())
    if (viewMode !== 'grid') params.set('view', viewMode)
    if (searchQuery) params.set('search', searchQuery)
    if (payoutModeFilter !== 'all') params.set('payoutMode', payoutModeFilter)
    const queryString = params.toString()
    const newUrl = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname
    if (window.location.search !== `?${queryString}`) {
      router.replace(newUrl, { scroll: false })
    }
  }, [activeTab, currentPage, itemsPerPage, viewMode, searchQuery, payoutModeFilter, router])

  const getStatusFilter = () =>
    activeTab === 'all' ? undefined : activeTab === 'pending' ? 'PENDING' : activeTab === 'approved' ? 'APPROVED' : activeTab === 'rejected' ? 'REJECTED' : 'CONVERTED'

  const queryFilters: PlacementDemandFilters = {
    status: getStatusFilter(),
    page: currentPage,
    limit: itemsPerPage,
    search: debouncedSearch.trim().length >= 2 ? debouncedSearch.trim() : undefined,
    payoutMode: payoutModeFilter !== 'all' ? (payoutModeFilter as 'MonthlyCommission_CapitalEnd' | 'CapitalPlusCommission_End') : undefined,
  }

  const activeFiltersCount = [debouncedSearch.trim().length >= 2, payoutModeFilter !== 'all'].filter(Boolean).length
  const resetFilters = () => {
    setSearchQuery('')
    setPayoutModeFilter('all')
    setCurrentPage(1)
  }

  const { data: demandes = [], isLoading, error } = usePlacementDemands(queryFilters)
  const globalStatsFilters: PlacementDemandFilters = {}
  const { data: statsData } = usePlacementDemandsStats(globalStatsFilters)
  const { convert } = usePlacementDemandMutations()
  usePlacementDemandesRealtimeSync(true)

  const stats = useMemo(() => {
    if (statsData) {
      return { total: statsData.total, pending: statsData.pending, approved: statsData.approved, rejected: statsData.rejected, converted: statsData.converted }
    }
    return { total: 0, pending: 0, approved: 0, rejected: 0, converted: 0 }
  }, [statsData])

  const totalForTab = activeTab === 'all' ? stats.total : activeTab === 'pending' ? stats.pending : activeTab === 'approved' ? stats.approved : activeTab === 'rejected' ? stats.rejected : stats.converted
  const currentDemandes = demandes
  const totalPages = Math.max(1, Math.ceil(totalForTab / itemsPerPage))
  const startIndex = totalForTab === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1
  const endIndex = Math.min(currentPage * itemsPerPage, totalForTab)

  useEffect(() => setCurrentPage(1), [activeTab, debouncedSearch, payoutModeFilter])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['placementDemands'] })
    queryClient.invalidateQueries({ queryKey: ['placementDemandsStats'] })
  }

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
    const labels = { PENDING: 'En attente', APPROVED: 'Acceptée', REJECTED: 'Refusée', CONVERTED: 'Convertie' }
    return labels[status] || status
  }

  if (error) {
    return (
      <div className="space-y-8 animate-in fade-in-0 duration-500">
        <Alert className="border-0 bg-gradient-to-r from-red-50 to-rose-50 shadow-lg">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <AlertDescription className="text-red-700 font-medium">
            Une erreur est survenue lors du chargement des demandes : {error instanceof Error ? error.message : 'Erreur inconnue'}
            <Button variant="link" className="p-0 h-auto ml-2 text-red-700 underline font-bold hover:text-red-800" onClick={handleRefresh}>
              Réessayer maintenant
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in-0 duration-500">
      <StatisticsPlacementDemandes />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="w-full">
        <div className="hidden lg:block">
          <TabsList className="grid w-full max-w-3xl grid-cols-5">
            <TabsTrigger value="all" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Toutes ({stats.total})
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              En attente ({stats.pending})
            </TabsTrigger>
            <TabsTrigger value="approved" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Acceptées ({stats.approved})
            </TabsTrigger>
            <TabsTrigger value="rejected" className="flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Refusées ({stats.rejected})
            </TabsTrigger>
            <TabsTrigger value="converted" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Converties ({stats.converted})
            </TabsTrigger>
          </TabsList>
        </div>
        <div className="lg:hidden">
          <StatusFilterBadgesCarousel
            value={activeTab}
            onChange={(v) => setActiveTab(v as TabValue)}
            counts={{ all: stats.total, pending: stats.pending, approved: stats.approved, rejected: stats.rejected, converted: stats.converted }}
          />
        </div>
      </Tabs>

      <Card className="bg-gradient-to-r from-white via-gray-50/50 to-white border-0 shadow-lg">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              placeholder="Rechercher par nom bienfaiteur ou ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-xs"
            />
            <Select value={payoutModeFilter} onValueChange={(v) => { setPayoutModeFilter(v); setCurrentPage(1) }}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Mode de règlement" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les modes</SelectItem>
                <SelectItem value="MonthlyCommission_CapitalEnd">Commission mensuelle + Capital en fin</SelectItem>
                <SelectItem value="CapitalPlusCommission_End">Capital + Commissions en fin</SelectItem>
              </SelectContent>
            </Select>
            {activeFiltersCount > 0 && (
              <>
                <Badge variant="secondary">{activeFiltersCount} filtre{activeFiltersCount > 1 ? 's' : ''} actif{activeFiltersCount > 1 ? 's' : ''}</Badge>
                <Button variant="outline" size="sm" onClick={resetFilters}>Réinitialiser filtres</Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-white via-gray-50/50 to-white border-0 shadow-xl">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-6 lg:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-[#234D65] to-[#2c5a73] shadow-lg">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black bg-gradient-to-r from-[#234D65] to-[#2c5a73] bg-clip-text text-transparent">
                  Liste des Demandes
                </h2>
                <p className="text-gray-600 font-medium">
                  {totalForTab.toLocaleString()} demande{totalForTab !== 1 ? 's' : ''} • Page {currentPage}
                </p>
                <p className="text-sm text-gray-500 mt-0.5">
                  <Link href={routes.admin.placements} className="text-[#234D65] hover:underline font-medium">Voir les placements</Link>
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="items-center bg-gray-100 rounded-xl p-1 shadow-inner hidden md:flex">
                <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('grid')} className={`h-10 px-4 rounded-lg transition-all duration-300 ${viewMode === 'grid' ? 'bg-[#234D65] hover:bg-[#2c5a73] text-white shadow-lg scale-105' : 'hover:bg-white hover:shadow-md'}`}>
                  <Grid3X3 className="h-4 w-4 mr-2" /> Grille
                </Button>
                <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('list')} className={`h-10 px-4 rounded-lg transition-all duration-300 ${viewMode === 'list' ? 'bg-[#234D65] hover:bg-[#2c5a73] text-white shadow-lg scale-105' : 'hover:bg-white hover:shadow-md'}`}>
                  <List className="h-4 w-4 mr-2" /> Liste
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading} className="h-12 sm:h-10 px-4 bg-white border-2 border-[#234D65] text-[#234D65] hover:bg-[#234D65] hover:text-white transition-all duration-300 hover:scale-105 hover:shadow-lg disabled:opacity-50">
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} /> Actualiser
              </Button>
              <Button size="sm" asChild className="h-12 sm:h-10 px-4 bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                <Link href={routes.admin.placementDemandAdd}>
                  <Plus className="h-4 w-4 mr-2" /> Nouvelle Demande
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-6'}>
          {[...Array(itemsPerPage)].map((_, i) => (
            <ModernSkeleton key={i} viewMode={viewMode} />
          ))}
        </div>
      ) : currentDemandes.length > 0 ? (
        <>
          {viewMode === 'list' ? (
            <Card className="bg-gradient-to-r from-white via-gray-50/30 to-white border-0 shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Prénom</TableHead>
                    <TableHead>Matricule</TableHead>
                    <TableHead>Contacts</TableHead>
                    <TableHead>Nom contact urgent</TableHead>
                    <TableHead>Prénom contact urgent</TableHead>
                    <TableHead>Contact contact urgent</TableHead>
                    <TableHead>Motif</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Taux</TableHead>
                    <TableHead>Durée</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Date souhaitée</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentDemandes.map((demande) => (
                    <PlacementDemandTableRow
                      key={demande.id}
                      demande={demande}
                      getStatusColor={getStatusColor}
                      getStatusLabel={getStatusLabel}
                      setAcceptModalState={setAcceptModalState}
                      setRejectModalState={setRejectModalState}
                      setReopenModalState={setReopenModalState}
                      setConvertModalState={setConvertModalState}
                    />
                  ))}
                </TableBody>
              </Table>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
              {currentDemandes.map((demande) => (
                <PlacementDemandCard
                  key={demande.id}
                  demande={demande}
                  getStatusLabel={getStatusLabel}
                  getPayoutModeLabel={getPayoutModeLabel}
                  setAcceptModalState={setAcceptModalState}
                  setRejectModalState={setRejectModalState}
                  setReopenModalState={setReopenModalState}
                  setConvertModalState={setConvertModalState}
                  convertPending={convert.isPending}
                />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <Card className="bg-gradient-to-r from-white via-gray-50/30 to-white border-0 shadow-lg">
              <CardContent className="p-4">
                <ListPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPrev={() => handlePageChange(currentPage - 1)}
                  onNext={() => handlePageChange(currentPage + 1)}
                  summary={
                    <>
                      Affichage {startIndex}-{endIndex} sur {totalForTab} demande{totalForTab !== 1 ? 's' : ''}
                    </>
                  }
                />
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card className="bg-gradient-to-br from-white via-gray-50/50 to-white border-0 shadow-2xl">
          <CardContent className="text-center p-16">
            <div className="space-y-6">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center shadow-inner">
                <FileText className="h-10 w-10 text-gray-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Aucune demande trouvée</h3>
                <p className="text-gray-600 text-lg max-w-md mx-auto leading-relaxed">
                  Il n&apos;y a pas encore de demandes de placement enregistrées dans le système.
                </p>
              </div>
              <div className="flex justify-center">
                <Button asChild className="h-12 px-6 bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                  <Link href={routes.admin.placementDemandAdd}>
                    <Plus className="h-4 w-4 mr-2" /> Ajouter une demande
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <AcceptDemandModal isOpen={acceptModalState.isOpen} onClose={() => setAcceptModalState({ isOpen: false, demand: null })} demand={acceptModalState.demand} onSuccess={() => {}} />
      <RejectDemandModal isOpen={rejectModalState.isOpen} onClose={() => setRejectModalState({ isOpen: false, demand: null })} demand={rejectModalState.demand} onSuccess={() => {}} />
      <ReopenDemandModal isOpen={reopenModalState.isOpen} onClose={() => setReopenModalState({ isOpen: false, demand: null })} demand={reopenModalState.demand} onSuccess={() => {}} />
      <ConvertDemandToPlacementModal
        isOpen={convertModalState.isOpen}
        demand={convertModalState.demand}
        isSubmitting={convert.isPending}
        onClose={() => setConvertModalState({ isOpen: false, demand: null })}
        onConfirm={async (formData: ConvertDemandToPlacementInput) => {
          const demandId = convertModalState.demand?.id
          if (!demandId) return

          const [year, month, day] = formData.handoverDate.split('-').map(Number)
          const handoverDate = new Date(year, (month || 1) - 1, day || 1, 0, 0, 0)

          // Firestore rejette `undefined` : on n'ajoute les champs
          // conditionnels que lorsqu'ils sont réellement renseignés.
          const isMobileMoney =
            formData.paymentMode === 'airtel_money' || formData.paymentMode === 'mobicash'
          const paymentMethodOther =
            formData.paymentMode === 'other' ? formData.paymentMethodOther?.trim() : undefined

          // Pas de `startDate` ici : le début du placement est la date souhaitée
          // de la demande. La remise des fonds est un événement distinct.
          const result = await convert.mutateAsync({
            demandId,
            placementData: {
              paymentMode: formData.paymentMode,
              ...(isMobileMoney && formData.withFees !== undefined
                ? { withFees: formData.withFees }
                : {}),
              ...(paymentMethodOther ? { paymentMethodOther } : {}),
              handoverLocation: formData.handoverLocation.trim(),
              handoverDate,
              handoverTime: formData.handoverTime,
            },
          })

          setConvertModalState({ isOpen: false, demand: null })
          if (result?.placement) {
            router.push(routes.admin.placementDetails(result.placement.id))
          }
        }}
      />
    </div>
  )
}
