"use client"

import type {
  CalendarPaymentItemCredit,
  DayPaymentsCredit,
} from "@/hooks/useCalendarCreditSpeciale"
import { useMyAccess } from "@/hooks/useMyAccess"
import { cn } from "@/lib/utils"
import { Calendar } from "lucide-react"
import { DAY_ITEM_COLORS, DayDetailsModal, DayItemCard } from "./DayDetailsModal"

interface DayPaymentsModalCreditSpecialeProps {
  isOpen: boolean
  onClose: () => void
  dayPayments: DayPaymentsCredit
  onPaymentClick: (payment: CalendarPaymentItemCredit) => void
}

const STATUS_LABELS: Record<CalendarPaymentItemCredit["status"], string> = {
  PENDING: "En attente",
  DUE: "À payer",
  PARTIAL: "Partiel",
  PAID: "Payé",
  OVERDUE: "En retard",
}

export function DayPaymentsModalCreditSpeciale({
  isOpen,
  onClose,
  dayPayments,
  onPaymentClick,
}: DayPaymentsModalCreditSpecialeProps) {
  const { canSeeAmounts } = useMyAccess()

  return (
    <DayDetailsModal
      isOpen={isOpen}
      onClose={onClose}
      date={dayPayments.date}
      icon={Calendar}
      subtitle={`${dayPayments.count} échéance${dayPayments.count > 1 ? "s" : ""} à traiter`}
      totals={{ total: dayPayments.totalAmount, paid: dayPayments.paidAmount, remaining: dayPayments.remainingAmount }}
      showAmounts={canSeeAmounts}
    >
      <div className="space-y-2">
        {dayPayments.payments.map((payment) => (
          <DayItemCard
            key={payment.installment.id}
            color={payment.color}
            title={payment.clientDisplayName}
            status={STATUS_LABELS[payment.status]}
            onClick={() => onPaymentClick(payment)}
          >
            <div className="mt-1 flex items-center gap-3 text-sm">
              {canSeeAmounts && (
                <>
                  <span className={cn("font-bold", DAY_ITEM_COLORS[payment.color].text)}>
                    {payment.amount.toLocaleString("fr-FR")} FCFA
                  </span>
                  <span className="text-gray-400">•</span>
                </>
              )}
              <span className="text-xs text-gray-500">Échéance {payment.installment.installmentNumber}</span>
            </div>
          </DayItemCard>
        ))}
      </div>
    </DayDetailsModal>
  )
}
