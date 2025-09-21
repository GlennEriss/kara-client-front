"use client"

import React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { FileText, X } from "lucide-react"
import type { CaissePayment, CaisseContract } from "@/services/caisse/types"
import IndividualPaymentInvoice from "./IndividualPaymentInvoice"
import GroupPaymentInvoice from "./GroupPaymentInvoice"

// ————————————————————————————————————————————————————————————
// Helpers UI
// ————————————————————————————————————————————————————————————
const brand = {
  bg: "bg-[#234D65]",
  bgSoft: "bg-[#234D65]/10",
  text: "text-[#234D65]",
}

function classNames(...cls: (string | false | undefined)[]) {
  return cls.filter(Boolean).join(" ")
}

// ————————————————————————————————————————————————————————————
// Types
// ————————————————————————————————————————————————————————————
interface PaymentInvoiceModalProps {
  isOpen: boolean
  onClose: () => void
  payment: CaissePayment | null
  contractData: CaisseContract | null
}

// ————————————————————————————————————————————————————————————
// Component
// ————————————————————————————————————————————————————————————
export default function PaymentInvoiceModal({ 
  isOpen, 
  onClose, 
  payment, 
  contractData 
}: PaymentInvoiceModalProps) {
  if (!payment || !contractData) return null

  // Déterminer si c'est un contrat de groupe
  const isGroupContract = contractData.contractType === 'GROUP' || !!contractData.groupeId

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header fixe */}
        <DialogHeader className="flex-shrink-0 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-slate-900">
                  Facture de paiement - Échéance M{payment.dueMonthIndex + 1}
                </DialogTitle>
                <DialogDescription className="text-slate-600 mt-1">
                  {isGroupContract 
                    ? "Détails du paiement collectif effectué pour cette échéance"
                    : "Détails du paiement effectué pour cette échéance"
                  }
                </DialogDescription>
              </div>
            </div>
            {/* <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-slate-500" />
            </button> */}
          </div>
        </DialogHeader>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto px-1">
          {isGroupContract ? (
            <GroupPaymentInvoice payment={payment} contractData={contractData} />
          ) : (
            <IndividualPaymentInvoice payment={payment} contractData={contractData} />
          )}
        </div>

        {/* Footer fixe */}
        <div className="flex-shrink-0 pt-4 border-t bg-white">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className={classNames(
                "px-6 py-3 rounded-lg text-sm font-medium text-white",
                brand.bg,
                "hover:bg-[#1a3a4f] transition-colors shadow-sm"
              )}
            >
              Fermer
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
