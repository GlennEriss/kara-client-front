'use client'

import React from 'react'
import { BlobProvider, PDFViewer, pdf } from '@react-pdf/renderer'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download, FileText, Loader2, Smartphone } from 'lucide-react'
import { toast } from 'sonner'
import type { Placement } from '@/types/types'
import { useMember } from '@/hooks/useMembers'
import PlacementContractPDF from './PlacementContractPDF'

export default function PlacementContractPDFModal({
  isOpen,
  onClose,
  placement,
}: {
  isOpen: boolean
  onClose: () => void
  placement: Placement | null
}) {
  const [isExporting, setIsExporting] = React.useState(false)

  const { data: member, isLoading: memberLoading } = useMember(placement?.benefactorId)

  const handleDownload = async () => {
    if (!placement) return
    setIsExporting(true)
    try {
      const blob = await pdf(<PlacementContractPDF placement={placement} member={member} />).toBlob()
      const url = URL.createObjectURL(blob)
      const link = window.document.createElement('a')
      link.href = url

      const year = new Date().getFullYear()
      const last = String(member?.lastName || 'BIENFAITEUR').toUpperCase().replace(/\s+/g, '_')
      const first = String(member?.firstName || '').toUpperCase().replace(/\s+/g, '_')
      link.download = `${last}${first ? `_${first}` : ''}_CAISSE_BIENFAITEUR_${year}.pdf`
      window.document.body.appendChild(link)
      link.click()
      window.document.body.removeChild(link)
      URL.revokeObjectURL(url)
      toast.success('PDF téléchargé', { description: 'Le contrat a été généré et téléchargé.' })
    } catch (error) {
      console.error('Erreur génération contrat placement PDF:', error)
      toast.error('Erreur de génération', { description: 'Impossible de générer le PDF.' })
    } finally {
      setIsExporting(false)
    }
  }

  if (!placement) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!w-[95vw] !max-w-[1400px] max-h-[95vh] lg:max-h-[95vh] overflow-y-auto lg:overflow-hidden bg-gradient-to-br from-white to-gray-50 border-0 shadow-2xl">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4 lg:pb-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 lg:p-3 rounded-xl bg-gradient-to-br from-[#234D65] to-[#2c5a73] shadow-lg flex-shrink-0">
              <FileText className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg lg:text-2xl font-bold bg-gradient-to-r from-[#234D65] to-[#2c5a73] bg-clip-text text-transparent">
                Contrat Caisse Bienfaiteur
              </DialogTitle>
              <p className="text-sm lg:text-base text-gray-600 truncate">Placement #{placement.id.slice(0, 8)}</p>
            </div>
          </div>

          <Button
            onClick={handleDownload}
            disabled={isExporting || memberLoading}
            className="mr-2 lg:mr-10 bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-10 px-4 lg:h-12 lg:px-6 flex-shrink-0"
          >
            {isExporting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="hidden lg:inline">Génération...</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                <span className="hidden lg:inline">Télécharger PDF</span>
              </span>
            )}
          </Button>
        </DialogHeader>

        <div className="flex-1 h-[calc(95vh-120px)] lg:h-[calc(95vh-150px)] overflow-hidden">
          {memberLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-3">
                <Loader2 className="w-10 h-10 animate-spin text-[#234D65] mx-auto" />
                <p className="text-gray-600">Chargement des informations du bienfaiteur...</p>
              </div>
            </div>
          ) : (
            <>
              <div className="lg:hidden h-full flex items-center justify-center p-6 text-center">
                <div className="space-y-4">
                  <div className="mx-auto w-14 h-14 bg-gradient-to-br from-[#234D65] to-[#2c5a73] rounded-full flex items-center justify-center shadow-lg">
                    <Smartphone className="h-7 w-7 text-white" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-lg font-bold text-gray-900">Prévisualisation mobile</div>
                    <div className="text-sm text-gray-600">Télécharge le PDF ou ouvre-le dans un nouvel onglet.</div>
                  </div>
                  <BlobProvider document={<PlacementContractPDF placement={placement} member={member} />}>
                    {({ url, loading }) => (
                      <Button asChild disabled={loading || !url} className="w-full h-11 bg-[#234D65] hover:bg-[#2c5a73]">
                        <a href={url ?? '#'} target="_blank" rel="noopener noreferrer">
                          <FileText className="w-4 h-4 mr-2" />
                          Ouvrir le PDF
                        </a>
                      </Button>
                    )}
                  </BlobProvider>
                </div>
              </div>

              <div className="hidden lg:block h-full">
                <PDFViewer width="100%" height="100%" style={{ border: 'none' }}>
                  <PlacementContractPDF placement={placement} member={member} />
                </PDFViewer>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

