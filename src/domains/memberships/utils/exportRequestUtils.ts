/**
 * Utilitaires pour l'export individuel d'une demande d'adhésion
 * 
 * Fonctions pour générer PDF et Excel pour une demande unique
 */

import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { MembershipRequest } from '../entities'
import { MEMBERSHIP_REQUEST_STATUS_LABELS, PAYMENT_MODE_LABELS, PAYMENT_TYPE_LABELS } from '@/constantes/membership-requests'

/**
 * Helper pour normaliser les dates (peut être Date, Timestamp Firestore, ou string)
 */
function normalizeDate(date: any): Date {
  if (date instanceof Date) {
    return date
  } else if (date && typeof date === 'object' && 'toDate' in date && typeof date.toDate === 'function') {
    return date.toDate()
  } else {
    return new Date(date)
  }
}

/**
 * Génère un PDF pour une demande individuelle
 */
export async function generateRequestPDF(request: MembershipRequest): Promise<void> {
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
  
  doc.setFontSize(14)
  doc.text('Demande d\'adhésion', 20, 30)

  let yPos = 55

  // Informations du demandeur
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Informations du demandeur', 20, yPos)
  
  yPos += 10
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  
  const identity = request.identity
  const address = request.address
  const company = request.company
  
  doc.text(`Nom complet: ${identity.firstName} ${identity.lastName}`, 20, yPos)
  yPos += 6
  doc.text(`Email: ${identity.email || 'N/A'}`, 20, yPos)
  yPos += 6
  doc.text(`Téléphone: ${identity.contacts?.[0] || 'N/A'}`, 20, yPos)
  yPos += 6
  if (request.matricule) {
    doc.text(`Matricule: ${request.matricule}`, 20, yPos)
    yPos += 6
  }
  doc.text(`Référence demande: ${request.id || 'N/A'}`, 20, yPos)
  yPos += 6
  doc.text(`Date de naissance: ${identity.birthDate || 'N/A'}`, 20, yPos)
  yPos += 6
  doc.text(`Lieu de naissance: ${identity.birthPlace || 'N/A'}`, 20, yPos)
  yPos += 6
  doc.text(`Nationalité: ${identity.nationality || 'N/A'}`, 20, yPos)
  yPos += 6
  doc.text(`Adresse: ${address.province || ''}, ${address.city || ''}, ${address.district || ''}`, 20, yPos)

  // Statut et paiement
  yPos += 12
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Statut du dossier', 20, yPos)
  
  yPos += 10
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Statut: ${MEMBERSHIP_REQUEST_STATUS_LABELS[request.status] || request.status}`, 20, yPos)
  yPos += 6
  doc.text(`Paiement: ${request.isPaid ? 'Payé' : 'Non payé'}`, 20, yPos)
  
  const createdAt = normalizeDate(request.createdAt)
  yPos += 6
  doc.text(`Date de soumission: ${format(createdAt, 'dd/MM/yyyy à HH:mm', { locale: fr })}`, 20, yPos)

  // Paiement (si existant)
  if (request.payments && request.payments.length > 0) {
    const payment = request.payments[request.payments.length - 1] // Dernier paiement
    yPos += 12
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Détails du paiement', 20, yPos)
    
    yPos += 10
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Montant: ${payment.amount.toLocaleString('fr-FR')} FCFA`, 20, yPos)
    yPos += 6
    doc.text(`Type: ${PAYMENT_TYPE_LABELS[payment.paymentType] || payment.paymentType}`, 20, yPos)
    yPos += 6
    doc.text(`Mode: ${PAYMENT_MODE_LABELS[payment.mode] || payment.mode}`, 20, yPos)
    yPos += 6
    
    const paymentDate = normalizeDate(payment.date)
    doc.text(`Date de versement: ${format(paymentDate, 'dd/MM/yyyy', { locale: fr })} à ${payment.time}`, 20, yPos)
    yPos += 6
    
    if (payment.withFees !== undefined) {
      doc.text(`Frais: ${payment.withFees ? 'Avec frais' : 'Sans frais'}`, 20, yPos)
      yPos += 6
    }
    
    if (payment.recordedByName) {
      doc.text(`Enregistré par: ${payment.recordedByName}`, 20, yPos)
      yPos += 6
      const recordedAt = normalizeDate(payment.recordedAt)
      doc.text(`Date d'enregistrement: ${format(recordedAt, 'dd/MM/yyyy à HH:mm', { locale: fr })}`, 20, yPos)
    }
  }

  // Pied de page
  const pageHeight = doc.internal.pageSize.height
  doc.setFontSize(8)
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2])
  doc.text(`Généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}`, 20, pageHeight - 15)

  const fileName = `demande_${request.id || 'unknown'}_${format(new Date(), 'yyyyMMdd', { locale: fr })}.pdf`
  doc.save(fileName)
}

/**
 * Génère un Excel pour une demande individuelle
 */
export async function generateRequestExcel(request: MembershipRequest): Promise<void> {
  const XLSX = await import('xlsx')

  const identity = request.identity
  const address = request.address
  const company = request.company
  const documents = request.documents

  const createdAt = normalizeDate(request.createdAt)

  const payment = request.payments && request.payments.length > 0 
    ? request.payments[request.payments.length - 1] 
    : null

  const paymentDate = payment?.date ? normalizeDate(payment.date) : null

  const recordedAt = payment?.recordedAt ? normalizeDate(payment.recordedAt) : null

  const row = {
    // Références
    'Référence demande': request.id || '',
    'Matricule': request.matricule || '',
    'Date de soumission': format(createdAt, 'dd/MM/yyyy HH:mm', { locale: fr }),
    
    // Identité
    'Civilité': identity.civility || '',
    'Prénom': identity.firstName || '',
    'Nom': identity.lastName || '',
    'Date de naissance': identity.birthDate || '',
    'Lieu de naissance': identity.birthPlace || '',
    'Nationalité': identity.nationality || '',
    'Email': identity.email || '',
    'Téléphone': identity.contacts?.[0] || '',
    'Sexe': identity.gender || '',
    'État civil': identity.maritalStatus || '',
    
    // Adresse
    'Province': address.province || '',
    'Ville': address.city || '',
    'Quartier': address.district || '',
    'Arrondissement': address.arrondissement || '',
    'Info additionnelle': address.additionalInfo || '',
    
    // Entreprise
    'Entreprise': company.companyName || '',
    'Profession': company.profession || '',
    'Expérience': company.seniority || '',
    
    // Documents
    'Type pièce identité': documents.identityDocument || '',
    'Numéro pièce identité': documents.identityDocumentNumber || '',
    'Date expiration': documents.expirationDate || '',
    
    // Statut
    'Statut dossier': MEMBERSHIP_REQUEST_STATUS_LABELS[request.status] || request.status,
    'Statut paiement': request.isPaid ? 'Payé' : 'Non payé',
    
    // Paiement (si existant)
    'Montant paiement': payment?.amount || '',
    'Type paiement': payment ? (PAYMENT_TYPE_LABELS[payment.paymentType] || payment.paymentType) : '',
    'Mode paiement': payment ? (PAYMENT_MODE_LABELS[payment.mode] || payment.mode) : '',
    'Date versement': paymentDate ? format(paymentDate, 'dd/MM/yyyy', { locale: fr }) : '',
    'Heure versement': payment?.time || '',
    'Frais': payment?.withFees !== undefined ? (payment.withFees ? 'Avec frais' : 'Sans frais') : '',
    'Enregistré par': payment?.recordedByName || '',
    'Date enregistrement': recordedAt ? format(recordedAt, 'dd/MM/yyyy HH:mm', { locale: fr }) : '',
  }

  const worksheet = XLSX.utils.json_to_sheet([row])
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Demande')

  // Ajuster la largeur des colonnes
  const colWidths = Object.keys(row).map(() => ({ wch: 25 }))
  worksheet['!cols'] = colWidths

  const fileName = `demande_${request.id || 'unknown'}_${format(new Date(), 'yyyyMMdd', { locale: fr })}.xlsx`
  XLSX.writeFile(workbook, fileName)
}
