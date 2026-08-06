"use client"

import PayCommissionModal, { CommissionPaymentFormData } from "@/components/placement/PayCommissionModal"
import { ServiceFactory } from "@/factories/ServiceFactory"
import { useAuth } from "@/hooks/useAuth"
import type { CalendarCommissionItem } from "@/hooks/useCalendarPlacement"
import { isCapitalRestitution } from "@/hooks/useCalendarPlacement"
import { useCommissionReceiptPlacement } from "@/hooks/useCommissionReceiptPlacement"
import { useQueryClient } from "@tanstack/react-query"
import { X } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { CommissionSidebarActionsPlacement } from "./CommissionSidebarActionsPlacement"
import { CommissionSidebarContentPlacement } from "./CommissionSidebarContentPlacement"
import { CommissionSidebarHeaderPlacement } from "./CommissionSidebarHeaderPlacement"

interface CommissionSidebarPlacementProps {
  commission: CalendarCommissionItem
  onClose: () => void
}

export function CommissionSidebarPlacement({
  commission,
  onClose,
}: CommissionSidebarPlacementProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [showPayModal, setShowPayModal] = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)

  const {
    receiptUrl,
    isGenerating,
    generateReceipt,
    downloadReceipt,
  } = useCommissionReceiptPlacement(commission)

  const handleRecordPayment = () => {
    // Garde-fou : une restitution de capital n'a pas de document commission en
    // base, la payer via cette voie écrirait sur un id inexistant.
    if (isCapitalRestitution(commission)) {
      toast.error("La restitution du capital s'enregistre à la clôture du placement")
      return
    }
    setShowPayModal(true)
  }

  const handleClosePayModal = () => {
    setShowPayModal(false)
  }

  const handlePaySubmit = async (data: CommissionPaymentFormData) => {
    try {
      if (!user?.uid) {
        toast.error("Vous devez être connecté")
        return
      }

      const service = ServiceFactory.getPlacementService()
      const paidDate = new Date(`${data.date}T${data.time}`)
      
      await service.payCommissionWithProof(
        commission.placement.id,
        commission.id,
        data.proofFile,
        commission.placement.benefactorId,
        paidDate,
        user.uid,
        {
          paidAmount: data.amount,
          paymentMode: data.mode,
          withFees: data.withFees,
          paymentMethodOther: data.paymentMethodOther,
        }
      )

      await queryClient.invalidateQueries({
        queryKey: ["calendar-placements"],
      })
      await queryClient.invalidateQueries({
        queryKey: ["placement", commission.placement.id, "commissions"],
      })
      await queryClient.invalidateQueries({
        queryKey: ["placement", commission.placement.id],
      })

      toast.success("Commission payée avec succès")
      setShowPayModal(false)
      onClose()
    } catch (error: any) {
      console.error("Erreur lors du paiement:", error)
      toast.error(error?.message || "Erreur lors du paiement de la commission")
    }
  }

  const handleViewReceipt = async () => {
    try {
      if (!receiptUrl) {
        await generateReceipt()
      }
      setShowReceipt(true)
    } catch (error: any) {
      toast.error(error?.message || "Erreur lors du chargement du reçu")
    }
  }

  const handleDownloadReceipt = async () => {
    try {
      await downloadReceipt()
      toast.success("Téléchargement du reçu démarré")
    } catch (error: any) {
      toast.error(error?.message || "Erreur lors du téléchargement du reçu")
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
          <CommissionSidebarHeaderPlacement
            commission={commission}
            onClose={onClose}
          />
        </div>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-50/50 to-white">
          <CommissionSidebarContentPlacement
            commission={commission}
            showReceipt={showReceipt}
            receiptUrl={receiptUrl}
          />
        </div>

        {/* Actions fixes en bas */}
        <div className="flex-shrink-0 border-t border-gray-100">
          <CommissionSidebarActionsPlacement
            commission={commission}
            onRecordPayment={handleRecordPayment}
            onViewReceipt={handleViewReceipt}
            onDownloadReceipt={handleDownloadReceipt}
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
      {showPayModal && (
        <PayCommissionModal
          isOpen={showPayModal}
          onClose={handleClosePayModal}
          onSubmit={handlePaySubmit}
          commission={commission}
          isPaying={false}
        />
      )}
    </>
  )
}

export default CommissionSidebarPlacement
