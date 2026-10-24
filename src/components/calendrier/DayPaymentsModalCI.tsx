"use client"

import type { CalendarPaymentItemCI, DayPaymentsCI } from "@/hooks/useCalendarCaisseImprevue"
import { useMyAccess } from "@/hooks/useMyAccess"
import { cn } from "@/lib/utils"
import type { CaisseImprevuePaymentFrequency } from "@/types/types"
import { Calendar, CalendarClock, PiggyBank } from "lucide-react"
import { DAY_ITEM_COLORS, DayDetailsModal, DayItemCard, DayItemGroup, type DayGroupColor } from "./DayDetailsModal"

interface DayPaymentsModalCIProps {
  isOpen: boolean
  onClose: () => void
  dayPayments: DayPaymentsCI
  onPaymentClick: (payment: CalendarPaymentItemCI) => void
}

const PAYMENT_FREQUENCY_CONFIG: Record<CaisseImprevuePaymentFrequency, { label: string; color: DayGroupColor; icon: typeof Calendar }> = {
  DAILY: { label: "Journalier", color: "blue", icon: Calendar },
  MONTHLY: { label: "Mensuel", color: "purple", icon: CalendarClock },
}

const STATUS_LABELS = {
  DUE: "À payer",
  PAID: "Payé",
  PARTIAL: "Partiel",
}

export function DayPaymentsModalCI({
  isOpen,
  onClose,
  dayPayments,
  onPaymentClick,
}: DayPaymentsModalCIProps) {
  const { canSeeAmounts } = useMyAccess()
  // Grouper les versements par fréquence de versement
  const groupedByFrequency = dayPayments.payments.reduce(
    (acc, payment) => {
      const frequency = payment.contract.paymentFrequency
      if (!acc[frequency]) {
        acc[frequency] = []
      }
      acc[frequency].push(payment)
      return acc
    },
    {} as Record<CaisseImprevuePaymentFrequency, CalendarPaymentItemCI[]>
  )

  return (
    <DayDetailsModal
      isOpen={isOpen}
      onClose={onClose}
      date={dayPayments.date}
      icon={PiggyBank}
      subtitle={`${dayPayments.count} versement${dayPayments.count > 1 ? "s" : ""} à traiter`}
      totals={{ total: dayPayments.totalAmount, paid: dayPayments.paidAmount, remaining: dayPayments.remainingAmount }}
      showAmounts={canSeeAmounts}
    >
      <div className="space-y-6">
        {(Object.keys(groupedByFrequency) as CaisseImprevuePaymentFrequency[]).map((frequency) => {
          const config = PAYMENT_FREQUENCY_CONFIG[frequency]
          return (
            <DayItemGroup
              key={frequency}
              label={config.label}
              icon={config.icon}
              color={config.color}
              count={groupedByFrequency[frequency].length}
            >
              {groupedByFrequency[frequency].map((payment) => (
                <DayItemCard
                  key={payment.id}
                  color={payment.color}
                  title={payment.memberDisplayName || "Membre inconnu"}
                  status={STATUS_LABELS[payment.status]}
                  onClick={() => onPaymentClick(payment)}
                >
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                    {canSeeAmounts && (
                      <>
                        <span className={cn("font-bold", DAY_ITEM_COLORS[payment.color].text)}>
                          Objectif: {payment.targetAmount.toLocaleString("fr-FR")} F
                        </span>
                        {payment.accumulatedAmount > 0 && (
                          <>
                            <span className="text-gray-400">•</span>
                            <span className="text-xs font-medium text-emerald-600">
                              Accumulé: {payment.accumulatedAmount.toLocaleString("fr-FR")} F
                            </span>
                          </>
                        )}
                      </>
                    )}
                    {payment.monthIndex !== undefined && (
                      <>
                        <span className="text-gray-400">•</span>
                        <span className="text-xs text-gray-500">Mois {payment.monthIndex + 1}</span>
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

export default DayPaymentsModalCI
