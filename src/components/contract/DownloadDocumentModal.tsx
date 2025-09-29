'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download, FileText, Loader2, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { pdf, PDFViewer } from '@react-pdf/renderer'
import RemboursementNormalPDF from './RemboursementNormalPDF'

interface DownloadDocumentModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
}

const DownloadDocumentModal: React.FC<DownloadDocumentModalProps> = ({
  isOpen,
  onClose,
  title = "Télécharger le document",
  description = "Téléchargez le document PDF à remplir pour le remboursement"
}) => {
  const [isGenerating, setIsGenerating] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const handleDownload = async () => {
    try {
      setIsGenerating(true)
      
      // Générer le PDF
      const blob = await pdf(RemboursementNormalPDF()).toBlob()
      
      // Créer un lien de téléchargement
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'document_remboursement.pdf'
      
      // Déclencher le téléchargement
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Nettoyer l'URL
      URL.revokeObjectURL(url)
      
      toast.success('Document PDF téléchargé avec succès')
      onClose()
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error)
      toast.error('Erreur lors de la génération du document PDF')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={showPreview ? "sm:max-w-6xl max-w-[95vw] w-full h-[90vh] flex flex-col" : "sm:max-w-md"}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>

        {!showPreview ? (
          <>
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 rounded-lg p-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-900">
                      Document de remboursement
                    </p>
                    <p className="text-xs text-blue-700">
                      Formulaire PDF à remplir manuellement
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-sm text-gray-800 font-medium mb-2">
                  📄 Instructions :
                </p>
                <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                  <li>Prévisualisez le document PDF</li>
                  <li>Téléchargez le document PDF</li>
                  <li>Remplissez toutes les informations requises</li>
                  <li>Signez le document</li>
                  <li>Revenez téléverser le document complété</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-between gap-2">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isGenerating}
              >
                Annuler
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowPreview(true)}
                  disabled={isGenerating}
                  className="flex items-center gap-2"
                >
                  <Eye className="h-4 w-4" />
                  Prévisualiser
                </Button>
                <Button
                  onClick={handleDownload}
                  disabled={isGenerating}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Génération...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Télécharger le PDF
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex-1 min-h-0">
              <PDFViewer width="100%" height="100%" className="border rounded-lg">
                <RemboursementNormalPDF />
              </PDFViewer>
            </div>

            <div className="flex justify-between gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setShowPreview(false)}
                disabled={isGenerating}
              >
                Retour
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={isGenerating}
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleDownload}
                  disabled={isGenerating}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Génération...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Télécharger le PDF
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default DownloadDocumentModal
