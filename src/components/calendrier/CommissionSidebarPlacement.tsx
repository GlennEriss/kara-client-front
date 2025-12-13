"use client"

import { useState, useMemo } from "react"
import { useAuth } from "@/hooks/useAuth"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { ServiceFactory } from "@/factories/ServiceFactory"
import { CommissionSidebarHeaderPlacement } from "./CommissionSidebarHeaderPlacement"
import { CommissionSidebarContentPlacement } from "./CommissionSidebarContentPlacement"
import { CommissionSidebarActionsPlacement } from "./CommissionSidebarActionsPlacement"
import PayCommissionModal, { CommissionPaymentFormData } from "@/components/placement/PayCommissionModal"
import { useCommissionReceiptPlacement } from "@/hooks/useCommissionReceiptPlacement"
import type { CalendarCommissionItem } from "@/hooks/useCalendarPlacement"

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
        user.uid
      )

      // Invalider les requêtes pour rafraîchir les données
      await queryClient.invalidateQueries({
        queryKey: ["calendar-placements"],
      })
      await queryClient.invalidateQueries({
        queryKey: ["placement-commissions", commission.placement.id],
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
      <div className="fixed right-0 top-0 h-full w-[500px] bg-white shadow-2xl z-50 flex flex-col">
        {/* En-tête fixe */}
        <div className="flex-shrink-0">
          <CommissionSidebarHeaderPlacement
            commission={commission}
            onClose={onClose}
          />
        </div>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto">
          <CommissionSidebarContentPlacement
            commission={commission}
            showReceipt={showReceipt}
            receiptUrl={receiptUrl}
          />
        </div>

        {/* Actions fixes en bas */}
        <div className="flex-shrink-0">
          <CommissionSidebarActionsPlacement
            commission={commission}
            onRecordPayment={handleRecordPayment}
            onViewReceipt={handleViewReceipt}
            onDownloadReceipt={handleDownloadReceipt}
            isGeneratingReceipt={isGenerating}
          />
        </div>
      </div>

      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
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
