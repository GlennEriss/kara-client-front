"use client"

import React, { useState, useEffect } from 'react'
import { Download, Loader2, Eye, FileText, Smartphone, Monitor, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { RefundDocument } from '@/types/types'
import { toast } from 'sonner'

// Hook pour détecter le mobile uniquement
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < 1024) // lg breakpoint
    }
    
    checkDevice()
    window.addEventListener('resize', checkDevice)
    
    return () => window.removeEventListener('resize', checkDevice)
  }, [])

  return isMobile
}

interface PdfViewerModalProps {
  isOpen: boolean
  onClose: () => void
  document: RefundDocument
  title?: string
}

const PdfViewerModal: React.FC<PdfViewerModalProps> = ({
  isOpen,
  onClose,
  document,
  title = "Document PDF"
}) => {
  const [isLoading, setIsLoading] = useState(true)
  const [pdfError, setPdfError] = useState(false)
  const isMobile = useIsMobile()

  // Ne pas afficher le modal si le document est null
  if (!document) {
    return null
  }

  const handleDownloadPDF = async () => {
    try {
      setIsLoading(true)
      
      // Télécharger le PDF depuis l'URL
      const response = await fetch(document.url)
      if (!response.ok) {
        throw new Error('Erreur lors du téléchargement du PDF')
      }
      
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = window.document.createElement('a')
      link.href = url
      link.download = document.originalFileName || `document_${document.id}.pdf`
      window.document.body.appendChild(link)
      link.click()
      window.document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success('✅ PDF téléchargé avec succès', {
        description: 'Le document a été téléchargé dans votre dossier de téléchargements.',
        duration: 3000,
      })

    } catch (error) {
      console.error('Erreur lors du téléchargement du PDF:', error)
      toast.error('❌ Erreur de téléchargement', {
        description: 'Une erreur est survenue lors du téléchargement du PDF. Veuillez réessayer.',
        duration: 4000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenInNewTab = () => {
    window.open(document.url, '_blank')
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!w-[95vw] !max-w-[1400px] max-h-[95vh] lg:max-h-[95vh] overflow-y-auto lg:overflow-hidden bg-gradient-to-br from-white to-gray-50 border-0 shadow-2xl">
        {/* Header */}
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4 lg:pb-6 border-b border-gray-200">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2 lg:gap-3">
              <div className="p-2 lg:p-3 rounded-xl bg-gradient-to-br from-red-600 to-red-700 shadow-lg flex-shrink-0">
                <FileText className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-lg lg:text-2xl font-bold bg-gradient-to-r from-red-600 to-red-700 bg-clip-text text-transparent">
                  📄 {title}
                </DialogTitle>
                <p className="text-sm lg:text-base text-gray-600 truncate">
                  {document.originalFileName}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleOpenInNewTab}
              variant="outline"
              className="mr-2 lg:mr-4 border-red-300 text-red-600 hover:bg-red-50 h-10 px-4 lg:h-12 lg:px-6 flex-shrink-0"
            >
              <Eye className="w-4 h-4 mr-2" />
              <span className="hidden lg:inline">Ouvrir</span>
            </Button>
            <Button
              onClick={handleDownloadPDF}
              disabled={isLoading}
              className="mr-2 lg:mr-10 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-10 px-4 lg:h-12 lg:px-6 flex-shrink-0"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="hidden lg:inline">Téléchargement...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  <span className="hidden lg:inline">Télécharger</span>
                </div>
              )}
            </Button>
          </div>
        </DialogHeader>

        {/* Contenu principal */}
        <div className="flex-1 h-[calc(95vh-120px)] lg:h-[calc(95vh-150px)] overflow-hidden">
          {/* Version mobile */}
          <div className="lg:hidden h-full">
            <Card className="h-full bg-gradient-to-br from-white via-gray-50/30 to-white border-0 shadow-lg">
              <CardContent className="p-4 h-full flex flex-col items-center justify-center text-center space-y-4">
                {/* Icône et titre mobile */}
                <div className="space-y-3">
                  <div className="mx-auto w-14 h-14 bg-gradient-to-br from-red-600 to-red-700 rounded-full flex items-center justify-center shadow-lg">
                    <Smartphone className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                      Document PDF
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Le document est prêt ! Ouvrez-le dans votre navigateur ou téléchargez-le.
                    </p>
                  </div>
                </div>

                {/* Informations du document mobile */}
                <div className="bg-gray-50 rounded-lg p-3 w-full space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Fichier:</span>
                    <span className="font-medium text-gray-900 truncate max-w-[140px]">
                      {document.originalFileName}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Taille:</span>
                    <span className="font-medium text-gray-900">
                      {(document.fileSize / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Téléversé:</span>
                    <span className="font-medium text-gray-900">
                      {new Date(document.uploadedAt).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </div>

                {/* Boutons d'action mobile */}
                <div className="w-full space-y-2">
                  <Button
                    onClick={handleOpenInNewTab}
                    className="w-full h-11 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Ouvrir dans le navigateur
                  </Button>
                  
                  <Button
                    onClick={handleDownloadPDF}
                    disabled={isLoading}
                    variant="outline"
                    className="w-full h-11 border-2 border-red-600 text-red-600 hover:bg-red-600 hover:text-white transition-all duration-300"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Téléchargement...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Télécharger PDF
                      </>
                    )}
                  </Button>
                </div>

                {/* Aide mobile */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 w-full">
                  <div className="flex items-start gap-2">
                    <Monitor className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-blue-700 leading-relaxed">
                      <strong>Astuce:</strong> Pour une meilleure expérience de visualisation, 
                      utilisez un ordinateur ou une tablette.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Version desktop */}
          <div className="hidden lg:block h-full rounded-xl overflow-hidden shadow-inner bg-white border">
            {pdfError ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Erreur de chargement
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Impossible de charger le PDF. Vous pouvez l'ouvrir dans un nouvel onglet.
                  </p>
                  <Button onClick={handleOpenInNewTab} variant="outline">
                    <Eye className="w-4 h-4 mr-2" />
                    Ouvrir dans le navigateur
                  </Button>
                </div>
              </div>
            ) : (
              <iframe
                src={document.url}
                className="w-full h-full border-0"
                onLoad={() => setIsLoading(false)}
                onError={() => {
                  setPdfError(true)
                  setIsLoading(false)
                }}
                title={document.originalFileName}
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default PdfViewerModal
