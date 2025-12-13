"use client"

import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { CalendarPaymentItem } from "@/hooks/useCalendarCaisseSpeciale"
import { useContractPayments } from "@/hooks/useContractPayments"

interface PaymentSidebarContentProps {
  payment: CalendarPaymentItem
  showReceipt: boolean
  receiptUrl?: string | null
}

const COLOR_BADGE_CLASSES = {
  green: "bg-green-500 text-white",
  orange: "bg-orange-500 text-white",
  yellow: "bg-yellow-500 text-white",
  red: "bg-red-500 text-white",
  gray: "bg-gray-400 text-white",
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
    .slice(0, 5)

  const nextPayments = allPayments
    .filter((p) => p.dueMonthIndex > payment.dueMonthIndex)
    .sort((a, b) => a.dueMonthIndex - b.dueMonthIndex)
    .slice(0, 5)

  return (
    <div className="p-4 space-y-4">
      {/* Détails du versement */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informations du versement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Date d'échéance:</span>
            <span className="text-sm font-medium">
              {format(payment.dueAt, "dd/MM/yyyy", { locale: fr })}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Montant:</span>
            <span className="text-sm font-semibold">
              {payment.amount.toLocaleString("fr-FR")} FCFA
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Statut:</span>
            <Badge
              className={cn("text-xs", COLOR_BADGE_CLASSES[payment.color])}
            >
              {STATUS_LABELS[payment.status]}
            </Badge>
          </div>
          {payment.dueMonthIndex !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Numéro de mois:</span>
              <span className="text-sm font-medium">
                Mois {payment.dueMonthIndex + 1}
              </span>
            </div>
          )}
          {payment.paidAt && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Date de paiement:</span>
              <span className="text-sm font-medium">
                {format(payment.paidAt, "dd/MM/yyyy", { locale: fr })}
              </span>
            </div>
          )}
          {payment.mode && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Moyen de paiement:</span>
              <span className="text-sm font-medium">
                {PAYMENT_MODE_LABELS[payment.mode] || payment.mode}
              </span>
            </div>
          )}
          {payment.penaltyApplied && payment.penaltyApplied > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Pénalités appliquées:</span>
              <span className="text-sm font-semibold text-red-600">
                {payment.penaltyApplied.toLocaleString("fr-FR")} FCFA
              </span>
            </div>
          )}
          {payment.penaltyDays && payment.penaltyDays > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Jours de retard:</span>
              <span className="text-sm font-medium">{payment.penaltyDays} jours</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historique des versements */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historique des versements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="text-sm text-gray-500">Chargement...</div>
          ) : (
            <>
              {previousPayments.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Versements précédents</h4>
                  <div className="space-y-2">
                    {previousPayments.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded"
                      >
                        <span className="text-xs">
                          Mois {p.dueMonthIndex + 1} -{" "}
                          {format(p.dueAt, "dd/MM/yyyy", { locale: fr })}
                        </span>
                        <Badge
                          variant={
                            p.status === "PAID"
                              ? "default"
                              : p.status === "DUE"
                              ? "destructive"
                              : "secondary"
                          }
                          className="text-xs"
                        >
                          {STATUS_LABELS[p.status]}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {nextPayments.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Versements suivants</h4>
                  <div className="space-y-2">
                    {nextPayments.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded"
                      >
                        <span className="text-xs">
                          Mois {p.dueMonthIndex + 1} -{" "}
                          {format(p.dueAt, "dd/MM/yyyy", { locale: fr })}
                        </span>
                        <Badge
                          variant={
                            p.status === "PAID"
                              ? "default"
                              : p.status === "DUE"
                              ? "destructive"
                              : "secondary"
                          }
                          className="text-xs"
                        >
                          {STATUS_LABELS[p.status]}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Statistiques du contrat */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Statistiques du contrat</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Montant total payé:</span>
            <span className="text-sm font-semibold text-green-600">
              {payment.contract.nominalPaid.toLocaleString("fr-FR")} FCFA
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Bonus accumulé:</span>
            <span className="text-sm font-semibold text-blue-600">
              {payment.contract.bonusAccrued.toLocaleString("fr-FR")} FCFA
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Pénalités totales:</span>
            <span className="text-sm font-semibold text-red-600">
              {payment.contract.penaltiesTotal.toLocaleString("fr-FR")} FCFA
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Affichage du reçu PDF */}
      {showReceipt && receiptUrl && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Reçu de paiement</CardTitle>
          </CardHeader>
          <CardContent>
            <iframe
              src={receiptUrl}
              className="w-full h-[600px] border rounded"
              title="Reçu de paiement"
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
