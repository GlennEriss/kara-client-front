'use client'

import React, { useState } from 'react'
import { PDFViewer, pdf, BlobProvider } from '@react-pdf/renderer'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download, Loader2, FileText, Monitor, Smartphone } from 'lucide-react'
import { toast } from 'sonner'
import { useMember } from '@/hooks/useMembers'
import { useContractPaymentStats } from '@/hooks/caisse-imprevue'
import RemboursementCIPDF from './RemboursementCIPDF'
import { listRefunds } from '@/db/caisse/refunds.db'

interface RemboursementCIPDFModalProps {
  isOpen: boolean
  onClose: () => void
  contractId: string
  contractData?: any
}

const RemboursementCIPDFModal: React.FC<RemboursementCIPDFModalProps> = ({
  isOpen,
  onClose,
  contractId,
  contractData
}) => {
  const [isExporting, setIsExporting] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [refunds, setRefunds] = useState<any[]>([])

  // Récupérer les informations du membre si memberId est disponible
  const { data: memberData, isLoading: memberLoading } = useMember(contractData?.memberId || '')
  
  // Récupérer les statistiques de paiement pour obtenir le montant total versé
  const { data: paymentStats } = useContractPaymentStats(contractId)

  // Charger les refunds pour récupérer le montant nominal
  React.useEffect(() => {
    const loadRefunds = async () => {
      if (contractId) {
        try {
          const refundsData = await listRefunds(contractId)
          setRefunds(refundsData)
        } catch (error) {
          console.error('Error loading refunds:', error)
        }
      }
    }
    loadRefunds()
  }, [contractId, isOpen])

  // Trouver le refund actif pour récupérer le montant nominal
  const activeRefund = React.useMemo(() => {
    return refunds.find((r: any) => 
      (r.type === 'FINAL' || r.type === 'EARLY') && 
      (r.status === 'PENDING' || r.status === 'APPROVED' || r.status === 'PAID')
    )
  }, [refunds])

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
      const blob = await pdf(
        <RemboursementCIPDF 
          contract={contractData} 
          refund={activeRefund}
          memberData={memberData}
        />
      ).toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `remboursement-ci-${contractId}-${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success('✅ PDF téléchargé avec succès', {
        description: 'Le document de remboursement a été généré et téléchargé dans votre dossier de téléchargements.',
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
              <div className="p-2 lg:p-3 rounded-xl bg-gradient-to-br from-green-500 to-green-600 shadow-lg flex-shrink-0">
                <FileText className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-lg lg:text-2xl font-bold bg-gradient-to-r from-green-500 to-green-600 bg-clip-text text-transparent">
                  Document de Remboursement - Caisse Imprévue
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
            className="mr-2 lg:mr-10 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-500 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-10 px-4 lg:h-12 lg:px-6 flex-shrink-0"
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
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-lg">
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
                    <div className="mx-auto w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-lg">
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
                      <span className="font-medium text-gray-900">Remboursement CI</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Contrat:</span>
                      <span className="font-medium text-gray-900">#{contractId.slice(-6)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Pages:</span>
                      <span className="font-medium text-gray-900">3 pages</span>
                    </div>
                  </div>

                  {/* Boutons d'action mobile */}
                  <BlobProvider 
                    document={
                      <RemboursementCIPDF 
                        contract={contractData} 
                        refund={activeRefund}
                        memberData={memberData}
                        totalAmountPaid={paymentStats?.totalAmountPaid}
                      />
                    }
                  >
                    {({ url, loading }) => (
                      <div className="w-full space-y-2">
                        <Button
                          asChild
                          disabled={loading || !url}
                          className="w-full h-11 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-500 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
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
                          className="w-full h-11 border-2 border-green-500 text-green-600 hover:bg-green-500 hover:text-white transition-all duration-300"
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
                  <RemboursementCIPDF 
                    contract={contractData} 
                    refund={activeRefund}
                    memberData={memberData}
                    totalAmountPaid={paymentStats?.totalAmountPaid}
                  />
                </PDFViewer>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default RemboursementCIPDFModal

