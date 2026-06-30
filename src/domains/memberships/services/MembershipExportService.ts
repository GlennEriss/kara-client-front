/**
 * Service de domaine pour l'export des membres
 * 
 * Centralise la logique d'export CSV, Excel et PDF
 */

import { MEMBERSHIP_TYPE_LABELS, type UserFilters } from '@/types/types'
import type { MemberWithSubscription } from '@/db/member.db'
import { MembersRepositoryV2 } from '../repositories/MembersRepositoryV2'
import { getMembershipRequestById } from '@/db/membership.db'
import { getNationalityName } from '@/constantes/nationality'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export type SortOrder = 'A-Z' | 'Z-A'
export type QuantityMode = 'custom' | 'all'
export type VehicleFilter = 'all' | 'with' | 'without'
export type ExportFormat = 'csv' | 'excel' | 'pdf'

export interface ExportMembersOptions {
  filters: UserFilters
  format: ExportFormat
  sortOrder: SortOrder
  quantityMode: QuantityMode
  quantity?: number
  dateStart: Date
  dateEnd: Date
  vehicleFilter: VehicleFilter
}

export interface ExportRow {
  [key: string]: string | number
}

export class MembershipExportService {
  private static instance: MembershipExportService
  private membersRepository: MembersRepositoryV2

  private constructor() {
    this.membersRepository = MembersRepositoryV2.getInstance()
  }

  static getInstance(): MembershipExportService {
    if (!MembershipExportService.instance) {
      MembershipExportService.instance = new MembershipExportService()
    }
    return MembershipExportService.instance
  }

  /**
   * Vérifie si une date est dans une plage
   */
  private isWithinRange(date: Date, start: Date, end: Date): boolean {
    const time = date.getTime()
    const startTime = new Date(start).setHours(0, 0, 0, 0)
    const endTime = new Date(end).setHours(23, 59, 59, 999)
    return time >= startTime && time <= endTime
  }

  /**
   * Normalise une valeur de date (Date, Timestamp Firestore, string)
   */
  private normalizeDate(value: unknown): Date | null {
    if (!value) return null
    if (value instanceof Date) return value
    if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as any).toDate === 'function') {
      const resolved = (value as any).toDate()
      return resolved instanceof Date && !isNaN(resolved.getTime()) ? resolved : null
    }
    const parsed = new Date(value as any)
    return isNaN(parsed.getTime()) ? null : parsed
  }

  /**
   * Formate une date en français
   */
  private formatDate(value: unknown, pattern: string = 'dd/MM/yyyy'): string {
    const date = this.normalizeDate(value)
    if (!date) return '-'
    return format(date, pattern, { locale: fr })
  }

  /**
   * Charge une image publique en Data URL pour jsPDF
   */
  private async loadPublicImageAsDataUrl(
    imagePath: string
  ): Promise<{ dataUrl: string; width: number; height: number } | null> {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return null
    }

    try {
      const response = await fetch(imagePath)
      if (!response.ok) return null

      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)

      const image = await new Promise<HTMLImageElement | null>((resolve) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = () => resolve(null)
        img.src = objectUrl
      })

      URL.revokeObjectURL(objectUrl)
      if (!image) return null

      const width = image.naturalWidth || image.width
      const height = image.naturalHeight || image.height
      if (!width || !height) return null

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const context = canvas.getContext('2d')
      if (!context) return null

      context.drawImage(image, 0, 0)
      const dataUrl = canvas.toDataURL('image/png')
      if (!dataUrl?.startsWith('data:image')) return null

      return { dataUrl, width, height }
    } catch {
      return null
    }
  }

  /**
   * Label du filtre véhicule
   */
  private getVehicleFilterLabel(vehicleFilter: VehicleFilter): string {
    if (vehicleFilter === 'with') return 'Membres avec véhicule'
    if (vehicleFilter === 'without') return 'Membres sans véhicule'
    return 'Tous les membres'
  }

  /**
   * Déduit la civilité à partir du sexe (le fichier d'import n'a pas de colonne
   * civilité). MASCULIN/Homme/M → Monsieur ; FEMININ/Femme/F → Madame.
   */
  private deriveCivility(gender?: string | null): string {
    const g = (gender || '').trim().toLowerCase()
    if (!g) return ''
    if (g.startsWith('m') || g.includes('homme') || g === 'h') return 'Monsieur'
    if (g.startsWith('f') || g.includes('femme')) return 'Madame'
    return ''
  }

  /**
   * Label de statut d'abonnement
   */
  private getSubscriptionLabel(member: MemberWithSubscription): string {
    if (!member.lastSubscription) return 'Aucun'
    return member.isSubscriptionValid ? 'Valide' : 'Expiré'
  }

  /**
   * Récupère les membres à exporter avec pagination et filtres
   */
  async fetchMembersForExport(options: ExportMembersOptions): Promise<MemberWithSubscription[]> {
    const { filters, dateStart, dateEnd, quantityMode, quantity, vehicleFilter } = options

    // Construire les filtres de base avec filtre véhicule
    const baseFilters: UserFilters = {
      ...filters,
      ...(vehicleFilter === 'all' ? {} : { hasCar: vehicleFilter === 'with' }),
    }

    const targetCount = quantityMode === 'all' ? Infinity : Math.max(0, quantity || 0)
    const pageSize = 100
    let page = 1
    const collected: MemberWithSubscription[] = []

    // Boucle de pagination
    for (;;) {
      const result = await this.membersRepository.getAll(
        baseFilters,
        page,
        pageSize,
      )

      const batch = (result?.data || []) as MemberWithSubscription[]
      if (batch.length === 0) break

      // Filtrer par plage de dates côté client
      const filtered = batch.filter((m) => {
        const created = m.createdAt instanceof Date 
          ? m.createdAt 
          : new Date(m.createdAt as any)
        return this.isWithinRange(created, dateStart, dateEnd)
      })

      collected.push(...filtered)

      if (collected.length >= targetCount) break
      if (!result?.pagination?.hasNextPage) break
      page += 1
    }

    // Appliquer la limite si mode custom
    let toExport = collected
    if (quantityMode === 'custom' && Number.isFinite(targetCount)) {
      toExport = collected.slice(0, targetCount)
    }

    // Trier par ordre alphabétique
    toExport.sort((a, b) => {
      const an = `${a.lastName || ''} ${a.firstName || ''}`.trim().toLowerCase()
      const bn = `${b.lastName || ''} ${b.firstName || ''}`.trim().toLowerCase()
      if (an < bn) return options.sortOrder === 'A-Z' ? -1 : 1
      if (an > bn) return options.sortOrder === 'A-Z' ? 1 : -1
      return 0
    })

    return toExport
  }

  /**
   * Construit une ligne d'export à partir d'un membre et de son dossier
   */
  buildRow(member: MemberWithSubscription, dossier: any): ExportRow {
    const identity = dossier?.identity || {}
    const address = dossier?.address || {}
    const company = dossier?.company || {}
    const documents = dossier?.documents || {}

    const contacts = Array.isArray(identity.contacts)
      ? identity.contacts.join(' | ')
      : Array.isArray(member?.contacts)
      ? member.contacts.join(' | ')
      : ''

    // Paiements (si présents)
    const payments = Array.isArray(dossier?.payments) ? dossier.payments : []
    const paymentsCount = payments.length
    const paymentsTotal = payments.reduce((sum: number, p: any) => sum + (Number(p?.amount) || 0), 0)

    const toISO = (v: any): string => {
      try {
        if (!v) return ''
        const d = v?.toDate ? v.toDate() : v instanceof Date ? v : new Date(v)
        return isNaN(d.getTime()) ? '' : d.toISOString()
      } catch {
        return ''
      }
    }

    return {
      // Métadonnées (fr)
      Matricule: member?.matricule || member?.id || '',
      'Accepté par': dossier?.processedBy || dossier?.reviewedBy || '',
      'Adhéré le': toISO(member?.createdAt),
      'Modifié le': toISO(member?.updatedAt),
      'Demande soumise le': toISO(dossier?.createdAt),
      'Demande modifiée le': toISO(dossier?.updatedAt),

      // Identity (fr) — repli systématique sur le document membre (cas des imports
      // sans dossier complet : les données sont sur la fiche membre).
      'Civilité': identity.civility || this.deriveCivility(identity.gender ?? member?.gender),
      'Prénom': identity.firstName ?? member?.firstName ?? '',
      'Nom': identity.lastName ?? member?.lastName ?? '',
      'Date de naissance': identity.birthDate ?? member?.birthDate ?? '',
      'Lieu de naissance': identity.birthPlace ?? member?.birthPlace ?? '',
      "Numéro d'acte de naissance": identity.birthCertificateNumber ?? member?.birthCertificateNumber ?? '',
      'Lieu de prière': identity.prayerPlace ?? member?.prayerPlace ?? '',
      'Téléphones': contacts,
      'Email': identity.email ?? member?.email ?? '',
      'Sexe': identity.gender ?? member?.gender ?? '',
      'Nationalité': getNationalityName(identity.nationality ?? member?.nationality),
      'État civil': identity.maritalStatus ?? member?.maritalStatus ?? '',
      "Nom de l'épouse/époux": identity.spouseLastName ?? member?.partnerName ?? '',
      "Prénom de l'époux/épouse": identity.spouseFirstName ?? '',
      "Téléphone de l'époux/épouse": identity.spousePhone ?? member?.partnerPhone ?? '',
      'Code entremetteur': identity.intermediaryCode ?? member?.intermediaryCode ?? '',
      'Possède un véhicule': String(identity.hasCar ?? member?.hasCar ?? ''),

      // Adresse (fr)
      'Province': address.province ?? member?.address?.province ?? '',
      'Ville': address.city ?? member?.address?.city ?? '',
      'Quartier': address.district ?? member?.address?.district ?? '',
      'Arrondissement': address.arrondissement ?? member?.address?.arrondissement ?? '',
      'Info additionnelle sur le lieu de résidence': address.additionalInfo ?? member?.address?.additionalInfo ?? '',

      // Entreprise (fr)
      'Entreprise': company.companyName ?? member?.companyName ?? '',
      'Adresse entreprise': company.companyAddress
        ? [company.companyAddress.province, company.companyAddress.city, company.companyAddress.district]
            .filter(Boolean)
            .join(', ')
        : member?.companyAddress ?? '',
      'Province entreprise': company.companyAddress?.province ?? '',
      'Ville entreprise': company.companyAddress?.city ?? '',
      'Quartier entreprise': company.companyAddress?.district ?? '',
      'Profession': company.profession ?? member?.profession ?? '',
      'Expérience': company.seniority ?? member?.seniority ?? '',

      // Pièce d'identité (fr)
      "Type de pièce d'identité": documents.identityDocument ?? member?.identityDocument ?? '',
      "Numéro de la pièce d'identité": documents.identityDocumentNumber ?? member?.identityDocumentNumber ?? '',
      "Date d'expiration de la pièce d'identité": documents.expirationDate ?? member?.identityDocumentExpiration ?? '',
      'Lieu de livraison de la pièce': documents.issuingPlace ?? member?.identityDocumentIssuingPlace ?? '',
      "Date de délivraison de la pièce": documents.issuingDate ?? '',

      // Paiements
      'Nombre de paiements': paymentsCount,
      'Total des paiements': paymentsTotal,
    }
  }

  /**
   * Récupère les membres et construit les lignes d'export
   */
  async buildExportRows(options: ExportMembersOptions): Promise<ExportRow[]> {
    const members = await this.fetchMembersForExport(options)
    const rows: ExportRow[] = []

    for (const member of members) {
      try {
        const dossierId = (member as any).dossier
        const dossier = dossierId ? await getMembershipRequestById(dossierId) : null
        const row = this.buildRow(member, dossier)
        rows.push(row)
      } catch (error) {
        // En cas d'erreur, exporter quand même avec les données du membre
        const row = this.buildRow(member, null)
        rows.push(row)
      }
    }

    return rows
  }

  /**
   * Convertit des lignes en CSV
   */
  toCSV(rows: ExportRow[]): string {
    if (!rows.length) return ''
    const headers = Object.keys(rows[0])
    
    // Ajouter le BOM UTF-8 pour Excel
    const BOM = '\uFEFF'
    
    const escape = (val: any): string => {
      if (val == null) return ''
      const s = String(val).replace(/"/g, '""')
      return s.includes(';') || s.includes('\n') || s.includes('"') ? `"${s}"` : s
    }
    
    const lines = [headers.join(';')]
    for (const row of rows) {
      lines.push(headers.map((h) => escape(row[h])).join(';'))
    }
    
    return BOM + lines.join('\r\n')
  }

  /**
   * Exporte les membres en CSV
   */
  async exportMembersToCsv(options: ExportMembersOptions): Promise<Blob> {
    const rows = await this.buildExportRows(options)
    const csv = this.toCSV(rows)
    return new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  }

  /**
   * Exporte les membres en Excel
   */
  async exportMembersToExcel(options: ExportMembersOptions): Promise<void> {
    const XLSXModule = await import('xlsx')
    const XLSX = XLSXModule.default || XLSXModule
    const rows = await this.buildExportRows(options)
    
    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Membres')
    
    const filename = `export_membres_${new Date().toISOString().slice(0, 10)}.xlsx`
    XLSX.writeFile(workbook, filename)
  }

  /**
   * Exporte les membres en PDF
   */
  async exportMembersToPdf(options: ExportMembersOptions): Promise<void> {
    const jsPDFModule = await import('jspdf')
    const jsPDF = jsPDFModule.jsPDF
    const autoTableModule = await import('jspdf-autotable')
    const autoTable = autoTableModule.default || autoTableModule
    const members = await this.fetchMembersForExport(options)
    const logoAsset = await this.loadPublicImageAsDataUrl('/Logo-Kara.webp')

    const doc = new jsPDF('landscape', 'mm', 'a4')
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const marginX = 14
    const headerHeight = 30
    const logoCircleSize = 16
    const titleX = logoAsset ? marginX + logoCircleSize + 4 : marginX

    const colors = {
      brandDark: [35, 77, 101] as [number, number, number],
      accent: [203, 177, 113] as [number, number, number],
      ink: [15, 23, 42] as [number, number, number],
      muted: [100, 116, 139] as [number, number, number],
      line: [226, 232, 240] as [number, number, number],
      success: [22, 163, 74] as [number, number, number],
      danger: [220, 38, 38] as [number, number, number],
      warning: [217, 119, 6] as [number, number, number],
      info: [37, 99, 235] as [number, number, number],
    }

    const generatedAt = this.formatDate(new Date(), 'dd/MM/yyyy à HH:mm')
    const vehicleFilterLabel = this.getVehicleFilterLabel(options.vehicleFilter)
    const periodLabel = `Période: ${this.formatDate(options.dateStart)} au ${this.formatDate(options.dateEnd)}`

    const withVehicleCount = members.filter((member) => Boolean(member.hasCar)).length
    const withoutVehicleCount = members.length - withVehicleCount
    const validSubscriptionCount = members.filter((member) => Boolean(member.isSubscriptionValid)).length

    // En-tête principal
    doc.setFillColor(colors.brandDark[0], colors.brandDark[1], colors.brandDark[2])
    doc.rect(0, 0, pageWidth, headerHeight, 'F')
    doc.setDrawColor(colors.accent[0], colors.accent[1], colors.accent[2])
    doc.setLineWidth(1)
    doc.line(0, headerHeight, pageWidth, headerHeight)

    if (logoAsset) {
      const circleX = marginX
      const circleY = 6.5
      const circleRadius = logoCircleSize / 2
      const circleCenterX = circleX + circleRadius
      const circleCenterY = circleY + circleRadius

      doc.setFillColor(255, 255, 255)
      doc.circle(circleCenterX, circleCenterY, circleRadius, 'F')

      const padding = 2
      const maxLogoW = logoCircleSize - padding * 2
      const maxLogoH = logoCircleSize - padding * 2
      const ratio = logoAsset.width / logoAsset.height

      let drawW = maxLogoW
      let drawH = maxLogoH
      if (ratio >= 1) {
        drawH = maxLogoW / ratio
      } else {
        drawW = maxLogoH * ratio
      }

      const drawX = circleX + (logoCircleSize - drawW) / 2
      const drawY = circleY + (logoCircleSize - drawH) / 2
      doc.addImage(logoAsset.dataUrl, 'PNG', drawX, drawY, drawW, drawH)
    }

    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text('Liste des Membres', titleX, 16)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(periodLabel, titleX, 22)
    doc.text(`Filtre: ${vehicleFilterLabel} • Tri: ${options.sortOrder}`, titleX, 27)

    const badgeWidth = 92
    const badgeX = pageWidth - marginX - badgeWidth
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(badgeX, 6, badgeWidth, 13, 2, 2, 'F')
    doc.setTextColor(colors.brandDark[0], colors.brandDark[1], colors.brandDark[2])
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.text('Généré le', badgeX + 4, 11)
    doc.setFont('helvetica', 'normal')
    doc.text(generatedAt, badgeX + 4, 16)

    // Carte de synthèse
    const cardsY = 38
    const cardH = 17
    const cardGap = 4
    const cardW = (pageWidth - marginX * 2 - cardGap * 3) / 4
    const cards = [
      { label: 'Total membres', value: `${members.length}`, bg: [239, 246, 255] as [number, number, number], fg: colors.info },
      { label: 'Abonnements valides', value: `${validSubscriptionCount}`, bg: [236, 253, 245] as [number, number, number], fg: colors.success },
      { label: 'Avec véhicule', value: `${withVehicleCount}`, bg: [255, 247, 237] as [number, number, number], fg: colors.warning },
      { label: 'Sans véhicule', value: `${withoutVehicleCount}`, bg: [254, 242, 242] as [number, number, number], fg: colors.danger },
    ]

    cards.forEach((card, index) => {
      const x = marginX + index * (cardW + cardGap)
      doc.setFillColor(card.bg[0], card.bg[1], card.bg[2])
      doc.roundedRect(x, cardsY, cardW, cardH, 2, 2, 'F')

      doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2])
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.text(card.label, x + 3, cardsY + 6)

      doc.setTextColor(card.fg[0], card.fg[1], card.fg[2])
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.text(card.value, x + 3, cardsY + 13)
    })

    if (members.length === 0) {
      doc.setDrawColor(colors.line[0], colors.line[1], colors.line[2])
      doc.setFillColor(248, 250, 252)
      doc.roundedRect(marginX, cardsY + cardH + 8, pageWidth - marginX * 2, 25, 2, 2, 'FD')
      doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2])
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.text('Aucun membre à exporter avec les critères actuels.', marginX + 4, cardsY + cardH + 23)
    } else {
      const headers = ['Matricule', 'Nom complet', 'Type', 'Contact', 'Ville', 'Véhicule', 'Abonnement', 'Adhéré le']

      const bodyRows = members.map((member) => {
        const fullName = `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Sans nom'
        const firstPhone = Array.isArray(member.contacts) && member.contacts.length > 0 ? member.contacts[0] : ''
        const contact = firstPhone || member.email || '-'
        const city = member.address?.city || '-'
        const hasCarLabel = member.hasCar ? 'Oui' : 'Non'
        const subscription = this.getSubscriptionLabel(member)
        const createdAt = this.formatDate(member.createdAt)
        const memberType = MEMBERSHIP_TYPE_LABELS[member.membershipType] || member.membershipType || '-'

        return [
          member.matricule || member.id || '-',
          fullName,
          memberType,
          contact,
          city,
          hasCarLabel,
          subscription,
          createdAt,
        ]
      })

      autoTable(doc, {
        head: [headers],
        body: bodyRows,
        startY: cardsY + cardH + 10,
        margin: { left: marginX, right: marginX, top: 20, bottom: 16 },
        styles: {
          fontSize: 8,
          cellPadding: 2.4,
          textColor: colors.ink,
          lineColor: colors.line,
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: colors.brandDark,
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 8.5,
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { cellWidth: 38 },
          1: { cellWidth: 54 },
          2: { cellWidth: 28 },
          3: { cellWidth: 46 },
          4: { cellWidth: 28 },
          5: { cellWidth: 20, halign: 'center' },
          6: { cellWidth: 25, halign: 'center' },
          7: { cellWidth: 30, halign: 'center' },
        },
        didParseCell: (data: any) => {
          if (data.section !== 'body') return

          const member = members[data.row.index]
          if (!member) return

          if (data.column.index === 2) {
            data.cell.styles.fontStyle = 'bold'
            if (member.membershipType === 'adherant') data.cell.styles.textColor = colors.info
            else if (member.membershipType === 'bienfaiteur') data.cell.styles.textColor = colors.warning
            else data.cell.styles.textColor = colors.success
          }

          if (data.column.index === 5) {
            data.cell.styles.fontStyle = 'bold'
            data.cell.styles.textColor = member.hasCar ? colors.success : colors.danger
          }

          if (data.column.index === 6) {
            data.cell.styles.fontStyle = 'bold'
            const subscription = this.getSubscriptionLabel(member)
            if (subscription === 'Valide') data.cell.styles.textColor = colors.success
            else if (subscription === 'Expiré') data.cell.styles.textColor = colors.warning
            else data.cell.styles.textColor = colors.muted
          }
        },
        didDrawPage: (data: any) => {
          if (data.pageNumber <= 1) return

          doc.setFillColor(colors.brandDark[0], colors.brandDark[1], colors.brandDark[2])
          doc.rect(0, 0, pageWidth, 10, 'F')
          doc.setTextColor(255, 255, 255)
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(8.5)
          doc.text('Liste des Membres', marginX, 6.4)
        },
      })
    }

    // Pied de page avec pagination
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setDrawColor(colors.line[0], colors.line[1], colors.line[2])
      doc.setLineWidth(0.2)
      doc.line(marginX, pageHeight - 14, pageWidth - marginX, pageHeight - 14)

      doc.setFontSize(8)
      doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2])
      doc.text('Liste des Membres', marginX, pageHeight - 8)
      doc.text(`Page ${i} / ${pageCount}`, pageWidth / 2, pageHeight - 8, { align: 'center' })

      if (logoAsset) {
        const circleSize = 5.8
        const circleX = pageWidth - marginX - circleSize
        const circleY = pageHeight - 12.2
        const circleRadius = circleSize / 2
        const circleCenterX = circleX + circleRadius
        const circleCenterY = circleY + circleRadius

        doc.setFillColor(255, 255, 255)
        doc.circle(circleCenterX, circleCenterY, circleRadius, 'F')

        const padding = 0.8
        const maxLogoW = circleSize - padding * 2
        const maxLogoH = circleSize - padding * 2
        const ratio = logoAsset.width / logoAsset.height
        let drawW = maxLogoW
        let drawH = maxLogoH

        if (ratio >= 1) {
          drawH = maxLogoW / ratio
        } else {
          drawW = maxLogoH * ratio
        }

        const drawX = circleX + (circleSize - drawW) / 2
        const drawY = circleY + (circleSize - drawH) / 2
        doc.addImage(logoAsset.dataUrl, 'PNG', drawX, drawY, drawW, drawH)
      } else {
        doc.text('KARA', pageWidth - marginX, pageHeight - 8, { align: 'right' })
      }
    }

    doc.save(`export_membres_${format(new Date(), 'yyyy-MM-dd', { locale: fr })}.pdf`)
  }

  /**
   * Exporte les membres selon le format choisi
   */
  async exportMembers(options: ExportMembersOptions): Promise<Blob | void> {
    switch (options.format) {
      case 'csv':
        return this.exportMembersToCsv(options)
      case 'excel':
        return this.exportMembersToExcel(options)
      case 'pdf':
        return this.exportMembersToPdf(options)
      default:
        throw new Error(`Format d'export non supporté: ${options.format}`)
    }
  }
}
