"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";
import {
  DASHBOARD_TAB_DEFINITIONS,
  type DashboardTabKey,
} from "../entities/dashboard-tabs.types";

interface DashboardTabsProps {
  activeTab: DashboardTabKey;
  onTabChange: (nextTab: DashboardTabKey) => void;
}

export function DashboardTabs({ activeTab, onTabChange }: DashboardTabsProps) {
  const mobileScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mobileScrollRef.current) return;
    const activeEl = mobileScrollRef.current.querySelector(
      `[data-value="${activeTab}"]`,
    );
    if (activeEl) {
      activeEl.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [activeTab]);

  return (
    <div aria-label="Onglets dashboard">
      <div className="md:hidden">
        <div
          ref={mobileScrollRef}
          className="no-scrollbar flex touch-pan-x gap-2 overflow-x-auto px-1 py-1"
          style={{
            scrollSnapType: "x mandatory",
            WebkitOverflowScrolling: "touch",
          }}
          role="tablist"
        >
          {DASHBOARD_TAB_DEFINITIONS.map((tab) => {
            const isActive = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-current={isActive ? "page" : undefined}
                data-value={tab.key}
                onClick={() => onTabChange(tab.key)}
                className={cn(
                  "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors duration-200",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#234D65] focus-visible:ring-offset-2",
                  isActive
                    ? "border-[#234D65] bg-[#234D65] text-white shadow-sm"
                    : "border-gray-200 bg-white text-gray-700 hover:border-[#234D65]/30 hover:text-[#234D65]",
                )}
                style={{ scrollSnapAlign: "center" }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        className="hidden flex-wrap items-center gap-2 rounded-2xl border border-gray-100 bg-gray-50 p-2.5 shadow-sm md:flex"
        role="tablist"
      >
        {DASHBOARD_TAB_DEFINITIONS.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-current={isActive ? "page" : undefined}
              onClick={() => onTabChange(tab.key)}
              className={cn(
                "whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors duration-200",
                isActive
                  ? "bg-[#234D65] text-white shadow-sm"
                  : "bg-white text-gray-600 hover:text-[#234D65]",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
