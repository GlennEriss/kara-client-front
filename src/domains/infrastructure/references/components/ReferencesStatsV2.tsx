'use client'

import { StatsCard } from '@/components/ui/stats-card'
import { Briefcase, Building2 } from 'lucide-react'
import React from 'react'

interface ReferencesStatsV2Props {
  stats: {
    companiesCount: number
    professionsCount: number
  }
  onStatClick?: (tabValue: string) => void
}

/**
 * ReferencesStatsV2 - Statistiques du module Métiers
 * Grille responsive de cartes compactes
 */
export default function ReferencesStatsV2({ stats, onStatClick }: ReferencesStatsV2Props) {
  const statsData = [
    {
      title: 'Entreprises',
      value: stats.companiesCount,
      variant: 'kara-blue' as const,
      icon: Building2,
      tabValue: 'companies',
      testId: 'stat-companies',
    },
    {
      title: 'Métiers',
      value: stats.professionsCount,
      variant: 'kara-gold' as const,
      icon: Briefcase,
      tabValue: 'professions',
      testId: 'stat-professions',
    },
  ]

  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 gap-2"
      data-testid="references-stats"
    >
      {statsData.map((stat) => (
        <StatsCard
          key={stat.title}
          title={stat.title}
          value={stat.value}
          variant={stat.variant}
          icon={stat.icon}
          onClick={() => onStatClick?.(stat.tabValue)}
          testId={stat.testId}
        />
      ))}
    </div>
  )
}
