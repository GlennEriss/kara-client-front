/* eslint-disable no-restricted-imports -- Adaptateur du générateur membre vers la livraison serveur authentifiée. */
// Source : kara-members-front/features/caisse-imprevue/services/versementCIPdfExport.ts.
// Historique complet conservé ; seul le chargement du logo et la livraison changent.
import jsPDF from 'jspdf'
import type { MemberData as PaymentCI } from '../server/access'
import { addMonths, parseISO } from 'date-fns'
import { CONTRACT_CI_STATUS_LABELS } from '@/types/types'
import { getContractEndDate as getCIContractEndDate } from '@/utils/caisse-imprevue-utils'
import type { FinancePdfDelivery } from '@/services/finance-pdf-delivery'
const formatAmountForPDF = (n: number): string =>
  Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
export type GenerateFullVersementCIPdfParams = {
  contract: any
  contractId: string
  member: any
  payments: any[]
  getAdminDisplayName: (adminId: string | undefined) => string
}

/**
 * Historique complet des versements d'un contrat Caisse Imprévue.
 *
 * Port fidèle du bouton « Exporter PDF » de la page admin
 * `/caisse-imprevue/contrats/[id]/versements`.
 */
export async function generateFullVersementCIPDF(
  params: GenerateFullVersementCIPdfParams,
  delivery: FinancePdfDelivery,
): Promise<void> {
  const { contract, contractId, member, payments, getAdminDisplayName } = params
  if (!payments.length || !contract) return

  const logoDataUrl = delivery.logo
  const sortedPayments = [...payments].sort(
    (a, b) => a.monthIndex - b.monthIndex,
  )
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
    if (typeof (value as any)?.toDate === 'function')
      return (value as any).toDate()
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
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const formatShortDate = (value: unknown): string => {
    const date = toDateSafe(value)
    if (!date) return '-'
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  /**
   * Moyen de paiement sur 1 ou 2 lignes : le qualificatif passe en dessous pour
   * ne plus déborder de la colonne MOYEN /TRANS.
   */
  const formatMode = (
    mode?: string,
    source?: { withFees?: boolean; paymentMethodOther?: string },
  ): string | string[] => {
    const modeMap: Record<string, string> = {
      airtel_money: 'AIRTEL-MONEY',
      mobicash: 'MOBICASH',
      cash: 'CASH',
      bank_transfer: 'VIREMENT',
      other: 'AUTRE',
    }
    if (!mode) return '-'
    const base = modeMap[mode] || String(mode).toUpperCase()

    if (mode === 'other' && source?.paymentMethodOther?.trim()) {
      return [base, `(${source.paymentMethodOther.trim().toUpperCase()})`]
    }
    if (
      (mode === 'airtel_money' || mode === 'mobicash') &&
      source?.withFees !== undefined
    ) {
      return [base, source.withFees ? '(AVEC FRAIS)' : '(SANS FRAIS)']
    }
    return base
  }

  /**
   * Dessine la valeur d'une cellule, sur une ou deux lignes. La seconde ligne
   * est en corps réduit et rognée à la largeur de colonne : deux lignes tiennent
   * dans la hauteur de ligne existante, une troisième déborderait.
   */
  const drawCellValue = (
    value: string | string[],
    centerX: number,
    rowTopY: number,
    columnWidth: number,
    fontSize = 8.9,
  ) => {
    const lines = Array.isArray(value) ? value : [String(value ?? '')]
    doc.setFont('times', 'normal')
    doc.setTextColor(18, 18, 18)

    if (lines.length < 2) {
      doc.setFontSize(fontSize)
      doc.text(String(lines[0] ?? ''), centerX, rowTopY + 5.3, {
        align: 'center',
      })
      return
    }

    doc.setFontSize(fontSize)
    doc.text(String(lines[0]), centerX, rowTopY + 3.6, { align: 'center' })
    doc.setFontSize(fontSize - 1.5)
    // Une seule ligne de qualificatif tient : au-delà on tronque avec une
    // ellipsis, en refermant la parenthèse pour rester lisible.
    const raw = String(lines[1])
    const parts = doc.splitTextToSize(raw, columnWidth - 3)
    const second =
      parts.length > 1
        ? `${String(parts[0]).trimEnd()}…${raw.endsWith(')') ? ')' : ''}`
        : String(parts[0] ?? raw)
    doc.text(second, centerX, rowTopY + 7, { align: 'center' })
    doc.setFontSize(fontSize)
  }

  const getAge = (birthDate?: string): string => {
    if (!birthDate) return '-'
    const birth = toDateSafe(birthDate)
    if (!birth) return '-'
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate()))
      age -= 1
    return age > 0 ? `${age} ANS` : '-'
  }

  const getPaymentDueAt = (payment: PaymentCI): Date | null => {
    const first = toDateSafe(contract.firstPaymentDate)
    if (!first) return null
    return addMonths(first, payment.monthIndex)
  }

  const getPaymentPaidAt = (payment: PaymentCI): Date | null => {
    const lastVersement = payment.versements?.length
      ? payment.versements[payment.versements.length - 1]
      : null
    return lastVersement?.date ? toDateSafe(lastVersement.date) : null
  }

  const getPaymentTime = (payment: PaymentCI): string => {
    const lastVersement = payment.versements?.length
      ? payment.versements[payment.versements.length - 1]
      : null
    return lastVersement?.time || '-'
  }

  const getPaymentMode = (payment: PaymentCI): string | string[] => {
    const lastVersement = payment.versements?.length
      ? payment.versements[payment.versements.length - 1]
      : null
    return lastVersement?.mode
      ? formatMode(lastVersement.mode, lastVersement)
      : '-'
  }

  const getPaymentPenaltyAmount = (payment: PaymentCI): number => {
    return (payment.versements || []).reduce(
      (sum: number, v: any) => sum + (v.penalty || 0),
      0,
    )
  }

  const getPaymentPenaltyDays = (payment: PaymentCI): number => {
    return Math.max(
      0,
      ...(payment.versements || []).map((v: any) => v.daysLate || 0),
    )
  }

  const getPaymentRemark = (payment: PaymentCI): string => {
    if (payment.status === 'PAID') {
      const penaltyDays = getPaymentPenaltyDays(payment)
      const penaltyAmount = getPaymentPenaltyAmount(payment)
      if (penaltyAmount > 0 || penaltyDays > 0) return `RETARD ${penaltyDays}J`
      return 'CONFORME'
    }
    if (payment.status === 'PARTIAL') return 'PARTIEL'
    const dueAt = getPaymentDueAt(payment)
    if (dueAt && new Date() > dueAt) return 'IMPAYE'
    return 'EN ATTENTE'
  }

  const getAdminNameForExport = (payment: PaymentCI): string => {
    const label = getAdminDisplayName(payment.updatedBy)
    if (!label || label === 'Chargement...') return payment.updatedBy || '-'
    return label
  }

  const isQuotidien = contract.paymentFrequency !== 'MONTHLY'
  const PERIOD_DAYS = 30
  const getQuotidienPeriodBounds = (
    p: PaymentCI,
  ): { start: Date; end: Date } | null => {
    const first = toDateSafe(contract.firstPaymentDate)
    if (!first) return null
    const start = addMonths(first, p.monthIndex)
    const end = new Date(start)
    end.setDate(end.getDate() + PERIOD_DAYS - 1)
    return { start, end }
  }

  const memberLastName =
    member?.lastName || contract.memberLastName || 'INCONNU'
  const memberFirstName =
    member?.firstName || contract.memberFirstName || 'INCONNU'
  const memberMatricule =
    member?.matricule || contract.memberId || contract.id || '-'
  const memberBirthPlace = member?.birthPlace || '-'
  const memberBirthDate = formatLongDate(
    member?.birthDate || contract.memberBirthDate,
  )
  const memberNationality =
    member?.nationality || contract.memberNationality || '-'
  const memberIdDocument = member?.identityDocumentNumber || '-'
  const memberPhone1 =
    member?.contacts?.[0] || contract.memberContacts?.[0] || '-'
  const memberPhone2 =
    member?.contacts?.[1] || contract.memberContacts?.[1] || '-'
  const memberGender =
    member?.gender || contract.memberGender
      ? String(member?.gender || contract.memberGender).toUpperCase()
      : '-'
  const memberAge = getAge(member?.birthDate || contract.memberBirthDate)
  const memberQuarter =
    member?.address?.district ||
    member?.address?.arrondissement ||
    member?.address?.city ||
    contract.memberAddress ||
    '-'
  const memberProfession =
    member?.profession || contract.memberProfession || '-'

  const emergencyContactName = contract.emergencyContact
    ? `${contract.emergencyContact.lastName || ''} ${contract.emergencyContact.firstName || ''}`.trim() ||
      'INCONNU'
    : 'INCONNU'
  const emergencyRelation = contract.emergencyContact?.relationship || '-'
  const emergencyPhone1 = contract.emergencyContact?.phone1 || '-'
  const emergencyPhone2 = contract.emergencyContact?.phone2 || '-'
  const emergencyId = contract.emergencyContact?.idNumber || '-'

  const unpaidCount = sortedPayments.filter(
    (payment) => payment.status !== 'PAID',
  ).length
  const paidCount = sortedPayments.filter(
    (payment) => payment.status === 'PAID',
  ).length
  const totalCotisation = sortedPayments.reduce(
    (sum, payment) => sum + (payment.targetAmount || 0),
    0,
  )
  const totalPaid = sortedPayments.reduce(
    (sum, payment) => sum + (payment.accumulatedAmount || 0),
    0,
  )
  const totalUnpaid = Math.max(totalCotisation - totalPaid, 0)
  const totalPenalties = sortedPayments.reduce(
    (sum, payment) => sum + getPaymentPenaltyAmount(payment),
    0,
  )
  const firstPaidDate = sortedPayments
    .flatMap((p) => p.versements || [])
    .map((v) => toDateSafe(v.date))
    .filter((d): d is Date => Boolean(d))
    .sort((a, b) => a.getTime() - b.getTime())[0]

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
      doc.addImage(
        logoDataUrl.dataUrl,
        'PNG',
        marginX,
        logoY,
        logoWidth,
        logoHeight,
      )
    }
    doc.setFont('times', 'bold')
    doc.setFontSize(15)
    doc.setTextColor(...colors.navy)
    doc.text('HISTORIQUE VERSEMENT CAISSE IMPREVUE', pageWidth / 2, 18, {
      align: 'center',
    })
    doc.setFontSize(10)
    doc.setTextColor(45, 45, 45)
    doc.text(`Contrat : ${contract.id || contractId}`, pageWidth / 2, 23, {
      align: 'center',
    })
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
    rows: Array<{
      leftLabel: string
      leftValue: string
      rightLabel: string
      rightValue: string
    }>,
    startY: number,
    options?: {
      leftLabelWidth?: number
      rightLabelWidth?: number
      labelFontSize?: number
      valueFontSize?: number
    },
  ) => {
    const rowHeight = 8
    const halfWidth = contentWidth / 2
    const leftLabelWidth = options?.leftLabelWidth ?? 33
    const rightLabelWidth = options?.rightLabelWidth ?? 33
    const labelFontSize = options?.labelFontSize ?? 9.2
    const valueFontSize = options?.valueFontSize ?? 9.2
    const totalHeight = rows.length * rowHeight
    doc.setDrawColor(...colors.line)
    doc.setLineWidth(0.2)
    doc.rect(marginX, startY, contentWidth, totalHeight)
    doc.line(
      marginX + halfWidth,
      startY,
      marginX + halfWidth,
      startY + totalHeight,
    )
    doc.line(
      marginX + leftLabelWidth,
      startY,
      marginX + leftLabelWidth,
      startY + totalHeight,
    )
    doc.line(
      marginX + halfWidth + rightLabelWidth,
      startY,
      marginX + halfWidth + rightLabelWidth,
      startY + totalHeight,
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
      doc.text(
        row.rightValue,
        marginX + halfWidth + rightLabelWidth + 2,
        y + 5.3,
      )
    })
    return startY + totalHeight
  }

  const drawPaymentBlock = (payment: PaymentCI, startY: number) => {
    const headerHeight = 8
    const valuesHeight = 8
    const titleHeight = 8
    const totalHeight = titleHeight + headerHeight + valuesHeight
    const columns = [43, 41, 33, 18, 34, 36, 64]

    doc.setFillColor(...colors.headerFill)
    doc.setDrawColor(...colors.line)
    doc.setLineWidth(0.2)
    doc.rect(marginX, startY, contentWidth, titleHeight, 'FD')
    doc.setFont('times', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...colors.navy)
    if (isQuotidien) {
      const bounds = getQuotidienPeriodBounds(payment)
      const titleText = bounds
        ? `VERSEMENT ${payment.monthIndex + 1} DU ${formatShortDate(bounds.start)} AU ${formatShortDate(bounds.end)}`
        : `VERSEMENT ${payment.monthIndex + 1} DU ${formatLongDate(getPaymentDueAt(payment))}`
      doc.text(titleText, marginX + 3, startY + 5.4)
    } else {
      doc.text(
        `VERSEMENT ${payment.monthIndex + 1} DU ${formatLongDate(getPaymentDueAt(payment))}`,
        marginX + 3,
        startY + 5.4,
      )
    }

    const tableY = startY + titleHeight
    doc.setDrawColor(...colors.line)
    doc.rect(marginX, tableY, contentWidth, headerHeight + valuesHeight)
    doc.setFillColor(225, 235, 245)
    doc.rect(marginX, tableY, contentWidth, headerHeight, 'F')

    const headers = [
      'DATE ECHEANCE',
      'DATE REMISE',
      'MONTANT',
      'HEURE',
      'MOYEN /TRANS',
      'AGENT',
      'REMARQUE',
    ]
    let cursorX = marginX
    headers.forEach((header, index) => {
      const width = columns[index]
      if (index > 0)
        doc.line(cursorX, tableY, cursorX, tableY + headerHeight + valuesHeight)
      doc.setFont('times', 'bold')
      doc.setFontSize(8.7)
      doc.setTextColor(32, 32, 32)
      doc.text(header, cursorX + width / 2, tableY + 5.3, { align: 'center' })
      cursorX += width
    })

    doc.line(
      marginX,
      tableY + headerHeight,
      marginX + contentWidth,
      tableY + headerHeight,
    )

    const displayedAmount = payment.accumulatedAmount ?? 0

    const rowValues = [
      isQuotidien && getQuotidienPeriodBounds(payment)
        ? formatLongDate(getQuotidienPeriodBounds(payment)!.end)
        : formatLongDate(getPaymentDueAt(payment)),
      formatLongDate(getPaymentPaidAt(payment)),
      `${formatAmountForPDF(displayedAmount)} FCFA`,
      getPaymentTime(payment),
      getPaymentMode(payment),
      getAdminNameForExport(payment),
      getPaymentRemark(payment),
    ]

    cursorX = marginX
    rowValues.forEach((value, index) => {
      const width = columns[index]
      drawCellValue(value, cursorX + width / 2, tableY + headerHeight, width)
      cursorX += width
    })

    return startY + totalHeight
  }

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
      {
        leftLabel: 'MEMBRE',
        leftValue: 'INDIVIDUEL',
        rightLabel: 'CODE',
        rightValue: (contract.id || contractId).slice(0, 16),
      },
      {
        leftLabel: 'NOM',
        leftValue: memberLastName,
        rightLabel: 'PRENOM',
        rightValue: memberFirstName,
      },
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
      {
        leftLabel: 'SEXE',
        leftValue: memberGender,
        rightLabel: 'AGE',
        rightValue: memberAge,
      },
      {
        leftLabel: 'QUARTIER',
        leftValue: memberQuarter,
        rightLabel: 'PROFESSION',
        rightValue: memberProfession,
      },
    ],
    yCursor,
  )

  drawSectionTitle('Informations Concernant Le Contact Urgent', yCursor + 9)
  drawGridRows(
    [
      {
        leftLabel: 'NOM',
        leftValue: emergencyContactName,
        rightLabel: 'LIEN',
        rightValue: emergencyRelation,
      },
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
    yCursor + 17.2,
  )

  doc.addPage()
  drawPageBackground()
  drawMainTitle()
  drawSectionTitle('Informations concernant la Caisse Imprévue', 30)
  const endDate = getCIContractEndDate(contract)
  const contractRows = [
    {
      leftLabel: 'PRENOM',
      leftValue: memberFirstName,
      rightLabel: 'LIENS',
      rightValue: emergencyRelation,
    },
    {
      leftLabel: 'DEBUT CAISSE.I',
      leftValue: formatLongDate(contract.firstPaymentDate),
      rightLabel: 'FIN CAISSE.I',
      rightValue: formatLongDate(endDate),
    },
    {
      leftLabel: 'STATUT',
      leftValue:
        CONTRACT_CI_STATUS_LABELS[
          contract.status as keyof typeof CONTRACT_CI_STATUS_LABELS
        ] || contract.status,
      rightLabel: 'CONTRAT',
      rightValue: contract.id || contractId,
    },
    {
      leftLabel: 'FORFAIT',
      leftValue: contract.subscriptionCICode || '-',
      rightLabel: 'MONTANT',
      rightValue: `${formatAmountForPDF(contract.subscriptionCIAmountPerMonth || 0)} FCFA`,
    },
    {
      leftLabel: 'ANNEE INSCRIT',
      leftValue: String(
        toDateSafe(contract.createdAt)?.getFullYear() ||
          new Date().getFullYear(),
      ),
      rightLabel: 'DUREE',
      rightValue: `${contract.subscriptionCIDuration || 0} MOIS`,
    },
    {
      leftLabel: 'DATE REMISE',
      leftValue: formatLongDate(firstPaidDate),
      rightLabel: 'OBSERVATION',
      rightValue: 'TABLEAU RECAPITULATIF',
    },
  ]
  drawGridRows(contractRows, 38.2)

  doc.setFillColor(...colors.headerFill)
  doc.setDrawColor(...colors.line)
  doc.rect(marginX, 90, contentWidth, 8, 'FD')
  doc.setFont('times', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(...colors.navy)
  doc.text(
    'GESTION DES VERSEMENTS CAISSE IMPREVUE TABLEAU RECAPITULATIF CI-DESSOUS',
    pageWidth / 2,
    95.3,
    { align: 'center' },
  )

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
    99,
    {
      leftLabelWidth: 50,
      rightLabelWidth: 46,
      labelFontSize: 8.8,
      valueFontSize: 9.4,
    },
  )

  if (sortedPayments.length > 0) {
    drawPaymentBlock(sortedPayments[0], 130)
  }

  const remainingPayments = sortedPayments.slice(1)
  const chunkSize = 3
  for (let i = 0; i < remainingPayments.length; i += chunkSize) {
    const chunk = remainingPayments.slice(i, i + chunkSize)
    doc.addPage()
    drawPageBackground()
    drawMainTitle()
    let blockY = 30
    chunk.forEach((payment) => {
      blockY = drawPaymentBlock(payment, blockY) + 6
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
      { align: 'center' },
    )
  }

  const dateStr = new Date().toISOString().split('T')[0]
  await delivery.deliver(
    doc,
    `historique_versement_caisse_imprevue_${contractId}_${dateStr}.pdf`,
  )
}
