'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { VehicleInsuranceStats } from '@/types/types'
import { AlertTriangle, Ban, Car, Shield, TrendingUp, User, Users } from 'lucide-react'
import { useMemo } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'

interface Props {
  stats?: VehicleInsuranceStats
  isLoading?: boolean
}

const COLORS = ['#234D65', '#2C5A73', '#CBB171', '#F97316', '#EF4444']

const formatNumber = (value: number | undefined) =>
  new Intl.NumberFormat('fr-FR').format(value ?? 0)

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

export function VehicleInsuranceStats({ stats, isLoading }: Props) {
  const statsData = useMemo(
    () => stats ? [
      { title: 'Assurés', value: formatNumber(stats.totalInsured), color: '#234D65', icon: Shield },
      { title: 'Actifs', value: formatNumber(stats.active), color: '#10b981', icon: TrendingUp },
      { title: 'Expire bientôt', value: formatNumber(stats.expiresSoon), color: '#f59e0b', icon: AlertTriangle },
      { title: 'Expirées', value: formatNumber(stats.expired), color: '#ef4444', icon: Ban },
      { title: 'Membres assurés', value: formatNumber(stats.membersCount), color: '#2563eb', icon: Users },
      { title: 'Non-membres', value: formatNumber(stats.nonMembersCount), color: '#475569', icon: User },
    ] : [],
    [stats]
  )

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-6 gap-2">
        {[...Array(6)].map((_, i) => (
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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-6 gap-2">
        {statsData.map((card, index) => (
          <StatsCard key={index} {...card} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-800">
              <Shield className="h-4 w-4 text-[#234D65]" />
              Répartition par assurance
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="h-60 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.byCompany} dataKey="count" nameKey="company" cx="50%" cy="50%" outerRadius={90} label>
                    {stats.byCompany.map((entry, index) => (
                      <Cell key={`company-${entry.company}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 flex-1">
              {stats.byCompany.map((entry, index) => (
                <div key={entry.company} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <div className="flex items-center gap-3">
                    <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="font-medium text-gray-700">{entry.company}</span>
                  </div>
                  <span className="text-sm text-gray-500">{entry.count} polices</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-800">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Expirations à venir
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.expiringSoonList.length === 0 && <p className="text-sm text-gray-500">Aucune assurance sur le point d’expirer.</p>}
            {stats.expiringSoonList.map(item => {
              const holderFirstName = item.holderType === 'member' ? item.memberFirstName : item.nonMemberFirstName
              const holderLastName = item.holderType === 'member' ? item.memberLastName : item.nonMemberLastName
              return (
                <div key={item.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <div>
                    <p className="font-semibold text-gray-900 flex items-center gap-2">
                      <Car className="h-4 w-4 text-gray-400" />
                      {holderFirstName} {holderLastName}
                    </p>
                    <p className="text-sm text-gray-500">
                      {item.insuranceCompany} • {item.policyNumber}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-800">{item.endDate.toLocaleDateString('fr-FR')}</p>
                    <p className="text-xs text-gray-500">Fin de validité</p>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

