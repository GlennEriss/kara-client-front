'use client'

import React, { useState } from 'react'
import { PDFViewer, pdf, BlobProvider } from '@react-pdf/renderer'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download, Loader2, FileText, Monitor, Smartphone } from 'lucide-react'
import { toast } from 'sonner'
import { useMember } from '@/hooks/useMembers'
import CaisseSpecialePDF from './CaisseSpecialePDF'

interface CaisseSpecialePDFModalProps {
  isOpen: boolean
  onClose: () => void
  contractId: string
  contractData?: any
}

const CaisseSpecialePDFModal: React.FC<CaisseSpecialePDFModalProps> = ({
  isOpen,
  onClose,
  contractId,
  contractData
}) => {
  const [isExporting, setIsExporting] = useState(false)
  const [isMobile] = useState(false)

  // Récupérer les informations du membre
  const { data: memberData, isLoading: memberLoading } = useMember(contractData?.memberId)

  // Fonction pour calculer l'âge à partir de la date de naissance
  const calculateAge = (birthDate: string | Date) => {
    if (!birthDate) return '—'

    try {
      // Créer un objet Date à partir de la date de naissance
      const birth = new Date(birthDate)
      const today = new Date()

      // Vérifier que la date est valide
      if (isNaN(birth.getTime())) {
        return '—'
      }

      // Calculer l'âge
      let age = today.getFullYear() - birth.getFullYear()

      // Vérifier si l'anniversaire n'est pas encore passé cette année
      const monthDiff = today.getMonth() - birth.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--
      }

      return age.toString()
    } catch {
      return '—'
    }
  }

  // Créer un objet contract enrichi avec les données du membre
  const enrichedContract = React.useMemo(() => {
    if (!contractData) return null

    // Calculer l'âge si on a les données du membre
    const memberWithAge = memberData ? {
      ...memberData,
      age: calculateAge(memberData.birthDate)
    } : memberData

    // Calculer la dernière date de paiement
    let lastPaymentDate = null
    if (contractData.firstPaymentDate && contractData.monthsPlanned) {
      try {
        const firstDate = new Date(contractData.firstPaymentDate)
        const lastDate = new Date(firstDate)
        // Le dernier paiement est monthsPlanned mois après le premier
        lastDate.setMonth(lastDate.getMonth() + contractData.monthsPlanned)
        lastPaymentDate = lastDate
      } catch (error) {
        console.error('Erreur lors du calcul de la dernière date de paiement:', error)
      }
    }

    return {
      ...contractData,
      member: memberWithAge,
      lastPaymentDate
    }
  }, [contractData, memberData])

  // Détecter si on est sur mobile
  React.useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < 1024) // lg breakpoint
    }

    checkDevice()
    window.addEventListener('resize', checkDevice)

    return () => window.removeEventListener('resize', checkDevice)
  }, [])

  const handleDownloadPDF = async () => {
    setIsExporting(true)

    try {
      const blob = await pdf(<CaisseSpecialePDF contract={enrichedContract} />).toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      // Générer le nom du fichier au format MK_CS_FIRSTNAME_LASTNAME
      let fileName = 'MK_CS'
      if (memberData?.firstName && memberData?.lastName) {
        const firstName = memberData.firstName.toUpperCase().replace(/\s+/g, '_')
        const lastName = memberData.lastName.toUpperCase().replace(/\s+/g, '_')
        fileName = `MK_CS_${firstName}_${lastName}.pdf`
      } else {
        fileName = `MK_CS_${contractId}.pdf`
      }
      
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success('✅ PDF téléchargé avec succès', {
        description: 'Le contrat Caisse Spéciale a été généré et téléchargé dans votre dossier de téléchargements.',
        duration: 3000,
      })

    } catch (error) {
      console.error('Erreur lors du téléchargement du PDF:', error)
      toast.error('❌ Erreur de téléchargement', {
        description: 'Une erreur est survenue lors de la génération du PDF. Veuillez réessayer.',
        duration: 4000,
      })
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
              <div className="p-2 lg:p-3 rounded-xl bg-gradient-to-br from-[#234D65] to-[#2c5a73] shadow-lg flex-shrink-0">
                <FileText className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-lg lg:text-2xl font-bold bg-gradient-to-r from-[#234D65] to-[#2c5a73] bg-clip-text text-transparent">
                  📋 Contrat Caisse Spéciale
                </DialogTitle>
                <p className="text-sm lg:text-base text-gray-600 truncate">
                  Contrat #{contractId.slice(-6)}
                </p>
              </div>
            </div>
          </div>
          <Button
            onClick={handleDownloadPDF}
            disabled={isExporting}
            className="mr-2 lg:mr-10 bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-10 px-4 lg:h-12 lg:px-6 flex-shrink-0"
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
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-[#234D65] to-[#2c5a73] rounded-full flex items-center justify-center shadow-lg">
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
                    <div className="mx-auto w-14 h-14 bg-gradient-to-br from-[#234D65] to-[#2c5a73] rounded-full flex items-center justify-center shadow-lg">
                      <Smartphone className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1">
                        Prévisualisation mobile
                      </h3>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        Le contrat PDF est prêt ! Ouvrez-le dans votre navigateur ou téléchargez-le.
                      </p>
                    </div>
                  </div>

                  {/* Informations du document mobile */}
                  <div className="bg-gray-50 rounded-lg p-3 w-full space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Document:</span>
                      <span className="font-medium text-gray-900">Contrat Caisse Spéciale</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Contrat:</span>
                      <span className="font-medium text-gray-900">#{contractId.slice(-6)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Pages:</span>
                      <span className="font-medium text-gray-900">4 pages</span>
                    </div>
                  </div>

                  {/* Boutons d'action mobile */}
                  <BlobProvider document={<CaisseSpecialePDF contract={enrichedContract} />}>
                    {({ url, loading }) => (
                      <div className="w-full space-y-2">
                        <Button
                          asChild
                          disabled={loading || !url}
                          className="w-full h-11 bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                          <a href={url ?? '#'} target="_blank" rel="noopener noreferrer">
                            <FileText className="w-4 h-4 mr-2" />
                            Ouvrir dans le navigateur
                          </a>
                        </Button>

                        <Button
                          onClick={handleDownloadPDF}
                          disabled={isExporting}
                          variant="outline"
                          className="w-full h-11 border-2 border-[#234D65] text-[#234D65] hover:bg-[#234D65] hover:text-white transition-all duration-300"
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
                  <CaisseSpecialePDF contract={enrichedContract} />
                </PDFViewer>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default CaisseSpecialePDFModal
