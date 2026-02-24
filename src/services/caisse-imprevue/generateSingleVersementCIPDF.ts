/**
 * Génère le PDF "single versement" (format historique versement CI) : pages 1 et 2 + bloc VERSEMENT.
 * Utilisé par la page versements (bouton PDF) et par le modal facture (Télécharger en PDF).
 */
import jsPDF from 'jspdf'
import { addMonths, format, parseISO } from 'date-fns'
import type { ContractCI, PaymentCI } from '@/types/types'
import { CONTRACT_CI_STATUS_LABELS } from '@/types/types'

const formatAmountForPDF = (n: number): string =>
  Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

export type GenerateSingleVersementCIPDFOptions = {
  contractId: string
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
  const { contractId, getAdminDisplayName } = options
  const logoDataUrl = await loadLogoDataUrl()
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

  const formatMode = (mode?: string): string => {
    const modeMap: Record<string, string> = {
      airtel_money: 'AIRTEL-MONEY',
      mobicash: 'MOBICASH',
      cash: 'CASH',
      bank_transfer: 'VIREMENT',
    }
    return mode ? modeMap[mode] || String(mode).toUpperCase() : '-'
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
  const PERIOD_DAYS_CI = 30
  const getQuotidienPeriodBounds = (p: PaymentCI): { start: Date; end: Date } | null => {
    const first = toDateSafe(contract.firstPaymentDate)
    if (!first) return null
    const start = addMonths(first, p.monthIndex)
    const end = new Date(start)
    end.setDate(end.getDate() + PERIOD_DAYS_CI - 1)
    return { start, end }
  }

  const memberLastName = contract.memberLastName || 'INCONNU'
  const memberFirstName = contract.memberFirstName || 'INCONNU'
  const memberMatricule = contract.memberId || contract.id || '-'
  const memberBirthPlace = (contract as any).memberBirthPlace ?? '-'
  const memberBirthDate = formatLongDate(contract.memberBirthDate)
  const memberNationality = contract.memberNationality || '-'
  const memberIdDocument = (contract as any).memberIdentityDocumentNumber ?? '-'
  const memberPhone1 = contract.memberContacts?.[0] || '-'
  const memberPhone2 = contract.memberContacts?.[1] || '-'
  const memberGender = contract.memberGender ? String(contract.memberGender).toUpperCase() : '-'
  const memberAge = getAge(contract.memberBirthDate)
  const memberQuarter = contract.memberAddress || '-'
  const memberProfession = contract.memberProfession || '-'

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
  const unpaidCount = payment.status === 'PAID' ? 0 : 1
  const totalCotisation = payment.targetAmount || 0
  const totalPaid = payment.accumulatedAmount || 0
  const totalUnpaid = Math.max(totalCotisation - totalPaid, 0)
  const totalPenalties = (payment.versements || []).reduce((sum, v) => sum + (v.penalty || 0), 0)

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

  doc.setFillColor(...colors.headerFill)
  doc.setDrawColor(...colors.line)
  doc.rect(marginX, 90, contentWidth, 8, 'FD')
  doc.setFont('times', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(...colors.navy)
  doc.text('GESTION DES VERSEMENTS CAISSE IMPREVUE TABLEAU RECAPITULATIF CI-DESSOUS', pageWidth / 2, 95.3, { align: 'center' })

  drawGridRows(
    [
      { leftLabel: 'NOMBRE DE VERSEMENT', leftValue: '1', rightLabel: 'MOIS IMPAYE', rightValue: String(unpaidCount) },
      { leftLabel: 'MONTANT PAYE', leftValue: `${formatAmountForPDF(totalPaid)} FCFA`, rightLabel: 'MONTANT IMPAYE', rightValue: `${formatAmountForPDF(totalUnpaid)} FCFA` },
      { leftLabel: 'TOTAL PENALITES', leftValue: `${formatAmountForPDF(totalPenalties)} FCFA`, rightLabel: 'TAXI', rightValue: '' },
    ],
    99,
    { leftLabelWidth: 50, rightLabelWidth: 46, labelFontSize: 8.8, valueFontSize: 9.4 }
  )

  const headerHeight = 8
  const rowHeight = 8
  const titleHeight = 8
  const columns = [43, 41, 33, 18, 34, 36, 64]
  const headers = ['DATE ECHEANCE', 'DATE REMISE', 'MONTANT', 'HEURE', 'MOYEN /TRANS', 'AGENT', 'REMARQUE']
  let startY = 130

  if (isQuotidien) {
    const bounds = getQuotidienPeriodBounds(payment)
    const versements = payment.versements || []
    const dates: Date[] = []
    if (bounds) {
      for (let d = 0; d < PERIOD_DAYS_CI; d++) {
        const day = new Date(bounds.start)
        day.setDate(day.getDate() + d)
        dates.push(day)
      }
    }
    const findVersementForDate = (date: Date): any => {
      const y = date.getFullYear()
      const m = date.getMonth()
      const d = date.getDate()
      return versements.find((v: any) => {
        const paid = toDateSafe(v.date)
        if (!paid) return false
        return paid.getFullYear() === y && paid.getMonth() === m && paid.getDate() === d
      })
    }
    const totalAmount = versements.reduce((sum: number, v: any) => sum + (Number(v.amount) || 0), 0)
    const ROWS_PER_PAGE = 18

    const drawJournalierChunk = (
      chunkRows: Date[],
      chunkStartY: number,
      chunkOptions?: { totalAmount?: number }
    ) => {
      const hasTotalRow = chunkOptions?.totalAmount != null
      const chunkHeight = headerHeight + chunkRows.length * rowHeight + (hasTotalRow ? rowHeight : 0)
      doc.setLineWidth(0.2)
      doc.setDrawColor(...colors.line)
      doc.rect(marginX, chunkStartY, contentWidth, chunkHeight)
      doc.setFillColor(225, 235, 245)
      doc.rect(marginX, chunkStartY, contentWidth, headerHeight, 'F')
      let cursorX = marginX
      headers.forEach((header, index) => {
        const width = columns[index]
        if (index > 0) doc.line(cursorX, chunkStartY, cursorX, chunkStartY + chunkHeight)
        doc.setFont('times', 'bold')
        doc.setFontSize(8.7)
        doc.setTextColor(32, 32, 32)
        doc.text(header, cursorX + width / 2, chunkStartY + 5.3, { align: 'center' })
        cursorX += width
      })
      doc.line(marginX, chunkStartY + headerHeight, marginX + contentWidth, chunkStartY + headerHeight)
      chunkRows.forEach((date: Date, idx: number) => {
        const rowY = chunkStartY + headerHeight + idx * rowHeight
        if (idx > 0) doc.line(marginX, rowY, marginX + contentWidth, rowY)
        const v = findVersementForDate(date)
        const rowValues = v
          ? [
              formatShortDate(date),
              formatShortDate(v.date),
              `${formatAmountForPDF(Number(v.amount) || 0)} FCFA`,
              v.time || '-',
              formatMode(v.mode),
              getAdminNameForExport(v.createdBy),
              'CONFORME',
            ]
          : [
              formatShortDate(date),
              '-',
              '0 FCFA',
              '-',
              '-',
              '-',
              'NON CONFORME',
            ]
        cursorX = marginX
        rowValues.forEach((value, colIndex) => {
          const width = columns[colIndex]
          doc.setFont('times', 'normal')
          doc.setFontSize(8.9)
          doc.setTextColor(18, 18, 18)
          doc.text(String(value), cursorX + width / 2, rowY + 5.3, { align: 'center' })
          cursorX += width
        })
      })
      if (hasTotalRow) {
        const totalRowY = chunkStartY + headerHeight + chunkRows.length * rowHeight
        doc.line(marginX, totalRowY, marginX + contentWidth, totalRowY)
        const totalRowValues = ['TOTAL', '-', `${formatAmountForPDF(chunkOptions!.totalAmount!)} FCFA`, '-', '-', '-', '-']
        cursorX = marginX
        totalRowValues.forEach((value, colIndex) => {
          const width = columns[colIndex]
          doc.setFont('times', 'bold')
          doc.setFontSize(8.9)
          doc.setTextColor(18, 18, 18)
          doc.text(String(value), cursorX + width / 2, totalRowY + 5.3, { align: 'center' })
          cursorX += width
        })
      }
    }

    doc.setFillColor(...colors.headerFill)
    doc.setDrawColor(...colors.line)
    doc.setLineWidth(0.2)
    doc.rect(marginX, startY, contentWidth, titleHeight, 'FD')
    doc.setFont('times', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...colors.navy)
    const titleText = bounds
      ? `VERSEMENT ${payment.monthIndex + 1} DU ${formatShortDate(bounds.start)} AU ${formatShortDate(bounds.end)}`
      : `VERSEMENT ${payment.monthIndex + 1} DU ${formatLongDate(getPaymentDueAt(payment))}`
    doc.text(titleText, marginX + 3, startY + 5.4)

    const tableYFirst = startY + titleHeight
    const firstChunk = dates.slice(0, ROWS_PER_PAGE)
    const secondChunk = dates.slice(ROWS_PER_PAGE)
    drawJournalierChunk(firstChunk, tableYFirst)
    if (secondChunk.length > 0) {
      doc.addPage()
      drawPageBackground()
      drawMainTitle()
      drawJournalierChunk(secondChunk, 28, { totalAmount })
    }
  } else {
    const versements = payment.versements || []
    const dataRows =
      versements.length > 0
        ? versements.map((v: any) => ({
            date: v.date ?? null,
            time: v.time ?? '-',
            amount: Number(v.amount) || 0,
            mode: v.mode,
            createdBy: v.createdBy,
            penalty: v.penalty,
            daysLate: v.daysLate,
          }))
        : [{ date: null, time: '-', amount: 0, mode: '', createdBy: undefined, penalty: 0, daysLate: 0 }]
    const numDataRows = dataRows.length
    const tableHeight = headerHeight + numDataRows * rowHeight

    doc.setFillColor(...colors.headerFill)
    doc.setDrawColor(...colors.line)
    doc.setLineWidth(0.2)
    doc.rect(marginX, startY, contentWidth, titleHeight, 'FD')
    doc.setFont('times', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...colors.navy)
    doc.text(
      `VERSEMENT ${payment.monthIndex + 1} DU ${formatLongDate(getPaymentDueAt(payment))}`,
      marginX + 3,
      startY + 5.4
    )

    const tableY = startY + titleHeight
    doc.setDrawColor(...colors.line)
    doc.rect(marginX, tableY, contentWidth, tableHeight)
    doc.setFillColor(225, 235, 245)
    doc.rect(marginX, tableY, contentWidth, headerHeight, 'F')

    let cursorX = marginX
    headers.forEach((header, index) => {
      const width = columns[index]
      if (index > 0) doc.line(cursorX, tableY, cursorX, tableY + tableHeight)
      doc.setFont('times', 'bold')
      doc.setFontSize(8.7)
      doc.setTextColor(32, 32, 32)
      doc.text(header, cursorX + width / 2, tableY + 5.3, { align: 'center' })
      cursorX += width
    })
    doc.line(marginX, tableY + headerHeight, marginX + contentWidth, tableY + headerHeight)

    const dueDateStr = formatLongDate(getPaymentDueAt(payment))
    dataRows.forEach((v: any, rowIndex: number) => {
      const rowY = tableY + headerHeight + rowIndex * rowHeight
      if (rowIndex > 0) doc.line(marginX, rowY, marginX + contentWidth, rowY)
      const dateRemise = v.date ? formatLongDate(v.date) : '-'
      const remark =
        (v.penalty && v.penalty > 0) || (v.daysLate && v.daysLate > 0) ? `RETARD ${v.daysLate || 0}J` : 'CONFORME'
      const rowValues = [
        dueDateStr,
        dateRemise,
        `${formatAmountForPDF(v.amount)} FCFA`,
        v.time || '-',
        formatMode(v.mode),
        getAdminNameForExport(v.createdBy),
        remark,
      ]
      cursorX = marginX
      rowValues.forEach((value: string, colIndex: number) => {
        const width = columns[colIndex]
        doc.setFont('times', 'normal')
        doc.setFontSize(8.9)
        doc.setTextColor(18, 18, 18)
        doc.text(String(value), cursorX + width / 2, rowY + 5.3, { align: 'center' })
        cursorX += width
      })
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
  const fileName = `Paiement_CI_M${payment.monthIndex + 1}_${contract.memberLastName}_${dateStr}.pdf`
  doc.save(fileName)
}
