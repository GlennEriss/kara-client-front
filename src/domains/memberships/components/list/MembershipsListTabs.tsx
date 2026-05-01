'use client'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Users, UserCheck, UserX, Heart } from 'lucide-react'
import type { MembersTab } from '../../services/MembershipsListService'

interface MembershipsListTabsProps {
  activeTab: MembersTab
  onTabChange: (tab: MembersTab) => void
  counts?: {
    all?: number
    adherents?: number
    bienfaiteurs?: number
    sympathisants?: number
    'abonnement-valide'?: number
    'abonnement-invalide'?: number
  }
}

export function MembershipsListTabs({
  activeTab,
  onTabChange,
  counts = {},
}: MembershipsListTabsProps) {
  const tabs: Array<{
    value: MembersTab
    label: string
    icon: React.ComponentType<{ className?: string }>
    count?: number
  }> = [
    {
      value: 'all',
      label: 'Tous',
      icon: Users,
      count: counts.all,
    },
    {
      value: 'adherents',
      label: 'Adhérents',
      icon: UserCheck,
      count: counts.adherents,
    },
    {
      value: 'bienfaiteurs',
      label: 'Bienfaiteurs',
      icon: Heart,
      count: counts.bienfaiteurs,
    },
    {
      value: 'sympathisants',
      label: 'Sympathisants',
      icon: Users,
      count: counts.sympathisants,
    },
    {
      value: 'abonnement-valide',
      label: 'Abonnement valide',
      icon: UserCheck,
      count: counts['abonnement-valide'],
    },
    {
      value: 'abonnement-invalide',
      label: 'Abonnement invalide',
      icon: UserX,
      count: counts['abonnement-invalide'],
    },
  ]

  return (
    <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as MembersTab)} data-testid="memberships-list-tabs">
      <div className="border-b border-gray-200">
        {/* Mobile/Tablet: badges scrollables */}
        <div className="lg:hidden">
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-2 px-1 touch-pan-x">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.value
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => onTabChange(tab.value)}
                  className={`shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-full border-2 font-semibold text-sm whitespace-nowrap transition-all duration-200 ${
                    isActive
                      ? 'bg-[#234D65] text-white border-[#234D65] shadow-lg shadow-[#234D65]/20'
                      : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span
                      className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold min-w-[24px] text-center ${
                        isActive ? 'bg-white/25 text-white' : 'bg-white text-gray-700'
                      }`}
                    >
                      {tab.count > 99 ? '99+' : tab.count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Desktop: tabs actuels */}
        <div className="hidden lg:block flex-1 min-w-0">
          <TabsList className="relative flex w-full flex-nowrap overflow-x-auto scrollbar-hide bg-transparent p-0 h-auto gap-0.5">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  data-testid={`memberships-list-tab-${tab.value}`}
                  className="shrink-0 min-w-[110px] px-3 py-2.5 text-xs sm:text-sm rounded-t-lg rounded-b-none border-x border-t border-gray-200 bg-gray-50/70 font-semibold text-gray-600 transition-all data-[state=active]:z-10 data-[state=active]:bg-white data-[state=active]:text-[#234D65] data-[state=active]:border-[#234D65] data-[state=active]:shadow-none hover:bg-gray-100 hover:text-[#234D65]"
                >
                  <span className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                    <span className="whitespace-nowrap">{tab.label}</span>
                    {tab.count !== undefined && (
                      <span className="ml-0.5 px-1.5 py-0.5 text-[11px] font-semibold rounded-full bg-gray-200/80 text-gray-700 data-[state=active]:bg-[#234D65]/10 data-[state=active]:text-[#234D65] shrink-0">
                        {tab.count}
                      </span>
                    )}
                  </span>
                </TabsTrigger>
              )
            })}
          </TabsList>
        </div>
      </div>
    </Tabs>
  )
}
