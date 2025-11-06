'use client'

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  History,
  DollarSign,
  CheckCircle,
  Clock,
  User,
  Calendar,
  AlertCircle,
  Download,
  FileSpreadsheet,
  Eye,
} from 'lucide-react'
import { useSupportHistory, useAdmin } from '@/hooks/caisse-imprevue'
import { SupportCI } from '@/types/types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'

interface SupportHistoryCIModalProps {
  isOpen: boolean
  onClose: () => void
  contractId: string
}

export default function SupportHistoryCIModal({
  isOpen,
  onClose,
  contractId,
}: SupportHistoryCIModalProps) {
  const { data: supports = [], isLoading, isError } = useSupportHistory(contractId)

  // Export global en Excel
  const handleExportExcel = () => {
    if (supports.length === 0) {
      toast.error('Aucun support à exporter')
      return
    }

    try {
      const exportData = supports.flatMap((support) => {
        // Ligne principale du support
        const supportRow = {
          'Type': 'Support',
          'Date': format(support.approvedAt, 'dd/MM/yyyy', { locale: fr }),
          'Montant': support.amount,
          'Statut': support.status === 'REPAID' ? 'Remboursé' : 'En cours',
          'Montant Remboursé': support.amountRepaid,
          'Montant Restant': support.amountRemaining,
          'Approuvé par': support.approvedBy,
          'Détail': 'Support accordé',
        }

        // Lignes des remboursements
        const repaymentRows = support.repayments.map((repayment) => ({
          'Type': 'Remboursement',
          'Date': `${format(new Date(repayment.date), 'dd/MM/yyyy', { locale: fr })} ${repayment.time}`,
          'Montant': repayment.amount,
          'Statut': '',
          'Montant Remboursé': '',
          'Montant Restant': '',
          'Approuvé par': '',
          'Détail': `Mois M${repayment.monthIndex + 1}`,
        }))

        return [supportRow, ...repaymentRows]
      })

      const worksheet = XLSX.utils.json_to_sheet(exportData)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Historique Supports')

      // Styles des colonnes
      worksheet['!cols'] = [
        { wch: 15 }, // Type
        { wch: 18 }, // Date
        { wch: 15 }, // Montant
        { wch: 12 }, // Statut
        { wch: 18 }, // Montant Remboursé
        { wch: 18 }, // Montant Restant
        { wch: 25 }, // Approuvé par
        { wch: 30 }, // Détail
      ]

      const fileName = `Historique_Supports_${contractId}_${format(new Date(), 'ddMMyyyy')}.xlsx`
      XLSX.writeFile(workbook, fileName)
      
      toast.success('Export Excel réussi !')
    } catch (error) {
      console.error('Erreur lors de l\'export Excel:', error)
      toast.error('Erreur lors de l\'export Excel')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <DialogTitle className="text-lg sm:text-xl lg:text-2xl font-bold text-[#224D62] flex items-center gap-2 break-words">
              <History className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" />
              <span className="break-words">Historique des aides financières</span>
            </DialogTitle>
            {supports.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                className="flex items-center justify-center gap-1.5 sm:gap-2 border-green-300 text-green-700 hover:bg-green-50 h-9 px-2 sm:px-3 text-xs sm:text-sm shrink-0"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Exporter tout (Excel)</span>
                <span className="sm:hidden">Excel</span>
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="py-4">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : isError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Erreur lors du chargement de l'historique des supports
              </AlertDescription>
            </Alert>
          ) : supports.length === 0 ? (
            <div className="text-center py-12">
              <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Aucun support enregistré pour ce contrat</p>
            </div>
          ) : (
            <div className="space-y-4">
              {supports.map((support) => (
                <SupportCard key={support.id} support={support} />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function SupportCard({ support }: { support: SupportCI }) {
  const { data: admin, isLoading: loadingAdmin } = useAdmin(support.approvedBy)

  const isRepaid = support.status === 'REPAID'
  const progressPercentage = (support.amountRepaid / support.amount) * 100

  // Fonction pour ouvrir le document PDF dans un nouvel onglet
  const handleViewDocument = () => {
    if (support.documentUrl) {
      window.open(support.documentUrl, '_blank', 'noopener,noreferrer')
    } else {
      toast.error('Document non disponible')
    }
  }

  // Export PDF individuel
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF('p', 'mm', 'a4')

      // En-tête
      doc.setFontSize(20)
      doc.setTextColor(34, 77, 98)
      doc.text('REÇU DE SUPPORT FINANCIER', 105, 20, { align: 'center' })

      // Ligne de séparation
      doc.setDrawColor(34, 77, 98)
      doc.setLineWidth(0.5)
      doc.line(20, 25, 190, 25)

      // Informations du support
      doc.setFontSize(12)
      doc.setTextColor(0, 0, 0)
      
      let yPos = 40

      // Montant du support
      doc.setFont('helvetica', 'bold')
      doc.text('Montant du support :', 20, yPos)
      doc.setFont('helvetica', 'normal')
      doc.text(`${support.amount.toLocaleString('fr-FR')} FCFA`, 110, yPos)
      yPos += 10

      // Date d'approbation
      doc.setFont('helvetica', 'bold')
      doc.text('Date d\'approbation :', 20, yPos)
      doc.setFont('helvetica', 'normal')
      doc.text(format(support.approvedAt, 'dd MMMM yyyy à HH:mm', { locale: fr }), 110, yPos)
      yPos += 10

      // Approuvé par
      doc.setFont('helvetica', 'bold')
      doc.text('Approuvé par :', 20, yPos)
      doc.setFont('helvetica', 'normal')
      doc.text(admin ? `${admin.firstName} ${admin.lastName}` : support.approvedBy, 110, yPos)
      yPos += 10

      // Statut
      doc.setFont('helvetica', 'bold')
      doc.text('Statut :', 20, yPos)
      doc.setFont('helvetica', 'normal')
      if (isRepaid) {
        doc.setTextColor(0, 128, 0)
        doc.text('Entièrement remboursé', 110, yPos)
      } else {
        doc.setTextColor(255, 140, 0)
        doc.text('En cours de remboursement', 110, yPos)
      }
      doc.setTextColor(0, 0, 0)
      yPos += 15

      // Section remboursement
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('Détails du remboursement', 20, yPos)
      yPos += 10

      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Montant remboursé :', 20, yPos)
      doc.setFont('helvetica', 'normal')
      doc.text(`${support.amountRepaid.toLocaleString('fr-FR')} FCFA`, 110, yPos)
      yPos += 10

      doc.setFont('helvetica', 'bold')
      doc.text('Montant restant :', 20, yPos)
      doc.setFont('helvetica', 'normal')
      if (isRepaid) {
        doc.setTextColor(0, 128, 0)
      } else {
        doc.setTextColor(255, 0, 0)
      }
      doc.text(`${support.amountRemaining.toLocaleString('fr-FR')} FCFA`, 110, yPos)
      doc.setTextColor(0, 0, 0)
      yPos += 10

      doc.setFont('helvetica', 'bold')
      doc.text('Progression :', 20, yPos)
      doc.setFont('helvetica', 'normal')
      doc.text(`${progressPercentage.toFixed(1)}%`, 110, yPos)
      yPos += 15

      // Historique des remboursements
      if (support.repayments.length > 0) {
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text('Historique des remboursements', 20, yPos)
        yPos += 10

        // Table des remboursements
        const repaymentData = support.repayments.map((repayment) => [
          format(new Date(repayment.date), 'dd/MM/yyyy', { locale: fr }),
          repayment.time,
          `M${repayment.monthIndex + 1}`,
          `${repayment.amount.toLocaleString('fr-FR')} FCFA`,
        ])

        autoTable(doc, {
          startY: yPos,
          head: [['Date', 'Heure', 'Mois', 'Montant']],
          body: repaymentData,
          theme: 'striped',
          headStyles: {
            fillColor: [34, 77, 98],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
          },
          styles: {
            fontSize: 10,
            cellPadding: 3,
          },
          columnStyles: {
            0: { cellWidth: 40 },
            1: { cellWidth: 30 },
            2: { cellWidth: 30 },
            3: { cellWidth: 50, halign: 'right' },
          },
        })

        yPos = (doc as any).lastAutoTable.finalY + 10
      }

      // Date de remboursement complet
      if (isRepaid && support.repaidAt) {
        yPos += 5
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 128, 0)
        doc.text(`✓ Support remboursé intégralement le ${format(support.repaidAt, 'dd MMMM yyyy', { locale: fr })}`, 20, yPos)
      }

      // Pied de page
      const pageHeight = doc.internal.pageSize.height
      doc.setFontSize(10)
      doc.setTextColor(100, 100, 100)
      doc.text(`Généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}`, 105, pageHeight - 10, { align: 'center' })

      // Sauvegarde
      const fileName = `Support_${support.id}_${format(new Date(), 'ddMMyyyy')}.pdf`
      doc.save(fileName)
      
      toast.success('Export PDF réussi !')
    } catch (error) {
      console.error('Erreur lors de l\'export PDF:', error)
      toast.error('Erreur lors de l\'export PDF')
    }
  }

  return (
    <div className={`border-2 rounded-xl p-4 ${
      isRepaid ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'
    }`}>
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-[#224D62] shrink-0" />
            <span className="font-bold text-base sm:text-lg text-[#224D62] break-words">
              {support.amount.toLocaleString('fr-FR')} FCFA
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 break-words">
            <Calendar className="h-4 w-4 shrink-0" />
            <span className="break-words">Accordé le {format(support.approvedAt, 'dd MMM yyyy à HH:mm', { locale: fr })}</span>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
          {/* Bouton pour voir le document de demande */}
          {support.documentUrl && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleViewDocument}
              className="gap-1 border-purple-300 text-purple-700 hover:bg-purple-50 text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3 whitespace-nowrap"
              title="Voir le contrat de support"
            >
              <Eye className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span className="hidden sm:inline">Voir contrat</span>
              <span className="sm:hidden">Voir</span>
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportPDF}
            className="gap-1 border-blue-300 text-blue-700 hover:bg-blue-50 text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3 whitespace-nowrap"
          >
            <Download className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            PDF
          </Button>
          <Badge className={`${isRepaid ? 'bg-green-600' : 'bg-orange-600'} text-xs sm:text-sm px-2 sm:px-3 py-1 whitespace-nowrap shrink-0`}>
            {isRepaid ? (
              <>
                <CheckCircle className="h-3 w-3 mr-1" />
                Remboursé
              </>
            ) : (
              <>
                <Clock className="h-3 w-3 mr-1" />
                En cours
              </>
            )}
          </Badge>
        </div>
      </div>

      {/* Progression du remboursement */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Remboursé</span>
          <span className="font-semibold text-green-600">
            {support.amountRepaid.toLocaleString('fr-FR')} FCFA ({progressPercentage.toFixed(0)}%)
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              isRepaid ? 'bg-green-500' : 'bg-orange-500'
            }`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        {!isRepaid && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Restant</span>
            <span className="font-semibold text-orange-600">
              {support.amountRemaining.toLocaleString('fr-FR')} FCFA
            </span>
          </div>
        )}
      </div>

      {/* Approuvé par */}
      <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
        <User className="h-4 w-4" />
        <span>
          Approuvé par : {loadingAdmin ? (
            <Skeleton className="inline-block h-4 w-24" />
          ) : admin ? (
            <strong>{admin.firstName} {admin.lastName}</strong>
          ) : (
            support.approvedBy
          )}
        </span>
      </div>

      {/* Versements de remboursement */}
      {support.repayments.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm font-semibold text-gray-700 mb-2">
            Historique des remboursements ({support.repayments.length})
          </p>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {support.repayments.map((repayment, idx) => (
              <div
                key={repayment.id}
                className="flex items-center justify-between text-xs bg-white rounded p-2"
              >
                <span className="text-gray-600">
                  {format(repayment.createdAt, 'dd/MM/yyyy', { locale: fr })} à {repayment.time}
                </span>
                <span className="font-semibold text-green-600">
                  +{repayment.amount.toLocaleString('fr-FR')} FCFA
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Date de remboursement complet */}
      {isRepaid && support.repaidAt && (
        <div className="mt-3 pt-3 border-t border-green-200">
          <div className="flex items-center gap-2 text-sm text-green-700">
            <CheckCircle className="h-4 w-4" />
            <span>
              Remboursé intégralement le {format(support.repaidAt, 'dd MMMM yyyy', { locale: fr })}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

