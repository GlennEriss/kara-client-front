'use client'

import { useState } from 'react'
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import type { DashboardExportData } from '../exports/dashboard-export-model'

export function DashboardExportButton({ data, disabled, label = 'Exporter' }: { data: DashboardExportData; disabled?: boolean; label?: string }) {
  const [busy, setBusy] = useState(false)
  const download = async (format: 'pdf' | 'excel') => {
    if (busy) return
    setBusy(true)
    try {
      const { exportDashboard } = await import('../exports/exportDashboard')
      await exportDashboard({ ...data, context: { ...data.context, baseUrl: window.location.origin } }, format)
      toast.success('Export généré')
    } catch {
      toast.error('Impossible de générer l’export. Réessayez.')
    } finally { setBusy(false) }
  }
  return <DropdownMenu>
    <DropdownMenuTrigger asChild><Button type="button" variant="outline" disabled={disabled || busy} aria-label={label}>
      {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}{busy ? 'Génération…' : label}
    </Button></DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem onClick={() => void download('pdf')}><FileText className="mr-2 h-4 w-4" />Exporter en PDF</DropdownMenuItem>
      <DropdownMenuItem onClick={() => void download('excel')}><FileSpreadsheet className="mr-2 h-4 w-4" />Exporter en Excel</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
}
