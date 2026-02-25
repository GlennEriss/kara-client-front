/**
 * Service d'export pour les Demandes Caisse Imprévue V2
 * 
 * Exporte les demandes en PDF ou Excel avec filtres avancés
 */

import { DemandCIRepository } from '../repositories/DemandCIRepository'
import type { CaisseImprevueDemand } from '../entities/demand.types'

export type ExportFormat = 'pdf' | 'excel'

export interface ExportDemandsOptions {
  format: ExportFormat
  scopeMode: 'all' | 'period' | 'quantity'
  dateStart?: string
  dateEnd?: string
  quantity?: number
  statusFilters?: Record<string, boolean>
  sortBy?: 'date_desc' | 'date_asc' | 'name_asc' | 'name_desc'
}

export interface ExportRow {
  Statut: string
  Nom: string
  Prénom: string
  Téléphone: string
  Montant: string
  Durée: string
  Fréquence: string
  'Date création': string
  Motif: string
}

export class DemandExportService {
  private static instance: DemandExportService
  private demandRepository: DemandCIRepository

  private constructor() {
    this.demandRepository = DemandCIRepository.getInstance()
  }

  static getInstance(): DemandExportService {
    if (!DemandExportService.instance) {
      DemandExportService.instance = new DemandExportService()
    }
    return DemandExportService.instance
  }

  /**
   * Récupère les demandes à exporter selon les options
   */
  async fetchDemandsForExport(options: ExportDemandsOptions): Promise<CaisseImprevueDemand[]> {
    const { scopeMode, dateStart, dateEnd, quantity, statusFilters, sortBy } = options

    let demands: CaisseImprevueDemand[] = []

    // Récupérer selon le périmètre
    if (scopeMode === 'all') {
      // Récupérer toutes les demandes
      let page = 1
      const pageSize = 100
      while (true) {
        const result = await this.demandRepository.getPaginated(
          {},
          { page, limit: pageSize },
          { sortBy: 'date', sortOrder: 'desc' }
        )
        if (!result.items || result.items.length === 0) break
        demands.push(...result.items)
        if (!result.pagination.hasNextPage) break
        page++
      }
    } else if (scopeMode === 'period') {
      // Récupérer par période
      let page = 1
      const pageSize = 100
      while (true) {
        const result = await this.demandRepository.getPaginated(
          { dateStart, dateEnd },
          { page, limit: pageSize },
          { sortBy: 'date', sortOrder: 'desc' }
        )
        if (!result.items || result.items.length === 0) break

        // Filtrer côté client par dates
        const filtered = result.items.filter((d) => {
          const createdAt = d.createdAt instanceof Date ? d.createdAt : new Date(d.createdAt)
          const start = dateStart ? new Date(dateStart) : null
          const end = dateEnd ? new Date(dateEnd) : null
          if (start && end) {
            end.setHours(23, 59, 59, 999)
            return createdAt >= start && createdAt <= end
          }
          return true
        })

        demands.push(...filtered)
        if (!result.pagination.hasNextPage) break
        page++
      }
    } else if (scopeMode === 'quantity') {
      // Récupérer N premières demandes
      let page = 1
      const pageSize = 100
      while (demands.length < (quantity || 100)) {
        const result = await this.demandRepository.getPaginated(
          {},
          { page, limit: pageSize },
          { sortBy: 'date', sortOrder: 'desc' }
        )
        if (!result.items || result.items.length === 0) break
        demands.push(...result.items)
        if (demands.length >= (quantity || 100)) break
        if (!result.pagination.hasNextPage) break
        page++
      }
      // Limiter à la quantité demandée
      demands = demands.slice(0, quantity || 100)
    }

    // Appliquer les filtres de statut
    if (statusFilters) {
      const activeFilters = Object.entries(statusFilters).filter(([_, checked]) => checked)
      if (activeFilters.length > 0) {
        demands = demands.filter((d) => {
          return activeFilters.some(([status]) => {
            return d.status === status.toUpperCase()
          })
        })
      }
    }

    // Trier
    if (sortBy) {
      demands.sort((a, b) => {
        if (sortBy === 'date_desc' || sortBy === 'date_asc') {
          const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt)
          const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt)
          return sortBy === 'date_desc'
            ? dateB.getTime() - dateA.getTime()
            : dateA.getTime() - dateB.getTime()
        } else {
          // Tri alphabétique
          const nameA = `${a.memberFirstName || ''} ${a.memberLastName || ''}`.toLowerCase()
          const nameB = `${b.memberFirstName || ''} ${b.memberLastName || ''}`.toLowerCase()
          return sortBy === 'name_asc'
            ? nameA.localeCompare(nameB, 'fr')
            : nameB.localeCompare(nameA, 'fr')
        }
      })
    }

    return demands
  }

  /**
   * Construit une ligne d'export à partir d'une demande
   */
  buildRow(demand: CaisseImprevueDemand): ExportRow {
    const statusLabels: Record<string, string> = {
      PENDING: 'En attente',
      APPROVED: 'Acceptée',
      REJECTED: 'Refusée',
      CONVERTED: 'Convertie',
      REOPENED: 'Réouverte',
    }

    const frequencyLabels: Record<string, string> = {
      DAILY: 'Quotidien',
      MONTHLY: 'Mensuel',
    }

    const createdAt = demand.createdAt instanceof Date
      ? demand.createdAt
      : new Date(demand.createdAt)

    return {
      Statut: statusLabels[demand.status] || demand.status,
      Nom: demand.memberLastName || '',
      Prénom: demand.memberFirstName || '',
      Téléphone: demand.memberPhone || demand.memberContacts?.[0] || '',
      Montant: `${demand.subscriptionCIAmountPerMonth.toLocaleString('fr-FR')} FCFA/${frequencyLabels[demand.paymentFrequency] || demand.paymentFrequency}`,
      Durée: `${demand.subscriptionCIDuration} mois`,
      Fréquence: frequencyLabels[demand.paymentFrequency] || demand.paymentFrequency,
      'Date création': createdAt.toLocaleDateString('fr-FR'),
      Motif: demand.cause || '',
    }
  }

  /**
   * Exporte les demandes en Excel
   */
  async exportToExcel(options: ExportDemandsOptions): Promise<Blob> {
    const XLSXModule = await import('xlsx')
    const XLSX = XLSXModule.default || XLSXModule

    const demands = await this.fetchDemandsForExport(options)
    const rows = demands.map((d) => this.buildRow(d))

    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Demandes')

    // Formater les colonnes
    const colWidths = [
      { wch: 12 }, // Statut
      { wch: 20 }, // Nom
      { wch: 20 }, // Prénom
      { wch: 15 }, // Téléphone
      { wch: 25 }, // Montant
      { wch: 10 }, // Durée
      { wch: 12 }, // Fréquence
      { wch: 15 }, // Date création
      { wch: 50 }, // Motif
    ]
    worksheet['!cols'] = colWidths

    // Générer le fichier
    const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
    return new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
  }

  /**
   * Exporte les demandes en PDF
   */
  async exportToPDF(options: ExportDemandsOptions): Promise<Blob> {
    const jsPDFModule = await import('jspdf')
    const jsPDF = jsPDFModule.jsPDF
    const autoTableModule = await import('jspdf-autotable')
    const autoTable = autoTableModule.default || autoTableModule

    const demands = await this.fetchDemandsForExport(options)
    const rows = demands.map((d) => this.buildRow(d))

    const doc = new jsPDF('portrait')

    // En-tête
    doc.setFontSize(16)
    doc.text('Liste des Demandes Caisse Imprévue', 14, 14)
    doc.setFontSize(10)
    doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 14, 20)

    if (rows.length === 0) {
      doc.text('Aucune demande à exporter', 14, 30)
      const buffer = doc.output('arraybuffer')
      return new Blob([buffer], { type: 'application/pdf' })
    }

    const headers = Object.keys(rows[0])
    const bodyRows = rows.map((row) => headers.map((h) => String(row[h as keyof ExportRow] || '')))

    autoTable(doc, {
      head: [headers],
      body: bodyRows,
      startY: 30,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [35, 77, 101], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      margin: { top: 30 },
    })

    const buffer = doc.output('arraybuffer')
    return new Blob([buffer], { type: 'application/pdf' })
  }

  /**
   * Exporte les détails d'une demande en PDF
   */
  async exportDemandDetailsToPDF(demand: CaisseImprevueDemand): Promise<Blob> {
    const jsPDFModule = await import('jspdf')
    const jsPDF = jsPDFModule.jsPDF
    const autoTableModule = await import('jspdf-autotable')
    const autoTable = autoTableModule.default || autoTableModule

    const doc = new jsPDF('portrait')

    // En-tête
    doc.setFontSize(16)
    doc.text('DÉTAILS DE LA DEMANDE CAISSE IMPRÉVUE', 20, 20)
    doc.setFontSize(12)
    doc.text(`Demande #${demand.id}`, 20, 28)

    let y = 40

    // Statut
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('STATUT', 20, y)
    y += 8
    doc.setFontSize(10)
    doc.text(`Statut : ${demand.status}`, 20, y)
    y += 6
    const createdAt = demand.createdAt instanceof Date ? demand.createdAt : new Date(demand.createdAt)
    doc.text(`Date de création : ${createdAt.toLocaleDateString('fr-FR')} à ${createdAt.toLocaleTimeString('fr-FR')}`, 20, y)
    y += 6
    doc.text(`Créée par : ${demand.createdBy}`, 20, y)
    y += 10

    // Informations demandeur
    doc.setFontSize(12)
    doc.text('👤 INFORMATIONS DU DEMANDEUR', 20, y)
    y += 8
    doc.setFontSize(10)
    doc.text(`Nom : ${demand.memberLastName}`, 20, y)
    y += 6
    doc.text(`Prénom : ${demand.memberFirstName}`, 20, y)
    y += 6
    doc.text(`Téléphone : ${demand.memberPhone || demand.memberContacts?.[0] || ''}`, 20, y)
    y += 6
    if (demand.memberEmail) {
      doc.text(`Email : ${demand.memberEmail}`, 20, y)
      y += 6
    }
    doc.text(`Matricule : ${demand.memberMatricule}`, 20, y)
    y += 10

    // Motif
    doc.setFontSize(12)
    doc.text('📝 MOTIF DE LA DEMANDE', 20, y)
    y += 8
    doc.setFontSize(10)
    const causeLines = doc.splitTextToSize(demand.cause || '', 170)
    doc.text(causeLines, 20, y)
    y += causeLines.length * 6 + 5

    // Forfait
    doc.setFontSize(12)
    doc.text('💰 FORFAIT SÉLECTIONNÉ', 20, y)
    y += 8
    doc.setFontSize(10)
    doc.text(`Forfait : ${demand.subscriptionCICode}`, 20, y)
    y += 6
    doc.text(`Montant : ${demand.subscriptionCIAmountPerMonth.toLocaleString('fr-FR')} FCFA/${demand.paymentFrequency === 'DAILY' ? 'jour' : 'mois'}`, 20, y)
    y += 6
    doc.text(`Durée : ${demand.subscriptionCIDuration} mois`, 20, y)
    y += 6
    doc.text(`Fréquence : ${demand.paymentFrequency === 'DAILY' ? 'Quotidien' : 'Mensuel'}`, 20, y)
    y += 6
    const desiredDate = new Date(demand.desiredStartDate)
    doc.text(`Date souhaitée : ${desiredDate.toLocaleDateString('fr-FR')}`, 20, y)
    y += 10

    // Contact d'urgence
    if (demand.emergencyContact) {
      doc.setFontSize(12)
      doc.text('📞 CONTACT D\'URGENCE', 20, y)
      y += 8
      doc.setFontSize(10)
      doc.text(`Nom : ${demand.emergencyContact.lastName}`, 20, y)
      y += 6
      if (demand.emergencyContact.firstName) {
        doc.text(`Prénom : ${demand.emergencyContact.firstName}`, 20, y)
        y += 6
      }
      doc.text(`Téléphone : ${demand.emergencyContact.phone1}`, 20, y)
      y += 6
      doc.text(`Lien : ${demand.emergencyContact.relationship}`, 20, y)
      y += 6
      doc.text(`Type pièce : ${demand.emergencyContact.typeId}`, 20, y)
      y += 6
      doc.text(`Numéro : ${demand.emergencyContact.idNumber}`, 20, y)
      y += 10
    }

    // Plan de remboursement
    const { DemandSimulationService } = await import('./DemandSimulationService')
    const simulationService = DemandSimulationService.getInstance()
    const schedule = simulationService.calculatePaymentSchedule(demand)

    doc.setFontSize(12)
    doc.text('💵 PLAN DE REMBOURSEMENT', 20, y)
    y += 8

    const tableData = schedule.items.map((item) => [
      item.monthIndex.toString(),
      item.date.toLocaleDateString('fr-FR'),
      `${item.amount.toLocaleString('fr-FR')} FCFA`,
      `${item.cumulative.toLocaleString('fr-FR')} FCFA`,
    ])

    // Ajouter la ligne total
    tableData.push([
      'Total',
      `${schedule.totalMonths} mois`,
      `${schedule.totalAmount.toLocaleString('fr-FR')} FCFA`,
      '',
    ])

    autoTable(doc, {
      head: [['Mois', 'Date', 'Montant', 'Cumulé']],
      body: tableData,
      startY: y,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [35, 77, 101], textColor: 255, fontStyle: 'bold' },
    })

    // Pied de page
    const pageHeight = doc.internal.pageSize.height
    doc.setFontSize(10)
    doc.text(
      `Document généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`,
      20,
      pageHeight - 20
    )
    doc.text('KARA - Caisse Imprévue', 20, pageHeight - 15)

    const buffer = doc.output('arraybuffer')
    return new Blob([buffer], { type: 'application/pdf' })
  }
}
