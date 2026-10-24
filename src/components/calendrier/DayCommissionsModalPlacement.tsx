"use client"

import type { CalendarCommissionItem, DayCommissions } from "@/hooks/useCalendarPlacement"
import { isCapitalRestitution } from "@/hooks/useCalendarPlacement"
import { useMyAccess } from "@/hooks/useMyAccess"
import { cn } from "@/lib/utils"
import type { PayoutMode } from "@/types/types"
import { roundFcfa } from "@/utils/placementMoney"
import { Calendar, PiggyBank, TrendingUp, Wallet } from "lucide-react"
import { DAY_ITEM_COLORS, DayDetailsModal, DayItemCard, DayItemGroup, type DayGroupColor } from "./DayDetailsModal"

interface DayCommissionsModalPlacementProps {
  isOpen: boolean
  onClose: () => void
  dayCommissions: DayCommissions
  onCommissionClick: (commission: CalendarCommissionItem) => void
}

const PAYOUT_MODE_CONFIG: Record<PayoutMode, { label: string; icon: typeof TrendingUp; color: DayGroupColor }> = {
  MonthlyCommission_CapitalEnd: { label: "Commission mensuelle", icon: Calendar, color: "blue" },
  CapitalPlusCommission_End: { label: "Capital + Commissions", icon: TrendingUp, color: "purple" },
}

const STATUS_LABELS = {
  Due: "À payer",
  Paid: "Payé",
  Partial: "Partiel",
  Canceled: "Annulé",
}

export function DayCommissionsModalPlacement({
  isOpen,
  onClose,
  dayCommissions,
  onCommissionClick,
}: DayCommissionsModalPlacementProps) {
  const { canSeeAmounts } = useMyAccess()
  // Grouper les commissions par mode de règlement
  const groupedByMode = dayCommissions.commissions.reduce(
    (acc, commission) => {
      const mode = commission.placement.payoutMode
      if (!acc[mode]) {
        acc[mode] = []
      }
      acc[mode].push(commission)
      return acc
    },
    {} as Record<PayoutMode, CalendarCommissionItem[]>
  )

  return (
    <DayDetailsModal
      isOpen={isOpen}
      onClose={onClose}
      date={dayCommissions.date}
      icon={Calendar}
      subtitle={
        <>
          {dayCommissions.count} échéance{dayCommissions.count > 1 ? "s" : ""} à traiter
          {canSeeAmounts && dayCommissions.capitalAmount > 0 && (
            <> · dont {roundFcfa(dayCommissions.capitalAmount).toLocaleString("fr-FR")} F de capital</>
          )}
        </>
      }
      totals={{ total: dayCommissions.totalAmount, paid: dayCommissions.paidAmount, remaining: dayCommissions.remainingAmount }}
      showAmounts={canSeeAmounts}
    >
      <div className="space-y-6">
        {(Object.keys(groupedByMode) as PayoutMode[]).map((mode) => {
          const config = PAYOUT_MODE_CONFIG[mode]
          return (
            <DayItemGroup key={mode} label={config.label} icon={config.icon} color={config.color} count={groupedByMode[mode].length}>
              {groupedByMode[mode].map((commission) => {
                const colors = DAY_ITEM_COLORS[commission.color]
                const StatusIcon = colors.icon
                const isCapital = isCapitalRestitution(commission)
                return (
                  <DayItemCard
                    key={commission.id}
                    color={commission.color}
                    icon={isCapital ? PiggyBank : Wallet}
                    title={commission.benefactorDisplayName || "Bienfaiteur inconnu"}
                    status={
                      <>
                        <StatusIcon className="h-3 w-3" />
                        {STATUS_LABELS[commission.status]}
                      </>
                    }
                    onClick={() => onCommissionClick(commission)}
                  >
                    <div className="mt-1 flex items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
                          isCapital ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600"
                        )}
                      >
                        {isCapital ? "Restitution du capital" : "Commission"}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-sm">
                      {canSeeAmounts && (
                        <>
                          <span className={cn("font-bold", colors.text)}>
                            {roundFcfa(commission.paidAmount ?? commission.amount).toLocaleString("fr-FR")} FCFA
                          </span>
                          <span className="text-gray-400">•</span>
                        </>
                      )}
                      <span className="text-xs text-gray-500">Placement #{commission.placement.id.slice(-8)}</span>
                    </div>
                  </DayItemCard>
                )
              })}
            </DayItemGroup>
          )
        })}
      </div>
    </DayDetailsModal>
  )
}
