'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  FileText,
  Download,
  Calendar,
  Clock,
  DollarSign,
  User,
  CheckCircle,
  Receipt,
  Image as ImageIcon,
  Maximize2,
  X,
  Loader2,
} from 'lucide-react'
import { Placement, CommissionPaymentPlacement } from '@/types/types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import Image from 'next/image'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { toast } from 'sonner'
import { usePlacementDocument } from '@/hooks/placement/usePlacementDocument'

// Helper pour formater les montants correctement dans les PDFs
const formatAmount = (amount: number): string => {
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

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

  const loadImageAsBase64 = async (url: string): Promise<string> => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
    } catch (error) {
      console.error('Erreur lors du chargement de l\'image:', error)
      return ''
    }
  }

  const handleDownloadPDF = async () => {
    try {
      setIsGeneratingPDF(true)
      toast.info('Génération du PDF en cours...')

      const doc = new jsPDF('p', 'mm', 'a4')
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      let yPos = 20

      // En-tête
      doc.setFillColor(35, 77, 101) // #234D65
      doc.rect(0, 0, pageWidth, 40, 'F')
      
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(24)
      doc.setFont('helvetica', 'bold')
      doc.text('FACTURE DE COMMISSION', pageWidth / 2, 20, { align: 'center' })
      
      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      doc.text('Placement - KARA', pageWidth / 2, 30, { align: 'center' })

      yPos = 50

      // Informations du placement
      doc.setTextColor(0, 0, 0)
      doc.setFillColor(240, 240, 240)
      doc.rect(10, yPos, pageWidth - 20, 50, 'F')
      
      yPos += 10
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('INFORMATIONS DU PLACEMENT', 15, yPos)
      
      yPos += 7
      doc.setFont('helvetica', 'normal')
      doc.text(`Bienfaiteur: ${placement.benefactorName || placement.benefactorId}`, 15, yPos)
      doc.text(`N° Placement: ${placement.id.slice(-8).toUpperCase()}`, pageWidth / 2 + 5, yPos)
      
      yPos += 7
      doc.text(`Montant: ${formatAmount(placement.amount)} FCFA`, 15, yPos)
      doc.text(`Taux: ${placement.rate}%`, pageWidth / 2 + 5, yPos)
      
      yPos += 7
      doc.text(`Période: ${placement.periodMonths} mois`, 15, yPos)
      doc.text(`Mode: ${placement.payoutMode === 'MonthlyCommission_CapitalEnd' ? 'Mensuel' : 'Final'}`, pageWidth / 2 + 5, yPos)
      
      yPos += 7
      doc.text(`Date d'émission: ${format(new Date(), 'dd/MM/yyyy', { locale: fr })}`, 15, yPos)

      yPos += 15

      // Informations de la commission
      doc.setFillColor(240, 240, 240)
      doc.rect(10, yPos, pageWidth - 20, 40, 'F')
      
      yPos += 10
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('INFORMATIONS DE LA COMMISSION', 15, yPos)
      
      yPos += 7
      doc.setFont('helvetica', 'normal')
      doc.text(`Date d'échéance: ${formatDate(commission.dueDate)}`, 15, yPos)
      if (commission.paidAt) {
        doc.text(`Date de paiement: ${formatDate(commission.paidAt)}`, pageWidth / 2 + 5, yPos)
      }
      
      yPos += 7
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(35, 77, 101)
      doc.text('MONTANT DE LA COMMISSION:', 15, yPos)
      doc.text(`${formatAmount(commission.amount)} FCFA`, pageWidth - 15, yPos, { align: 'right' })

      yPos += 15

      // Preuve de paiement si disponible
      if (proofUrl) {
        try {
          const imageBase64 = await loadImageAsBase64(proofUrl)
          if (imageBase64) {
            doc.setFontSize(10)
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(0, 0, 0)
            doc.text('PREUVE DE PAIEMENT', 15, yPos)
            yPos += 5

            // Ajouter l'image (max 80mm de largeur, hauteur proportionnelle)
            const maxWidth = 80
            const img = document.createElement('img')
            img.src = imageBase64
            await new Promise<void>((resolve, reject) => {
              img.onload = () => {
                const ratio = img.height / img.width
                const imgWidth = Math.min(maxWidth, pageWidth - 30)
                const imgHeight = imgWidth * ratio
                
                // Vérifier si on dépasse la page
                if (yPos + imgHeight > pageHeight - 20) {
                  doc.addPage()
                  yPos = 20
                }
                
                doc.addImage(imageBase64, 'JPEG', 15, yPos, imgWidth, imgHeight)
                yPos += imgHeight + 10
                resolve()
              }
              img.onerror = () => resolve()
            })
          }
        } catch (error) {
          console.error('Erreur lors de l\'ajout de l\'image:', error)
        }
      }

      // Footer
      yPos = pageHeight - 20
      doc.setFontSize(8)
      doc.setFont('helvetica', 'italic')
      doc.setTextColor(100, 100, 100)
      doc.text('Ce document est généré automatiquement par le système KARA', pageWidth / 2, yPos, { align: 'center' })
      doc.text(`Page 1/1 - Généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}`, pageWidth / 2, yPos + 5, { align: 'center' })

      // Télécharger le PDF
      const benefactorName = placement.benefactorName || placement.benefactorId
      const fileName = `Facture_Commission_${benefactorName.replace(/\s+/g, '_')}_${format(new Date(commission.dueDate), 'ddMMyyyy', { locale: fr })}.pdf`
      doc.save(fileName)
      
      toast.success('PDF téléchargé avec succès', {
        description: `Fichier: ${fileName}`
      })
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

