'use client'

import { StatsCard } from '@/components/ui/stats-card'
import { Building2, Home, MapPin, MapPinned, Route } from 'lucide-react'
import React from 'react'

interface GeographyStatsV2Props {
  stats: {
    provincesCount: number
    departmentsCount: number
    communesCount: number
    districtsCount: number
    quartersCount: number
  }
  onStatClick?: (tabValue: string) => void
}

/**
 * GeographyStatsV2 - Statistiques géographiques
 * Grille responsive de cartes compactes
 */
export default function GeographyStatsV2({ stats, onStatClick }: GeographyStatsV2Props) {
  const statsData = [
    {
      title: 'Provinces',
      value: stats.provincesCount,
      variant: 'kara-blue' as const,
      icon: MapPin,
      tabValue: 'provinces',
      testId: 'stat-provinces',
    },
    {
      title: 'Départements',
      value: stats.departmentsCount,
      variant: 'success' as const,
      icon: Building2,
      tabValue: 'departments',
      testId: 'stat-departments',
    },
    {
      title: 'Communes',
      value: stats.communesCount,
      variant: 'warning' as const,
      icon: MapPinned,
      tabValue: 'communes',
      testId: 'stat-communes',
    },
    {
      title: 'Arrondissements',
      value: stats.districtsCount,
      variant: 'kara-gold' as const,
      icon: Route,
      tabValue: 'districts',
      testId: 'stat-districts',
    },
    {
      title: 'Quartiers',
      value: stats.quartersCount,
      variant: 'error' as const,
      icon: Home,
      tabValue: 'quarters',
      testId: 'stat-quarters',
    },
  ]

  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2"
      data-testid="geographie-stats"
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
