/**
 * Modal d'export des demandes en PDF ou Excel
 * 
 * Responsive : Mobile, Tablette, Desktop
 * Configuration : format, périmètre, filtres, tri
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
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
import { Download, Loader2, Calendar, FileSpreadsheet, FileText, RefreshCw, Upload, BarChart3 } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { useExportDemands } from '../../hooks/useExportDemands'
import { DemandCIRepository } from '../../repositories/DemandCIRepository'
import type { ExportDemandsOptions } from '../../services/DemandExportService'

interface ExportDemandsModalV2Props {
  isOpen: boolean
  onClose: () => void
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

  const { exportDemands, isExporting } = useExportDemands()

  // Calculer l'aperçu
  const calculatePreview = useCallback(async () => {
    try {
      const repository = DemandCIRepository.getInstance()
      // TODO: Implémenter le calcul d'aperçu
      setPreviewCount(null)
    } catch (error) {
      console.error('Erreur lors du calcul de l\'aperçu:', error)
    }
  }, [scopeMode, dateStart, dateEnd, quantity, statusFilters])

  useEffect(() => {
    if (isOpen) {
      calculatePreview()
    }
  }, [isOpen, calculatePreview])

  const handleExport = async () => {
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

      await exportDemands(options)
      toast.success('Export généré avec succès')
      onClose()
    } catch (error) {
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
            Configurez les paramètres d'export
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Format */}
          <div>
            <Label>Format d'export</Label>
            <RadioGroup value={exportFormat} onValueChange={(v) => setExportFormat(v as 'pdf' | 'excel')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pdf" id="format-pdf" />
                <Label htmlFor="format-pdf" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  PDF
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="excel" id="format-excel" />
                <Label htmlFor="format-excel" className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4" />
                  Excel
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Périmètre */}
          <div>
            <Label>Périmètre d'export</Label>
            <RadioGroup value={scopeMode} onValueChange={(v) => setScopeMode(v as any)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="scope-all" />
                <Label htmlFor="scope-all">Toutes les demandes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="period" id="scope-period" />
                <Label htmlFor="scope-period">Par période</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="quantity" id="scope-quantity" />
                <Label htmlFor="scope-quantity">Par nombre</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Dates période */}
          {scopeMode === 'period' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date-start">Date de début</Label>
                <Input
                  id="date-start"
                  type="date"
                  value={dateStart}
                  onChange={(e) => setDateStart(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="date-end">Date de fin</Label>
                <Input
                  id="date-end"
                  type="date"
                  value={dateEnd}
                  onChange={(e) => setDateEnd(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Quantité */}
          {scopeMode === 'quantity' && (
            <div>
              <Label htmlFor="quantity">Nombre de demandes</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                max={10000}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
            </div>
          )}

          {/* Filtres statut */}
          <div>
            <Label>Filtres de statut</Label>
            <div className="space-y-2 mt-2">
              {Object.entries(statusFilters).map(([status, checked]) => (
                <div key={status} className="flex items-center space-x-2">
                  <Checkbox
                    id={`status-${status}`}
                    checked={checked}
                    onCheckedChange={(checked) =>
                      setStatusFilters({ ...statusFilters, [status]: checked as boolean })
                    }
                  />
                  <Label htmlFor={`status-${status}`} className="font-normal">
                    {status}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Tri */}
          <div>
            <Label htmlFor="sort">Tri</Label>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
              <SelectTrigger id="sort">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date_desc">Date décroissante</SelectItem>
                <SelectItem value="date_asc">Date croissante</SelectItem>
                <SelectItem value="name_asc">Nom A→Z</SelectItem>
                <SelectItem value="name_desc">Nom Z→A</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Aperçu */}
          {previewCount !== null && (
            <div className="bg-kara-primary/10 text-kara-primary p-3 rounded-lg flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              <span>{previewCount} demandes seront exportées</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleReset}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Réinitialiser
          </Button>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
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
