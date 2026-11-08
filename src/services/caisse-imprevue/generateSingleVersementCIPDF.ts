import { getCIRecordedVersements, getMemberQuarterForPdf } from '@/utils/versement-history'
import { drawPdfHistoryTable } from '@/utils/pdf-history-table'
/**
 * Génère le PDF "single versement" (format historique versement CI) : pages 1 et 2 + bloc VERSEMENT.
 * Utilisé par la page versements (bouton PDF) et par le modal facture (Télécharger en PDF).
 */
import { addMonths, format, parseISO } from 'date-fns'
import { getMonthPeriod } from '@/utils/caisse-imprevue-utils'
import type { ContractCI, PaymentCI, VersementCI, User } from '@/types/types'
import { CONTRACT_CI_STATUS_LABELS } from '@/types/types'

const formatAmountForPDF = (n: number): string =>
  Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

export type GenerateSingleVersementCIPDFOptions = {
  contractId: string
  member?: User | null
  getAdminDisplayName: (adminId: string | undefined) => string
}

async function loadLogoDataUrl(): Promise<{ dataUrl: string; width: number; height: number } | null> {
  try {
    const response = await fetch('/assets/caisse-imprevue/image1.png')
    if (!response.ok) return null
    const blob = await response.blob()
    const dataUrl = await new Promise<string | null>((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null)
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(blob)
    })
    if (!dataUrl) return null
    const dimensions = await new Promise<{ width: number; height: number } | null>((resolve) => {
      const img = new window.Image()
      img.onload = () =>
        img.naturalWidth && img.naturalHeight ? resolve({ width: img.naturalWidth, height: img.naturalHeight }) : resolve(null)
      img.onerror = () => resolve(null)
      img.src = dataUrl
    })
    if (!dimensions) return null
    return { dataUrl, width: dimensions.width, height: dimensions.height }
  } catch {
    return null
  }
}

export async function generateSingleVersementCIPDF(
  contract: ContractCI,
  payment: PaymentCI,
  options: GenerateSingleVersementCIPDFOptions
): Promise<void> {
  const { contractId, member, getAdminDisplayName } = options
  if (!getCIRecordedVersements(payment).length) throw new Error('Aucun versement enregistré pour cette échéance')
  const logoDataUrl = await loadLogoDataUrl()
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF('l', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const marginX = 14
  const contentWidth = pageWidth - marginX * 2
  const colors = {
    navy: [21, 62, 96] as [number, number, number],
    line: [24, 24, 24] as [number, number, number],
    headerFill: [236, 242, 248] as [number, number, number],
    pageFill: [247, 249, 252] as [number, number, number],
  }

  const toDateSafe = (value: unknown): Date | null => {
    if (!value) return null
    if (value instanceof Date) return value
    if (typeof (value as any)?.toDate === 'function') return (value as any).toDate()
    if (typeof value === 'string') {
      const parsedIso = parseISO(value)
      if (!Number.isNaN(parsedIso.getTime())) return parsedIso
    }
    const parsed = new Date(value as any)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  const formatLongDate = (value: unknown): string => {
    const date = toDateSafe(value)
    if (!date) return '-'
    return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  }

  /**
   * Moyen de paiement sur 1 ou 2 lignes : le qualificatif passe en dessous pour
   * ne plus déborder de la colonne MOYEN /TRANS.
   */
  const formatMode = (mode?: string, versement?: VersementCI): string | string[] => {
    if (mode === 'other' && versement?.paymentMethodOther?.trim()) {
      return ['AUTRE', `(${versement.paymentMethodOther.trim().toUpperCase()})`]
    }

    const modeMap: Record<string, string> = {
      airtel_money: 'AIRTEL-MONEY',
      mobicash: 'MOBICASH',
      cash: 'CASH',
      bank_transfer: 'VIREMENT',
      other: 'AUTRE',
    }
    const base = mode ? modeMap[mode] || String(mode).toUpperCase() : '-'

    if ((mode === 'airtel_money' || mode === 'mobicash') && versement?.withFees !== undefined) {
      return [base, versement.withFees ? '(AVEC FRAIS)' : '(SANS FRAIS)']
    }

    return base
  }



  const getAge = (birthDate?: string): string => {
    if (!birthDate) return '-'
    const birth = toDateSafe(birthDate)
    if (!birth) return '-'
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age -= 1
    return age > 0 ? `${age} ANS` : '-'
  }

  const getPaymentDueAt = (p: PaymentCI): Date | null => {
    const first = toDateSafe(contract.firstPaymentDate)
    return first ? addMonths(first, p.monthIndex) : null
  }

  const getAdminNameForExport = (adminId?: string) => {
    const label = getAdminDisplayName(adminId)
    if (!label || label === 'Chargement...') return adminId || '-'
    return label
  }

  const formatShortDate = (value: unknown): string => {
    const date = toDateSafe(value)
    if (!date) return '-'
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  const isQuotidien = contract.paymentFrequency !== 'MONTHLY'

  /**
   * Bornes d'une échéance quotidienne, déléguées à `getMonthPeriod` — la même
   * référence que le calendrier du contrat et que l'export PDF global. Une
   * période vaut 30 jours pleins, pas un mois calendaire.
   */
  const getQuotidienPeriodBounds = (p: PaymentCI): { start: Date; end: Date } | null => {
    if (!contract.firstPaymentDate) return null
    const { startDate, endDate } = getMonthPeriod(p.monthIndex, contract.firstPaymentDate)
    return { start: startDate, end: endDate }
  }

  const memberLastName = member?.lastName || contract.memberLastName || 'INCONNU'
  const memberFirstName = member?.firstName || contract.memberFirstName || 'INCONNU'
  const memberMatricule = member?.matricule || contract.memberId || contract.id || '-'
  const memberBirthPlace = member?.birthPlace || (contract as any).memberBirthPlace || '-'
  const memberBirthDate = formatLongDate(member?.birthDate || contract.memberBirthDate)
  const memberNationality = member?.nationality || contract.memberNationality || '-'
  const memberIdDocument = member?.identityDocumentNumber || (contract as any).memberIdentityDocumentNumber || '-'
  const memberPhone1 = member?.contacts?.[0] || contract.memberContacts?.[0] || '-'
  const memberPhone2 = member?.contacts?.[1] || contract.memberContacts?.[1] || '-'
  const memberGender = (member?.gender || contract.memberGender) ? String(member?.gender || contract.memberGender).toUpperCase() : '-'
  const memberAge = getAge(member?.birthDate || contract.memberBirthDate)
  const memberQuarter = getMemberQuarterForPdf(member)
  const memberProfession = member?.profession || contract.memberProfession || '-'

  const emergencyContactName = contract.emergencyContact
    ? `${contract.emergencyContact.lastName || ''} ${contract.emergencyContact.firstName || ''}`.trim() || 'INCONNU'
    : 'INCONNU'
  const emergencyRelation = contract.emergencyContact?.relationship || '-'
  const emergencyPhone1 = contract.emergencyContact?.phone1 || '-'
  const emergencyPhone2 = contract.emergencyContact?.phone2 || '-'
  const emergencyId = contract.emergencyContact?.idNumber || '-'

  const firstPaidDateForPayment =
    payment.versements?.length && payment.versements[0]?.date
      ? toDateSafe(payment.versements[0].date)
      : null






  const endDate = (() => {
    const duration = contract.subscriptionCIDuration || 0
    // Quotidien : fin de la dernière période de 30 jours.
    if (isQuotidien) {
      return duration > 0 && contract.firstPaymentDate
        ? getMonthPeriod(duration - 1, contract.firstPaymentDate).endDate
        : null
    }
    const start = toDateSafe(contract.firstPaymentDate)
    if (!start) return null
    return addMonths(start, duration)
  })()

  const drawPageBackground = () => {
    doc.setFillColor(...colors.pageFill)
    doc.rect(0, 0, pageWidth, pageHeight, 'F')
    doc.setDrawColor(...colors.navy)
    doc.setLineWidth(0.7)
    doc.rect(8, 8, pageWidth - 16, pageHeight - 16)
  }

  const drawMainTitle = (showLogo = false) => {
    if (showLogo && logoDataUrl) {
      const maxLogoWidth = 34
      const maxLogoHeight = 18
      const ratio = logoDataUrl.width / logoDataUrl.height
      let logoWidth = maxLogoWidth
      let logoHeight = logoWidth / ratio
      if (logoHeight > maxLogoHeight) {
        logoHeight = maxLogoHeight
        logoWidth = logoHeight * ratio
      }
      const logoY = 10 + (maxLogoHeight - logoHeight) / 2
      doc.addImage(logoDataUrl.dataUrl, 'PNG', marginX, logoY, logoWidth, logoHeight)
    }
    doc.setFont('times', 'bold')
    doc.setFontSize(15)
    doc.setTextColor(...colors.navy)
    doc.text('HISTORIQUE VERSEMENT CAISSE IMPREVUE', pageWidth / 2, 18, { align: 'center' })
    doc.setFontSize(10)
    doc.setTextColor(45, 45, 45)
    doc.text(`Contrat : ${contract.id || contractId}`, pageWidth / 2, 23, { align: 'center' })
  }

  const drawSectionTitle = (title: string, y: number) => {
    doc.setFillColor(...colors.headerFill)
    doc.setDrawColor(...colors.line)
    doc.setLineWidth(0.2)
    doc.rect(marginX, y, contentWidth, 8, 'FD')
    doc.setFont('times', 'bold')
    doc.setFontSize(10.5)
    doc.setTextColor(...colors.navy)
    doc.text(title, pageWidth / 2, y + 5.6, { align: 'center' })
  }

  const drawGridRows = (
    rows: Array<{ leftLabel: string; leftValue: string; rightLabel: string; rightValue: string }>,
    startY: number,
    opts?: { leftLabelWidth?: number; rightLabelWidth?: number; labelFontSize?: number; valueFontSize?: number }
  ) => {
    const rowHeight = 8
    const halfWidth = contentWidth / 2
    const leftLabelWidth = opts?.leftLabelWidth ?? 33
    const rightLabelWidth = opts?.rightLabelWidth ?? 33
    const labelFontSize = opts?.labelFontSize ?? 9.2
    const valueFontSize = opts?.valueFontSize ?? 9.2
    const totalHeight = rows.length * rowHeight
    doc.setDrawColor(...colors.line)
    doc.setLineWidth(0.2)
    doc.rect(marginX, startY, contentWidth, totalHeight)
    doc.line(marginX + halfWidth, startY, marginX + halfWidth, startY + totalHeight)
    doc.line(marginX + leftLabelWidth, startY, marginX + leftLabelWidth, startY + totalHeight)
    doc.line(marginX + halfWidth + rightLabelWidth, startY, marginX + halfWidth + rightLabelWidth, startY + totalHeight)
    rows.forEach((row, index) => {
      const y = startY + index * rowHeight
      if (index > 0) doc.line(marginX, y, marginX + contentWidth, y)
      doc.setFont('times', 'bold')
      doc.setFontSize(labelFontSize)
      doc.setTextColor(35, 35, 35)
      doc.text(row.leftLabel, marginX + 2, y + 5.3)
      doc.text(row.rightLabel, marginX + halfWidth + 2, y + 5.3)
      doc.setFont('times', 'normal')
      doc.setFontSize(valueFontSize)
      doc.setTextColor(15, 15, 15)
      doc.text(row.leftValue, marginX + leftLabelWidth + 2, y + 5.3)
      doc.text(row.rightValue, marginX + halfWidth + rightLabelWidth + 2, y + 5.3)
    })
    return startY + totalHeight
  }

  // Page 1
  drawPageBackground()
  drawMainTitle(true)
  drawSectionTitle('Informations Personnelles du Membre', 30)
  let yCursorPage1 = 38.2
  yCursorPage1 = drawGridRows(
    [
      { leftLabel: 'MATRICULE', leftValue: memberMatricule, rightLabel: 'ANNEE', rightValue: String(new Date().getFullYear()) },
      { leftLabel: 'MEMBRE', leftValue: 'INDIVIDUEL', rightLabel: 'CODE', rightValue: (contract.id || contractId).slice(0, 16) },
      { leftLabel: 'NOM', leftValue: memberLastName, rightLabel: 'PRENOM', rightValue: memberFirstName },
      { leftLabel: 'LIEU / NAISSANCE', leftValue: memberBirthPlace, rightLabel: 'D.NAISS', rightValue: memberBirthDate },
      { leftLabel: 'NATIONALITE', leftValue: memberNationality, rightLabel: 'N°CNI/PASS/CS', rightValue: memberIdDocument },
      { leftLabel: 'TELEPHONE 1', leftValue: memberPhone1, rightLabel: 'TELEPHONE 2', rightValue: memberPhone2 },
      { leftLabel: 'SEXE', leftValue: memberGender, rightLabel: 'AGE', rightValue: memberAge },
      { leftLabel: 'QUARTIER', leftValue: memberQuarter, rightLabel: 'PROFESSION', rightValue: memberProfession },
    ],
    yCursorPage1
  )
  drawSectionTitle('Informations Concernant Le Contact Urgent', yCursorPage1 + 9)
  drawGridRows(
    [
      { leftLabel: 'NOM', leftValue: emergencyContactName, rightLabel: 'LIEN', rightValue: emergencyRelation },
      { leftLabel: 'TELEPHONE 1', leftValue: emergencyPhone1, rightLabel: 'TELEPHONE 2', rightValue: emergencyPhone2 },
      { leftLabel: 'N°CNI/PASS/CS', leftValue: emergencyId, rightLabel: '', rightValue: '' },
    ],
    yCursorPage1 + 17.2
  )

  // Page 2
  doc.addPage()
  drawPageBackground()
  drawMainTitle()
  drawSectionTitle('Informations concernant la Caisse Imprévue', 30)
  const contractRows = [
    { leftLabel: 'PRENOM', leftValue: memberFirstName, rightLabel: 'LIENS', rightValue: emergencyRelation },
    { leftLabel: 'DEBUT CAISSE.I', leftValue: formatLongDate(contract.firstPaymentDate), rightLabel: 'FIN CAISSE.I', rightValue: formatLongDate(endDate) },
    { leftLabel: 'STATUT', leftValue: CONTRACT_CI_STATUS_LABELS[contract.status] || contract.status, rightLabel: 'CONTRAT', rightValue: contract.id || contractId },
    { leftLabel: 'FORFAIT', leftValue: contract.subscriptionCICode || '-', rightLabel: 'MONTANT', rightValue: `${formatAmountForPDF(contract.subscriptionCIAmountPerMonth || 0)} FCFA` },
    { leftLabel: 'ANNEE INSCRIT', leftValue: String(toDateSafe(contract.createdAt)?.getFullYear() || new Date().getFullYear()), rightLabel: 'DUREE', rightValue: `${contract.subscriptionCIDuration || 0} MOIS` },
    { leftLabel: 'DATE REMISE', leftValue: formatLongDate(firstPaidDateForPayment), rightLabel: 'OBSERVATION', rightValue: 'TABLEAU RECAPITULATIF' },
  ]
  drawGridRows(contractRows, 38.2)

  // Section "GESTION DES VERSEMENTS... TABLEAU RECAPITULATIF" réservée à l’export global (Exporter PDF), pas au PDF single (bouton PDF / Télécharger en PDF)
  const versements = getCIRecordedVersements(payment)
  const bounds = isQuotidien ? getQuotidienPeriodBounds(payment) : null
  const deadline = bounds?.end ?? getPaymentDueAt(payment)
  doc.setFillColor(...colors.headerFill)
  doc.setDrawColor(...colors.line)
  doc.rect(marginX, 90, contentWidth, 8, 'FD')
  doc.setFont('times', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...colors.navy)
  doc.text(bounds
    ? `VERSEMENT ${payment.monthIndex + 1} DU ${formatShortDate(bounds.start)} AU ${formatShortDate(bounds.end)}`
    : `VERSEMENT ${payment.monthIndex + 1} DU ${formatLongDate(deadline)}`,
    marginX + 3, 95.4)
  drawPdfHistoryTable(doc, {
    startY: 98, columns: [43, 41, 33, 18, 34, 36, 64],
    rows: versements.map((v) => [
      formatLongDate(deadline), formatLongDate(v.date), `${formatAmountForPDF(v.amount)} FCFA`,
      v.time || '-', v.mode ? formatMode(v.mode, v as VersementCI) : '-',
      getAdminNameForExport(v.createdBy),
      (v.penalty || 0) > 0 || (v.daysLate || 0) > 0 ? `RETARD ${v.daysLate || 0}J` : 'CONFORME',
    ]),
    totalAmount: versements.length > 1 ? `${formatAmountForPDF(versements.reduce((sum, v) => sum + v.amount, 0))} FCFA` : undefined,
    onNewPage: () => { drawPageBackground(); drawMainTitle() },
  })

  const pageCount = doc.getNumberOfPages()
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page)
    doc.setFont('times', 'italic')
    doc.setFontSize(8.5)
    doc.setTextColor(90, 90, 90)
    doc.text(
      `Page ${page} sur ${pageCount} - Généré le ${new Date().toLocaleDateString('fr-FR')}`,
      pageWidth / 2,
      pageHeight - 9,
      { align: 'center' }
    )
  }

  const dateStr = format(new Date(), 'ddMMyyyy')
  const fileName = `Paiement_CI_M${payment.monthIndex + 1}_${contract.memberLastName}_${dateStr}.pdf`
  doc.save(fileName)
}
