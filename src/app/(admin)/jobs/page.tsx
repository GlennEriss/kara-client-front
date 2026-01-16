import { ReferencesManagement } from '@/domains/infrastructure/references/components'
import React from 'react'

/**
 * Page de gestion des Métiers / Professions
 * 
 * Utilise le composant ReferencesManagementV2 avec l'onglet "Métiers" par défaut
 * Design cohérent KARA : Header > Stats > Tabs
 */
export default function JobsPage() {
  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
      <ReferencesManagement defaultTab="professions" />
    </div>
  )
}
