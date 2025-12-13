"use client"

import { Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { CalendarPaymentItem } from "@/hooks/useCalendarCaisseSpeciale"

interface PaymentSidebarActionsProps {
  payment: CalendarPaymentItem
  onRecordPayment: () => void
  onViewReceipt: () => void
  onDownloadReceipt: () => void
  isGeneratingReceipt?: boolean
}

export function PaymentSidebarActions({
  payment,
  onRecordPayment,
  onViewReceipt,
  onDownloadReceipt,
  isGeneratingReceipt = false,
}: PaymentSidebarActionsProps) {
  const isPaid = payment.status === "PAID"

  return (
    <div className="p-4 border-t bg-white space-y-2">
      {isPaid ? (
        <>
          <Button
            onClick={onViewReceipt}
            className="w-full"
            variant="default"
          >
            Voir le reçu
          </Button>
          <Button
            onClick={onDownloadReceipt}
            variant="outline"
            className="w-full"
            disabled={isGeneratingReceipt}
          >
            {isGeneratingReceipt ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Génération...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Télécharger le reçu PDF
              </>
            )}
          </Button>
        </>
      ) : (
        <Button onClick={onRecordPayment} className="w-full" variant="default">
          Faire un versement
        </Button>
      )}
    </div>
  )
}
