"use client"

import { format } from "date-fns"
import { fr } from "date-fns/locale"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { DayCommissions, CalendarCommissionItem } from "@/hooks/useCalendarPlacement"
import type { PayoutMode } from "@/types/types"

interface DayCommissionsModalPlacementProps {
  isOpen: boolean
  onClose: () => void
  dayCommissions: DayCommissions
  onCommissionClick: (commission: CalendarCommissionItem) => void
}

const PAYOUT_MODE_LABELS: Record<PayoutMode, string> = {
  MonthlyCommission_CapitalEnd: "Commission mensuelle",
  CapitalPlusCommission_End: "Capital + commissions à la fin",
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

export function DayCommissionsModalPlacement({
  isOpen,
  onClose,
  dayCommissions,
  onCommissionClick,
}: DayCommissionsModalPlacementProps) {
  // Grouper les commissions par mode de règlement
  const groupedByMode = dayCommissions.commissions.reduce(
    (acc, commission) => {
      const mode = commission.placement.payoutMode
      if (!acc[mode]) {
        acc[mode] = []
      }
      acc[mode].push(commission)
      return acc
    },
    {} as Record<PayoutMode, CalendarCommissionItem[]>
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>
            Commissions du {format(dayCommissions.date, "EEEE d MMMM yyyy", { locale: fr })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Résumé */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="text-sm text-gray-600">Total</div>
              <div className="text-lg font-bold">
                {dayCommissions.totalAmount.toLocaleString("fr-FR")} FCFA
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Payé</div>
              <div className="text-lg font-bold text-green-600">
                {dayCommissions.paidAmount.toLocaleString("fr-FR")} FCFA
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Reste</div>
              <div className="text-lg font-bold text-orange-600">
                {dayCommissions.remainingAmount.toLocaleString("fr-FR")} FCFA
              </div>
            </div>
          </div>

          {/* Liste des commissions groupées par mode */}
          <div className="max-h-[400px] overflow-y-auto space-y-6">
            {(Object.keys(groupedByMode) as PayoutMode[]).map((mode) => (
              <div key={mode}>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">
                  {PAYOUT_MODE_LABELS[mode]} ({groupedByMode[mode].length})
                </h3>
                <div className="space-y-2">
                  {groupedByMode[mode].map((commission) => (
                    <button
                      key={commission.id}
                      onClick={() => onCommissionClick(commission)}
                      className="w-full p-3 border rounded-lg hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">
                              {commission.benefactorDisplayName || "Bienfaiteur inconnu"}
                            </span>
                            <Badge
                              className={cn(
                                "text-xs",
                                COLOR_BADGE_CLASSES[commission.color]
                              )}
                            >
                              {STATUS_LABELS[commission.status]}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-600">
                            Montant: {commission.amount.toLocaleString("fr-FR")} FCFA
                            <span className="ml-2">
                              • Placement #{commission.placement.id.slice(-8)}
                            </span>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          Voir détails
                        </Button>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
