'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  FileText,
  Download,
  Loader2,
  Monitor,
  Smartphone,
} from 'lucide-react'
import { Placement, CommissionPaymentPlacement } from '@/types/types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { toast } from 'sonner'
import { useMember } from '@/hooks/useMembers'
import { usePlacementCommissions } from '@/hooks/usePlacements'

// Helper pour formater les montants
const formatAmount = (amount: number): string => {
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

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
      doc.text('QUITTANCE FINALE', pageWidth / 2, 20, { align: 'center' })
      
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
      const memberName = memberData 
        ? `${memberData.firstName} ${memberData.lastName}`
        : `Bienfaiteur #${placement.benefactorId.slice(0, 8)}`
      doc.text(`Bienfaiteur: ${memberName}`, 15, yPos)
      doc.text(`N° Placement: ${placement.id.slice(-8).toUpperCase()}`, pageWidth / 2 + 5, yPos)
      
      yPos += 7
      doc.text(`Montant placé: ${formatAmount(placement.amount)} FCFA`, 15, yPos)
      doc.text(`Taux: ${placement.rate}%`, pageWidth / 2 + 5, yPos)
      
      yPos += 7
      const startDate = placement.startDate 
        ? format(new Date(placement.startDate), 'dd/MM/yyyy', { locale: fr })
        : format(new Date(placement.createdAt), 'dd/MM/yyyy', { locale: fr })
      const endDate = placement.endDate
        ? format(new Date(placement.endDate), 'dd/MM/yyyy', { locale: fr })
        : 'N/A'
      doc.text(`Date de début: ${startDate}`, 15, yPos)
      doc.text(`Date de fin: ${endDate}`, pageWidth / 2 + 5, yPos)
      
      yPos += 7
      doc.text(`Période: ${placement.periodMonths} mois`, 15, yPos)
      const payoutModeLabel = placement.payoutMode === 'MonthlyCommission_CapitalEnd' 
        ? 'Commission mensuelle + Capital à la fin'
        : 'Capital + Commissions à la fin'
      doc.text(`Mode: ${payoutModeLabel}`, pageWidth / 2 + 5, yPos)

      yPos += 15

      // Statut de complétion
      doc.setFillColor(34, 197, 94) // green-600
      doc.rect(10, yPos, pageWidth - 20, 12, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('✓ PLACEMENT TERMINÉ', 15, yPos + 8)
      
      const totalCommissions = commissions.reduce((sum, c) => sum + c.amount, 0)
      const totalPaid = placement.amount + totalCommissions
      doc.text(`${formatAmount(totalPaid)} FCFA`, pageWidth - 15, yPos + 8, { align: 'right' })

      yPos += 20
      doc.setTextColor(0, 0, 0)

      // Détails des commissions
      if (commissions.length > 0) {
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text('DÉTAILS DES COMMISSIONS', 15, yPos)
        
        yPos += 5

        const tableData = commissions.map((commission, index) => {
          const dueDate = format(new Date(commission.dueDate), 'dd/MM/yyyy', { locale: fr })
          const status = commission.status === 'Paid' ? 'Payée' : 'Due'
          const paidDate = commission.paidAt 
            ? format(new Date(commission.paidAt), 'dd/MM/yyyy', { locale: fr })
            : '-'
          return [
            `#${index + 1}`,
            dueDate,
            `${formatAmount(commission.amount)} FCFA`,
            status,
            paidDate,
          ]
        })

        autoTable(doc, {
          startY: yPos,
          head: [['#', 'Date d\'échéance', 'Montant', 'Statut', 'Date de paiement']],
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
            2: { cellWidth: 50, halign: 'right', fontStyle: 'bold' },
            3: { cellWidth: 30, halign: 'center' },
            4: { cellWidth: 40 },
          },
          margin: { left: 10, right: 10 },
        })

        yPos = (doc as any).lastAutoTable.finalY + 10
      }

      // Récapitulatif
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('RÉCAPITULATIF', 15, yPos)
      
      yPos += 7
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.text(`Capital placé: ${formatAmount(placement.amount)} FCFA`, 15, yPos)
      
      yPos += 6
      doc.text(`Total commissions: ${formatAmount(totalCommissions)} FCFA`, 15, yPos)
      
      yPos += 6
      doc.setFont('helvetica', 'bold')
      doc.text(`Montant total restitué: ${formatAmount(totalPaid)} FCFA`, 15, yPos)
      
      yPos += 8
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.text(`Montant en lettres: ${numberToWords(Math.floor(totalPaid))} francs CFA`, 15, yPos)

      yPos += 15

      // Date et signature
      const today = format(new Date(), 'dd MMMM yyyy', { locale: fr })
      doc.setFontSize(10)
      doc.text(`Fait à Ouagadougou, le ${today}`, 15, yPos)
      
      yPos += 20
      doc.setFont('helvetica', 'bold')
      doc.text('Pour KARA', 15, yPos)
      doc.text('Le Bienfaiteur', pageWidth - 60, yPos)

      yPos += 15
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.text('_________________', 15, yPos)
      doc.text('_________________', pageWidth - 60, yPos)

      // Sauvegarder le PDF
      const firstName = memberData?.firstName || 'Bienfaiteur'
      const lastName = memberData?.lastName || 'Inconnu'
      const sanitizeName = (name: string) => name.replace(/[^a-zA-ZÀ-ÿ]/g, '').toUpperCase()
      const fileName = `QUITTANCE_FINALE_${sanitizeName(firstName)}_${sanitizeName(lastName)}.pdf`
      
      doc.save(fileName)

      if (onGenerated) {
        try {
          const blob = doc.output('blob')
          const file = new File([blob], fileName, { type: 'application/pdf' })
          const { ServiceFactory } = await import('@/factories/ServiceFactory')
          const service = ServiceFactory.getPlacementService()
          const res = await service.uploadFinalQuittance(file, placement.id, placement.benefactorId, placement.updatedBy || placement.createdBy)
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
      <DialogContent className="sm:max-w-2xl max-w-[95vw] max-h-[95vh] overflow-y-auto p-8">
        <DialogHeader className="pb-6 mb-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-green-600 shadow-lg">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-green-500 to-green-600 bg-clip-text text-transparent">
                Quittance Finale - Placement
              </DialogTitle>
              <DialogDescription className="text-gray-600 mt-1">
                Placement #{placement.id.slice(-8).toUpperCase()}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

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
      </DialogContent>
    </Dialog>
  )
}

