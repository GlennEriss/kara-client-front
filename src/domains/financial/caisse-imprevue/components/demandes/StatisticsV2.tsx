/**
 * Composant StatisticsV2 pour afficher les statistiques des demandes
 * 
 * Utilise le même carousel que memberships avec drag/swipe
 * Stats globales (indépendantes des filtres de statut)
 * 
 * Responsive : Mobile (1 item), Tablette (2-3 items), Desktop (4-5 items)
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ChevronLeft, ChevronRight, BarChart3, Clock, CheckCircle2, XCircle, RotateCcw, Calendar, CalendarDays } from 'lucide-react'
import { useCaisseImprevueDemandsStats } from '../../hooks/useCaisseImprevueDemandsStats'
import type { DemandStats } from '../../entities/demand-filters.types'
import { cn } from '@/lib/utils'

interface StatisticsV2Props {
  filters?: import('../../entities/demand-filters.types').DemandFilters
  className?: string
}

// Hook personnalisé pour le carousel avec drag/swipe (identique à memberships)
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

export function StatisticsV2({ filters, className }: StatisticsV2Props) {
  // ⚠️ Les stats sont globales, le filtre de statut est exclu automatiquement dans le hook
  const { data: stats, isLoading } = useCaisseImprevueDemandsStats(filters)

  const statsData = stats
    ? [
        {
          title: 'Total',
          value: stats.total,
          percentage: 100,
          color: '#6b7280',
          icon: BarChart3,
          trend: 'neutral' as const,
        },
        {
          title: 'En attente',
          value: stats.pending,
          percentage: stats.total > 0 ? (stats.pending / stats.total) * 100 : 0,
          color: '#f59e0b',
          icon: Clock,
          trend: 'up' as const,
        },
        {
          title: 'Acceptées',
          value: stats.approved,
          percentage: stats.total > 0 ? (stats.approved / stats.total) * 100 : 0,
          color: '#10b981',
          icon: CheckCircle2,
          trend: 'up' as const,
        },
        {
          title: 'Refusées',
          value: stats.rejected,
          percentage: stats.total > 0 ? (stats.rejected / stats.total) * 100 : 0,
          color: '#ef4444',
          icon: XCircle,
          trend: 'down' as const,
        },
        {
          title: 'Réouvertes',
          value: stats.reopened,
          percentage: stats.total > 0 ? (stats.reopened / stats.total) * 100 : 0,
          color: '#3b82f6',
          icon: RotateCcw,
          trend: 'neutral' as const,
        },
        {
          title: 'Quotidiennes',
          value: stats.daily,
          percentage: stats.total > 0 ? (stats.daily / stats.total) * 100 : 0,
          color: '#8b5cf6',
          icon: CalendarDays,
          trend: 'neutral' as const,
        },
        {
          title: 'Mensuelles',
          value: stats.monthly,
          percentage: stats.total > 0 ? (stats.monthly / stats.total) * 100 : 0,
          color: '#ec4899',
          icon: Calendar,
          trend: 'neutral' as const,
        },
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

  if (isLoading) {
    return <StatisticsSkeleton />
  }

  if (!stats || statsData.length === 0) {
    return null
  }

  return (
    <div className={cn('relative w-full', className)}>
      {/* Boutons navigation */}
      {canGoPrev && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-white shadow-md hover:bg-gray-100"
          onClick={goPrev}
          data-testid="stats-carousel-prev"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
      )}
      {canGoNext && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-white shadow-md hover:bg-gray-100"
          onClick={goNext}
          data-testid="stats-carousel-next"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      )}

      {/* Carousel */}
      <div className="overflow-hidden">
        <div
          ref={containerRef}
          className="flex transition-transform duration-300 ease-out"
          style={{
            transform: `translateX(${translateX}%)`,
            cursor: isDragging ? 'grabbing' : 'grab',
          }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          data-testid="stats-carousel-container"
        >
          {statsData.map((stat, index) => (
            <div
              key={index}
              className="flex-shrink-0 px-2"
              style={{ width: `${100 / itemsPerView}%` }}
            >
              <StatsCard {...stat} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatsCard({
  title,
  value,
  percentage,
  color,
  icon: Icon,
  trend,
}: {
  title: string
  value: number
  percentage: number
  color: string
  icon: React.ComponentType<{ className?: string }>
  trend: 'up' | 'down' | 'neutral'
}) {
  return (
    <Card className="hover:shadow-lg transition-shadow h-full">
      <CardContent className="p-4 md:p-5 lg:p-6">
        <div className="flex items-center gap-3">
          <div
            className="p-2 md:p-2.5 rounded-lg flex-shrink-0"
            style={{ backgroundColor: `${color}20`, color }}
          >
            <Icon className="w-4 h-4 md:w-5 md:h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs md:text-sm text-kara-neutral-600 font-medium">{title}</p>
            <p className="text-xl md:text-2xl lg:text-3xl font-black text-kara-neutral-900 mt-0.5">
              {value.toLocaleString('fr-FR')}
            </p>
            <p className="text-xs text-kara-neutral-500 mt-1">
              {percentage.toFixed(1)}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function StatisticsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 lg:gap-6">
      {Array.from({ length: 7 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4 md:p-5 lg:p-6">
            <div className="flex items-center gap-3">
              <Skeleton className="w-8 h-8 md:w-10 md:h-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-6 w-12" />
                <Skeleton className="h-2 w-10" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
