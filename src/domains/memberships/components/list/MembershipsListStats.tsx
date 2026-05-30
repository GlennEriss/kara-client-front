'use client'

import { Clock, Mars, UserCheck, Users, Venus } from 'lucide-react'
import type { MembershipStatsV2 } from '../../services/MembershipStatsService'

// Carte stat horizontale compacte (exportée pour usage externe)
export function ModernStatsCard({
  title,
  value,
  color,
  icon: Icon,
}: {
  title: string
  value: number
  color: string
  icon: React.ComponentType<any>
  // Props legacy conservés pour compatibilité (ignorés)
  subtitle?: string
  percentage?: number
  trend?: 'up' | 'down' | 'neutral'
  data?: Array<{ name: string; value: number; fill: string }>
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

interface MembershipsListStatsProps {
  stats: MembershipStatsV2
}

export function MembershipsListStats({ stats }: MembershipsListStatsProps) {
  const statsData = [
    { title: 'Total', value: stats.total, color: '#234D65', icon: Users },
    { title: 'Actifs', value: stats.active, color: '#10b981', icon: UserCheck },
    { title: 'Expirés', value: stats.expired, color: '#ef4444', icon: Clock },
    { title: 'Hommes', value: stats.men, color: '#3b82f6', icon: Mars },
    { title: 'Femmes', value: stats.women, color: '#ec4899', icon: Venus },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
      {statsData.map((stat, index) => (
        <ModernStatsCard key={index} {...stat} />
      ))}
    </div>
  )
}
