'use client'

import React, { useState, useMemo } from 'react'
import { PDFViewer, pdf } from '@react-pdf/renderer'
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
import { useMemberById } from '@/domains/memberships/hooks/useMemberById'
import CaisseImprevuePDFV3 from './CaisseImprevuePDFV3'

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
  const { data: member } = useMemberById(contract?.memberId)
  const contractWithMember = useMemo(() => {
    if (!contract) return null
    return { ...contract, member: member ?? undefined }
  }, [contract, member])

  const generatePDF = async () => {
    const base = contractWithMember ?? contract
    if (!base) return

    setIsGenerating(true)

    try {
      const blob = await pdf(<CaisseImprevuePDFV3 contract={base} />).toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url

      // Nom du fichier : LASTNAME_FIRSTNAME_CAISSE_IMPREVUE_MK_YYYY.pdf (ex: OBIANG_ELLA_CAISSE_IMPREVUE_MK_2026.pdf)
      const last = String(base.memberLastName ?? '').toUpperCase().replace(/\s+/g, '_')
      const first = String(base.memberFirstName ?? '').toUpperCase().replace(/\s+/g, '_')
      const year = new Date().getFullYear()
      const fileName = `${last}_${first}_CAISSE_IMPREVUE_MK_${year}.pdf`
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      setIsGenerating(false)
      onClose()
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
            <PDFViewer style={{ width: '100%', height: '80vh' }}>
              <CaisseImprevuePDFV3 contract={contractWithMember ?? contract} />
            </PDFViewer>
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
