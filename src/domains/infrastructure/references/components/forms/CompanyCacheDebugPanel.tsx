'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Database, 
  RefreshCw, 
  Trash2, 
  Clock,
  TrendingUp,
  Activity
} from 'lucide-react'
import { useCompanyCacheManager } from '@/hooks/company/useCompanyCacheManager'

interface CompanyCacheDebugPanelProps {
  className?: string
}

export default function CompanyCacheDebugPanel({ className }: CompanyCacheDebugPanelProps) {
  const {
    getCacheStats,
    forceUpdate,
    clearAllCache,
    isUpdating,
    lastUpdate
  } = useCompanyCacheManager({
    updateInterval: 2 * 60 * 1000, // 2 minutes pour le debug
    enablePeriodicUpdate: true
  })

  const stats = getCacheStats()

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (date: Date | null) => {
    if (!date) return 'Jamais'
    return date.toLocaleTimeString('fr-FR')
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2 text-sm">
          <Database className="w-4 h-4 text-[#224D62]" />
          <span>Cache des Entreprises</span>
          {isUpdating && (
            <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
              <Activity className="w-3 h-3 mr-1 animate-pulse" />
              Actif
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Statistiques */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="space-y-1">
            <div className="flex items-center space-x-1 text-gray-600">
              <TrendingUp className="w-3 h-3" />
              <span>Requêtes en cache</span>
            </div>
            <div className="text-lg font-semibold text-[#224D62]">
              {stats.totalCachedQueries}
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center space-x-1 text-gray-600">
              <Database className="w-3 h-3" />
              <span>Taille du cache</span>
            </div>
            <div className="text-lg font-semibold text-[#224D62]">
              {formatBytes(stats.cacheSize)}
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center space-x-1 text-gray-600">
              <Clock className="w-3 h-3" />
              <span>Dernière mise à jour</span>
            </div>
            <div className="text-sm font-medium text-[#224D62]">
              {formatDate(lastUpdate)}
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center space-x-1 text-gray-600">
              <RefreshCw className="w-3 h-3" />
              <span>Données fraîches</span>
            </div>
            <div className="text-sm font-medium text-green-600">
              {stats.freshQueries}/{stats.totalCachedQueries}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={forceUpdate}
            className="flex-1 text-xs"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Forcer MAJ
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={clearAllCache}
            className="flex-1 text-xs text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Vider
          </Button>
        </div>

        {/* Status */}
        <div className="text-xs text-gray-500 text-center">
          Mise à jour automatique toutes les 2 minutes
        </div>
      </CardContent>
    </Card>
  )
}
