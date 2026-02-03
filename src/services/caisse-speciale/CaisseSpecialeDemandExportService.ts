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

    // En-tête
    doc.setFontSize(16)
    doc.text('DÉTAILS DE LA DEMANDE CAISSE SPÉCIALE', 20, 20)
    doc.setFontSize(12)
    doc.text(`Demande #${demand.id}`, 20, 28)

    let y = 40

    // Statut
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('STATUT', 20, y)
    y += 8
    doc.setFontSize(10)
    const statusLabels: Record<string, string> = {
      PENDING: 'En attente',
      APPROVED: 'Acceptée',
      REJECTED: 'Refusée',
      CONVERTED: 'Convertie',
    }
    doc.text(`Statut : ${statusLabels[demand.status] || demand.status}`, 20, y)
    y += 6
    const createdAt = demand.createdAt instanceof Date ? demand.createdAt : new Date(demand.createdAt)
    doc.text(
      `Date de création : ${createdAt.toLocaleDateString('fr-FR')} à ${createdAt.toLocaleTimeString('fr-FR')}`,
      20,
      y
    )
    y += 6
    doc.text(`Créée par : ${demand.createdBy}`, 20, y)
    y += 10

    // Informations du membre (via memberId)
    let memberName = '—'
    let memberMatricule = '—'
    let memberPhone = '—'
    let memberEmail = '—'
    if (demand.memberId) {
      const member = await this.memberRepository.getMemberById(demand.memberId)
      if (member) {
        memberName = `${member.lastName || ''} ${member.firstName || ''}`.trim() || '—'
        memberMatricule = member.matricule || '—'
        memberPhone = member.contacts?.[0] || '—'
        memberEmail = member.email || '—'
      }
    }

    doc.setFontSize(12)
    doc.text('👤 INFORMATIONS DU DEMANDEUR', 20, y)
    y += 8
    doc.setFontSize(10)
    doc.text(`Nom : ${memberName}`, 20, y)
    y += 6
    doc.text(`Matricule : ${memberMatricule}`, 20, y)
    y += 6
    doc.text(`Téléphone : ${memberPhone}`, 20, y)
    y += 6
    doc.text(`Email : ${memberEmail}`, 20, y)
    y += 10

    // Motif
    if (demand.cause) {
      doc.setFontSize(12)
      doc.text('📝 MOTIF DE LA DEMANDE', 20, y)
      y += 8
      doc.setFontSize(10)
      const causeLines = doc.splitTextToSize(demand.cause, 170)
      doc.text(causeLines, 20, y)
      y += causeLines.length * 6 + 10
    }

    // Informations générales
    doc.setFontSize(12)
    doc.text('💰 INFORMATIONS GÉNÉRALES', 20, y)
    y += 8
    doc.setFontSize(10)
    const caisseTypeLabels: Record<string, string> = {
      STANDARD: 'Standard',
      JOURNALIERE: 'Journalière',
      LIBRE: 'Libre',
      STANDARD_CHARITABLE: 'Standard Charitable',
      JOURNALIERE_CHARITABLE: 'Journalière Charitable',
      LIBRE_CHARITABLE: 'Libre Charitable',
    }
    doc.text(`Type de caisse : ${caisseTypeLabels[demand.caisseType] || demand.caisseType}`, 20, y)
    y += 6
    doc.text(`Montant mensuel : ${demand.monthlyAmount.toLocaleString('fr-FR')} FCFA`, 20, y)
    y += 6
    doc.text(`Durée prévue : ${demand.monthsPlanned} mois`, 20, y)
    y += 6
    doc.text(
      `Date souhaitée : ${new Date(demand.desiredDate).toLocaleDateString('fr-FR')}`,
      20,
      y
    )
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
      y += 10
    }

    // Tableau des versements
    const schedule = this.calculatePaymentSchedule(demand)

    doc.setFontSize(12)
    doc.text('💵 TABLEAU DES VERSEMENTS PRÉVUS', 20, y)
    y += 8

    const tableData = schedule.items.map((item) => [
      item.mois.toString(),
      item.date.toLocaleDateString('fr-FR'),
      `${item.montant.toLocaleString('fr-FR')} FCFA`,
      `${item.cumule.toLocaleString('fr-FR')} FCFA`,
    ])

    tableData.push([
      'Total',
      `${schedule.totalMonths} mois`,
      `${schedule.totalAmount.toLocaleString('fr-FR')} FCFA`,
      '',
    ])

    autoTable(doc, {
      head: [['Mois', 'Date', 'Montant FCFA', 'Cumulé']],
      body: tableData,
      startY: y,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [35, 77, 101], textColor: 255, fontStyle: 'bold' },
    })

    // Historique et traçabilité (position après le tableau)
    const lastTable = (doc as { lastAutoTable?: { finalY?: number } }).lastAutoTable
    const finalY = lastTable?.finalY ?? y + 50
    let traceY = finalY + 15

    doc.setFontSize(12)
    doc.text('📋 HISTORIQUE ET TRAÇABILITÉ', 20, traceY)
    traceY += 8
    doc.setFontSize(10)

    if (demand.approvedByName || demand.decisionMadeByName) {
      doc.text(
        `Accepté par : ${demand.approvedByName || demand.decisionMadeByName} le ${(demand.approvedAt || demand.decisionMadeAt) ? new Date(demand.approvedAt || demand.decisionMadeAt!).toLocaleDateString('fr-FR') : ''}`,
        20,
        traceY
      )
      traceY += 6
    }
    if (demand.rejectedByName || (demand.status === 'REJECTED' && demand.decisionMadeByName)) {
      doc.text(
        `Refusé par : ${demand.rejectedByName || demand.decisionMadeByName} le ${(demand.rejectedAt || demand.decisionMadeAt) ? new Date(demand.rejectedAt || demand.decisionMadeAt!).toLocaleDateString('fr-FR') : ''}`,
        20,
        traceY
      )
      traceY += 6
    }
    if (demand.reopenedByName) {
      doc.text(
        `Réouvert par : ${demand.reopenedByName} le ${demand.reopenedAt ? new Date(demand.reopenedAt).toLocaleDateString('fr-FR') : ''}`,
        20,
        traceY
      )
      traceY += 6
    }
    if (demand.convertedByName) {
      doc.text(
        `Converti par : ${demand.convertedByName} le ${demand.convertedAt ? new Date(demand.convertedAt).toLocaleDateString('fr-FR') : ''}`,
        20,
        traceY
      )
      traceY += 6
    }

    // Pied de page
    const pageHeight = doc.internal.pageSize.height
    doc.setFontSize(10)
    doc.text(
      `Document généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`,
      20,
      pageHeight - 20
    )
    doc.text('KARA - Caisse Spéciale', 20, pageHeight - 15)

    const buffer = doc.output('arraybuffer')
    return new Blob([buffer], { type: 'application/pdf' })
  }
}
