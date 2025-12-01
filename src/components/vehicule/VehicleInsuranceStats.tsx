'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { VehicleInsuranceStats } from '@/types/types'
import { Shield, AlertTriangle, Ban, Car, TrendingUp, User, Users, ChevronLeft, ChevronRight } from 'lucide-react'
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { cn } from '@/lib/utils'

interface Props {
  stats?: VehicleInsuranceStats
  isLoading?: boolean
}

const COLORS = ['#234D65', '#2C5A73', '#CBB171', '#F97316', '#EF4444']

type Trend = 'up' | 'down' | 'neutral'

const formatNumber = (value: number | undefined) =>
  new Intl.NumberFormat('fr-FR').format(value ?? 0)

const clampPercentage = (value: number) => Math.max(0, Math.min(100, value))

const StatsCard = ({
  title,
  value,
  subtitle,
  percentage,
  color,
  icon: Icon,
  trend = 'neutral'
}: {
  title: string
  value: number | string
  subtitle?: string
  percentage: number
  color: string
  icon: React.ComponentType<any>
  trend?: Trend
}) => {
  const gaugeData = [
    { name: 'value', value: clampPercentage(percentage), fill: color },
    { name: 'remaining', value: 100 - clampPercentage(percentage), fill: '#e5e7eb' }
  ]

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-white to-gray-50/60 border-0 shadow-md">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="p-2.5 rounded-xl transition-transform duration-300 group-hover:scale-110"
              style={{ backgroundColor: `${color}20`, color }}
            >
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {title}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <span
                  className={cn(
                    'text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1',
                    trend === 'up' && 'bg-green-100 text-green-700',
                    trend === 'down' && 'bg-red-100 text-red-700',
                    trend === 'neutral' && 'bg-gray-100 text-gray-600'
                  )}
                >
                  <TrendingUp className={cn('w-3 h-3', trend === 'down' && 'rotate-180')} />
                  {clampPercentage(percentage).toFixed(0)}%
                </span>
              </div>
              {subtitle && (
                <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
              )}
            </div>
          </div>
          <div className="w-12 h-12">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={gaugeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={16}
                  outerRadius={22}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {gaugeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const useCarousel = (itemCount: number, itemsPerView: number) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [startPos, setStartPos] = useState(0)
  const [translateX, setTranslateX] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const maxIndex = Math.max(0, itemCount - itemsPerView)

  const goTo = (index: number) => {
    const clampedIndex = Math.max(0, Math.min(index, maxIndex))
    setCurrentIndex(clampedIndex)
    setTranslateX(-clampedIndex * (100 / itemsPerView))
  }

  const goNext = () => goTo(currentIndex + 1)
  const goPrev = () => goTo(currentIndex - 1)

  const handleStart = (clientX: number) => {
    setIsDragging(true)
    setStartPos(clientX)
  }

  const handleMove = (clientX: number) => {
    if (!isDragging || !containerRef.current) return
    const diff = clientX - startPos
    const containerWidth = containerRef.current.offsetWidth
    const percentage = (diff / containerWidth) * 100
    const clamped = Math.max(-30, Math.min(30, percentage))
    setTranslateX(-currentIndex * (100 / itemsPerView) + clamped)
  }

  const handleEnd = () => {
    if (!isDragging || !containerRef.current) return
    const dragDistance = translateX + currentIndex * (100 / itemsPerView)
    const threshold = 15
    if (dragDistance > threshold && currentIndex > 0) {
      goPrev()
    } else if (dragDistance < -threshold && currentIndex < maxIndex) {
      goNext()
    } else {
      setTranslateX(-currentIndex * (100 / itemsPerView))
    }
    setIsDragging(false)
  }

  useEffect(() => {
    if (!isDragging) return
    const handleGlobalMouseMove = (e: MouseEvent) => handleMove(e.clientX)
    const handleGlobalMouseUp = () => handleEnd()
    document.addEventListener('mousemove', handleGlobalMouseMove)
    document.addEventListener('mouseup', handleGlobalMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove)
      document.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [isDragging, startPos, currentIndex, itemsPerView, translateX])

  return {
    currentIndex,
    goNext,
    goPrev,
    canGoPrev: currentIndex > 0,
    canGoNext: currentIndex < maxIndex,
    translateX,
    containerRef,
    handleTouchStart: (e: React.TouchEvent) => handleStart(e.touches[0].clientX),
    handleTouchMove: (e: React.TouchEvent) => handleMove(e.touches[0].clientX),
    handleTouchEnd: () => handleEnd(),
    isDragging
  }
}

export function VehicleInsuranceStats({ stats, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse bg-gradient-to-br from-white to-gray-50/60 border-0 shadow-md">
            <CardContent className="p-4 space-y-3">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-3 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!stats) return null

  const total = stats.totalInsured || 0
  const ratio = (value: number) => (total ? clampPercentage((value / total) * 100) : 0)

  const statsData = useMemo(
    () => [
      {
        title: 'Assurés',
        value: formatNumber(stats.totalInsured),
        subtitle: 'Dossiers suivis',
        percentage: 100,
        color: '#234D65',
        icon: Shield,
        trend: 'neutral' as Trend
      },
      {
        title: 'Actifs',
        value: formatNumber(stats.active),
        subtitle: 'Polices valides',
        percentage: ratio(stats.active),
        color: '#10b981',
        icon: TrendingUp,
        trend: 'up' as Trend
      },
      {
        title: 'Expire bientôt',
        value: formatNumber(stats.expiresSoon),
        subtitle: '< 30 jours',
        percentage: ratio(stats.expiresSoon),
        color: '#f59e0b',
        icon: AlertTriangle,
        trend: 'neutral' as Trend
      },
      {
        title: 'Expirées',
        value: formatNumber(stats.expired),
        subtitle: 'À relancer',
        percentage: ratio(stats.expired),
        color: '#ef4444',
        icon: Ban,
        trend: 'down' as Trend
      },
      {
        title: 'Membres assurés',
        value: formatNumber(stats.membersCount),
        subtitle: 'Titulaire KARA',
        percentage: ratio(stats.membersCount || 0),
        color: '#2563eb',
        icon: Users,
        trend: 'neutral' as Trend
      },
      {
        title: 'Non-membres',
        value: formatNumber(stats.nonMembersCount),
        subtitle: 'Titulaire externe',
        percentage: ratio(stats.nonMembersCount || 0),
        color: '#475569',
        icon: User,
        trend: 'neutral' as Trend
      }
    ],
    [stats]
  )

  const [itemsPerView, setItemsPerView] = useState(1)

  useEffect(() => {
    const updateItemsPerView = () => {
      const width = window.innerWidth
      if (width >= 1280) setItemsPerView(4)
      else if (width >= 1024) setItemsPerView(3)
      else if (width >= 768) setItemsPerView(2)
      else setItemsPerView(1)
    }
    updateItemsPerView()
    window.addEventListener('resize', updateItemsPerView)
    return () => window.removeEventListener('resize', updateItemsPerView)
  }, [])

  const {
    canGoNext,
    canGoPrev,
    goNext,
    goPrev,
    translateX,
    containerRef,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    isDragging
  } = useCarousel(statsData.length, itemsPerView)

  return (
    <div className="space-y-6">
      <div className="relative">
        <div className="absolute top-1/2 -translate-y-1/2 left-0 z-10">
          <Button
            variant="outline"
            size="icon"
            onClick={goPrev}
            disabled={!canGoPrev}
            className={cn(
              'h-10 w-10 rounded-full bg-white/90 backdrop-blur-sm shadow-lg border-0 transition-all duration-300',
              canGoPrev ? 'hover:bg-white hover:scale-110 text-gray-700' : 'opacity-40 cursor-not-allowed'
            )}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </div>
        <div className="absolute top-1/2 -translate-y-1/2 right-0 z-10">
          <Button
            variant="outline"
            size="icon"
            onClick={goNext}
            disabled={!canGoNext}
            className={cn(
              'h-10 w-10 rounded-full bg-white/90 backdrop-blur-sm shadow-lg border-0 transition-all duration-300',
              canGoNext ? 'hover:bg-white hover:scale-110 text-gray-700' : 'opacity-40 cursor-not-allowed'
            )}
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        <div
          ref={containerRef}
          className="ml-8 overflow-hidden py-2"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className={cn('flex gap-4 transition-transform duration-300 ease-out', isDragging && 'transition-none')}
            style={{ transform: `translateX(${translateX}%)`, cursor: isDragging ? 'grabbing' : 'grab' }}
          >
            {statsData.map((card, index) => (
              <div
                key={index}
                className="flex-shrink-0"
                style={{ width: `calc(${100 / itemsPerView}% - ${(4 * (itemsPerView - 1)) / itemsPerView}rem)` }}
              >
                <StatsCard {...card} />
              </div>
            ))}
          </div>
        </div>
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
            {stats.expiringSoonList.map(item => {
              const holderFirstName = item.holderType === 'member' ? item.memberFirstName : item.nonMemberFirstName
              const holderLastName = item.holderType === 'member' ? item.memberLastName : item.nonMemberLastName
              return (
                <div key={item.id} className="flex items-center justify-between rounded-lg border p-3">
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

