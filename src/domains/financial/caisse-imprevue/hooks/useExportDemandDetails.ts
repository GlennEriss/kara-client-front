/**
 * Hook pour exporter les détails d'une demande en PDF
 */

import { useState } from 'react'
import { DemandExportService } from '../services/DemandExportService'
import type { CaisseImprevueDemand } from '../entities/demand.types'

const exportService = DemandExportService.getInstance()

export function useExportDemandDetails() {
  const [isExporting, setIsExporting] = useState(false)

  const exportDetails = async (demand: CaisseImprevueDemand) => {
    setIsExporting(true)
    try {
      const blob = await exportService.exportDemandDetailsToPDF(demand)

      // Générer le nom de fichier
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '').replace('T', '_')
      const filename = `demande_${demand.id}_${timestamp}.pdf`

      // Télécharger
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      return { success: true, filename }
    } catch (error) {
      console.error('Erreur lors de l\'export des détails:', error)
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
