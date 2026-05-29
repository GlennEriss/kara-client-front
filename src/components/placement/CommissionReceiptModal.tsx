'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { useAdmin } from '@/hooks/useAdmins'
import { useMember } from '@/hooks/useMembers'
import { usePlacementDocument } from '@/hooks/placement/usePlacementDocument'
import {
  buildPlacementFacturePage1Data,
  generatePlacementFacturePDF,
  mapCommissionToPlacementVersement,
} from '@/services/placement/facturePlacementPdfExport'
import { CommissionPaymentPlacement, Placement } from '@/types/types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
    Calendar,
    CheckCircle,
    DollarSign,
    Download,
    FileText,
    Image as ImageIcon,
    Loader2,
    Maximize2,
    Receipt,
    User,
    X
} from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'
import { toast } from 'sonner'

interface CommissionReceiptModalProps {
  isOpen: boolean
  onClose: () => void
  placement: Placement
  commission: CommissionPaymentPlacement
}

export default function CommissionReceiptModal({
  isOpen,
  onClose,
  placement,
  commission,
}: CommissionReceiptModalProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const { data: member } = useMember(placement?.benefactorId)
  const paymentRecordedById = commission.paymentRecordedBy || commission.updatedBy || ''
  const { data: paymentRecordedByAdmin } = useAdmin(paymentRecordedById)
  
  // Récupérer le document de preuve si disponible
  const { data: proofDocument } = usePlacementDocument(commission.proofDocumentId || undefined)
  const proofUrl = proofDocument?.url || null

  const formatDate = (date: Date | string) => {
    try {
      const dateObj = date instanceof Date ? date : new Date(date)
      return format(dateObj, 'dd MMMM yyyy', { locale: fr })
    } catch {
      return String(date)
    }
  }

  const formatDateTime = (date: Date | string) => {
    try {
      const dateObj = date instanceof Date ? date : new Date(date)
      return format(dateObj, 'dd/MM/yyyy à HH:mm', { locale: fr })
    } catch {
      return String(date)
    }
  }

  const getAdminDisplayName = () => {
    if (paymentRecordedByAdmin) {
      return `${paymentRecordedByAdmin.firstName} ${paymentRecordedByAdmin.lastName}`.trim()
    }
    if (paymentRecordedById) return paymentRecordedById
    return '-'
  }

  const handleDownloadPDF = async () => {
    try {
      setIsGeneratingPDF(true)
      toast.info('Génération du PDF en cours...')
      const page1Data = buildPlacementFacturePage1Data(placement, member)
      const versement = mapCommissionToPlacementVersement({ placement, commission })
      await generatePlacementFacturePDF({
        page1Data,
        versements: [versement],
        filename: `facture_versement_placement_${placement.id}_${commission.id}.pdf`,
        title: 'FACTURE VERSEMENT PLACEMENT',
      })
      toast.success('PDF téléchargé avec succès')
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error)
      toast.error('Erreur lors de la génération du PDF')
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#224D62] flex items-center gap-2">
            <Receipt className="h-6 w-6" />
            Facture de Commission
          </DialogTitle>
          <DialogDescription>
            Facture de paiement de commission pour le placement
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Informations du placement */}
          <Card className="border-0 shadow-md bg-gradient-to-r from-[#234D65]/5 to-[#2c5a73]/5">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span className="font-medium">Bienfaiteur</span>
                  </div>
                  <p className="font-semibold text-gray-900">
                    {placement.benefactorName || placement.benefactorId}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span className="font-medium">N° Placement</span>
                  </div>
                  <p className="font-semibold text-gray-900 font-mono">
                    {placement.id.slice(-8).toUpperCase()}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    <span className="font-medium">Montant du placement</span>
                  </div>
                  <p className="font-semibold text-gray-900">
                    {placement.amount.toLocaleString('fr-FR')} FCFA
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span className="font-medium">Date d'échéance</span>
                  </div>
                  <p className="font-semibold text-gray-900">
                    {formatDate(commission.dueDate)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Statut du paiement */}
          <div className="flex items-center justify-between p-4 bg-green-50 border-2 border-green-200 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-green-900">Commission Payée</p>
                {commission.paidAt && (
                  <p className="text-sm text-green-700">
                    Payée le {formatDateTime(commission.paidAt)}
                  </p>
                )}
                <p className="text-sm text-green-700">
                  Enregistrée par {getAdminDisplayName()}
                  {(commission.paymentRecordedAt || commission.updatedAt) && (
                    <> le {formatDateTime(commission.paymentRecordedAt || commission.updatedAt)}</>
                  )}
                </p>
              </div>
            </div>
            <Badge className="bg-green-600 text-white text-lg px-4 py-2">
              {commission.amount.toLocaleString('fr-FR')} FCFA
            </Badge>
          </div>

          {/* Détails de la commission */}
          <Card className="border-2 border-[#224D62] bg-gradient-to-r from-[#234D65]/10 to-[#2c5a73]/10">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-lg">
                  <span className="text-gray-700">Montant de la commission:</span>
                  <span className="font-semibold text-gray-900">
                    {commission.amount.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-lg">
                  <span className="text-gray-700">Taux appliqué:</span>
                  <span className="font-semibold text-gray-900">
                    {placement.rate}%
                  </span>
                </div>

                <div className="h-px bg-gray-300 my-2"></div>

                <div className="flex items-center justify-between text-2xl">
                  <span className="font-bold text-gray-900">TOTAL:</span>
                  <span className="font-black text-[#224D62]">
                    {commission.amount.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preuve de paiement */}
          {proofUrl && (
            <Card className="border-2 border-gray-200">
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-[#224D62]" />
                  Preuve de Paiement
                </h3>
                
                <div className="flex flex-col items-center justify-center">
                  <div className="w-full max-w-md aspect-[4/3] relative bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200 hover:border-[#224D62] transition-colors group cursor-pointer"
                       onClick={() => setSelectedImage(proofUrl)}>
                    <Image
                      src={proofUrl}
                      alt="Preuve de paiement"
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 400px"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                      <Maximize2 className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                    <ImageIcon className="h-3 w-3" />
                    <span>Cliquer pour agrandir</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF}
            className="gap-2"
          >
            {isGeneratingPDF ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Génération en cours...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Télécharger en PDF
              </>
            )}
          </Button>
          <Button
            onClick={onClose}
            disabled={isGeneratingPDF}
            className="bg-gradient-to-r from-[#234D65] to-[#2c5a73]"
          >
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Modal d'image en plein écran */}
      {selectedImage && (
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-5xl max-h-[95vh] p-0">
            <DialogTitle className="sr-only">Aperçu de l&apos;image</DialogTitle>
            <div className="relative w-full h-[90vh] bg-black">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 z-10 bg-white/10 hover:bg-white/20 text-white"
                onClick={() => setSelectedImage(null)}
              >
                <X className="h-6 w-6" />
              </Button>
              <Image
                src={selectedImage}
                alt="Preuve de paiement en plein écran"
                fill
                className="object-contain p-4"
                sizes="(max-width: 1200px) 100vw, 1200px"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  )
}
