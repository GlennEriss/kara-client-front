/**
 * Modal d'export des demandes d'adhésion V2
 * 
 * Permet d'exporter la liste des demandes en PDF ou Excel
 * avec filtres par période, nombre, et tri personnalisable
 */

'use client'

import { useState } from 'react'
import { Download, Loader2, Calendar, FileSpreadsheet, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { MembershipRepositoryV2 } from '../../repositories/MembershipRepositoryV2'
import type { MembershipRequest } from '../../entities'
import { MEMBERSHIP_REQUEST_STATUS_LABELS } from '@/constantes/membership-requests'

type ExportFormat = 'pdf' | 'excel'
type ScopeMode = 'all' | 'period' | 'quantity'
type SortBy = 'date_desc' | 'date_asc' | 'name_asc' | 'name_desc'

interface ExportMembershipRequestsModalV2Props {
  isOpen: boolean
  onClose: () => void
}

export function ExportMembershipRequestsModalV2({
  isOpen,
  onClose,
}: ExportMembershipRequestsModalV2Props) {
  const today = new Date()
  const defaultStart = new Date(today.getFullYear(), 0, 1) // 1er janvier de l'année en cours

  const [exportFormat, setExportFormat] = useState<ExportFormat>('excel')
  const [scopeMode, setScopeMode] = useState<ScopeMode>('period')
  const [dateStart, setDateStart] = useState<string>(format(defaultStart, 'yyyy-MM-dd'))
  const [dateEnd, setDateEnd] = useState<string>(format(today, 'yyyy-MM-dd'))
  const [quantity, setQuantity] = useState<number>(100)
  const [sortBy, setSortBy] = useState<SortBy>('date_desc')
  const [isExporting, setIsExporting] = useState(false)

  // Helper pour normaliser les dates (peut être Date, Timestamp Firestore, ou string)
  const normalizeDate = (date: any): Date => {
    if (date instanceof Date) {
      return date
    } else if (date && typeof date === 'object' && 'toDate' in date && typeof date.toDate === 'function') {
      return date.toDate()
    } else {
      return new Date(date)
    }
  }

  const handleExport = async () => {
    try {
      setIsExporting(true)
      const repository = MembershipRepositoryV2.getInstance()

      // Récupérer les demandes selon le périmètre
      let requests: MembershipRequest[] = []

      if (scopeMode === 'all') {
        // Récupérer toutes les demandes (par pages)
        let page = 1
        const pageSize = 100
        while (true) {
          const response = await repository.getAll({}, page, pageSize)
          if (!response.items || response.items.length === 0) break
          requests.push(...response.items)
          if (!response.pagination?.hasNextPage) break
          page++
        }
      } else if (scopeMode === 'period') {
        // Récupérer par période
        const start = new Date(dateStart)
        const end = new Date(dateEnd)
        end.setHours(23, 59, 59, 999)

        let page = 1
        const pageSize = 100
        while (true) {
          const response = await repository.getAll({}, page, pageSize)
          if (!response.items || response.items.length === 0) break
          
          // Filtrer par période côté client
          const filtered = response.items.filter((req) => {
            const createdAt = normalizeDate(req.createdAt)
            return createdAt >= start && createdAt <= end
          })
          
          requests.push(...filtered)
          if (!response.pagination?.hasNextPage) break
          page++
        }
      } else if (scopeMode === 'quantity') {
        // Récupérer les N premières demandes (triées du plus récent au plus ancien)
        let page = 1
        const pageSize = 100
        while (requests.length < quantity) {
          const response = await repository.getAll({}, page, pageSize)
          if (!response.items || response.items.length === 0) break
          requests.push(...response.items)
          if (requests.length >= quantity) break
          if (!response.pagination?.hasNextPage) break
          page++
        }
        // Limiter à la quantité demandée
        requests = requests.slice(0, quantity)
      }

      if (requests.length === 0) {
        toast.info('Aucune demande à exporter selon les critères sélectionnés')
        return
      }

      // Trier les demandes
      requests.sort((a, b) => {
        if (sortBy === 'date_desc' || sortBy === 'date_asc') {
          const dateA = normalizeDate(a.createdAt)
          const dateB = normalizeDate(b.createdAt)
          return sortBy === 'date_desc' 
            ? dateB.getTime() - dateA.getTime()
            : dateA.getTime() - dateB.getTime()
        } else {
          // Tri alphabétique
          const nameA = `${a.identity.firstName} ${a.identity.lastName}`.toLowerCase()
          const nameB = `${b.identity.firstName} ${b.identity.lastName}`.toLowerCase()
          return sortBy === 'name_asc'
            ? nameA.localeCompare(nameB, 'fr')
            : nameB.localeCompare(nameA, 'fr')
        }
      })

      // Générer l'export
      if (exportFormat === 'pdf') {
        await generatePDF(requests, scopeMode, dateStart, dateEnd, quantity)
      } else {
        await generateExcel(requests, scopeMode, dateStart, dateEnd, quantity)
      }

      toast.success('Export généré avec succès')
      onClose()
    } catch (error: any) {
      console.error('Erreur lors de l\'export:', error)
      toast.error('Erreur lors de l\'export', {
        description: error.message || 'Une erreur est survenue',
      })
    } finally {
      setIsExporting(false)
    }
  }

  const generatePDF = async (
    requests: MembershipRequest[],
    scopeMode: ScopeMode,
    dateStart: string,
    dateEnd: string,
    quantity: number
  ) => {
    const { jsPDF } = await import('jspdf')
    const autoTable = (await import('jspdf-autotable')).default
    const doc = new jsPDF('landscape', 'mm', 'a4')

    // Couleurs KARA
    const primaryColor: [number, number, number] = [31, 81, 255] // kara-primary-dark

    // En-tête
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.rect(0, 0, 297, 30, 'F')
    
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('KARA', 20, 15)
    
    doc.setFontSize(14)
    doc.text('Liste des demandes d\'adhésion', 20, 22)

    // Informations de l'export
    let yPos = 40
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    
    if (scopeMode === 'period') {
      doc.text(`Période: du ${format(new Date(dateStart), 'dd/MM/yyyy', { locale: fr })} au ${format(new Date(dateEnd), 'dd/MM/yyyy', { locale: fr })}`, 20, yPos)
    } else if (scopeMode === 'quantity') {
      doc.text(`Nombre: ${quantity} premières demandes`, 20, yPos)
    } else {
      doc.text('Périmètre: Toutes les demandes', 20, yPos)
    }
    
    yPos += 6
    doc.text(`Généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}`, 20, yPos)
    yPos += 6
    doc.text(`Total: ${requests.length} demande(s)`, 20, yPos)

    // Préparer les données du tableau
    const headers = ['Nom & Prénom', 'Référence', 'Statut', 'Paiement', 'Date soumission']
    const bodyRows = requests.map((req) => {
      const fullName = `${req.identity.firstName} ${req.identity.lastName}`.trim()
      const reference = req.matricule || req.id?.slice(0, 12) || 'N/A'
      const status = MEMBERSHIP_REQUEST_STATUS_LABELS[req.status] || req.status
      const payment = req.isPaid ? 'Payé' : 'Non payé'
      const createdAt = normalizeDate(req.createdAt)
      const dateStr = format(createdAt, 'dd/MM/yyyy', { locale: fr })
      
      return [fullName, reference, status, payment, dateStr]
    })

    // Tableau
    autoTable(doc, {
      head: [headers],
      body: bodyRows,
      startY: yPos + 5,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      margin: { top: yPos + 5 },
    })

    // Pied de page
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(100, 116, 139)
      doc.text(
        `Page ${i} / ${pageCount}`,
        297 / 2,
        210 - 10,
        { align: 'center' }
      )
    }

    const filename = `export_demandes_${format(new Date(), 'yyyyMMdd', { locale: fr })}.pdf`
    doc.save(filename)
  }

  const generateExcel = async (
    requests: MembershipRequest[],
    scopeMode: ScopeMode,
    dateStart: string,
    dateEnd: string,
    quantity: number
  ) => {
    const XLSX = await import('xlsx')

    // Préparer les données
    const rows = requests.map((req) => {
      const createdAt = normalizeDate(req.createdAt)
      const paymentDate = req.payments && req.payments.length > 0
        ? normalizeDate(req.payments[0].date)
        : null

      return {
        'Nom': req.identity.lastName || '',
        'Prénom': req.identity.firstName || '',
        'Email': req.identity.email || '',
        'Téléphone': req.identity.contacts?.[0] || '',
        'Référence': req.matricule || req.id || '',
        'Statut dossier': MEMBERSHIP_REQUEST_STATUS_LABELS[req.status] || req.status,
        'Statut paiement': req.isPaid ? 'Payé' : 'Non payé',
        'Montant': req.payments && req.payments.length > 0 ? req.payments[0].amount : '',
        'Date & heure soumission': format(createdAt, 'dd/MM/yyyy HH:mm', { locale: fr }),
        'Date paiement': paymentDate ? format(paymentDate, 'dd/MM/yyyy', { locale: fr }) : '',
      }
    })

    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Demandes')

    // Ajuster la largeur des colonnes
    const colWidths = [
      { wch: 20 }, // Nom
      { wch: 20 }, // Prénom
      { wch: 30 }, // Email
      { wch: 15 }, // Téléphone
      { wch: 20 }, // Référence
      { wch: 15 }, // Statut dossier
      { wch: 15 }, // Statut paiement
      { wch: 12 }, // Montant
      { wch: 20 }, // Date soumission
      { wch: 15 }, // Date paiement
    ]
    worksheet['!cols'] = colWidths

    const filename = `export_demandes_${format(new Date(), 'yyyyMMdd', { locale: fr })}.xlsx`
    XLSX.writeFile(workbook, filename)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isExporting && !open && onClose()}>
      <DialogContent className="sm:max-w-2xl" data-testid="modal-export-requests">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-kara-primary-dark" />
            Exporter les demandes d'adhésion
          </DialogTitle>
          <DialogDescription>
            Configurez votre export avant de générer le fichier
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format d'export */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-kara-primary-dark">Format d'export</Label>
            <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as ExportFormat)} disabled={isExporting}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="excel">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4" />
                    Excel (.xlsx)
                  </div>
                </SelectItem>
                <SelectItem value="pdf">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    PDF (.pdf)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Périmètre */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-kara-primary-dark">Périmètre des données</Label>
            <Select value={scopeMode} onValueChange={(v) => setScopeMode(v as ScopeMode)} disabled={isExporting}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les demandes</SelectItem>
                <SelectItem value="period">Par période</SelectItem>
                <SelectItem value="quantity">Par nombre</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Dates (si période) */}
          {scopeMode === 'period' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Du</Label>
                <Input
                  type="date"
                  value={dateStart}
                  onChange={(e) => setDateStart(e.target.value)}
                  disabled={isExporting}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Au</Label>
                <Input
                  type="date"
                  value={dateEnd}
                  onChange={(e) => setDateEnd(e.target.value)}
                  disabled={isExporting}
                />
              </div>
            </div>
          )}

          {/* Quantité (si mode quantité) */}
          {scopeMode === 'quantity' && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Nombre de demandes</Label>
              <Input
                type="number"
                min="1"
                max="10000"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value) || 100)}
                disabled={isExporting}
              />
              <p className="text-xs text-kara-neutral-500">
                Les demandes seront triées du plus récent au plus ancien
              </p>
            </div>
          )}

          {/* Ordre de tri */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-kara-primary-dark">Ordre de tri</Label>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)} disabled={isExporting}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date_desc">Date de soumission (Plus récent → Plus ancien)</SelectItem>
                <SelectItem value="date_asc">Date de soumission (Plus ancien → Plus récent)</SelectItem>
                <SelectItem value="name_asc">Ordre alphabétique (A → Z)</SelectItem>
                <SelectItem value="name_desc">Ordre alphabétique (Z → A)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isExporting}
            className="border-kara-neutral-200"
          >
            Annuler
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="bg-kara-primary-dark hover:bg-kara-primary-dark/90 text-white"
            data-testid="confirm-export"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Génération...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Générer l'export
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
