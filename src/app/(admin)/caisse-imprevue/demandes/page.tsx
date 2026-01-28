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
import { StatisticsV2, DemandSearchV2, DemandFiltersV2, DemandSortV2, DemandCardV2, DemandTableV2 } from '@/domains/financial/caisse-imprevue/components/demandes'
import { useCaisseImprevueDemands, useCaisseImprevueDemandsStats } from '@/domains/financial/caisse-imprevue/hooks'
import { PaginationWithEllipses } from '@/components/ui/pagination/PaginationWithEllipses'
import type { DemandFilters, PaginationParams, SortParams } from '@/domains/financial/caisse-imprevue/entities/demand-filters.types'
import {
  ExportDemandsModalV2,
  AcceptDemandModalV2,
  RejectDemandModalV2,
  ReopenDemandModalV2,
  DeleteDemandModalV2,
  EditDemandModalV2,
  ConfirmContractModalV2,
} from '@/domains/financial/caisse-imprevue/components/modals'
import {
  useAcceptDemand,
  useRejectDemand,
  useReopenDemand,
  useDeleteDemand,
  useUpdateDemand,
  useCreateContractFromDemand,
} from '@/domains/financial/caisse-imprevue/hooks'
import { useAuth } from '@/domains/auth/hooks/useAuth'
import { useDemandDetail } from '@/domains/financial/caisse-imprevue/hooks'
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
  const [selectedDemandId, setSelectedDemandId] = useState<string | null>(null)
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false)
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)
  const [isReopenModalOpen, setIsReopenModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isContractModalOpen, setIsContractModalOpen] = useState(false)

  const { user } = useAuth()
  const { data: selectedDemand } = useDemandDetail(selectedDemandId || '')

  const acceptMutation = useAcceptDemand()
  const rejectMutation = useRejectDemand()
  const reopenMutation = useReopenDemand()
  const deleteMutation = useDeleteDemand()
  const updateMutation = useUpdateDemand()
  const createContractMutation = useCreateContractFromDemand()

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

  const handleAccept = (id: string) => {
    setSelectedDemandId(id)
    setIsAcceptModalOpen(true)
  }

  const handleReject = (id: string) => {
    setSelectedDemandId(id)
    setIsRejectModalOpen(true)
  }

  const handleReopen = (id: string) => {
    setSelectedDemandId(id)
    setIsReopenModalOpen(true)
  }

  const handleDelete = (id: string) => {
    setSelectedDemandId(id)
    setIsDeleteModalOpen(true)
  }

  const handleEdit = (id: string) => {
    setSelectedDemandId(id)
    setIsEditModalOpen(true)
  }

  const handleCreateContract = (id: string) => {
    setSelectedDemandId(id)
    setIsContractModalOpen(true)
  }

  const handleConfirmAccept = async (reason: string) => {
    if (!selectedDemandId || !user?.uid) return
    await acceptMutation.mutateAsync({
      id: selectedDemandId,
      input: { reason },
      acceptedBy: user.uid,
    })
    setIsAcceptModalOpen(false)
    setSelectedDemandId(null)
  }

  const handleConfirmReject = async (reason: string) => {
    if (!selectedDemandId || !user?.uid) return
    await rejectMutation.mutateAsync({
      id: selectedDemandId,
      input: { reason },
      rejectedBy: user.uid,
    })
    setIsRejectModalOpen(false)
    setSelectedDemandId(null)
  }

  const handleConfirmReopen = async (reason?: string) => {
    if (!selectedDemandId || !user?.uid) return
    await reopenMutation.mutateAsync({
      id: selectedDemandId,
      input: { reason },
      reopenedBy: user.uid,
    })
    setIsReopenModalOpen(false)
    setSelectedDemandId(null)
  }

  const handleConfirmDelete = async () => {
    if (!selectedDemandId || !user?.uid) return
    await deleteMutation.mutateAsync({
      id: selectedDemandId,
      deletedBy: user.uid,
    })
    setIsDeleteModalOpen(false)
    setSelectedDemandId(null)
  }

  const handleConfirmEdit = async (data: any) => {
    if (!selectedDemandId || !user?.uid) return
    await updateMutation.mutateAsync({
      id: selectedDemandId,
      data,
      updatedBy: user.uid,
    })
    setIsEditModalOpen(false)
    setSelectedDemandId(null)
  }

  const handleConfirmContract = async () => {
    if (!selectedDemandId || !user?.uid) return
    await createContractMutation.mutateAsync({
      demandId: selectedDemandId,
      convertedBy: user.uid,
    })
    setIsContractModalOpen(false)
    setSelectedDemandId(null)
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
                  onAccept={handleAccept}
                  onReject={handleReject}
                  onReopen={handleReopen}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                  onCreateContract={handleCreateContract}
                />
              ))}
            </div>
          )}

          {/* Vue Table */}
          {viewMode === 'table' && (
            <DemandTableV2
              demands={demandsData.items}
              onViewDetails={handleViewDetails}
              onAccept={handleAccept}
              onReject={handleReject}
              onReopen={handleReopen}
              onDelete={handleDelete}
              onEdit={handleEdit}
              onCreateContract={handleCreateContract}
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

      {/* Modals */}
      <ExportDemandsModalV2
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />

      {selectedDemand && (
        <>
          <AcceptDemandModalV2
            isOpen={isAcceptModalOpen}
            onClose={() => {
              setIsAcceptModalOpen(false)
              setSelectedDemandId(null)
            }}
            onConfirm={handleConfirmAccept}
            demandId={selectedDemand.id}
            memberName={`${selectedDemand.memberFirstName} ${selectedDemand.memberLastName}`}
            isLoading={acceptMutation.isPending}
          />

          <RejectDemandModalV2
            isOpen={isRejectModalOpen}
            onClose={() => {
              setIsRejectModalOpen(false)
              setSelectedDemandId(null)
            }}
            onConfirm={handleConfirmReject}
            demandId={selectedDemand.id}
            memberName={`${selectedDemand.memberFirstName} ${selectedDemand.memberLastName}`}
            isLoading={rejectMutation.isPending}
          />

          <ReopenDemandModalV2
            isOpen={isReopenModalOpen}
            onClose={() => {
              setIsReopenModalOpen(false)
              setSelectedDemandId(null)
            }}
            onConfirm={handleConfirmReopen}
            demandId={selectedDemand.id}
            memberName={`${selectedDemand.memberFirstName} ${selectedDemand.memberLastName}`}
            previousRejectReason={selectedDemand.decisionReason}
            isLoading={reopenMutation.isPending}
          />

          <DeleteDemandModalV2
            isOpen={isDeleteModalOpen}
            onClose={() => {
              setIsDeleteModalOpen(false)
              setSelectedDemandId(null)
            }}
            onConfirm={handleConfirmDelete}
            demandId={selectedDemand.id}
            memberName={`${selectedDemand.memberFirstName} ${selectedDemand.memberLastName}`}
            isLoading={deleteMutation.isPending}
          />

          <EditDemandModalV2
            isOpen={isEditModalOpen}
            onClose={() => {
              setIsEditModalOpen(false)
              setSelectedDemandId(null)
            }}
            onConfirm={handleConfirmEdit}
            demand={selectedDemand}
            isLoading={updateMutation.isPending}
          />

          <ConfirmContractModalV2
            isOpen={isContractModalOpen}
            onClose={() => {
              setIsContractModalOpen(false)
              setSelectedDemandId(null)
            }}
            onConfirm={handleConfirmContract}
            demand={selectedDemand}
            isLoading={createContractMutation.isPending}
          />
        </>
      )}
    </div>
  )
}
