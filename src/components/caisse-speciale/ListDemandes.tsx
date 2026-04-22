'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
    Clock,
    Eye,
    FileEdit,
    FileText,
    Grid3X3,
    List,
    MoreVertical,
    Plus,
    RefreshCw,
    RotateCcw,
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

const statusUiConfig: Record<CaisseSpecialeDemandStatus, {
  label: string
  color: string
}> = {
  PENDING: { label: 'En attente', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  APPROVED: { label: 'Acceptée', color: 'bg-green-100 text-green-800 border-green-200' },
  REJECTED: { label: 'Refusée', color: 'bg-red-100 text-red-800 border-red-200' },
  CONVERTED: { label: 'Convertie', color: 'bg-blue-100 text-blue-800 border-blue-200' },
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

  return (
    <Card className="group relative overflow-hidden border-2 transition-all duration-200 hover:shadow-lg border-gray-200 h-full flex flex-col">
      <CardContent className="p-4 md:p-5 flex-1 flex flex-col gap-4">
        <div className="font-mono text-sm font-bold text-gray-900 break-all">
          #{demande.id}
        </div>

        <div className="flex items-start justify-between">
          <Badge className={cn('text-xs font-medium border', statusInfo.color)}>
            {statusInfo.label}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-70 group-hover:opacity-100 transition-opacity"
                title="Actions"
              >
                <MoreVertical className="h-4 w-4 text-gray-600" />
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

        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12 shrink-0">
            {memberPhotoUrl ? (
              <AvatarImage src={memberPhotoUrl} alt={`Photo de ${member?.firstName || ''} ${member?.lastName || ''}`} />
            ) : null}
            <AvatarFallback className="bg-[#234D65] text-[11px] font-semibold text-white">
              {memberInitials || '--'}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            {isLoadingMember ? (
              <span className="text-gray-400 animate-pulse text-sm">Chargement...</span>
            ) : (
              <>
                <div className="font-semibold text-gray-900 leading-tight">{member?.firstName ?? '—'}</div>
                <div className="font-semibold text-gray-900 leading-tight">{member?.lastName ?? '—'}</div>
              </>
            )}
          </div>
        </div>

        <div className="text-sm font-mono text-gray-700">
          {member?.matricule || demande.memberId || '—'}
        </div>

        <div className="text-sm text-gray-700">
          {isLoadingMember ? (
            <span className="text-gray-400 animate-pulse">—</span>
          ) : memberPhone || member?.email ? (
            <span>{memberPhone}{memberPhone && member?.email ? ' • ' : ''}{member?.email ?? ''}</span>
          ) : (
            <span className="text-gray-400">—</span>
          )}
        </div>

        <div className="space-y-2 rounded-lg bg-gray-50 p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Montant demandé</span>
            <span className="font-semibold text-gray-900">
              {demande.monthlyAmount.toLocaleString('fr-FR')} FCFA
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Nombre de mois</span>
            <span className="font-semibold text-gray-900">{demande.monthsPlanned} mois</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Date souhaitée</span>
            <span className="font-semibold text-gray-900">
              {demande.desiredDate ? new Date(demande.desiredDate).toLocaleDateString('fr-FR') : '—'}
            </span>
          </div>
        </div>

        <div className="pt-3 border-t border-gray-100 mt-auto text-sm">
          <span className="text-gray-500">Motif: </span>
          <span className="text-gray-900">{demandReason || '—'}</span>
        </div>

        <div className="border-t border-gray-200 pt-3 flex flex-col gap-2">
          {canAcceptOrReject && (
            <>
              <Button
                onClick={() => setAcceptModalState({ isOpen: true, demand: demande })}
                className="w-full h-10 bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Accepter
              </Button>
              <Button
                variant="outline"
                onClick={() => setRejectModalState({ isOpen: true, demand: demande })}
                className="w-full h-10 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
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
              className="w-full h-10 border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Réouvrir
            </Button>
          )}

          <Button
            variant="outline"
            onClick={() => router.push(`/caisse-speciale/demandes/${demande.id}`)}
            className="w-full h-10"
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
          <AvatarImage src={memberPhotoUrl} alt={`Photo de ${member?.firstName || ''} ${member?.lastName || ''}`} />
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
    <TableRow>
      <TableCell>
        <Badge className={cn('text-xs border', statusInfo.color)}>{statusInfo.label}</Badge>
      </TableCell>
      <TableCell>
        <MemberTableCell demande={demande} />
      </TableCell>
      <TableCell className="hidden md:table-cell">{member?.contacts?.[0] || member?.email || '—'}</TableCell>
      <TableCell className="hidden lg:table-cell">{demande.monthlyAmount.toLocaleString('fr-FR')} FCFA</TableCell>
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
              {demande.status !== 'CONVERTED' && (
                <DropdownMenuItem
                  onClick={() => setDeleteModalState({ isOpen: true, demand: demande, memberMatricule: member?.matricule })}
                  className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer
                </DropdownMenuItem>
              )}
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
    
    const queryString = params.toString()
    const newUrl = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname
    
    if (window.location.search !== `?${queryString}`) {
      router.replace(newUrl, { scroll: false })
    }
  }, [activeTab, currentPage, itemsPerPage, viewMode, router])

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
    createdAtFrom: createdAtFrom ? new Date(createdAtFrom) : undefined,
    createdAtTo: createdAtTo ? new Date(createdAtTo + 'T23:59:59') : undefined,
  }

  const activeFiltersCount = [
    debouncedSearch.trim().length >= 2,
    caisseTypeFilter !== 'all',
    !!createdAtFrom,
    !!createdAtTo,
  ].filter(Boolean).length

  const resetFilters = () => {
    setSearchQuery('')
    setCaisseTypeFilter('all')
    setCreatedAtFrom('')
    setCreatedAtTo('')
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
  }, [activeTab, debouncedSearch, caisseTypeFilter, createdAtFrom, createdAtTo])

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

      {/* Filtres de statut : Tabs en desktop, badges carousel en mobile/tablette */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
        {/* Tabs - Vue desktop uniquement */}
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

      {/* Barre unique : filtres + actions */}
      <Card className="border-0 shadow-lg overflow-hidden">
        <CardContent className="p-4 md:p-5 bg-white">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[minmax(320px,1.8fr)_1fr_1fr_1fr] gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-500">Recherche</Label>
                <Input
                  placeholder="Rechercher par nom, prénom ou matricule..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-11 border-slate-200 focus-visible:ring-[#234D65]/30"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-500">Type de caisse</Label>
                <Select value={caisseTypeFilter} onValueChange={(v) => { setCaisseTypeFilter(v); setCurrentPage(1) }}>
                  <SelectTrigger className="w-full h-11 border-slate-200 focus:ring-[#234D65]/30">
                    <SelectValue placeholder="Type de caisse" />
                  </SelectTrigger>
                  <SelectContent>
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
                <Label className="text-xs font-semibold text-slate-500">Date création - Début</Label>
                <Input
                  type="date"
                  value={createdAtFrom}
                  onChange={(e) => setCreatedAtFrom(e.target.value)}
                  className="w-full h-11 border-slate-200 focus-visible:ring-[#234D65]/30"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-500">Date création - Fin</Label>
                <Input
                  type="date"
                  value={createdAtTo}
                  onChange={(e) => setCreatedAtTo(e.target.value)}
                  className="w-full h-11 border-slate-200 focus-visible:ring-[#234D65]/30"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 justify-between">
              <div className="items-center p-1 bg-gray-100 rounded-xl hidden md:flex">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className={`h-10 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${viewMode === 'grid'
                    ? 'bg-white text-[#234D65] shadow-sm hover:bg-white'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-transparent'
                    }`}
                >
                  <Grid3X3 className="h-4 w-4 mr-2" />
                  Cards
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className={`h-10 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${viewMode === 'list'
                    ? 'bg-white text-[#234D65] shadow-sm hover:bg-white'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-transparent'
                    }`}
                >
                  <List className="h-4 w-4 mr-2" />
                  Table
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-3 ml-auto">
                {activeFiltersCount > 0 && (
                  <Button variant="outline" size="sm" onClick={resetFilters}>
                    Réinitialiser filtres
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className="h-12 sm:h-10 w-full sm:w-auto px-4 border-2 border-[#234D65] text-[#234D65] hover:bg-[#234D65] hover:text-white"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Actualiser
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des demandes */}
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
      ) : currentDemandes.length > 0 ? (
        <>
          {viewMode === 'list' ? (
            <Card className="bg-gradient-to-r from-white via-gray-50/30 to-white border-0 shadow-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Statut</TableHead>
                    <TableHead>Membre</TableHead>
                    <TableHead className="hidden md:table-cell">Contact</TableHead>
                    <TableHead className="hidden lg:table-cell">Montant</TableHead>
                    <TableHead className="hidden lg:table-cell">Durée</TableHead>
                    <TableHead className="hidden md:table-cell">Date souhaitée</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
            {currentDemandes.map((demande) => (
              <DemandCard
                key={demande.id}
                demande={demande}
                setAcceptModalState={setAcceptModalState}
                setRejectModalState={setRejectModalState}
                setReopenModalState={setReopenModalState}
                setDeleteModalState={setDeleteModalState}
              />
            ))}
          </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <Card className="bg-gradient-to-r from-white via-gray-50/30 to-white border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Affichage {startIndex + 1}-{endIndex} sur {totalCount} demandes
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
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
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1"
                    >
                      Suivant
                    </Button>
                  </div>
                </div>
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
