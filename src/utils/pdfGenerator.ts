/**
 * Utilitaires pour la génération de PDF
 */

import jsPDF from 'jspdf'

/**
 * Données nécessaires pour générer le PDF des identifiants de connexion
 */
export interface CredentialsPDFData {
  firstName: string
  lastName: string
  matricule: string
  email: string
  password: string
}

/**
 * Génère un PDF contenant les identifiants de connexion du membre
 * 
 * @param data - Données du membre (nom, matricule, email, mot de passe)
 * @returns Blob du PDF généré
 * 
 * @example
 * const pdfBlob = await generateCredentialsPDF({
 *   firstName: 'Jean',
 *   lastName: 'Dupont',
 *   matricule: '1234.MK.567890',
 *   email: 'jeandupont1234@kara.ga',
 *   password: 'TempPass123!'
 * })
 */
export async function generateCredentialsPDF(data: CredentialsPDFData): Promise<Blob> {
  const doc = new jsPDF()
  
  // Couleurs KARA
  const karaBlue: [number, number, number] = [34, 77, 98] // #224D62
  const karaGold: [number, number, number] = [203, 177, 113] // #CBB171
  const darkGray: [number, number, number] = [51, 51, 51]
  const lightGray: [number, number, number] = [128, 128, 128]
  
  // Configuration de base
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  const contentWidth = pageWidth - 2 * margin
  
  let yPosition = margin
  
  // Header avec logo KARA (texte pour l'instant)
  doc.setFillColor(...karaBlue)
  doc.rect(0, 0, pageWidth, 50, 'F')
  
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text('KARA Mutuelle', margin, 30)
  
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text('Vos identifiants de connexion', margin, 40)
  
  // Retour à la couleur normale
  doc.setTextColor(...darkGray)
  yPosition = 70
  
  // Titre principal
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...karaBlue)
  doc.text('Identifiants de Connexion', margin, yPosition)
  
  yPosition += 15
  
  // Informations du membre
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...darkGray)
  doc.text(`Membre: ${data.firstName} ${data.lastName}`, margin, yPosition)
  
  yPosition += 10
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...lightGray)
  doc.text(`Matricule: ${data.matricule}`, margin, yPosition)
  
  yPosition += 20
  
  // Section Email
  doc.setFillColor(...karaGold)
  doc.rect(margin, yPosition - 8, contentWidth, 15, 'F')
  
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('Adresse Email', margin + 5, yPosition)
  
  yPosition += 10
  doc.setFont('helvetica', 'normal')
  doc.text(data.email, margin + 5, yPosition)
  
  yPosition += 20
  
  // Section Mot de passe
  doc.setFillColor(...karaGold)
  doc.rect(margin, yPosition - 8, contentWidth, 15, 'F')
  
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('Mot de Passe', margin + 5, yPosition)
  
  yPosition += 10
  doc.setFont('helvetica', 'normal')
  doc.text(data.password, margin + 5, yPosition)
  
  yPosition += 25
  
  // Instructions
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...darkGray)
  const instructions = [
    'Instructions importantes:',
    '1. Conservez ce document en lieu sûr',
    '2. Changez votre mot de passe après votre première connexion',
    '3. En cas de perte, contactez l\'administration KARA'
  ]
  
  instructions.forEach((line, index) => {
    if (index === 0) {
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...karaBlue)
    } else {
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...lightGray)
    }
    doc.text(line, margin, yPosition)
    yPosition += 8
  })
  
  // Footer
  const footerY = pageHeight - 20
  doc.setFontSize(8)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(...lightGray)
  doc.text(
    `Document généré le ${new Date().toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })}`,
    margin,
    footerY
  )
  
  // Convertir en Blob
  const pdfBlob = doc.output('blob')
  return pdfBlob
}

/**
 * Télécharge un PDF automatiquement
 * 
 * @param blob - Blob du PDF à télécharger
 * @param filename - Nom du fichier
 * 
 * @example
 * const pdfBlob = await generateCredentialsPDF({...})
 * downloadPDF(pdfBlob, 'Identifiants_Connexion_1234.MK.567890_2024-01-20.pdf')
 */
export function downloadPDF(blob: Blob, filename: string): void {
  // Créer un lien de téléchargement
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  
  // Ajouter au DOM, cliquer, puis retirer
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  // Libérer l'URL après un délai
  setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 100)
}

/**
 * Formate le nom de fichier pour le PDF des identifiants
 * 
 * @param matricule - Matricule du membre
 * @param date - Date de génération (optionnel, utilise la date actuelle par défaut)
 * @returns Nom de fichier formaté
 * 
 * @example
 * formatCredentialsFilename('1234.MK.567890', new Date('2024-01-20'))
 * // Returns: "Identifiants_Connexion_1234.MK.567890_2024-01-20.pdf"
 */
export function formatCredentialsFilename(
  matricule: string,
  date: Date = new Date()
): string {
  const dateStr = date.toISOString().split('T')[0] // Format: YYYY-MM-DD
  const safeMatricule = matricule.replace(/[^a-zA-Z0-9.]/g, '_')
  return `Identifiants_Connexion_${safeMatricule}_${dateStr}.pdf`
}
