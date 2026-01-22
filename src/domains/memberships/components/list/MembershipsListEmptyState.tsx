'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, RefreshCw, Plus } from 'lucide-react'
import type { UserFilters } from '@/types/types'

interface MembershipsListEmptyStateProps {
  filters: UserFilters
  onResetFilters: () => void
}

export function MembershipsListEmptyState({
  filters,
  onResetFilters,
}: MembershipsListEmptyStateProps) {
  const hasFilters = Object.keys(filters).length > 0

  return (
    <Card className="bg-gradient-to-br from-white via-gray-50/50 to-white border-0 shadow-2xl">
      <CardContent className="text-center p-16">
        <div className="space-y-6">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center shadow-inner">
            <Users className="h-10 w-10 text-gray-400" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Aucun membre trouvé</h3>
            <p className="text-gray-600 text-lg max-w-md mx-auto leading-relaxed">
              {hasFilters
                ? 'Essayez de modifier vos critères de recherche ou de réinitialiser les filtres.'
                : "Il n'y a pas encore de membres enregistrés dans le système."}
            </p>
          </div>
          <div className="flex justify-center space-x-4">
            {hasFilters && (
              <Button
                variant="outline"
                onClick={onResetFilters}
                className="h-12 px-6 border-2 border-gray-300 hover:border-gray-400 transition-all duration-300 hover:scale-105"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Réinitialiser les filtres
              </Button>
            )}
            <Button className="h-12 px-6 bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un membre
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
