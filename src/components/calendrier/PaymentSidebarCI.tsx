"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { PaymentSidebarHeaderCI } from "./PaymentSidebarHeaderCI"
import { PaymentSidebarContentCI } from "./PaymentSidebarContentCI"
import { PaymentSidebarActionsCI } from "./PaymentSidebarActionsCI"
import { usePaymentReceiptCI } from "@/hooks/usePaymentReceiptCI"
import PaymentCIModal, { PaymentFormData } from "@/components/caisse-imprevue/PaymentCIModal"
import type { CalendarPaymentItemCI } from "@/hooks/useCalendarCaisseImprevue"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useAuth } from "@/hooks/useAuth"
import { ServiceFactory } from "@/factories/ServiceFactory"
import { format } from "date-fns"

interface PaymentSidebarCIProps {
  payment: CalendarPaymentItemCI
  onClose: () => void
}

export function PaymentSidebarCI({ payment, onClose }: PaymentSidebarCIProps) {
  const [showReceipt, setShowReceipt] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const { receiptUrl, isGenerating, generateReceipt, downloadReceipt } =
    usePaymentReceiptCI(payment)
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const handleRecordPayment = () => {
    setShowPaymentModal(true)
  }

  const handlePaymentSubmit = async (data: PaymentFormData) => {
    if (!user?.uid) {
      toast.error("Vous devez être connecté pour enregistrer un paiement")
      return
    }

    try {
      const service = ServiceFactory.getCaisseImprevueService()
      await service.createVersement(
        payment.contract.id,
        payment.monthIndex,
        {
          date: data.date,
          time: data.time,
          amount: data.amount,
          mode: data.mode,
        },
        data.proofFile,
        user.uid
      )

      toast.success("Versement enregistré avec succès")
      setShowPaymentModal(false)

      // Invalider les queries pour rafraîchir les données
      queryClient.invalidateQueries({
        queryKey: ["calendar-caisse-imprevue"],
      })
      queryClient.invalidateQueries({
        queryKey: ["paymentsCI", payment.contract.id],
      })

      // Fermer la sidebar pour voir les changements dans le calendrier
      onClose()
    } catch (error) {
      console.error("Erreur lors de l'enregistrement du versement:", error)
      toast.error("Erreur lors de l'enregistrement du versement")
      throw error
    }
  }

  const handleViewReceipt = async () => {
    try {
      await generateReceipt()
      setShowReceipt(true)
    } catch (error) {
      toast.error("Impossible d'afficher le reçu")
    }
  }

  const handleDownloadReceiptClick = async () => {
    try {
      await downloadReceipt()
    } catch (error) {
      toast.error("Impossible de télécharger le reçu")
    }
  }

  return (
    <>
      {/* Sidebar avec animation */}
      <div 
        className="fixed right-0 top-0 h-full w-full sm:w-[500px] bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300"
        style={{
          boxShadow: '-10px 0 50px -12px rgba(0, 0, 0, 0.25)'
        }}
      >
        {/* Bouton fermer mobile */}
        <button 
          onClick={onClose}
          className="absolute top-4 left-4 sm:hidden z-10 w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* En-tête fixe */}
        <div className="flex-shrink-0">
          <PaymentSidebarHeaderCI payment={payment} onClose={onClose} />
        </div>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-50/50 to-white">
          <PaymentSidebarContentCI
            payment={payment}
            showReceipt={showReceipt}
            receiptUrl={receiptUrl}
          />
        </div>

        {/* Actions fixes en bas */}
        <div className="flex-shrink-0 border-t border-gray-100">
          <PaymentSidebarActionsCI
            payment={payment}
            onRecordPayment={handleRecordPayment}
            onViewReceipt={handleViewReceipt}
            onDownloadReceipt={handleDownloadReceiptClick}
            isGeneratingReceipt={isGenerating}
          />
        </div>
      </div>

      {/* Overlay avec animation */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Modal de paiement */}
      <PaymentCIModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSubmit={handlePaymentSubmit}
        title={`Versement pour le mois ${payment.monthIndex + 1}`}
        description={`Enregistrer le versement pour ${payment.memberDisplayName || "le membre"}`}
        defaultDate={format(payment.dueDate, "yyyy-MM-dd")}
        defaultAmount={payment.targetAmount - payment.accumulatedAmount}
        isMonthly={payment.contract.paymentFrequency === "MONTHLY"}
        isDateFixed={false}
        contractId={payment.contract.id}
      />
    </>
  )
}

export default PaymentSidebarCI
