'use client'

import { CharityGlobalStats } from '@/types/types'
import { Calendar, Clock, TrendingUp, Users } from 'lucide-react'

interface CharityStatsCardsProps {
  stats: CharityGlobalStats
}

// Carte stat horizontale compacte
function StatsCard({
  title,
  value,
  color,
  icon: Icon,
}: {
  title: string
  value: string
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
          {value}
        </p>
      </div>
    </div>
  )
}

export default function CharityStatsCards({ stats }: CharityStatsCardsProps) {
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount)
  }

  const formatDate = (date: Date | undefined | null) => {
    if (!date) return 'Date non définie'
    try {
      const dateObj = date instanceof Date ? date : new Date(date)
      if (isNaN(dateObj.getTime())) {
        return 'Date invalide'
      }
      return new Intl.DateTimeFormat('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }).format(dateObj)
    } catch (error) {
      console.error('Error formatting date:', error, date)
      return 'Date invalide'
    }
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-2">
      <StatsCard
        title="Évènements (année)"
        value={String(stats.totalEventsThisYear)}
        color="#0891b2"
        icon={Calendar}
      />
      <StatsCard
        title="Montant collecté"
        value={`${formatAmount(stats.totalCollectedAmount)} FCFA`}
        color="#10b981"
        icon={TrendingUp}
      />
      <StatsCard
        title="Total participants"
        value={String(stats.totalParticipants)}
        color="#8b5cf6"
        icon={Users}
      />
      <StatsCard
        title="Prochain évènement"
        value={
          stats.nextUpcomingEvent
            ? formatDate(stats.nextUpcomingEvent.startDate)
            : 'Aucun'
        }
        color="#f59e0b"
        icon={Clock}
      />
    </div>
  )
}
