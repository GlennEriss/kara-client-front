'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Users, UserCheck, UserX, Car, Calendar, TrendingUp } from 'lucide-react'
import { useMemberStats } from '@/hooks/useMembers'
import { MEMBERSHIP_TYPE_LABELS } from '@/types/types'

const MemberStats = () => {
  const { data: stats, isLoading, error } = useMemberStats()

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
        <p className="text-red-600 text-sm">
          Erreur lors du chargement des statistiques
        </p>
      </div>
    )
  }

  const statsCards = [
    {
      title: 'Total Membres',
      value: stats.total,
      icon: Users,
      color: 'text-[#224D62]',
      bgColor: 'bg-[#224D62]/10',
      description: 'Membres inscrits'
    },
    {
      title: 'Membres Actifs',
      value: stats.active,
      icon: UserCheck,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      description: `${((stats.active / stats.total) * 100).toFixed(1)}% du total`
    },
    {
      title: 'Membres Inactifs',
      value: stats.inactive,
      icon: UserX,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      description: `${((stats.inactive / stats.total) * 100).toFixed(1)}% du total`
    },
    {
      title: 'Avec Véhicule',
      value: stats.withCar,
      icon: Car,
      color: 'text-[#CBB171]',
      bgColor: 'bg-[#CBB171]/10',
      description: `${((stats.withCar / stats.total) * 100).toFixed(1)}% du total`
    },
    {
      title: 'Nouveaux ce mois',
      value: stats.newThisMonth,
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      description: 'Adhésions récentes'
    },
    {
      title: 'Nouveaux cette année',
      value: stats.newThisYear,
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      description: 'Croissance annuelle'
    }
  ]

  return (
    <div className="space-y-6 mb-8">
      {/* Statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statsCards.map((stat, index) => (
          <Card key={stat.title} className="hover:shadow-md transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-full ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {stat.value.toLocaleString()}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Répartition par type de membre */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-[#224D62] flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Répartition par Type de Membre
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(stats.byMembershipType).map(([type, count]) => {
              const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0
              const colors = {
                adherant: { bg: 'bg-[#224D62]', text: 'text-[#224D62]' },
                bienfaiteur: { bg: 'bg-[#CBB171]', text: 'text-[#CBB171]' },
                sympathisant: { bg: 'bg-green-600', text: 'text-green-600' }
              }
              const color = colors[type as keyof typeof colors]

              return (
                <div key={type} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">
                      {MEMBERSHIP_TYPE_LABELS[type as keyof typeof MEMBERSHIP_TYPE_LABELS]}
                    </span>
                    <span className={`text-sm font-bold ${color.text}`}>
                      {count}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${color.bg} transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    {percentage.toFixed(1)}% du total
                  </p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default MemberStats