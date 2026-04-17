/**
 * Exporter PDF "historique versement" (2 pages infos + bloc VERSEMENT i DU date).
 * Utilisé par la page versements (bouton PDF) et par le modal facture (Télécharger PDF).
 */
import jsPDF from 'jspdf'
import { getNationalityNameByGender } from '@/constantes/nationality'

const formatAmountForPDF = (amount: number | undefined | null): string => {
  if (!amount && amount !== 0) return '0'
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

const translateContractStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    'DRAFT': 'En cours',
    'ACTIVE': 'Actif',
    'LATE_NO_PENALTY': 'Retard (J+0..3)',
    'LATE_WITH_PENALTY': 'Retard (J+4..12)',
    'DEFAULTED_AFTER_J12': 'Résilié (>J+12)',
    'EARLY_WITHDRAW_REQUESTED': 'Retrait anticipé demandé',
    'FINAL_REFUND_PENDING': 'Remboursement final en attente',
    'EARLY_REFUND_PENDING': 'Remboursement anticipé en attente',
    'RESCINDED': 'Résilié',
    'CLOSED': 'Clos',
  }
  return statusMap[status] || status
}

export async function loadLogoDataUrl(): Promise<{ dataUrl: string; width: number; height: number } | null> {
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
    console.error('Erreur chargement logo export PDF:', error)
    return null
  }
}

export type BuildVersementPdfOpts = {
  contract: any
  contractId: string
  member: any
  group: any
  sortedPayments: any[]
  logoDataUrl: { dataUrl: string; width: number; height: number } | null
  getAdminDisplayName: (adminId: string) => string
  /** Si true (ex. export single versement via bouton PDF), on n'affiche pas les tableaux de la page 2 (Caisse Spéciale + récap). */
  skipPage2Tables?: boolean
}

export function buildVersementPDFFirstTwoPages(
  doc: jsPDF,
  opts: BuildVersementPdfOpts
): {
  drawPaymentBlock: (payment: any, startY: number) => number
  pageWidth: number
  pageHeight: number
  drawPageBackground: () => void
  drawMainTitle: (showLogo?: boolean) => void
} {
  const { contract, contractId, member, group, sortedPayments, logoDataUrl, getAdminDisplayName, skipPage2Tables } = opts
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
  const PERIOD_DAYS = 30
  const getJournalierPeriodBounds = (payment: any): { start: Date; end: Date } | null => {
    const end = toDateSafe(payment.dueAt)
    if (!end) return null
    const startRef = toDateSafe(contract.contractStartAt)
    if (startRef) {
      const i = payment.dueMonthIndex ?? 0
      const start = new Date(startRef)
      start.setDate(start.getDate() + i * PERIOD_DAYS)
      return { start, end }
    }
    const start = new Date(end)
    start.setDate(start.getDate() - (PERIOD_DAYS - 1))
    return { start, end }
  }
  const formatMode = (mode?: string): string => {
    const modeMap: Record<string, string> = {
      airtel_money: 'AIRTEL-MONEY',
      mobicash: 'MOBICASH',
      cash: 'CASH',
      bank_transfer: 'VIREMENT',
    }
    return !mode ? '-' : modeMap[mode] || String(mode).toUpperCase()
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
  const getPaymentRemark = (payment: any): string => {
    if (payment.status === 'PAID')
      return (payment.penaltyApplied || 0) > 0 ? `RETARD ${payment.penaltyDays || 0}J` : 'CONFORME'
    const dueDate = toDateSafe(payment.dueAt)
    if (dueDate && new Date() > dueDate) return 'IMPAYE'
    return 'EN ATTENTE'
  }
  const getAdminNameForExport = (payment: any): string => {
    const label = getAdminDisplayName(payment.updatedBy)
    if (!label || label === 'Chargement...') return payment.updatedBy || '-'
    return label
  }
  const caisseTypeLabelMap: Record<string, string> = {
    STANDARD: 'STANDARD',
    JOURNALIERE: 'JOURNALIERE',
    LIBRE: 'LIBRE',
    STANDARD_CHARITABLE: 'STANDARD CHARITABLE',
    JOURNALIERE_CHARITABLE: 'JOURNALIERE CHARITABLE',
    LIBRE_CHARITABLE: 'LIBRE CHARITABLE',
  }
  const caisseTypeLabel = caisseTypeLabelMap[contract.caisseType] || contract.caisseType
  const memberNameForGroup = group?.name || group?.label || 'GROUPE'
  const memberLastName = contract.contractType === 'GROUP' ? memberNameForGroup : member?.lastName || 'INCONNU'
  const memberFirstName = contract.contractType === 'GROUP' ? '-' : member?.firstName || 'INCONNU'
  const memberMatricule = member?.matricule || contract.memberId || contract.id || '-'
  const memberBirthPlace = contract.contractType === 'GROUP' ? '-' : member?.birthPlace || '-'
  const memberBirthDate = contract.contractType === 'GROUP' ? '-' : formatLongDate(member?.birthDate)
  const memberNationality =
    contract.contractType === 'GROUP'
      ? '-'
      : member?.nationality
        ? getNationalityNameByGender(member.nationality, member?.gender)
        : '-'
  const memberIdDocument = contract.contractType === 'GROUP' ? '-' : member?.identityDocumentNumber || '-'
  const memberPhone1 = contract.contractType === 'GROUP' ? '-' : member?.contacts?.[0] || '-'
  const memberPhone2 = contract.contractType === 'GROUP' ? '-' : member?.contacts?.[1] || '-'
  const memberGender =
    contract.contractType === 'GROUP' ? '-' : member?.gender ? String(member.gender).toUpperCase() : '-'
  const memberAge = contract.contractType === 'GROUP' ? '-' : getAge(member?.birthDate)
  const memberQuarter =
    contract.contractType === 'GROUP'
      ? '-'
      : member?.address?.district || member?.address?.arrondissement || member?.address?.city || '-'
  const memberProfession =
    contract.contractType === 'GROUP' ? '-' : member?.profession || member?.companyName || '-'
  const emergencyContactName = contract.emergencyContact
    ? `${contract.emergencyContact.lastName || ''} ${contract.emergencyContact.firstName || ''}`.trim() || 'INCONNU'
    : 'INCONNU'
  const emergencyRelation = contract.emergencyContact?.relationship || '-'
  const emergencyPhone1 = contract.emergencyContact?.phone1 || '-'
  const emergencyPhone2 = contract.emergencyContact?.phone2 || '-'
  const emergencyId = contract.emergencyContact?.idNumber || '-'
  const unpaidCount = sortedPayments.filter((p) => p.status !== 'PAID').length
  const paidCount = sortedPayments.filter((p) => p.status === 'PAID').length
  const isJournalierType =
    contract.caisseType === 'JOURNALIERE' || contract.caisseType === 'JOURNALIERE_CHARITABLE'
  const totalCotisation = isJournalierType
    ? sortedPayments.length * (Number(contract.monthlyAmount) || 0)
    : sortedPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
  const totalPaid = isJournalierType
    ? sortedPayments.reduce((sum, p) => {
        if (p.contribs && Array.isArray(p.contribs)) {
          return sum + (p.contribs as any[]).reduce((s, c) => s + (Number(c.amount) || 0), 0)
        }
        return sum + (Number((p as any).accumulatedAmount) || 0)
      }, 0)
    : sortedPayments.filter((p) => p.status === 'PAID').reduce((sum, p) => sum + (p.amount || 0), 0)
  const totalUnpaid = Math.max(totalCotisation - totalPaid, 0)
  const totalPenalties = sortedPayments.reduce((sum, p) => sum + ((p as any).penaltyApplied || 0), 0)

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
    doc.text('HISTORIQUE VERSEMENT CAISSE SPECIALE', pageWidth / 2, 18, { align: 'center' })
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
  const drawPaymentBlock = (payment: any, startY: number) => {
    const headerHeight = 8,
      titleHeight = 8
    const columns = [43, 41, 33, 18, 34, 36, 64]
    const isJournalierType =
      contract.caisseType === 'JOURNALIERE' || contract.caisseType === 'JOURNALIERE_CHARITABLE'

    doc.setFillColor(...colors.headerFill)
    doc.setDrawColor(...colors.line)
    doc.setLineWidth(0.2)
    doc.rect(marginX, startY, contentWidth, titleHeight, 'FD')
    doc.setFont('times', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...colors.navy)

    if (isJournalierType) {
      const bounds = getJournalierPeriodBounds(payment)
      const titleText = bounds
        ? `VERSEMENT ${payment.dueMonthIndex + 1} DU ${formatShortDate(bounds.start)} AU ${formatShortDate(bounds.end)}`
        : `VERSEMENT ${payment.dueMonthIndex + 1} DU ${formatLongDate(payment.dueAt)}`
      doc.text(titleText, marginX + 3, startY + 5.4)
    } else {
      doc.text(
        `VERSEMENT ${payment.dueMonthIndex + 1} DU ${formatLongDate(payment.dueAt)}`,
        marginX + 3,
        startY + 5.4
      )
    }
    const tableY = startY + titleHeight

    // Bouton "PDF" (single versement) : tableau journalier détaillé 30 jours (18+12) + total
    if (isJournalierType) {
      const bounds = getJournalierPeriodBounds(payment)
      const contribs = Array.isArray(payment.contribs) ? payment.contribs : []
      const dayCount = PERIOD_DAYS
      const dates: Date[] = []
      if (bounds) {
        for (let d = 0; d < dayCount; d++) {
          const day = new Date(bounds.start)
          day.setDate(day.getDate() + d)
          dates.push(day)
        }
      }
      const findContribForDate = (date: Date): any => {
        const y = date.getFullYear()
        const m = date.getMonth()
        const d = date.getDate()
        return contribs.find((c: any) => {
          const paid = toDateSafe(c.paidAt)
          if (!paid) return false
          return paid.getFullYear() === y && paid.getMonth() === m && paid.getDate() === d
        })
      }
      const getAdminNameFromContrib = (contrib: any, payment: any): string => {
        const id = contrib?.updatedBy ?? contrib?.createdBy ?? payment?.updatedBy ?? ''
        const label = getAdminDisplayName(id)
        if (!label || label === 'Chargement...') return id || '-'
        return label
      }

      const ROWS_PER_PAGE = 18
      const headers = ['DATE ECHEANCE', 'DATE REMISE', 'MONTANT', 'HEURE', 'MOYEN /TRANS', 'AGENT', 'REMARQUE']

      const totalAmount = contribs.reduce((sum: number, c: any) => sum + (Number(c.amount) || 0), 0)

      const drawJournalierTableChunk = (
        chunkRows: Date[],
        chunkStartY: number,
        options?: { totalAmount?: number }
      ) => {
        const hasTotalRow = options?.totalAmount != null
        const chunkHeight =
          headerHeight + chunkRows.length * rowHeight + (hasTotalRow ? rowHeight : 0)
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
          const contrib = findContribForDate(date)
          const rowValues = contrib
            ? [
                formatShortDate(date),
                formatShortDate(contrib.paidAt),
                `${formatAmountForPDF(Number(contrib.amount) || 0)} FCFA`,
                contrib.time || '-',
                formatMode(contrib.mode),
                getAdminNameFromContrib(contrib, payment),
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
          const totalRowValues = [
            'TOTAL',
            '-',
            `${formatAmountForPDF(options!.totalAmount!)} FCFA`,
            '-',
            '-',
            '-',
            '-',
          ]
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

      const rowsToRender =
        bounds && dates.length > 0
          ? dates
          : bounds
            ? Array.from({ length: dayCount }, (_, i) => {
                const d = new Date(bounds.start)
                d.setDate(d.getDate() + i)
                return d
              })
            : []

      const firstChunk = rowsToRender.slice(0, ROWS_PER_PAGE)
      const secondChunk = rowsToRender.slice(ROWS_PER_PAGE)

      const tableYFirst = startY + titleHeight
      drawJournalierTableChunk(firstChunk, tableYFirst)

      if (secondChunk.length > 0) {
        doc.addPage()
        drawPageBackground()
        drawMainTitle()
        const suiteTableY = 28
        drawJournalierTableChunk(secondChunk, suiteTableY, { totalAmount })
        return suiteTableY + headerHeight + secondChunk.length * rowHeight + rowHeight
      }

      return startY + titleHeight + headerHeight + firstChunk.length * rowHeight
    }

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

    const isPaymentCompleted = payment.status === 'PAID' || Boolean(payment.paidAt)
    const displayedAmount = isPaymentCompleted ? payment.amount || 0 : 0
    const rowValues = [
      formatLongDate(payment.dueAt),
      formatLongDate(payment.paidAt),
      `${formatAmountForPDF(displayedAmount)} FCFA`,
      payment.time || '-',
      formatMode(payment.mode),
      getAdminNameForExport(payment),
      getPaymentRemark(payment),
    ]
    cursorX = marginX
    rowValues.forEach((value, index) => {
      const width = columns[index]
      doc.setFont('times', 'normal')
      doc.setFontSize(8.9)
      doc.setTextColor(18, 18, 18)
      doc.text(value, cursorX + width / 2, tableY + headerHeight + 5.3, { align: 'center' })
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
      {
        leftLabel: 'MATRICULE',
        leftValue: memberMatricule,
        rightLabel: 'ANNEE',
        rightValue: String(new Date().getFullYear()),
      },
      { leftLabel: 'MEMBRE', leftValue: '', rightLabel: 'CODE', rightValue: (contract.id || contractId).slice(0, 16) },
      { leftLabel: 'NOM', leftValue: memberLastName, rightLabel: 'PRENOM', rightValue: memberFirstName },
      {
        leftLabel: 'LIEU / NAISSANCE',
        leftValue: memberBirthPlace,
        rightLabel: 'D.NAISS',
        rightValue: memberBirthDate,
      },
      {
        leftLabel: 'NATIONALITE',
        leftValue: memberNationality,
        rightLabel: 'N°CNI/PASS/CS',
        rightValue: memberIdDocument,
      },
      {
        leftLabel: 'TELEPHONE 1',
        leftValue: memberPhone1,
        rightLabel: 'TELEPHONE 2',
        rightValue: memberPhone2,
      },
      { leftLabel: 'SEXE', leftValue: memberGender, rightLabel: 'AGE', rightValue: memberAge },
      { leftLabel: 'QUARTIER', leftValue: memberQuarter, rightLabel: 'PROFESSION', rightValue: memberProfession },
    ],
    yCursor
  )
  drawSectionTitle('Informations Concernant Le Contact Urgent', yCursor + 9)
  drawGridRows(
    [
      { leftLabel: 'NOM', leftValue: emergencyContactName, rightLabel: 'LIEN', rightValue: emergencyRelation },
      {
        leftLabel: 'TELEPHONE 1',
        leftValue: emergencyPhone1,
        rightLabel: 'TELEPHONE 2',
        rightValue: emergencyPhone2,
      },
      {
        leftLabel: 'N°CNI/PASS/CS',
        leftValue: emergencyId,
        rightLabel: '',
        rightValue: '',
      },
    ],
    yCursor + 17.2
  )

  // Page 2
  doc.addPage()
  drawPageBackground()
  drawMainTitle()
  if (!skipPage2Tables) {
    drawSectionTitle('Informations concernant la Caisse Spéciale', 30)
    const typesWithEmptyAmount = ['LIBRE', 'LIBRE_CHARITABLE', 'JOURNALIERE', 'JOURNALIERE_CHARITABLE']
    const hideAmountAndObservation = typesWithEmptyAmount.includes(contract.caisseType || '')
    const contractRows = [
      {
        leftLabel: 'DEBUT CAISSE.S',
        leftValue: formatLongDate(contract.contractStartAt),
        rightLabel: 'FIN CAISSE.S',
        rightValue: formatLongDate(contract.contractEndAt),
      },
      {
        leftLabel: 'STATUT',
        leftValue: translateContractStatus(contract.status || ''),
        rightLabel: 'CONTRAT',
        rightValue: contract.id || contractId,
      },
      {
        leftLabel: 'TYPE CAISSE.S',
        leftValue: caisseTypeLabel,
        rightLabel: 'MONTANT',
        rightValue: hideAmountAndObservation ? '' : `${formatAmountForPDF(contract.monthlyAmount || 0)} FCFA`,
      },
      {
        leftLabel: 'ANNEE INSCRIT',
        leftValue: String(toDateSafe(contract.createdAt)?.getFullYear() || new Date().getFullYear()),
        rightLabel: 'DUREE',
        rightValue: `${contract.monthsPlanned || 0} MOIS`,
      },
      { leftLabel: 'DATE REMISE', leftValue: '', rightLabel: 'OBSERVATION', rightValue: '' },
    ]
    drawGridRows(contractRows, 38.2)
    drawGridRows(
      [
        {
          leftLabel: 'NOMBRE DE VERSEMENT',
          leftValue: String(paidCount),
          rightLabel: 'MOIS IMPAYE',
          rightValue: String(unpaidCount),
        },
        {
          leftLabel: 'MONTANT PAYE',
          leftValue: `${formatAmountForPDF(totalPaid)} FCFA`,
          rightLabel: 'MONTANT IMPAYE',
          rightValue: `${formatAmountForPDF(totalUnpaid)} FCFA`,
        },
        {
          leftLabel: 'TOTAL PENALITES',
          leftValue: `${formatAmountForPDF(totalPenalties)} FCFA`,
          rightLabel: 'TAXI',
          rightValue: '',
        },
      ],
      90,
      { leftLabelWidth: 50, rightLabelWidth: 46, labelFontSize: 8.8, valueFontSize: 9.4 }
    )
  }
  return { drawPaymentBlock, pageWidth, pageHeight, drawPageBackground, drawMainTitle }
}

export type GenerateSingleVersementPdfParams = {
  contract: any
  contractId: string
  member: any
  group: any
  payments: any[]
  payment: any
  getAdminDisplayName: (adminId: string) => string
}

/** Génère et télécharge le PDF "historique versement" pour un seul versement (même format que la page versements > PDF). */
export async function generateSingleVersementPDF(params: GenerateSingleVersementPdfParams): Promise<void> {
  const { contract, contractId, member, group, payments, payment, getAdminDisplayName } = params
  const logoDataUrl = await loadLogoDataUrl()
  const sortedPayments = [...payments].sort((a, b) => a.dueMonthIndex - b.dueMonthIndex)
  const doc = new jsPDF('l', 'mm', 'a4')
  const { drawPaymentBlock, pageWidth, pageHeight } = buildVersementPDFFirstTwoPages(doc, {
    contract,
    contractId,
    member,
    group,
    sortedPayments,
    logoDataUrl,
    getAdminDisplayName,
    skipPage2Tables: true,
  })
  drawPaymentBlock(payment, 30)
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
  doc.save(`versement_${contractId}_M${payment.dueMonthIndex + 1}_${dateStr}.pdf`)
}
