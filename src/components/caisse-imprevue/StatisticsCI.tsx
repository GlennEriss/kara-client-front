'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useContractsCI, useContractsCIStats } from '@/hooks/caisse-imprevue/useContractsCI'
import { ContractsCIFilters } from '@/repositories/caisse-imprevu/IContractCIRepository'
import { CaisseImprevuePaymentFrequency } from '@/types/types'
import {
    CheckCircle,
    Clock,
    DollarSign,
    FileText,
    XCircle
} from 'lucide-react'
import React, { useMemo } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'

// Carte stat horizontale compacte
const StatsCard = ({
  title,
  value,
  color,
  icon: Icon,
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

interface StatisticsCIProps {
  paymentFrequency?: CaisseImprevuePaymentFrequency
}

const COLORS = ['#234D65', '#2C5A73', '#CBB171', '#F97316', '#EF4444']

const PAYMENT_FREQUENCY_LABELS: Record<CaisseImprevuePaymentFrequency, string> = {
  DAILY: 'Quotidien',
  MONTHLY: 'Mensuel',
}

export default function StatisticsCI({ paymentFrequency }: StatisticsCIProps = {}) {
  const filters: ContractsCIFilters | undefined = paymentFrequency 
    ? { paymentFrequency }
    : undefined
  
  const { data: stats, isLoading } = useContractsCIStats(filters)
  // Récupérer tous les contrats pour calculer la répartition par type
  const { data: allContracts } = useContractsCI()

  // Préparer les données de stats (même si vide pour éviter les erreurs)
  const statsData = stats ? [
    {
      title: 'Total',
      value: stats.total,
      color: '#234D65',
      icon: FileText,
    },
    {
      title: 'Montant Total',
      value: new Intl.NumberFormat('fr-FR').format(stats.totalAmount || 0),
      color: '#CBB171',
      icon: DollarSign,
    },
    {
      title: 'En cours',
      value: stats.active,
      color: '#10b981',
      icon: CheckCircle,
    },
    {
      title: 'Terminés',
      value: stats.finished,
      color: '#3b82f6',
      icon: Clock,
    },
    {
      title: 'Résiliés',
      value: stats.canceled,
      color: '#ef4444',
      icon: XCircle,
    },
  ] : []

  // Calculer la répartition par type de paiement (AVANT les retours conditionnels)
  const byPaymentFrequency = useMemo(() => {
    if (!allContracts || allContracts.length === 0) return []
    
    const daily = allContracts.filter(c => c.paymentFrequency === 'DAILY').length
    const monthly = allContracts.filter(c => c.paymentFrequency === 'MONTHLY').length
    
    const result = []
    if (daily > 0) {
      result.push({ type: 'DAILY', label: PAYMENT_FREQUENCY_LABELS.DAILY, count: daily })
    }
    if (monthly > 0) {
      result.push({ type: 'MONTHLY', label: PAYMENT_FREQUENCY_LABELS.MONTHLY, count: monthly })
    }
    
    return result
  }, [allContracts])

  // Retours anticipés APRÈS tous les hooks
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
    <div className="space-y-6">
      {/* Grille responsive */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
        {statsData.map((stat, index) => (
          <StatsCard key={index} {...stat} />
        ))}
      </div>

      {/* Diagramme circulaire par type de paiement */}
      {byPaymentFrequency.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-gray-800">Répartition par type de caisse</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="h-60 flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={byPaymentFrequency} 
                        dataKey="count" 
                        nameKey="label" 
                        cx="50%" 
                        cy="50%" 
                        outerRadius={90} 
                        label
                      >
                        {byPaymentFrequency.map((entry, index) => (
                          <Cell key={`frequency-${entry.type}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 flex-1">
                  {byPaymentFrequency.map((entry, _index) => (
                    <div key={entry.type} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-3">
                        <span 
                          className="inline-block h-2 w-2 rounded-full" 
                          style={{ backgroundColor: COLORS[_index % COLORS.length] }} 
                        />
                        <span className="font-medium text-gray-700">{entry.label}</span>
                      </div>
                      <span className="text-sm text-gray-500">{entry.count} contrat{entry.count > 1 ? 's' : ''}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
