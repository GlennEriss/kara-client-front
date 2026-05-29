import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type PageHeroProps = {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  reference?: string;
  action?: React.ReactNode;
  rightSlot?: React.ReactNode;
  className?: string;
};

export function PageHero({
  title,
  subtitle,
  icon: Icon,
  reference,
  action,
  rightSlot,
  className,
}: PageHeroProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl text-white",
        className
      )}
      style={{
        background: "linear-gradient(135deg, #1e3f56 0%, #234D65 55%, #2c5a73 100%)",
        boxShadow: "0 4px 24px -4px rgba(35,77,101,0.35)",
      }}
    >
      <div
        className="absolute bottom-0 left-0 right-0 h-[2px]"
        style={{ background: "linear-gradient(90deg, transparent, #CBB171 40%, #CBB171 60%, transparent)" }}
        aria-hidden
      />

      <div className="p-5 sm:p-7">
        <div className="flex items-start gap-4">
          {Icon && (
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
              style={{ background: "rgba(203,177,113,0.18)" }}
            >
              <Icon className="h-5 w-5 text-[#CBB171]" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold leading-tight break-words tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1 text-sm text-white/65 break-words">
                {subtitle}
              </p>
            )}
            {reference && (
              <p className="mt-2 text-xs">
                <span className="text-white/45">Référence : </span>
                <span className="font-mono text-white/80 break-all">{reference}</span>
              </p>
            )}
          </div>

          {rightSlot && <div className="shrink-0">{rightSlot}</div>}
        </div>

        {action && <div className="mt-4">{action}</div>}
      </div>
    </div>
  );
}
