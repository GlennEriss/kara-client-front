'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { useCreditContractsStats } from '@/hooks/useCreditSpeciale'
import { StatsBreakdownBar } from '@/components/ui/stats-breakdown-bar'
import type { CreditContractFilters } from '@/repositories/credit-speciale/ICreditContractRepository'
import { CreditContractStatus, CreditType } from '@/types/types'
import {
    AlertCircle,
    Ban,
    CheckCircle,
    Clock,
    DollarSign,
    FileText
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

interface StatisticsCreditContratsProps {
  status?: CreditContractStatus | 'all'
  overdueOnly?: boolean
  creditType?: CreditType | 'all'
}

export default function StatisticsCreditContrats({ status, overdueOnly, creditType }: StatisticsCreditContratsProps = {}) {
  const filters: CreditContractFilters = {}

  if (status && status !== 'all') {
    filters.status = status
  }
  if (overdueOnly) {
    filters.overdueOnly = true
  }
  if (creditType && creditType !== 'all') {
    filters.creditType = creditType
  }

  const hasFilters = Object.keys(filters).length > 0

  const { data: stats, isLoading } = useCreditContractsStats(hasFilters ? filters : undefined)

  // Préparer les données de stats
  const statsData = stats ? [
    {
      title: 'Total',
      value: stats.total,
      color: '#234D65',
      icon: FileText
    },
    {
      title: 'Actifs',
      value: stats.active,
      color: '#10b981',
      icon: CheckCircle
    },
    {
      title: 'En retard',
      value: stats.overdue,
      color: '#f59e0b',
      icon: AlertCircle
    },
    {
      title: 'Partiels',
      value: stats.partial,
      color: '#3b82f6',
      icon: Clock
    },
    {
      title: 'Montant restant',
      value: Math.round(stats.totalRemaining).toLocaleString('fr-FR'),
      color: '#ef4444',
      icon: DollarSign
    },
    {
      title: 'Pénalités',
      value: stats.totalPenalties.toLocaleString('fr-FR'),
      color: '#dc2626',
      icon: Ban
    },
    {
      title: 'Transformés',
      value: stats.transformed,
      // Magenta plutôt que violet : le violet d'origine était indiscernable du
      // bleu « Partiels » pour un daltonien (ΔE 1.3 en deutéranopie).
      color: '#e87ba4',
      icon: FileText
    },
    {
      title: 'Déchargés',
      value: stats.discharged,
      // Violet plutôt qu'un second vert, trop proche de « Actifs ».
      color: '#7c3aed',
      icon: CheckCircle
    },
  ] : []

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-2">
        {[...Array(8)].map((_, i) => (
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

  // Répartition par statut. Les montants (restant, pénalités) sont exclus : ils
  // ne sont pas des parts d'un même tout et fausseraient la lecture.
  const breakdown = [
    { label: 'Actifs', value: stats.active, color: '#10b981' },
    { label: 'En retard', value: stats.overdue, color: '#f59e0b' },
    { label: 'Partiels', value: stats.partial, color: '#3b82f6' },
    { label: 'Transformés', value: stats.transformed, color: '#e87ba4' },
    { label: 'Déchargés', value: stats.discharged, color: '#7c3aed' },
  ]

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-2">
        {statsData.map((stat, index) => (
          <StatsCard key={index} {...stat} />
        ))}
      </div>

      <div className="rounded-xl border border-gray-100 bg-white px-3 py-2.5 shadow-sm">
        <StatsBreakdownBar title="Répartition des contrats par statut" segments={breakdown} />
      </div>
    </div>
  )
}
