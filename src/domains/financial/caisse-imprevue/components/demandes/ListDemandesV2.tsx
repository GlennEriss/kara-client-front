/**
 * Composant principal de liste des demandes Caisse Imprévue V2
 *
 * Responsive : Mobile, Tablette, Desktop
 * Intègre : Stats, Tabs, Filtres, Recherche, Tri, Pagination, Vue Grid/Table
 * Layout moderne et bien structuré avec Card header
 */

'use client'

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PaginationWithEllipses } from '@/components/ui/pagination/PaginationWithEllipses'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCaisseImprevueDemands } from '@/domains/financial/caisse-imprevue/hooks'
import { cn } from '@/lib/utils'
import { Filter, LayoutGrid, RefreshCw, Search, Table2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import type { DemandFilters, PaginationParams, SortParams } from '../../entities/demand-filters.types'
import { ExportDemandsModalV2 } from '../modals/ExportDemandsModalV2'
import {
    DemandCardV2,
    DemandSortV2,
    DemandTableV2,
    StatisticsV2,
} from './index'
import { StatusFilterChips } from './StatusFilterChips'

function useLocalDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = window.setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      window.clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

interface ListDemandesV2Props {
  onViewDetails?: (id: string) => void
  onAccept?: (id: string) => void
  onReject?: (id: string) => void
  onReopen?: (id: string) => void
  onDelete?: (id: string) => void
  onEdit?: (id: string) => void
  onCreateContract?: (id: string) => void
  subscriptions?: Array<{ id: string; code: string; label?: string }>
}

export function ListDemandesV2({
  onViewDetails,
  onAccept,
  onReject,
  onReopen,
  onDelete,
  onEdit,
  onCreateContract,
  subscriptions,
}: ListDemandesV2Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearchQuery = useLocalDebounce(searchQuery, 300)
  const [filters, setFilters] = useState<DemandFilters>({
    status: 'all',
    paymentFrequency: 'all',
  })
  const [pagination, setPagination] = useState<PaginationParams>({
    page: 1,
    limit: 10,
  })
  const [sort, setSort] = useState<SortParams>({
    sortBy: 'date',
    sortOrder: 'desc',
  })
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)

  // Mettre à jour le filtre de statut selon l'onglet actif + searchQuery
  const effectiveFilters: DemandFilters = {
    ...filters,
    status: activeTab === 'all' ? 'all' : (activeTab as any),
    searchQuery: debouncedSearchQuery.trim().length >= 2 ? debouncedSearchQuery.trim() : undefined,
  }

  const { data: demandsData, isLoading, refetch } = useCaisseImprevueDemands(
    effectiveFilters,
    pagination,
    sort
  )

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    setPagination({ ...pagination, page: 1 })
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setPagination({ ...pagination, page: 1 })
  }

  const toNumberOrUndefined = (value: string): number | undefined => {
    const trimmed = value.trim()
    if (!trimmed) return undefined
    const parsed = Number(trimmed)
    return Number.isFinite(parsed) ? parsed : undefined
  }

  const resetFilters = () => {
    setSearchQuery('')
    setFilters({
      status: 'all',
      paymentFrequency: 'all',
    })
    setSort({
      sortBy: 'date',
      sortOrder: 'desc',
    })
    setPagination({ ...pagination, page: 1 })
    setIsFiltersExpanded(false)
  }

  const handleRefresh = async () => {
    await refetch()
  }

  const activeAdvancedFiltersCount = useMemo(() => {
    let count = 0
    if (typeof filters.monthlyAmountMin === 'number') count += 1
    if (typeof filters.monthlyAmountMax === 'number') count += 1
    if (typeof filters.durationMonthsMin === 'number') count += 1
    if (typeof filters.durationMonthsMax === 'number') count += 1
    if (filters.createdAtFrom) count += 1
    if (filters.createdAtTo) count += 1
    if (filters.desiredDateFrom) count += 1
    if (filters.desiredDateTo) count += 1
    return count
  }, [
    filters.monthlyAmountMin,
    filters.monthlyAmountMax,
    filters.durationMonthsMin,
    filters.durationMonthsMax,
    filters.createdAtFrom,
    filters.createdAtTo,
    filters.desiredDateFrom,
    filters.desiredDateTo,
  ])

  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (searchQuery.trim()) count += 1
    if (filters.paymentFrequency && filters.paymentFrequency !== 'all') count += 1
    if (filters.subscriptionCIID) count += 1
    count += activeAdvancedFiltersCount
    return count
  }, [searchQuery, filters.paymentFrequency, filters.subscriptionCIID, activeAdvancedFiltersCount])

  const handlePageChange = (page: number) => {
    setPagination({ ...pagination, page })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleViewDetails = (id: string) => {
    if (onViewDetails) {
      onViewDetails(id)
    } else {
      router.push(`/caisse-imprevue/demandes/${id}`)
    }
  }

  return (
    <div className="space-y-4 md:space-y-6 lg:space-y-8">
      {/* Statistiques */}
      <StatisticsV2 filters={effectiveFilters} />

      {/* Filtres de statut avec badges cliquables */}
      <StatusFilterChips 
        value={activeTab} 
        onChange={handleTabChange}
      />

      {/* Filtres et recherche - organisation alignée avec caisse spéciale */}
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
                    <Badge className="rounded-full border border-[#234D65]/20 bg-[#234D65]/10 px-2.5 py-0.5 text-xs font-semibold text-[#234D65]">
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
                <RefreshCw className={cn('mr-2 h-4 w-4', isLoading && 'animate-spin')} />
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
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(300px,2fr)_minmax(170px,1fr)_minmax(210px,1fr)_minmax(210px,1fr)]">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500">Recherche</Label>
              <div className="group relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-[#234D65]" />
                <Input
                  placeholder="Nom, prénom, matricule..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="h-11 rounded-xl border-2 border-slate-200 bg-white pl-10 focus-visible:border-[#234D65] focus-visible:ring-0"
                  data-testid="demand-search-input"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500">Tri</Label>
              <DemandSortV2 sort={sort} onSortChange={setSort} className="w-full" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500">Fréquence</Label>
              <Select
                value={filters.paymentFrequency || 'all'}
                onValueChange={(value) => {
                  setFilters({
                    ...filters,
                    paymentFrequency: value as DemandFilters['paymentFrequency'],
                  })
                  setPagination({ ...pagination, page: 1 })
                }}
              >
                <SelectTrigger className="h-11 rounded-xl border-2 border-slate-200 bg-white focus:border-[#234D65] focus:ring-0">
                  <SelectValue placeholder="Toutes fréquences" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-2 border-slate-200 shadow-xl">
                  <SelectItem value="all">Toutes fréquences</SelectItem>
                  <SelectItem value="DAILY">Quotidien</SelectItem>
                  <SelectItem value="MONTHLY">Mensuel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500">Forfait</Label>
              <Select
                value={filters.subscriptionCIID || 'all'}
                onValueChange={(value) => {
                  setFilters({
                    ...filters,
                    subscriptionCIID: value === 'all' ? undefined : value,
                  })
                  setPagination({ ...pagination, page: 1 })
                }}
              >
                <SelectTrigger className="h-11 rounded-xl border-2 border-slate-200 bg-white focus:border-[#234D65] focus:ring-0">
                  <SelectValue placeholder="Tous les forfaits" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-2 border-slate-200 shadow-xl">
                  <SelectItem value="all">Tous les forfaits</SelectItem>
                  {subscriptions?.map((subscription) => (
                    <SelectItem key={subscription.id} value={subscription.id}>
                      {subscription.label || subscription.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Accordion
            type="single"
            collapsible
            value={isFiltersExpanded ? 'advanced' : ''}
            onValueChange={(value) => setIsFiltersExpanded(value === 'advanced')}
            className="w-full"
          >
            <AccordionItem value="advanced" className="overflow-hidden rounded-2xl border border-[#234D65]/15 bg-gradient-to-br from-[#234D65]/[0.04] via-white to-slate-50 px-4">
              <AccordionTrigger className="py-3 text-left text-sm font-semibold text-[#234D65] hover:no-underline">
                Filtres avancés
                {activeAdvancedFiltersCount > 0 ? ` (${activeAdvancedFiltersCount})` : ''}
              </AccordionTrigger>
              <AccordionContent className="pb-4 pt-1">
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <div className="space-y-4 rounded-xl border border-slate-200/80 bg-white/80 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Montants</p>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-500">Montant mensuel (FCFA)</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          min="0"
                          placeholder="Min"
                          value={filters.monthlyAmountMin ?? ''}
                          onChange={(e) => {
                            setFilters({
                              ...filters,
                              monthlyAmountMin: toNumberOrUndefined(e.target.value),
                            })
                            setPagination({ ...pagination, page: 1 })
                          }}
                          className="h-10 rounded-lg border-slate-200 bg-white focus-visible:border-[#234D65] focus-visible:ring-0"
                        />
                        <Input
                          type="number"
                          min="0"
                          placeholder="Max"
                          value={filters.monthlyAmountMax ?? ''}
                          onChange={(e) => {
                            setFilters({
                              ...filters,
                              monthlyAmountMax: toNumberOrUndefined(e.target.value),
                            })
                            setPagination({ ...pagination, page: 1 })
                          }}
                          className="h-10 rounded-lg border-slate-200 bg-white focus-visible:border-[#234D65] focus-visible:ring-0"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 rounded-xl border border-slate-200/80 bg-white/80 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Durée et dates</p>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-500">Durée (mois)</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          min="0"
                          placeholder="Min"
                          value={filters.durationMonthsMin ?? ''}
                          onChange={(e) => {
                            setFilters({
                              ...filters,
                              durationMonthsMin: toNumberOrUndefined(e.target.value),
                            })
                            setPagination({ ...pagination, page: 1 })
                          }}
                          className="h-10 rounded-lg border-slate-200 bg-white focus-visible:border-[#234D65] focus-visible:ring-0"
                        />
                        <Input
                          type="number"
                          min="0"
                          placeholder="Max"
                          value={filters.durationMonthsMax ?? ''}
                          onChange={(e) => {
                            setFilters({
                              ...filters,
                              durationMonthsMax: toNumberOrUndefined(e.target.value),
                            })
                            setPagination({ ...pagination, page: 1 })
                          }}
                          className="h-10 rounded-lg border-slate-200 bg-white focus-visible:border-[#234D65] focus-visible:ring-0"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-500">Date de création</Label>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <Input
                          type="date"
                          value={filters.createdAtFrom || ''}
                          onChange={(e) => {
                            setFilters({
                              ...filters,
                              createdAtFrom: e.target.value || undefined,
                            })
                            setPagination({ ...pagination, page: 1 })
                          }}
                          className="h-10 rounded-lg border-slate-200 bg-white focus-visible:border-[#234D65] focus-visible:ring-0"
                        />
                        <Input
                          type="date"
                          value={filters.createdAtTo || ''}
                          onChange={(e) => {
                            setFilters({
                              ...filters,
                              createdAtTo: e.target.value || undefined,
                            })
                            setPagination({ ...pagination, page: 1 })
                          }}
                          className="h-10 rounded-lg border-slate-200 bg-white focus-visible:border-[#234D65] focus-visible:ring-0"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-500">Date souhaitée</Label>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <Input
                          type="date"
                          value={filters.desiredDateFrom || ''}
                          onChange={(e) => {
                            setFilters({
                              ...filters,
                              desiredDateFrom: e.target.value || undefined,
                            })
                            setPagination({ ...pagination, page: 1 })
                          }}
                          className="h-10 rounded-lg border-slate-200 bg-white focus-visible:border-[#234D65] focus-visible:ring-0"
                        />
                        <Input
                          type="date"
                          value={filters.desiredDateTo || ''}
                          onChange={(e) => {
                            setFilters({
                              ...filters,
                              desiredDateTo: e.target.value || undefined,
                            })
                            setPagination({ ...pagination, page: 1 })
                          }}
                          className="h-10 rounded-lg border-slate-200 bg-white focus-visible:border-[#234D65] focus-visible:ring-0"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 pt-3">
            <div className="hidden items-center rounded-xl bg-gray-100 p-1 md:flex">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200',
                  viewMode === 'grid'
                    ? 'bg-white text-[#234D65] shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                )}
                data-testid="view-mode-grid"
              >
                <LayoutGrid className="h-4 w-4" />
                Cards
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200',
                  viewMode === 'table'
                    ? 'bg-white text-[#234D65] shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                )}
                data-testid="view-mode-table"
              >
                <Table2 className="h-4 w-4" />
                Table
              </button>
            </div>

            <p className="ml-auto text-xs font-medium text-slate-500">
              {demandsData?.pagination.total?.toLocaleString() || 0} demande{(demandsData?.pagination.total || 0) > 1 ? 's' : ''} trouvée{(demandsData?.pagination.total || 0) > 1 ? 's' : ''}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Liste des demandes */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : demandsData && demandsData.items.length > 0 ? (
        <>
          {/* Pagination haut */}
          {demandsData.pagination.totalPages > 1 && (
            <div className="flex justify-center">
              <PaginationWithEllipses
                currentPage={pagination.page}
                totalPages={demandsData.pagination.totalPages}
                onPageChange={handlePageChange}
                hasNextPage={demandsData.pagination.hasNextPage}
                hasPrevPage={demandsData.pagination.hasPreviousPage}
              />
            </div>
          )}

          {/* Vue Grid */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {demandsData.items.map((demand) => (
                <DemandCardV2
                  key={demand.id}
                  demand={demand}
                  onViewDetails={handleViewDetails}
                  onAccept={onAccept}
                  onReject={onReject}
                  onReopen={onReopen}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  onCreateContract={onCreateContract}
                />
              ))}
            </div>
          )}

          {/* Vue Table */}
          {viewMode === 'table' && (
            <DemandTableV2
              demands={demandsData.items}
              onViewDetails={handleViewDetails}
              onAccept={onAccept}
              onReject={onReject}
              onReopen={onReopen}
              onDelete={onDelete}
              onEdit={onEdit}
              onCreateContract={onCreateContract}
            />
          )}

          {/* Pagination bas */}
          {demandsData.pagination.totalPages > 1 && (
            <div className="flex justify-center">
              <PaginationWithEllipses
                currentPage={pagination.page}
                totalPages={demandsData.pagination.totalPages}
                onPageChange={handlePageChange}
                hasNextPage={demandsData.pagination.hasNextPage}
                hasPrevPage={demandsData.pagination.hasPreviousPage}
              />
            </div>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <p className="text-kara-neutral-500 text-lg">
                {effectiveFilters.searchQuery
                  ? `Aucun résultat pour "${effectiveFilters.searchQuery}"`
                  : 'Aucune demande trouvée'}
              </p>
              <p className="text-kara-neutral-400 text-sm mt-2">
                {effectiveFilters.searchQuery
                  ? 'Essayez une autre recherche ou modifiez les filtres.'
                  : effectiveFilters.status !== 'all'
                    ? 'Essayez de changer de filtre ou de créer une nouvelle demande.'
                    : 'Créez votre première demande pour commencer.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal Export */}
      <ExportDemandsModalV2
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </div>
  )
}
