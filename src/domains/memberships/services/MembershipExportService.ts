/**
 * Service de domaine pour l'export des membres
 * 
 * Centralise la logique d'export CSV, Excel et PDF
 */

import type { UserFilters } from '@/types/types'
import type { MemberWithSubscription } from '@/db/member.db'
import { MembersRepositoryV2 } from '../repositories/MembersRepositoryV2'
import { getMembershipRequestById } from '@/db/membership.db'
import { getNationalityName } from '@/constantes/nationality'

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

      // Identity (fr)
      'Civilité': identity.civility ?? '',
      'Prénom': identity.firstName ?? member?.firstName ?? '',
      'Nom': identity.lastName ?? member?.lastName ?? '',
      'Date de naissance': identity.birthDate ?? '',
      'Lieu de naissance': identity.birthPlace ?? '',
      "Numéro d'acte de naissance": identity.birthCertificateNumber ?? '',
      'Lieu de prière': identity.prayerPlace ?? '',
      'Téléphones': contacts,
      'Email': identity.email ?? member?.email ?? '',
      'Sexe': identity.gender ?? member?.gender ?? '',
      'Nationalité': getNationalityName(identity.nationality ?? member?.nationality),
      'État civil': identity.maritalStatus ?? '',
      "Nom de l'épouse/époux": identity.spouseLastName ?? '',
      "Prénom de l'époux/épouse": identity.spouseFirstName ?? '',
      "Téléphone de l'époux/épouse": identity.spousePhone ?? '',
      'Code entremetteur': identity.intermediaryCode ?? '',
      'Possède un véhicule': String(identity.hasCar ?? member?.hasCar ?? ''),

      // Adresse (fr)
      'Province': address.province ?? member?.address?.province ?? '',
      'Ville': address.city ?? member?.address?.city ?? '',
      'Quartier': address.district ?? member?.address?.district ?? '',
      'Arrondissement': address.arrondissement ?? member?.address?.arrondissement ?? '',
      'Info additionnelle sur le lieu de résidence': address.additionalInfo ?? member?.address?.additionalInfo ?? '',

      // Entreprise (fr)
      'Entreprise': company.companyName ?? member?.companyName ?? '',
      'Province entreprise': company.companyAddress?.province ?? '',
      'Ville entreprise': company.companyAddress?.city ?? '',
      'Quartier entreprise': company.companyAddress?.district ?? '',
      'Profession': company.profession ?? member?.profession ?? '',
      'Expérience': company.seniority ?? '',

      // Pièce d'identité (fr)
      "Type de pièce d'identité": documents.identityDocument ?? '',
      "Numéro de la pièce d'identité": documents.identityDocumentNumber ?? '',
      "Date d'expiration de la pièce d'identité": documents.expirationDate ?? '',
      'Lieu de livraison de la pièce': documents.issuingPlace ?? '',
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
    const rows = await this.buildExportRows(options)
    
    const doc = new jsPDF('landscape')

    // En-tête
    doc.setFontSize(16)
    doc.text('Liste des Membres', 14, 14)
    doc.setFontSize(10)
    const vehicleFilterLabel =
      options.vehicleFilter === 'all'
        ? 'Tous les membres'
        : options.vehicleFilter === 'with'
        ? 'Membres avec véhicule'
        : 'Membres sans véhicule'
    doc.text(`Filtre: ${vehicleFilterLabel}`, 14, 20)
    doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 14, 24)

    // Préparer les en-têtes et les données
    if (rows.length === 0) {
      doc.text('Aucun membre à exporter', 14, 30)
      doc.save(`export_membres_${new Date().toISOString().slice(0, 10)}.pdf`)
      return
    }

    const headers = Object.keys(rows[0])
    const bodyRows = rows.map((row) => headers.map((h) => String(row[h] || '')))

    autoTable(doc, {
      head: [headers],
      body: bodyRows,
      startY: 30,
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [35, 77, 101], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      margin: { top: 30 },
    })

    const filename = `export_membres_${new Date().toISOString().slice(0, 10)}.pdf`
    doc.save(filename)
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
