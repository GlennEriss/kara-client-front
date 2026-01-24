/**
 * Hook pour l'export des membres
 * 
 * Orchestre l'export via MembershipExportService
 */

import { useState } from 'react'
import { toast } from 'sonner'
import type { UserFilters } from '@/types/types'
import {
  MembershipExportService,
  type ExportMembersOptions,
  type ExportFormat,
  type SortOrder,
  type QuantityMode,
  type VehicleFilter,
} from '../services/MembershipExportService'

export interface UseMembershipExportOptions {
  filters: UserFilters
  format: ExportFormat
  sortOrder: SortOrder
  quantityMode: QuantityMode
  quantity?: number
  dateStart: Date
  dateEnd: Date
  vehicleFilter: VehicleFilter
}

export interface UseMembershipExportResult {
  exportMembers: (options: UseMembershipExportOptions) => Promise<void>
  isExporting: boolean
  error: Error | null
}

export function useMembershipExport(): UseMembershipExportResult {
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const service = MembershipExportService.getInstance()

  const exportMembers = async (options: UseMembershipExportOptions): Promise<void> => {
    try {
      setIsExporting(true)
      setError(null)

      // Vérifier qu'il y a des membres à exporter
      const members = await service.fetchMembersForExport(options as ExportMembersOptions)
      
      if (members.length === 0) {
        toast.info('Aucun membre à exporter selon les critères')
        return
      }

      // Construire les options d'export
      const exportOptions: ExportMembersOptions = {
        ...options,
      }

      // Exporter selon le format
      if (options.format === 'csv') {
        const blob = await service.exportMembersToCsv(exportOptions)
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `export_membres_${new Date().toISOString().slice(0, 10)}.csv`
        link.click()
        URL.revokeObjectURL(url)
        toast.success('Export CSV généré')
      } else if (options.format === 'excel') {
        await service.exportMembersToExcel(exportOptions)
        toast.success('Export Excel généré')
      } else if (options.format === 'pdf') {
        await service.exportMembersToPdf(exportOptions)
        toast.success('Export PDF généré')
      }
    } catch (err) {
      console.error('Erreur export:', err)
      const error = err instanceof Error ? err : new Error("Erreur lors de l'export")
      setError(error)
      toast.error("Erreur lors de l'export")
      throw error
    } finally {
      setIsExporting(false)
    }
  }

  return {
    exportMembers,
    isExporting,
    error,
  }
}
