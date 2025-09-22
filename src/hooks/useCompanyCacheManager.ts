/**
 * @module useCompanyCacheManager
 * Hook pour la gestion du cache des entreprises avec mise à jour périodique
 */

import { useEffect, useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { findCompanyByName } from '@/db/company.db'

interface CacheManagerOptions {
  updateInterval?: number // en millisecondes
  popularCompanies?: string[]
  enablePeriodicUpdate?: boolean
}

/**
 * Hook pour gérer le cache des entreprises avec mise à jour périodique
 */
export function useCompanyCacheManager({
  updateInterval = 10 * 60 * 1000, // 10 minutes par défaut
  popularCompanies = ['Total', 'Ministère', 'Banque', 'Hôpital', 'École', 'Gabon'],
  enablePeriodicUpdate = true
}: CacheManagerOptions = {}) {
  
  const queryClient = useQueryClient()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastUpdateRef = useRef<number>(0)

  /**
   * Met à jour le cache pour une liste d'entreprises
   */
  const updateCacheForCompanies = useCallback(async (companies: string[]) => {
    try {
      console.log('🔄 Mise à jour du cache des entreprises:', companies)
      
      await Promise.all(
        companies.map(async (companyName) => {
          const queryKey = ['company-suggestions', companyName.toLowerCase()]
          
          // Vérifier si la donnée est encore fraîche
          const cachedData = queryClient.getQueryData(queryKey)
          if (cachedData) {
            const queryState = queryClient.getQueryState(queryKey)
            if (queryState && Date.now() - queryState.dataUpdatedAt < 5 * 60 * 1000) {
              // Données encore fraîches (moins de 5 minutes)
              return
            }
          }
          
          // Récupérer les nouvelles données
          const freshData = await findCompanyByName(companyName)
          queryClient.setQueryData(queryKey, freshData)
        })
      )
      
      lastUpdateRef.current = Date.now()
      console.log('✅ Cache des entreprises mis à jour')
      
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour du cache:', error)
    }
  }, [queryClient])

  /**
   * Met à jour le cache pour les entreprises populaires
   */
  const updatePopularCompaniesCache = useCallback(() => {
    updateCacheForCompanies(popularCompanies)
  }, [updateCacheForCompanies, popularCompanies])

  /**
   * Démarre la mise à jour périodique
   */
  const startPeriodicUpdate = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    
    intervalRef.current = setInterval(() => {
      updatePopularCompaniesCache()
    }, updateInterval)
    
    console.log(`🔄 Mise à jour périodique démarrée (intervalle: ${updateInterval / 1000}s)`)
  }, [updatePopularCompaniesCache, updateInterval])

  /**
   * Arrête la mise à jour périodique
   */
  const stopPeriodicUpdate = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
      console.log('⏹️ Mise à jour périodique arrêtée')
    }
  }, [])

  /**
   * Force une mise à jour immédiate
   */
  const forceUpdate = useCallback(() => {
    updatePopularCompaniesCache()
  }, [updatePopularCompaniesCache])

  /**
   * Obtient les statistiques du cache
   */
  const getCacheStats = useCallback(() => {
    const cache = queryClient.getQueryCache()
    const companyQueries = cache.findAll({ queryKey: ['company-suggestions'] })
    
    const stats = {
      totalCachedQueries: companyQueries.length,
      lastUpdate: lastUpdateRef.current > 0 ? new Date(lastUpdateRef.current) : null,
      cacheSize: 0,
      staleQueries: 0,
      freshQueries: 0
    }
    
    companyQueries.forEach(query => {
      const dataSize = JSON.stringify(query.state.data || {}).length
      stats.cacheSize += dataSize
      
      const isStale = Date.now() - query.state.dataUpdatedAt > 5 * 60 * 1000
      if (isStale) {
        stats.staleQueries++
      } else {
        stats.freshQueries++
      }
    })
    
    return stats
  }, [queryClient])

  /**
   * Vide tout le cache des entreprises
   */
  const clearAllCache = useCallback(() => {
    queryClient.removeQueries({ queryKey: ['company-suggestions'] })
    lastUpdateRef.current = 0
    console.log('🗑️ Cache des entreprises vidé')
  }, [queryClient])

  // Démarrer la mise à jour périodique au montage
  useEffect(() => {
    if (enablePeriodicUpdate) {
      // Mise à jour immédiate au montage
      updatePopularCompaniesCache()
      
      // Puis mise à jour périodique
      startPeriodicUpdate()
    }
    
    return () => {
      stopPeriodicUpdate()
    }
  }, [enablePeriodicUpdate, updatePopularCompaniesCache, startPeriodicUpdate, stopPeriodicUpdate])

  return {
    updateCacheForCompanies,
    updatePopularCompaniesCache,
    startPeriodicUpdate,
    stopPeriodicUpdate,
    forceUpdate,
    getCacheStats,
    clearAllCache,
    isUpdating: intervalRef.current !== null,
    lastUpdate: lastUpdateRef.current > 0 ? new Date(lastUpdateRef.current) : null
  }
}
