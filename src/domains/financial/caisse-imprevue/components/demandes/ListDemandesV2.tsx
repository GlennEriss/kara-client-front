/**
 * Composant principal de liste des demandes Caisse Imprévue V2
 * 
 * Responsive : Mobile, Tablette, Desktop
 * Intègre : Stats, Tabs, Filtres, Recherche, Tri, Pagination, Vue Grid/Table
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Download, Plus, List, Grid } from 'lucide-react'
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

      {/* Filtres et Recherche */}
      <div className="space-y-3 md:space-y-0 md:flex md:items-start md:gap-4">
        <div className="flex-1">
          <DemandSearchV2 filters={effectiveFilters} className="w-full" />
        </div>
        <div className="md:w-auto">
          <DemandSortV2 sort={sort} onSortChange={setSort} />
        </div>
      </div>

      <DemandFiltersV2
        filters={filters}
        onFiltersChange={(newFilters) => {
          setFilters(newFilters)
          setPagination({ ...pagination, page: 1 })
        }}
        subscriptions={subscriptions}
      />

      {/* Toggle vue */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
            data-testid="view-mode-grid"
          >
            <Grid className="w-4 h-4 mr-2" />
            Cards
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('table')}
            data-testid="view-mode-table"
          >
            <List className="w-4 h-4 mr-2" />
            Liste
          </Button>
        </div>
      </div>

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
            <PaginationWithEllipses
              currentPage={pagination.page}
              totalPages={demandsData.pagination.totalPages}
              onPageChange={handlePageChange}
              hasNextPage={demandsData.pagination.hasNextPage}
              hasPrevPage={demandsData.pagination.hasPreviousPage}
            />
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
            <PaginationWithEllipses
              currentPage={pagination.page}
              totalPages={demandsData.pagination.totalPages}
              onPageChange={handlePageChange}
              hasNextPage={demandsData.pagination.hasNextPage}
              hasPrevPage={demandsData.pagination.hasPreviousPage}
            />
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <p className="text-kara-neutral-500">Aucune demande trouvée</p>
        </div>
      )}

      {/* Modal Export */}
      <ExportDemandsModalV2
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </div>
  )
}
