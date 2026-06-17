"use client";

import { MemberNavbarSearch } from "@/domains/dashboard/member-overview/components/MemberNavbarSearch";
import React, { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { DashboardBreadcrumb } from "./DashboardBreadcrumb";
import NotificationBell from "./NotificationBell";

export default function LayoutDashboard({ children }: React.PropsWithChildren) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // À chaque changement de page, on remet le conteneur de contenu tout en haut
  // pour que la page s'ouvre sur son header (et non au milieu, scroll hérité).
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, left: 0 });
  }, [pathname]);

  return (
    <div className="h-screen min-h-screen overflow-hidden bg-gray-50">
      <SidebarProvider defaultOpen>
        <AppSidebar />
        <main className="flex h-screen flex-1 flex-col overflow-hidden">
          <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-gray-100 bg-white px-4 shadow-[0_1px_0_0_rgba(0,0,0,0.06)] sm:gap-3 md:px-6">
            <SidebarTrigger className="h-8 w-8 shrink-0 rounded-md text-gray-500 transition-colors hover:bg-gray-100" />

            <div className="h-5 w-px shrink-0 bg-gray-200" aria-hidden />

            <div className="hidden min-w-0 flex-1 md:block">
              <DashboardBreadcrumb />
            </div>

            <div className="min-w-0 flex-1 md:flex-none">
              <MemberNavbarSearch />
            </div>

            <NotificationBell />
          </header>
          <div
            ref={scrollRef}
            className="no-scrollbar-mobile min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
          >
            <div className="p-3 sm:p-4 lg:p-6">{children}</div>
          </div>
        </main>
      </SidebarProvider>
    </div>
  );
}
