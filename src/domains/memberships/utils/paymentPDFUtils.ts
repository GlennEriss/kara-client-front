/**
 * Utilitaires pour la génération de PDF de reçu de paiement
 * 
 * Fonction pour générer un PDF de reçu de paiement d'adhésion
 */

import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { Payment, PaymentMode, TypePayment } from '@/types/types'

/**
 * Formate le mode de paiement pour l'affichage
 */
export function formatPaymentMode(mode: PaymentMode): string {
  const modeMap: Record<PaymentMode, string> = {
    airtel_money: 'Airtel Money',
    mobicash: 'Mobicash',
    cash: 'Espèces',
    bank_transfer: 'Virement bancaire',
    other: 'Autre',
  }
  return modeMap[mode] || mode
}

/**
 * Formate le type de paiement pour l'affichage
 */
export function formatPaymentType(type: TypePayment): string {
  const typeMap: Record<TypePayment, string> = {
    Membership: 'Adhésion',
    Subscription: 'Cotisation',
    Tontine: 'Tontine',
    Charity: 'Charité',
  }
  return typeMap[type] || type
}

/**
 * Normalise une date (peut être Date, Timestamp Firestore, ou string)
 */
export function normalizeDate(date: any): Date | null {
  if (!date) return null
  if (date instanceof Date) {
    return isNaN(date.getTime()) ? null : date
  }
  if (date && typeof date === 'object' && 'toDate' in date && typeof date.toDate === 'function') {
    return date.toDate()
  }
  if (typeof date === 'string' || typeof date === 'number') {
    const d = new Date(date)
    return isNaN(d.getTime()) ? null : d
  }
  return null
}

interface GeneratePaymentPDFParams {
  payment: Payment
  memberName: string
  requestId: string
  matricule?: string
  memberEmail?: string
  memberPhone?: string
}

/**
 * Génère un PDF avec les détails du paiement (reçu de paiement)
 */
export async function generatePaymentPDF({
  payment,
  memberName,
  requestId,
  matricule,
  memberEmail,
  memberPhone,
}: GeneratePaymentPDFParams): Promise<void> {
  try {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF('portrait', 'mm', 'a4')

    // Couleurs KARA
    const primaryColor: [number, number, number] = [31, 81, 255] // kara-primary-dark
    const secondaryColor: [number, number, number] = [100, 116, 139] // kara-neutral-500

    // En-tête
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.rect(0, 0, 210, 40, 'F')
    
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('KARA', 20, 20)
    
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text('Reçu de paiement – Adhésion', 20, 30)

    // Informations du membre
    let yPos = 55
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('1. Informations du membre', 20, yPos)
    
    yPos += 8
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Nom complet: ${memberName}`, 20, yPos)
    
    yPos += 6
    // Email et téléphone du membre (si fournis)
    if (memberEmail) {
      doc.text(`Email: ${memberEmail}`, 20, yPos)
      yPos += 6
    }
    if (memberPhone) {
      doc.text(`Téléphone: ${memberPhone}`, 20, yPos)
      yPos += 6
    }

    // Détails du paiement
    yPos += 12
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('2. Détails du paiement', 20, yPos)
    
    yPos += 8
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    
    const paymentDate = normalizeDate(payment.date)
    const paymentDateStr = paymentDate ? format(paymentDate, 'dd MMMM yyyy', { locale: fr }) : 'Date invalide'
    
    const paymentDetails = [
      [`Type de paiement: ${formatPaymentType(payment.paymentType)}`, `Montant payé: ${payment.amount.toLocaleString('fr-FR')} FCFA`],
      [`Date de versement: ${paymentDateStr}`, `Heure de versement: ${payment.time || '—'}`],
      [`Mode de paiement: ${formatPaymentMode(payment.mode)}`, payment.withFees !== undefined ? (payment.withFees ? 'Frais de transaction: Inclus' : 'Frais de transaction: Aucun') : ''],
      payment.paymentMethodOther ? [`Précision: ${payment.paymentMethodOther}`, ''] : ['', ''],
    ]

    paymentDetails.forEach(([left, right]) => {
      if (left) doc.text(left, 20, yPos)
      if (right) doc.text(right, 110, yPos)
      yPos += 6
    })

    // Traçabilité
    yPos += 12
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('3. Traçabilité administrative', 20, yPos)
    
    yPos += 8
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('Paiement enregistré par: Admin KARA', 20, yPos)
    
    yPos += 6
    const recordedDate = normalizeDate(payment.recordedAt)
    const recordedDateStr = recordedDate ? format(recordedDate, 'dd MMMM yyyy à HH:mm', { locale: fr }) : 'Date invalide'
    doc.text(`Date d'enregistrement: ${recordedDateStr}`, 20, yPos)

    // Référence et date de génération
    yPos += 12
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2])
    doc.text(`Référence du paiement: PAY-${requestId}`, 20, yPos)
    yPos += 6
    doc.text(`Date de génération: ${format(new Date(), 'dd MMMM yyyy', { locale: fr })}`, 20, yPos)
    
    // Signature / Cachet
    const pageHeight = doc.internal.pageSize.height
    yPos = pageHeight - 40
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    doc.text('Signature / Cachet (si impression)', 20, yPos)

    // Télécharger le PDF
    const dateForFilename = paymentDate || new Date()
    const fileName = `paiement-${requestId}-${format(dateForFilename, 'yyyyMMdd', { locale: fr })}.pdf`
    doc.save(fileName)
  } catch (error) {
    console.error('Erreur lors de la génération du PDF:', error)
    throw new Error('Impossible de générer le PDF')
  }
}
