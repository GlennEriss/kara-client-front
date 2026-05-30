'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { useCaisseSpecialeDemandsStats } from '@/hooks/caisse-speciale/useCaisseSpecialeDemands'
import {
    CheckCircle,
    Clock,
    FileText,
    XCircle
} from 'lucide-react'
import React from 'react'

// Carte stat horizontale compacte
const StatsCard = ({
  title,
  value,
  color,
  icon: Icon
}: {
  title: string
  value: number | string
  color: string
  icon: React.ComponentType<any>
}) => {
  return (
    <div className="group flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-2.5 py-2 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-200">
      <div
        className="p-1.5 rounded-lg shrink-0 transition-transform duration-200 group-hover:scale-110"
        style={{ backgroundColor: `${color}15`, color: color }}
      >
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 truncate">
          {title}
        </p>
        <p className="text-sm font-black text-gray-900 tabular-nums whitespace-nowrap">
          {value}
        </p>
      </div>
    </div>
  )
}

interface StatisticsCaisseSpecialeDemandesProps {
  // Les statistiques affichent toujours les totaux globaux, pas de filtrage
}

export default function StatisticsCaisseSpecialeDemandes(_props: StatisticsCaisseSpecialeDemandesProps = {}) {
  // Toujours récupérer les stats globales sans filtre
  const { data: stats, isLoading } = useCaisseSpecialeDemandsStats(undefined)

  // Préparer les données de stats
  const statsData = stats ? [
    { title: 'Total', value: stats.total, color: '#234D65', icon: FileText },
    { title: 'En attente', value: stats.pending, color: '#f59e0b', icon: Clock },
    { title: 'Acceptées', value: stats.approved, color: '#10b981', icon: CheckCircle },
    { title: 'Refusées', value: stats.rejected, color: '#ef4444', icon: XCircle },
    { title: 'Converties', value: stats.converted, color: '#8b5cf6', icon: CheckCircle },
  ] : []

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
        {[...Array(5)].map((_, i) => (
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

  if (!stats) return null

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
      {statsData.map((stat, index) => (
        <StatsCard key={index} {...stat} />
      ))}
    </div>
  )
}
