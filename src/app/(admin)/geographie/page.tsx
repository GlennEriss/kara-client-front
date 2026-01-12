import { GeographieManagement } from '@/domains/infrastructure/geography/components'
import React from 'react'

/**
 * Page de gestion géographique
 * 
 * Utilise automatiquement V2 sauf si NEXT_PUBLIC_GEOGRAPHY_VERSION=v1
 * Pour forcer une version spécifique, utiliser directement :
 * - GeographieManagementV1
 * - GeographieManagementV2
 */
export default function GeographiePage() {
  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
      <GeographieManagement />
    </div>
  )
}

