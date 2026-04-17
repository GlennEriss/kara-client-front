"use client"

import CreditPaymentModal from "@/components/credit-speciale/CreditPaymentModal"
import { Button } from "@/components/ui/button"
import type { CalendarPaymentItemCredit } from "@/hooks/useCalendarCreditSpeciale"
import { useQueryClient } from "@tanstack/react-query"
import { Calendar, CreditCard, User, X } from "lucide-react"
import { useState } from "react"

interface PaymentSidebarCreditSpecialeProps {
  payment: CalendarPaymentItemCredit
  onClose: () => void
}

const STATUS_LABELS: Record<CalendarPaymentItemCredit["status"], string> = {
  PENDING: "En attente",
  DUE: "À payer",
  PARTIAL: "Partiel",
  PAID: "Payé",
  OVERDUE: "En retard",
}

export function PaymentSidebarCreditSpeciale({
  payment,
  onClose,
}: PaymentSidebarCreditSpecialeProps) {
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const queryClient = useQueryClient()
  const canRecordPayment =
    payment.status === "DUE" ||
    payment.status === "PARTIAL" ||
    payment.status === "OVERDUE"

  return (
    <>
      <div
        className="fixed right-0 top-0 h-full w-full sm:w-[500px] bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300"
        style={{ boxShadow: "-10px 0 50px -12px rgba(0, 0, 0, 0.25)" }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 left-4 sm:hidden z-10 w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-[#234D65] to-[#2c5a73] text-white">
          <h3 className="text-lg font-semibold">Détail échéance crédit</h3>
          <div className="mt-3 space-y-2 text-sm text-white/90">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              {payment.clientDisplayName}
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {new Date(payment.dueDate).toLocaleDateString("fr-FR")}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="rounded-xl border border-gray-200 p-4">
            <div className="text-xs uppercase text-gray-500">Statut</div>
            <div className="text-base font-semibold text-[#234D65] mt-1">
              {STATUS_LABELS[payment.status]}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 p-4">
            <div className="text-xs uppercase text-gray-500">Échéance</div>
            <div className="text-base font-semibold text-gray-900 mt-1">
              M{payment.installment.installmentNumber}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="text-xs uppercase text-gray-500">Montant dû</div>
              <div className="text-base font-semibold text-gray-900 mt-1">
                {payment.amount.toLocaleString("fr-FR")} FCFA
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="text-xs uppercase text-gray-500">Reste</div>
              <div className="text-base font-semibold text-amber-700 mt-1">
                {payment.remainingAmount.toLocaleString("fr-FR")} FCFA
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-gray-100">
          {canRecordPayment ? (
            <Button
              onClick={() => setShowPaymentModal(true)}
              className="w-full h-12 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white"
            >
              <CreditCard className="h-5 w-5 mr-2" />
              Enregistrer un versement
            </Button>
          ) : (
            <Button disabled className="w-full h-12">
              Échéance déjà soldée
            </Button>
          )}
        </div>
      </div>

      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-in fade-in duration-300"
        onClick={onClose}
      />

      <CreditPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        creditId={payment.contract.id}
        defaultAmount={Math.max(payment.remainingAmount, 0)}
        defaultPaymentDate={new Date(payment.dueDate)}
        installmentId={payment.installment.id}
        installmentNumber={payment.installment.installmentNumber}
        onSuccess={async () => {
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ["calendar-credit-speciale"] }),
            queryClient.invalidateQueries({
              queryKey: ["creditInstallments", "creditId", payment.contract.id],
            }),
            queryClient.invalidateQueries({
              queryKey: ["creditPayments", "creditId", payment.contract.id],
            }),
            queryClient.invalidateQueries({ queryKey: ["creditContract", payment.contract.id] }),
          ])
          setShowPaymentModal(false)
          onClose()
        }}
      />
    </>
  )
}

export default PaymentSidebarCreditSpeciale

