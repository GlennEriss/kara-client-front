'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { useCaisseImprevueDemandsStats } from '@/hooks/caisse-imprevue/useCaisseImprevueDemands'
import {
    Calendar,
    CheckCircle,
    Clock,
    DollarSign,
    FileText,
    RotateCcw,
    XCircle,
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

const StatisticsCaisseImprevueDemandes = () => {
  const { data: statsData, isLoading } = useCaisseImprevueDemandsStats({})

  const stats = React.useMemo(() => {
    if (statsData) {
      return {
        total: statsData.total,
        pending: statsData.pending,
        approved: statsData.approved,
        rejected: statsData.rejected,
        converted: statsData.converted,
        reopened: statsData.reopened,
        daily: statsData.daily,
        monthly: statsData.monthly,
        totalAmount: statsData.totalAmount,
        pendingAmount: statsData.pendingAmount,
      }
    }
    return {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      converted: 0,
      reopened: 0,
      daily: 0,
      monthly: 0,
      totalAmount: 0,
      pendingAmount: 0,
    }
  }, [statsData])

  const statsItems = [
    { title: 'Total', value: stats.total, color: '#234D65', icon: FileText },
    { title: 'En attente', value: stats.pending, color: '#f59e0b', icon: Clock },
    { title: 'Acceptées', value: stats.approved, color: '#10b981', icon: CheckCircle },
    { title: 'Refusées', value: stats.rejected, color: '#ef4444', icon: XCircle },
    { title: 'Converties', value: stats.converted, color: '#3b82f6', icon: CheckCircle },
    { title: 'Réouvertes', value: stats.reopened, color: '#8b5cf6', icon: RotateCcw },
    { title: 'Journalières', value: stats.daily, color: '#06b6d4', icon: Calendar },
    { title: 'Mensuelles', value: stats.monthly, color: '#6366f1', icon: Calendar },
    {
      title: 'Montant total',
      value: new Intl.NumberFormat('fr-FR').format(stats.totalAmount),
      color: '#059669',
      icon: DollarSign
    },
    {
      title: 'Montant en attente',
      value: new Intl.NumberFormat('fr-FR').format(stats.pendingAmount),
      color: '#CBB171',
      icon: DollarSign
    },
  ]

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-2">
        {[...Array(10)].map((_, i) => (
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

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-2">
      {statsItems.map((item, index) => (
        <StatsCard key={index} {...item} />
      ))}
    </div>
  )
}

export default StatisticsCaisseImprevueDemandes
