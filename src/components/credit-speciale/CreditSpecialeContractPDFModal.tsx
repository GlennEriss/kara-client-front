'use client'

import React, { useState } from 'react'
import { PDFViewer, pdf, BlobProvider } from '@react-pdf/renderer'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download, Loader2, FileText, Monitor, Smartphone } from 'lucide-react'
import { toast } from 'sonner'
import { useMember } from '@/hooks/useMembers'
import AdhesionCreditSpecialeV3 from './AdhesionCreditSpecialeV3'
import { CreditContract } from '@/types/types'
import { ServiceFactory } from '@/factories/ServiceFactory'

interface AdhesionCreditSpecialeV2ModalProps {
  isOpen: boolean
  onClose: () => void
  contract: CreditContract
}

const AdhesionCreditSpecialeV2Modal: React.FC<AdhesionCreditSpecialeV2ModalProps> = ({
  isOpen,
  onClose,
  contract
}) => {
  const [isExporting, setIsExporting] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Récupérer les informations du membre
  const { data: memberData, isLoading: memberLoading } = useMember(contract.clientId)

  // Récupérer les informations du garant si c'est un membre
  const { data: guarantorData } = useMember(
    contract.guarantorIsMember && contract.guarantorId ? contract.guarantorId : undefined
  )

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

      const doc = (
        <AdhesionCreditSpecialeV3
          contract={contract}
          memberData={memberData}
          guarantorData={guarantorData}
        />
      )

      const blob = await pdf(doc).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      // Nom du fichier : LASTNAME_FIRSTNAME_CREDIT_SPECIALE_MK_YYYY.pdf (ex: OBIANG_ELLA_CREDIT_SPECIALE_MK_2026.pdf)
      const year = new Date().getFullYear()
      const first = (memberData?.firstName != null ? String(memberData.firstName) : '').toUpperCase().replace(/\s+/g, '_')
      const last = (memberData?.lastName != null ? String(memberData.lastName) : '').toUpperCase().replace(/\s+/g, '_')
      const fileName = last && first ? `${last}_${first}_CREDIT_SPECIALE_MK_${year}.pdf` : `CREDIT_SPECIALE_MK_${contract.id}_${year}.pdf`
      a.download = fileName
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

  // Générer le PDF pour l'upload
  const handleGenerateAndUpload = async () => {
    try {
      setIsExporting(true)
      toast.info('Génération et enregistrement du PDF en cours...')

      const doc = (
        <AdhesionCreditSpecialeV3
          contract={contract}
          memberData={memberData}
          guarantorData={guarantorData}
        />
      )

      const blob = await pdf(doc).toBlob()
      const year = new Date().getFullYear()
      const first = (memberData?.firstName != null ? String(memberData.firstName) : '').toUpperCase().replace(/\s+/g, '_')
      const last = (memberData?.lastName != null ? String(memberData.lastName) : '').toUpperCase().replace(/\s+/g, '_')
      const fileName = last && first ? `${last}_${first}_CREDIT_SPECIALE_MK_${year}.pdf` : `CREDIT_SPECIALE_MK_${contract.id}_${year}.pdf`
      const file = new File([blob], fileName, { type: 'application/pdf' })

      // Upload via le service
      const service = ServiceFactory.getCreditSpecialeService()
      await service.generateContractPDF(contract.id, false, file)
      
      toast.success('PDF généré et enregistré avec succès')
      onClose()
    } catch (error: any) {
      console.error('Erreur lors de la génération/upload du PDF:', error)
      toast.error(error?.message || 'Erreur lors de la génération du PDF')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!w-[95vw] !max-w-[1400px] max-h-[95vh] lg:max-h-[95vh] overflow-y-auto lg:overflow-hidden bg-gradient-to-br from-white to-gray-50 border-0 shadow-2xl">
        {/* Header */}
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4 lg:pb-6 border-b border-gray-200">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2 lg:gap-3">
              <div className="p-2 lg:p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg flex-shrink-0">
                <FileText className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-lg lg:text-2xl font-bold bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent">
                  Contrat de Crédit Spéciale
                </DialogTitle>
                <p className="text-sm lg:text-base text-gray-600 truncate">
                  Contrat #{contract.id?.slice(-6)}
                </p>
              </div>
            </div>
          </div>
          <Button
            onClick={handleDownload}
            disabled={isExporting || memberLoading}
            className="mr-2 lg:mr-10 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-500 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-10 px-4 lg:h-12 lg:px-6 flex-shrink-0"
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
          {/* Indicateur de chargement des données du membre */}
          {memberLoading ? (
            <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                  <Loader2 className="h-8 w-8 text-white animate-spin" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    Chargement des données du membre...
                  </h3>
                  <p className="text-sm text-gray-600">
                    Récupération des informations personnelles
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Version mobile */}
              <div className="lg:hidden h-full">
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 p-4">
                  {/* Icône et titre mobile */}
                  <div className="space-y-3">
                    <div className="mx-auto w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                      <Smartphone className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1">
                        Prévisualisation mobile
                      </h3>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        Le document PDF est prêt ! Ouvrez-le dans votre navigateur ou téléchargez-le.
                      </p>
                    </div>
                  </div>

                  {/* Informations du document mobile */}
                  <div className="bg-gray-50 rounded-lg p-3 w-full space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Document:</span>
                      <span className="font-medium text-gray-900">Contrat Crédit Spéciale</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Contrat:</span>
                      <span className="font-medium text-gray-900">#{contract.id?.slice(-6)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Pages:</span>
                      <span className="font-medium text-gray-900">3 pages</span>
                    </div>
                  </div>

                  {/* Boutons d'action mobile */}
                  <BlobProvider 
                    document={
                      <AdhesionCreditSpecialeV3
                        contract={contract}
                        memberData={memberData}
                        guarantorData={guarantorData}
                      />
                    }
                  >
                    {({ url, loading }) => (
                      <div className="w-full space-y-2">
                        <Button
                          asChild
                          disabled={loading || !url}
                          className="w-full h-11 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-500 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
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
                          className="w-full h-11 border-2 border-blue-500 text-blue-600 hover:bg-blue-500 hover:text-white transition-all duration-300"
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
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 w-full">
                    <div className="flex items-start gap-2">
                      <Monitor className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-blue-700 leading-relaxed">
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
                <AdhesionCreditSpecialeV3
                  contract={contract}
                  memberData={memberData}
                  guarantorData={guarantorData}
                />
                </PDFViewer>
              </div>
            </>
          )}
        </div>

        {/* Footer avec bouton d'enregistrement */}
        <div className="px-4 lg:px-6 py-3 lg:py-4 border-t border-gray-200 bg-gray-50/50 flex flex-col lg:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Monitor className="h-4 w-4" />
            <span>Contrat #{contract.id?.slice(-6)}</span>
          </div>
          <Button
            onClick={handleGenerateAndUpload}
            disabled={isExporting || memberLoading}
            className="w-full lg:w-auto bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Générer et enregistrer
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default AdhesionCreditSpecialeV2Modal
