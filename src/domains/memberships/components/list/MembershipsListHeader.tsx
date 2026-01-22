'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, RefreshCw, FileDown, Plus, Grid3X3, List } from 'lucide-react'
import routes from '@/constantes/routes'

type ViewMode = 'grid' | 'list'

interface MembershipsListHeaderProps {
  totalItems: number
  currentPage: number
  viewMode: ViewMode
  isLoading: boolean
  onViewModeChange: (mode: ViewMode) => void
  onRefresh: () => void
  onExport: () => void
}

export function MembershipsListHeader({
  totalItems,
  currentPage,
  viewMode,
  isLoading,
  onViewModeChange,
  onRefresh,
  onExport,
}: MembershipsListHeaderProps) {
  return (
    <Card className="bg-gradient-to-r from-white via-gray-50/50 to-white border-0 shadow-xl">
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-6 lg:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-[#234D65] to-[#2c5a73] shadow-lg">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black bg-gradient-to-r from-[#234D65] to-[#2c5a73] bg-clip-text text-transparent">
                Liste des Membres
              </h2>
              <p className="text-gray-600 font-medium">
                {totalItems.toLocaleString()} membres • Page {currentPage}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
            {/* Boutons de vue modernes - Cachés sur mobile */}
            <div className="hidden md:flex items-center bg-gray-100 rounded-xl p-1 shadow-inner">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewModeChange('grid')}
                data-testid="view-mode-grid"
                className={`h-10 px-4 rounded-lg transition-all duration-300 ${
                  viewMode === 'grid'
                    ? 'bg-[#234D65] hover:bg-[#2c5a73] text-white shadow-lg scale-105'
                    : 'hover:bg-white hover:shadow-md'
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
                className={`h-10 px-4 rounded-lg transition-all duration-300 ${
                  viewMode === 'list'
                    ? 'bg-[#234D65] hover:bg-[#2c5a73] text-white shadow-lg scale-105'
                    : 'hover:bg-white hover:shadow-md'
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
              className="hidden md:flex h-10 px-4 bg-white border-2 border-[#234D65] text-[#234D65] hover:bg-[#234D65] hover:text-white transition-all duration-300 hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:hover:scale-100"
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
                className="flex-1 h-12 bg-white border-2 border-[#CBB171] text-[#CBB171] hover:bg-[#CBB171] hover:text-white transition-all duration-300 hover:scale-105 hover:shadow-lg font-medium"
              >
                <FileDown className="h-5 w-5 mr-2" />
                Exporter
              </Button>

              <Button
                size="sm"
                onClick={() => {
                  window.location.href = routes.admin.membershipAdd
                }}
                className="flex-1 h-12 bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 font-medium"
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
                className="h-10 px-4 bg-white border-2 border-[#CBB171] text-[#CBB171] hover:bg-[#CBB171] hover:text-white transition-all duration-300 hover:scale-105 hover:shadow-lg"
              >
                <FileDown className="h-4 w-4 mr-2" />
                Exporter
              </Button>

              <Button
                size="sm"
                onClick={() => {
                  window.location.href = routes.admin.membershipAdd
                }}
                className="h-10 px-4 bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nouveau Membre
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
