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
import type { CaisseSpecialeDemandFilters, CaisseSpecialeDemandStatus } from '@/types/types'
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Loader2,
  RefreshCw,
  SlidersHorizontal,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'

interface ExportDemandesModalProps {
  isOpen: boolean
  onClose: () => void
}

type ExportFormat = 'pdf' | 'excel'
type ScopeMode = 'all' | 'period' | 'quantity'
type SortBy = 'date_desc' | 'date_asc'

const STATUS_OPTIONS: Array<{ value: CaisseSpecialeDemandStatus; label: string }> = [
  { value: 'PENDING', label: 'En attente' },
  { value: 'APPROVED', label: 'Acceptées' },
  { value: 'REJECTED', label: 'Refusées' },
  { value: 'CONVERTED', label: 'Converties' },
]

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
  const selectedStatusCount = Object.values(statusFilters).filter(Boolean).length

  const fetchDemandsForExport = useCallback(async () => {
    const filters: CaisseSpecialeDemandFilters = {
      page: 1,
      limit: scopeMode === 'quantity' ? Math.max(1, Math.min(10000, quantity)) : 5000,
      createdAtFrom: scopeMode === 'period' && dateStart ? new Date(dateStart) : undefined,
      createdAtTo: scopeMode === 'period' && dateEnd ? new Date(`${dateEnd}T23:59:59`) : undefined,
    }
    const { items } = await service.getDemandsWithFilters(filters)
    const activeStatuses = Object.entries(statusFilters)
      .filter(([, checked]) => checked)
      .map(([status]) => status as CaisseSpecialeDemandStatus)
    const byStatus = activeStatuses.length === 0
      ? (items ?? [])
      : (items ?? []).filter((d) => activeStatuses.includes(d.status))

    return [...byStatus].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return sortBy === 'date_asc' ? dateA - dateB : dateB - dateA
    })
  }, [scopeMode, quantity, dateStart, dateEnd, service, statusFilters, sortBy])

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
      void calculatePreview()
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
        STATUS_OPTIONS.find((option) => option.value === d.status)?.label ?? d.status,
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
      <DialogContent className="flex h-[96vh] w-[98vw] max-w-none flex-col overflow-hidden rounded-3xl border border-[#234D65]/20 bg-white p-0 shadow-[0_30px_90px_-30px_rgba(20,35,51,0.55)] sm:w-[96vw] sm:max-w-[96vw] xl:w-[80vw] xl:max-w-[1000px] md:h-[94vh]">
        <DialogHeader className="border-b border-white/20 bg-gradient-to-r from-[#1f455b] via-[#234D65] to-[#2c5a73] px-5 py-5 text-white md:px-7 md:py-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/30 bg-white/15">
              <Upload className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-xl font-black tracking-tight md:text-2xl">
                Exporter les demandes
              </DialogTitle>
              <DialogDescription className="text-sm text-white/85 md:text-base">
                Composez votre export Caisse Spéciale avec un filtrage précis.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto bg-gradient-to-b from-slate-50 via-white to-slate-50/70 px-4 py-5 md:px-7 md:py-6">
          <div className="grid gap-4 md:grid-cols-2">
            <section className="rounded-2xl border border-[#234D65]/10 bg-white/95 p-4 shadow-[0_15px_35px_-24px_rgba(35,77,101,0.8)]">
              <div className="mb-3 flex items-center gap-2 text-[#234D65]">
                <FileSpreadsheet className="h-4 w-4" />
                <Label className="text-xs font-bold uppercase tracking-wide text-[#234D65]/85">Format</Label>
              </div>
              <RadioGroup value={exportFormat} onValueChange={(value) => setExportFormat(value as ExportFormat)} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <RadioGroupItem value="pdf" id="cs-export-format-pdf" className="peer sr-only" />
                  <Label htmlFor="cs-export-format-pdf" className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 font-semibold text-slate-700 transition-all peer-data-[state=checked]:border-[#234D65] peer-data-[state=checked]:bg-[#234D65]/10 peer-data-[state=checked]:text-[#234D65]">
                    <FileText className="h-4 w-4" />
                    PDF
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="excel" id="cs-export-format-excel" className="peer sr-only" />
                  <Label htmlFor="cs-export-format-excel" className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 font-semibold text-slate-700 transition-all peer-data-[state=checked]:border-[#234D65] peer-data-[state=checked]:bg-[#234D65]/10 peer-data-[state=checked]:text-[#234D65]">
                    <FileSpreadsheet className="h-4 w-4" />
                    Excel
                  </Label>
                </div>
              </RadioGroup>
            </section>

            <section className="rounded-2xl border border-[#234D65]/10 bg-white/95 p-4 shadow-[0_15px_35px_-24px_rgba(35,77,101,0.8)]">
              <div className="mb-3 flex items-center gap-2 text-[#234D65]">
                <CalendarDays className="h-4 w-4" />
                <Label className="text-xs font-bold uppercase tracking-wide text-[#234D65]/85">Périmètre</Label>
              </div>
              <RadioGroup value={scopeMode} onValueChange={(value) => setScopeMode(value as ScopeMode)} className="grid grid-cols-1 gap-2">
                <div>
                  <RadioGroupItem value="all" id="cs-export-scope-all" className="peer sr-only" />
                  <Label htmlFor="cs-export-scope-all" className="block cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-medium text-slate-700 transition-all peer-data-[state=checked]:border-[#234D65] peer-data-[state=checked]:bg-[#234D65]/10 peer-data-[state=checked]:text-[#234D65]">
                    Toutes les demandes
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="period" id="cs-export-scope-period" className="peer sr-only" />
                  <Label htmlFor="cs-export-scope-period" className="block cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-medium text-slate-700 transition-all peer-data-[state=checked]:border-[#234D65] peer-data-[state=checked]:bg-[#234D65]/10 peer-data-[state=checked]:text-[#234D65]">
                    Par période
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="quantity" id="cs-export-scope-quantity" className="peer sr-only" />
                  <Label htmlFor="cs-export-scope-quantity" className="block cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-medium text-slate-700 transition-all peer-data-[state=checked]:border-[#234D65] peer-data-[state=checked]:bg-[#234D65]/10 peer-data-[state=checked]:text-[#234D65]">
                    Par nombre
                  </Label>
                </div>
              </RadioGroup>
            </section>

            {scopeMode === 'period' && (
              <section className="rounded-2xl border border-[#234D65]/10 bg-white/95 p-4 shadow-[0_15px_35px_-24px_rgba(35,77,101,0.8)] md:col-span-2">
                <div className="mb-3 flex items-center gap-2 text-[#234D65]">
                  <CalendarDays className="h-4 w-4" />
                  <Label className="text-xs font-bold uppercase tracking-wide text-[#234D65]/85">Période d&apos;export</Label>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="cs-export-date-start" className="text-slate-600">Date de début</Label>
                    <Input id="cs-export-date-start" type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} className="border-slate-200 focus-visible:ring-[#234D65]/30" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cs-export-date-end" className="text-slate-600">Date de fin</Label>
                    <Input id="cs-export-date-end" type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} className="border-slate-200 focus-visible:ring-[#234D65]/30" />
                  </div>
                </div>
              </section>
            )}

            {scopeMode === 'quantity' && (
              <section className="rounded-2xl border border-[#234D65]/10 bg-white/95 p-4 shadow-[0_15px_35px_-24px_rgba(35,77,101,0.8)] md:col-span-2">
                <Label htmlFor="cs-export-quantity" className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#234D65]/85">Nombre de demandes</Label>
                <Input id="cs-export-quantity" type="number" min={1} max={10000} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="border-slate-200 focus-visible:ring-[#234D65]/30 md:max-w-xs" />
              </section>
            )}

            <section className="rounded-2xl border border-[#234D65]/10 bg-white/95 p-4 shadow-[0_15px_35px_-24px_rgba(35,77,101,0.8)] md:col-span-2">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#234D65]">
                  <Filter className="h-4 w-4" />
                  <Label className="text-xs font-bold uppercase tracking-wide text-[#234D65]/85">Statuts à inclure</Label>
                </div>
                <span className="rounded-full bg-[#234D65]/10 px-2.5 py-1 text-xs font-semibold text-[#234D65]">
                  {selectedStatusCount} sélectionné{selectedStatusCount > 1 ? 's' : ''}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {STATUS_OPTIONS.map((option) => (
                  <label key={option.value} htmlFor={`cs-export-status-${option.value}`} className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 transition-colors hover:border-[#234D65]/30 hover:bg-slate-50">
                    <Checkbox
                      id={`cs-export-status-${option.value}`}
                      checked={statusFilters[option.value]}
                      className="border-slate-300 data-[state=checked]:border-[#234D65] data-[state=checked]:bg-[#234D65] data-[state=checked]:text-white focus-visible:ring-[#234D65]/40"
                      onCheckedChange={(checked) =>
                        setStatusFilters((prev) => ({
                          ...prev,
                          [option.value]: Boolean(checked),
                        }))
                      }
                    />
                    <span className="font-medium text-slate-700">{option.label}</span>
                  </label>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-[#234D65]/10 bg-white/95 p-4 shadow-[0_15px_35px_-24px_rgba(35,77,101,0.8)]">
              <div className="mb-3 flex items-center gap-2 text-[#234D65]">
                <SlidersHorizontal className="h-4 w-4" />
                <Label htmlFor="cs-export-sort" className="text-xs font-bold uppercase tracking-wide text-[#234D65]/85">Tri</Label>
              </div>
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortBy)}>
                <SelectTrigger id="cs-export-sort" className="border-slate-200 focus:ring-[#234D65]/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date_desc">Date de création (plus récentes)</SelectItem>
                  <SelectItem value="date_asc">Date de création (plus anciennes)</SelectItem>
                </SelectContent>
              </Select>
            </section>

            <section className="rounded-2xl border border-[#234D65]/20 bg-gradient-to-r from-[#234D65]/10 via-[#2c5a73]/10 to-[#234D65]/10 p-4 shadow-[0_15px_35px_-24px_rgba(35,77,101,0.8)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="mb-1 text-xs font-bold uppercase tracking-wide text-[#234D65]/80">Aperçu export</p>
                  <div className="flex items-center gap-2 text-[#234D65]">
                    {isCalculatingPreview ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <BarChart3 className="h-4 w-4" />
                    )}
                    <p className="text-xl font-black leading-none md:text-2xl">
                      {isCalculatingPreview ? '...' : previewCount ?? '—'}
                    </p>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">demandes seront exportées</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={calculatePreview} disabled={isCalculatingPreview} className="border-[#234D65]/25 bg-white/90 text-[#234D65] hover:bg-[#234D65]/10">
                  <RefreshCw className={`mr-2 h-4 w-4 ${isCalculatingPreview ? 'animate-spin' : ''}`} />
                  Recalculer
                </Button>
              </div>
            </section>

            {showLargeExportWarning && (
              <Alert className="md:col-span-2 border-amber-200 bg-amber-50/90">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800">Export volumineux</AlertTitle>
                <AlertDescription className="text-amber-700">
                  Cette exportation peut prendre un peu de temps. Cliquez à nouveau sur Exporter pour confirmer.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t border-slate-200 bg-white/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:px-7">
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={resetForm} disabled={isExporting} className="border-[#234D65]/20 text-[#234D65] hover:bg-[#234D65]/10">
              <RefreshCw className="mr-2 h-4 w-4" />
              Réinitialiser
            </Button>
            <Button type="button" variant="outline" onClick={onClose} disabled={isExporting}>
              Annuler
            </Button>
            <Button type="button" onClick={handleExport} disabled={isExporting || isCalculatingPreview} className="bg-[#234D65] text-white hover:bg-[#2c5a73]">
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Export en cours...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Exporter
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
