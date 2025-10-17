'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { FileText, Download, Loader2 } from 'lucide-react'
import { ContractCI } from '@/types/types'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import ContractCIView from './ContractCIView'

interface DownloadContractCIModalProps {
  isOpen: boolean
  onClose: () => void
  contract: ContractCI | null
}

export default function DownloadContractCIModal({
  isOpen,
  onClose,
  contract
}: DownloadContractCIModalProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  const generatePDF = async () => {
    if (!contract) return

    setIsGenerating(true)

    try {
      // Récupérer l'élément HTML du contrat
      const element = document.getElementById('contract-pdf-view')
      if (!element) {
        throw new Error('Élément du contrat non trouvé')
      }

      // Convertir le HTML en canvas avec html2canvas
      const canvas = await html2canvas(element, {
        scale: 2, // Meilleure qualité
        useCORS: true, // Pour charger les images externes
        logging: false,
        backgroundColor: '#ffffff',
      })

      // Créer un PDF
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })

      const imgWidth = 210 // A4 width in mm
      const pageHeight = 297 // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight
      let position = 0

      // Ajouter la première page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      // Ajouter des pages supplémentaires si nécessaire
      while (heightLeft > 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      // Télécharger le PDF
      pdf.save(`Contrat_CI_${contract.id}_${Date.now()}.pdf`)
      
      setTimeout(() => {
        setIsGenerating(false)
        onClose()
      }, 500)
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error)
      setIsGenerating(false)
    }
  }

  if (!contract) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] md:max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#234D65]" />
            Prévisualisation du contrat
          </DialogTitle>
          <DialogDescription>
            Contrat #{contract.id.slice(-6)} - {contract.memberFirstName} {contract.memberLastName}
          </DialogDescription>
        </DialogHeader>

        {/* Preview du contrat avec scroll */}
        <div className="flex-1 overflow-y-auto border rounded-lg bg-gray-50 p-4">
          <div className="bg-white shadow-lg mx-auto" style={{ maxWidth: '210mm' }}>
            <ContractCIView contract={contract} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex gap-3 justify-end pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isGenerating}
          >
            Fermer
          </Button>
          <Button
            onClick={generatePDF}
            disabled={isGenerating}
            className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65]"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Génération...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Télécharger PDF
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

