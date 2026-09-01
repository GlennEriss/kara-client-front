/**
 * Exporter PDF "historique versement" Crédit Spéciale.
 * Même structure que versementPdfExport (caisse spéciale) : 2 pages (infos membre + contact urgent, puis infos crédit + récap) + bloc ÉCHÉANCE i DU date.
 * Utilisé par PaymentReceiptModal (Télécharger PDF) depuis la page détail contrat crédit spéciale.
 */
import type jsPDF from 'jspdf'
import { getNationalityNameByGender } from '@/constantes/nationality'

const formatAmountForPDF = (amount: number | undefined | null): string => {
  if (!amount && amount !== 0) return '0'
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

const translateCreditContractStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    DRAFT: 'Brouillon',
    PENDING: 'En attente',
    ACTIVE: 'Actif',
    LATE: 'En retard',
    DEFAULTED: 'Défaillant',
    DISCHARGED: 'Déchargé',
    CLOSED: 'Clos',
  }
  return statusMap[status] || status
}

const formatMode = (mode?: string): string => {
  const modeMap: Record<string, string> = {
    airtel_money: 'AIRTEL-MONEY',
    mobicash: 'MOBICASH',
    cash: 'CASH',
    bank_transfer: 'VIREMENT',
    CASH: 'CASH',
    MOBILE_MONEY: 'MOBILE MONEY',
    BANK_TRANSFER: 'VIREMENT',
    CHEQUE: 'CHEQUE',
  }
  return !mode ? '-' : modeMap[mode] || String(mode).toUpperCase()
}

export async function loadLogoDataUrlCreditSpeciale(): Promise<{
  dataUrl: string
  width: number
  height: number
} | null> {
  try {
    const response = await fetch('/assets/caisse-speciale/caissesp-logo.png')
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
        img.naturalWidth && img.naturalHeight
          ? resolve({ width: img.naturalWidth, height: img.naturalHeight })
          : resolve(null)
      img.onerror = () => resolve(null)
      img.src = dataUrl
    })
    if (!dimensions) return null
    return { dataUrl, width: dimensions.width, height: dimensions.height }
  } catch (error) {
    console.error('Erreur chargement logo export PDF crédit spéciale:', error)
    return null
  }
}

const toDateSafe = (value: unknown): Date | null => {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof (value as any)?.toDate === 'function') return (value as any).toDate()
  const parsed = new Date(value as any)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const formatLongDate = (value: unknown): string => {
  const date = toDateSafe(value)
  if (!date) return '-'
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

const formatShortDate = (value: unknown): string => {
  const date = toDateSafe(value)
  if (!date) return '-'
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** Membre (collection users) pour afficher les infos personnelles dans le PDF. */
export type MemberForPdf = {
  id?: string
  matricule?: string
  lastName?: string
  firstName?: string
  birthPlace?: string
  birthDate?: string
  nationality?: string
  gender?: string
  identityDocumentNumber?: string
  contacts?: string[]
  address?: { district?: string; arrondissement?: string; city?: string }
  profession?: string
  companyName?: string
}

const getAge = (birthDate?: string | Date | null): string => {
  if (!birthDate) return '-'
  const birth = toDateSafe(birthDate)
  if (!birth) return '-'
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age -= 1
  return age > 0 ? `${age} ANS` : '-'
}

export type DueItemLike = {
  month: number
  date: Date
  payment: number
  interest?: number
  principal?: number
  remaining?: number
  status: string
  paidAmount?: number
  paymentDate?: Date
}

export type BuildCreditSpecialeVersementPdfOpts = {
  contract: any
  /** Membre (collection users) pour LIEU/NAISSANCE, D.NAISS, NATIONALITE, N°CNI, SEXE, AGE, QUARTIER, PROFESSION, PRENOM, MEMBRE. */
  member?: MemberForPdf | null
  schedule?: DueItemLike[]
  payments?: any[]
  logoDataUrl: { dataUrl: string; width: number; height: number } | null
  getAdminDisplayName: (adminId: string) => string
  /** Si true, on n'affiche pas les tableaux de la page 2 (récap). */
  skipPage2Tables?: boolean
}

export function buildCreditSpecialeVersementPDFFirstTwoPages(
  doc: jsPDF,
  opts: BuildCreditSpecialeVersementPdfOpts
): {
  drawEcheanceBlock: (payment: any, installmentNumber: number, dueDate: Date | null, startY: number) => number
  pageWidth: number
  pageHeight: number
  drawPageBackground: () => void
  drawMainTitle: (showLogo?: boolean) => void
} {
  const { contract, member: memberData, schedule = [], payments = [], logoDataUrl, getAdminDisplayName, skipPage2Tables } = opts
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

  const memberMatricule = memberData?.matricule || contract.clientId || contract.id || '-'
  const memberLastName = memberData?.lastName ?? contract.clientLastName ?? 'INCONNU'
  const memberFirstName = memberData?.firstName ?? contract.clientFirstName ?? 'INCONNU'
  const memberPhone1 = (memberData?.contacts?.[0] ?? (Array.isArray(contract.clientContacts) ? contract.clientContacts[0] : null)) || '-'
  const memberPhone2 = (memberData?.contacts?.[1] ?? (Array.isArray(contract.clientContacts) ? contract.clientContacts[1] : null)) || '-'
  const memberBirthPlace = memberData?.birthPlace ?? '-'
  const memberBirthDate = memberData?.birthDate ? formatLongDate(memberData.birthDate) : '-'
  const memberNationality = memberData?.nationality ? getNationalityNameByGender(memberData.nationality, memberData?.gender) : '-'
  const memberIdDocument = memberData?.identityDocumentNumber ?? '-'
  const memberGender = memberData?.gender ? String(memberData.gender).toUpperCase() : '-'
  const memberAge = memberData?.birthDate ? getAge(memberData.birthDate) : '-'
  const memberQuarter = (memberData?.address?.district ?? memberData?.address?.arrondissement ?? memberData?.address?.city) ?? '-'
  const memberProfession = memberData?.profession ?? memberData?.companyName ?? '-'
  const emergencyContactName = contract.emergencyContact
    ? `${contract.emergencyContact.lastName || ''} ${contract.emergencyContact.firstName || ''}`.trim() || 'INCONNU'
    : 'INCONNU'
  const emergencyRelation = contract.emergencyContact?.relationship || '-'
  const emergencyPhone1 = contract.emergencyContact?.phone1 || '-'
  const emergencyPhone2 = contract.emergencyContact?.phone2 || '-'
  const emergencyId = contract.emergencyContact?.idNumber || '-'

  const paidCount = schedule.filter((i) => i.status === 'PAID').length
  const unpaidCount = schedule.filter((i) => i.status !== 'PAID' && i.status !== 'REST').length
  const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
  const totalToRepay = schedule.reduce((sum, i) => sum + (i.payment || 0), 0)
  const totalUnpaid = Math.max(totalToRepay - totalPaid, 0)
  const totalPenalties = payments.reduce((sum, p) => sum + (Number(p.penaltyAmount) || 0), 0)

  const drawPageBackground = () => {
    doc.setFillColor(...colors.pageFill)
    doc.rect(0, 0, pageWidth, pageHeight, 'F')
    doc.setDrawColor(...colors.navy)
    doc.setLineWidth(0.7)
    doc.rect(8, 8, pageWidth - 16, pageHeight - 16)
  }

  const drawMainTitle = (showLogo = false) => {
    if (showLogo && logoDataUrl) {
      const maxLogoWidth = 34,
        maxLogoHeight = 18
      const ratio = logoDataUrl.width / logoDataUrl.height
      let logoWidth = maxLogoWidth,
        logoHeight = logoWidth / ratio
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
    doc.text('HISTORIQUE VERSEMENT CREDIT SPECIALE', pageWidth / 2, 18, { align: 'center' })
    doc.setFontSize(10)
    doc.setTextColor(45, 45, 45)
    doc.text(`Contrat : ${contract.id || '-'}`, pageWidth / 2, 23, { align: 'center' })
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
    options?: {
      leftLabelWidth?: number
      rightLabelWidth?: number
      labelFontSize?: number
      valueFontSize?: number
    }
  ) => {
    const rowHeight = 8,
      halfWidth = contentWidth / 2
    const leftLabelWidth = options?.leftLabelWidth ?? 33,
      rightLabelWidth = options?.rightLabelWidth ?? 33
    const labelFontSize = options?.labelFontSize ?? 9.2,
      valueFontSize = options?.valueFontSize ?? 9.2
    const totalHeight = rows.length * rowHeight
    doc.setDrawColor(...colors.line)
    doc.setLineWidth(0.2)
    doc.rect(marginX, startY, contentWidth, totalHeight)
    doc.line(marginX + halfWidth, startY, marginX + halfWidth, startY + totalHeight)
    doc.line(marginX + leftLabelWidth, startY, marginX + leftLabelWidth, startY + totalHeight)
    doc.line(
      marginX + halfWidth + rightLabelWidth,
      startY,
      marginX + halfWidth + rightLabelWidth,
      startY + totalHeight
    )
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

  const rowHeight = 8
  const getAdminNameForExport = (payment: any): string => {
    const label = getAdminDisplayName(payment.updatedBy || '')
    if (!label || label === 'Chargement...') return payment.updatedBy || '-'
    return label
  }

  const drawEcheanceBlock = (payment: any, installmentNumber: number, dueDate: Date | null, startY: number) => {
    const headerHeight = 8,
      titleHeight = 8
    const columns = [43, 41, 33, 18, 34, 36, 64]

    doc.setFillColor(...colors.headerFill)
    doc.setDrawColor(...colors.line)
    doc.setLineWidth(0.2)
    doc.rect(marginX, startY, contentWidth, titleHeight, 'FD')
    doc.setFont('times', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...colors.navy)
    const titleText = dueDate
      ? `ECHEANCE ${installmentNumber} DU ${formatLongDate(dueDate)}`
      : `ECHEANCE ${installmentNumber} DU ${formatLongDate(payment.paymentDate)}`
    doc.text(titleText, marginX + 3, startY + 5.4)

    const tableY = startY + titleHeight
    const valuesHeight = rowHeight
    const totalHeight = titleHeight + headerHeight + valuesHeight
    doc.setDrawColor(...colors.line)
    doc.rect(marginX, tableY, contentWidth, headerHeight + valuesHeight)
    doc.setFillColor(225, 235, 245)
    doc.rect(marginX, tableY, contentWidth, headerHeight, 'F')
    const headers = ['DATE ECHEANCE', 'DATE REMISE', 'MONTANT', 'HEURE', 'MOYEN /TRANS', 'AGENT', 'REMARQUE']
    let cursorX = marginX
    headers.forEach((header, index) => {
      const width = columns[index]
      if (index > 0) doc.line(cursorX, tableY, cursorX, tableY + headerHeight + valuesHeight)
      doc.setFont('times', 'bold')
      doc.setFontSize(8.7)
      doc.setTextColor(32, 32, 32)
      doc.text(header, cursorX + width / 2, tableY + 5.3, { align: 'center' })
      cursorX += width
    })
    doc.line(marginX, tableY + headerHeight, marginX + contentWidth, tableY + headerHeight)

    const remark =
      payment.comment && String(payment.comment).trim() ? String(payment.comment).trim().slice(0, 30) : 'CONFORME'
    const modeLabel = formatMode(payment.mode) + ((payment.mode === 'airtel_money' || payment.mode === 'mobicash') && (payment as { withFees?: boolean }).withFees !== undefined
      ? ((payment as { withFees?: boolean }).withFees ? ' (Avec frais)' : ' (Sans frais)')
      : '')
    const rowValues = [
      dueDate ? formatLongDate(dueDate) : formatLongDate(payment.paymentDate),
      formatLongDate(payment.paymentDate),
      `${formatAmountForPDF(payment.amount)} FCFA`,
      payment.paymentTime || '-',
      modeLabel,
      getAdminNameForExport(payment),
      remark,
    ]
    cursorX = marginX
    rowValues.forEach((value, index) => {
      const width = columns[index]
      doc.setFont('times', 'normal')
      doc.setFontSize(8.9)
      doc.setTextColor(18, 18, 18)
      doc.text(String(value), cursorX + width / 2, tableY + headerHeight + 5.3, { align: 'center' })
      cursorX += width
    })
    return startY + totalHeight
  }

  // Page 1
  drawPageBackground()
  drawMainTitle(true)
  drawSectionTitle('Informations Personnelles du Membre', 30)
  let yCursor = 38.2
  yCursor = drawGridRows(
    [
      { leftLabel: 'MATRICULE', leftValue: memberMatricule, rightLabel: 'ANNEE', rightValue: String(new Date().getFullYear()) },
      { leftLabel: 'NOM', leftValue: memberLastName, rightLabel: 'PRENOM', rightValue: memberFirstName },
      { leftLabel: 'LIEU / NAISSANCE', leftValue: memberBirthPlace, rightLabel: 'D.NAISS', rightValue: memberBirthDate },
      { leftLabel: 'NATIONALITE', leftValue: memberNationality, rightLabel: 'N°CNI/PASS/CS', rightValue: memberIdDocument },
      { leftLabel: 'TELEPHONE 1', leftValue: memberPhone1, rightLabel: 'TELEPHONE 2', rightValue: memberPhone2 },
      { leftLabel: 'SEXE', leftValue: memberGender, rightLabel: 'AGE', rightValue: memberAge },
      { leftLabel: 'QUARTIER', leftValue: memberQuarter, rightLabel: 'PROFESSION', rightValue: memberProfession },
    ],
    yCursor
  )
  drawSectionTitle('Informations Concernant Le Contact Urgent', yCursor + 9)
  drawGridRows(
    [
      { leftLabel: 'NOM', leftValue: emergencyContactName, rightLabel: 'LIEN', rightValue: emergencyRelation },
      { leftLabel: 'TELEPHONE 1', leftValue: emergencyPhone1, rightLabel: 'TELEPHONE 2', rightValue: emergencyPhone2 },
      { leftLabel: 'N°CNI/PASS/CS', leftValue: emergencyId, rightLabel: '', rightValue: '' },
    ],
    yCursor + 17.2
  )

  // Page 2
  doc.addPage()
  drawPageBackground()
  drawMainTitle()
  if (!skipPage2Tables) {
    const firstPaymentDate = toDateSafe(contract.firstPaymentDate)
    const endYear = firstPaymentDate
      ? firstPaymentDate.getFullYear() + Math.ceil((contract.duration || 0) / 12)
      : new Date().getFullYear()
    drawSectionTitle('Informations concernant le Crédit Spéciale', 30)
    const contractRows = [
      {
        leftLabel: 'DEBUT CREDIT',
        leftValue: formatLongDate(contract.firstPaymentDate),
        rightLabel: 'DUREE',
        rightValue: `${contract.duration || 0} MOIS`,
      },
      {
        leftLabel: 'STATUT',
        leftValue: translateCreditContractStatus(contract.status || ''),
        rightLabel: 'CONTRAT',
        rightValue: contract.id || '-',
      },
      {
        leftLabel: 'CAPITAL',
        leftValue: `${formatAmountForPDF(contract.amount)} FCFA`,
        rightLabel: 'TAUX',
        rightValue: `${contract.interestRate ?? 0} %`,
      },
      {
        leftLabel: 'ANNEE INSCRIT',
        leftValue: String(toDateSafe(contract.createdAt)?.getFullYear() || new Date().getFullYear()),
        rightLabel: 'MONTANT GLOBAL',
        rightValue: `${formatAmountForPDF(contract.totalAmount)} FCFA`,
      },
      { leftLabel: 'DATE REMISE', leftValue: '', rightLabel: 'OBSERVATION', rightValue: '' },
    ]
    drawGridRows(contractRows, 38.2)
    drawGridRows(
      [
        { leftLabel: 'NOMBRE ECHEANCES PAYEES', leftValue: String(paidCount), rightLabel: 'ECHEANCES IMPAYEES', rightValue: String(unpaidCount) },
        { leftLabel: 'MONTANT PAYE', leftValue: `${formatAmountForPDF(totalPaid)} FCFA`, rightLabel: 'MONTANT IMPAYE', rightValue: `${formatAmountForPDF(totalUnpaid)} FCFA` },
        { leftLabel: 'TOTAL PENALITES', leftValue: `${formatAmountForPDF(totalPenalties)} FCFA`, rightLabel: '', rightValue: '' },
      ],
      90,
      { leftLabelWidth: 50, rightLabelWidth: 46, labelFontSize: 8.8, valueFontSize: 9.4 }
    )
  }
  return { drawEcheanceBlock, pageWidth, pageHeight, drawPageBackground, drawMainTitle }
}

export type GenerateSingleCreditSpecialeVersementPdfParams = {
  contract: any
  payment: any
  installmentNumber: number
  dueDate?: Date | null
  /** Membre (collection users) pour afficher les infos personnelles dans le PDF. */
  member?: MemberForPdf | null
  schedule?: DueItemLike[]
  payments?: any[]
  getAdminDisplayName: (adminId: string) => string
}

/** Génère et télécharge le PDF "historique versement" pour une échéance Crédit Spéciale (même format visuel que caisse spéciale versements > PDF). */
export async function generateSingleCreditSpecialeVersementPDF(
  params: GenerateSingleCreditSpecialeVersementPdfParams
): Promise<void> {
  const { contract, payment, installmentNumber, dueDate, member, schedule = [], payments = [], getAdminDisplayName } = params
  const logoDataUrl = await loadLogoDataUrlCreditSpeciale()
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF('l', 'mm', 'a4')
  const { drawEcheanceBlock, pageWidth, pageHeight } = buildCreditSpecialeVersementPDFFirstTwoPages(doc, {
    contract,
    member,
    schedule,
    payments,
    logoDataUrl,
    getAdminDisplayName,
    skipPage2Tables: true,
  })
  const dueDateRes = dueDate ?? toDateSafe(payment.paymentDate)
  drawEcheanceBlock(payment, installmentNumber, dueDateRes, 30)
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
  const dateStr = new Date().toISOString().split('T')[0]
  doc.save(`versement_credit_${contract.id}_E${installmentNumber}_${dateStr}.pdf`)
}
