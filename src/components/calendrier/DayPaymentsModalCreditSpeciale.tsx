"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type {
  CalendarPaymentItemCredit,
  DayPaymentsCredit,
} from "@/hooks/useCalendarCreditSpeciale"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { AlertCircle, Calendar, CheckCircle2, ChevronRight, Clock } from "lucide-react"

interface DayPaymentsModalCreditSpecialeProps {
  isOpen: boolean
  onClose: () => void
  dayPayments: DayPaymentsCredit
  onPaymentClick: (payment: CalendarPaymentItemCredit) => void
}

const COLOR_CONFIG = {
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
  const progressPercentage =
    dayPayments.totalAmount > 0 ? (dayPayments.paidAmount / dayPayments.totalAmount) * 100 : 0

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] p-0 overflow-hidden rounded-2xl">
        <div className="bg-gradient-to-r from-[#234D65] via-[#2c5a73] to-[#1a3a4d] p-6 text-white">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <div className="text-xl font-bold capitalize">
                  {format(dayPayments.date, "EEEE d MMMM yyyy", { locale: fr })}
                </div>
                <div className="text-sm text-white/70 font-normal mt-0.5">
                  {dayPayments.count} échéance{dayPayments.count > 1 ? "s" : ""} à traiter
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="text-xs text-white/60 uppercase tracking-wide">Total</div>
              <div className="text-xl font-bold mt-1">
                {dayPayments.totalAmount.toLocaleString("fr-FR")}
                <span className="text-sm font-normal ml-1">F</span>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="text-xs text-emerald-300 uppercase tracking-wide">Payé</div>
              <div className="text-xl font-bold text-emerald-300 mt-1">
                {dayPayments.paidAmount.toLocaleString("fr-FR")}
                <span className="text-sm font-normal ml-1">F</span>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="text-xs text-orange-300 uppercase tracking-wide">Reste</div>
              <div className="text-xl font-bold text-orange-300 mt-1">
                {dayPayments.remainingAmount.toLocaleString("fr-FR")}
                <span className="text-sm font-normal ml-1">F</span>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-white/60 mb-2">
              <span>Progression</span>
              <span>{Math.round(progressPercentage)}%</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-green-400 rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </div>

        <div className="p-6 max-h-[400px] overflow-y-auto">
          <div className="space-y-2">
            {dayPayments.payments.map((payment) => {
              const colorConfig = COLOR_CONFIG[payment.color]
              const StatusIcon = colorConfig.icon
              return (
                <button
                  key={payment.installment.id}
                  onClick={() => onPaymentClick(payment)}
                  className={cn(
                    "group w-full p-4 rounded-xl border-2 transition-all duration-300 text-left",
                    "hover:shadow-lg hover:-translate-y-0.5",
                    colorConfig.bg,
                    colorConfig.border
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className={cn(
                          "flex items-center justify-center w-10 h-10 rounded-full text-white shadow-lg",
                          colorConfig.badge
                        )}
                      >
                        <StatusIcon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 truncate">
                            {payment.clientDisplayName}
                          </span>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium text-white",
                              colorConfig.badge
                            )}
                          >
                            {STATUS_LABELS[payment.status]}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm">
                          <span className={cn("font-bold", colorConfig.text)}>
                            {payment.amount.toLocaleString("fr-FR")} FCFA
                          </span>
                          <span className="text-gray-400">•</span>
                          <span className="text-gray-500 text-xs">
                            Échéance {payment.installment.installmentNumber}
                          </span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all" />
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

