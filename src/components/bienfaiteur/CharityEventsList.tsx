'use client'

import React, { useState, useEffect } from 'react'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useCharityEventsList, useCharityGlobalStats, useUpdateCharityEvent } from '@/hooks/bienfaiteur/useCharityEvents'
import { CharityEventStatus } from '@/types/types'
import CharityStatsCards from './CharityStatsCards'
import CharityFilters from './CharityFilters'
import CharityEventCard from './CharityEventCard'
import CharityEventTable from './CharityEventTable'
import { useRouter } from 'next/navigation'
import routes from '@/constantes/routes'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

export default function CharityEventsList() {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [statusFilter, setStatusFilter] = useState<CharityEventStatus | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(12)
  const [updatingEventId, setUpdatingEventId] = useState<string | null>(null)

  const { mutate: updateEvent } = useUpdateCharityEvent()
  const handleSetOngoing = (eventId: string) => {
    setUpdatingEventId(eventId)
    updateEvent(
      { eventId, updates: { status: 'ongoing' } },
      {
        onSuccess: () => toast.success('Évènement mis en cours'),
        onError: (err: Error) => toast.error(err?.message ?? 'Erreur lors de la mise à jour'),
        onSettled: () => setUpdatingEventId(null),
      }
    )
  }

  // Réinitialiser la page à 1 quand la recherche ou le filtre change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter])

  const { data: globalStats, isLoading: isLoadingStats } = useCharityGlobalStats()
  const { data, isLoading: isLoadingEvents, refetch } = useCharityEventsList({
    status: statusFilter,
    searchQuery: searchQuery || undefined
  }, currentPage, pageSize)

  const events = data?.events || []
  const totalEvents = data?.total || 0
  const totalPages = Math.ceil(totalEvents / pageSize)

  const handleCreateEvent = () => {
    router.push(routes.admin.bienfaiteurCreate)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleRefresh = async () => {
    await refetch()
    toast.success('✅ Données actualisées')
  }

  return (
    <div className="space-y-6">
      {/* Statistiques globales */}
      {isLoadingStats ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : globalStats ? (
        <CharityStatsCards stats={globalStats} />
      ) : null}

      {/* Filtres et actions */}
      <CharityFilters
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        viewMode={viewMode}
        setViewMode={setViewMode}
        onCreateEvent={handleCreateEvent}
        onRefresh={handleRefresh}
        isLoading={isLoadingEvents}
      />

      {/* Liste/Grille des évènements */}
      {isLoadingEvents ? (
        <div className={
          viewMode === 'grid'
            ? 'grid gap-6 md:grid-cols-2 lg:grid-cols-3'
            : 'space-y-4'
        }>
          {[...Array(pageSize)].map((_, i) => (
            <Skeleton key={i} className={viewMode === 'grid' ? 'h-80' : 'h-32'} />
          ))}
        </div>
      ) : events && events.length > 0 ? (
        <>
          {viewMode === 'table' ? (
            <CharityEventTable
              events={events}
              onSetOngoing={handleSetOngoing}
              updatingEventId={updatingEventId}
            />
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <CharityEventCard
                  key={event.id}
                  event={event}
                  onSetOngoing={handleSetOngoing}
                  updatingEventId={updatingEventId}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} sur {totalPages} ({totalEvents} évènements au total)
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Précédent
                    </Button>

                    <div className="flex items-center gap-1">
                      {[...Array(totalPages)].map((_, i) => {
                        const page = i + 1
                        // Afficher les 3 premières, les 3 dernières, et les 3 autour de la page actuelle
                        const showPage = page <= 3 || page > totalPages - 3 || Math.abs(page - currentPage) <= 1
                        
                        if (!showPage && page === 4 && currentPage > 5) {
                          return <span key={page} className="px-2">...</span>
                        }
                        if (!showPage && page === totalPages - 3 && currentPage < totalPages - 4) {
                          return <span key={page} className="px-2">...</span>
                        }
                        if (!showPage) return null

                        return (
                          <Button
                            key={page}
                            variant={currentPage === page ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => handlePageChange(page)}
                            className="min-w-[2.5rem]"
                          >
                            {page}
                          </Button>
                        )
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Suivant
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-lg text-gray-500 mb-4">
              {searchQuery || statusFilter !== 'all'
                ? 'Aucun évènement ne correspond à vos critères'
                : 'Aucun évènement disponible'}
            </p>
            <Button onClick={handleCreateEvent}>
              <Plus className="w-4 h-4 mr-2" />
              Créer un évènement
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
