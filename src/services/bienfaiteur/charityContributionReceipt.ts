import type { CharityEvent, EnrichedCharityContribution } from '@/types/types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
// Helper pour formater les montants
const formatAmount = (amount: number): string => {
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

const PAYMENT_MODE_LABELS: Record<string, string> = {
  airtel_money: 'Airtel Money',
  mobicash: 'Mobicash',
  cash: 'Espèce',
  bank_transfer: 'Virement bancaire',
  other: 'Autre',
}

const formatDate = (date: Date | undefined | null) => {
  if (!date) return 'Date non définie'
  try {
    const dateObj = date instanceof Date ? date : new Date(date)
    if (isNaN(dateObj.getTime())) return 'Date invalide'
    return format(dateObj, 'dd MMMM yyyy', { locale: fr })
  } catch {
    return 'Date invalide'
  }
}
export async function buildCharityContributionReceipt(
  contribution: EnrichedCharityContribution,
  event: CharityEvent,
) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  let yPos = 20

  // En-tête
  doc.setFillColor(35, 77, 101) // #234D65
  doc.rect(0, 0, pageWidth, 40, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text('REÇU DE CONTRIBUTION', pageWidth / 2, 20, { align: 'center' })

  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text('Évènement de Charité - LE KARA', pageWidth / 2, 30, {
    align: 'center',
  })

  yPos = 50

  // Informations de l'évènement
  doc.setTextColor(0, 0, 0)
  doc.setFillColor(240, 240, 240)
  doc.rect(10, yPos, pageWidth - 20, 40, 'F')

  yPos += 10
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text("INFORMATIONS DE L'ÉVÈNEMENT", 15, yPos)

  yPos += 7
  doc.setFont('helvetica', 'normal')
  doc.text(`Titre: ${event.title}`, 15, yPos)
  doc.text(`Lieu: ${event.location}`, pageWidth / 2 + 5, yPos)

  yPos += 7
  const startDate = formatDate(event.startDate)
  const endDate = formatDate(event.endDate)
  doc.text(`Dates: ${startDate} - ${endDate}`, 15, yPos)

  yPos += 15

  // Informations du contributeur
  doc.setFillColor(245, 245, 245)
  doc.rect(10, yPos, pageWidth - 20, 35, 'F')

  yPos += 10
  doc.setFont('helvetica', 'bold')
  doc.text('INFORMATIONS DU CONTRIBUTEUR', 15, yPos)

  yPos += 7
  doc.setFont('helvetica', 'normal')
  const contributorName =
    contribution.participant?.name || 'Contributeur inconnu'
  doc.text(`Nom: ${contributorName}`, 15, yPos)

  if (
    contribution.participant?.type === 'member' &&
    contribution.participant?.groupName
  ) {
    yPos += 7
    doc.text(
      `Groupe de rattachement: ${contribution.participant.groupName}`,
      15,
      yPos,
    )
  } else if (contribution.participant?.type === 'group') {
    yPos += 7
    doc.text('Type: Groupe', 15, yPos)
  }

  yPos += 15

  // Détails de la contribution
  doc.setFillColor(240, 249, 255)
  doc.rect(10, yPos, pageWidth - 20, 50, 'F')

  yPos += 10
  doc.setFont('helvetica', 'bold')
  doc.text('DÉTAILS DE LA CONTRIBUTION', 15, yPos)

  yPos += 7
  doc.setFont('helvetica', 'normal')

  const contributionDate = formatDate(
    contribution.contributionDate ||
      contribution.payment?.date ||
      contribution.createdAt,
  )
  doc.text(`Date de contribution: ${contributionDate}`, 15, yPos)

  yPos += 7
  doc.text(
    `Type: ${contribution.contributionType === 'money' ? 'Espèces' : 'Don en nature'}`,
    15,
    yPos,
  )

  if (contribution.contributionType === 'money') {
    yPos += 7
    const amount = contribution.payment?.amount || 0
    doc.text(`Montant: ${formatAmount(amount)} FCFA`, 15, yPos)

    if (contribution.payment?.mode) {
      yPos += 7
      const modeLabel =
        PAYMENT_MODE_LABELS[contribution.payment.mode] ||
        contribution.payment.mode
      doc.text(`Moyen de paiement: ${modeLabel}`, 15, yPos)
    }
  } else {
    yPos += 7
    doc.text(
      `Description: ${contribution.inKindDescription || 'Non spécifiée'}`,
      15,
      yPos,
    )

    if (contribution.estimatedValue) {
      yPos += 7
      doc.text(
        `Valeur estimée: ${formatAmount(contribution.estimatedValue)} FCFA`,
        15,
        yPos,
      )
    }
  }

  yPos += 15

  // Numéro de reçu
  doc.setFillColor(35, 77, 101)
  doc.rect(10, yPos, pageWidth - 20, 15, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  const receiptNumber = `REC-${contribution.id.slice(0, 8).toUpperCase()}`
  doc.text(`N° de reçu: ${receiptNumber}`, pageWidth / 2, yPos + 10, {
    align: 'center',
  })

  yPos += 25

  // Statut
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  const statusLabel =
    contribution.status === 'confirmed'
      ? 'Confirmé'
      : contribution.status === 'pending'
        ? 'En attente'
        : 'Annulé'
  doc.text(`Statut: ${statusLabel}`, 15, yPos)

  // Notes si présentes
  if (contribution.notes) {
    yPos += 10
    doc.setFont('helvetica', 'italic')
    doc.text(`Notes: ${contribution.notes}`, 15, yPos, {
      maxWidth: pageWidth - 30,
    })
  }

  // Footer
  yPos = pageHeight - 20
  doc.setFontSize(8)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(100, 100, 100)
  doc.text(
    'Ce document est généré automatiquement par le système LE KARA',
    pageWidth / 2,
    yPos,
    { align: 'center' },
  )
  doc.text(
    `Page 1/1 - Généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}`,
    pageWidth / 2,
    yPos + 5,
    { align: 'center' },
  )

  // Télécharger le PDF
  const contributorNameSafe = contributorName.replace(/[^a-zA-Z0-9]/g, '_')
  const fileName = `Recu_Contribution_${contributorNameSafe}_${format(new Date(), 'ddMMyyyy')}.pdf`

  return { doc, fileName }
}
