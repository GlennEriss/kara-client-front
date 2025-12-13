"use client"

import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { CalendarCommissionItem } from "@/hooks/useCalendarPlacement"
import { usePlacementCommissions } from "@/hooks/usePlacements"

interface CommissionSidebarContentPlacementProps {
  commission: CalendarCommissionItem
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
  Due: "À payer",
  Paid: "Payé",
  Partial: "Partiel",
  Canceled: "Annulé",
}

export function CommissionSidebarContentPlacement({
  commission,
  showReceipt,
  receiptUrl,
}: CommissionSidebarContentPlacementProps) {
  const { data: allCommissions = [], isLoading } = usePlacementCommissions(
    commission.placement.id
  )

  // Filtrer les commissions précédentes et suivantes
  const previousCommissions = allCommissions
    .filter((c) => c.dueDate < commission.dueDate)
    .sort((a, b) => b.dueDate.getTime() - a.dueDate.getTime())
    .slice(0, 5)

  const nextCommissions = allCommissions
    .filter((c) => c.dueDate > commission.dueDate)
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
    .slice(0, 5)

  // Calculer les statistiques du placement
  const totalPaid = allCommissions
    .filter((c) => c.status === 'Paid')
    .reduce((sum, c) => sum + c.amount, 0)

  const paidCount = allCommissions.filter((c) => c.status === 'Paid').length

  return (
    <div className="p-4 space-y-4">
      {/* Détails de la commission */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informations de la commission</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Date d'échéance:</span>
            <span className="text-sm font-medium">
              {format(commission.dueDate, "dd/MM/yyyy", { locale: fr })}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Montant:</span>
            <span className="text-sm font-semibold">
              {commission.amount.toLocaleString("fr-FR")} FCFA
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Statut:</span>
            <Badge
              className={cn("text-xs", COLOR_BADGE_CLASSES[commission.color])}
            >
              {STATUS_LABELS[commission.status]}
            </Badge>
          </div>
          {commission.paidAt && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Date de paiement:</span>
              <span className="text-sm font-medium">
                {format(commission.paidAt, "dd/MM/yyyy", { locale: fr })}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historique des commissions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historique des commissions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="text-sm text-gray-500">Chargement...</div>
          ) : (
            <>
              {previousCommissions.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Commissions précédentes</h4>
                  <div className="space-y-2">
                    {previousCommissions.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded"
                      >
                        <span className="text-xs">
                          {format(c.dueDate, "dd/MM/yyyy", { locale: fr })} - {c.amount.toLocaleString("fr-FR")} FCFA
                        </span>
                        <Badge
                          variant={
                            c.status === "Paid"
                              ? "default"
                              : c.status === "Due"
                              ? "destructive"
                              : "secondary"
                          }
                          className="text-xs"
                        >
                          {STATUS_LABELS[c.status]}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {nextCommissions.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Commissions suivantes</h4>
                  <div className="space-y-2">
                    {nextCommissions.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded"
                      >
                        <span className="text-xs">
                          {format(c.dueDate, "dd/MM/yyyy", { locale: fr })} - {c.amount.toLocaleString("fr-FR")} FCFA
                        </span>
                        <Badge
                          variant={
                            c.status === "Paid"
                              ? "default"
                              : c.status === "Due"
                              ? "destructive"
                              : "secondary"
                          }
                          className="text-xs"
                        >
                          {STATUS_LABELS[c.status]}
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

      {/* Statistiques du placement */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Statistiques du placement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Montant total payé:</span>
            <span className="text-sm font-semibold text-green-600">
              {totalPaid.toLocaleString("fr-FR")} FCFA
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Commissions payées:</span>
            <span className="text-sm font-semibold">
              {paidCount} / {allCommissions.length}
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
