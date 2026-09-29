'use client'

import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { ModalBody, ModalContent, ModalHeader } from '@/components/ui/modal'
import { useMember } from '@/hooks/useMembers'
import { usePlacementCommissions } from '@/hooks/usePlacements'
import { EarlyExitPlacement, Placement } from '@/types/types'
import { roundFcfa } from '@/utils/placementMoney'
import { pdf } from '@react-pdf/renderer'
import { DocumentCompletionPanel, useDocumentCompletion } from '@/components/pdf/mutuelle/DocumentCompletionPanel'
import PlacementEarlyExitQuittancePDF, { listPlacementEarlyExitFields } from './PlacementEarlyExitQuittancePDF'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
    AlertCircle,
    Download,
    FileText,
    Loader2,
    Smartphone
} from 'lucide-react'
import React, { useState } from 'react'
import { toast } from 'sonner'

interface PlacementEarlyExitQuittanceModalProps {
  isOpen: boolean
  onClose: () => void
  placement: Placement
  earlyExit: EarlyExitPlacement
  onGenerated?: (documentId: string) => void
}

export default function PlacementEarlyExitQuittanceModal({
  isOpen,
  onClose,
  placement,
  earlyExit,
  onGenerated,
}: PlacementEarlyExitQuittanceModalProps) {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  
  const { data: memberData, isLoading: memberLoading } = useMember(placement.benefactorId)
  const { data: commissions = [] } = usePlacementCommissions(placement.id)
  const { completion, setCompletion } = useDocumentCompletion(isOpen, placement.id)
  const capitalToReturn = roundFcfa(placement.amount)
  const commissionDue = roundFcfa(earlyExit.commissionDue)
  const payoutAmount = roundFcfa(capitalToReturn + commissionDue)

  // Détecter si on est sur mobile
  React.useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    checkDevice()
    window.addEventListener('resize', checkDevice)
    return () => window.removeEventListener('resize', checkDevice)
  }, [])

  const handleDownloadPDF = async () => {
    try {
      setIsGeneratingPDF(true)
      toast.info('Génération du PDF en cours...')

      const blob = await pdf(
        <PlacementEarlyExitQuittancePDF
          placement={placement}
          earlyExit={earlyExit}
          member={memberData}
          commissions={commissions}
          completion={completion}
        />,
      ).toBlob()
      const firstName = memberData?.firstName || 'Bienfaiteur'
      const lastName = memberData?.lastName || 'Inconnu'
      const sanitizeName = (name: string) => name.replace(/[^a-zA-ZÀ-ÿ]/g, '').toUpperCase()
      const fileName = `PROCES_VERBAL_LIQUIDATION_ANTICIPEE_PLACEMENT_${sanitizeName(lastName)}_${sanitizeName(firstName)}.pdf`

      const url = URL.createObjectURL(blob)
      const link = window.document.createElement('a')
      link.href = url
      link.download = fileName
      window.document.body.appendChild(link)
      link.click()
      window.document.body.removeChild(link)
      URL.revokeObjectURL(url)

      // Attacher dans la base (optionnel)
      if (onGenerated) {
        try {
          const file = new File([blob], fileName, { type: 'application/pdf' })
          const { ServiceFactory } = await import('@/factories/ServiceFactory')
          const service = ServiceFactory.getPlacementService()
          const res = await service.uploadEarlyExitQuittance(
            file,
            placement.id,
            placement.benefactorId,
            placement.updatedBy || placement.createdBy
          )
          onGenerated(res.documentId)
        } catch (err) {
          console.error('Erreur lors de l’attachement de la quittance', err)
        }
      }

      toast.success('✅ PDF téléchargé avec succès', {
        description: 'Le procès-verbal de liquidation anticipée a été généré et téléchargé.',
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
          tone="warning"
          title="Procès-verbal de liquidation anticipée"
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
            {/* Avertissement */}
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg p-4 border-2 border-yellow-200">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-yellow-800 mb-1">Sortie anticipée</h4>
                  <p className="text-sm text-yellow-700">
                    Le bienfaiteur a demandé un retrait anticipé avant la fin de la période prévue.
                  </p>
                </div>
              </div>
            </div>

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
                  <p className="font-semibold text-gray-900">{capitalToReturn.toLocaleString('fr-FR')} FCFA</p>
                </div>
                <div>
                  <span className="text-gray-600">Date de demande:</span>
                  <p className="font-semibold text-gray-900">
                    {format(new Date(earlyExit.requestedAt), 'dd/MM/yyyy', { locale: fr })}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Période prévue:</span>
                  <p className="font-semibold text-gray-900">{placement.periodMonths} mois</p>
                </div>
              </div>
            </div>

            {/* Détails du retrait */}
            <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-lg p-6 space-y-3 border-2 border-orange-200">
              <h3 className="font-bold text-lg text-orange-800">Détails du retrait anticipé</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Capital à restituer:</span>
                  <span className="font-semibold">{capitalToReturn.toLocaleString('fr-FR')} FCFA</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Commission due:</span>
                  <span className="font-semibold">{commissionDue.toLocaleString('fr-FR')} FCFA</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-orange-300">
                  <span className="font-bold text-lg text-orange-800">Montant total à verser:</span>
                  <span className="font-bold text-lg text-orange-800">
                    {payoutAmount.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
              </div>
            </div>

            {/* Règle de calcul */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-bold text-sm text-blue-800 mb-2">Règle de calcul appliquée:</h4>
              <p className="text-xs text-blue-700">
                Si au moins 1 mois s'est écoulé depuis le début du placement, la commission d'un mois est due. 
                Sinon, aucune commission n'est due.
              </p>
            </div>

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

            <div className="rounded-lg border border-gray-200 p-4">
              <DocumentCompletionPanel
                fields={listPlacementEarlyExitFields({ placement, earlyExit, member: memberData, commissions })}
                completion={completion}
                onChange={setCompletion}
              />
            </div>

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
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-500 text-white"
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
