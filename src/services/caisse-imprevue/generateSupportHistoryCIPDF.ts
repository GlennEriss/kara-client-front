import { addMonths, format, parseISO } from 'date-fns'
import type { ContractCI, SupportCI } from '@/types/types'
import { CONTRACT_CI_STATUS_LABELS } from '@/types/types'

const formatAmountForPDF = (n: number): string =>
  Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

type MemberIdentityLike = {
  matricule?: string
  firstName?: string
  lastName?: string
  birthPlace?: string
  birthDate?: string | Date
  nationality?: string
  identityDocumentNumber?: string
  contacts?: string[]
  gender?: string
  profession?: string
  address?: {
    district?: string
    arrondissement?: string
    city?: string
  }
}

export type GenerateSupportHistoryCIPDFOptions = {
  contractId: string
  member?: MemberIdentityLike | null
  getAdminDisplayName?: (adminId: string | undefined) => string
  fileNamePrefix?: string
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

function toDateSafe(value: unknown): Date | null {
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

function formatLongDate(value: unknown): string {
  const date = toDateSafe(value)
  if (!date) return '-'
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function formatShortDate(value: unknown): string {
  const date = toDateSafe(value)
  if (!date) return '-'
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function getAge(birthDate?: string | Date): string {
  if (!birthDate) return '-'
  const birth = toDateSafe(birthDate)
  if (!birth) return '-'
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age -= 1
  return age > 0 ? `${age} ANS` : '-'
}

function getSupportDate(support: SupportCI): Date | null {
  return toDateSafe(support.approvedAt) || toDateSafe(support.requestedAt) || toDateSafe(support.createdAt)
}

export async function generateSupportHistoryCIPDF(
  contract: ContractCI,
  supports: SupportCI[],
  options: GenerateSupportHistoryCIPDFOptions
): Promise<void> {
  const { contractId, member, getAdminDisplayName, fileNamePrefix } = options
  const logoDataUrl = await loadLogoDataUrl()
  const sortedSupports = [...supports].sort((a, b) => {
    const aDate = getSupportDate(a)?.getTime() || 0
    const bDate = getSupportDate(b)?.getTime() || 0
    return aDate - bDate
  })

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

  const getAdminName = (adminId?: string) => {
    if (!getAdminDisplayName) return adminId || '-'
    const label = getAdminDisplayName(adminId)
    if (!label || label === 'Chargement...') return adminId || '-'
    return label
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
  const memberQuarter =
    member?.address?.district ||
    member?.address?.arrondissement ||
    member?.address?.city ||
    contract.memberAddress ||
    '-'
  const memberProfession = member?.profession || contract.memberProfession || '-'

  const emergencyContactName = contract.emergencyContact
    ? `${contract.emergencyContact.lastName || ''} ${contract.emergencyContact.firstName || ''}`.trim() || 'INCONNU'
    : 'INCONNU'
  const emergencyRelation = contract.emergencyContact?.relationship || '-'
  const emergencyPhone1 = contract.emergencyContact?.phone1 || '-'
  const emergencyPhone2 = contract.emergencyContact?.phone2 || '-'
  const emergencyId = contract.emergencyContact?.idNumber || '-'

  const totalAidAmount = sortedSupports.reduce((sum, support) => sum + (Number(support.amount) || 0), 0)
  const totalRepaidAmount = sortedSupports.reduce((sum, support) => sum + (Number(support.amountRepaid) || 0), 0)
  const totalRemainingAmount = sortedSupports.reduce((sum, support) => sum + (Number(support.amountRemaining) || 0), 0)
  const repaidCount = sortedSupports.filter((support) => support.status === 'REPAID').length
  const activeCount = Math.max(0, sortedSupports.length - repaidCount)
  const totalRepaymentOps = sortedSupports.reduce((sum, support) => sum + (support.repayments?.length || 0), 0)
  const firstAidDate = sortedSupports.map(getSupportDate).filter((d): d is Date => Boolean(d)).sort((a, b) => a.getTime() - b.getTime())[0]

  const endDate = (() => {
    const start = toDateSafe(contract.firstPaymentDate)
    if (!start) return null
    return addMonths(start, contract.subscriptionCIDuration || 0)
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
    doc.text('HISTORIQUE VERSEMENT AIDE CAISSE IMPREVUE', pageWidth / 2, 18, { align: 'center' })
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

  const drawSupportBlock = (support: SupportCI, index: number, startY: number) => {
    const titleHeight = 8
    const headerHeight = 8
    const valuesHeight = 8
    const columns = [33, 34, 30, 34, 34, 44, 60]
    const headers = ['DATE AIDE', 'MONTANT AIDE', 'STATUT', 'REMBOURSE', 'RESTANT', 'ADMIN', 'OBSERVATION']

    const supportDate = getSupportDate(support)
    const statusLabel = support.status === 'REPAID' ? 'REMBOURSE' : 'EN COURS'
    const progression = support.amount > 0 ? Math.round((support.amountRepaid / support.amount) * 100) : 0
    const observation =
      support.status === 'REPAID'
        ? `SOLDE LE ${formatShortDate(support.repaidAt)}`
        : `PROGRESSION ${progression}%`

    const rowValues = [
      formatLongDate(supportDate),
      `${formatAmountForPDF(support.amount || 0)} FCFA`,
      statusLabel,
      `${formatAmountForPDF(support.amountRepaid || 0)} FCFA`,
      `${formatAmountForPDF(support.amountRemaining || 0)} FCFA`,
      getAdminName(support.approvedBy),
      observation,
    ]

    doc.setFillColor(...colors.headerFill)
    doc.setDrawColor(...colors.line)
    doc.setLineWidth(0.2)
    doc.rect(marginX, startY, contentWidth, titleHeight, 'FD')
    doc.setFont('times', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...colors.navy)
    doc.text(`AIDE ${index + 1} DU ${formatLongDate(supportDate)}`, marginX + 3, startY + 5.4)

    const tableY = startY + titleHeight
    doc.setDrawColor(...colors.line)
    doc.rect(marginX, tableY, contentWidth, headerHeight + valuesHeight)
    doc.setFillColor(225, 235, 245)
    doc.rect(marginX, tableY, contentWidth, headerHeight, 'F')

    let cursorX = marginX
    headers.forEach((header, i) => {
      const width = columns[i]
      if (i > 0) doc.line(cursorX, tableY, cursorX, tableY + headerHeight + valuesHeight)
      doc.setFont('times', 'bold')
      doc.setFontSize(8.7)
      doc.setTextColor(32, 32, 32)
      doc.text(header, cursorX + width / 2, tableY + 5.3, { align: 'center' })
      cursorX += width
    })

    doc.line(marginX, tableY + headerHeight, marginX + contentWidth, tableY + headerHeight)

    cursorX = marginX
    rowValues.forEach((value, i) => {
      const width = columns[i]
      doc.setFont('times', 'normal')
      doc.setFontSize(8.9)
      doc.setTextColor(18, 18, 18)
      doc.text(value, cursorX + width / 2, tableY + headerHeight + 5.3, { align: 'center' })
      cursorX += width
    })

    return startY + titleHeight + headerHeight + valuesHeight
  }

  // Page 1 (identique à l'historique des versements)
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

  // Page 2 (adaptée aux aides financières)
  doc.addPage()
  drawPageBackground()
  drawMainTitle()
  drawSectionTitle('Informations concernant la Caisse Imprévue', 30)
  drawGridRows(
    [
      { leftLabel: 'PRENOM', leftValue: memberFirstName, rightLabel: 'LIENS', rightValue: emergencyRelation },
      { leftLabel: 'DEBUT CAISSE.I', leftValue: formatLongDate(contract.firstPaymentDate), rightLabel: 'FIN CAISSE.I', rightValue: formatLongDate(endDate) },
      { leftLabel: 'STATUT', leftValue: CONTRACT_CI_STATUS_LABELS[contract.status] || contract.status, rightLabel: 'CONTRAT', rightValue: contract.id || contractId },
      { leftLabel: 'FORFAIT', leftValue: contract.subscriptionCICode || '-', rightLabel: 'MONTANT', rightValue: `${formatAmountForPDF(contract.subscriptionCIAmountPerMonth || 0)} FCFA` },
      { leftLabel: 'ANNEE INSCRIT', leftValue: String(toDateSafe(contract.createdAt)?.getFullYear() || new Date().getFullYear()), rightLabel: 'DUREE', rightValue: `${contract.subscriptionCIDuration || 0} MOIS` },
      { leftLabel: 'DATE REMISE', leftValue: formatLongDate(firstAidDate), rightLabel: 'OBSERVATION', rightValue: 'TABLEAU RECAPITULATIF DES AIDES' },
    ],
    38.2
  )

  doc.setFillColor(...colors.headerFill)
  doc.setDrawColor(...colors.line)
  doc.rect(marginX, 90, contentWidth, 8, 'FD')
  doc.setFont('times', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(...colors.navy)
  doc.text('GESTION DES AIDES FINANCIERES CAISSE IMPREVUE TABLEAU RECAPITULATIF CI-DESSOUS', pageWidth / 2, 95.3, { align: 'center' })

  drawGridRows(
    [
      {
        leftLabel: "NOMBRE D'AIDES",
        leftValue: String(sortedSupports.length),
        rightLabel: 'AIDES SOLDEES',
        rightValue: String(repaidCount),
      },
      {
        leftLabel: 'AIDES EN COURS',
        leftValue: String(activeCount),
        rightLabel: 'NB REMBOURSEMENTS',
        rightValue: String(totalRepaymentOps),
      },
      {
        leftLabel: 'MONTANT AIDE TOTAL',
        leftValue: `${formatAmountForPDF(totalAidAmount)} FCFA`,
        rightLabel: 'MONTANT REMBOURSE',
        rightValue: `${formatAmountForPDF(totalRepaidAmount)} FCFA`,
      },
      {
        leftLabel: 'MONTANT RESTANT',
        leftValue: `${formatAmountForPDF(totalRemainingAmount)} FCFA`,
        rightLabel: 'TAXI',
        rightValue: '',
      },
    ],
    99,
    {
      leftLabelWidth: 52,
      rightLabelWidth: 48,
      labelFontSize: 8.8,
      valueFontSize: 9.4,
    }
  )

  if (sortedSupports.length > 0) {
    drawSupportBlock(sortedSupports[0], 0, 138)
  }

  const remainingSupports = sortedSupports.slice(1)
  const chunkSize = 3
  for (let i = 0; i < remainingSupports.length; i += chunkSize) {
    const chunk = remainingSupports.slice(i, i + chunkSize)
    doc.addPage()
    drawPageBackground()
    drawMainTitle()
    let blockY = 30
    chunk.forEach((support, offset) => {
      blockY = drawSupportBlock(support, i + offset + 1, blockY) + 6
    })
  }

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
  const resolvedPrefix = fileNamePrefix || 'historique_versement_aide_caisse_imprevue'
  const fileName = `${resolvedPrefix}_${contractId}_${dateStr}.pdf`
  doc.save(fileName)
}

export async function generateSingleSupportCIPDF(
  contract: ContractCI,
  support: SupportCI,
  options: GenerateSupportHistoryCIPDFOptions
): Promise<void> {
  const supportDate = formatShortDate(getSupportDate(support))
  await generateSupportHistoryCIPDF(contract, [support], {
    ...options,
    fileNamePrefix: `aide_ci_${supportDate.replace(/\//g, '')}`,
  })
}
