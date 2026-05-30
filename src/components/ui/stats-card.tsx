/**
 * StatsCard - Carte stat horizontale compacte (icône + label/valeur)
 *
 * Utilise les couleurs KARA (bleu institutionnel et accent or)
 * Layout horizontal compact pour un design uniforme à travers l'admin.
 */

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

const variantColors: Record<NonNullable<StatsCardProps["variant"]>, string> = {
  default: "#6b7280",
  "kara-blue": "#234D65",
  "kara-gold": "#CBB171",
  success: "#10b981",
  warning: "#f59e0b",
  error: "#ef4444",
};

export function StatsCard({
  title,
  value,
  color,
  variant = "kara-blue",
  icon: Icon,
  onClick,
  testId,
  className,
}: StatsCardProps) {
  const resolvedColor = color ?? variantColors[variant];

  return (
    <div
      className={cn(
        "group flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-2.5 py-2 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-200",
        onClick && "cursor-pointer",
        className,
      )}
      onClick={onClick}
      data-testid={testId}
    >
      <div
        className="p-1.5 rounded-lg shrink-0 transition-transform duration-200 group-hover:scale-110"
        style={{ backgroundColor: `${resolvedColor}15`, color: resolvedColor }}
        aria-hidden="true"
      >
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 truncate">
          {title}
        </p>
        <p
          className="text-sm font-black text-gray-900 tabular-nums whitespace-nowrap"
          data-testid={testId ? `${testId}-value` : undefined}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
