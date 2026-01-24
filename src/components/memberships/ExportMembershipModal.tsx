"use client"

import React from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import type { UserFilters } from '@/types/types'
import { Loader2 } from 'lucide-react'
import { useMembershipExport } from '@/domains/memberships/hooks/useMembershipExport'
import type { ExportFormat, SortOrder, QuantityMode, VehicleFilter } from '@/domains/memberships/services/MembershipExportService'

interface ExportMembershipModalProps {
  isOpen: boolean
  onClose: () => void
  filters: UserFilters
}

export default function ExportMembershipModal({ isOpen, onClose, filters }: ExportMembershipModalProps) {
  const today = new Date()
  const defaultStart = new Date(today.getFullYear(), 0, 1)

  const [sortOrder, setSortOrder] = React.useState<SortOrder>('A-Z')
  const [quantityMode, setQuantityMode] = React.useState<QuantityMode>('custom')
  const [quantity, setQuantity] = React.useState<number>(50)
  const [dateStart, setDateStart] = React.useState<string>(formatDateInput(defaultStart))
  const [dateEnd, setDateEnd] = React.useState<string>(formatDateInput(today))
  const [vehicleFilter, setVehicleFilter] = React.useState<VehicleFilter>('all')
  const [exportFormat, setExportFormat] = React.useState<ExportFormat>('excel')

  const { exportMembers, isExporting } = useMembershipExport()

  function formatDateInput(d: Date): string {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const da = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${da}`
  }

  const handleExport = async () => {
    try {
      await exportMembers({
        filters,
        format: exportFormat,
        sortOrder,
        quantityMode,
        quantity,
        dateStart: new Date(dateStart),
        dateEnd: new Date(dateEnd),
        vehicleFilter,
      })
      onClose()
    } catch (error) {
      // L'erreur est déjà gérée dans le hook (toast)
      console.error('Erreur export:', error)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isExporting && !open && onClose()}>
      <DialogContent className="sm:max-w-lg shadow-2xl border-0">
        <DialogHeader>
          <DialogTitle>Exporter les membres</DialogTitle>
          <DialogDescription>Personnalisez votre export avant de générer le fichier</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Format d'export */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Format d'export</label>
            <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as ExportFormat)} disabled={isExporting}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                <SelectItem value="csv">CSV (.csv)</SelectItem>
                <SelectItem value="pdf">PDF (.pdf)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filtre véhicule */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Filtrer par véhicule</label>
            <Select value={vehicleFilter} onValueChange={(v) => setVehicleFilter(v as VehicleFilter)} disabled={isExporting}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un filtre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les membres</SelectItem>
                <SelectItem value="with">Membres avec véhicule</SelectItem>
                <SelectItem value="without">Membres sans véhicule</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Ordre alphabétique */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Ordre alphabétique</label>
            <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as SortOrder)} disabled={isExporting}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un ordre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A-Z">A - Z</SelectItem>
                <SelectItem value="Z-A">Z - A</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Quantité */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Nombre de membres</label>
            <div className="flex gap-2">
              <Select value={quantityMode} onValueChange={(v) => setQuantityMode(v as QuantityMode)} disabled={isExporting}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Nombre</SelectItem>
                  <SelectItem value="all">Tous</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                disabled={isExporting || quantityMode === 'all'}
                className="w-32"
                min={1}
              />
            </div>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Date de début</label>
              <Input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} disabled={isExporting} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Date de fin</label>
              <Input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} disabled={isExporting} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isExporting}>Annuler</Button>
          <Button onClick={handleExport} disabled={isExporting} className="bg-[#234D65] hover:bg-[#234D65] text-white">
            {isExporting ? (
              <span className="inline-flex items-center"><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Export...</span>
            ) : (
              'Exporter'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

