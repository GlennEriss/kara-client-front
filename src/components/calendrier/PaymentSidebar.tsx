"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"
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
        } catch {
          // Error loading member - silently fail
        }
      } else if (contract.contractType === "GROUP" && contract.groupeId) {
        try {
          const group = await getGroupById(contract.groupeId)
          if (group) {
            setMemberData({
              name: group.name,
            })
          }
        } catch {
          // Error loading group - silently fail
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
    } catch {
      toast.error("Impossible de générer le reçu")
    }
  }

  const handleDownloadReceiptClick = async () => {
    try {
      await downloadReceipt()
    } catch {
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
          <PaymentSidebarHeader
            payment={payment}
            memberName={memberData.name}
            memberMatricule={memberData.matricule}
            memberPhotoURL={memberData.photoURL}
            memberContacts={memberData.contacts}
            onClose={onClose}
          />
        </div>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-50/50 to-white">
          <PaymentSidebarContent
            payment={payment}
            showReceipt={showReceipt}
            receiptUrl={receiptUrl}
          />
        </div>

        {/* Actions fixes en bas */}
        <div className="flex-shrink-0 border-t border-gray-100">
          <PaymentSidebarActions
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
