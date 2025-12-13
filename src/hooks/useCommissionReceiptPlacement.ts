"use client"

import { useState } from "react"
import { CommissionPaymentPlacement } from "@/types/types"
import { RepositoryFactory } from "@/factories/RepositoryFactory"

export function useCommissionReceiptPlacement(commission: CommissionPaymentPlacement) {
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const generateReceipt = async () => {
    if (receiptUrl) return receiptUrl

    setIsGenerating(true)
    try {
      // Utiliser le repository pour récupérer le document de reçu
      const documentRepository = RepositoryFactory.getDocumentRepository()
      if (commission.receiptDocumentId) {
        const document = await documentRepository.getDocumentById(commission.receiptDocumentId)
        if (document) {
          setReceiptUrl(document.url)
          return document.url
        }
      }
      // Si pas de reçu, essayer avec proofDocumentId
      if (commission.proofDocumentId) {
        const document = await documentRepository.getDocumentById(commission.proofDocumentId)
        if (document) {
          setReceiptUrl(document.url)
          return document.url
        }
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
