"use client"

import { useState } from "react"
import { PaymentCI } from "@/types/types"

export function usePaymentReceiptCI(payment: PaymentCI) {
  const [receiptUrl, setReceiptUrl] = useState<string | null>(
    null // Les reçus CI sont générés différemment, on utilisera le service
  )
  const [isGenerating, setIsGenerating] = useState(false)

  const generateReceipt = async () => {
    if (receiptUrl) return receiptUrl

    setIsGenerating(true)
    try {
      // TODO: Utiliser le service existant de génération de reçu CI
      // Pour l'instant, on retourne null car les reçus CI sont générés différemment
      // Il faudra utiliser le service de génération de PDF CI existant
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
