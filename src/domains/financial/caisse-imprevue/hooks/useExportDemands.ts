/**
 * Hook pour exporter la liste des demandes en PDF ou Excel
 */

import { useState } from 'react'
import { DemandExportService, type ExportDemandsOptions } from '../services/DemandExportService'

const exportService = DemandExportService.getInstance()

export function useExportDemands() {
  const [isExporting, setIsExporting] = useState(false)

  const exportDemands = async (options: ExportDemandsOptions) => {
    setIsExporting(true)
    try {
      let blob: Blob

      if (options.format === 'pdf') {
        blob = await exportService.exportToPDF(options)
      } else {
        blob = await exportService.exportToExcel(options)
      }

      // Générer le nom de fichier
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '').replace('T', '_')
      const extension = options.format === 'pdf' ? 'pdf' : 'xlsx'
      const filename = `demandes_caisse_imprevue_${timestamp}.${extension}`

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
      console.error('Erreur lors de l\'export:', error)
      throw error
    } finally {
      setIsExporting(false)
    }
  }

  return {
    exportDemands,
    isExporting,
  }
}
