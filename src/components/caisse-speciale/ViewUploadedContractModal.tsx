'use client'

import React, { useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useDocumentCI } from '@/hooks/caisse-imprevue/useDocumentCI'
import { AlertCircle, Download, FileText, Loader2, Monitor, Smartphone } from 'lucide-react'
import { toast } from 'sonner'

const useIsMobile = () => {
  const [isMobile, setIsMobile] = React.useState(false)
  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return isMobile
}

interface ViewUploadedContractModalProps {
  isOpen: boolean
  onClose: () => void
  contract: any
  /** If provided, fetches the document by this ID from the documents collection. */
  documentId?: string
}

const ViewUploadedContractModal: React.FC<ViewUploadedContractModalProps> = ({
  isOpen,
  onClose,
  contract,
  documentId,
}) => {
  const _isMobile = useIsMobile()

  // If documentId given, fetch from documents collection; otherwise use contractPdf.url directly
  const resolvedDocumentId = documentId
  const { data: fetchedDoc, isLoading, error } = useDocumentCI(resolvedDocumentId)

  const resolvedUrl = fetchedDoc?.url ?? contract?.contractPdf?.url ?? null
  const resolvedFileName =
    fetchedDoc?.originalFileName ??
    contract?.contractPdf?.originalFileName ??
    null

  const isDocLoading = !!resolvedDocumentId && isLoading
  const hasError = !!resolvedDocumentId && !!error

  const handleDownloadPDF = () => {
    if (!resolvedUrl) {
      toast.error('URL du document non disponible')
      return
    }
    const last = String(contract?.memberLastName ?? contract?.id ?? '').toUpperCase().replace(/\s+/g, '_')
    const first = String(contract?.memberFirstName ?? '').toUpperCase().replace(/\s+/g, '_')
    const year = new Date().getFullYear()
    const defaultName = first
      ? `${last}_${first}_CAISSE_SPECIALE_${year}.pdf`
      : `CONTRAT_CS_${last}_${year}.pdf`
    const filename = resolvedFileName ?? defaultName
    const proxyUrl = `/api/download?url=${encodeURIComponent(resolvedUrl)}&filename=${encodeURIComponent(filename)}`
    const link = window.document.createElement('a')
    link.href = proxyUrl
    link.download = filename
    window.document.body.appendChild(link)
    link.click()
    window.document.body.removeChild(link)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!w-[95vw] !max-w-[1200px] max-h-[95vh] overflow-y-auto lg:overflow-hidden bg-white border-0 shadow-2xl">
        {/* Header */}
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4 lg:pb-6 border-b border-gray-200">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2 lg:gap-3">
              <div className="p-2 lg:p-3 rounded-xl bg-gradient-to-br from-[#234D65] to-[#2c5a73] shadow-lg flex-shrink-0">
                <FileText className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-lg lg:text-2xl font-bold bg-gradient-to-r from-[#234D65] to-[#2c5a73] bg-clip-text text-transparent truncate">
                  Contrat Téléversé
                </DialogTitle>
                <DialogDescription className="text-sm lg:text-base text-gray-600 truncate">
                  {contract?.memberFirstName
                    ? `${contract.memberFirstName} ${contract.memberLastName} · #${contract.id?.slice(-6)}`
                    : `#${contract?.id?.slice(-6)}`}
                </DialogDescription>
              </div>
            </div>
          </div>
          <Button
            onClick={handleDownloadPDF}
            disabled={isDocLoading || !resolvedUrl}
            className="mr-2 lg:mr-10 bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-10 px-4 lg:h-12 lg:px-6 flex-shrink-0"
          >
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              <span className="hidden lg:inline">Télécharger</span>
            </div>
          </Button>
        </DialogHeader>

        {/* Contenu principal */}
        <div className="flex-1 min-h-[600px] lg:h-[calc(95vh-150px)] overflow-hidden">
          {isDocLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-[#234D65] mx-auto" />
                <p className="text-gray-600">Chargement du document...</p>
              </div>
            </div>
          ) : hasError ? (
            <Alert className="border-0 bg-gradient-to-r from-red-50 to-rose-50">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <AlertDescription className="text-red-700 font-medium">
                Erreur lors du chargement du document
              </AlertDescription>
            </Alert>
          ) : !resolvedUrl ? (
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
                        <h3 className="text-lg font-bold text-gray-900 mb-1">Contrat disponible</h3>
                        <p className="text-sm text-gray-600 leading-relaxed">
                          Le contrat PDF est prêt ! Téléchargez-le pour le consulter.
                        </p>
                      </div>
                    </div>

                    <div className="w-full space-y-2">
                      <Button
                        onClick={handleDownloadPDF}
                        className="w-full h-11 bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65] text-white border-0 shadow-lg"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Télécharger
                      </Button>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 w-full">
                      <div className="flex items-start gap-2">
                        <Monitor className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-blue-700 leading-relaxed">
                          <strong>Astuce :</strong> Pour visualiser directement, utilisez un ordinateur.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Version desktop */}
              <div className="hidden lg:block h-full rounded-xl overflow-hidden shadow-inner bg-white border">
                <iframe
                  src={resolvedUrl}
                  className="w-full h-full border-none"
                  title="Contrat PDF"
                />
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ViewUploadedContractModal
