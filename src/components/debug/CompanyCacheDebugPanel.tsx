'use client'

import React, { useState } from 'react'
import { useCompanyCacheManager } from '@/hooks/company/useCompanyCacheManager'
import { useCompanyCache } from '@/hooks/company/useCompanySuggestions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Trash2, Database, Clock, CheckCircle, AlertCircle } from 'lucide-react'

/**
 * Composant de debug pour visualiser et gérer le cache des entreprises
 * À utiliser uniquement en développement
 */
export default function CompanyCacheDebugPanel() {
  const [isVisible, setIsVisible] = useState(false)
  
  const {
    getCacheStats,
    clearAllCache,
    forceUpdate,
    isUpdating,
    lastUpdate
  } = useCompanyCacheManager()

  const { getCacheStats: getSimpleStats } = useCompanyCache()

  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  const stats = getCacheStats()
  const simpleStats = getSimpleStats()

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Toggle Button */}
      <Button
        onClick={() => setIsVisible(!isVisible)}
        size="sm"
        variant="outline"
        className="mb-2 bg-white/90 backdrop-blur-sm"
      >
        <Database className="w-4 h-4 mr-2" />
        Cache Debug
      </Button>

      {/* Debug Panel */}
      {isVisible && (
        <Card className="w-80 bg-white/95 backdrop-blur-sm border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Cache des Entreprises</span>
              <Badge variant={isUpdating ? "default" : "secondary"} className="text-xs">
                {isUpdating ? "Mise à jour..." : "Actif"}
              </Badge>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-3">
            {/* Statistiques */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center">
                  <Database className="w-3 h-3 mr-1" />
                  Requêtes cachées
                </span>
                <Badge variant="outline" className="text-xs">
                  {stats.totalCachedQueries}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center">
                  <CheckCircle className="w-3 h-3 mr-1 text-green-500" />
                  Fraîches
                </span>
                <Badge variant="outline" className="text-xs text-green-600">
                  {stats.freshQueries}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center">
                  <AlertCircle className="w-3 h-3 mr-1 text-orange-500" />
                  Obsolètes
                </span>
                <Badge variant="outline" className="text-xs text-orange-600">
                  {stats.staleQueries}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  Dernière MAJ
                </span>
                <span className="text-xs text-gray-600">
                  {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Jamais'}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-2 pt-2 border-t">
              <Button
                onClick={forceUpdate}
                size="sm"
                variant="outline"
                className="flex-1 text-xs"
                disabled={isUpdating}
              >
                <RefreshCw className={`w-3 h-3 mr-1 ${isUpdating ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
              
              <Button
                onClick={clearAllCache}
                size="sm"
                variant="destructive"
                className="flex-1 text-xs"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Vider
              </Button>
            </div>

            {/* Taille du cache */}
            <div className="text-xs text-gray-500 pt-2 border-t">
              Taille: {(stats.cacheSize / 1024).toFixed(1)} KB
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
