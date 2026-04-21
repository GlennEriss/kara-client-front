/**
 * Modal d'export des demandes en PDF ou Excel
 *
 * Responsive : Mobile, Tablette, Desktop
 * Configuration : format, périmètre, filtres, tri
 */

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
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
import { format } from 'date-fns'
import { useExportDemands } from '../../hooks/useExportDemands'
import { DemandExportService } from '../../services/DemandExportService'
import type { ExportDemandsOptions } from '../../services/DemandExportService'

interface ExportDemandsModalV2Props {
  isOpen: boolean
  onClose: () => void
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente',
  APPROVED: 'Approuvées',
  REJECTED: 'Rejetées',
  REOPENED: 'Réouvertes',
}

export function ExportDemandsModalV2({ isOpen, onClose }: ExportDemandsModalV2Props) {
  const today = new Date()
  const defaultStart = new Date(today.getFullYear(), 0, 1)

  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel'>('excel')
  const [scopeMode, setScopeMode] = useState<'all' | 'period' | 'quantity'>('period')
  const [dateStart, setDateStart] = useState<string>(format(defaultStart, 'yyyy-MM-dd'))
  const [dateEnd, setDateEnd] = useState<string>(format(today, 'yyyy-MM-dd'))
  const [quantity, setQuantity] = useState<number>(100)
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'name_asc' | 'name_desc'>('date_desc')
  const [statusFilters, setStatusFilters] = useState<Record<string, boolean>>({
    PENDING: false,
    APPROVED: false,
    REJECTED: false,
    REOPENED: false,
  })
  const [previewCount, setPreviewCount] = useState<number | null>(null)
  const [isCalculatingPreview, setIsCalculatingPreview] = useState(false)
  const [showLargeExportWarning, setShowLargeExportWarning] = useState(false)

  const { exportDemands, isExporting } = useExportDemands()
  const exportService = useMemo(() => DemandExportService.getInstance(), [])
  const selectedStatusCount = Object.values(statusFilters).filter(Boolean).length

  const calculatePreview = useCallback(async () => {
    if (!isOpen) return

    setIsCalculatingPreview(true)
    try {
      const options: ExportDemandsOptions = {
        format: exportFormat,
        scopeMode,
        dateStart: scopeMode === 'period' ? dateStart : undefined,
        dateEnd: scopeMode === 'period' ? dateEnd : undefined,
        quantity: scopeMode === 'quantity' ? quantity : undefined,
        statusFilters,
        sortBy,
      }

      const demands = await exportService.fetchDemandsForExport(options)
      const filtered = demands.filter((d) => {
        const activeFilters = Object.entries(statusFilters).filter(([, checked]) => checked)
        if (activeFilters.length === 0) return true
        return activeFilters.some(([status]) => d.status === status)
      })

      setPreviewCount(filtered.length)
    } catch (error) {
      console.error('Erreur lors du calcul de l\'aperçu:', error)
      setPreviewCount(null)
    } finally {
      setIsCalculatingPreview(false)
    }
  }, [isOpen, exportFormat, scopeMode, dateStart, dateEnd, quantity, statusFilters, sortBy, exportService])

  useEffect(() => {
    if (isOpen) {
      void calculatePreview()
    }
  }, [isOpen, calculatePreview])

  const handleExport = async () => {
    try {
      const estimatedCount = previewCount || 0
      const isLargeExport = estimatedCount > 1000 || scopeMode === 'all'

      if (isLargeExport && !showLargeExportWarning) {
        setShowLargeExportWarning(true)
        return
      }

      const options: ExportDemandsOptions = {
        format: exportFormat,
        scopeMode,
        dateStart: scopeMode === 'period' ? dateStart : undefined,
        dateEnd: scopeMode === 'period' ? dateEnd : undefined,
        quantity: scopeMode === 'quantity' ? quantity : undefined,
        statusFilters,
        sortBy,
      }

      await exportDemands(options)
      toast.success(`Export généré avec succès (${estimatedCount} demandes)`)
      onClose()
    } catch {
      toast.error('Erreur lors de la génération de l\'export')
    }
  }

  const handleReset = () => {
    setExportFormat('excel')
    setScopeMode('period')
    setDateStart(format(defaultStart, 'yyyy-MM-dd'))
    setDateEnd(format(today, 'yyyy-MM-dd'))
    setQuantity(100)
    setSortBy('date_desc')
    setStatusFilters({
      PENDING: false,
      APPROVED: false,
      REJECTED: false,
      REOPENED: false,
    })
    setShowLargeExportWarning(false)
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
                Préparez un export clair et structuré selon vos critères.
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
              <RadioGroup value={exportFormat} onValueChange={(value) => setExportFormat(value as 'pdf' | 'excel')} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <RadioGroupItem value="pdf" id="format-pdf" className="peer sr-only" />
                  <Label htmlFor="format-pdf" className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 font-semibold text-slate-700 transition-all peer-data-[state=checked]:border-[#234D65] peer-data-[state=checked]:bg-[#234D65]/10 peer-data-[state=checked]:text-[#234D65]">
                    <FileText className="h-4 w-4" />
                    PDF
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="excel" id="format-excel" className="peer sr-only" />
                  <Label htmlFor="format-excel" className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 font-semibold text-slate-700 transition-all peer-data-[state=checked]:border-[#234D65] peer-data-[state=checked]:bg-[#234D65]/10 peer-data-[state=checked]:text-[#234D65]">
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
              <RadioGroup value={scopeMode} onValueChange={(value) => setScopeMode(value as 'all' | 'period' | 'quantity')} className="grid grid-cols-1 gap-2">
                <div>
                  <RadioGroupItem value="all" id="scope-all" className="peer sr-only" />
                  <Label htmlFor="scope-all" className="block cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-medium text-slate-700 transition-all peer-data-[state=checked]:border-[#234D65] peer-data-[state=checked]:bg-[#234D65]/10 peer-data-[state=checked]:text-[#234D65]">
                    Toutes les demandes
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="period" id="scope-period" className="peer sr-only" />
                  <Label htmlFor="scope-period" className="block cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-medium text-slate-700 transition-all peer-data-[state=checked]:border-[#234D65] peer-data-[state=checked]:bg-[#234D65]/10 peer-data-[state=checked]:text-[#234D65]">
                    Par période
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="quantity" id="scope-quantity" className="peer sr-only" />
                  <Label htmlFor="scope-quantity" className="block cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-medium text-slate-700 transition-all peer-data-[state=checked]:border-[#234D65] peer-data-[state=checked]:bg-[#234D65]/10 peer-data-[state=checked]:text-[#234D65]">
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
                    <Label htmlFor="date-start" className="text-slate-600">Date de début</Label>
                    <Input id="date-start" type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} className="border-slate-200 focus-visible:ring-[#234D65]/30" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="date-end" className="text-slate-600">Date de fin</Label>
                    <Input id="date-end" type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} className="border-slate-200 focus-visible:ring-[#234D65]/30" />
                  </div>
                </div>
              </section>
            )}

            {scopeMode === 'quantity' && (
              <section className="rounded-2xl border border-[#234D65]/10 bg-white/95 p-4 shadow-[0_15px_35px_-24px_rgba(35,77,101,0.8)] md:col-span-2">
                <Label htmlFor="quantity" className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#234D65]/85">Nombre de demandes</Label>
                <Input id="quantity" type="number" min={1} max={10000} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="border-slate-200 focus-visible:ring-[#234D65]/30 md:max-w-xs" />
              </section>
            )}

            <section className="rounded-2xl border border-[#234D65]/10 bg-white/95 p-4 shadow-[0_15px_35px_-24px_rgba(35,77,101,0.8)] md:col-span-2">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#234D65]">
                  <Filter className="h-4 w-4" />
                  <Label className="text-xs font-bold uppercase tracking-wide text-[#234D65]/85">Filtres de statut</Label>
                </div>
                <span className="rounded-full bg-[#234D65]/10 px-2.5 py-1 text-xs font-semibold text-[#234D65]">
                  {selectedStatusCount} sélectionné{selectedStatusCount > 1 ? 's' : ''}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {Object.entries(statusFilters).map(([status, checked]) => (
                  <label key={status} htmlFor={`status-${status}`} className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 transition-colors hover:border-[#234D65]/30 hover:bg-slate-50">
                    <Checkbox
                      id={`status-${status}`}
                      checked={checked}
                      className="border-slate-300 data-[state=checked]:border-[#234D65] data-[state=checked]:bg-[#234D65] data-[state=checked]:text-white focus-visible:ring-[#234D65]/40"
                      onCheckedChange={(value) => setStatusFilters({ ...statusFilters, [status]: value as boolean })}
                    />
                    <span className="font-medium text-slate-700">{STATUS_LABELS[status] ?? status}</span>
                  </label>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-[#234D65]/10 bg-white/95 p-4 shadow-[0_15px_35px_-24px_rgba(35,77,101,0.8)]">
              <div className="mb-3 flex items-center gap-2 text-[#234D65]">
                <SlidersHorizontal className="h-4 w-4" />
                <Label htmlFor="sort" className="text-xs font-bold uppercase tracking-wide text-[#234D65]/85">Tri</Label>
              </div>
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as 'date_desc' | 'date_asc' | 'name_asc' | 'name_desc')}>
                <SelectTrigger id="sort" className="border-slate-200 focus:ring-[#234D65]/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date_desc">Date décroissante</SelectItem>
                  <SelectItem value="date_asc">Date croissante</SelectItem>
                  <SelectItem value="name_asc">Nom A→Z</SelectItem>
                  <SelectItem value="name_desc">Nom Z→A</SelectItem>
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
                  <p className="mb-2">
                    Vous êtes sur le point d&apos;exporter {previewCount || 'un grand nombre de'} demandes.
                  </p>
                  <p className="mb-3">Cela peut prendre plusieurs minutes. Voulez-vous continuer ?</p>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => { setShowLargeExportWarning(false); void handleExport() }}>
                      Confirmer
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShowLargeExportWarning(false)}>
                      Annuler
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t border-slate-200 bg-white/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:px-7">
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={handleReset} className="border-[#234D65]/20 text-[#234D65] hover:bg-[#234D65]/10">
              <RefreshCw className="mr-2 h-4 w-4" />
              Réinitialiser
            </Button>
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button onClick={handleExport} disabled={isExporting} className="bg-[#234D65] text-white hover:bg-[#2c5a73]">
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Générer l&apos;export
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
