"use client"

import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { CalendarPaymentItemCI } from "@/hooks/useCalendarCaisseImprevue"
import { usePaymentsCI } from "@/hooks/caisse-imprevue/usePaymentsCI"

interface PaymentSidebarContentCIProps {
  payment: CalendarPaymentItemCI
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
    .slice(0, 5)

  const nextPayments = allPayments
    .filter((p) => p.monthIndex > payment.monthIndex)
    .sort((a, b) => a.monthIndex - b.monthIndex)
    .slice(0, 5)

  // Calculer les statistiques du contrat
  const totalPaid = allPayments.reduce((sum, p) => {
    if (p.status === 'PAID' || (p.status === 'PARTIAL' && p.accumulatedAmount >= p.targetAmount)) {
      return sum + p.accumulatedAmount
    }
    return sum
  }, 0)

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
              {format(payment.dueDate, "dd/MM/yyyy", { locale: fr })}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Montant objectif:</span>
            <span className="text-sm font-semibold">
              {payment.targetAmount.toLocaleString("fr-FR")} FCFA
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Montant accumulé:</span>
            <span className="text-sm font-semibold">
              {payment.accumulatedAmount.toLocaleString("fr-FR")} FCFA
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Montant restant:</span>
            <span className="text-sm font-semibold text-orange-600">
              {(payment.targetAmount - payment.accumulatedAmount).toLocaleString("fr-FR")} FCFA
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
          {payment.monthIndex !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Numéro de mois:</span>
              <span className="text-sm font-medium">
                Mois {payment.monthIndex + 1}
              </span>
            </div>
          )}
          
          {/* Liste des versements individuels */}
          {payment.versements && payment.versements.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <h4 className="text-sm font-semibold mb-2">Versements individuels</h4>
              <div className="space-y-2">
                {payment.versements.map((versement) => (
                  <div
                    key={versement.id}
                    className="p-2 bg-gray-50 rounded text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span>
                        {versement.date} {versement.time}
                      </span>
                      <span className="font-semibold">
                        {versement.amount.toLocaleString("fr-FR")} FCFA
                      </span>
                    </div>
                    <div className="text-gray-600 mt-1">
                      {PAYMENT_MODE_LABELS[versement.mode] || versement.mode}
                      {versement.penalty && versement.penalty > 0 && (
                        <span className="ml-2 text-red-600">
                          Pénalité: {versement.penalty.toLocaleString("fr-FR")} FCFA
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
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
                          Mois {p.monthIndex + 1}
                        </span>
                        <Badge
                          variant={
                            p.status === "PAID" || (p.status === "PARTIAL" && p.accumulatedAmount >= p.targetAmount)
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
                          Mois {p.monthIndex + 1}
                        </span>
                        <Badge
                          variant={
                            p.status === "PAID" || (p.status === "PARTIAL" && p.accumulatedAmount >= p.targetAmount)
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
              {totalPaid.toLocaleString("fr-FR")} FCFA
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Mois payés:</span>
            <span className="text-sm font-semibold">
              {payment.contract.totalMonthsPaid} / {payment.contract.subscriptionCIDuration}
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
