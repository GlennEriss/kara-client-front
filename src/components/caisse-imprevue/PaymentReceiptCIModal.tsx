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
  CreditCard,
  CheckCircle,
  Receipt,
  Smartphone,
  Banknote,
  Building2,
  Image as ImageIcon,
  Maximize2,
  X,
  Loader2,
} from 'lucide-react'
import { ContractCI, PaymentCI, VersementCI } from '@/types/types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import Image from 'next/image'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { toast } from 'sonner'

// Helper pour formater les montants correctement dans les PDFs
const formatAmount = (amount: number): string => {
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

interface PaymentReceiptCIModalProps {
  isOpen: boolean
  onClose: () => void
  contract: ContractCI
  payment: PaymentCI
  isMonthly?: boolean
}

const PAYMENT_MODE_LABELS = {
  airtel_money: { label: 'Airtel Money', icon: Smartphone, color: 'text-red-600', bg: 'bg-red-100' },
  mobicash: { label: 'Mobicash', icon: Banknote, color: 'text-blue-600', bg: 'bg-blue-100' },
  cash: { label: 'Espèce', icon: DollarSign, color: 'text-green-600', bg: 'bg-green-100' },
  bank_transfer: { label: 'Virement bancaire', icon: Building2, color: 'text-purple-600', bg: 'bg-purple-100' },
}

export default function PaymentReceiptCIModal({
  isOpen,
  onClose,
  contract,
  payment,
  isMonthly = true
}: PaymentReceiptCIModalProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMMM yyyy', { locale: fr })
    } catch {
      return dateString
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
      doc.text('REÇU DE PAIEMENT', pageWidth / 2, 20, { align: 'center' })
      
      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      doc.text('Caisse Imprévue - KARA', pageWidth / 2, 30, { align: 'center' })

      yPos = 50

      // Informations du contrat
      doc.setTextColor(0, 0, 0)
      doc.setFillColor(240, 240, 240)
      doc.rect(10, yPos, pageWidth - 20, 50, 'F')
      
      yPos += 10
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('INFORMATIONS DU CONTRAT', 15, yPos)
      
      yPos += 7
      doc.setFont('helvetica', 'normal')
      doc.text(`Membre: ${contract.memberFirstName} ${contract.memberLastName}`, 15, yPos)
      doc.text(`N° Contrat: ${contract.id.slice(-8).toUpperCase()}`, pageWidth / 2 + 5, yPos)
      
      yPos += 7
      doc.text(`Forfait: ${contract.subscriptionCICode} - ${contract.subscriptionCILabel || 'Caisse Imprévue'}`, 15, yPos)
      doc.text(`Période: ${isMonthly ? `Mois ${payment.monthIndex + 1}` : formatDate(payment.versements[0]?.date || '')}`, pageWidth / 2 + 5, yPos)
      
      yPos += 7
      doc.text(`Date d'émission: ${format(new Date(), 'dd/MM/yyyy', { locale: fr })}`, 15, yPos)

      yPos += 15

      // Statut du paiement
      doc.setFillColor(34, 197, 94) // green-600
      doc.rect(10, yPos, pageWidth - 20, 12, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('✓ PAIEMENT COMPLÉTÉ', 15, yPos + 8)
      doc.text(`${formatAmount(payment.accumulatedAmount)} FCFA`, pageWidth - 15, yPos + 8, { align: 'right' })

      yPos += 20
      doc.setTextColor(0, 0, 0)

      // Tableau des versements
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('DÉTAILS DES VERSEMENTS', 15, yPos)
      
      yPos += 5

      const tableData = payment.versements.map((versement: VersementCI, index: number) => {
        const modeConfig = PAYMENT_MODE_LABELS[versement.mode]
        return [
          `#${index + 1}`,
          formatDate(versement.date),
          versement.time,
          modeConfig.label,
          `${formatAmount(versement.amount)} FCFA`,
          versement.penalty && versement.penalty > 0 ? `${formatAmount(versement.penalty)} FCFA` : '-'
        ]
      })

      autoTable(doc, {
        startY: yPos,
        head: [['#', 'Date', 'Heure', 'Mode', 'Montant', 'Pénalité']],
        body: tableData,
        theme: 'striped',
        headStyles: {
          fillColor: [35, 77, 101],
          textColor: [255, 255, 255],
          fontSize: 10,
          fontStyle: 'bold',
          halign: 'center'
        },
        bodyStyles: {
          fontSize: 9,
          halign: 'center'
        },
        columnStyles: {
          0: { cellWidth: 15, halign: 'center' },
          1: { cellWidth: 40 },
          2: { cellWidth: 25 },
          3: { cellWidth: 35 },
          4: { cellWidth: 40, halign: 'right', fontStyle: 'bold' },
          5: { cellWidth: 35, halign: 'right' }
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        }
      })

      yPos = (doc as any).lastAutoTable.finalY + 10

      // Résumé
      doc.setFillColor(240, 249, 255)
      doc.rect(10, yPos, pageWidth - 20, 35, 'F')
      
      yPos += 10
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Objectif mensuel:`, 15, yPos)
      doc.text(`${formatAmount(payment.targetAmount)} FCFA`, pageWidth - 15, yPos, { align: 'right' })
      
      yPos += 7
      doc.text(`Nombre de versements:`, 15, yPos)
      doc.text(`${payment.versements.length}`, pageWidth - 15, yPos, { align: 'right' })
      
      yPos += 10
      doc.setDrawColor(35, 77, 101)
      doc.setLineWidth(0.5)
      doc.line(15, yPos - 2, pageWidth - 15, yPos - 2)
      
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(35, 77, 101)
      doc.text('TOTAL VERSÉ:', 15, yPos + 5)
      doc.text(`${formatAmount(payment.accumulatedAmount)} FCFA`, pageWidth - 15, yPos + 5, { align: 'right' })

      // Footer
      yPos = pageHeight - 20
      doc.setFontSize(8)
      doc.setFont('helvetica', 'italic')
      doc.setTextColor(100, 100, 100)
      doc.text('Ce document est généré automatiquement par le système KARA', pageWidth / 2, yPos, { align: 'center' })
      doc.text(`Page 1/1 - Généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}`, pageWidth / 2, yPos + 5, { align: 'center' })

      // Télécharger le PDF
      const fileName = `Recu_CI_${contract.memberLastName}_${contract.memberFirstName}_M${payment.monthIndex + 1}_${format(new Date(), 'ddMMyyyy')}.pdf`
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
            Reçu de Paiement
          </DialogTitle>
          <DialogDescription>
            {isMonthly 
              ? `Récapitulatif des versements pour le mois M${payment.monthIndex + 1}`
              : `Récapitulatif du versement quotidien`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Informations du contrat */}
          <Card className="border-0 shadow-md bg-gradient-to-r from-[#234D65]/5 to-[#2c5a73]/5">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span className="font-medium">Membre</span>
                  </div>
                  <p className="font-semibold text-gray-900">
                    {contract.memberFirstName} {contract.memberLastName}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span className="font-medium">N° Contrat</span>
                  </div>
                  <p className="font-semibold text-gray-900 font-mono">
                    {contract.id.slice(-8).toUpperCase()}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CreditCard className="h-4 w-4" />
                    <span className="font-medium">Forfait</span>
                  </div>
                  <p className="font-semibold text-gray-900">
                    {contract.subscriptionCICode} - {contract.subscriptionCILabel || 'Caisse Imprévue'}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span className="font-medium">Période</span>
                  </div>
                  <p className="font-semibold text-gray-900">
                    {isMonthly ? `Mois ${payment.monthIndex + 1}` : formatDate(payment.versements[0]?.date || '')}
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
                <p className="font-semibold text-green-900">Paiement Complété</p>
                <p className="text-sm text-green-700">
                  {payment.versements.length} versement{payment.versements.length > 1 ? 's' : ''} enregistré{payment.versements.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <Badge className="bg-green-600 text-white text-lg px-4 py-2">
              {payment.accumulatedAmount.toLocaleString('fr-FR')} FCFA
            </Badge>
          </div>

          {/* Liste des versements */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-[#224D62]" />
              Détails des Versements
            </h3>
            
            <div className="space-y-3">
              {payment.versements.map((versement: VersementCI, index: number) => {
                const modeConfig = PAYMENT_MODE_LABELS[versement.mode]
                const ModeIcon = modeConfig.icon

                return (
                  <Card key={versement.id} className="border-2 hover:border-[#224D62] transition-colors">
                    <CardContent className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Informations du versement */}
                        <div className="md:col-span-2 space-y-3">
                          <div className="flex items-center gap-3 flex-wrap">
                            <Badge variant="outline" className="font-mono">
                              #{index + 1}
                            </Badge>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              <span>{formatDate(versement.date)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span>{versement.time}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 flex-wrap">
                            <div className={`flex items-center gap-2 px-3 py-1 rounded-lg ${modeConfig.bg}`}>
                              <ModeIcon className={`h-4 w-4 ${modeConfig.color}`} />
                              <span className={`text-sm font-medium ${modeConfig.color}`}>
                                {modeConfig.label}
                              </span>
                            </div>
                            
                            {versement.penalty && versement.penalty > 0 && (
                              <Badge variant="destructive">
                                Pénalité: {versement.penalty.toLocaleString('fr-FR')} FCFA
                              </Badge>
                            )}
                          </div>

                          <div className="pt-2">
                            <p className="text-2xl font-bold text-[#224D62]">
                              {versement.amount.toLocaleString('fr-FR')} <span className="text-sm">FCFA</span>
                            </p>
                          </div>
                        </div>

                        {/* Preuve de paiement */}
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-full aspect-[4/3] relative bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200 hover:border-[#224D62] transition-colors group cursor-pointer"
                               onClick={() => setSelectedImage(versement.proofUrl)}>
                            <Image
                              src={versement.proofUrl}
                              alt={`Preuve de paiement #${index + 1}`}
                              fill
                              className="object-cover"
                              sizes="(max-width: 768px) 100vw, 300px"
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
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Résumé */}
          <Card className="border-2 border-[#224D62] bg-gradient-to-r from-[#234D65]/10 to-[#2c5a73]/10">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-lg">
                  <span className="text-gray-700">Objectif mensuel:</span>
                  <span className="font-semibold text-gray-900">
                    {payment.targetAmount.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-lg">
                  <span className="text-gray-700">Nombre de versements:</span>
                  <span className="font-semibold text-gray-900">
                    {payment.versements.length}
                  </span>
                </div>

                <div className="h-px bg-gray-300 my-2"></div>

                <div className="flex items-center justify-between text-2xl">
                  <span className="font-bold text-gray-900">TOTAL VERSÉ:</span>
                  <span className="font-black text-[#224D62]">
                    {payment.accumulatedAmount.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>

                {payment.accumulatedAmount >= payment.targetAmount && (
                  <div className="flex items-center gap-2 text-green-600 text-sm mt-2">
                    <CheckCircle className="h-4 w-4" />
                    <span>Objectif mensuel atteint</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
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

