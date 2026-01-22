'use client'

import MemberFilters from '@/components/memberships/MemberFilters'
import type { UserFilters } from '@/types/types'

interface MembershipsListFiltersProps {
  filters: UserFilters
  onFiltersChange: (filters: UserFilters) => void
  onReset: () => void
}

/**
 * Wrapper autour de MemberFilters pour la liste des membres V2
 * 
 * Ce composant encapsule MemberFilters et peut être étendu avec :
 * - Des fonctionnalités spécifiques à la liste V2
 * - Des styles ou comportements additionnels
 * - Des optimisations de performance
 */
export function MembershipsListFilters({
  filters,
  onFiltersChange,
  onReset,
}: MembershipsListFiltersProps) {
  return (
    <MemberFilters
      filters={filters}
      onFiltersChange={onFiltersChange}
      onReset={onReset}
    />
  )
}
