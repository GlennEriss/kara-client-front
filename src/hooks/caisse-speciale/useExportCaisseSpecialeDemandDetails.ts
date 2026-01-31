/**
 * Hook pour exporter les détails d'une demande Caisse Spéciale en PDF
 */

import { useState } from 'react'
import { CaisseSpecialeDemandExportService } from '@/services/caisse-speciale/CaisseSpecialeDemandExportService'
import type { CaisseSpecialeDemand } from '@/types/types'
import { toast } from 'sonner'

const exportService = CaisseSpecialeDemandExportService.getInstance()

export function useExportCaisseSpecialeDemandDetails() {
  const [isExporting, setIsExporting] = useState(false)

  const exportDetails = async (demand: CaisseSpecialeDemand) => {
    if (!demand) {
      toast.error('Impossible d\'exporter')
      return { success: false }
    }

    setIsExporting(true)
    try {
      const blob = await exportService.exportDemandDetailsToPDF(demand)

      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '').replace('T', '_')
      const filename = `demande_${demand.id}_${timestamp}.pdf`

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success('PDF généré avec succès')
      return { success: true, filename }
    } catch (error) {
      console.error('Erreur lors de l\'export des détails:', error)
      toast.error('Erreur lors de la génération du PDF')
      throw error
    } finally {
      setIsExporting(false)
    }
  }

  return {
    exportDetails,
    isExporting,
  }
}
