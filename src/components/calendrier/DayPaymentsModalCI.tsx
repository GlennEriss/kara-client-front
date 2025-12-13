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
import type { DayPaymentsCI, CalendarPaymentItemCI } from "@/hooks/useCalendarCaisseImprevue"
import type { CaisseImprevuePaymentFrequency } from "@/types/types"

interface DayPaymentsModalCIProps {
  isOpen: boolean
  onClose: () => void
  dayPayments: DayPaymentsCI
  onPaymentClick: (payment: CalendarPaymentItemCI) => void
}

const PAYMENT_FREQUENCY_LABELS: Record<CaisseImprevuePaymentFrequency, string> = {
  DAILY: "Journalier",
  MONTHLY: "Mensuel",
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

export function DayPaymentsModalCI({
  isOpen,
  onClose,
  dayPayments,
  onPaymentClick,
}: DayPaymentsModalCIProps) {
  // Grouper les versements par type de contrat
  const groupedByFrequency = dayPayments.payments.reduce(
    (acc, payment) => {
      const frequency = payment.contract.paymentFrequency
      if (!acc[frequency]) {
        acc[frequency] = []
      }
      acc[frequency].push(payment)
      return acc
    },
    {} as Record<CaisseImprevuePaymentFrequency, CalendarPaymentItemCI[]>
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
            {(Object.keys(groupedByFrequency) as CaisseImprevuePaymentFrequency[]).map((frequency) => (
              <div key={frequency}>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">
                  {PAYMENT_FREQUENCY_LABELS[frequency]} ({groupedByFrequency[frequency].length})
                </h3>
                <div className="space-y-2">
                  {groupedByFrequency[frequency].map((payment) => (
                    <button
                      key={payment.id}
                      onClick={() => onPaymentClick(payment)}
                      className="w-full p-3 border rounded-lg hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">
                              {payment.memberDisplayName || "Membre inconnu"}
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
                            Objectif: {payment.targetAmount.toLocaleString("fr-FR")} FCFA
                            {payment.accumulatedAmount > 0 && (
                              <span className="ml-2">
                                • Accumulé: {payment.accumulatedAmount.toLocaleString("fr-FR")} FCFA
                              </span>
                            )}
                            {payment.monthIndex !== undefined && (
                              <span className="ml-2">
                                • Mois {payment.monthIndex + 1}
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

export default DayPaymentsModalCI
