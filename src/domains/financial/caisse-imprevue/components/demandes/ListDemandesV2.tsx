/**
 * Composant principal de liste des demandes Caisse Imprévue V2
 * 
 * Responsive : Mobile, Tablette, Desktop
 * Intègre : Stats, Tabs, Filtres, Recherche, Tri, Pagination, Vue Grid/Table
 * Layout moderne et bien structuré avec Card header
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Download, List, Grid, LayoutGrid, Table2 } from 'lucide-react'
import {
  StatisticsV2,
  DemandSearchV2,
  DemandFiltersV2,
  DemandSortV2,
  DemandCardV2,
  DemandTableV2,
} from './index'
import { useCaisseImprevueDemands } from '@/domains/financial/caisse-imprevue/hooks'
import { PaginationWithEllipses } from '@/components/ui/pagination/PaginationWithEllipses'
import { ExportDemandsModalV2 } from '../modals/ExportDemandsModalV2'
import type { DemandFilters, PaginationParams, SortParams } from '../../entities/demand-filters.types'
import { cn } from '@/lib/utils'

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
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)

  // Mettre à jour le filtre de statut selon l'onglet actif
  const effectiveFilters: DemandFilters = {
    ...filters,
    status: activeTab === 'all' ? 'all' : (activeTab as any),
  }

  const { data: demandsData, isLoading } = useCaisseImprevueDemands(
    effectiveFilters,
    pagination,
    sort
  )

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    setPagination({ ...pagination, page: 1 }) // Reset à la page 1
  }

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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="w-full overflow-x-auto">
          <TabsTrigger value="all" data-testid="tab-all">
            Toutes
          </TabsTrigger>
          <TabsTrigger value="PENDING" data-testid="tab-pending">
            En attente
          </TabsTrigger>
          <TabsTrigger value="APPROVED" data-testid="tab-approved">
            Acceptées
          </TabsTrigger>
          <TabsTrigger value="REJECTED" data-testid="tab-rejected">
            Refusées
          </TabsTrigger>
          <TabsTrigger value="REOPENED" data-testid="tab-reopened">
            Réouvertes
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Toolbar moderne : Recherche, Filtres, Tri, Vue */}
      <Card className="border-0 shadow-lg overflow-hidden">
        <CardContent className="p-0">
          {/* Barre supérieure avec fond gradient subtil */}
          <div className="bg-gradient-to-r from-gray-50 via-white to-gray-50 p-4 md:p-5">
            <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
              {/* Recherche - Prend plus d'espace */}
              <div className="flex-1 min-w-0 lg:max-w-xl">
                <DemandSearchV2 filters={effectiveFilters} className="w-full" />
              </div>

              {/* Actions : Tri + Vue */}
              <div className="flex items-center gap-3 flex-shrink-0">
                {/* Tri */}
                <DemandSortV2 sort={sort} onSortChange={setSort} />

                {/* Séparateur vertical */}
                <div className="hidden sm:block h-8 w-px bg-gray-200" />

                {/* Toggle Vue - Design moderne */}
                <div className="flex items-center p-1 bg-gray-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                      viewMode === 'grid'
                        ? 'bg-white text-[#234D65] shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    )}
                    data-testid="view-mode-grid"
                  >
                    <LayoutGrid className="w-4 h-4" />
                    <span className="hidden sm:inline">Cards</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                      viewMode === 'table'
                        ? 'bg-white text-[#234D65] shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    )}
                    data-testid="view-mode-table"
                  >
                    <Table2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Table</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Barre de filtres avec séparateur élégant */}
          <div className="border-t border-gray-100 bg-white px-4 md:px-5 py-4">
            <DemandFiltersV2
              filters={filters}
              onFiltersChange={(newFilters) => {
                setFilters(newFilters)
                setPagination({ ...pagination, page: 1 })
              }}
              subscriptions={subscriptions}
            />
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
              <p className="text-kara-neutral-500 text-lg">Aucune demande trouvée</p>
              <p className="text-kara-neutral-400 text-sm mt-2">
                {effectiveFilters.status !== 'all'
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
