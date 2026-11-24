"use client";
import { readToolMarker } from '@/domains/mobile/browser/tools-protocol';

import { MemberNavbarSearch } from "@/domains/dashboard/member-overview/components/MemberNavbarSearch";
import React, { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { DashboardBreadcrumb } from "./DashboardBreadcrumb";
import NotificationBell from "./NotificationBell";
import { HelpButton } from "@/domains/help/components/HelpButton";
import { useMyAccess } from "@/hooks/useMyAccess";

export default function LayoutDashboard({ children }: React.PropsWithChildren) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const [mobileTools, setMobileTools] = useState(false);
  useEffect(() => { setMobileTools(!!readToolMarker()); }, [pathname]);
  // La recherche affiche tous les contrats d'un membre : réservée à qui voit les
  // membres. Les notifications sont filtrées par module dans la cloche.
  const { can } = useMyAccess();

  // À chaque changement de page, on remet le conteneur de contenu tout en haut
  // pour que la page s'ouvre sur son header (et non au milieu, scroll hérité).
  useEffect(() => {
    const content = scrollRef.current;
    if (content) {
      content.scrollTop = 0;
      content.scrollLeft = 0;
    }
  }, [pathname]);

  if (mobileTools) return <main className="h-dvh overflow-x-hidden overflow-y-auto bg-gray-50 p-3">{children}</main>;

  return (
    <div className="h-dvh overflow-hidden bg-gray-50">
      <SidebarProvider className="h-full min-h-0" defaultOpen>
        <AppSidebar />
        <main className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
          <header className="relative z-20 flex h-14 shrink-0 items-center gap-2 border-b border-gray-100 bg-white px-3 shadow-[0_1px_0_0_rgba(0,0,0,0.06)] sm:gap-3 md:px-6">
            <SidebarTrigger className="h-11 w-auto shrink-0 rounded-md px-2 text-gray-700 md:h-8 md:w-8 md:p-0" />

            <div className="h-5 w-px shrink-0 bg-gray-200" aria-hidden />

            <div className="hidden min-w-0 flex-1 md:block">
              <DashboardBreadcrumb />
            </div>

            <div className="min-w-0 flex-1 md:flex-none">
              {can("members.view") && <MemberNavbarSearch />}
            </div>

            <HelpButton />
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
