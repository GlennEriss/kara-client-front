'use client'

import { Button } from '@/components/ui/button'
import { pdf } from '@react-pdf/renderer'
import { FileDown, Loader2 } from 'lucide-react'
import React, { useState } from 'react'
import { toast } from 'sonner'

import DemandeRemboursementPDF, { type RefundRequestPdfData } from './DemandeRemboursementPDF'

/** Télécharge la demande de remboursement à faire signer, avant de la joindre à la demande. */
export function DownloadRefundRequestButton({ data, fileName }: { data: RefundRequestPdfData; fileName: string }) {
  const [isGenerating, setIsGenerating] = useState(false)

  const handleDownload = async () => {
    setIsGenerating(true)
    try {
      const blob = await pdf(<DemandeRemboursementPDF data={data} />).toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Erreur lors de la génération de la demande de remboursement:', error)
      toast.error('Impossible de générer la demande de remboursement')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleDownload} disabled={isGenerating}>
      {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
      Télécharger la demande à faire signer
    </Button>
  )
}
