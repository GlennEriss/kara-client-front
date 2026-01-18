"use client"

import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Calendar, CreditCard, Clock, CheckCircle2, PiggyBank, Receipt } from "lucide-react"
import type { CalendarPaymentItemCI } from "@/hooks/useCalendarCaisseImprevue"
import { usePaymentsCI } from "@/hooks/caisse-imprevue/usePaymentsCI"

interface PaymentSidebarContentCIProps {
  payment: CalendarPaymentItemCI
  showReceipt: boolean
  receiptUrl?: string | null
}

const STATUS_LABELS = {
  DUE: "À payer",
  PAID: "Payé",
  PARTIAL: "Partiel",
}

const PAYMENT_MODE_LABELS: Record<string, string> = {
  airtel_money: "Airtel Money",
  mobicash: "Mobicash",
  cash: "Espèces",
  bank_transfer: "Virement bancaire",
}

export function PaymentSidebarContentCI({
  payment,
  showReceipt,
  receiptUrl,
}: PaymentSidebarContentCIProps) {
  const { data: allPayments = [], isLoading } = usePaymentsCI(
    payment.contract.id
  )

  // Filtrer les versements précédents et suivants
  const previousPayments = allPayments
    .filter((p) => p.monthIndex < payment.monthIndex)
    .sort((a, b) => b.monthIndex - a.monthIndex)
    .slice(0, 3)

  const nextPayments = allPayments
    .filter((p) => p.monthIndex > payment.monthIndex)
    .sort((a, b) => a.monthIndex - b.monthIndex)
    .slice(0, 3)

  // Calculer les statistiques du contrat
  const totalPaid = allPayments.reduce((sum, p) => {
    if (p.status === 'PAID' || (p.status === 'PARTIAL' && p.accumulatedAmount >= p.targetAmount)) {
      return sum + p.accumulatedAmount
    }
    return sum
  }, 0)

  const isPaid = payment.status === "PAID" || 
    (payment.status === "PARTIAL" && payment.accumulatedAmount >= payment.targetAmount)
  
  const progressPercent = payment.targetAmount > 0
    ? Math.min((payment.accumulatedAmount / payment.targetAmount) * 100, 100)
    : 0

  const contractProgressPercent = payment.contract.subscriptionCIDuration > 0
    ? (payment.contract.totalMonthsPaid / payment.contract.subscriptionCIDuration) * 100
    : 0

  return (
    <div className="p-5 space-y-5">
      {/* Versement actuel */}
      <div className={cn(
        "relative overflow-hidden rounded-2xl border-2 p-5",
        isPaid 
          ? "bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200" 
          : payment.status === "PARTIAL"
          ? "bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200"
          : "bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200"
      )}>
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white/40 to-transparent rounded-bl-full" />
        
        <div className="flex items-center gap-3 mb-4">
          <div className={cn(
            "flex items-center justify-center w-12 h-12 rounded-xl text-white shadow-lg",
            isPaid 
              ? "bg-gradient-to-br from-emerald-500 to-green-600" 
              : payment.status === "PARTIAL"
              ? "bg-gradient-to-br from-amber-500 to-yellow-600"
              : "bg-gradient-to-br from-orange-500 to-amber-600"
          )}>
            {isPaid ? <CheckCircle2 className="h-6 w-6" /> : <Clock className="h-6 w-6" />}
          </div>
          <div>
            <h3 className={cn(
              "font-bold text-lg",
              isPaid ? "text-emerald-900" : payment.status === "PARTIAL" ? "text-amber-900" : "text-orange-900"
            )}>
              Mois {payment.monthIndex + 1}
            </h3>
            <span className={cn(
              "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold",
              isPaid 
                ? "bg-emerald-500 text-white" 
                : payment.status === "PARTIAL"
                ? "bg-amber-500 text-white"
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
              {format(payment.dueDate, "dd MMMM yyyy", { locale: fr })}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className={cn("text-sm", isPaid ? "text-emerald-700" : "text-orange-700")}>
              Objectif
            </span>
            <span className={cn("text-lg font-bold", isPaid ? "text-emerald-900" : "text-orange-900")}>
              {payment.targetAmount.toLocaleString("fr-FR")} FCFA
            </span>
          </div>

          {/* Barre de progression du mois */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className={isPaid ? "text-emerald-600" : "text-orange-600"}>
                Accumulé: {payment.accumulatedAmount.toLocaleString("fr-FR")} F
              </span>
              <span className={isPaid ? "text-emerald-600" : "text-orange-600"}>
                {Math.round(progressPercent)}%
              </span>
            </div>
            <div className="h-2.5 bg-gray-200/60 rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  isPaid 
                    ? "bg-gradient-to-r from-emerald-400 to-green-500" 
                    : "bg-gradient-to-r from-orange-400 to-amber-500"
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {!isPaid && payment.targetAmount - payment.accumulatedAmount > 0 && (
            <div className="flex items-center justify-between p-3 bg-orange-100 rounded-lg border border-orange-200">
              <span className="text-sm text-orange-700">Reste à payer</span>
              <span className="text-sm font-bold text-orange-900">
                {(payment.targetAmount - payment.accumulatedAmount).toLocaleString("fr-FR")} FCFA
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Versements individuels */}
      {payment.versements && payment.versements.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Receipt className="h-4 w-4 text-[#234D65]" />
            Versements effectués ({payment.versements.length})
          </h4>
          <div className="space-y-2">
            {payment.versements.map((versement) => (
              <div
                key={versement.id}
                className="flex items-center justify-between p-3 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-100"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {versement.date} à {versement.time}
                    </div>
                    <div className="text-xs text-gray-500">
                      {PAYMENT_MODE_LABELS[versement.mode] || versement.mode}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-emerald-700">
                    {versement.amount.toLocaleString("fr-FR")} F
                  </div>
                  {versement.penalty && versement.penalty > 0 && (
                    <div className="text-xs text-red-600">
                      +{versement.penalty.toLocaleString("fr-FR")} F pénalité
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Statistiques du contrat */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <PiggyBank className="h-4 w-4 text-[#234D65]" />
          Statistiques du contrat
        </h4>
        
        {/* Barre de progression */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Progression globale</span>
            <span>{Math.round(contractProgressPercent)}%</span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#234D65] to-[#2c5a73] rounded-full transition-all duration-500"
              style={{ width: `${contractProgressPercent}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl">
            <div className="text-xs text-emerald-600 mb-1">Total payé</div>
            <div className="text-sm font-bold text-emerald-900">
              {totalPaid.toLocaleString("fr-FR")} F
            </div>
          </div>
          <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
            <div className="text-xs text-blue-600 mb-1">Mois payés</div>
            <div className="text-sm font-bold text-blue-900">
              {payment.contract.totalMonthsPaid} / {payment.contract.subscriptionCIDuration}
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
                  {previousPayments.map((p) => {
                    const isComplete = p.status === "PAID" || (p.status === "PARTIAL" && p.accumulatedAmount >= p.targetAmount)
                    return (
                      <div
                        key={p.id}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-xl border transition-all hover:shadow-md",
                          isComplete 
                            ? "bg-emerald-50/50 border-emerald-100" 
                            : "bg-orange-50/50 border-orange-100"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold",
                            isComplete ? "bg-emerald-500" : "bg-orange-500"
                          )}>
                            {isComplete ? "✓" : p.monthIndex + 1}
                          </div>
                          <div className="text-sm font-medium text-gray-900">
                            Mois {p.monthIndex + 1}
                          </div>
                        </div>
                        <span className={cn(
                          "text-xs px-2 py-1 rounded-full font-medium",
                          isComplete 
                            ? "bg-emerald-100 text-emerald-700" 
                            : "bg-orange-100 text-orange-700"
                        )}>
                          {STATUS_LABELS[p.status]}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {nextPayments.length > 0 && (
              <div>
                <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Versements suivants
                </h5>
                <div className="space-y-2">
                  {nextPayments.map((p) => {
                    const isComplete = p.status === "PAID" || (p.status === "PARTIAL" && p.accumulatedAmount >= p.targetAmount)
                    return (
                      <div
                        key={p.id}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-xl border transition-all hover:shadow-md",
                          isComplete 
                            ? "bg-emerald-50/50 border-emerald-100" 
                            : "bg-gray-50/50 border-gray-100"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold",
                            isComplete ? "bg-emerald-500" : "bg-gray-400"
                          )}>
                            {isComplete ? "✓" : p.monthIndex + 1}
                          </div>
                          <div className="text-sm font-medium text-gray-900">
                            Mois {p.monthIndex + 1}
                          </div>
                        </div>
                        <span className={cn(
                          "text-xs px-2 py-1 rounded-full font-medium",
                          isComplete 
                            ? "bg-emerald-100 text-emerald-700" 
                            : "bg-gray-100 text-gray-600"
                        )}>
                          {STATUS_LABELS[p.status]}
                        </span>
                      </div>
                    )
                  })}
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
