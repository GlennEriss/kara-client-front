'use client'

import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { FileText, Download, ExternalLink } from 'lucide-react'

interface ViewUploadedContractModalProps {
  isOpen: boolean
  onClose: () => void
  contract: any
}

const ViewUploadedContractModal: React.FC<ViewUploadedContractModalProps> = ({
  isOpen,
  onClose,
  contract
}) => {
  const handleDownload = () => {
    if (contract?.contractPdf?.url) {
      const link = document.createElement('a')
      link.href = contract.contractPdf.url
      link.download = contract.contractPdf.originalFileName || 'contrat.pdf'
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const handleOpenInNewTab = () => {
    if (contract?.contractPdf?.url) {
      window.open(contract.contractPdf.url, '_blank')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-w-[95vw] w-full h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Contrat PDF - {contract?.id}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col space-y-4">

          {/* Aperçu du PDF */}
          <div className="flex-1 bg-gray-50 rounded-lg border">
            {contract?.contractPdf?.url ? (
              <iframe
                src={contract.contractPdf.url}
                className="w-full h-full rounded-lg"
                title="Aperçu du contrat PDF"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <FileText className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                  <p>Aucun fichier PDF disponible</p>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t">
            <Button
              variant="outline"
              onClick={onClose}
              className="px-6"
            >
              Fermer
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleOpenInNewTab}
                disabled={!contract?.contractPdf?.url}
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Ouvrir dans un nouvel onglet
              </Button>
              <Button
                onClick={handleDownload}
                disabled={!contract?.contractPdf?.url}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <Download className="h-4 w-4" />
                Télécharger
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ViewUploadedContractModal
