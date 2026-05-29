"use client";

import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, LayoutDashboard, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHero } from "@/components/ui/page-hero";
import { Skeleton } from "@/components/ui/skeleton";

import type { DashboardFilters } from "../entities/dashboard.types";
import {
  useDashboard,
  useDashboardFilterOptions,
  useExecutiveActiveMembers,
} from "../hooks/useDashboard";
import { useDashboardFilters } from "../hooks/useDashboardFilters";
import { useDashboardTabs } from "../hooks/useDashboardTabs";
import { DashboardFiltersBar } from "./DashboardFiltersBar";
import { DashboardTabs } from "./DashboardTabs";
import { DashboardTabContent } from "./tabs/DashboardTabContent";

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="mt-2 h-8 w-40" />
              <Skeleton className="mt-2 h-3 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <Skeleton className="h-5 w-56" />
              <Skeleton className="mt-4 h-56 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const { activeTab, setActiveTab } = useDashboardTabs();
  const { filters, setFilters, resetFilters, hasActiveMemberScope } =
    useDashboardFilters();
  const [executiveCursor, setExecutiveCursor] = useState<string | null>(null);
  const [executiveCursorHistory, setExecutiveCursorHistory] = useState<
    Array<string | null>
  >([]);

  const { data: filterOptions } = useDashboardFilterOptions();
  const {
    data: snapshot,
    isLoading,
    isFetching,
    error,
  } = useDashboard(activeTab, filters);
  const isExecutiveTab = activeTab === "executive";
  const { data: executiveMembersPage, isLoading: isExecutiveMembersLoading } =
    useExecutiveActiveMembers(filters, executiveCursor, 20, isExecutiveTab);
  const generatedAt = snapshot?.generatedAt ?? null;

  const filtersCacheKey = useMemo(() => JSON.stringify(filters), [filters]);

  useEffect(() => {
    setExecutiveCursor(null);
    setExecutiveCursorHistory([]);
  }, [filtersCacheKey, activeTab]);

  const generatedAtLabel = useMemo(() => {
    if (!generatedAt) return null;
    const date = new Date(generatedAt);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleString("fr-FR");
  }, [generatedAt]);

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const handleTabChange = (nextTab: typeof activeTab) => {
    setActiveTab(nextTab);

    if (nextTab !== "executive" && filters.moduleCompare !== "all") {
      setFilters((prev) => ({ ...prev, moduleCompare: "all" }));
    }
  };

  const handleFiltersChange = (nextFilters: DashboardFilters) => {
    if (activeTab !== "executive" && nextFilters.moduleCompare !== "all") {
      setFilters({ ...nextFilters, moduleCompare: "all" });
      return;
    }

    setFilters(nextFilters);
  };

  const handleResetFilters = () => {
    resetFilters();
    if (activeTab !== "executive") {
      setFilters((prev) => ({ ...prev, moduleCompare: "all" }));
    }
  };

  const handleExecutiveNextPage = () => {
    const nextCursor = executiveMembersPage?.nextCursor;
    if (!nextCursor || !executiveMembersPage?.hasNextPage) return;

    setExecutiveCursorHistory((prev) => [...prev, executiveCursor]);
    setExecutiveCursor(nextCursor);
  };

  const handleExecutivePrevPage = () => {
    if (executiveCursorHistory.length === 0) return;
    const previousCursor =
      executiveCursorHistory[executiveCursorHistory.length - 1] ?? null;
    setExecutiveCursor(previousCursor);
    setExecutiveCursorHistory((prev) => prev.slice(0, -1));
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHero
        icon={LayoutDashboard}
        title="Tableau de bord"
        subtitle="Pilotage multi-modules en temps réel, avec lecture par onglet métier."
        rightSlot={
          <Button
            type="button"
            onClick={handleRefresh}
            disabled={isFetching}
            className="bg-white text-[#234D65] hover:bg-white/90 shadow-md"
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
            />
            Actualiser
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
        {generatedAtLabel ? (
          <span>Généré le {generatedAtLabel}</span>
        ) : (
          <span>En attente de données</span>
        )}
        {hasActiveMemberScope && (
          <span className="rounded-full bg-[#234D65]/10 px-2 py-1 font-medium text-[#234D65]">
            Scope membre actif
          </span>
        )}
      </div>

      <DashboardFiltersBar
        activeTab={activeTab}
        filters={filters}
        filterOptions={filterOptions}
        onChange={handleFiltersChange}
        onReset={handleResetFilters}
      />

      <DashboardTabs activeTab={activeTab} onTabChange={handleTabChange} />

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Impossible de charger le dashboard.{" "}
            {error instanceof Error ? error.message : ""}
          </AlertDescription>
        </Alert>
      ) : isLoading && !snapshot ? (
        <DashboardSkeleton />
      ) : snapshot ? (
        <DashboardTabContent
          payload={snapshot.snapshot}
          executiveMembersPage={executiveMembersPage}
          executiveMembersPageIndex={executiveCursorHistory.length}
          executiveMembersLoading={isExecutiveMembersLoading}
          onExecutivePrevPage={handleExecutivePrevPage}
          onExecutiveNextPage={handleExecutiveNextPage}
        />
      ) : (
        <Card>
          <CardContent className="p-6 text-sm text-gray-500">
            Aucune donnee disponible pour ce contexte.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
