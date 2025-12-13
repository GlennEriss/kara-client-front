"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { PaymentSidebarHeader } from "./PaymentSidebarHeader"
import { PaymentSidebarContent } from "./PaymentSidebarContent"
import { PaymentSidebarActions } from "./PaymentSidebarActions"
import { usePaymentReceipt } from "@/hooks/usePaymentReceipt"
import PaymentCSModal from "@/components/contract/PaymentCSModal"
import type { PaymentCSFormData } from "@/components/contract/PaymentCSModal"
import type { CalendarPaymentItem } from "@/hooks/useCalendarCaisseSpeciale"
import { useQueryClient } from "@tanstack/react-query"
import { pay } from "@/services/caisse/mutations"
import { toast } from "sonner"
import { useAuth } from "@/hooks/useAuth"
import { getUserById } from "@/db/user.db"
import { getGroupById } from "@/db/group.db"

interface PaymentSidebarProps {
  payment: CalendarPaymentItem
  onClose: () => void
}

export function PaymentSidebar({ payment, onClose }: PaymentSidebarProps) {
  const [showReceipt, setShowReceipt] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [memberData, setMemberData] = useState<{
    name?: string
    matricule?: string
    photoURL?: string
    contacts?: string[]
  }>({})
  const { receiptUrl, isGenerating, generateReceipt, downloadReceipt } =
    usePaymentReceipt(payment)
  const queryClient = useQueryClient()
  const { user } = useAuth()

  // Charger les données du membre/groupe
  useEffect(() => {
    const loadMemberData = async () => {
      const contract = payment.contract
      if (contract.contractType === "INDIVIDUAL" && contract.memberId) {
        try {
          const member = await getUserById(contract.memberId)
          if (member) {
            setMemberData({
              name: `${member.firstName || ""} ${member.lastName || ""}`.trim(),
              matricule: member.id,
              photoURL: member.photoURL ?? undefined,
              contacts: member.contacts || [],
            })
          }
        } catch (error) {
          console.error("Erreur lors du chargement du membre:", error)
        }
      } else if (contract.contractType === "GROUP" && contract.groupeId) {
        try {
          const group = await getGroupById(contract.groupeId)
          if (group) {
            setMemberData({
              name: group.name,
            })
          }
        } catch (error) {
          console.error("Erreur lors du chargement du groupe:", error)
        }
      }
    }
    loadMemberData()
  }, [payment])

  const handleRecordPayment = () => {
    setShowPaymentModal(true)
  }

  const handlePaymentSubmit = async (data: PaymentCSFormData) => {
    if (!user?.uid) {
      toast.error("Vous devez être connecté pour enregistrer un paiement")
      return
    }

    try {
      await pay({
        contractId: payment.contract.id || "",
        dueMonthIndex: payment.dueMonthIndex,
        memberId: payment.contract.memberId || "",
        amount: data.amount,
        file: data.proofFile,
        paidAt: new Date(data.date),
        time: data.time,
        mode: data.mode,
      })

      toast.success("Versement enregistré avec succès")
      setShowPaymentModal(false)

      // Invalider les queries pour rafraîchir les données
      queryClient.invalidateQueries({
        queryKey: ["calendar-caisse-speciale"],
      })
      queryClient.invalidateQueries({
        queryKey: ["contract", payment.contract.id],
      })

      // Fermer la sidebar et la rouvrir pour rafraîchir les données
      // Note: En production, on pourrait simplement mettre à jour l'état local
      onClose()
    } catch (error: any) {
      console.error("Erreur lors de l'enregistrement du paiement:", error)
      toast.error(error?.message || "Erreur lors de l'enregistrement du paiement")
      throw error
    }
  }

  const handleViewReceipt = async () => {
    try {
      await generateReceipt()
      setShowReceipt(true)
    } catch (error) {
      toast.error("Impossible de générer le reçu")
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
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
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
          <PaymentSidebarHeader
            payment={payment}
            memberName={memberData.name}
            memberMatricule={memberData.matricule}
            memberPhotoURL={memberData.photoURL}
            memberContacts={memberData.contacts}
            onClose={onClose}
          />
        </div>

        {/* Zone 2 : Contenu scrollable */}
        <div className="flex-1 overflow-y-auto">
          <PaymentSidebarContent
            payment={payment}
            showReceipt={showReceipt}
            receiptUrl={receiptUrl}
          />
        </div>

        {/* Zone 3 : Actions fixes */}
        <div className="flex-shrink-0 border-t">
          <PaymentSidebarActions
            payment={payment}
            onRecordPayment={handleRecordPayment}
            onViewReceipt={handleViewReceipt}
            onDownloadReceipt={handleDownloadReceiptClick}
            isGeneratingReceipt={isGenerating}
          />
        </div>
      </div>

      {/* Modal de paiement */}
      <PaymentCSModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSubmit={handlePaymentSubmit}
        title={`Versement pour le mois M${payment.dueMonthIndex + 1}`}
        description={`Enregistrer le versement pour ${memberData.name || "le membre"}`}
        defaultAmount={payment.amount}
        isGroupContract={payment.contract.contractType === "GROUP"}
      />
    </>
  )
}

export default PaymentSidebar
