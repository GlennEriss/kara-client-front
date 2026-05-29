"use client";

import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import React from "react";

/**
 * Layout standard pour toutes les pages du dashboard
 * Design système KARA avec animations modernes
 *
 * Structure :
 * - Header avec titre gradient, description et icône optionnelle
 * - Stats (optionnel)
 * - Contenu principal (tabs + contenu)
 */

type LayoutVariant = "default" | "kara" | "minimal";

interface DashboardPageLayoutProps {
  title: string;
  description?: string;
  stats?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  icon?: LucideIcon;
  variant?: LayoutVariant;
}

const variantStyles: Record<
  LayoutVariant,
  {
    container: string;
    header: string;
    title: string;
    description: string;
    iconContainer: string;
  }
> = {
  default: {
    container: "space-y-4 sm:space-y-6 p-3 sm:p-6",
    header: "",
    title:
      "text-2xl font-bold tracking-tight text-[#234D65] sm:text-3xl lg:text-4xl",
    description: "mt-1 text-sm text-gray-500 sm:mt-2 sm:text-base",
    iconContainer: "rounded-xl bg-[#234D65] p-3 shadow-sm",
  },
  kara: {
    container: "space-y-6 p-4 sm:p-6 lg:p-8",
    header: "",
    title:
      "text-2xl font-bold tracking-tight text-[#234D65] sm:text-3xl lg:text-4xl",
    description: "mt-2 text-sm text-gray-500 sm:text-base",
    iconContainer: "rounded-2xl bg-[#234D65] p-3 shadow-sm sm:p-4",
  },
  minimal: {
    container: "space-y-4 p-4 sm:p-6",
    header: "",
    title: "text-xl font-bold text-[#234D65] sm:text-2xl",
    description: "text-sm text-gray-500 mt-1",
    iconContainer: "p-2 rounded-lg bg-gray-100",
  },
};

export function DashboardPageLayout({
  title,
  description,
  stats,
  actions,
  children,
  className,
  icon: Icon,
  variant = "kara",
}: DashboardPageLayoutProps) {
  const styles = variantStyles[variant];

  return (
    <div className={cn(styles.container, className)}>
      {/* Header */}
      <PageHeader
        title={title}
        description={description}
        actions={actions}
        icon={Icon}
        variant={variant}
      />

      {/* Stats (optionnel) */}
      {stats && (
        <section
          className="animate-in fade-in-0 duration-300"
          data-testid="stats-section"
        >
          {stats}
        </section>
      )}

      {/* Contenu principal */}
      <div className="animate-in fade-in-0 duration-300">{children}</div>
    </div>
  );
}

/**
 * En-tête standardisé pour les pages du dashboard
 */
interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
  icon?: LucideIcon;
  variant?: LayoutVariant;
}

export function PageHeader({
  title,
  description,
  actions,
  className,
  icon: Icon,
  variant = "kara",
}: PageHeaderProps) {
  const styles = variantStyles[variant];

  return (
    <header
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        "animate-in fade-in-0 duration-300",
        styles.header,
        className,
      )}
      data-testid="page-header"
    >
      <div className="flex min-w-0 items-start gap-4">
        {/* Icône optionnelle */}
        {Icon && (
          <div className={cn(styles.iconContainer, "shrink-0")}>
            <Icon className="h-6 w-6 text-white sm:h-7 sm:w-7" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h1 className={styles.title} data-testid="page-title">
            {title}
          </h1>
          {description && (
            <p className={styles.description} data-testid="page-description">
              {description}
            </p>
          )}
        </div>
      </div>

      {actions && (
        <div
          className="shrink-0 animate-in fade-in-0 duration-300"
          data-testid="page-actions"
        >
          {actions}
        </div>
      )}
    </header>
  );
}

// Animation keyframes pour le gradient (à ajouter dans globals.css si pas présent)
// @keyframes gradient {
//   0%, 100% { background-position: 0% center; }
//   50% { background-position: 100% center; }
// }
