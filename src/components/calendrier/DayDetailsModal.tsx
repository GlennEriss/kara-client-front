"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { AlertCircle, CheckCircle2, ChevronRight, Clock, type LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

/** Couleur d'une échéance dans le calendrier (même échelle pour tous les modules). */
export type DayItemColor = "green" | "orange" | "yellow" | "red" | "gray"

export const DAY_ITEM_COLORS: Record<
  DayItemColor,
  { bg: string; border: string; badge: string; text: string; icon: LucideIcon }
> = {
  green: {
    bg: "bg-gradient-to-r from-emerald-50 to-green-50",
    border: "border-emerald-200",
    badge: "bg-emerald-500",
    text: "text-emerald-700",
    icon: CheckCircle2,
  },
  orange: {
    bg: "bg-gradient-to-r from-orange-50 to-amber-50",
    border: "border-orange-200",
    badge: "bg-orange-500",
    text: "text-orange-700",
    icon: Clock,
  },
  yellow: {
    bg: "bg-gradient-to-r from-amber-50 to-yellow-50",
    border: "border-amber-200",
    badge: "bg-amber-500",
    text: "text-amber-700",
    icon: Clock,
  },
  red: {
    bg: "bg-gradient-to-r from-red-50 to-rose-50",
    border: "border-red-200",
    badge: "bg-red-500",
    text: "text-red-700",
    icon: AlertCircle,
  },
  gray: {
    bg: "bg-gradient-to-r from-gray-50 to-slate-50",
    border: "border-gray-200",
    badge: "bg-gray-400",
    text: "text-gray-600",
    icon: Clock,
  },
}

const GROUP_COLORS = {
  blue: { icon: "bg-blue-100 text-blue-600", count: "bg-blue-100 text-blue-700" },
  purple: { icon: "bg-purple-100 text-purple-600", count: "bg-purple-100 text-purple-700" },
  amber: { icon: "bg-amber-100 text-amber-600", count: "bg-amber-100 text-amber-700" },
}

export type DayGroupColor = keyof typeof GROUP_COLORS

interface DayDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  date: Date
  icon: LucideIcon
  /** Ligne sous la date : « 3 versements à traiter ». */
  subtitle: ReactNode
  totals: { total: number; paid: number; remaining: number }
  showAmounts: boolean
  children: ReactNode
}

/**
 * Modale d'un jour du calendrier. L'en-tête (date, totaux, progression) reste
 * fixe ; la liste occupe toute la hauteur restante et défile, quelle que soit
 * la taille de l'écran : rien n'est coupé sous le bas de la modale.
 */
export function DayDetailsModal({ isOpen, onClose, date, icon: Icon, subtitle, totals, showAmounts, children }: DayDetailsModalProps) {
  const progress = totals.total > 0 ? (totals.paid / totals.total) * 100 : 0
  const stats = [
    { label: "Total", value: totals.total, labelClass: "text-white/60", valueClass: "" },
    { label: "Payé", value: totals.paid, labelClass: "text-emerald-300", valueClass: "text-emerald-300" },
    { label: "Reste", value: totals.remaining, labelClass: "text-orange-300", valueClass: "text-orange-300" },
  ]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="flex max-h-[85dvh] w-[95vw] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-3xl">
        <div className="shrink-0 bg-gradient-to-r from-[#234D65] via-[#2c5a73] to-[#1a3a4d] p-6 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-white">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <div className="text-xl font-bold capitalize">{format(date, "EEEE d MMMM yyyy", { locale: fr })}</div>
                <div className="mt-0.5 text-sm font-normal text-white/70">{subtitle}</div>
              </div>
            </DialogTitle>
          </DialogHeader>

          {showAmounts && (
            <div className="mt-4 grid grid-cols-3 gap-2 sm:mt-6 sm:gap-4">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-xl bg-white/10 p-2 backdrop-blur-sm sm:p-4">
                  <div className={cn("text-xs uppercase tracking-wide", stat.labelClass)}>{stat.label}</div>
                  <div className={cn("mt-1 break-words text-sm font-bold sm:text-xl", stat.valueClass)}>
                    {stat.value.toLocaleString("fr-FR")}
                    <span className="ml-1 text-sm font-normal">F</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between text-xs text-white/60">
              <span>Progression</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-green-400 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">{children}</div>
      </DialogContent>
    </Dialog>
  )
}

interface DayItemGroupProps {
  label: string
  icon: LucideIcon
  color: DayGroupColor
  count: number
  children: ReactNode
}

/** Groupe d'échéances (type de caisse, fréquence, mode de règlement). */
export function DayItemGroup({ label, icon: Icon, color, count, children }: DayItemGroupProps) {
  const colors = GROUP_COLORS[color]
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", colors.icon)}>
          <Icon className="h-4 w-4" />
        </div>
        <h3 className="text-sm font-semibold text-gray-900">{label}</h3>
        <span className={cn("rounded-full px-2 py-0.5 text-xs", colors.count)}>{count}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

interface DayItemCardProps {
  color: DayItemColor
  /** Icône de la pastille ; par défaut celle de la couleur. */
  icon?: LucideIcon
  title: string
  status: ReactNode
  onClick: () => void
  /** Lignes sous le nom : montant, mois, numéro d'échéance… */
  children?: ReactNode
}

/** Une échéance du jour ; un clic ouvre son détail. */
export function DayItemCard({ color, icon, title, status, onClick, children }: DayItemCardProps) {
  const colors = DAY_ITEM_COLORS[color]
  const Icon = icon ?? colors.icon
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group w-full rounded-xl border-2 p-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg",
        colors.bg,
        colors.border
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white shadow-lg", colors.badge)}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-semibold text-gray-900">{title}</span>
              <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-white", colors.badge)}>
                {status}
              </span>
            </div>
            {children}
          </div>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-gray-400 transition-all group-hover:translate-x-1 group-hover:text-gray-600" />
      </div>
    </button>
  )
}
