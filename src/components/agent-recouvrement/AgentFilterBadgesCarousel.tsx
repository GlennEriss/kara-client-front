'use client'

import { useRef, useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { UserCheck, Users, UserX, Cake } from 'lucide-react'
import type { AgentRecouvrementFilterTab } from '@/types/types'

interface AgentFilterBadgesCarouselProps {
  value: AgentRecouvrementFilterTab
  onChange: (value: AgentRecouvrementFilterTab) => void
  counts?: Record<AgentRecouvrementFilterTab, number>
  className?: string
}

const tabs: { value: AgentRecouvrementFilterTab; label: string; icon: React.ReactNode }[] = [
  { value: 'actifs', label: 'Actifs', icon: <UserCheck className="w-4 h-4" /> },
  { value: 'tous', label: 'Tous', icon: <Users className="w-4 h-4" /> },
  { value: 'inactifs', label: 'Inactifs', icon: <UserX className="w-4 h-4" /> },
  { value: 'anniversaires', label: 'Anniv. mois', icon: <Cake className="w-4 h-4" /> },
]

export function AgentFilterBadgesCarousel({ value, onChange, counts, className }: AgentFilterBadgesCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showLeftFade, setShowLeftFade] = useState(false)
  const [showRightFade, setShowRightFade] = useState(false)

  const checkScroll = () => {
    if (!scrollRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
    setShowLeftFade(scrollLeft > 10)
    setShowRightFade(scrollLeft < scrollWidth - clientWidth - 10)
  }

  useEffect(() => {
    checkScroll()
    const scrollEl = scrollRef.current
    if (scrollEl) {
      scrollEl.addEventListener('scroll', checkScroll, { passive: true })
      window.addEventListener('resize', checkScroll)
    }
    return () => {
      if (scrollEl) scrollEl.removeEventListener('scroll', checkScroll)
      window.removeEventListener('resize', checkScroll)
    }
  }, [])

  return (
    <div className={cn('relative', className)}>
      <div className={cn('absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none transition-opacity', showLeftFade ? 'opacity-100' : 'opacity-0')} />
      <div className={cn('absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none transition-opacity', showRightFade ? 'opacity-100' : 'opacity-0')} />
      <div
        ref={scrollRef}
        className="flex gap-2 md:gap-3 overflow-x-auto no-scrollbar py-1 px-1 touch-pan-x"
        style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
      >
        {tabs.map((tab) => {
          const isActive = value === tab.value
          const count = counts?.[tab.value]
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => onChange(tab.value)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-full border-2 font-medium text-sm whitespace-nowrap flex-shrink-0',
                isActive ? 'bg-[#234D65] text-white border-[#234D65] shadow-lg' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
              )}
              style={{ scrollSnapAlign: 'center' }}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {count !== undefined && (
                <span className={cn('ml-1 px-2 py-0.5 rounded-full text-xs font-bold', isActive ? 'bg-white/30' : 'bg-white/80')}>
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
