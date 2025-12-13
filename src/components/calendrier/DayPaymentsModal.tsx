"use client"

import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { DayPayments, CalendarPaymentItem } from "@/hooks/useCalendarCaisseSpeciale"
import type { CaisseType } from "@/services/caisse/types"

interface DayPaymentsModalProps {
  isOpen: boolean
  onClose: () => void
  dayPayments: DayPayments
  onPaymentClick: (payment: CalendarPaymentItem) => void
}

const CAISSE_TYPE_LABELS: Record<CaisseType, string> = {
  JOURNALIERE: "Journalier",
  STANDARD: "Standard",
  LIBRE: "Libre",
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

export function DayPaymentsModal({
  isOpen,
  onClose,
  dayPayments,
  onPaymentClick,
}: DayPaymentsModalProps) {
  // Grouper les versements par type de contrat
  const groupedByType = dayPayments.payments.reduce(
    (acc, payment) => {
      const type = payment.contract.caisseType
      if (!acc[type]) {
        acc[type] = []
      }
      acc[type].push(payment)
      return acc
    },
    {} as Record<CaisseType, CalendarPaymentItem[]>
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>
            Versements du {format(dayPayments.date, "EEEE d MMMM yyyy", { locale: fr })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Résumé */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="text-sm text-gray-600">Total</div>
              <div className="text-lg font-bold">
                {dayPayments.totalAmount.toLocaleString("fr-FR")} FCFA
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Payé</div>
              <div className="text-lg font-bold text-green-600">
                {dayPayments.paidAmount.toLocaleString("fr-FR")} FCFA
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Reste</div>
              <div className="text-lg font-bold text-orange-600">
                {dayPayments.remainingAmount.toLocaleString("fr-FR")} FCFA
              </div>
            </div>
          </div>

          {/* Liste des versements groupés par type */}
          <div className="max-h-[400px] overflow-y-auto space-y-6">
              {(Object.keys(groupedByType) as CaisseType[]).map((type) => (
                <div key={type}>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">
                    {CAISSE_TYPE_LABELS[type]} ({groupedByType[type].length})
                  </h3>
                  <div className="space-y-2">
                    {groupedByType[type].map((payment) => (
                      <button
                        key={payment.id}
                        onClick={() => onPaymentClick(payment)}
                        className="w-full p-3 border rounded-lg hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">
                                {payment.memberDisplayName ||
                                  payment.groupDisplayName ||
                                  "Membre inconnu"}
                              </span>
                              <Badge
                                className={cn(
                                  "text-xs",
                                  COLOR_BADGE_CLASSES[payment.color]
                                )}
                              >
                                {STATUS_LABELS[payment.status]}
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-600">
                              Montant: {payment.amount.toLocaleString("fr-FR")} FCFA
                              {payment.dueMonthIndex !== undefined && (
                                <span className="ml-2">
                                  • Mois {payment.dueMonthIndex + 1}
                                </span>
                              )}
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
