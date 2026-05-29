/**
 * StatsCard - Composant réutilisable pour les statistiques modernes
 *
 * Utilise les couleurs KARA (bleu institutionnel et accent or)
 * Voir documentation/DESIGN_SYSTEM_COULEURS_KARA.md
 *
 * Utilisé dans :
 * - Caisse spéciale
 * - Géographie V2
 * - Autres modules futurs
 */

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import React from "react";

interface StatsCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  color?: string;
  variant?:
    | "default"
    | "kara-blue"
    | "kara-gold"
    | "success"
    | "warning"
    | "error";
  icon: React.ComponentType<any>;
  onClick?: () => void;
  testId?: string;
  className?: string;
}

const variantStyles = {
  default: {
    bg: "bg-gray-100",
    text: "text-gray-600",
    icon: "text-gray-600",
  },
  "kara-blue": {
    bg: "bg-kara-primary-dark/10",
    text: "text-kara-primary-dark",
    icon: "text-kara-primary-dark",
  },
  "kara-gold": {
    bg: "bg-[#CBB171]/20",
    text: "text-kara-primary-dark",
    icon: "text-[#CBB171]",
  },
  success: {
    bg: "bg-kara-success/10",
    text: "text-kara-success",
    icon: "text-kara-success",
  },
  warning: {
    bg: "bg-kara-warning/10",
    text: "text-kara-warning",
    icon: "text-kara-warning",
  },
  error: {
    bg: "bg-kara-error/10",
    text: "text-kara-error",
    icon: "text-kara-error",
  },
};

export function StatsCard({
  title,
  value,
  subtitle,
  color,
  variant = "kara-blue",
  icon: Icon,
  onClick,
  testId,
  className,
}: StatsCardProps) {
  const styles = variantStyles[variant];

  return (
    <Card
      className={cn(
        "group border border-gray-100 bg-white shadow-sm transition-colors duration-200 hover:border-gray-200",
        onClick && "cursor-pointer",
        className,
      )}
      onClick={onClick}
      data-testid={testId}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-3">
          <div
            className={cn("rounded-xl p-2 sm:p-2.5", color ? "" : styles.bg)}
            style={
              color
                ? { backgroundColor: `${color}15`, color: color }
                : undefined
            }
            aria-hidden="true"
          >
            <Icon
              className={cn("h-4 w-4 sm:h-5 sm:w-5", !color && styles.icon)}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "truncate text-[10px] font-semibold uppercase sm:text-xs",
                styles.text,
              )}
            >
              {title}
            </p>
            <p
              className="mt-0.5 text-xl font-bold text-[#234D65] sm:text-2xl"
              data-testid={testId ? `${testId}-value` : undefined}
            >
              {value}
            </p>
            {subtitle && (
              <p className="mt-0.5 text-[10px] text-gray-500 sm:text-xs">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
