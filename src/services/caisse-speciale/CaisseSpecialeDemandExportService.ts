/**
 * Service d'export des détails de demande Caisse Spéciale en PDF
 * Référence : Caisse Imprévue DemandExportService
 */

import type { CaisseSpecialeDemand } from '@/types/types'
import { IMemberRepository } from '@/repositories/members/IMemberRepository'
import { RepositoryFactory } from '@/factories/RepositoryFactory'

export interface PaymentScheduleItem {
  mois: number
  date: Date
  montant: number
  cumule: number
}

export interface PaymentSchedule {
  items: PaymentScheduleItem[]
  totalAmount: number
  totalMonths: number
}

export class CaisseSpecialeDemandExportService {
  private static instance: CaisseSpecialeDemandExportService
  private memberRepository: IMemberRepository

  private constructor() {
    this.memberRepository = RepositoryFactory.getMemberRepository()
  }

  static getInstance(): CaisseSpecialeDemandExportService {
    if (!CaisseSpecialeDemandExportService.instance) {
      CaisseSpecialeDemandExportService.instance = new CaisseSpecialeDemandExportService()
    }
    return CaisseSpecialeDemandExportService.instance
  }

  /**
   * Calcule le tableau des versements prévus
   */
  calculatePaymentSchedule(demand: CaisseSpecialeDemand): PaymentSchedule {
    const startDate = new Date(demand.desiredDate)
    const items: PaymentScheduleItem[] = []
    let cumule = 0

    for (let i = 0; i < demand.monthsPlanned; i++) {
      const d = new Date(startDate)
      d.setMonth(d.getMonth() + i)
      cumule += demand.monthlyAmount
      items.push({
        mois: i + 1,
        date: d,
        montant: demand.monthlyAmount,
        cumule,
      })
    }

    return {
      items,
      totalAmount: cumule,
      totalMonths: demand.monthsPlanned,
    }
  }

  /**
   * Exporte les détails d'une demande en PDF
   */
  async exportDemandDetailsToPDF(demand: CaisseSpecialeDemand): Promise<Blob> {
    const jsPDFModule = await import('jspdf')
    const jsPDF = jsPDFModule.jsPDF
    const autoTableModule = await import('jspdf-autotable')
    const autoTable = autoTableModule.default || autoTableModule

    const doc = new jsPDF('portrait')
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = { left: 16, right: 16, top: 16 }
    const contentWidth = pageWidth - margin.left - margin.right
    const contentBottomY = pageHeight - 22
    const generatedAt = new Date()

    const normalizeDate = (value?: Date | string | { toDate: () => Date }): Date | null => {
      if (!value) return null
      if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
      if (typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
        const converted = value.toDate()
        return Number.isNaN(converted.getTime()) ? null : converted
      }
      if (typeof value === 'string') {
        const converted = new Date(value)
        return Number.isNaN(converted.getTime()) ? null : converted
      }
      return null
    }

    const formatDate = (value?: Date | string | { toDate: () => Date }): string => {
      const date = normalizeDate(value)
      return date ? date.toLocaleDateString('fr-FR') : '—'
    }

    const formatDateTime = (value?: Date | string | { toDate: () => Date }): string => {
      const date = normalizeDate(value)
      return date ? `${date.toLocaleDateString('fr-FR')} à ${date.toLocaleTimeString('fr-FR')}` : '—'
    }

    const formatNumber = (value?: number): string => {
      if (typeof value !== 'number' || Number.isNaN(value)) return '—'
      const rounded = Math.round(value)
      const sign = rounded < 0 ? '-' : ''
      const digits = Math.abs(rounded).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
      return `${sign}${digits}`
    }

    const formatAmount = (amount?: number, withCurrency = true): string => {
      const number = formatNumber(amount)
      if (number === '—') return number
      return withCurrency ? `${number} FCFA` : number
    }

    const safeValue = (value: unknown): string => {
      if (value === null || value === undefined) return '—'
      const normalized = String(value).trim()
      return normalized || '—'
    }

    let y = margin.top

    const drawMainHeader = () => {
      doc.setFillColor(35, 77, 101)
      doc.rect(0, 0, pageWidth, 30, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFont('times', 'bold')
      doc.setFontSize(13.5)
      doc.text('DÉTAILS DE LA DEMANDE CAISSE SPÉCIALE', margin.left, 14)
      doc.setFont('times', 'normal')
      doc.setFontSize(10)
      doc.text(`Référence: ${demand.id}`, margin.left, 22)
      y = 36
      doc.setTextColor(30, 41, 59)
      doc.setFont('times', 'normal')
      doc.setFontSize(9.5)
    }

    const drawContinuationHeader = () => {
      doc.setFillColor(248, 250, 252)
      doc.rect(0, 0, pageWidth, 15, 'F')
      doc.setDrawColor(226, 232, 240)
      doc.setLineWidth(0.2)
      doc.line(0, 15, pageWidth, 15)
      doc.setFont('times', 'normal')
      doc.setTextColor(71, 85, 105)
      doc.setFontSize(9)
      doc.text(`Demande ${demand.id}`, margin.left, 9.5)
      y = 23
      doc.setTextColor(30, 41, 59)
      doc.setFontSize(9.5)
    }

    const startNewPage = () => {
      doc.addPage()
      drawContinuationHeader()
    }

    const ensureSpace = (requiredHeight: number) => {
      if (y + requiredHeight > contentBottomY) {
        startNewPage()
      }
    }

    const addSectionTitle = (title: string) => {
      ensureSpace(10)
      doc.setFillColor(241, 245, 249)
      doc.roundedRect(margin.left, y - 5, contentWidth, 8, 1.4, 1.4, 'F')
      doc.setTextColor(35, 77, 101)
      doc.setFont('times', 'bold')
      doc.setFontSize(10.5)
      doc.text(title, margin.left + 3, y)
      y += 8
      doc.setTextColor(30, 41, 59)
      doc.setFont('times', 'normal')
      doc.setFontSize(9.5)
    }

    const addField = (label: string, value: unknown) => {
      const lines = doc.splitTextToSize(`${label}: ${safeValue(value)}`, contentWidth) as string[]
      const blockHeight = Math.max(lines.length, 1) * 4.8 + 0.8
      ensureSpace(blockHeight)
      doc.text(lines, margin.left, y)
      y += blockHeight
    }

    const addParagraph = (text: string) => {
      const lines = doc.splitTextToSize(text, contentWidth) as string[]
      const blockHeight = Math.max(lines.length, 1) * 4.8 + 0.8
      ensureSpace(blockHeight)
      doc.text(lines, margin.left, y)
      y += blockHeight
    }

    const buildActorLine = (
      actor: string | undefined,
      date: Date | string | { toDate: () => Date } | undefined
    ) => {
      if (!actor && !date) return '—'
      if (!actor) return formatDateTime(date)
      if (!date) return actor
      return `${actor} (${formatDateTime(date)})`
    }

    const statusLabels: Record<string, string> = {
      PENDING: 'En attente',
      APPROVED: 'Acceptée',
      REJECTED: 'Refusée',
      CONVERTED: 'Convertie',
    }

    const caisseTypeLabels: Record<string, string> = {
      STANDARD: 'Standard',
      JOURNALIERE: 'Journalière',
      LIBRE: 'Libre',
      STANDARD_CHARITABLE: 'Standard Charitable',
      JOURNALIERE_CHARITABLE: 'Journalière Charitable',
      LIBRE_CHARITABLE: 'Libre Charitable',
    }

    // Informations du membre (via memberId)
    let memberName = '—'
    let memberMatricule = '—'
    let memberPhone = '—'
    if (demand.memberId) {
      try {
        const member = await this.memberRepository.getMemberById(demand.memberId)
        if (member) {
          memberName = `${member.lastName || ''} ${member.firstName || ''}`.trim() || '—'
          memberMatricule = member.matricule || '—'
          const primaryContact = Array.isArray(member.contacts) ? member.contacts[0] : member.contacts
          memberPhone = primaryContact ? String(primaryContact) : '—'
        }
      } catch (error) {
        console.error('Impossible de récupérer le membre pour export PDF:', error)
      }
    }

    drawMainHeader()

    addSectionTitle('RÉSUMÉ DE LA DEMANDE')
    addField('Statut', statusLabels[demand.status] || demand.status)
    addField('Date de création', formatDateTime(demand.createdAt))
    addField('Type de caisse', caisseTypeLabels[demand.caisseType] || demand.caisseType)
    addField('Montant mensuel', formatAmount(demand.monthlyAmount))
    addField('Durée prévue', `${safeValue(demand.monthsPlanned)} mois`)
    addField('Date souhaitée', formatDate(demand.desiredDate))
    if (demand.contractType === 'GROUP') addField('Type de contrat', 'Groupe')

    y += 2
    addSectionTitle('DEMANDEUR')
    addField('Nom complet', memberName)
    addField('Matricule', memberMatricule)
    addField('Téléphone', memberPhone)

    y += 2
    addSectionTitle('MOTIF')
    addParagraph(demand.cause?.trim() || 'Aucun motif renseigné.')

    const emergencyContact = demand.emergencyContact as
      | (NonNullable<CaisseSpecialeDemand['emergencyContact']> & {
          phone2?: string
          typeId?: string
          idNumber?: string
        })
      | undefined

    if (emergencyContact) {
      y += 2
      addSectionTitle('CONTACT D\'URGENCE')
      const contactName = [emergencyContact.lastName, emergencyContact.firstName].filter(Boolean).join(' ')
      addField('Nom complet', contactName || '—')
      addField('Téléphone principal', emergencyContact.phone1)
      if (emergencyContact.phone2) {
        addField('Téléphone secondaire', emergencyContact.phone2)
      }
      addField('Lien', emergencyContact.relationship)
      if (emergencyContact.typeId) {
        addField('Type de pièce', emergencyContact.typeId)
      }
      if (emergencyContact.idNumber) {
        addField('Numéro de pièce', emergencyContact.idNumber)
      }
    }

    const schedule = this.calculatePaymentSchedule(demand)
    const tableData = schedule.items.map((item) => [
      item.mois.toString(),
      item.date.toLocaleDateString('fr-FR'),
      formatAmount(item.montant, false),
      formatAmount(item.cumule, false),
    ])
    tableData.push(['Total', `${schedule.totalMonths} mois`, formatAmount(schedule.totalAmount, false), ''])

    y += 2
    addSectionTitle('TABLEAU DES VERSEMENTS PRÉVUS')

    autoTable(doc, {
      head: [['Mois', 'Date', 'Montant FCFA', 'Cumulé FCFA']],
      body: tableData,
      startY: y,
      margin: { left: margin.left, right: margin.right, bottom: 22 },
      styles: { font: 'times', fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [35, 77, 101], textColor: 255, font: 'times', fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { halign: 'center', cellWidth: 18 },
        1: { halign: 'center', cellWidth: 34 },
        2: { halign: 'right', cellWidth: 52 },
        3: { halign: 'right' },
      },
      didParseCell: (data: { section: string; row: { index: number }; cell: { styles: { fontStyle?: string } } }) => {
        if (data.section === 'body' && data.row.index === tableData.length - 1) {
          data.cell.styles.fontStyle = 'bold'
        }
      },
    })

    const lastTable = (doc as { lastAutoTable?: { finalY?: number } }).lastAutoTable
    y = (lastTable?.finalY ?? y) + 8
    if (y > contentBottomY) {
      startNewPage()
    }

    addSectionTitle('HISTORIQUE ET TRAÇABILITÉ')

    const approvedActor = demand.approvedByName || (demand.status !== 'REJECTED' ? demand.decisionMadeByName : undefined)
    const approvedDate = demand.approvedAt || (demand.status !== 'REJECTED' ? demand.decisionMadeAt : undefined)
    const rejectedActor = demand.rejectedByName || (demand.status === 'REJECTED' ? demand.decisionMadeByName : undefined)
    const rejectedDate = demand.rejectedAt || (demand.status === 'REJECTED' ? demand.decisionMadeAt : undefined)

    const historyEntries: Array<{ label: string; value: string }> = []
    if (approvedActor || approvedDate) {
      historyEntries.push({
        label: 'Acceptée par',
        value: buildActorLine(approvedActor, approvedDate),
      })
    }
    if (demand.approveReason) {
      historyEntries.push({
        label: 'Motif d\'acceptation',
        value: demand.approveReason,
      })
    }
    if (rejectedActor || rejectedDate) {
      historyEntries.push({
        label: 'Refusée par',
        value: buildActorLine(rejectedActor, rejectedDate),
      })
    }
    if (demand.rejectReason || (demand.status === 'REJECTED' ? demand.decisionReason : undefined)) {
      historyEntries.push({
        label: 'Motif de refus',
        value: demand.rejectReason || demand.decisionReason || '—',
      })
    }
    if (demand.reopenedByName || demand.reopenedAt) {
      historyEntries.push({
        label: 'Réouverte par',
        value: buildActorLine(demand.reopenedByName, demand.reopenedAt),
      })
    }
    if (demand.reopenReason) {
      historyEntries.push({
        label: 'Motif de réouverture',
        value: demand.reopenReason,
      })
    }
    if (demand.convertedByName || demand.convertedAt) {
      historyEntries.push({
        label: 'Convertie par',
        value: buildActorLine(demand.convertedByName, demand.convertedAt),
      })
    }
    if (demand.contractId) {
      historyEntries.push({
        label: 'Contrat créé',
        value: demand.contractId,
      })
    }

    if (historyEntries.length === 0) {
      addField('Informations', 'Aucune action complémentaire enregistrée pour cette demande.')
    } else {
      historyEntries.forEach((entry) => {
        addField(entry.label, entry.value)
      })
    }

    const generatedLabel = `Généré le ${formatDateTime(generatedAt)}`
    const pageCount = doc.getNumberOfPages()
    for (let page = 1; page <= pageCount; page++) {
      doc.setPage(page)
      doc.setDrawColor(226, 232, 240)
      doc.setLineWidth(0.2)
      doc.line(margin.left, pageHeight - 14, pageWidth - margin.right, pageHeight - 14)

      doc.setFont('times', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(100, 116, 139)
      doc.text('KARA - Caisse Spéciale', margin.left, pageHeight - 8)
      doc.text(`Page ${page}/${pageCount}`, pageWidth / 2, pageHeight - 8, { align: 'center' })
      doc.text(generatedLabel, pageWidth - margin.right, pageHeight - 8, { align: 'right' })
    }

    const buffer = doc.output('arraybuffer')
    return new Blob([buffer], { type: 'application/pdf' })
  }
}
