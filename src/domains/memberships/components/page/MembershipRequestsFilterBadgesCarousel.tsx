/**
 * Filtres de statut des demandes d'adhésion en badges cliquables dans un carousel.
 * Vue mobile/tablette uniquement (comme caisse-speciale/demandes).
 */

'use client'

import { useRef, useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  Users,
  Clock,
  Eye,
  CheckCircle,
  XCircle,
  CreditCard,
  AlertCircle,
} from 'lucide-react'

export type MembershipRequestTabValue =
  | 'all'
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'paid'
  | 'unpaid'
  | 'duplicates'

interface TabChip {
  value: MembershipRequestTabValue
  label: string
  icon: React.ReactNode
  color: string
  activeColor: string
}

const tabChips: TabChip[] = [
  {
    value: 'all',
    label: 'Toutes',
    icon: <Users className="w-4 h-4" />,
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    activeColor: 'bg-[#234D65] text-white border-[#234D65] shadow-lg shadow-[#234D65]/20',
  },
  {
    value: 'pending',
    label: 'En attente',
    icon: <Clock className="w-4 h-4" />,
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    activeColor: 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/20',
  },
  {
    value: 'under_review',
    label: 'En cours',
    icon: <Eye className="w-4 h-4" />,
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    activeColor: 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/20',
  },
  {
    value: 'approved',
    label: 'Approuvées',
    icon: <CheckCircle className="w-4 h-4" />,
    color: 'bg-green-50 text-green-700 border-green-200',
    activeColor: 'bg-green-500 text-white border-green-500 shadow-lg shadow-green-500/20',
  },
  {
    value: 'rejected',
    label: 'Rejetées',
    icon: <XCircle className="w-4 h-4" />,
    color: 'bg-red-50 text-red-700 border-red-200',
    activeColor: 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/20',
  },
  {
    value: 'paid',
    label: 'Payées',
    icon: <CreditCard className="w-4 h-4" />,
    color: 'bg-sky-50 text-sky-700 border-sky-200',
    activeColor: 'bg-sky-500 text-white border-sky-500 shadow-lg shadow-sky-500/20',
  },
  {
    value: 'unpaid',
    label: 'Non payées',
    icon: <XCircle className="w-4 h-4" />,
    color: 'bg-red-50 text-red-700 border-red-200',
    activeColor: 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/20',
  },
  {
    value: 'duplicates',
    label: 'Doublons',
    icon: <AlertCircle className="w-4 h-4" />,
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    activeColor: 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/20',
  },
]

export interface MembershipRequestsFilterBadgesCarouselCounts {
  all?: number
  pending?: number
  under_review?: number
  approved?: number
  rejected?: number
  paid?: number
  unpaid?: number
  duplicates?: number
}

interface MembershipRequestsFilterBadgesCarouselProps {
  value: MembershipRequestTabValue
  onChange: (value: MembershipRequestTabValue) => void
  counts?: MembershipRequestsFilterBadgesCarouselCounts
  className?: string
}

export function MembershipRequestsFilterBadgesCarousel({
  value,
  onChange,
  counts,
  className,
}: MembershipRequestsFilterBadgesCarouselProps) {
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

  const scrollToActive = (tabValue: MembershipRequestTabValue) => {
    if (!scrollRef.current) return
    const activeChip = scrollRef.current.querySelector(`[data-value="${tabValue}"]`)
    if (activeChip) {
      const container = scrollRef.current
      const chipRect = activeChip.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()
      const scrollTo =
        container.scrollLeft +
        chipRect.left -
        containerRect.left -
        containerRect.width / 2 +
        chipRect.width / 2
      container.scrollTo({ left: scrollTo, behavior: 'smooth' })
    }
  }

  const handleClick = (tabValue: MembershipRequestTabValue) => {
    onChange(tabValue)
    scrollToActive(tabValue)
  }

  return (
    <div className={cn('relative', className)}>
      <div
        className={cn(
          'absolute left-0 top-0 bottom-0 w-8 bg-linear-to-r from-white to-transparent z-10 pointer-events-none transition-opacity duration-200',
          showLeftFade ? 'opacity-100' : 'opacity-0'
        )}
      />
      <div
        className={cn(
          'absolute right-0 top-0 bottom-0 w-8 bg-linear-to-l from-white to-transparent z-10 pointer-events-none transition-opacity duration-200',
          showRightFade ? 'opacity-100' : 'opacity-0'
        )}
      />
      <div
        ref={scrollRef}
        className="flex gap-2 md:gap-3 overflow-x-auto no-scrollbar py-1 px-1 touch-pan-x"
        style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
      >
        {tabChips.map((chip) => {
          const isActive = value === chip.value
          const count = counts?.[chip.value]
          return (
            <button
              key={chip.value}
              type="button"
              data-value={chip.value}
              onClick={() => handleClick(chip.value)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-full border-2 font-medium text-sm whitespace-nowrap transition-all duration-200 shrink-0',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#234D65]',
                'active:scale-95',
                isActive ? chip.activeColor : chip.color,
                isActive && 'scale-105'
              )}
              style={{ scrollSnapAlign: 'center' }}
              data-testid={`membership-requests-tab-${chip.value}`}
            >
              {chip.icon}
              <span>{chip.label}</span>
              {count !== undefined && (
                <span
                  className={cn(
                    'ml-1 px-2 py-0.5 rounded-full text-xs font-bold min-w-[24px] text-center',
                    isActive ? 'bg-white/30 text-white' : 'bg-white/80 text-gray-700'
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
