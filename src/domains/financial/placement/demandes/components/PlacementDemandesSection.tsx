/**
 * Section domaine : liste des demandes de placement
 * Design aligné sur Caisse Spéciale (ListDemandes) : stats, onglets, filtres, barre d'actions, grille/table, pagination.
 */

'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
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
  Calendar,
  RotateCcw,
  DollarSign,
  Percent,
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
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' : 'space-y-6'}>
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
                    <TableHead>Bienfaiteur</TableHead>
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
                    <TableRow key={demande.id}>
                      <TableCell className="font-medium">{demande.benefactorName || '—'}</TableCell>
                      <TableCell>{demande.amount.toLocaleString('fr-FR')} FCFA</TableCell>
                      <TableCell>{demande.rate}%</TableCell>
                      <TableCell>{demande.periodMonths} mois</TableCell>
                      <TableCell>{getPayoutModeLabel(demande.payoutMode)}</TableCell>
                      <TableCell>{demande.desiredDate ? new Date(demande.desiredDate).toLocaleDateString('fr-FR') : '—'}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(demande.status)}`}>
                          {getStatusLabel(demande.status)}
                        </span>
                      </TableCell>
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
                                onClick={() => router.push(routes.admin.placementDemandDetails(demande.id))}
                                className="cursor-pointer"
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Voir détails
                              </DropdownMenuItem>
                              {demande.status === 'PENDING' && (
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
                              {demande.status === 'REJECTED' && (
                                <DropdownMenuItem
                                  onClick={() => setReopenModalState({ isOpen: true, demand: demande })}
                                  className="cursor-pointer"
                                >
                                  <RotateCcw className="h-4 w-4 mr-2" />
                                  Réouvrir
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
              {currentDemandes.map((demande) => (
                <Card key={demande.id} className="group hover:shadow-xl transition-all duration-500 hover:-translate-y-2 bg-gradient-to-br from-white via-gray-50/30 to-white border-0 shadow-lg overflow-hidden relative h-full flex flex-col">
                  <CardContent className="p-6 relative z-10 flex-1 flex flex-col gap-4">
                    <h3 className="font-mono text-sm font-bold text-gray-900 break-all min-w-0">#{demande.id}</h3>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
                        {getPayoutModeLabel(demande.payoutMode)}
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(demande.status)}`}>
                        {getStatusLabel(demande.status)}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5 text-sm font-medium text-gray-900">
                      <span>Bienfaiteur: {demande.benefactorName || '—'}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-500">Montant: </span>
                      <span className="font-semibold text-green-600">{demande.amount.toLocaleString('fr-FR')} FCFA</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-500">Taux: </span>
                      <span className="font-medium text-gray-900">{demande.rate}% — {demande.periodMonths} mois</span>
                    </div>
                    {demande.desiredDate && (
                      <div className="text-sm flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                        <span className="text-gray-500">Date souhaitée:</span>
                        <span className="font-medium text-gray-900">{new Date(demande.desiredDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                      </div>
                    )}
                    {demande.decisionMadeByName && (
                      <div className="text-sm">
                        <span className="text-gray-500">Décision par: </span>
                        <span className="font-medium text-gray-900">{demande.decisionMadeByName}</span>
                      </div>
                    )}
                    <div className="pt-3 border-t border-gray-100 mt-auto flex flex-col gap-2">
                      {demande.status === 'PENDING' && (
                        <>
                          <Button size="sm" onClick={() => setAcceptModalState({ isOpen: true, demand: demande })} className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-300">
                            <CheckCircle className="h-4 w-4 mr-1" /> Accepter
                          </Button>
                          <Button size="sm" onClick={() => setRejectModalState({ isOpen: true, demand: demande })} className="w-full bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-300">
                            <XCircle className="h-4 w-4 mr-1" /> Refuser
                          </Button>
                        </>
                      )}
                      {demande.status === 'REJECTED' && (
                        <Button size="sm" onClick={() => setReopenModalState({ isOpen: true, demand: demande })} className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-300">
                          <RotateCcw className="h-4 w-4 mr-1" /> Réouvrir
                        </Button>
                      )}
                      {demande.status === 'APPROVED' && !demande.placementId && (
                        <Button
                          size="sm"
                          onClick={async () => {
                            try {
                              const result = await convert.mutateAsync({ demandId: demande.id })
                              if (result?.placement) router.push(routes.admin.placementDetails(result.placement.id))
                            } catch (e) { console.error(e) }
                          }}
                          disabled={convert.isPending}
                          className="w-full bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65] text-white border-0 shadow-md hover:shadow-lg transition-all duration-300"
                        >
                          {convert.isPending ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Création...</> : <><CreditCard className="h-4 w-4 mr-1" /> Créer le placement</>}
                        </Button>
                      )}
                      {demande.status === 'APPROVED' && demande.placementId && (
                        <Badge className="w-full justify-center py-2 bg-green-100 text-green-700 border border-green-300">
                          <CheckCircle className="h-4 w-4 mr-1" /> Placement créé
                        </Badge>
                      )}
                      <Button onClick={() => router.push(routes.admin.placementDemandDetails(demande.id))} className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 bg-white cursor-pointer text-[#224D62] border border-[#224D62] hover:bg-[#224D62] hover:text-white">
                        <Eye className="h-4 w-4" /> Voir détails
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <Card className="bg-gradient-to-r from-white via-gray-50/30 to-white border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Affichage {startIndex}-{endIndex} sur {totalForTab} demande{totalForTab !== 1 ? 's' : ''}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="px-3 py-1">Précédent</Button>
                    <span className="text-sm text-gray-600">Page {currentPage} sur {totalPages}</span>
                    <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="px-3 py-1">Suivant</Button>
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
    </div>
  )
}
