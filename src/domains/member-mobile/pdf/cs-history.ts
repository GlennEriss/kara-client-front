/* eslint-disable no-restricted-imports -- Réutilise le gabarit officiel des versements après contrôle de propriété membre. */
// Parcours et pagination : kara-members-front/features/caisse-speciale/services/versementPdfExport.ts.
import jsPDF from 'jspdf'
import { buildVersementPDFFirstTwoPages } from '@/services/caisse/versementPdfExport'
import type { FinancePdfDelivery } from '@/services/finance-pdf-delivery'
export type GenerateFullVersementPdfParams = {
  contract: any
  contractId: string
  member: any
  group: any
  payments: any[]
  getAdminDisplayName: (id: string) => string
}
export async function generateFullVersementPDF(
  params: GenerateFullVersementPdfParams,
  delivery: FinancePdfDelivery,
): Promise<void> {
  const { contract, contractId, member, group, payments, getAdminDisplayName } =
    params
  const logoDataUrl = delivery.logo
  const sortedPayments = [...payments].sort(
    (a, b) => a.dueMonthIndex - b.dueMonthIndex,
  )
  const doc = new jsPDF('l', 'mm', 'a4')
  const {
    drawPaymentBlock,
    pageWidth,
    pageHeight,
    drawPageBackground,
    drawMainTitle,
  } = buildVersementPDFFirstTwoPages(doc, {
    contract,
    contractId,
    member,
    group,
    sortedPayments,
    logoDataUrl,
    getAdminDisplayName,
  })

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
    `historique_versement_caisse_speciale_${contractId}_${dateStr}.pdf`,
  )
}
