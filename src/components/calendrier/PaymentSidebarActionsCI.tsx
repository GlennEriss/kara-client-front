"use client"

import { Download, Loader2, CreditCard, FileText, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { CalendarPaymentItemCI } from "@/hooks/useCalendarCaisseImprevue"

interface PaymentSidebarActionsCIProps {
  payment: CalendarPaymentItemCI
  onRecordPayment: () => void
  onViewReceipt: () => void
  onDownloadReceipt: () => void
  isGeneratingReceipt?: boolean
}

export function PaymentSidebarActionsCI({
  payment,
  onRecordPayment,
  onViewReceipt,
  onDownloadReceipt,
  isGeneratingReceipt = false,
}: PaymentSidebarActionsCIProps) {
  const isPaid = payment.status === "PAID" || 
                 (payment.status === "PARTIAL" && payment.accumulatedAmount >= payment.targetAmount)
  
  const remainingAmount = payment.targetAmount - payment.accumulatedAmount

  return (
    <div className="p-5 bg-gradient-to-t from-gray-50 to-white">
      {isPaid ? (
        <div className="space-y-3">
          <Button
            onClick={onViewReceipt}
            className="w-full h-12 bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#1a3a4d] hover:to-[#234D65] text-white shadow-lg shadow-[#234D65]/20 rounded-xl transition-all duration-300 hover:-translate-y-0.5"
          >
            <Eye className="h-5 w-5 mr-2" />
            Voir le reçu
          </Button>
          <Button
            onClick={onDownloadReceipt}
            variant="outline"
            className="w-full h-12 rounded-xl border-2 hover:bg-gray-50 transition-all duration-300"
            disabled={isGeneratingReceipt}
          >
            {isGeneratingReceipt ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Génération en cours...
              </>
            ) : (
              <>
                <Download className="h-5 w-5 mr-2" />
                Télécharger le reçu PDF
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <Button 
            onClick={onRecordPayment} 
            className="w-full h-14 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-lg shadow-emerald-500/30 rounded-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
          >
            <CreditCard className="h-5 w-5 mr-2" />
            <div className="text-left">
              <div className="font-semibold">Faire un versement</div>
              <div className="text-xs text-white/80">
                {remainingAmount > 0 
                  ? `Reste: ${remainingAmount.toLocaleString("fr-FR")} FCFA`
                  : `${payment.targetAmount.toLocaleString("fr-FR")} FCFA`
                }
              </div>
            </div>
          </Button>
          
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
            <FileText className="h-3.5 w-3.5" />
            <span>Une preuve de paiement sera demandée</span>
          </div>
        </div>
      )}
    </div>
  )
}
