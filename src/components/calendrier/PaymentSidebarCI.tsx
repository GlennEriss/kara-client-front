"use client"

import { useState, useEffect } from "react"
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
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 right-0 w-full md:w-96 bg-white shadow-xl z-50 flex flex-col",
          "animate-in slide-in-from-right duration-300"
        )}
      >
        {/* Zone 1 : En-tête fixe */}
        <div className="flex-shrink-0">
          <PaymentSidebarHeaderCI payment={payment} onClose={onClose} />
        </div>

        {/* Zone 2 : Contenu scrollable */}
        <div className="flex-1 overflow-y-auto">
          <PaymentSidebarContentCI
            payment={payment}
            showReceipt={showReceipt}
            receiptUrl={receiptUrl}
          />
        </div>

        {/* Zone 3 : Actions fixes */}
        <div className="flex-shrink-0 border-t">
          <PaymentSidebarActionsCI
            payment={payment}
            onRecordPayment={handleRecordPayment}
            onViewReceipt={handleViewReceipt}
            onDownloadReceipt={handleDownloadReceiptClick}
            isGeneratingReceipt={isGenerating}
          />
        </div>
      </div>

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
