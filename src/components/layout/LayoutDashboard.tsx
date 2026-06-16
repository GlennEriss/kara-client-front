"use client";

import { MemberNavbarSearch } from "@/domains/dashboard/member-overview/components/MemberNavbarSearch";
import React from "react";
import { Separator } from "@/components/ui/separator";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { DashboardBreadcrumb } from "./DashboardBreadcrumb";
import NotificationBell from "./NotificationBell";

export default function LayoutDashboard({ children }: React.PropsWithChildren) {
  return (
    <div className="h-screen min-h-screen overflow-hidden bg-gray-50">
      <SidebarProvider defaultOpen>
        <AppSidebar />
        <main className="flex h-screen flex-1 flex-col overflow-hidden">
          <header className="sticky top-0 z-20 shrink-0 border-b border-gray-200 bg-white px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <SidebarTrigger className="shrink-0 rounded-lg p-2 transition-colors hover:bg-gray-100" />
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
          <div className="no-scrollbar-mobile min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
            <div className="p-3 sm:p-4 lg:p-6">{children}</div>
          </div>
        </main>
      </SidebarProvider>
    </div>
  );
}
