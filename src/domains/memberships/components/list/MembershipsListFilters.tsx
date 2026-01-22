'use client'

import MemberFilters from '@/components/memberships/MemberFilters'
import type { UserFilters } from '@/types/types'
import type { MembersTab } from '@/domains/memberships/services/MembershipsListService'

interface MembershipsListFiltersProps {
  filters: UserFilters
  onFiltersChange: (filters: UserFilters) => void
  onReset: () => void
  activeTab?: MembersTab
  onTabChange?: (tab: MembersTab) => void
}

/**
 * Wrapper autour de MemberFilters pour la liste des membres V2
 * 
 * Ce composant encapsule MemberFilters et peut être étendu avec :
 * - Des fonctionnalités spécifiques à la liste V2
 * - Des styles ou comportements additionnels
 * - Des optimisations de performance
 * - Synchronisation avec les tabs (verrouillage des filtres)
 */
export function MembershipsListFilters({
  filters,
  onFiltersChange,
  onReset,
  activeTab,
  onTabChange,
}: MembershipsListFiltersProps) {
  return (
    <MemberFilters
      filters={filters}
      onFiltersChange={onFiltersChange}
      onReset={onReset}
      activeTab={activeTab}
      onTabChange={onTabChange}
    />
  )
}
