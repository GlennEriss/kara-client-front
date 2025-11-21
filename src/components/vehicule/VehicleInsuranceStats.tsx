'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { VehicleInsuranceStats } from '@/types/types'
import { Shield, AlertTriangle, Ban, Car, TrendingUp } from 'lucide-react'
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

interface Props {
  stats?: VehicleInsuranceStats
  isLoading?: boolean
}

const COLORS = ['#234D65', '#2C5A73', '#CBB171', '#F97316', '#EF4444']

export function VehicleInsuranceStats({ stats, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[...Array(4)].map((_, index) => (
          <Card key={index} className="border-0 shadow-md">
            <CardContent className="p-6 space-y-3">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-8 w-1/2" />
              <Skeleton className="h-3 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!stats) return null

  const summaryCards = [
    {
      label: 'Assurés',
      value: stats.totalInsured,
      sublabel: 'Membres possédant un véhicule assuré',
      icon: Shield,
      color: 'text-sky-700',
    },
    {
      label: 'Actifs',
      value: stats.active,
      sublabel: 'Polices valides',
      icon: TrendingUp,
      color: 'text-green-700',
    },
    {
      label: 'Expire bientôt',
      value: stats.expiresSoon,
      sublabel: '< 30 jours',
      icon: AlertTriangle,
      color: 'text-amber-700',
    },
    {
      label: 'Expirées',
      value: stats.expired,
      sublabel: 'À renouveler',
      icon: Ban,
      color: 'text-red-700',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map(card => (
          <Card key={card.label} className="border-0 shadow-md bg-gradient-to-br from-white to-gray-50/60">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-gray-500 font-medium">{card.label}</CardTitle>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900">{card.value}</p>
              <p className="text-sm text-gray-500 mt-1">{card.sublabel}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-gray-800">Répartition par assurance</CardTitle>
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
                <div key={entry.company} className="flex items-center justify-between rounded-lg border p-3">
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

        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-gray-800">Expirations à venir</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.expiringSoonList.length === 0 && <p className="text-sm text-gray-500">Aucune assurance sur le point d’expirer.</p>}
            {stats.expiringSoonList.map(item => (
              <div key={item.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-semibold text-gray-900 flex items-center gap-2">
                    <Car className="h-4 w-4 text-gray-400" />
                    {item.memberFirstName} {item.memberLastName}
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
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

