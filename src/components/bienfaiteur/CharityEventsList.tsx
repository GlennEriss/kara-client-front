'use client'

import React, { useState, useEffect } from 'react'
import { Plus, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
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
    <div className="space-y-7">
      {/* Statistiques globales */}
      {isLoadingStats ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-2xl border border-cyan-100/60" />
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
            ? 'grid gap-6 md:grid-cols-2 xl:grid-cols-3'
            : 'space-y-4'
        }>
          {[...Array(pageSize)].map((_, i) => (
            <Skeleton
              key={i}
              className={viewMode === 'grid' ? 'h-[26rem] rounded-2xl border border-cyan-100/60' : 'h-32 rounded-xl border border-cyan-100/60'}
            />
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
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
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
            <Card className="overflow-hidden border-cyan-100/70 bg-white/80 shadow-[0_14px_30px_-26px_rgba(21,57,92,0.85)] backdrop-blur">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-slate-600">
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

                    <div className="flex items-center gap-1 rounded-full border border-cyan-100 bg-cyan-50/60 px-2 py-1">
                      {[...Array(totalPages)].map((_, i) => {
                        const page = i + 1
                        // Afficher les 3 premières, les 3 dernières, et les 3 autour de la page actuelle
                        const showPage = page <= 3 || page > totalPages - 3 || Math.abs(page - currentPage) <= 1
                        
                        if (!showPage && page === 4 && currentPage > 5) {
                          return <span key={page} className="px-2 text-slate-500">...</span>
                        }
                        if (!showPage && page === totalPages - 3 && currentPage < totalPages - 4) {
                          return <span key={page} className="px-2 text-slate-500">...</span>
                        }
                        if (!showPage) return null

                        return (
                          <Button
                            key={page}
                            variant={currentPage === page ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => handlePageChange(page)}
                            className="min-w-[2.5rem] rounded-full"
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
        <Card className="border-cyan-100/70 bg-gradient-to-br from-white to-cyan-50/50 shadow-[0_16px_35px_-28px_rgba(16,58,94,0.9)]">
          <CardContent className="flex flex-col items-center justify-center py-14 text-center">
            <div className="mb-4 rounded-full border border-cyan-200 bg-cyan-50 p-3 text-cyan-700">
              <Sparkles className="h-5 w-5" />
            </div>
            <p className="mb-4 text-lg text-slate-600">
              {searchQuery || statusFilter !== 'all'
                ? 'Aucun évènement ne correspond à vos critères'
                : 'Aucun évènement disponible'}
            </p>
            <Button onClick={handleCreateEvent} className="rounded-full bg-gradient-to-r from-[#1f4f67] to-[#2f7895] text-white shadow-sm hover:opacity-95">
              <Plus className="w-4 h-4 mr-2" />
              Créer un évènement
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
