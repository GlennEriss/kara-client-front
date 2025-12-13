"use client"

import { useState } from "react"
import { CaissePayment } from "@/services/caisse/types"

export function usePaymentReceipt(payment: CaissePayment) {
  const [receiptUrl, setReceiptUrl] = useState<string | null>(
    payment.proofUrl || null
  )
  const [isGenerating, setIsGenerating] = useState(false)

  const generateReceipt = async () => {
    if (receiptUrl) return receiptUrl

    setIsGenerating(true)
    try {
      // TODO: Utiliser le service existant de génération de reçu
      // Pour l'instant, on retourne le proofUrl s'il existe
      if (payment.proofUrl) {
        setReceiptUrl(payment.proofUrl)
        return payment.proofUrl
      }
      throw new Error("Reçu non disponible")
    } catch (error) {
      console.error("Erreur lors de la génération du reçu:", error)
      throw error
    } finally {
      setIsGenerating(false)
    }
  }

  const downloadReceipt = async () => {
    const url = receiptUrl || (await generateReceipt())
    if (url) {
      window.open(url, "_blank")
    }
  }

  return {
    receiptUrl,
    isGenerating,
    generateReceipt,
    downloadReceipt,
  }
}
