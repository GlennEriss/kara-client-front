"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Inbox, LayoutGrid, List } from "lucide-react";
import React from "react";

/**
 * Composant pour afficher des données en liste ou en cards
 * Design système KARA avec animations modernes
 *
 * Features :
 * - Toggle vue liste/cards animé
 * - Message d'état vide personnalisé avec animation
 * - Skeleton de chargement moderne
 * - Variantes de style (default, kara, compact)
 * - Animations d'entrée pour les items
 */

type DataViewVariant = "default" | "kara" | "compact";

interface DataViewProps<T> {
  data: T[];
  viewMode?: "list" | "cards";
  onViewModeChange?: (mode: "list" | "cards") => void;
  renderItem: (item: T, index: number) => React.ReactNode;
  renderCard?: (item: T, index: number) => React.ReactNode;
  emptyMessage?: string;
  emptyDescription?: string;
  emptyIcon?: React.ComponentType<{ className?: string }>;
  loading?: boolean;
  loadingSkeleton?: React.ReactNode;
  skeletonCount?: number;
  className?: string;
  cardClassName?: string;
  listClassName?: string;
  variant?: DataViewVariant;
  animateItems?: boolean;
}

const variantStyles: Record<
  DataViewVariant,
  {
    toggle: string;
    toggleActive: string;
    toggleInactive: string;
    emptyContainer: string;
    emptyIcon: string;
    emptyTitle: string;
    emptyDescription: string;
  }
> = {
  default: {
    toggle: "rounded-lg border border-gray-100 bg-gray-50 p-1",
    toggleActive: "bg-white text-[#234D65] shadow-sm",
    toggleInactive: "text-gray-500 hover:bg-white hover:text-gray-700",
    emptyContainer: "rounded-2xl border border-gray-100 bg-white shadow-sm",
    emptyIcon: "text-gray-300",
    emptyTitle: "text-gray-900",
    emptyDescription: "text-gray-500",
  },
  kara: {
    toggle: "rounded-lg border border-gray-100 bg-gray-50 p-1 shadow-sm",
    toggleActive: "bg-[#234D65] text-white shadow-sm",
    toggleInactive: "text-gray-500 hover:bg-white hover:text-[#234D65]",
    emptyContainer: "rounded-2xl border border-gray-100 bg-white shadow-sm",
    emptyIcon: "text-[#234D65]/35",
    emptyTitle: "text-[#234D65]",
    emptyDescription: "text-gray-500",
  },
  compact: {
    toggle: "rounded-lg border border-gray-100 bg-gray-50 p-0.5",
    toggleActive: "bg-white text-[#234D65] shadow-sm",
    toggleInactive: "text-gray-500 hover:bg-white hover:text-gray-700",
    emptyContainer: "rounded-xl border border-gray-100 bg-white",
    emptyIcon: "text-gray-300",
    emptyTitle: "text-gray-900",
    emptyDescription: "text-gray-500",
  },
};

export function DataView<T>({
  data,
  viewMode = "cards",
  onViewModeChange,
  renderItem,
  renderCard,
  emptyMessage = "Aucune donnée trouvée",
  emptyDescription,
  emptyIcon: EmptyIcon = Inbox,
  loading = false,
  loadingSkeleton,
  skeletonCount = 6,
  className,
  cardClassName,
  listClassName,
  variant = "kara",
  animateItems = true,
}: DataViewProps<T>) {
  const styles = variantStyles[variant];

  if (loading) {
    // Skeleton par défaut (défini inline pour éviter l'erreur de composant créé pendant le render)
    const defaultSkeletonContent = (
      <div
        className={cn(
          viewMode === "cards"
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            : "space-y-3",
        )}
      >
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "animate-pulse",
              viewMode === "cards" ? "h-48" : "h-20",
            )}
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <Skeleton
              className={cn(
                "h-full w-full rounded-2xl bg-gray-100",
                variant === "compact" && "rounded-xl",
              )}
            />
          </div>
        ))}
      </div>
    );

    return (
      <div className={cn("animate-in fade-in-0 duration-300", className)}>
        {loadingSkeleton || defaultSkeletonContent}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center px-6 py-16 text-center",
          "animate-in fade-in-0 duration-300",
          styles.emptyContainer,
          className,
        )}
        data-testid="data-view-empty"
      >
        <div
          className={cn(
            "mb-4 rounded-2xl bg-gray-50 p-4",
            variant === "kara" && "bg-[#234D65]/5",
          )}
        >
          <EmptyIcon className={cn("h-12 w-12", styles.emptyIcon)} />
        </div>
        <h3 className={cn("text-lg font-semibold mb-2", styles.emptyTitle)}>
          {emptyMessage}
        </h3>
        {emptyDescription && (
          <p className={cn("text-sm max-w-md", styles.emptyDescription)}>
            {emptyDescription}
          </p>
        )}
      </div>
    );
  }

  const renderContent = () => {
    if (viewMode === "list") {
      return (
        <div className={cn("space-y-3", listClassName)}>
          {data.map((item, index) => (
            <div
              key={index}
              className={
                animateItems
                  ? "animate-in fade-in-0 slide-in-from-left-2 duration-300"
                  : ""
              }
              style={
                animateItems ? { animationDelay: `${index * 50}ms` } : undefined
              }
            >
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      );
    }

    const renderCardFn = renderCard || renderItem;
    return (
      <div
        className={cn(
          "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",
          cardClassName,
        )}
      >
        {data.map((item, index) => (
          <div
            key={index}
            className={animateItems ? "animate-in fade-in-0 duration-300" : ""}
            style={
              animateItems ? { animationDelay: `${index * 75}ms` } : undefined
            }
          >
            {renderCardFn(item, index)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={cn("space-y-4", className)} data-testid="data-view">
      {/* Toggle vue */}
      {onViewModeChange && (
        <div className="flex items-center justify-between">
          <div
            className={cn(
              "text-sm font-medium text-gray-500",
              "animate-in fade-in-0 duration-300",
            )}
          >
            {data.length} {data.length === 1 ? "élément" : "éléments"}
          </div>

          <div className={cn("inline-flex", styles.toggle)}>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onViewModeChange("list")}
              className={cn(
                "h-8 px-3 rounded-lg gap-2",
                "transition-colors duration-200",
                viewMode === "list"
                  ? styles.toggleActive
                  : styles.toggleInactive,
              )}
              aria-label="Vue liste"
            >
              <List className="h-4 w-4" />
              <span className="hidden sm:inline text-xs font-medium">
                Liste
              </span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onViewModeChange("cards")}
              className={cn(
                "h-8 px-3 rounded-lg gap-2",
                "transition-colors duration-200",
                viewMode === "cards"
                  ? styles.toggleActive
                  : styles.toggleInactive,
              )}
              aria-label="Vue cards"
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline text-xs font-medium">
                Cards
              </span>
            </Button>
          </div>
        </div>
      )}

      {/* Contenu */}
      {renderContent()}
    </div>
  );
}
