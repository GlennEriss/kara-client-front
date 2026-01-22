'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Users, UserCheck, Clock, Mars, Venus, TrendingUp } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/utils'
import type { MembershipStats } from '../../services/MembershipsListService'

// Hook personnalisé pour le carousel avec drag/swipe
function useCarousel(itemCount: number, itemsPerView: number = 1) {
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
    const maxDrag = 30
    const clampedPercentage = Math.max(-maxDrag, Math.min(maxDrag, percentage))
    setTranslateX(-currentIndex * (100 / itemsPerView) + clampedPercentage)
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

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    handleStart(e.clientX)
  }
  const handleTouchStart = (e: React.TouchEvent) => {
    handleStart(e.touches[0].clientX)
  }
  const handleTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX)
  }
  const handleTouchEnd = () => {
    handleEnd()
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
    goTo,
    goNext,
    goPrev,
    canGoPrev: currentIndex > 0,
    canGoNext: currentIndex < maxIndex,
    translateX,
    containerRef,
    handleMouseDown,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    isDragging,
  }
}

// Composant pour les statistiques modernes
export function ModernStatsCard({
  title,
  value,
  subtitle,
  percentage,
  color,
  icon: Icon,
  trend = 'up',
  data = [],
}: {
  title: string
  value: number
  subtitle?: string
  percentage?: number
  color: string
  icon: React.ComponentType<any>
  trend?: 'up' | 'down' | 'neutral'
  data?: Array<{ name: string; value: number; fill: string }>
}) {
  const chartData =
    data.length > 0
      ? data
      : [
          { name: 'value', value: percentage || 75, fill: color },
          { name: 'remaining', value: 100 - (percentage || 75), fill: '#f3f4f6' },
        ]

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-white to-gray-50/50 border-0 shadow-md">
      <CardContent className="p-4 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div
              className="p-2.5 rounded-xl transition-transform duration-300 group-hover:scale-110"
              style={{
                backgroundColor: `${color}15`,
                color: color,
              }}
            >
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600 uppercase tracking-wider">{title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
                {trend !== 'neutral' && percentage && (
                  <div
                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      trend === 'up'
                        ? 'bg-green-100 text-green-700'
                        : trend === 'down'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    <TrendingUp className={`w-3 h-3 ${trend === 'down' ? 'rotate-180' : ''}`} />
                    {percentage.toFixed(0)}%
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="w-12 h-12">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={16}
                  outerRadius={22}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {chartData.map((entry, index) => (
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

// Composant Carrousel des statistiques avec drag/swipe
interface MembershipsListStatsProps {
  stats: MembershipStats
}

export function MembershipsListStats({ stats }: MembershipsListStatsProps) {
  const statsData = [
    {
      title: 'Total',
      value: stats.total,
      percentage: 100,
      color: '#6b7280',
      icon: Users,
      trend: 'up' as const,
    },
    {
      title: 'Actifs',
      value: stats.active,
      percentage: stats.activePercentage,
      color: '#10b981',
      icon: UserCheck,
      trend: 'up' as const,
    },
    {
      title: 'Expirés',
      value: stats.expired,
      percentage: stats.expiredPercentage,
      color: '#ef4444',
      icon: Clock,
      trend: (stats.expiredPercentage > 20 ? 'up' : 'neutral') as 'up' | 'down' | 'neutral',
    },
    {
      title: 'Hommes',
      value: stats.men,
      percentage: stats.menPercentage,
      color: '#3b82f6',
      icon: Mars,
      trend: 'neutral' as const,
    },
    {
      title: 'Femmes',
      value: stats.women,
      percentage: stats.womenPercentage,
      color: '#ec4899',
      icon: Venus,
      trend: 'neutral' as const,
    },
  ]

  const [itemsPerView, setItemsPerView] = useState(1)
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth
      if (w >= 1280) setItemsPerView(5)
      else if (w >= 1024) setItemsPerView(4)
      else if (w >= 768) setItemsPerView(3)
      else setItemsPerView(1)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const {
    currentIndex,
    goNext,
    goPrev,
    canGoPrev,
    canGoNext,
    translateX,
    containerRef,
    handleMouseDown,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    isDragging,
  } = useCarousel(statsData.length, itemsPerView)

  return (
    <div className="relative">
      <div className="absolute top-1/2 -translate-y-1/2 left-0 z-10">
        <Button
          variant="outline"
          size="icon"
          className={cn(
            'h-10 w-10 rounded-full bg-white/90 backdrop-blur-sm shadow-lg border-0 transition-all duration-300',
            canGoPrev
              ? 'hover:bg-white hover:scale-110 text-gray-700'
              : 'opacity-50 cursor-not-allowed',
          )}
          onClick={goPrev}
          disabled={!canGoPrev}
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
      </div>
      <div className="absolute top-1/2 -translate-y-1/2 right-0 z-10">
        <Button
          variant="outline"
          size="icon"
          className={cn(
            'h-10 w-10 rounded-full bg-white/90 backdrop-blur-sm shadow-lg border-0 transition-all duration-300',
            canGoNext
              ? 'hover:bg-white hover:scale-110 text-gray-700'
              : 'opacity-50 cursor-not-allowed',
          )}
          onClick={goNext}
          disabled={!canGoNext}
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      <div
        ref={containerRef}
        className="overflow-hidden px-12 py-2"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className={cn(
            'flex transition-transform duration-300 ease-out gap-4',
            isDragging && 'transition-none',
          )}
          style={{ transform: `translateX(${translateX}%)`, cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          {statsData.map((stat, index) => (
            <div
              key={index}
              className="shrink-0"
              style={{
                width: `calc(${100 / itemsPerView}% - ${(1 * (itemsPerView - 1)) / itemsPerView}rem)`,
              }}
            >
              <ModernStatsCard {...stat} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
