/**
 * Page de liste des demandes Caisse Imprévue V2
 * 
 * Responsive : Mobile, Tablette, Desktop
 * Pagination serveur, tri, recherche, filtres
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Download, Plus, List, Grid } from 'lucide-react'
import { StatisticsV2, DemandSearchV2, DemandFiltersV2, DemandSortV2, DemandCardV2 } from '@/domains/financial/caisse-imprevue/components/demandes'
import { useCaisseImprevueDemands, useCaisseImprevueDemandsStats } from '@/domains/financial/caisse-imprevue/hooks'
import { PaginationWithEllipses } from '@/components/ui/pagination/PaginationWithEllipses'
import type { DemandFilters, PaginationParams, SortParams } from '@/domains/financial/caisse-imprevue/entities/demand-filters.types'
import { ExportDemandsModalV2 } from '@/domains/financial/caisse-imprevue/components/modals/ExportDemandsModalV2'
import { cn } from '@/lib/utils'

export default function DemandesPage() {
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
    router.push(`/caisse-imprevue/demandes/${id}`)
  }

  return (
    <div className="container mx-auto p-3 md:p-4 lg:p-6 space-y-4 md:space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="bg-[#234D65] rounded-lg p-4 md:p-6 lg:p-8 text-white">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-black mb-2">
          📋 Demandes Caisse Imprévue
        </h1>
        <p className="text-sm md:text-base lg:text-lg text-kara-primary-light/80 mb-4">
          Gérez les demandes de contrats Caisse Imprévue
        </p>
        <div className="flex flex-col sm:flex-row gap-2 md:gap-3 lg:gap-4">
          <Button
            variant="outline"
            onClick={() => setIsExportModalOpen(true)}
            className="bg-white/10 hover:bg-white/20 border-white/20 text-white"
            data-testid="export-demands-button"
          >
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
          <Button
            onClick={() => router.push('/caisse-imprevue/demandes/add')}
            className="bg-[#CBB171] hover:bg-[#B8A05F] text-white"
            data-testid="create-demand-button"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle demande
          </Button>
        </div>
      </div>

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
          <DemandSearchV2
            filters={effectiveFilters}
            className="w-full"
          />
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
      />

      {/* Toggle vue */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="w-4 h-4 mr-2" />
            Cards
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('table')}
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
                />
              ))}
            </div>
          )}

          {/* Vue Table (à implémenter) */}
          {viewMode === 'table' && (
            <div className="bg-white rounded-lg border">
              <p className="p-4 text-center text-kara-neutral-500">
                Vue table à implémenter
              </p>
            </div>
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
