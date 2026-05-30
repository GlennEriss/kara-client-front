/**
 * Composant StatisticsV2 pour afficher les statistiques des demandes
 *
 * Layout horizontal compact, grille responsive
 * Stats globales (indépendantes des filtres de statut)
 */

'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { BarChart3, Calendar, CalendarDays, CheckCircle2, Clock, RotateCcw, XCircle } from 'lucide-react'
import { useCaisseImprevueDemandsStats } from '../../hooks/useCaisseImprevueDemandsStats'

interface StatisticsV2Props {
  filters?: import('../../entities/demand-filters.types').DemandFilters
  className?: string
}

export function StatisticsV2({ filters, className }: StatisticsV2Props) {
  // ⚠️ Les stats sont globales, le filtre de statut est exclu automatiquement dans le hook
  const { data: stats, isLoading } = useCaisseImprevueDemandsStats(filters)

  const statsData = stats
    ? [
        { title: 'Total', value: stats.total, color: '#234D65', icon: BarChart3 },
        { title: 'En attente', value: stats.pending, color: '#f59e0b', icon: Clock },
        { title: 'Acceptées', value: stats.approved, color: '#10b981', icon: CheckCircle2 },
        { title: 'Refusées', value: stats.rejected, color: '#ef4444', icon: XCircle },
        { title: 'Réouvertes', value: stats.reopened, color: '#3b82f6', icon: RotateCcw },
        { title: 'Quotidiennes', value: stats.daily, color: '#8b5cf6', icon: CalendarDays },
        { title: 'Mensuelles', value: stats.monthly, color: '#ec4899', icon: Calendar },
      ]
    : []

  if (isLoading) {
    return <StatisticsSkeleton />
  }

  if (!stats || statsData.length === 0) {
    return null
  }

  return (
    <div className={cn('grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-2', className)}>
      {statsData.map((stat, index) => (
        <StatsCard key={index} {...stat} />
      ))}
    </div>
  )
}

function StatsCard({
  title,
  value,
  color,
  icon: Icon,
}: {
  title: string
  value: number
  color: string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="group flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-2.5 py-2 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-200">
      <div
        className="p-1.5 rounded-lg shrink-0 transition-transform duration-200 group-hover:scale-110"
        style={{ backgroundColor: `${color}15`, color }}
      >
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 truncate">
          {title}
        </p>
        <p className="text-sm font-black text-gray-900 tabular-nums whitespace-nowrap">
          {value.toLocaleString('fr-FR')}
        </p>
      </div>
    </div>
  )
}

function StatisticsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-2">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-2.5 py-2 shadow-sm animate-pulse">
          <Skeleton className="h-7 w-7 rounded-lg shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-2.5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}
