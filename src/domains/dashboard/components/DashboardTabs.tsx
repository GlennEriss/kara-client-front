'use client'

import { DASHBOARD_TAB_DEFINITIONS, type DashboardTabKey } from '../entities/dashboard-tabs.types'
import { cn } from '@/lib/utils'

interface DashboardTabsProps {
  activeTab: DashboardTabKey
  onTabChange: (nextTab: DashboardTabKey) => void
}

export function DashboardTabs({ activeTab, onTabChange }: DashboardTabsProps) {
  return (
    <div className="overflow-x-auto pb-1" role="tablist" aria-label="Onglets dashboard">
      <div className="inline-flex min-w-full gap-2 rounded-xl border border-kara-primary-dark/10 bg-white p-2">
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
                'rounded-lg px-3 py-2 text-sm font-semibold whitespace-nowrap transition-all',
                isActive
                  ? 'bg-kara-primary-dark text-white shadow-sm'
                  : 'bg-kara-primary-dark/5 text-kara-primary-dark hover:bg-kara-primary-dark/10'
              )}
            >
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.shortLabel}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
