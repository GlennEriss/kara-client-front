'use client'

import { useEffect } from 'react'
import { useCompanyCacheManager } from '@/hooks/company/useCompanyCacheManager'

/**
 * Composant pour initialiser le cache des entreprises
 * À placer au niveau de l'application pour gérer le cache global
 */
export default function CompanyCacheProvider({ children }: { children: React.ReactNode }) {
  const {
    getCacheStats,
    clearAllCache,
    isUpdating,
    lastUpdate
  } = useCompanyCacheManager({
    updateInterval: 10 * 60 * 1000, // 10 minutes
    popularCompanies: ['Total', 'Ministère', 'Banque', 'Hôpital', 'École', 'Gabon'],
    enablePeriodicUpdate: true
  })

  // Log des statistiques du cache en développement
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const logStats = () => {
        const stats = getCacheStats()
        console.log('📊 Statistiques du cache des entreprises:', {
          ...stats,
          isUpdating,
          lastUpdate: lastUpdate?.toLocaleTimeString()
        })
      }

      // Log initial
      logStats()

      // Log périodique
      const interval = setInterval(logStats, 30 * 1000) // Toutes les 30 secondes

      return () => clearInterval(interval)
    }
  }, [getCacheStats, isUpdating, lastUpdate])

  return <>{children}</>
}
