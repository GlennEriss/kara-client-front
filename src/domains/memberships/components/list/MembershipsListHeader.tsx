'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, RefreshCw, FileDown, Plus, Grid3X3, List } from 'lucide-react'
import routes from '@/constantes/routes'
import { MembershipsListPagination } from './MembershipsListPagination'
import type { PaginatedMembers } from '@/db/member.db'

type ViewMode = 'grid' | 'list'

interface MembershipsListHeaderProps {
  totalItems: number
  currentPage: number
  viewMode: ViewMode
  isLoading: boolean
  onViewModeChange: (mode: ViewMode) => void
  onRefresh: () => void
  onExport: () => void
  pagination?: PaginatedMembers['pagination']
  onPageChange?: (page: number) => void
}

export function MembershipsListHeader({
  totalItems,
  currentPage,
  viewMode,
  isLoading,
  onViewModeChange,
  onRefresh,
  onExport,
  pagination,
  onPageChange,
}: MembershipsListHeaderProps) {
  return (
    <Card className="bg-gradient-to-r from-white via-gray-50/50 to-white border-0 shadow-xl">
      <CardContent className="p-4 md:p-6">
        {/* Ligne 1 (mobile) / bloc titre (desktop) : icône + titre, puis en dessous total & page */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4 mb-4 md:mb-6">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="p-2.5 md:p-3 rounded-xl md:rounded-2xl bg-gradient-to-br from-[#234D65] to-[#2c5a73] shadow-lg shrink-0">
              <Users className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base md:text-2xl font-bold md:font-black bg-gradient-to-r from-[#234D65] to-[#2c5a73] bg-clip-text text-transparent md:truncate">
                Liste des membres
              </h2>
              <p className="text-sm md:text-base text-gray-600 font-medium mt-0.5">
                {totalItems.toLocaleString()} membres • Page {currentPage}
              </p>
            </div>
          </div>

          {/* Ligne 2 (mobile) : pagination sur sa propre ligne */}
          {pagination && onPageChange && pagination.totalPages > 1 && (
            <div className="shrink-0 w-full md:w-auto flex justify-start md:justify-end">
              <MembershipsListPagination
                pagination={pagination}
                onPageChange={onPageChange}
                onItemsPerPageChange={() => {}}
                isLoading={isLoading}
                compact={true}
              />
            </div>
          )}
        </div>

        {/* Ligne 3 (mobile) : Exporter + Nouveau ; desktop : tous les boutons d'actions */}
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
            {/* Boutons de vue modernes - Cachés sur mobile */}
            <div className="hidden md:flex items-center rounded-xl border border-slate-200 bg-slate-100/80 p-1">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewModeChange('grid')}
                data-testid="view-mode-grid"
                className={`h-10 px-4 rounded-lg cursor-pointer transition-all duration-200 ${
                  viewMode === 'grid'
                    ? 'bg-white text-[#234D65] shadow-sm hover:bg-white'
                    : 'text-slate-600 hover:bg-white hover:text-[#234D65]'
                }`}
              >
                <Grid3X3 className="h-4 w-4 mr-2" />
                Grille
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewModeChange('list')}
                data-testid="view-mode-list"
                className={`h-10 px-4 rounded-lg cursor-pointer transition-all duration-200 ${
                  viewMode === 'list'
                    ? 'bg-white text-[#234D65] shadow-sm hover:bg-white'
                    : 'text-slate-600 hover:bg-white hover:text-[#234D65]'
                }`}
              >
                <List className="h-4 w-4 mr-2" />
                Liste
              </Button>
            </div>

            {/* Actions avec animations */}
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
              className="hidden md:flex h-10 rounded-xl border-2 border-[#234D65]/40 bg-white px-4 text-[#234D65] cursor-pointer transition-all duration-200 hover:bg-[#234D65] hover:text-white hover:shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>

            {/* Boutons mobiles - Exporter et Nouveau seulement */}
            <div className="flex md:hidden w-full gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={onExport}
                data-testid="export-button-mobile"
                className="flex-1 h-12 rounded-xl border-2 border-[#CBB171]/70 bg-white text-[#9c833f] cursor-pointer transition-all duration-200 hover:border-[#CBB171] hover:bg-[#CBB171]/10 hover:text-[#7d6731] font-medium"
              >
                <FileDown className="h-5 w-5 mr-2" />
                Exporter
              </Button>

              <Button
                size="sm"
                onClick={() => {
                  window.location.href = routes.admin.membershipAdd
                }}
                className="flex-1 h-12 rounded-xl border-0 bg-gradient-to-r from-[#234D65] to-[#2c5a73] text-white cursor-pointer shadow-sm transition-all duration-200 hover:from-[#2c5a73] hover:to-[#234D65] hover:shadow-md font-medium"
              >
                <Plus className="h-5 w-5 mr-2" />
                Nouveau
              </Button>
            </div>

            {/* Boutons desktop - Tous les boutons */}
            <div className="hidden md:flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={onExport}
                className="h-10 rounded-xl border-2 border-[#CBB171]/70 bg-white px-4 text-[#9c833f] cursor-pointer transition-all duration-200 hover:border-[#CBB171] hover:bg-[#CBB171]/10 hover:text-[#7d6731] hover:shadow-sm"
              >
                <FileDown className="h-4 w-4 mr-2" />
                Exporter
              </Button>

              <Button
                size="sm"
                onClick={() => {
                  window.location.href = routes.admin.membershipAdd
                }}
                className="h-10 rounded-xl border-0 bg-gradient-to-r from-[#234D65] to-[#2c5a73] px-4 text-white cursor-pointer shadow-sm transition-all duration-200 hover:from-[#2c5a73] hover:to-[#234D65] hover:shadow-md"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nouveau Membre
              </Button>
            </div>
        </div>
      </CardContent>
    </Card>
  )
}
