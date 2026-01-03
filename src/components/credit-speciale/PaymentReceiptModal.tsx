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
  Receipt,
  Download,
  Calendar,
  Clock,
  DollarSign,
  User,
  Smartphone,
  Banknote,
  Building2,
  CreditCard,
  Image as ImageIcon,
  Loader2,
  X,
} from 'lucide-react'
import { CreditContract, CreditPayment, CreditPaymentMode } from '@/types/types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import Image from 'next/image'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { toast } from 'sonner'

interface PaymentReceiptModalProps {
  isOpen: boolean
  onClose: () => void
  contract: CreditContract
  payment: CreditPayment
  installmentNumber?: number // Numéro d'échéance pour affichage
}

const PAYMENT_MODE_LABELS: Record<CreditPaymentMode, { label: string; icon: any; color: string; bg: string }> = {
  CASH: { label: 'Espèces', icon: DollarSign, color: 'text-green-600', bg: 'bg-green-100' },
  MOBILE_MONEY: { label: 'Mobile Money', icon: Smartphone, color: 'text-blue-600', bg: 'bg-blue-100' },
  BANK_TRANSFER: { label: 'Virement bancaire', icon: Building2, color: 'text-purple-600', bg: 'bg-purple-100' },
  CHEQUE: { label: 'Chèque', icon: CreditCard, color: 'text-gray-600', bg: 'bg-gray-100' },
}

const formatAmount = (amount: number): string => {
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

export default function PaymentReceiptModal({
  isOpen,
  onClose,
  contract,
  payment,
  installmentNumber,
}: PaymentReceiptModalProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)

  // Logs de débogage
  React.useEffect(() => {
    if (isOpen && payment) {
      console.log('[PaymentReceiptModal] Modal ouvert avec le paiement:', {
        id: payment.id,
        amount: payment.amount,
        paymentDate: payment.paymentDate,
        paymentTime: payment.paymentTime,
        mode: payment.mode,
        reference: payment.reference,
        comment: payment.comment,
        note: payment.note,
        installmentNumber: installmentNumber
      })
      console.log('[PaymentReceiptModal] Montant affiché sera:', payment.amount, 'FCFA')
    }
  }, [isOpen, payment, installmentNumber])

  const formatDate = (date: Date) => {
    return format(new Date(date), 'dd MMMM yyyy', { locale: fr })
  }

  const formatDateTime = (date: Date, time: string) => {
    return `${formatDate(date)} à ${time}`
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
      doc.text('REÇU DE PAIEMENT', pageWidth / 2, 20, { align: 'center' })
      
      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      doc.text('Crédit Spéciale - KARA', pageWidth / 2, 30, { align: 'center' })

      yPos = 50

      // Informations du contrat
      doc.setTextColor(0, 0, 0)
      doc.setFillColor(240, 240, 240)
      doc.rect(10, yPos, pageWidth - 20, 50, 'F')
      
      yPos += 10
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('INFORMATIONS DU CRÉDIT', 15, yPos)
      
      yPos += 7
      doc.setFont('helvetica', 'normal')
      doc.text(`Client: ${contract.clientFirstName} ${contract.clientLastName}`, 15, yPos)
      doc.text(`N° Contrat: ${contract.id.slice(-8).toUpperCase()}`, pageWidth / 2 + 5, yPos)
      
      yPos += 7
      doc.text(`Type: ${contract.creditType}`, 15, yPos)
      doc.text(`Montant emprunté: ${formatAmount(contract.amount)} FCFA`, pageWidth / 2 + 5, yPos)
      
      yPos += 7
      doc.text(`Date d'émission: ${format(new Date(), 'dd/MM/yyyy', { locale: fr })}`, 15, yPos)

      yPos += 15

      // Informations du paiement
      doc.setFillColor(34, 197, 94) // green-600
      doc.rect(10, yPos, pageWidth - 20, 12, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('PAIEMENT ENREGISTRÉ', 15, yPos + 8)

      yPos += 20

      // Détails du paiement
      const paymentData = [
        ['Date et heure', formatDateTime(payment.paymentDate, payment.paymentTime)],
        ['Montant', `${formatAmount(payment.amount)} FCFA`],
        ['Moyen de paiement', PAYMENT_MODE_LABELS[payment.mode].label],
        ['Référence', payment.reference || 'N/A'],
      ]

      autoTable(doc, {
        startY: yPos,
        head: [['Détail', 'Valeur']],
        body: paymentData,
        theme: 'striped',
        headStyles: { fillColor: [35, 77, 101], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 10 },
        margin: { left: 10, right: 10 },
      })

      yPos = (doc as any).lastAutoTable.finalY + 10

      // Preuve de paiement
      if (payment.proofUrl) {
        try {
          const imageBase64 = await loadImageAsBase64(payment.proofUrl)
          if (imageBase64) {
            doc.addPage()
            doc.setFontSize(12)
            doc.setFont('helvetica', 'bold')
            doc.text('PREUVE DE PAIEMENT', 15, 20)
            
            // Charger l'image pour obtenir ses dimensions
            const img = document.createElement('img')
            await new Promise<void>((resolve, reject) => {
              img.onload = () => resolve()
              img.onerror = reject
              img.src = imageBase64
            })
            
            const imgWidth = pageWidth - 30
            const imgHeight = (img.height * imgWidth) / img.width
            
            if (imgHeight > pageHeight - 40) {
              doc.addImage(imageBase64, 'JPEG', 15, 30, imgWidth, pageHeight - 50)
            } else {
              doc.addImage(imageBase64, 'JPEG', 15, 30, imgWidth, imgHeight)
            }
          }
        } catch (error) {
          console.error('Erreur lors de l\'ajout de l\'image:', error)
        }
      }

      // Pied de page
      doc.setPage(1)
      doc.setFontSize(8)
      doc.setTextColor(128, 128, 128)
      doc.text(
        'Ce document est généré automatiquement et certifie le paiement enregistré.',
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      )

      doc.save(`recu-paiement-${contract.id.slice(-6)}-${payment.id.slice(-6)}.pdf`)
      toast.success('PDF généré avec succès')
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error)
      toast.error('Erreur lors de la génération du PDF')
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  const paymentModeConfig = PAYMENT_MODE_LABELS[payment.mode]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#224D62] flex items-center gap-2">
            <Receipt className="h-6 w-6" />
            Reçu de Paiement
          </DialogTitle>
          <DialogDescription>
            Reçu de paiement pour le crédit {contract.creditType}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Informations du contrat */}
          <Card className="border-0 shadow-md bg-gradient-to-r from-[#234D65]/5 to-[#2c5a73]/5">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Client</p>
                  <p className="font-semibold text-gray-900">
                    {contract.clientFirstName} {contract.clientLastName}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">N° Contrat</p>
                  <p className="font-mono text-sm text-gray-900">#{contract.id.slice(-8).toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Type de crédit</p>
                  <Badge variant="outline">{contract.creditType}</Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Montant emprunté</p>
                  <p className="font-semibold text-gray-900">
                    {contract.amount.toLocaleString('fr-FR')} FCFA
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informations du paiement */}
          <Card className="border-0 shadow-md">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Date et heure</span>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="font-semibold">{formatDateTime(payment.paymentDate, payment.paymentTime)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Montant</span>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <span className="font-bold text-lg text-green-600">
                      {payment.amount.toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Moyen de paiement</span>
                  <Badge className={`${paymentModeConfig.bg} ${paymentModeConfig.color}`}>
                    <paymentModeConfig.icon className="h-3 w-3 mr-1" />
                    {paymentModeConfig.label}
                  </Badge>
                </div>
                {installmentNumber && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Échéance</span>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      Échéance {installmentNumber}
                    </Badge>
                  </div>
                )}
                {payment.reference && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Référence</span>
                    <span className="font-mono text-sm">{payment.reference}</span>
                  </div>
                )}
                {payment.note !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Note</span>
                    <Badge variant="outline">{payment.note}/10</Badge>
                  </div>
                )}
                {payment.comment && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Commentaire</p>
                    <p className="text-sm text-gray-700">{payment.comment}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Preuve de paiement */}
          {payment.proofUrl && (
            <Card className="border-0 shadow-md">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5 text-gray-600" />
                    <p className="font-semibold">Preuve de paiement</p>
                  </div>
                  <div className="relative w-full h-64 border rounded-lg overflow-hidden cursor-pointer"
                    onClick={() => setSelectedImage(payment.proofUrl!)}
                  >
                    <Image
                      src={payment.proofUrl}
                      alt="Preuve de paiement"
                      fill
                      className="object-contain"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
          <Button
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF}
            className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65]"
          >
            {isGeneratingPDF ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Génération...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Télécharger PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Modal plein écran pour l'image */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-7xl max-h-full">
            <Image
              src={selectedImage}
              alt="Preuve de paiement"
              width={1200}
              height={800}
              className="object-contain max-h-[90vh]"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-white hover:bg-white/20"
              onClick={() => setSelectedImage(null)}
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  )
}

