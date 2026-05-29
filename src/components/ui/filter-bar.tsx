"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Filter, RotateCcw, X } from "lucide-react";
import React from "react";

/**
 * Configuration d'un filtre
 */
export interface FilterConfig {
  key: string;
  label: string;
  type: "select" | "date" | "daterange" | "checkbox" | "multiselect";
  options?: { value: string; label: string; icon?: React.ReactNode }[];
  placeholder?: string;
  className?: string;
}

/**
 * Barre de filtres horizontale standardisée
 * Design système KARA avec animations modernes
 *
 * Features :
 * - Filtres Select avec icônes optionnelles
 * - Badges animés pour filtres actifs
 * - Bouton "Réinitialiser" avec animation
 * - Variantes de style (default, kara, compact)
 */

type FilterBarVariant = "default" | "kara" | "compact";

interface FilterBarProps {
  filters: FilterConfig[];
  values: Record<string, any>;
  onChange: (filterKey: string, value: any) => void;
  onReset?: () => void;
  className?: string;
  showActiveFilters?: boolean;
  resetLabel?: string;
  variant?: FilterBarVariant;
  showIcon?: boolean;
}

const variantStyles: Record<
  FilterBarVariant,
  {
    container: string;
    select: string;
    badge: string;
    badgeRemove: string;
    resetButton: string;
    label: string;
  }
> = {
  default: {
    container: "",
    select: "border-gray-300 focus:border-[#234D65]",
    badge: "border-gray-200 bg-gray-50 text-gray-700",
    badgeRemove: "hover:text-red-500",
    resetButton: "border-gray-200 text-gray-700 hover:bg-gray-50",
    label: "text-gray-700",
  },
  kara: {
    container: "",
    select:
      "border-gray-300 bg-white focus:border-[#234D65] focus:ring-[#234D65]/20",
    badge: "border-[#234D65]/20 bg-[#234D65]/10 text-[#234D65]",
    badgeRemove: "hover:bg-red-50 hover:text-red-600",
    resetButton:
      "border-[#234D65]/30 text-[#234D65] hover:bg-[#234D65] hover:text-white",
    label: "font-medium text-[#234D65]",
  },
  compact: {
    container: "",
    select:
      "border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#234D65]/20",
    badge: "border-0 bg-[#234D65]/10 text-[#234D65]",
    badgeRemove: "hover:text-red-500",
    resetButton: "border-0 bg-gray-100 hover:bg-gray-200 text-gray-700",
    label: "text-xs font-medium uppercase text-gray-500",
  },
};

export function FilterBar({
  filters,
  values,
  onChange,
  onReset,
  className,
  showActiveFilters = true,
  resetLabel = "Réinitialiser",
  variant = "kara",
  showIcon = true,
}: FilterBarProps) {
  const styles = variantStyles[variant];

  const activeFiltersCount = filters.filter((filter) => {
    const value = values[filter.key];
    return (
      value !== undefined && value !== null && value !== "" && value !== "all"
    );
  }).length;

  const handleFilterChange = (key: string, value: string) => {
    onChange(key, value === "all" ? undefined : value);
  };

  const renderFilter = (filter: FilterConfig) => {
    const value = values[filter.key] || "all";

    switch (filter.type) {
      case "select":
        if (!filter.options) {
          console.warn(
            `Filter ${filter.key} de type 'select' n'a pas d'options`,
          );
          return null;
        }

        return (
          <div
            key={filter.key}
            className={cn(
              "space-y-1.5",
              "animate-in fade-in-0 duration-300",
              filter.className,
            )}
          >
            <label className={cn("text-xs font-medium", styles.label)}>
              {filter.label}
            </label>
            <Select
              value={value}
              onValueChange={(val) => handleFilterChange(filter.key, val)}
            >
              <SelectTrigger
                className={cn("h-10 w-full sm:w-[180px]", styles.select)}
              >
                <SelectValue
                  placeholder={
                    filter.placeholder ||
                    `Tous les ${filter.label.toLowerCase()}`
                  }
                />
              </SelectTrigger>
              <SelectContent className="animate-in fade-in-0 zoom-in-95 duration-200">
                <SelectItem value="all" className="font-medium">
                  Tous
                </SelectItem>
                {filter.options.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    className="flex items-center gap-2"
                  >
                    {option.icon && <span className="mr-2">{option.icon}</span>}
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      default:
        console.warn(`Type de filtre non supporté: ${filter.type}`);
        return null;
    }
  };

  return (
    <div className={cn("space-y-3", className)} data-testid="filter-bar">
      {/* Barre de filtres */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
        {/* Icône filter (optionnel) */}
        {showIcon && variant === "kara" && (
          <div className="hidden sm:flex items-end pb-0.5">
            <div
              className={cn(
                "rounded-xl bg-[#234D65] p-2.5 shadow-sm",
                activeFiltersCount > 0 &&
                  "ring-2 ring-[#CBB171]/70 ring-offset-2",
              )}
            >
              <Filter className="h-4 w-4 text-white" />
            </div>
          </div>
        )}

        {filters.map(renderFilter)}

        {/* Bouton réinitialiser */}
        {onReset && activeFiltersCount > 0 && (
          <div className="flex animate-in items-end fade-in-0 duration-300">
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              className={cn("h-10 w-full sm:w-auto gap-2", styles.resetButton)}
            >
              <RotateCcw className="h-4 w-4" />
              {resetLabel}
            </Button>
          </div>
        )}
      </div>

      {/* Affichage des filtres actifs (badges) */}
      {showActiveFilters && activeFiltersCount > 0 && (
        <div className="flex animate-in flex-wrap items-center gap-2 fade-in-0 duration-300">
          <span
            className={cn(
              "text-xs font-semibold uppercase tracking-wider",
              styles.label,
            )}
          >
            Filtres actifs :
          </span>
          {filters.map((filter) => {
            const value = values[filter.key];
            if (!value || value === "all") return null;

            const option = filter.options?.find((opt) => opt.value === value);
            const displayLabel = option?.label || value;

            return (
              <Badge
                key={filter.key}
                variant="outline"
                className={cn(
                  "gap-1.5 px-3 py-1.5 text-xs font-medium",
                  "animate-in fade-in-0 duration-200",
                  styles.badge,
                )}
              >
                {option?.icon && (
                  <span className="opacity-70">{option.icon}</span>
                )}
                <span className="font-semibold">{filter.label}:</span>
                <span>{displayLabel}</span>
                <button
                  type="button"
                  onClick={() => onChange(filter.key, undefined)}
                  className={cn(
                    "ml-1 rounded-full p-0.5",
                    "transition-colors duration-200",
                    styles.badgeRemove,
                  )}
                  aria-label={`Supprimer le filtre ${filter.label}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
