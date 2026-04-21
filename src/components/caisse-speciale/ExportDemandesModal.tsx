'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ServiceFactory } from '@/factories/ServiceFactory'
import type { CaisseSpecialeDemand, CaisseSpecialeDemandFilters, CaisseSpecialeDemandStatus } from '@/types/types'
import { AlertTriangle, Download, FileSpreadsheet, FileText, Loader2, RefreshCw, Upload } from 'lucide-react'
import { toast } from 'sonner'

interface ExportDemandesModalProps {
  isOpen: boolean
  onClose: () => void
}

type ExportFormat = 'pdf' | 'excel'
type ScopeMode = 'all' | 'period' | 'quantity'
type SortBy = 'date_desc' | 'date_asc'

const STATUS_LABELS: Record<CaisseSpecialeDemandStatus, string> = {
  PENDING: 'En attente',
  APPROVED: 'Acceptée',
  REJECTED: 'Refusée',
  CONVERTED: 'Convertie',
}

export default function ExportDemandesModal({ isOpen, onClose }: ExportDemandesModalProps) {
  const today = useMemo(() => new Date(), [])
  const defaultStart = useMemo(() => new Date(today.getFullYear(), 0, 1), [today])

  const [exportFormat, setExportFormat] = useState<ExportFormat>('excel')
  const [scopeMode, setScopeMode] = useState<ScopeMode>('period')
  const [dateStart, setDateStart] = useState(defaultStart.toISOString().slice(0, 10))
  const [dateEnd, setDateEnd] = useState(today.toISOString().slice(0, 10))
  const [quantity, setQuantity] = useState(100)
  const [sortBy, setSortBy] = useState<SortBy>('date_desc')
  const [statusFilters, setStatusFilters] = useState<Record<CaisseSpecialeDemandStatus, boolean>>({
    PENDING: false,
    APPROVED: false,
    REJECTED: false,
    CONVERTED: false,
  })
  const [previewCount, setPreviewCount] = useState<number | null>(null)
  const [isCalculatingPreview, setIsCalculatingPreview] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [showLargeExportWarning, setShowLargeExportWarning] = useState(false)

  const service = ServiceFactory.getCaisseSpecialeService()

  const buildBaseFilters = (): CaisseSpecialeDemandFilters => {
    const filters: CaisseSpecialeDemandFilters = {
      page: 1,
      limit: scopeMode === 'quantity' ? Math.max(1, Math.min(10000, quantity)) : 5000,
    }

    if (scopeMode === 'period') {
      filters.createdAtFrom = dateStart || undefined
      filters.createdAtTo = dateEnd || undefined
    }

    return filters
  }

  const applyStatusFilter = useCallback((items: CaisseSpecialeDemand[]) => {
    const activeStatuses = Object.entries(statusFilters)
      .filter(([, checked]) => checked)
      .map(([status]) => status as CaisseSpecialeDemandStatus)

    if (activeStatuses.length === 0) return items
    return items.filter((d) => activeStatuses.includes(d.status))
  }, [statusFilters])

  const applySort = (items: CaisseSpecialeDemand[]) => {
    const sorted = [...items]
    sorted.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return sortBy === 'date_asc' ? dateA - dateB : dateB - dateA
    })
    return sorted
  }

  const fetchDemandsForExport = useCallback(async () => {
    const { items } = await service.getDemandsWithFilters(buildBaseFilters())
    const byStatus = applyStatusFilter(items ?? [])
    return applySort(byStatus)
  }, [applyStatusFilter, scopeMode, dateStart, dateEnd, quantity, sortBy, service])

  const calculatePreview = useCallback(async () => {
    if (!isOpen) return
    setIsCalculatingPreview(true)
    try {
      const demands = await fetchDemandsForExport()
      setPreviewCount(demands.length)
    } catch (error) {
      console.error('Erreur preview export caisse spéciale:', error)
      setPreviewCount(null)
    } finally {
      setIsCalculatingPreview(false)
    }
  }, [fetchDemandsForExport, isOpen])

  useEffect(() => {
    if (isOpen) {
      calculatePreview()
    }
  }, [isOpen, calculatePreview])

  const resetForm = () => {
    setExportFormat('excel')
    setScopeMode('period')
    setDateStart(defaultStart.toISOString().slice(0, 10))
    setDateEnd(today.toISOString().slice(0, 10))
    setQuantity(100)
    setSortBy('date_desc')
    setStatusFilters({
      PENDING: false,
      APPROVED: false,
      REJECTED: false,
      CONVERTED: false,
    })
    setShowLargeExportWarning(false)
  }

  const handleExport = async () => {
    try {
      if ((previewCount ?? 0) === 0) {
        toast.error('Aucune demande à exporter')
        return
      }

      const isLargeExport = (previewCount ?? 0) > 1000 || scopeMode === 'all'
      if (isLargeExport && !showLargeExportWarning) {
        setShowLargeExportWarning(true)
        return
      }

      setIsExporting(true)
      const demands = await fetchDemandsForExport()

      const headers = ['ID', 'Type', 'Matricule', 'Statut', 'Montant (FCFA)', 'Durée', 'Date souhaitée', 'Contact urgence', 'Date création']
      const rows = demands.map((d) => [
        d.id,
        d.caisseType || '—',
        d.memberId || '—',
        STATUS_LABELS[d.status] || d.status,
        d.monthlyAmount?.toLocaleString('fr-FR') || '0',
        `${d.monthsPlanned || 0} mois`,
        d.desiredDate ? new Date(d.desiredDate).toLocaleDateString('fr-FR') : '—',
        d.emergencyContact ? `${d.emergencyContact.lastName || ''} ${d.emergencyContact.firstName || ''}`.trim() || d.emergencyContact.phone1 || '—' : '—',
        d.createdAt ? new Date(d.createdAt).toLocaleDateString('fr-FR') : '—',
      ])

      const filenameBase = `demandes_caisse_speciale_${new Date().toISOString().slice(0, 10)}`

      if (exportFormat === 'pdf') {
        const { jsPDF } = await import('jspdf')
        const autoTable = (await import('jspdf-autotable')).default
        const doc = new jsPDF('landscape')

        doc.setFontSize(16)
        doc.text('Liste des Demandes Caisse Spéciale', 14, 14)
        doc.setFontSize(10)
        doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 14, 20)
        doc.text(`Total: ${demands.length} demande(s)`, 14, 24)

        autoTable(doc, {
          head: [headers],
          body: rows,
          startY: 28,
          styles: { fontSize: 7, cellPadding: 1.5 },
          headStyles: { fillColor: [35, 77, 101], textColor: 255, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [245, 247, 250] },
          margin: { top: 28 },
        })

        doc.save(`${filenameBase}.pdf`)
      } else {
        const XLSX = await import('xlsx')
        const sheetData = [
          ['LISTE DES DEMANDES CAISSE SPÉCIALE'],
          [`Généré le ${new Date().toLocaleDateString('fr-FR')}`],
          [],
          headers,
          ...rows,
        ]

        const worksheet = XLSX.utils.aoa_to_sheet(sheetData)
        worksheet['!merges'] = [
          { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
          { s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } },
        ]
        worksheet['!cols'] = headers.map(() => ({ wch: 20 }))

        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Demandes')
        XLSX.writeFile(workbook, `${filenameBase}.xlsx`)
      }

      toast.success(`Export généré avec succès (${demands.length} demandes)`)
      onClose()
    } catch (error) {
      console.error('Erreur export demandes caisse spéciale:', error)
      toast.error('Erreur lors de la génération de l\'export')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Exporter les demandes
          </DialogTitle>
          <DialogDescription>
            Configurez les paramètres d&apos;export des demandes de Caisse Spéciale.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <Label>Format d&apos;export</Label>
            <RadioGroup
              value={exportFormat}
              onValueChange={(value) => setExportFormat(value as ExportFormat)}
              className="mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pdf" id="cs-export-format-pdf" />
                <Label htmlFor="cs-export-format-pdf" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  PDF
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="excel" id="cs-export-format-excel" />
                <Label htmlFor="cs-export-format-excel" className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4" />
                  Excel
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label>Périmètre d&apos;export</Label>
            <RadioGroup
              value={scopeMode}
              onValueChange={(value) => setScopeMode(value as ScopeMode)}
              className="mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="cs-export-scope-all" />
                <Label htmlFor="cs-export-scope-all">Toutes les demandes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="period" id="cs-export-scope-period" />
                <Label htmlFor="cs-export-scope-period">Par période</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="quantity" id="cs-export-scope-quantity" />
                <Label htmlFor="cs-export-scope-quantity">Par nombre</Label>
              </div>
            </RadioGroup>
          </div>

          {scopeMode === 'period' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cs-export-date-start">Date de début</Label>
                <Input
                  id="cs-export-date-start"
                  type="date"
                  value={dateStart}
                  onChange={(e) => setDateStart(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="cs-export-date-end">Date de fin</Label>
                <Input
                  id="cs-export-date-end"
                  type="date"
                  value={dateEnd}
                  onChange={(e) => setDateEnd(e.target.value)}
                />
              </div>
            </div>
          )}

          {scopeMode === 'quantity' && (
            <div>
              <Label htmlFor="cs-export-quantity">Nombre de demandes</Label>
              <Input
                id="cs-export-quantity"
                type="number"
                min={1}
                max={10000}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
            </div>
          )}

          <div>
            <Label>Statuts à inclure</Label>
            <div className="space-y-2 mt-2">
              {Object.entries(STATUS_LABELS).map(([status, label]) => (
                <div key={status} className="flex items-center space-x-2">
                  <Checkbox
                    id={`cs-export-status-${status}`}
                    checked={statusFilters[status as CaisseSpecialeDemandStatus]}
                    onCheckedChange={(checked) =>
                      setStatusFilters((prev) => ({
                        ...prev,
                        [status]: Boolean(checked),
                      }))
                    }
                  />
                  <Label htmlFor={`cs-export-status-${status}`}>{label}</Label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label>Trier par</Label>
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortBy)}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date_desc">Date de création (plus récentes)</SelectItem>
                <SelectItem value="date_asc">Date de création (plus anciennes)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border p-4 bg-muted/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aperçu</p>
                <p className="text-xl font-semibold">
                  {isCalculatingPreview ? '...' : previewCount ?? '—'} demandes
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={calculatePreview}
                disabled={isCalculatingPreview}
              >
                {isCalculatingPreview ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Recalculer
              </Button>
            </div>
          </div>

          {showLargeExportWarning && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Export volumineux</AlertTitle>
              <AlertDescription>
                Cette exportation peut prendre un peu de temps. Cliquez à nouveau sur Exporter pour confirmer.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={resetForm} disabled={isExporting}>
            Réinitialiser
          </Button>
          <Button type="button" variant="outline" onClick={onClose} disabled={isExporting}>
            Annuler
          </Button>
          <Button type="button" onClick={handleExport} disabled={isExporting || isCalculatingPreview}>
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {isExporting ? 'Export en cours...' : 'Exporter'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
