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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CreditContract, CreditPayment } from '@/types/types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface PaymentSummaryModalProps {
  isOpen: boolean
  onClose: () => void
  contract: CreditContract
  payment: CreditPayment
}

const PAYMENT_MODE_LABELS: Record<string, string> = {
  CASH: 'Espèces',
  MOBILE_MONEY: 'Mobile Money',
  BANK_TRANSFER: 'Virement bancaire',
  CHEQUE: 'Chèque',
}

const formatAmount = (amount: number): string => {
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

export default function PaymentSummaryModal({
  isOpen,
  onClose,
  contract,
  payment,
}: PaymentSummaryModalProps) {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)

  // Calculer le nouveau capital après paiement du principal
  const newCapitalAfterPrincipal = contract.amount - (payment.principalAmount || 0)
  
  // Calculer le nouveau capital total (capital + intérêts) après paiement
  // C'est le capital restant + les intérêts qui restent à payer
  const newCapitalTotal = newCapitalAfterPrincipal + (payment.interestAmount || 0)
  
  // Calculer le taux d'intérêt (en pourcentage)
  const interestRate = contract.interestRate ? contract.interestRate * 100 : 0
  
  // Calculer le montant global (capital + intérêts du paiement)
  const globalAmount = (payment.principalAmount || 0) + (payment.interestAmount || 0)
  
  // Formater la date d'échéance (on utilise la date de paiement comme date d'échéance)
  const formatDate = (date: Date) => {
    return format(new Date(date), 'yyyy-MM-dd')
  }
  
  // Formater l'heure
  const formatTime = (time: string) => {
    return time || '12H00'
  }

  const summaryData = [
    { label: 'CAPITAL', value: `${formatAmount(contract.amount)} FCFA`, highlight: 'green' },
    { label: 'TAUX', value: `${interestRate} %`, highlight: 'blue' },
    { label: 'INTERETS', value: `${formatAmount(payment.interestAmount || 0)} FCFA`, highlight: 'blue' },
    { label: 'MONTANT GLOBAL', value: `${formatAmount(globalAmount)} FCFA`, highlight: 'yellow' },
    { label: 'DATE ECHEANCE', value: formatDate(payment.paymentDate), highlight: 'blue' },
    { label: 'DATE REMISE', value: formatDate(payment.paymentDate), highlight: 'blue' },
    { label: 'HEURE REMISE', value: formatTime(payment.paymentTime), highlight: 'blue' },
    { label: 'MOYEN', value: PAYMENT_MODE_LABELS[payment.mode] || 'Aucun', highlight: 'blue' },
    { label: 'FRAIS', value: 'false', highlight: 'blue' },
    { label: 'MONTANT REMIS', value: `${formatAmount(payment.amount)} FCFA`, highlight: 'red' },
    { label: 'PENALITE', value: `${formatAmount(payment.penaltyAmount || 0)} FCFA`, highlight: 'blue' },
    { label: 'REMARQUE', value: payment.comment || 'PAS DE VERSEMENT', highlight: 'blue' },
    { label: 'NOTE', value: payment.note?.toString() || '0', highlight: 'blue' },
    { label: 'NOUVEAU CAPITAL', value: `${formatAmount(newCapitalAfterPrincipal)} FCFA`, highlight: 'red' },
    { label: 'NOUVEAU CAPITAL', value: `${formatAmount(newCapitalTotal)} FCFA`, highlight: 'red' },
  ]

  const getHighlightClass = (highlight: string) => {
    switch (highlight) {
      case 'green':
        return 'bg-green-100'
      case 'yellow':
        return 'bg-yellow-100'
      case 'red':
        return 'bg-red-100'
      case 'blue':
      default:
        return 'bg-blue-100'
    }
  }

  const getHighlightColor = (highlight: string): [number, number, number] => {
    switch (highlight) {
      case 'green':
        return [220, 252, 231] // green-100
      case 'yellow':
        return [254, 249, 195] // yellow-100
      case 'red':
        return [254, 226, 226] // red-100
      case 'blue':
      default:
        return [219, 234, 254] // blue-100
    }
  }

  const handleDownloadPDF = async () => {
    try {
      setIsGeneratingPDF(true)
      toast.info('Génération du PDF en cours...')

      const doc = new jsPDF('p', 'mm', 'a4')
      const pageWidth = doc.internal.pageSize.getWidth()
      let yPos = 20

      // En-tête
      doc.setFillColor(35, 77, 101) // #234D65
      doc.rect(0, 0, pageWidth, 40, 'F')
      
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.text('VERSEMENT DU: ' + formatDate(payment.paymentDate), pageWidth / 2, 20, { align: 'center' })
      
      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      doc.text('Résumé détaillé du versement', pageWidth / 2, 30, { align: 'center' })

      yPos = 50

      // Informations du contrat
      doc.setTextColor(0, 0, 0)
      doc.setFillColor(240, 240, 240)
      doc.rect(10, yPos, pageWidth - 20, 30, 'F')
      
      yPos += 8
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

      yPos += 15

      // Tableau des données
      const tableData = summaryData.map(row => {
        const color = getHighlightColor(row.highlight)
        return {
          label: row.label,
          value: row.value,
          color: color
        }
      })

      autoTable(doc, {
        startY: yPos,
        head: [['Label', 'Valeur']],
        body: tableData.map(row => [row.label, row.value]),
        theme: 'grid',
        headStyles: { 
          fillColor: [35, 77, 101], 
          textColor: 255, 
          fontStyle: 'bold',
          fontSize: 11
        },
        styles: { 
          fontSize: 10,
          cellPadding: 5
        },
        columnStyles: {
          0: { cellWidth: 80, fontStyle: 'bold' },
          1: { cellWidth: 'auto' }
        },
        didParseCell: function(data) {
          if (data.section === 'body' && data.row.index < tableData.length) {
            const rowData = tableData[data.row.index]
            data.cell.styles.fillColor = rowData.color
          }
        },
        margin: { left: 10, right: 10 },
      })

      // Pied de page
      const pageHeight = doc.internal.pageSize.getHeight()
      doc.setFontSize(8)
      doc.setTextColor(128, 128, 128)
      doc.text(
        'Ce document est généré automatiquement et présente le résumé du versement.',
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      )

      doc.save(`resume-versement-${contract.id.slice(-6)}-${formatDate(payment.paymentDate)}.pdf`)
      toast.success('PDF généré avec succès')
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error)
      toast.error('Erreur lors de la génération du PDF')
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!w-[95vw] !max-w-[1100px] max-h-[95vh] overflow-y-auto bg-gradient-to-br from-white to-gray-50 border-0 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            VERSEMENT DU: {formatDate(payment.paymentDate)}
          </DialogTitle>
          <DialogDescription>
            Résumé détaillé du versement
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50%]">Label</TableHead>
                <TableHead className="w-[50%]">Valeur</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summaryData.map((row, index) => (
                <TableRow key={index}>
                  <TableCell className={`font-medium ${getHighlightClass(row.highlight)}`}>
                    {row.label}
                  </TableCell>
                  <TableCell className={getHighlightClass(row.highlight)}>
                    {row.value}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <DialogFooter className="mt-6">
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
    </Dialog>
  )
}

