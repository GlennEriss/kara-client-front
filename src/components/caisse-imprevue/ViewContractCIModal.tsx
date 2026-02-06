'use client'

import React, { useState, useMemo } from 'react'
import { Download, Loader2, FileText, Smartphone, Monitor } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ContractCI } from '@/types/types'
import { PDFViewer, PDFDownloadLink } from '@react-pdf/renderer'
import { useMemberById } from '@/domains/memberships/hooks/useMemberById'
import CaisseImprevuePDFV3 from './CaisseImprevuePDFV3'

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

interface ViewContractCIModalProps {
  isOpen: boolean
  onClose: () => void
  contract: ContractCI | null
}

export default function ViewContractCIModal({
  isOpen,
  onClose,
  contract
}: ViewContractCIModalProps) {
  const _isMobile = useIsMobile()
  const [isGenerating, setIsGenerating] = useState(true)
  const { data: member, isLoading: memberLoading } = useMemberById(contract?.memberId)

  const contractWithMember = useMemo(() => {
    if (!contract) return null
    return { ...contract, member: member ?? undefined }
  }, [contract, member])

  React.useEffect(() => {
    if (isOpen && contract) {
      setIsGenerating(true)
      const timer = setTimeout(() => {
        setIsGenerating(false)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [isOpen, contract])

  const isLoading = isGenerating || (Boolean(contract?.memberId) && memberLoading)

  if (!contract) return null

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
                  📋 Contrat Caisse Imprévue
                </DialogTitle>
                <DialogDescription className="text-sm lg:text-base text-gray-600 truncate">
                  {contract.memberFirstName} {contract.memberLastName} - Contrat #{contract.id.slice(-6)}
                </DialogDescription>
              </div>
            </div>
          </div>
          <PDFDownloadLink
            document={<CaisseImprevuePDFV3 contract={contractWithMember ?? contract} />}
            fileName={`Contrat_CI_${contract.memberLastName}_${contract.id.slice(-6)}.pdf`}
          >
            {({ loading }) => (
              <Button
                disabled={loading}
                className="mr-2 lg:mr-10 bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-10 px-4 lg:h-12 lg:px-6 flex-shrink-0"
              >
                <div className="flex items-center gap-2">
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="hidden lg:inline">Préparation...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span className="hidden lg:inline">Télécharger PDF</span>
                    </>
                  )}
                </div>
              </Button>
            )}
          </PDFDownloadLink>
        </DialogHeader>

        {/* Contenu principal */}
        <div className="flex-1 min-h-[600px] lg:h-[calc(95vh-150px)] overflow-hidden">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-[#234D65] mx-auto" />
                <p className="text-gray-600">
                  Génération du document...
                </p>
              </div>
            </div>
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
                          Contrat disponible
                        </h3>
                        <p className="text-sm text-gray-600 leading-relaxed">
                          Le contrat PDF est prêt ! Téléchargez-le pour le consulter.
                        </p>
                      </div>
                    </div>

                    {/* Informations du document */}
                    <div className="bg-gray-50 rounded-lg p-3 w-full space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Contrat:</span>
                        <span className="font-medium text-gray-900">Caisse Imprévue</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Membre:</span>
                        <span className="font-medium text-gray-900">{contract.memberFirstName} {contract.memberLastName}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Forfait:</span>
                        <span className="font-medium text-gray-900">{contract.subscriptionCIAmountPerMonth.toLocaleString('fr-FR')} FCFA/mois</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Format:</span>
                        <span className="font-medium text-gray-900 uppercase">PDF</span>
                      </div>
                    </div>

                    {/* Bouton de téléchargement mobile */}
                    <div className="w-full space-y-2">
                      <PDFDownloadLink
                        document={<CaisseImprevuePDFV3 contract={contractWithMember ?? contract} />}
                        fileName={`Contrat_CI_${contract.memberLastName}_${contract.id.slice(-6)}.pdf`}
                        className="w-full"
                      >
                        {({ loading }) => (
                          <Button
                            disabled={loading}
                            className="w-full h-11 bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                          >
                            {loading ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Préparation...
                              </>
                            ) : (
                              <>
                                <Download className="w-4 h-4 mr-2" />
                                Télécharger le PDF
                              </>
                            )}
                          </Button>
                        )}
                      </PDFDownloadLink>
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

              {/* Version desktop - PDF Viewer */}
              <div className="hidden lg:block h-full rounded-xl overflow-hidden shadow-inner bg-white border">
                <PDFViewer
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                  }}
                  showToolbar={true}
                >
                  <CaisseImprevuePDFV3 contract={contractWithMember ?? contract} />
                </PDFViewer>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
