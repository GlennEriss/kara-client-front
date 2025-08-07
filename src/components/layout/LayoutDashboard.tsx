"use client"

import React, { useState, useEffect } from 'react'
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "./AppSidebar"
import { DashboardBreadcrumb } from "./DashboardBreadcrumb"
import { usePathname } from 'next/navigation'

export default function LayoutDashboard({ children }: React.PropsWithChildren) {
  const [currentPage, setCurrentPage] = useState('Dashboard')
  const pathname = usePathname()

  useEffect(() => {
    // Déterminer le titre de la page actuelle
    const getPageTitle = (path: string) => {
      switch (path) {
        case '/dashboard':
          return 'Tableau de bord'
        case '/membership-requests':
          return 'Demandes d\'adhésion'
        case '/memberships':
          return 'Membres'
        default:
          return 'Dashboard'
      }
    }
    
    setCurrentPage(getPageTitle(pathname))
  }, [pathname])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <SidebarProvider defaultOpen>
        <AppSidebar />
        <main className="flex-1 overflow-hidden">
          <header className="flex h-20 shrink-0 items-center gap-4 px-6 border-b border-gray-200 bg-white">
            <SidebarTrigger className="p-2 rounded-lg hover:bg-gray-100 transition-colors" />
            <div className="flex-1">
              <DashboardBreadcrumb />
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600">En ligne</span>
            </div>
          </header>
          <div className="flex-1 overflow-auto p-6">
            {children}
          </div>
        </main>
      </SidebarProvider>
    </div>
  )
}
