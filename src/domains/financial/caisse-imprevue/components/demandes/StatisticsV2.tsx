/**
 * Composant StatisticsV2 pour afficher les statistiques des demandes
 * 
 * Responsive : Mobile (2 colonnes), Tablette/Desktop (4 colonnes)
 */

'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useCaisseImprevueDemandsStats } from '../../hooks/useCaisseImprevueDemandsStats'
import type { DemandStats } from '../../entities/demand-filters.types'
import { BarChart3, Clock, CheckCircle2, XCircle, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatisticsV2Props {
  filters?: import('../../entities/demand-filters.types').DemandFilters
  className?: string
}

export function StatisticsV2({ filters, className }: StatisticsV2Props) {
  const { data: stats, isLoading } = useCaisseImprevueDemandsStats(filters)

  if (isLoading) {
    return <StatisticsSkeleton />
  }

  if (!stats) {
    return null
  }

  const statsData = [
    {
      title: 'Total',
      value: stats.total,
      icon: BarChart3,
      color: '#6b7280',
      bgColor: 'bg-gray-100',
    },
    {
      title: 'En attente',
      value: stats.pending,
      icon: Clock,
      color: '#f59e0b',
      bgColor: 'bg-amber-100',
    },
    {
      title: 'Acceptées',
      value: stats.approved,
      icon: CheckCircle2,
      color: '#10b981',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Refusées',
      value: stats.rejected,
      icon: XCircle,
      color: '#ef4444',
      bgColor: 'bg-red-100',
    },
    {
      title: 'Réouvertes',
      value: stats.reopened,
      icon: RotateCcw,
      color: '#3b82f6',
      bgColor: 'bg-blue-100',
    },
  ]

  return (
    <div className={cn('w-full', className)}>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4 lg:gap-6">
        {statsData.map((stat, index) => (
          <StatsCard key={index} {...stat} />
        ))}
      </div>
    </div>
  )
}

function StatsCard({
  title,
  value,
  icon: Icon,
  color,
  bgColor,
}: {
  title: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgColor: string
}) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-4 md:p-5 lg:p-6">
        <div className="flex items-center gap-3">
          <div className={cn('p-2 md:p-2.5 rounded-lg', bgColor)} style={{ color }}>
            <Icon className="w-4 h-4 md:w-5 md:h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs md:text-sm text-kara-neutral-600 font-medium">{title}</p>
            <p className="text-xl md:text-2xl lg:text-3xl font-black text-kara-neutral-900 mt-0.5">
              {value.toLocaleString('fr-FR')}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function StatisticsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4 lg:gap-6">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4 md:p-5 lg:p-6">
            <div className="flex items-center gap-3">
              <Skeleton className="w-8 h-8 md:w-10 md:h-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-6 w-12" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
