"use client"

import React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { FileText } from "lucide-react"
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Facture de paiement - Échéance M{payment.dueMonthIndex + 1}
            {isGroupContract && (
              <span className="text-sm font-normal text-slate-500">
                (Contrat de groupe)
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            {isGroupContract 
              ? "Détails du paiement collectif effectué pour cette échéance"
              : "Détails du paiement effectué pour cette échéance"
            }
          </DialogDescription>
        </DialogHeader>

        {/* Contenu conditionnel selon le type de contrat */}
        {isGroupContract ? (
          <GroupPaymentInvoice payment={payment} contractData={contractData} />
        ) : (
          <IndividualPaymentInvoice payment={payment} contractData={contractData} />
        )}

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t">
          <button
            onClick={onClose}
            className={classNames(
              "px-4 py-2 rounded-lg text-sm font-medium text-white",
              brand.bg,
              "hover:bg-[#1a3a4f] transition-colors"
            )}
          >
            Fermer
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
