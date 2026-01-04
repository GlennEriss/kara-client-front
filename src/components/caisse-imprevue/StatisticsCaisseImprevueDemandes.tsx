'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Calendar,
  RotateCcw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCaisseImprevueDemandsStats } from '@/hooks/caisse-imprevue/useCaisseImprevueDemands'
import { CaisseImprevueDemandStatus } from '@/types/types'
import type { CaisseImprevueDemandFilters } from '@/types/types'

// Composant pour les statistiques modernes
const StatsCard = ({
  title,
  value,
  subtitle,
  color,
  icon: Icon
}: {
  title: string
  value: number | string
  subtitle?: string
  color: string
  icon: React.ComponentType<any>
}) => {
  return (
    <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-white to-gray-50/50 border-0 shadow-md">
      <CardContent className="p-4">
        <div className="flex items-center space-x-3">
          <div className={`p-2.5 rounded-xl bg-gradient-to-br transition-transform duration-300 group-hover:scale-110`} style={{ backgroundColor: `${color}15`, color: color }}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-600 uppercase tracking-wider">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
            {subtitle && (
              <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Hook personnalisé pour le carousel avec drag/swipe
const useCarousel = (itemCount: number, itemsPerView: number = 1) => {
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

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX)
    const handleMouseUp = () => handleEnd()
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) handleMove(e.touches[0].clientX)
    }
    const handleTouchEnd = () => handleEnd()

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      window.addEventListener('touchmove', handleTouchMove)
      window.addEventListener('touchend', handleTouchEnd)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isDragging, translateX, currentIndex])

  return {
    currentIndex,
    translateX,
    goNext,
    goPrev,
    goTo,
    containerRef,
    handleStart,
    maxIndex,
  }
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
    {
      title: 'Total',
      value: stats.total,
      subtitle: 'Demandes totales',
      color: '#234D65',
      icon: FileText,
    },
    {
      title: 'En attente',
      value: stats.pending,
      subtitle: 'En attente de décision',
      color: '#f59e0b',
      icon: Clock,
    },
    {
      title: 'Acceptées',
      value: stats.approved,
      subtitle: 'En attente de conversion',
      color: '#10b981',
      icon: CheckCircle,
    },
    {
      title: 'Refusées',
      value: stats.rejected,
      subtitle: 'Demandes refusées',
      color: '#ef4444',
      icon: XCircle,
    },
    {
      title: 'Converties',
      value: stats.converted,
      subtitle: 'Contrats créés',
      color: '#3b82f6',
      icon: CheckCircle,
    },
    {
      title: 'Réouvertes',
      value: stats.reopened,
      subtitle: 'Demandes réouvertes',
      color: '#8b5cf6',
      icon: RotateCcw,
    },
    {
      title: 'Journalières',
      value: stats.daily,
      subtitle: 'Fréquence DAILY',
      color: '#06b6d4',
      icon: Calendar,
    },
    {
      title: 'Mensuelles',
      value: stats.monthly,
      subtitle: 'Fréquence MONTHLY',
      color: '#6366f1',
      icon: Calendar,
    },
    {
      title: 'Montant total',
      value: `${(stats.totalAmount / 1000).toFixed(0)}k FCFA`,
      subtitle: 'Toutes demandes',
      color: '#059669',
      icon: DollarSign,
    },
    {
      title: 'Montant en attente',
      value: `${(stats.pendingAmount / 1000).toFixed(0)}k FCFA`,
      subtitle: 'Demandes en attente',
      color: '#f59e0b',
      icon: DollarSign,
    },
  ]

  const itemsPerView = typeof window !== 'undefined' 
    ? window.innerWidth >= 1280 ? 4 
    : window.innerWidth >= 1024 ? 3 
    : window.innerWidth >= 768 ? 2 
    : 1 
    : 1

  const carousel = useCarousel(statsItems.length, itemsPerView)

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="bg-gradient-to-br from-white to-gray-50/50 border-0 shadow-md">
            <CardContent className="p-4">
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="relative w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Statistiques des demandes</h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={carousel.goPrev}
            disabled={carousel.currentIndex === 0}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={carousel.goNext}
            disabled={carousel.currentIndex >= carousel.maxIndex}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        ref={carousel.containerRef}
        className="overflow-hidden"
        onMouseDown={(e) => carousel.handleStart(e.clientX)}
        onTouchStart={(e) => e.touches[0] && carousel.handleStart(e.touches[0].clientX)}
      >
        <div
          className="flex transition-transform duration-300 ease-out"
          style={{
            transform: `translateX(${carousel.translateX}%)`,
            width: `${(statsItems.length / itemsPerView) * 100}%`,
          }}
        >
          {statsItems.map((item, index) => (
            <div
              key={index}
              className="flex-shrink-0"
              style={{ width: `${100 / statsItems.length}%` }}
            >
              <StatsCard {...item} />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center gap-1 mt-4">
        {Array.from({ length: carousel.maxIndex + 1 }).map((_, index) => (
          <button
            key={index}
            onClick={() => carousel.goTo(index)}
            className={cn(
              'h-2 rounded-full transition-all duration-300',
              index === carousel.currentIndex
                ? 'w-8 bg-[#234D65]'
                : 'w-2 bg-gray-300 hover:bg-gray-400'
            )}
          />
        ))}
      </div>
    </div>
  )
}

export default StatisticsCaisseImprevueDemandes

