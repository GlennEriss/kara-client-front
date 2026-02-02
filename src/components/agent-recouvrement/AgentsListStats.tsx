'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Users, UserCheck, UserX, Mars, Venus, Cake } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/utils'
import type { AgentsStats } from '@/types/types'

function useCarousel(itemCount: number, itemsPerView: number = 1) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [startPos, setStartPos] = useState(0)
  const [translateX, setTranslateX] = useState(0)

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
    if (!isDragging) return
    const diff = clientX - startPos
    const percentage = diff * 0.5
    const maxDrag = 30
    const clampedPercentage = Math.max(-maxDrag, Math.min(maxDrag, percentage))
    setTranslateX(-currentIndex * (100 / itemsPerView) + clampedPercentage)
  }
  const handleEnd = () => {
    if (!isDragging) return
    const dragDistance = translateX + currentIndex * (100 / itemsPerView)
    const threshold = 15
    if (dragDistance > threshold && currentIndex > 0) goPrev()
    else if (dragDistance < -threshold && currentIndex < maxIndex) goNext()
    else setTranslateX(-currentIndex * (100 / itemsPerView))
    setIsDragging(false)
  }

  return {
    currentIndex,
    goNext,
    goPrev,
    canGoPrev: currentIndex > 0,
    canGoNext: currentIndex < maxIndex,
    translateX,
    handleMouseDown: (e: React.MouseEvent) => handleStart(e.clientX),
    handleTouchStart: (e: React.TouchEvent) => handleStart(e.touches[0].clientX),
    handleTouchMove: (e: React.TouchEvent) => handleMove(e.touches[0].clientX),
    handleTouchEnd: handleEnd,
    isDragging,
  }
}

function ModernStatsCard({
  title,
  value,
  percentage,
  color,
  icon: Icon,
}: {
  title: string
  value: number
  percentage?: number
  color: string
  icon: React.ComponentType<{ className?: string }>
}) {
  const chartData = [
    { name: 'value', value: percentage || 100, fill: color },
    { name: 'remaining', value: 100 - (percentage || 100), fill: '#f3f4f6' },
  ]

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-white to-gray-50/50 border-0 shadow-md">
      <CardContent className="p-4 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${color}15`, color }}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600 uppercase tracking-wider">{title}</p>
              <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
            </div>
          </div>
          <div className="w-12 h-12">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} cx="50%" cy="50%" innerRadius={16} outerRadius={22} dataKey="value" strokeWidth={0}>
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

interface AgentsListStatsProps {
  stats: AgentsStats | undefined
  isLoading?: boolean
}

export function AgentsListStats({ stats, isLoading }: AgentsListStatsProps) {
  const statsData = stats
    ? [
        { title: 'Total', value: stats.total, percentage: 100, color: '#6b7280', icon: Users },
        { title: 'Actifs', value: stats.actifs, percentage: stats.total ? (stats.actifs / stats.total) * 100 : 0, color: '#10b981', icon: UserCheck },
        { title: 'Inactifs', value: stats.inactifs, percentage: stats.total ? (stats.inactifs / stats.total) * 100 : 0, color: '#ef4444', icon: UserX },
        { title: 'Hommes', value: stats.hommes, percentage: stats.total ? (stats.hommes / stats.total) * 100 : 0, color: '#3b82f6', icon: Mars },
        { title: 'Femmes', value: stats.femmes, percentage: stats.total ? (stats.femmes / stats.total) * 100 : 0, color: '#ec4899', icon: Venus },
        { title: 'Anniv. mois', value: stats.anniversairesMois, percentage: stats.actifs ? (stats.anniversairesMois / stats.actifs) * 100 : 0, color: '#f59e0b', icon: Cake },
      ]
    : []

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

  const carousel = useCarousel(statsData.length, itemsPerView)

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-gray-200 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  if (statsData.length === 0) return null

  return (
    <div className="relative">
      <div className="absolute top-1/2 -translate-y-1/2 left-0 z-10">
        <Button
          variant="outline"
          size="icon"
          className={cn('h-10 w-10 rounded-full bg-white/90 backdrop-blur-sm shadow-lg border-0', carousel.canGoPrev ? '' : 'opacity-50 cursor-not-allowed')}
          onClick={carousel.goPrev}
          disabled={!carousel.canGoPrev}
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
      </div>
      <div className="absolute top-1/2 -translate-y-1/2 right-0 z-10">
        <Button
          variant="outline"
          size="icon"
          className={cn('h-10 w-10 rounded-full bg-white/90 backdrop-blur-sm shadow-lg border-0', carousel.canGoNext ? '' : 'opacity-50 cursor-not-allowed')}
          onClick={carousel.goNext}
          disabled={!carousel.canGoNext}
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>
      <div
        className="overflow-hidden px-12 py-2"
        onMouseDown={carousel.handleMouseDown}
        onTouchStart={carousel.handleTouchStart}
        onTouchMove={carousel.handleTouchMove}
        onTouchEnd={carousel.handleTouchEnd}
      >
        <div
          className={cn('flex transition-transform duration-300 ease-out gap-4', carousel.isDragging && 'transition-none')}
          style={{ transform: `translateX(${carousel.translateX}%)`, cursor: carousel.isDragging ? 'grabbing' : 'grab' }}
        >
          {statsData.map((stat, index) => (
            <div key={index} className="shrink-0" style={{ width: `calc(${100 / itemsPerView}% - ${(1 * (itemsPerView - 1)) / itemsPerView}rem)` }}>
              <ModernStatsCard {...stat} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
