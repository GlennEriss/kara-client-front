"use client"

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useMembershipExport } from '@/domains/memberships/hooks/useMembershipExport'
import type { ExportFormat, QuantityMode, SortOrder, VehicleFilter } from '@/domains/memberships/services/MembershipExportService'
import type { UserFilters } from '@/types/types'
import { Calendar, Car, Download, Loader2, SortAsc, Users } from 'lucide-react'
import React from 'react'

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
      <DialogContent className="sm:max-w-2xl overflow-hidden border-0 bg-gradient-to-b from-white via-white to-slate-50/80 p-0 shadow-2xl">
        <DialogHeader className="border-b border-[#234D65]/15 bg-gradient-to-r from-[#234D65] via-[#2c5a73] to-[#234D65] px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="text-xl font-bold text-white">Exporter les membres</DialogTitle>
              <DialogDescription className="mt-1 text-white/85">
                Personnalisez votre export avant de générer le fichier.
              </DialogDescription>
            </div>
            <div className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/30 bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
              <Download className="h-3.5 w-3.5" />
              Export personnalisé
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 px-5 py-5 sm:px-6">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#234D65]">
                <Download className="h-3.5 w-3.5" />
                Format d'export
              </p>
              <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as ExportFormat)} disabled={isExporting}>
                <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white">
                  <SelectValue placeholder="Choisir un format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                  <SelectItem value="csv">CSV (.csv)</SelectItem>
                  <SelectItem value="pdf">PDF (.pdf)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#234D65]">
                <Car className="h-3.5 w-3.5" />
                Filtre véhicule
              </p>
              <Select value={vehicleFilter} onValueChange={(v) => setVehicleFilter(v as VehicleFilter)} disabled={isExporting}>
                <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white">
                  <SelectValue placeholder="Choisir un filtre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les membres</SelectItem>
                  <SelectItem value="with">Membres avec véhicule</SelectItem>
                  <SelectItem value="without">Membres sans véhicule</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#234D65]">
                <SortAsc className="h-3.5 w-3.5" />
                Ordre alphabétique
              </p>
              <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as SortOrder)} disabled={isExporting}>
                <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white">
                  <SelectValue placeholder="Choisir un ordre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A-Z">A - Z</SelectItem>
                  <SelectItem value="Z-A">Z - A</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#234D65]">
                <Users className="h-3.5 w-3.5" />
                Nombre de membres
              </p>
              <div className="flex gap-2">
                <Select value={quantityMode} onValueChange={(v) => setQuantityMode(v as QuantityMode)} disabled={isExporting}>
                  <SelectTrigger className="h-11 w-40 rounded-xl border-slate-200 bg-white">
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
                  className="h-11 w-36 rounded-xl border-slate-200 bg-white"
                  min={1}
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#234D65]">
              <Calendar className="h-3.5 w-3.5" />
              Période d'export
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Date de début</label>
                <Input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} disabled={isExporting} className="h-11 rounded-xl border-slate-200 bg-white" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Date de fin</label>
                <Input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} disabled={isExporting} className="h-11 rounded-xl border-slate-200 bg-white" />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-slate-200 bg-white px-5 py-4 sm:px-6">
          <Button variant="outline" onClick={onClose} disabled={isExporting} className="h-10 rounded-xl border-slate-300 px-4 text-slate-700 hover:bg-slate-50">
            Annuler
          </Button>
          <Button onClick={handleExport} disabled={isExporting} className="h-10 rounded-xl bg-gradient-to-r from-[#234D65] to-[#2c5a73] px-5 text-white hover:from-[#2c5a73] hover:to-[#234D65]">
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
