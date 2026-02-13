'use client'

import { useEffect, useState } from 'react'
import { DEFAULT_DASHBOARD_TAB, DASHBOARD_TAB_KEYS, type DashboardTabKey } from '../entities/dashboard-tabs.types'

const STORAGE_KEY = 'dashboard.activeTab'

function isDashboardTabKey(value: string): value is DashboardTabKey {
  return DASHBOARD_TAB_KEYS.includes(value as DashboardTabKey)
}

export function useDashboardTabs() {
  const [activeTab, setActiveTab] = useState<DashboardTabKey>(DEFAULT_DASHBOARD_TAB)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored && isDashboardTabKey(stored)) {
      setActiveTab(stored)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(STORAGE_KEY, activeTab)
  }, [activeTab])

  return {
    activeTab,
    setActiveTab,
  }
}
