"use client"

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import React from 'react'
import { AppSidebar } from "./AppSidebar"
import { DashboardBreadcrumb } from "./DashboardBreadcrumb"
import NotificationBell from "./NotificationBell"
import { MemberNavbarSearch } from "@/domains/dashboard/member-overview/components/MemberNavbarSearch"

export default function LayoutDashboard({ children }: React.PropsWithChildren) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white h-screen overflow-hidden">
      <SidebarProvider defaultOpen>
        <AppSidebar />
        <main className="flex-1 flex flex-col h-screen overflow-hidden">
          <header className="sticky top-0 z-20 shrink-0 border-b border-gray-200 bg-white px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <SidebarTrigger className="shrink-0 p-2 rounded-lg hover:bg-gray-100 transition-colors" />
              <div className="min-w-0 flex-1">
                <MemberNavbarSearch />
              </div>
              <div className="shrink-0">
                <NotificationBell />
              </div>
            </div>

            <Separator className="mt-2 sm:mt-3" />

            <div className="mt-2 sm:mt-3">
              <DashboardBreadcrumb />
            </div>
          </header>
          <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 no-scrollbar-mobile">
            <div className="p-2 xl:p-6">
              {children}
            </div>
          </div>
        </main>
      </SidebarProvider>
    </div>
  )
}
