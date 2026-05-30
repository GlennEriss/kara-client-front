'use client'

import type { AgentsStats } from '@/types/types'
import { Cake, Mars, UserCheck, Users, UserX, Venus } from 'lucide-react'

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

interface AgentsListStatsProps {
  stats: AgentsStats | undefined
  isLoading?: boolean
}

export function AgentsListStats({ stats, isLoading }: AgentsListStatsProps) {
  const statsData = stats
    ? [
        { title: 'Total', value: stats.total, color: '#234D65', icon: Users },
        { title: 'Actifs', value: stats.actifs, color: '#10b981', icon: UserCheck },
        { title: 'Inactifs', value: stats.inactifs, color: '#ef4444', icon: UserX },
        { title: 'Hommes', value: stats.hommes, color: '#3b82f6', icon: Mars },
        { title: 'Femmes', value: stats.femmes, color: '#ec4899', icon: Venus },
        { title: 'Anniv. mois', value: stats.anniversairesMois, color: '#f59e0b', icon: Cake },
      ]
    : []

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-6 gap-2">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-12 rounded-xl border border-gray-100 bg-gray-100 animate-pulse" />
        ))}
      </div>
    )
  }

  if (statsData.length === 0) return null

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-6 gap-2">
      {statsData.map((stat, index) => (
        <StatsCard key={index} {...stat} />
      ))}
    </div>
  )
}
