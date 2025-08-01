"use client"

import React from 'react'
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "./AppSidebar"

export default function LayoutDashboard({ children }: React.PropsWithChildren) {
  return (
    <SidebarProvider defaultOpen>
      <AppSidebar />
      <main className="flex-1 overflow-hidden">
        <header className="flex h-20 shrink-0 items-center gap-2 border-b border-border px-4">
          <SidebarTrigger />
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Dashboard</h1>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-4">
          {children}
        </div>
      </main>
    </SidebarProvider>
  )
}
