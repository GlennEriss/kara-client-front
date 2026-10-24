"use client"

import type { CalendarPaymentItem, DayPayments } from "@/hooks/useCalendarCaisseSpeciale"
import { useMyAccess } from "@/hooks/useMyAccess"
import { cn } from "@/lib/utils"
import type { CaisseType } from "@/services/caisse/types"
import { Calendar, Users, Wallet, XCircle } from "lucide-react"
import { DAY_ITEM_COLORS, DayDetailsModal, DayItemCard, DayItemGroup, type DayGroupColor } from "./DayDetailsModal"

interface DayPaymentsModalProps {
  isOpen: boolean
  onClose: () => void
  dayPayments: DayPayments
  onPaymentClick: (payment: CalendarPaymentItem) => void
}

const CAISSE_TYPE_CONFIG: Record<CaisseType, { label: string; color: DayGroupColor; icon: typeof Calendar }> = {
  JOURNALIERE: { label: "Journalier", color: "blue", icon: Calendar },
  STANDARD: { label: "Standard", color: "purple", icon: Wallet },
  LIBRE: { label: "Libre", color: "amber", icon: Users },
  STANDARD_CHARITABLE: { label: "Standard Charitable", color: "purple", icon: Wallet },
  JOURNALIERE_CHARITABLE: { label: "Journalière Charitable", color: "blue", icon: Calendar },
  LIBRE_CHARITABLE: { label: "Libre Charitable", color: "amber", icon: Users },
}

const STATUS_LABELS = {
  DUE: "À payer",
  PAID: "Payé",
  REFUSED: "Refusé",
}

export function DayPaymentsModal({
  isOpen,
  onClose,
  dayPayments,
  onPaymentClick,
}: DayPaymentsModalProps) {
  const { canSeeAmounts } = useMyAccess()
  // Grouper les versements par type de contrat
  const groupedByType = dayPayments.payments.reduce(
    (acc, payment) => {
      const type = payment.contract.caisseType
      if (!acc[type]) {
        acc[type] = []
      }
      acc[type].push(payment)
      return acc
    },
    {} as Record<CaisseType, CalendarPaymentItem[]>
  )

  return (
    <DayDetailsModal
      isOpen={isOpen}
      onClose={onClose}
      date={dayPayments.date}
      icon={Calendar}
      subtitle={`${dayPayments.count} versement${dayPayments.count > 1 ? "s" : ""} à traiter`}
      totals={{ total: dayPayments.totalAmount, paid: dayPayments.paidAmount, remaining: dayPayments.remainingAmount }}
      showAmounts={canSeeAmounts}
    >
      <div className="space-y-6">
        {(Object.keys(groupedByType) as CaisseType[]).map((type) => {
          const config = CAISSE_TYPE_CONFIG[type]
          return (
            <DayItemGroup key={type} label={config.label} icon={config.icon} color={config.color} count={groupedByType[type].length}>
              {groupedByType[type].map((payment) => (
                <DayItemCard
                  key={payment.id}
                  color={payment.color}
                  icon={payment.color === "gray" ? XCircle : undefined}
                  title={payment.memberDisplayName || payment.groupDisplayName || "Membre inconnu"}
                  status={STATUS_LABELS[payment.status]}
                  onClick={() => onPaymentClick(payment)}
                >
                  <div className="mt-1 flex items-center gap-3 text-sm">
                    {canSeeAmounts && (
                      <span className={cn("font-bold", DAY_ITEM_COLORS[payment.color].text)}>
                        {payment.amount.toLocaleString("fr-FR")} FCFA
                      </span>
                    )}
                    {payment.dueMonthIndex !== undefined && (
                      <>
                        <span className="text-gray-400">•</span>
                        <span className="text-xs text-gray-500">Mois {payment.dueMonthIndex + 1}</span>
                      </>
                    )}
                  </div>
                </DayItemCard>
              ))}
            </DayItemGroup>
          )
        })}
      </div>
    </DayDetailsModal>
  )
}

export default DayPaymentsModal
