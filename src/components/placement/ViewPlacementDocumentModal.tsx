'use client'

import React, { useState } from 'react'
import { Download, Loader2, Eye, FileText, Smartphone, Monitor, AlertCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { usePlacementDocument } from '@/hooks/placement/usePlacementDocument'

// Hook pour détecter le mobile
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false)

  React.useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    
    checkDevice()
    window.addEventListener('resize', checkDevice)
    
    return () => window.removeEventListener('resize', checkDevice)
  }, [])

  return isMobile
}

interface ViewPlacementDocumentModalProps {
  isOpen: boolean
  onClose: () => void
  documentId: string | null | undefined
  title: string
  description?: string
}

export default function ViewPlacementDocumentModal({
  isOpen,
  onClose,
  documentId,
  title,
  description,
}: ViewPlacementDocumentModalProps) {
  const isMobile = useIsMobile()
  
  // Récupérer le document via le hook
  const { data: document, isLoading, error } = usePlacementDocument(documentId)

  const handleDownloadPDF = () => {
    if (!document?.url) {
      toast.error('URL du document non disponible')
      return
    }

    try {
      // Ouvrir le PDF dans un nouvel onglet
      window.open(document.url, '_blank')
      
      toast.success('PDF ouvert', {
        description: 'Le document s\'ouvre dans un nouvel onglet'
      })
    } catch (error) {
      console.error('Erreur lors de l\'ouverture du PDF:', error)
      toast.error('Erreur lors de l\'ouverture du document')
    }
  }

  if (!documentId) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!w-[95vw] !max-w-[1200px] max-h-[95vh] overflow-y-auto lg:overflow-hidden bg-gradient-to-br from-white to-gray-50 border-0 shadow-2xl">
        {/* Header */}
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4 lg:pb-6 border-b border-gray-200">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2 lg:gap-3">
              <div className="p-2 lg:p-3 rounded-xl bg-gradient-to-br from-[#234D65] to-[#2c5a73] shadow-lg flex-shrink-0">
                <FileText className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-lg lg:text-2xl font-bold bg-gradient-to-r from-[#234D65] to-[#2c5a73] bg-clip-text text-transparent">
                  {title}
                </DialogTitle>
                {description && (
                  <DialogDescription className="text-sm lg:text-base text-gray-600 truncate">
                    {description}
                  </DialogDescription>
                )}
              </div>
            </div>
          </div>
          <Button
            onClick={handleDownloadPDF}
            disabled={isLoading || !document}
            className="mr-2 lg:mr-10 bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-10 px-4 lg:h-12 lg:px-6 flex-shrink-0"
          >
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              <span className="hidden lg:inline">Ouvrir le PDF</span>
            </div>
          </Button>
        </DialogHeader>

        {/* Contenu principal */}
        <div className="flex-1 min-h-[600px] lg:h-[calc(95vh-150px)] overflow-hidden">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-[#234D65] mx-auto" />
                <p className="text-gray-600">Chargement du document...</p>
              </div>
            </div>
          ) : error ? (
            <Alert className="border-0 bg-gradient-to-r from-red-50 to-rose-50">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <AlertDescription className="text-red-700 font-medium">
                Erreur lors du chargement du document
              </AlertDescription>
            </Alert>
          ) : !document ? (
            <Alert className="border-0 bg-gradient-to-r from-orange-50 to-amber-50">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <AlertDescription className="text-orange-700 font-medium">
                Document non trouvé
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {/* Version mobile */}
              <div className="lg:hidden h-full">
                <Card className="h-full bg-gradient-to-br from-white via-gray-50/30 to-white border-0 shadow-lg">
                  <CardContent className="p-4 h-full flex flex-col items-center justify-center text-center space-y-4">
                    <div className="space-y-3">
                      <div className="mx-auto w-14 h-14 bg-gradient-to-br from-[#234D65] to-[#2c5a73] rounded-full flex items-center justify-center shadow-lg">
                        <Smartphone className="h-7 w-7 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">
                          Document disponible
                        </h3>
                        <p className="text-sm text-gray-600 leading-relaxed">
                          Le document PDF est prêt ! Ouvrez-le dans votre navigateur.
                        </p>
                      </div>
                    </div>

                    {/* Informations du document */}
                    <div className="bg-gray-50 rounded-lg p-3 w-full space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Type:</span>
                        <span className="font-medium text-gray-900">{document.type}</span>
                      </div>
                      {document.size && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Taille:</span>
                          <span className="font-medium text-gray-900">
                            {(document.size / 1024 / 1024).toFixed(2)} MB
                          </span>
                        </div>
                      )}
                      {document.createdAt && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Créé le:</span>
                          <span className="font-medium text-gray-900">
                            {new Date(document.createdAt).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={handleDownloadPDF}
                      className="w-full bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65] text-white"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Ouvrir le PDF
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Version desktop */}
              <div className="hidden lg:block h-full">
                <Card className="h-full bg-gradient-to-br from-white via-gray-50/30 to-white border-0 shadow-lg">
                  <CardContent className="p-6 h-full flex flex-col">
                    {/* Informations du document */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Type:</span>
                        <span className="font-medium text-gray-900">{document.type}</span>
                      </div>
                      {document.size && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Taille:</span>
                          <span className="font-medium text-gray-900">
                            {(document.size / 1024 / 1024).toFixed(2)} MB
                          </span>
                        </div>
                      )}
                      {document.createdAt && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Créé le:</span>
                          <span className="font-medium text-gray-900">
                            {new Date(document.createdAt).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Iframe pour afficher le PDF */}
                    <div className="flex-1 border border-gray-200 rounded-lg overflow-hidden bg-gray-100">
                      {document.url ? (
                        <iframe
                          src={document.url}
                          className="w-full h-full"
                          title={title}
                        />
                      ) : (
                        <div className="h-full flex items-center justify-center text-gray-500">
                          <p>URL du document non disponible</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

