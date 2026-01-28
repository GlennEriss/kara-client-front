/**
 * Composant de filtres de statut avec des badges/chips cliquables
 * 
 * Design mobile-first : badges horizontaux scrollables dans un carousel
 * Sans barre de scroll visible, navigation tactile fluide
 */

'use client'

import { useRef, useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Layers 
} from 'lucide-react'

interface StatusChip {
  value: string
  label: string
  icon: React.ReactNode
  color: string
  activeColor: string
  count?: number
}

const statusChips: StatusChip[] = [
  { 
    value: 'all', 
    label: 'Toutes', 
    icon: <Layers className="w-4 h-4" />,
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    activeColor: 'bg-[#234D65] text-white border-[#234D65] shadow-lg shadow-[#234D65]/20'
  },
  { 
    value: 'PENDING', 
    label: 'En attente', 
    icon: <Clock className="w-4 h-4" />,
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    activeColor: 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/20'
  },
  { 
    value: 'APPROVED', 
    label: 'Acceptées', 
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: 'bg-green-50 text-green-700 border-green-200',
    activeColor: 'bg-green-500 text-white border-green-500 shadow-lg shadow-green-500/20'
  },
  { 
    value: 'REJECTED', 
    label: 'Refusées', 
    icon: <XCircle className="w-4 h-4" />,
    color: 'bg-red-50 text-red-700 border-red-200',
    activeColor: 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/20'
  },
  { 
    value: 'REOPENED', 
    label: 'Réouvertes', 
    icon: <RefreshCw className="w-4 h-4" />,
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    activeColor: 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/20'
  },
]

interface StatusFilterChipsProps {
  value: string
  onChange: (value: string) => void
  counts?: Record<string, number>
  className?: string
}

export function StatusFilterChips({ 
  value, 
  onChange, 
  counts,
  className 
}: StatusFilterChipsProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showLeftFade, setShowLeftFade] = useState(false)
  const [showRightFade, setShowRightFade] = useState(false)

  // Vérifier le scroll pour afficher/masquer les fades
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
      if (scrollEl) {
        scrollEl.removeEventListener('scroll', checkScroll)
      }
      window.removeEventListener('resize', checkScroll)
    }
  }, [])

  // Centrer le chip actif dans la vue
  const scrollToActive = (chipValue: string) => {
    if (!scrollRef.current) return
    
    const activeChip = scrollRef.current.querySelector(`[data-value="${chipValue}"]`)
    if (activeChip) {
      const container = scrollRef.current
      const chipRect = activeChip.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()
      
      const scrollTo = container.scrollLeft + chipRect.left - containerRect.left - (containerRect.width / 2) + (chipRect.width / 2)
      
      container.scrollTo({
        left: scrollTo,
        behavior: 'smooth'
      })
    }
  }

  const handleClick = (chipValue: string) => {
    onChange(chipValue)
    scrollToActive(chipValue)
  }

  return (
    <div className={cn('relative', className)}>
      {/* Fade gauche */}
      <div 
        className={cn(
          'absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none transition-opacity duration-200',
          showLeftFade ? 'opacity-100' : 'opacity-0'
        )}
      />
      
      {/* Fade droite */}
      <div 
        className={cn(
          'absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none transition-opacity duration-200',
          showRightFade ? 'opacity-100' : 'opacity-0'
        )}
      />

      {/* Container scrollable */}
      <div 
        ref={scrollRef}
        className="flex gap-2 md:gap-3 overflow-x-auto no-scrollbar py-1 px-1 touch-pan-x"
        style={{ 
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {statusChips.map((chip) => {
          const isActive = value === chip.value
          const count = counts?.[chip.value]
          
          return (
            <button
              key={chip.value}
              type="button"
              data-value={chip.value}
              onClick={() => handleClick(chip.value)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-full border-2 font-medium text-sm whitespace-nowrap transition-all duration-200 flex-shrink-0',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#234D65]',
                'active:scale-95',
                isActive ? chip.activeColor : chip.color,
                isActive && 'scale-105'
              )}
              style={{ scrollSnapAlign: 'center' }}
              data-testid={`status-chip-${chip.value}`}
            >
              {chip.icon}
              <span>{chip.label}</span>
              {count !== undefined && count > 0 && (
                <span 
                  className={cn(
                    'ml-1 px-2 py-0.5 rounded-full text-xs font-bold min-w-[24px] text-center',
                    isActive 
                      ? 'bg-white/30 text-white' 
                      : 'bg-white/80 text-gray-700'
                  )}
                >
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
