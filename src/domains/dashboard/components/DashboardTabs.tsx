'use client'

import { cn } from '@/lib/utils'
import { useEffect, useRef } from 'react'
import { DASHBOARD_TAB_DEFINITIONS, type DashboardTabKey } from '../entities/dashboard-tabs.types'

interface DashboardTabsProps {
  activeTab: DashboardTabKey
  onTabChange: (nextTab: DashboardTabKey) => void
}

export function DashboardTabs({ activeTab, onTabChange }: DashboardTabsProps) {
  const mobileScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!mobileScrollRef.current) return
    const activeEl = mobileScrollRef.current.querySelector(`[data-value="${activeTab}"]`)
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [activeTab])

  return (
    <div aria-label="Onglets dashboard">
      <div className="md:hidden">
        <div
          ref={mobileScrollRef}
          className="flex gap-2 overflow-x-auto no-scrollbar py-1 px-1 touch-pan-x"
          style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
          role="tablist"
        >
          {DASHBOARD_TAB_DEFINITIONS.map((tab) => {
            const isActive = tab.key === activeTab
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-current={isActive ? 'page' : undefined}
                data-value={tab.key}
                onClick={() => onTabChange(tab.key)}
                className={cn(
                  'flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border-2 px-4 py-2.5 text-sm font-medium transition-all duration-200',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-kara-primary-dark active:scale-95',
                  isActive
                    ? 'scale-105 border-kara-primary-dark bg-kara-primary-dark text-white shadow-lg shadow-kara-primary-dark/20'
                    : 'border-gray-200 bg-gray-100 text-gray-700'
                )}
                style={{ scrollSnapAlign: 'center' }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      <div
        className="hidden flex-wrap items-center gap-2 rounded-2xl border border-kara-primary-dark/15 bg-gradient-to-r from-white via-kara-primary-dark/[0.02] to-kara-primary-light/[0.08] p-2.5 shadow-[0_12px_30px_-22px_rgba(34,77,98,0.45)] md:flex"
        role="tablist"
      >
        {DASHBOARD_TAB_DEFINITIONS.map((tab) => {
          const isActive = tab.key === activeTab
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onTabChange(tab.key)}
              className={cn(
                'rounded-xl px-3.5 py-2 text-sm font-semibold whitespace-nowrap transition-all duration-200',
                isActive
                  ? 'bg-kara-primary-dark text-white shadow-[0_8px_18px_-12px_rgba(34,77,98,0.9)]'
                  : 'bg-white/75 text-kara-primary-dark hover:bg-white hover:-translate-y-0.5 hover:shadow-sm'
              )}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
