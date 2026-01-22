'use client'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Users, UserCheck, UserX, Clock, Heart } from 'lucide-react'
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
      <div className="relative -mx-4 px-4">
        <div className="overflow-x-auto no-scrollbar scroll-smooth">
          <TabsList className="flex min-w-max gap-1.5 sm:gap-2 bg-white/50 backdrop-blur-sm border border-gray-200/50">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  data-testid={`memberships-list-tab-${tab.value}`}
                  className="flex items-center gap-1 sm:gap-2 shrink-0 px-2 sm:px-3 py-2 text-sm sm:text-base data-[state=active]:bg-[#234D65] data-[state=active]:text-white"
                >
                  <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                  <span className="whitespace-nowrap">{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className="ml-0.5 sm:ml-1 px-1 sm:px-1.5 py-0.5 text-xs font-medium rounded-full bg-gray-100 data-[state=active]:bg-white/20 shrink-0">
                      {tab.count}
                    </span>
                  )}
                </TabsTrigger>
              )
            })}
          </TabsList>
        </div>
        <span className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-linear-to-r from-white to-transparent md:hidden" />
        <span className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-linear-to-l from-white to-transparent md:hidden" />
      </div>
    </Tabs>
  )
}
