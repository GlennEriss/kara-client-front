import { getNationalityName } from '@/constantes/nationality'
import { CommissionPaymentPlacement, PaymentMode, Placement, User } from '@/types/types'
import {
  drawFactureCreditSpecialPage1,
  loadFactureCreditSpecialLogoDataUrl,
  type FactureCreditSpecialPage1Data,
} from '@/services/credit-speciale/factureCreditSpecialPdfExport'
import jsPDF from 'jspdf'

const PAYMENT_MODE_LABELS: Record<PaymentMode, string> = {
  airtel_money: 'Airtel Money',
  mobicash: 'Mobicash',
  cash: 'Espèce',
  bank_transfer: 'Virement bancaire',
  other: 'Autre',
}

type PlacementVersementFactureData = {
  reference: string
  dueDate: Date | string
  paidAt?: Date | string
  amount: number
  placementAmount: number
  rate: number
  paymentMode?: PaymentMode
  withFees?: boolean
  paymentMethodOther?: string
  comment?: string
}

type GeneratePlacementFactureOptions = {
  page1Data: FactureCreditSpecialPage1Data
  versements: PlacementVersementFactureData[]
  filename: string
  title?: string
}

const MARGIN = 15
const ROW_HEIGHT_MM = 11
const PAGE_FILL = [247, 249, 252] as [number, number, number]
const NAVY = [21, 62, 96] as [number, number, number]
const LABEL_FILL = [236, 242, 248] as [number, number, number]

const formatDate = (value?: Date | string) => {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('fr-FR')
}

const formatLongDate = (value?: string) => {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

const formatTime = (value?: Date | string) => {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

const getAgeFromBirthDate = (birthDate?: string): string => {
  if (!birthDate) return '-'
  const birth = new Date(birthDate)
  if (Number.isNaN(birth.getTime())) return '-'
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age -= 1
  return age > 0 ? `${age} ANS` : '-'
}

const formatAmount = (amount: number) => `${Math.round(amount).toLocaleString('fr-FR')} FCFA`

const resolvePaymentLabel = (mode?: PaymentMode, paymentMethodOther?: string) => {
  if (!mode) return 'Non renseigné'
  if (mode === 'other') return paymentMethodOther?.trim() || 'Autre'
  return PAYMENT_MODE_LABELS[mode]
}

const drawVersementPage = (
  doc: jsPDF,
  versement: PlacementVersementFactureData,
  index: number,
  totalPages: number
) => {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const contentWidth = pageWidth - 2 * MARGIN
  const colLabelWidth = contentWidth * 0.38
  const colValueWidth = contentWidth * 0.62

  doc.setFillColor(...PAGE_FILL)
  doc.rect(0, 0, pageWidth, pageHeight, 'F')
  doc.setDrawColor(...NAVY)
  doc.setLineWidth(0.7)
  doc.rect(8, 8, pageWidth - 16, pageHeight - 16)

  let y = MARGIN
  doc.setFont('times', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...NAVY)
  doc.text(`VERSEMENT DU: ${formatDate(versement.paidAt || versement.dueDate)}`, MARGIN, y)
  y += 10

  const rows: Array<{ label: string; value: string }> = [
    { label: 'CAPITAL DE BASE', value: formatAmount(versement.placementAmount) },
    { label: 'TAUX COMMISSION', value: `${versement.rate}%` },
    { label: 'MONTANT COMMISSION', value: formatAmount(versement.amount) },
    { label: 'MONTANT VERSE', value: formatAmount(versement.amount) },
    { label: 'DATE ECHEANCE', value: formatDate(versement.dueDate) },
    { label: 'DATE VERSEMENT', value: formatDate(versement.paidAt) },
    { label: 'HEURE VERSEMENT', value: formatTime(versement.paidAt) },
    { label: 'MOYEN', value: resolvePaymentLabel(versement.paymentMode, versement.paymentMethodOther) },
    {
      label: 'FRAIS',
      value:
        versement.paymentMode === 'airtel_money' || versement.paymentMode === 'mobicash'
          ? versement.withFees === true
            ? 'AVEC FRAIS'
            : versement.withFees === false
            ? 'SANS FRAIS'
            : 'NON RENSEIGNE'
          : '-',
    },
    { label: 'REFERENCE', value: versement.reference },
    { label: 'REMARQUE', value: versement.comment || 'Aucune remarque' },
  ]

  rows.forEach((row, rowIndex) => {
    const rowY = y + rowIndex * ROW_HEIGHT_MM

    doc.setFillColor(...LABEL_FILL)
    doc.rect(MARGIN, rowY, colLabelWidth, ROW_HEIGHT_MM, 'FD')
    doc.setDrawColor(...NAVY)
    doc.setLineWidth(0.25)
    doc.rect(MARGIN, rowY, colLabelWidth, ROW_HEIGHT_MM, 'S')

    doc.setFillColor(255, 255, 255)
    doc.rect(MARGIN + colLabelWidth, rowY, colValueWidth, ROW_HEIGHT_MM, 'FD')
    doc.setDrawColor(...NAVY)
    doc.rect(MARGIN + colLabelWidth, rowY, colValueWidth, ROW_HEIGHT_MM, 'S')

    doc.setFont('times', 'bolditalic')
    doc.setFontSize(9)
    doc.setTextColor(0, 0, 0)
    doc.text(row.label, MARGIN + colLabelWidth / 2, rowY + ROW_HEIGHT_MM / 2 + 1.5, { align: 'center' })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    const value = row.value.length > 45 ? `${row.value.slice(0, 42)}...` : row.value
    doc.text(value, MARGIN + colLabelWidth + colValueWidth / 2, rowY + ROW_HEIGHT_MM / 2 + 1.5, { align: 'center' })
  })

  doc.setFont('times', 'italic')
  doc.setFontSize(8.5)
  doc.setTextColor(90, 90, 90)
  doc.text(
    `Page ${index} sur ${totalPages} - Généré le ${new Date().toLocaleDateString('fr-FR')}`,
    pageWidth / 2,
    pageHeight - 9,
    { align: 'center' }
  )
}

export const buildPlacementFacturePage1Data = (
  placement: Placement,
  member?: User | null
): FactureCreditSpecialPage1Data => {
  const [fallbackLastName = '-', ...firstNames] = (placement.benefactorName || '').trim().split(/\s+/)
  const fallbackFirstName = firstNames.join(' ') || '-'
  const memberQuarter =
    member?.address?.additionalInfo ||
    [member?.address?.city, member?.address?.district].filter(Boolean).join(', ') ||
    '-'
  const emergencyName = `${placement.urgentContact?.name || '-'} ${placement.urgentContact?.firstName || ''}`.trim()

  return {
    contractId: placement.id,
    memberMatricule: member?.matricule ?? placement.benefactorId,
    memberLastName: member?.lastName || fallbackLastName,
    memberFirstName: member?.firstName || fallbackFirstName,
    memberBirthPlace: member?.birthPlace || '-',
    memberBirthDateFormatted: formatLongDate(member?.birthDate),
    memberNationality: getNationalityName(member?.nationality),
    memberIdDocument: member?.identityDocumentNumber || '-',
    memberPhone1: member?.contacts?.[0] || placement.benefactorPhone || '-',
    memberPhone2: member?.contacts?.[1] || '-',
    memberGender: member?.gender ? String(member.gender).toUpperCase() : '-',
    memberAge: getAgeFromBirthDate(member?.birthDate),
    memberQuarter,
    memberProfession: member?.profession || '-',
    emergencyName: emergencyName || '-',
    emergencyRelation: placement.urgentContact?.relationship || '-',
    emergencyPhone1: placement.urgentContact?.phone || '-',
    emergencyPhone2: placement.urgentContact?.phone2 || '-',
    emergencyId:
      placement.urgentContact?.typeId || placement.urgentContact?.idNumber
        ? `${placement.urgentContact?.typeId || ''} ${placement.urgentContact?.idNumber || ''}`.trim()
        : '-',
  }
}

export const generatePlacementFacturePDF = async ({
  page1Data,
  versements,
  filename,
  title = 'HISTORIQUE VERSEMENTS PLACEMENT',
}: GeneratePlacementFactureOptions) => {
  if (!versements.length) {
    throw new Error('Aucun versement disponible pour générer la facture')
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const logoData = await loadFactureCreditSpecialLogoDataUrl()
  const totalPages = 1 + versements.length

  drawFactureCreditSpecialPage1(doc, page1Data, logoData, 1, totalPages, title)

  versements.forEach((versement, index) => {
    doc.addPage()
    drawVersementPage(doc, versement, index + 2, totalPages)
  })

  doc.save(filename)
}

export const mapCommissionToPlacementVersement = (params: {
  placement: Placement
  commission: CommissionPaymentPlacement
}): PlacementVersementFactureData => {
  const { placement, commission } = params
  return {
    reference: `${placement.id.slice(-8).toUpperCase()}-${commission.id.slice(-6).toUpperCase()}`,
    dueDate: commission.dueDate,
    paidAt: commission.paidAt,
    amount: commission.amount,
    placementAmount: placement.amount,
    rate: placement.rate,
    paymentMode: commission.paymentMode,
    withFees: commission.withFees,
    paymentMethodOther: commission.paymentMethodOther,
    comment: commission.status === 'Paid' ? 'Commission réglée' : 'Commission non réglée',
  }
}
