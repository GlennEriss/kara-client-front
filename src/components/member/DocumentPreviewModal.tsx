'use client'

import React, { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Download, AlertTriangle, FileText, Monitor, Smartphone } from 'lucide-react'

type DocumentPreviewModalProps = {
  isOpen: boolean
  onClose: () => void
  documentUrl: string | null
  documentName: string
  documentLabel: string
}

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkDevice = () => setIsMobile(window.innerWidth < 1024)
    checkDevice()
    window.addEventListener('resize', checkDevice)
    return () => window.removeEventListener('resize', checkDevice)
  }, [])

  return isMobile
}

export function DocumentPreviewModal({
  isOpen,
  onClose,
  documentUrl,
  documentName,
  documentLabel,
}: DocumentPreviewModalProps) {
  const isMobile = useIsMobile()
  const [iframeError, setIframeError] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setIframeError(false)
    }
  }, [isOpen])

  const handleOpenInNewTab = () => {
    if (documentUrl) {
      window.open(documentUrl, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!w-[95vw] !max-w-5xl max-h-[95vh] overflow-hidden border-0 bg-gradient-to-br from-white to-gray-50 shadow-2xl">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-2xl font-bold text-[#234D65] flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Aperçu du document
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600 truncate">
            {documentName} • {documentLabel}
          </DialogDescription>
        </DialogHeader>

        {!documentUrl ? (
          <Alert className="border-0 bg-gradient-to-r from-orange-50 to-amber-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-sm text-orange-700 font-medium">
              Ce document ne possède pas d'URL valide.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="flex flex-col gap-4 overflow-hidden">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-gray-500">
                {isMobile ? 'Aperçu mobile' : 'Aperçu intégré (PDF)'}
              </div>
              <Button onClick={handleOpenInNewTab} variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Ouvrir dans un nouvel onglet
              </Button>
            </div>

            {isMobile ? (
              <div className="flex flex-col items-center gap-4 rounded-xl border border-gray-200 bg-white p-6 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#234D65]/10 text-[#234D65] shadow-inner">
                  <Smartphone className="h-7 w-7" />
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-gray-700">
                    L'aperçu est limité sur mobile. Utilisez le bouton ci-dessus pour ouvrir le document dans votre navigateur.
                  </p>
                  <Alert className="border-blue-200 bg-blue-50">
                    <Monitor className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-xs text-blue-700">
                      Astuce : pour une meilleure expérience de lecture, utilisez un ordinateur ou une tablette.
                    </AlertDescription>
                  </Alert>
                </div>
              </div>
            ) : (
              <div className="h-[70vh] overflow-hidden rounded-xl border border-gray-200 bg-white">
                {iframeError ? (
                  <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                    <Alert className="max-w-lg border-0 bg-gradient-to-r from-red-50 to-rose-50">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-sm text-red-700">
                        Impossible d'afficher le PDF dans cette fenêtre. Utilisez le bouton pour l'ouvrir dans un nouvel onglet.
                      </AlertDescription>
                    </Alert>
                  </div>
                ) : (
                  <iframe
                    src={documentUrl}
                    className="h-full w-full border-0"
                    title={documentName}
                    onLoad={() => setIframeError(false)}
                    onError={() => setIframeError(true)}
                  />
                )}
              </div>
            )}

            {!isMobile && (
              <p className="text-xs text-gray-500">
                Si le document ne s'affiche pas, cliquez sur « Ouvrir dans un nouvel onglet » pour le consulter directement dans votre navigateur.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

