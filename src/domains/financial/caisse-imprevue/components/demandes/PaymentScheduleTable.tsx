/**
 * Composant tableau récapitulatif des versements
 * 
 * Avec export Excel et PDF
 * Responsive : Mobile (scroll horizontal), Desktop (pleine largeur)
 */

'use client'

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Loader2,
  CheckCircle2
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { PaymentSchedule } from '../../services/DemandSimulationService'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface PaymentScheduleTableProps {
  schedule: PaymentSchedule
  demandId?: string
  memberName?: string
  className?: string
}

export function PaymentScheduleTable({ 
  schedule, 
  demandId,
  memberName,
  className 
}: PaymentScheduleTableProps) {
  const [isExporting, setIsExporting] = useState<'pdf' | 'excel' | null>(null)

  // Fonction helper pour convertir une date en Date valide
  const toValidDate = (date: Date | string | any): Date => {
    if (date instanceof Date) {
      if (isNaN(date.getTime())) {
        console.error('Date invalide détectée:', date)
        return new Date()
      }
      return date
    }
    
    if (date && typeof date.toDate === 'function') {
      return date.toDate()
    }
    
    const parsed = new Date(date)
    if (isNaN(parsed.getTime())) {
      console.error('Impossible de parser la date:', date)
      return new Date()
    }
    return parsed
  }

  // Export Excel
  const handleExportExcel = async () => {
    setIsExporting('excel')
    try {
      const XLSX = await import('xlsx')
      
      const data: Array<{
        'Mois': string | number
        'Date': string
        'Montant (FCFA)': number
        'Cumulé (FCFA)': number
        'Nb versements': number
      }> = schedule.items.map((item) => ({
        'Mois': item.monthIndex,
        'Date': format(toValidDate(item.date), 'dd/MM/yyyy', { locale: fr }),
        'Montant (FCFA)': item.amount,
        'Cumulé (FCFA)': item.cumulative,
        'Nb versements': item.paymentCount,
      }))

      // Ajouter la ligne total
      data.push({
        'Mois': 'TOTAL',
        'Date': `${schedule.totalMonths} mois`,
        'Montant (FCFA)': schedule.totalAmount,
        'Cumulé (FCFA)': schedule.totalAmount,
        'Nb versements': schedule.totalPayments,
      })

      const ws = XLSX.utils.json_to_sheet(data)
      
      // Ajuster les largeurs de colonnes
      ws['!cols'] = [
        { wch: 8 },  // Mois
        { wch: 12 }, // Date
        { wch: 15 }, // Montant
        { wch: 15 }, // Cumulé
        { wch: 12 }, // Nb versements
      ]

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Plan de remboursement')

      const fileName = demandId 
        ? `plan_remboursement_${demandId}.xlsx`
        : `plan_remboursement_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`
      
      XLSX.writeFile(wb, fileName)
      
      toast.success('Export Excel réussi', {
        description: `${schedule.items.length} lignes exportées`
      })
    } catch (error) {
      console.error('Erreur export Excel:', error)
      toast.error('Erreur lors de l\'export Excel')
    } finally {
      setIsExporting(null)
    }
  }

  // Export PDF
  const handleExportPDF = async () => {
    setIsExporting('pdf')
    try {
      const jsPDF = (await import('jspdf')).default
      await import('jspdf-autotable')
      
      const doc = new jsPDF()
      
      // Titre
      doc.setFontSize(16)
      doc.setTextColor(35, 77, 101) // #234D65
      doc.text('Plan de remboursement', 14, 20)
      
      // Sous-titre avec infos
      doc.setFontSize(10)
      doc.setTextColor(100, 100, 100)
      if (memberName) {
        doc.text(`Membre: ${memberName}`, 14, 28)
      }
      if (demandId) {
        doc.text(`Demande: #${demandId}`, 14, 34)
      }
      doc.text(`Généré le: ${format(new Date(), 'd MMMM yyyy à HH:mm', { locale: fr })}`, 14, memberName || demandId ? 40 : 28)
      
      // Résumé
      const startY = memberName || demandId ? 48 : 36
      doc.setFillColor(245, 245, 245)
      doc.rect(14, startY, 182, 16, 'F')
      doc.setTextColor(35, 77, 101)
      doc.setFontSize(9)
      doc.text(`Durée: ${schedule.totalMonths} mois`, 20, startY + 6)
      doc.text(`Montant total: ${schedule.totalAmount.toLocaleString('fr-FR')} FCFA`, 70, startY + 6)
      doc.text(`Versements: ${schedule.totalPayments}`, 140, startY + 6)
      
      // Tableau
      const tableData = schedule.items.map((item) => [
        item.monthIndex.toString(),
        format(toValidDate(item.date), 'dd/MM/yyyy', { locale: fr }),
        `${item.amount.toLocaleString('fr-FR')} FCFA`,
        `${item.cumulative.toLocaleString('fr-FR')} FCFA`,
        item.paymentCount.toString(),
      ])

      // Ajouter la ligne total
      tableData.push([
        'TOTAL',
        `${schedule.totalMonths} mois`,
        `${schedule.totalAmount.toLocaleString('fr-FR')} FCFA`,
        '',
        schedule.totalPayments.toString(),
      ])

      ;(doc as any).autoTable({
        head: [['Mois', 'Date', 'Montant', 'Cumulé', 'Versements']],
        body: tableData,
        startY: startY + 20,
        theme: 'striped',
        headStyles: {
          fillColor: [35, 77, 101], // #234D65
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        footStyles: {
          fillColor: [35, 77, 101],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        styles: {
          fontSize: 9,
          cellPadding: 4,
        },
        columnStyles: {
          0: { halign: 'center' },
          2: { halign: 'right' },
          3: { halign: 'right' },
          4: { halign: 'center' },
        },
      })

      const fileName = demandId 
        ? `plan_remboursement_${demandId}.pdf`
        : `plan_remboursement_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`
      
      doc.save(fileName)
      
      toast.success('Export PDF réussi', {
        description: `${schedule.items.length} lignes exportées`
      })
    } catch (error) {
      console.error('Erreur export PDF:', error)
      toast.error('Erreur lors de l\'export PDF')
    } finally {
      setIsExporting(null)
    }
  }

  return (
    <div className={cn('', className)}>
      {/* Barre d'outils */}
      <div className="flex items-center justify-between p-4 bg-gray-50 border-b">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          <span>{schedule.items.length} échéances</span>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              disabled={isExporting !== null}
              className="gap-2"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Export en cours...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Exporter
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExportExcel} className="gap-2 cursor-pointer">
              <FileSpreadsheet className="w-4 h-4 text-green-600" />
              <span>Export Excel (.xlsx)</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportPDF} className="gap-2 cursor-pointer">
              <FileText className="w-4 h-4 text-red-600" />
              <span>Export PDF</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Tableau */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#234D65]/5 hover:bg-[#234D65]/10">
              <TableHead className="font-semibold text-[#234D65]">Mois</TableHead>
              <TableHead className="font-semibold text-[#234D65]">Date</TableHead>
              <TableHead className="text-right font-semibold text-[#234D65]">Montant</TableHead>
              <TableHead className="text-right font-semibold text-[#234D65]">Cumulé</TableHead>
              <TableHead className="text-right font-semibold text-[#234D65]">Versements</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schedule.items.map((item, index) => {
              const validDate = toValidDate(item.date)
              const isEven = index % 2 === 0
              return (
                <TableRow 
                  key={item.monthIndex}
                  className={cn(
                    'transition-colors',
                    isEven ? 'bg-white' : 'bg-gray-50/50',
                    'hover:bg-[#234D65]/5'
                  )}
                >
                  <TableCell className="font-medium">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#234D65]/10 text-[#234D65] text-sm font-semibold">
                      {item.monthIndex}
                    </span>
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {format(validDate, 'dd MMM yyyy', { locale: fr })}
                  </TableCell>
                  <TableCell className="text-right font-medium text-gray-900">
                    {item.amount.toLocaleString('fr-FR')} <span className="text-gray-500 text-xs">FCFA</span>
                  </TableCell>
                  <TableCell className="text-right text-gray-600">
                    {item.cumulative.toLocaleString('fr-FR')} <span className="text-gray-400 text-xs">FCFA</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                      {item.paymentCount}
                    </span>
                  </TableCell>
                </TableRow>
              )
            })}
            {/* Ligne Total */}
            <TableRow className="bg-[#234D65] text-white font-bold hover:bg-[#234D65]">
              <TableCell className="font-bold">TOTAL</TableCell>
              <TableCell className="font-semibold">{schedule.totalMonths} mois</TableCell>
              <TableCell className="text-right font-bold">
                {schedule.totalAmount.toLocaleString('fr-FR')} <span className="text-white/80 text-xs">FCFA</span>
              </TableCell>
              <TableCell></TableCell>
              <TableCell className="text-right font-bold">
                <span className="inline-flex items-center justify-center px-2 py-1 rounded bg-white/20 text-xs">
                  {schedule.totalPayments} versements
                </span>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
