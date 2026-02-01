'use client'

import React, { useState } from 'react'
import { PDFViewer, pdf, BlobProvider } from '@react-pdf/renderer'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download, Loader2, FileText, Monitor, Smartphone, Save } from 'lucide-react'
import { toast } from 'sonner'
import { CreditContract } from '@/types/types'
import { ServiceFactory } from '@/factories/ServiceFactory'
import { useMember } from '@/hooks/useMembers'
import QuittanceCreditSpecialePDF from './QuittanceCreditSpecialePDF'

interface QuittanceCreditSpecialePDFModalProps {
  isOpen: boolean
  onClose: () => void
  contract: CreditContract
}

const QuittanceCreditSpecialePDFModal: React.FC<QuittanceCreditSpecialePDFModalProps> = ({
  isOpen,
  onClose,
  contract
}) => {
  const [isExporting, setIsExporting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Récupérer le téléphone du garant (membre)
  const { data: guarantorData } = useMember(
    contract.guarantorIsMember && contract.guarantorId ? contract.guarantorId : undefined
  )
  const guarantorPhone = guarantorData?.contacts?.[0] || '—'

  // Nom du fichier : Quittance_Empunt_Nom_Prenom_du_membre.pdf
  const lastName = (contract.clientLastName || 'Membre').replace(/[\s/\\?*:|"<>]/g, '_').trim()
  const firstName = (contract.clientFirstName || 'Inconnu').replace(/[\s/\\?*:|"<>]/g, '_').trim()
  const quittanceFilename = `Quittance_Empunt_${lastName}_${firstName}_du_membre.pdf`

  // Détecter si on est sur mobile
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024) // lg breakpoint
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Fonction pour télécharger le PDF
  const handleDownload = async () => {
    try {
      setIsExporting(true)
      toast.info('Génération du PDF en cours...')

      const doc = <QuittanceCreditSpecialePDF contract={contract} guarantorPhone={guarantorPhone} />

      const blob = await pdf(doc).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = quittanceFilename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success('PDF téléchargé avec succès')
    } catch (error: any) {
      console.error('Erreur lors de la génération du PDF:', error)
      toast.error('Erreur lors de la génération du PDF')
    } finally {
      setIsExporting(false)
    }
  }

  // Générer le PDF et l'enregistrer dans Firebase
  const handleGenerateAndSave = async () => {
    try {
      setIsSaving(true)
      toast.info('Génération et enregistrement de la quittance...')

      const doc = <QuittanceCreditSpecialePDF contract={contract} guarantorPhone={guarantorPhone} />

      const blob = await pdf(doc).toBlob()
      const file = new File([blob], quittanceFilename, { type: 'application/pdf' })

      // Upload via le service
      const service = ServiceFactory.getCreditSpecialeService()
      await service.generateQuittancePDF(contract.id, file)
      
      toast.success('Quittance générée et enregistrée avec succès')
      onClose()
    } catch (error: any) {
      console.error('Erreur lors de la génération/sauvegarde du PDF:', error)
      toast.error(error?.message || 'Erreur lors de la génération de la quittance')
    } finally {
      setIsSaving(false)
    }
  }

  const clientName = `${contract.clientFirstName || ''} ${contract.clientLastName || ''}`.trim()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!w-[95vw] !max-w-[1400px] max-h-[95vh] lg:max-h-[95vh] overflow-y-auto lg:overflow-hidden bg-gradient-to-br from-white to-gray-50 border-0 shadow-2xl">
        {/* Header */}
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4 lg:pb-6 border-b border-gray-200">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2 lg:gap-3">
              <div className="p-2 lg:p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg flex-shrink-0">
                <FileText className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-lg lg:text-2xl font-bold bg-gradient-to-r from-emerald-500 to-emerald-600 bg-clip-text text-transparent">
                  Quittance de remboursement
                </DialogTitle>
                <p className="text-sm lg:text-base text-gray-600 truncate">
                  {clientName} - Contrat #{contract.id?.slice(-6)}
                </p>
              </div>
            </div>
          </div>
          <Button
            onClick={handleDownload}
            disabled={isExporting || isSaving}
            className="mr-2 lg:mr-10 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-500 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-10 px-4 lg:h-12 lg:px-6 flex-shrink-0"
          >
            {isExporting ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="hidden lg:inline">Génération...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                <span className="hidden lg:inline">Télécharger PDF</span>
              </div>
            )}
          </Button>
        </DialogHeader>

        {/* Contenu principal */}
        <div className="flex-1 h-[calc(95vh-120px)] lg:h-[calc(95vh-150px)] overflow-hidden">
          {/* Version mobile */}
          <div className="lg:hidden h-full">
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 p-4">
              {/* Icône et titre mobile */}
              <div className="space-y-3">
                <div className="mx-auto w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
                  <Smartphone className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">
                    Prévisualisation mobile
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    La quittance PDF est prête ! Ouvrez-la dans votre navigateur ou téléchargez-la.
                  </p>
                </div>
              </div>

              {/* Informations du document mobile */}
              <div className="bg-gray-50 rounded-lg p-3 w-full space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Document:</span>
                  <span className="font-medium text-gray-900">Quittance de remboursement</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Client:</span>
                  <span className="font-medium text-gray-900">{clientName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Contrat:</span>
                  <span className="font-medium text-gray-900">#{contract.id?.slice(-6)}</span>
                </div>
              </div>

              {/* Boutons d'action mobile */}
              <BlobProvider document={<QuittanceCreditSpecialePDF contract={contract} guarantorPhone={guarantorPhone} />}>
                {({ url, loading }) => (
                  <div className="w-full space-y-2">
                    <Button
                      asChild
                      disabled={loading || !url}
                      className="w-full h-11 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-500 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      <a href={url ?? '#'} target="_blank" rel="noopener noreferrer">
                        <FileText className="w-4 h-4 mr-2" />
                        Ouvrir dans le navigateur
                      </a>
                    </Button>

                    <Button
                      onClick={handleDownload}
                      disabled={isExporting}
                      variant="outline"
                      className="w-full h-11 border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all duration-300"
                    >
                      {isExporting ? (
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
                )}
              </BlobProvider>

              {/* Aide mobile */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 w-full">
                <div className="flex items-start gap-2">
                  <Monitor className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-emerald-700 leading-relaxed">
                    <strong>Astuce:</strong> Pour une meilleure expérience de visualisation,
                    utilisez un ordinateur ou une tablette.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Version desktop */}
          <div className="hidden lg:block h-full rounded-xl overflow-hidden shadow-inner bg-white border">
            <PDFViewer style={{
              width: '100%',
              height: '100%',
              border: 'none',
              borderRadius: '0.75rem'
            }}>
              <QuittanceCreditSpecialePDF contract={contract} guarantorPhone={guarantorPhone} />
            </PDFViewer>
          </div>
        </div>

        {/* Footer avec bouton d'enregistrement */}
        <div className="px-4 lg:px-6 py-3 lg:py-4 border-t border-gray-200 bg-gray-50/50 flex flex-col lg:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Monitor className="h-4 w-4" />
            <span>Quittance - {clientName}</span>
          </div>
          <Button
            onClick={handleGenerateAndSave}
            disabled={isExporting || isSaving}
            className="w-full lg:w-auto bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Générer et enregistrer
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default QuittanceCreditSpecialePDFModal
