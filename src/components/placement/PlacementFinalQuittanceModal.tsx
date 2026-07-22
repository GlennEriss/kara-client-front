'use client'

import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { ModalBody, ModalContent, ModalHeader } from '@/components/ui/modal'
import { useMember } from '@/hooks/useMembers'
import { usePlacementCommissions } from '@/hooks/usePlacements'
import { Placement } from '@/types/types'
import { BlobProvider, PDFViewer, pdf } from '@react-pdf/renderer'
import {
    Download,
    FileText,
    Loader2,
    Smartphone
} from 'lucide-react'
import React, { useMemo, useState } from 'react'
import { toast } from 'sonner'
import PlacementFinalQuittancePDF from './PlacementFinalQuittancePDF'

// Fonction pour convertir un nombre en lettres (simplifiée)
const numberToWords = (num: number): string => {
  if (num === 0) return 'zéro'
  
  const ones = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf']
  const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix']
  
  if (num < 20) return ones[num]
  if (num < 100) {
    const ten = Math.floor(num / 10)
    const one = num % 10
    if (ten === 7) {
      return one === 0 ? 'soixante-dix' : `soixante-${ones[10 + one]}`
    }
    if (ten === 9) {
      return one === 0 ? 'quatre-vingt-dix' : `quatre-vingt-${ones[10 + one]}`
    }
    return tens[ten] + (one > 0 ? `-${ones[one]}` : '')
  }
  if (num < 1000) {
    const hundred = Math.floor(num / 100)
    const remainder = num % 100
    const hundredText = hundred === 1 ? 'cent' : `${ones[hundred]} cent`
    return remainder > 0 ? `${hundredText} ${numberToWords(remainder)}` : hundredText
  }
  if (num < 1000000) {
    const thousand = Math.floor(num / 1000)
    const remainder = num % 1000
    const thousandText = thousand === 1 ? 'mille' : `${numberToWords(thousand)} mille`
    return remainder > 0 ? `${thousandText} ${numberToWords(remainder)}` : thousandText
  }
  return num.toString() // Pour les très grands nombres, on retourne le nombre
}

interface PlacementFinalQuittanceModalProps {
  isOpen: boolean
  onClose: () => void
  placement: Placement
  onGenerated?: (documentId: string) => void
}

export default function PlacementFinalQuittanceModal({
  isOpen,
  onClose,
  placement,
  onGenerated,
}: PlacementFinalQuittanceModalProps) {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  
  const { data: memberData, isLoading: memberLoading } = useMember(placement.benefactorId)
  const { data: commissions = [] } = usePlacementCommissions(placement.id)

  // Détecter si on est sur mobile
  React.useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    checkDevice()
    window.addEventListener('resize', checkDevice)
    return () => window.removeEventListener('resize', checkDevice)
  }, [])

  const totalCommissions = commissions.reduce((sum, c) => sum + c.amount, 0)
  const totalPaid = placement.amount + totalCommissions

  const fileName = useMemo(() => {
    const sanitizeName = (name: string) => name.replace(/[^a-zA-ZÀ-ÿ]/g, '').toUpperCase()
    const firstName = memberData?.firstName || 'Bienfaiteur'
    const lastName = memberData?.lastName || 'Inconnu'
    return `QUITTANCE_FINALE_${sanitizeName(firstName)}_${sanitizeName(lastName)}.pdf`
  }, [memberData?.firstName, memberData?.lastName])

  const pdfDocument = useMemo(
    () => (
      <PlacementFinalQuittancePDF
        placement={placement}
        member={memberData}
        commissions={commissions}
        amountInWords={numberToWords(Math.floor(totalPaid))}
      />
    ),
    [placement, memberData, commissions, totalPaid],
  )

  const handleDownloadPDF = async () => {
    try {
      setIsGeneratingPDF(true)
      toast.info('Génération du PDF en cours...')

      const blob = await pdf(pdfDocument).toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      if (onGenerated) {
        try {
          const file = new File([blob], fileName, { type: 'application/pdf' })
          const { ServiceFactory } = await import('@/factories/ServiceFactory')
          const service = ServiceFactory.getPlacementService()
          const res = await service.uploadFinalQuittance(
            file,
            placement.id,
            placement.benefactorId,
            placement.updatedBy || placement.createdBy,
          )
          onGenerated(res.documentId)
        } catch (err) {
          console.error('Erreur lors de l\'attachement de la quittance finale', err)
        }
      }

      toast.success('✅ PDF téléchargé avec succès', {
        description: 'La quittance finale a été générée et téléchargée.',
        duration: 3000,
      })
    } catch (error) {
      console.error('Erreur lors du téléchargement du PDF:', error)
      toast.error('❌ Erreur de téléchargement', {
        description: 'Une erreur est survenue lors de la génération du PDF. Veuillez réessayer.',
        duration: 4000,
      })
    } finally {
      setIsGeneratingPDF(false)
    }
  }


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <ModalContent size="lg" className="max-w-[95vw]">
        <ModalHeader
          icon={FileText}
          tone="success"
          title="Quittance Finale - Placement"
          description={<>Placement #{placement.id.slice(-8).toUpperCase()}</>}
        />

        <ModalBody>
        {memberLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#234D65]" />
            <span className="ml-2 text-gray-600">Chargement des données...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Informations du placement */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-6 space-y-4">
              <h3 className="font-bold text-lg text-gray-800">Informations du placement</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Bienfaiteur:</span>
                  <p className="font-semibold text-gray-900">
                    {memberData 
                      ? `${memberData.firstName} ${memberData.lastName}`
                      : `#${placement.benefactorId.slice(0, 8)}`}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Montant placé:</span>
                  <p className="font-semibold text-gray-900">{placement.amount.toLocaleString()} FCFA</p>
                </div>
                <div>
                  <span className="text-gray-600">Taux:</span>
                  <p className="font-semibold text-gray-900">{placement.rate}%</p>
                </div>
                <div>
                  <span className="text-gray-600">Période:</span>
                  <p className="font-semibold text-gray-900">{placement.periodMonths} mois</p>
                </div>
              </div>
            </div>

            {/* Récapitulatif */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-6 space-y-3 border-2 border-green-200">
              <h3 className="font-bold text-lg text-green-800">Récapitulatif</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Capital placé:</span>
                  <span className="font-semibold">{placement.amount.toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total commissions:</span>
                  <span className="font-semibold">
                    {commissions.reduce((sum, c) => sum + c.amount, 0).toLocaleString()} FCFA
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-green-300">
                  <span className="font-bold text-lg text-green-800">Montant total restitué:</span>
                  <span className="font-bold text-lg text-green-800">
                    {(placement.amount + commissions.reduce((sum, c) => sum + c.amount, 0)).toLocaleString()} FCFA
                  </span>
                </div>
              </div>
            </div>

            {/* Aperçu du document (desktop) / ouverture navigateur (mobile) */}
            {isMobile ? (
              <BlobProvider document={pdfDocument}>
                {({ url, loading }) => (
                  <Button
                    asChild
                    disabled={loading || !url}
                    variant="outline"
                    className="w-full h-11 border-2 border-green-500 text-green-600 hover:bg-green-500 hover:text-white"
                  >
                    <a href={url ?? '#'} target="_blank" rel="noopener noreferrer">
                      <FileText className="w-4 h-4 mr-2" />
                      {loading ? 'Préparation...' : 'Ouvrir dans le navigateur'}
                    </a>
                  </Button>
                )}
              </BlobProvider>
            ) : (
              <div className="h-[60vh] w-full overflow-hidden rounded-lg border border-gray-200">
                <PDFViewer width="100%" height="100%" style={{ border: 'none' }} showToolbar={false}>
                  {pdfDocument}
                </PDFViewer>
              </div>
            )}

            {/* Avertissement mobile */}
            {isMobile && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Smartphone className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-blue-700">
                    <strong>Astuce:</strong> Pour une meilleure expérience, utilisez un ordinateur pour visualiser le PDF.
                  </p>
                </div>
              </div>
            )}

            {/* Bouton de téléchargement */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isGeneratingPDF}
              >
                Fermer
              </Button>
              <Button
                onClick={handleDownloadPDF}
                disabled={isGeneratingPDF}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-500 text-white"
              >
                {isGeneratingPDF ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Génération...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Télécharger PDF
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
        </ModalBody>
      </ModalContent>
    </Dialog>
  )
}
