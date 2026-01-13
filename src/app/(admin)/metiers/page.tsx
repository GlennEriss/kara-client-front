import { ReferencesManagement } from '@/domains/infrastructure/references/components'
import React from 'react'

/**
 * Page de gestion des Métiers (Entreprises & Professions)
 * 
 * Utilise le composant ReferencesManagementV2 avec design cohérent KARA
 * Structure : Header > Stats > Tabs (Entreprises / Métiers)
 */
export default function MetiersPage() {
  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
      <ReferencesManagement />
    </div>
  )
}
