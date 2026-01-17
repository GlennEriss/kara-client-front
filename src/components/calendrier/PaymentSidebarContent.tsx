"use client"

import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Calendar, CreditCard, Clock, CheckCircle2, PiggyBank, AlertTriangle } from "lucide-react"
import type { CalendarPaymentItem } from "@/hooks/useCalendarCaisseSpeciale"
import { useContractPayments } from "@/hooks/useContractPayments"

interface PaymentSidebarContentProps {
  payment: CalendarPaymentItem
  showReceipt: boolean
  receiptUrl?: string | null
}

const COLOR_CONFIG = {
  green: { bg: "bg-emerald-500", text: "text-emerald-700", light: "bg-emerald-50" },
  orange: { bg: "bg-orange-500", text: "text-orange-700", light: "bg-orange-50" },
  yellow: { bg: "bg-amber-500", text: "text-amber-700", light: "bg-amber-50" },
  red: { bg: "bg-red-500", text: "text-red-700", light: "bg-red-50" },
  gray: { bg: "bg-gray-400", text: "text-gray-600", light: "bg-gray-50" },
}

const STATUS_LABELS = {
  DUE: "À payer",
  PAID: "Payé",
  REFUSED: "Refusé",
}

const PAYMENT_MODE_LABELS: Record<string, string> = {
  airtel_money: "Airtel Money",
  mobicash: "Mobicash",
  cash: "Espèces",
  bank_transfer: "Virement bancaire",
}

export function PaymentSidebarContent({
  payment,
  showReceipt,
  receiptUrl,
}: PaymentSidebarContentProps) {
  const { payments: allPayments, isLoading } = useContractPayments(
    payment.contract.id || ""
  )

  // Filtrer les versements précédents et suivants
  const previousPayments = allPayments
    .filter((p) => p.dueMonthIndex < payment.dueMonthIndex)
    .sort((a, b) => b.dueMonthIndex - a.dueMonthIndex)
    .slice(0, 3)

  const nextPayments = allPayments
    .filter((p) => p.dueMonthIndex > payment.dueMonthIndex)
    .sort((a, b) => a.dueMonthIndex - b.dueMonthIndex)
    .slice(0, 3)

  const _colorConfig = COLOR_CONFIG[payment.color]
  const isPaid = payment.status === "PAID"

  // Calcul du progrès
  const progressPercent = payment.contract.monthsPlanned > 0
    ? (payment.contract.currentMonthIndex / payment.contract.monthsPlanned) * 100
    : 0

  return (
    <div className="p-5 space-y-5">
      {/* Versement actuel */}
      <div className={cn(
        "relative overflow-hidden rounded-2xl border-2 p-5",
        isPaid 
          ? "bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200" 
          : "bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200"
      )}>
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white/40 to-transparent rounded-bl-full" />
        
        <div className="flex items-center gap-3 mb-4">
          <div className={cn(
            "flex items-center justify-center w-12 h-12 rounded-xl text-white shadow-lg",
            isPaid ? "bg-gradient-to-br from-emerald-500 to-green-600" : "bg-gradient-to-br from-orange-500 to-amber-600"
          )}>
            {isPaid ? <CheckCircle2 className="h-6 w-6" /> : <Clock className="h-6 w-6" />}
          </div>
          <div>
            <h3 className={cn(
              "font-bold text-lg",
              isPaid ? "text-emerald-900" : "text-orange-900"
            )}>
              Mois {payment.dueMonthIndex + 1}
            </h3>
            <span className={cn(
              "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold",
              isPaid 
                ? "bg-emerald-500 text-white" 
                : "bg-orange-500 text-white"
            )}>
              {STATUS_LABELS[payment.status]}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className={cn("text-sm", isPaid ? "text-emerald-700" : "text-orange-700")}>
              Date d'échéance
            </span>
            <span className={cn("text-sm font-semibold", isPaid ? "text-emerald-900" : "text-orange-900")}>
              {format(payment.dueAt, "dd MMMM yyyy", { locale: fr })}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className={cn("text-sm", isPaid ? "text-emerald-700" : "text-orange-700")}>
              Montant
            </span>
            <span className={cn("text-lg font-bold", isPaid ? "text-emerald-900" : "text-orange-900")}>
              {payment.amount.toLocaleString("fr-FR")} FCFA
            </span>
          </div>

          {payment.paidAt && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-emerald-700">Date de paiement</span>
              <span className="text-sm font-semibold text-emerald-900">
                {format(payment.paidAt, "dd MMMM yyyy", { locale: fr })}
              </span>
            </div>
          )}

          {payment.mode && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-emerald-700">Mode de paiement</span>
              <span className="text-sm font-semibold text-emerald-900">
                {PAYMENT_MODE_LABELS[payment.mode] || payment.mode}
              </span>
            </div>
          )}

          {payment.penaltyDays && payment.penaltyDays > 0 && (
            <div className="mt-3 p-3 bg-red-100 rounded-lg border border-red-200">
              <div className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {payment.penaltyDays} jour(s) de retard
                </span>
              </div>
              {payment.penaltyApplied && payment.penaltyApplied > 0 && (
                <div className="text-sm text-red-600 mt-1">
                  Pénalité: {payment.penaltyApplied.toLocaleString("fr-FR")} FCFA
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Statistiques du contrat */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <PiggyBank className="h-4 w-4 text-[#234D65]" />
          Statistiques du contrat
        </h4>
        
        {/* Barre de progression */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Progression</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#234D65] to-[#2c5a73] rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl">
            <div className="text-xs text-emerald-600 mb-1">Payé</div>
            <div className="text-sm font-bold text-emerald-900">
              {payment.contract.nominalPaid.toLocaleString("fr-FR")}
            </div>
          </div>
          <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
            <div className="text-xs text-blue-600 mb-1">Bonus</div>
            <div className="text-sm font-bold text-blue-900">
              {payment.contract.bonusAccrued.toLocaleString("fr-FR")}
            </div>
          </div>
          <div className="text-center p-3 bg-gradient-to-br from-red-50 to-rose-50 rounded-xl">
            <div className="text-xs text-red-600 mb-1">Pénalités</div>
            <div className="text-sm font-bold text-red-900">
              {payment.contract.penaltiesTotal.toLocaleString("fr-FR")}
            </div>
          </div>
        </div>
      </div>

      {/* Historique des versements */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-[#234D65]" />
          Historique des versements
        </h4>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#234D65]" />
          </div>
        ) : (
          <div className="space-y-4">
            {previousPayments.length > 0 && (
              <div>
                <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Versements précédents
                </h5>
                <div className="space-y-2">
                  {previousPayments.map((p) => (
                    <div
                      key={p.id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl border transition-all hover:shadow-md",
                        p.status === "PAID" 
                          ? "bg-emerald-50/50 border-emerald-100" 
                          : "bg-orange-50/50 border-orange-100"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold",
                          p.status === "PAID" ? "bg-emerald-500" : "bg-orange-500"
                        )}>
                          {p.status === "PAID" ? "✓" : p.dueMonthIndex + 1}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            Mois {p.dueMonthIndex + 1}
                          </div>
                          <div className="text-xs text-gray-500">
                            {format(p.dueAt, "dd/MM/yyyy", { locale: fr })}
                          </div>
                        </div>
                      </div>
                      <span className={cn(
                        "text-xs px-2 py-1 rounded-full font-medium",
                        p.status === "PAID" 
                          ? "bg-emerald-100 text-emerald-700" 
                          : "bg-orange-100 text-orange-700"
                      )}>
                        {STATUS_LABELS[p.status]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {nextPayments.length > 0 && (
              <div>
                <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Versements suivants
                </h5>
                <div className="space-y-2">
                  {nextPayments.map((p) => (
                    <div
                      key={p.id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl border transition-all hover:shadow-md",
                        p.status === "PAID" 
                          ? "bg-emerald-50/50 border-emerald-100" 
                          : "bg-gray-50/50 border-gray-100"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold",
                          p.status === "PAID" ? "bg-emerald-500" : "bg-gray-400"
                        )}>
                          {p.status === "PAID" ? "✓" : p.dueMonthIndex + 1}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            Mois {p.dueMonthIndex + 1}
                          </div>
                          <div className="text-xs text-gray-500">
                            {format(p.dueAt, "dd/MM/yyyy", { locale: fr })}
                          </div>
                        </div>
                      </div>
                      <span className={cn(
                        "text-xs px-2 py-1 rounded-full font-medium",
                        p.status === "PAID" 
                          ? "bg-emerald-100 text-emerald-700" 
                          : "bg-gray-100 text-gray-600"
                      )}>
                        {STATUS_LABELS[p.status]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Affichage du reçu PDF */}
      {showReceipt && receiptUrl && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-[#234D65]" />
            Reçu de paiement
          </h4>
          <iframe
            src={receiptUrl}
            className="w-full h-[500px] border border-gray-200 rounded-xl"
            title="Reçu de paiement"
          />
        </div>
      )}
    </div>
  )
}
