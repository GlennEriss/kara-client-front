"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

/**
 * Composant de pagination standardisé et réutilisable
 * Design système KARA avec animations modernes
 *
 * Features :
 * - Navigation avec boutons animés
 * - Numéros de pages avec ellipses
 * - Sélecteur d'items par page
 * - Variantes de style (default, kara, minimal)
 * - Animations fluides
 */

type PaginationVariant = "default" | "kara" | "minimal";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (limit: number) => void;
  itemsPerPageOptions?: number[];
  showInfo?: boolean;
  showItemsPerPage?: boolean;
  isLoading?: boolean;
  className?: string;
  infoLabel?: string;
  variant?: PaginationVariant;
}

const DEFAULT_ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

const variantStyles: Record<
  PaginationVariant,
  {
    container: string;
    info: string;
    button: string;
    buttonActive: string;
    buttonDisabled: string;
    select: string;
  }
> = {
  default: {
    container: "",
    info: "text-gray-600",
    button: cn(
      "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
      "transition-colors duration-200",
    ),
    buttonActive: "border-[#234D65] bg-[#234D65] text-white hover:bg-[#1A3D4F]",
    buttonDisabled: "opacity-50 cursor-not-allowed",
    select: "border-gray-300",
  },
  kara: {
    container: "",
    info: "text-gray-600",
    button: cn(
      "border-gray-200 bg-white text-gray-700",
      "hover:border-[#234D65]/40 hover:bg-[#234D65]/5 hover:text-[#234D65]",
      "transition-colors duration-200",
    ),
    buttonActive:
      "border-[#234D65] bg-[#234D65] text-white shadow-sm hover:bg-[#1A3D4F]",
    buttonDisabled:
      "cursor-not-allowed opacity-40 hover:bg-white hover:text-gray-700",
    select: "border-gray-300 focus:border-[#234D65]",
  },
  minimal: {
    container: "",
    info: "text-gray-500",
    button: cn("border-0 hover:bg-gray-100", "transition-colors duration-200"),
    buttonActive: "bg-[#234D65] text-white hover:bg-[#1A3D4F]",
    buttonDisabled: "opacity-50 cursor-not-allowed",
    select: "border-0 bg-gray-100",
  },
};

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  itemsPerPageOptions = DEFAULT_ITEMS_PER_PAGE_OPTIONS,
  showInfo = true,
  showItemsPerPage = true,
  isLoading = false,
  className,
  infoLabel = "résultats",
  variant = "kara",
}: PaginationProps) {
  const styles = variantStyles[variant];

  const startIndex = totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endIndex = Math.min(currentPage * itemsPerPage, totalItems);

  const getPageNumbers = () => {
    const delta = 2;
    const pages: number[] = [];

    if (totalPages === 0) return pages;
    pages.push(1);
    if (totalPages === 1) return pages;

    const start = Math.max(2, currentPage - delta);
    const end = Math.min(totalPages - 1, currentPage + delta);

    if (start > 2) pages.push(-1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages - 1) pages.push(-1);
    if (totalPages > 1) pages.push(totalPages);

    return pages;
  };

  const pageNumbers = getPageNumbers();
  const hasPrevPage = currentPage > 1;
  const hasNextPage = currentPage < totalPages;

  if (totalPages === 0 && totalItems === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0",
        "animate-in fade-in-0 duration-300",
        styles.container,
        className,
      )}
      data-testid="pagination"
    >
      {/* Informations */}
      {showInfo && (
        <div
          className={cn(
            "flex items-center space-x-2 text-sm font-medium",
            styles.info,
          )}
        >
          <span>
            {totalItems > 0 ? (
              <>
                Affichage de{" "}
                <span className="font-bold text-[#234D65]">{startIndex}</span> à{" "}
                <span className="font-bold text-[#234D65]">{endIndex}</span> sur{" "}
                <span className="font-bold text-[#234D65]">{totalItems}</span>{" "}
                {infoLabel}
              </>
            ) : (
              `Aucun ${infoLabel} trouvé`
            )}
          </span>
        </div>
      )}

      {/* Contrôles */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:space-x-4 sm:space-y-0">
        {/* Items par page */}
        {showItemsPerPage && onItemsPerPageChange && (
          <div className="flex items-center space-x-2">
            <span className={cn("text-sm", styles.info)}>Afficher</span>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => onItemsPerPageChange(parseInt(value))}
              disabled={isLoading}
            >
              <SelectTrigger className={cn("h-9 w-20", styles.select)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {itemsPerPageOptions.map((option) => (
                  <SelectItem key={option} value={option.toString()}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className={cn("text-sm", styles.info)}>par page</span>
          </div>
        )}

        {/* Navigation */}
        {totalPages > 1 && (
          <div className="flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(1)}
              disabled={!hasPrevPage || isLoading}
              className={cn(
                "h-9 w-9 p-0",
                styles.button,
                !hasPrevPage && styles.buttonDisabled,
              )}
              aria-label="Première page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={!hasPrevPage || isLoading}
              className={cn(
                "h-9 w-9 p-0",
                styles.button,
                !hasPrevPage && styles.buttonDisabled,
              )}
              aria-label="Page précédente"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {/* Numéros de page */}
            <div className="flex items-center space-x-1">
              {pageNumbers.map((pageNum, index) => {
                if (pageNum === -1) {
                  return (
                    <span
                      key={`ellipsis-${index}`}
                      className="select-none px-2 text-gray-400"
                      aria-hidden="true"
                    >
                      •••
                    </span>
                  );
                }

                const isActive = pageNum === currentPage;

                return (
                  <Button
                    key={pageNum}
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(pageNum)}
                    disabled={isLoading}
                    className={cn(
                      "h-9 w-9 p-0 font-semibold",
                      isActive ? styles.buttonActive : styles.button,
                      "transition-colors duration-200",
                    )}
                    aria-label={`Page ${pageNum}`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={!hasNextPage || isLoading}
              className={cn(
                "h-9 w-9 p-0",
                styles.button,
                !hasNextPage && styles.buttonDisabled,
              )}
              aria-label="Page suivante"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(totalPages)}
              disabled={!hasNextPage || isLoading}
              className={cn(
                "h-9 w-9 p-0",
                styles.button,
                !hasNextPage && styles.buttonDisabled,
              )}
              aria-label="Dernière page"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
