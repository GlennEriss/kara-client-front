"use client"

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import type { CaisseContract, CaissePayment } from "@/services/caisse/types"
import { generateSingleVersementPDF } from '@/services/caisse/versementPdfExport'
import { Download, FileText } from "lucide-react"
import { toast } from 'sonner'
import GroupPaymentInvoice from "./GroupPaymentInvoice"
import IndividualPaymentInvoice from "./IndividualPaymentInvoice"

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
  /** Pour générer le PDF au format "historique versement" (2 pages + bloc versement) */
  member?: any
  group?: any
  payments?: any[]
  getAdminDisplayName?: (adminId: string) => string
}

// ————————————————————————————————————————————————————————————
// Component
// ————————————————————————————————————————————————————————————
export default function PaymentInvoiceModal({
  isOpen,
  onClose,
  payment,
  contractData,
  member,
  group,
  payments = [],
  getAdminDisplayName = (id) => id || '—',
}: PaymentInvoiceModalProps) {
  if (!payment || !contractData) return null

  const isGroupContract = contractData.contractType === 'GROUP' || !!contractData.groupeId

  // Export PDF au même format que la page Historique des versements > bouton PDF (2 pages + bloc VERSEMENT i DU date)
  const handleExportPDF = async () => {
    try {
      toast.info('Génération du PDF en cours...')
      await generateSingleVersementPDF({
        contract: contractData,
        contractId: contractData.id,
        member: member ?? undefined,
        group: group ?? undefined,
        payments,
        payment,
        getAdminDisplayName,
      })
      toast.success('PDF généré avec succès')
    } catch (error: any) {
      console.error('Erreur:', error)
      toast.error(error?.message ?? 'Erreur lors de la génération du PDF')
    }
  }

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
          <div className="flex justify-between items-center">
            <button
              onClick={handleExportPDF}
              className={classNames(
                "px-6 py-3 rounded-lg text-sm font-medium flex items-center gap-2",
                "bg-green-600 text-white hover:bg-green-700 transition-colors shadow-sm"
              )}
            >
              <Download className="h-4 w-4" />
              Télécharger PDF
            </button>
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
