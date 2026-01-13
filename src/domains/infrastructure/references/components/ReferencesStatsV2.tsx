'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Building2, Briefcase } from 'lucide-react'
import { StatsCard } from '@/components/ui/stats-card'
import { useCarousel } from '@/hooks/ui/useCarousel'

interface ReferencesStatsV2Props {
  stats: {
    companiesCount: number
    professionsCount: number
  }
  onStatClick?: (tabValue: string) => void
}

/**
 * ReferencesStatsV2 - Composant de statistiques pour le module Métiers
 * Design cohérent avec GeographyStatsV2, couleurs KARA
 */
export default function ReferencesStatsV2({ stats, onStatClick }: ReferencesStatsV2Props) {
  const [itemsPerView, setItemsPerView] = useState(1)
  
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth
      if (w >= 768) setItemsPerView(2)
      else setItemsPerView(1)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const statsData = [
    {
      title: 'Entreprises',
      value: stats.companiesCount,
      variant: 'kara-blue' as const,
      icon: Building2,
      tabValue: 'companies',
      testId: 'stat-companies',
    },
    {
      title: 'Métiers',
      value: stats.professionsCount,
      variant: 'kara-gold' as const,
      icon: Briefcase,
      tabValue: 'professions',
      testId: 'stat-professions',
    },
  ]

  const { 
    goNext, 
    goPrev, 
    canGoPrev, 
    canGoNext, 
    translateX, 
    containerRef, 
    handleTouchStart, 
    handleTouchMove, 
    handleTouchEnd, 
    isDragging 
  } = useCarousel({ itemCount: statsData.length, itemsPerView })

  // Si on peut tout afficher, pas besoin de carousel
  const needsCarousel = statsData.length > itemsPerView

  if (!needsCarousel) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4" data-testid="references-stats">
        {statsData.map((stat) => (
          <StatsCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            subtitle={stat.value === 1 ? 'élément' : 'éléments'}
            variant={stat.variant}
            icon={stat.icon}
            onClick={() => onStatClick?.(stat.tabValue)}
            testId={stat.testId}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="relative" data-testid="references-stats">
      {needsCarousel && (
        <>
          <div className="absolute top-1/2 -translate-y-1/2 left-0 z-10">
            <Button 
              variant="outline" 
              size="icon" 
              className={cn(
                'h-10 w-10 rounded-full bg-white/90 backdrop-blur-sm shadow-lg border-0 transition-all duration-300',
                canGoPrev ? 'hover:bg-white hover:scale-110 text-gray-700' : 'opacity-50 cursor-not-allowed'
              )} 
              onClick={goPrev} 
              disabled={!canGoPrev}
              data-testid="stats-carousel-prev"
              aria-label="Statistiques précédentes"
            >
              <ChevronLeft className="w-5 h-5" aria-hidden="true" />
            </Button>
          </div>
          <div className="absolute top-1/2 -translate-y-1/2 right-0 z-10">
            <Button 
              variant="outline" 
              size="icon" 
              className={cn(
                'h-10 w-10 rounded-full bg-white/90 backdrop-blur-sm shadow-lg border-0 transition-all duration-300',
                canGoNext ? 'hover:bg-white hover:scale-110 text-gray-700' : 'opacity-50 cursor-not-allowed'
              )} 
              onClick={goNext} 
              disabled={!canGoNext}
              data-testid="stats-carousel-next"
              aria-label="Statistiques suivantes"
            >
              <ChevronRight className="w-5 h-5" aria-hidden="true" />
            </Button>
          </div>
        </>
      )}
      <div 
        ref={containerRef} 
        className={cn("overflow-hidden py-2", needsCarousel && "ml-8 mr-8")}
        onTouchStart={handleTouchStart} 
        onTouchMove={handleTouchMove} 
        onTouchEnd={handleTouchEnd}
      >
        <div 
          className={cn(
            'flex transition-transform duration-300 ease-out gap-4', 
            isDragging && 'transition-none',
            !needsCarousel && 'grid grid-cols-1 sm:grid-cols-2'
          )} 
          style={needsCarousel ? { 
            transform: `translateX(${translateX}%)`, 
            cursor: isDragging ? 'grabbing' : 'grab' 
          } : undefined}
        >
          {statsData.map((stat) => (
            <div 
              key={stat.title} 
              className={needsCarousel ? "shrink-0" : ""}
              style={needsCarousel ? { width: `calc(${100 / itemsPerView}% - ${(4 * (itemsPerView - 1)) / itemsPerView}rem)` } : undefined}
            >
              <StatsCard
                title={stat.title}
                value={stat.value}
                subtitle={stat.value === 1 ? 'élément' : 'éléments'}
                variant={stat.variant}
                icon={stat.icon}
                onClick={() => onStatClick?.(stat.tabValue)}
                testId={stat.testId}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
