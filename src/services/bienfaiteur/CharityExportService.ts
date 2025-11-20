import { CharityEvent, CharityContribution, CharityParticipant } from '@/types/types'

export class CharityExportService {
  /**
   * Exporte les contributions en CSV
   */
  static exportContributionsToCSV(
    contributions: CharityContribution[],
    participants: CharityParticipant[],
    members: any[],
    groups: any[]
  ): string {
    // En-têtes CSV
    const headers = [
      'ID',
      'Date',
      'Type Participant',
      'Nom Participant',
      'Groupe',
      'Type Contribution',
      'Montant (FCFA)',
      'Mode Paiement',
      'Description',
      'Statut',
      'Enregistré par',
      'Lien Preuve'
    ]

    // Mapper les contributions
    const rows = contributions.map(contribution => {
      const participant = participants.find(p => p.id === contribution.participantId)
      let participantName = 'Inconnu'
      let participantGroup = ''

      if (participant) {
        if (participant.participantType === 'member') {
          const member = members.find(m => m.id === participant.memberId)
          if (member) {
            participantName = `${member.firstName} ${member.lastName}`
            // Trouver le groupe du membre si applicable
            if (member.groupIds && member.groupIds.length > 0) {
              const group = groups.find(g => g.id === member.groupIds[0])
              if (group) {
                participantGroup = group.name
              }
            }
          }
        } else if (participant.participantType === 'group') {
          const group = groups.find(g => g.id === participant.groupId)
          if (group) {
            participantName = group.name
            participantGroup = group.name
          }
        }
      }

      const amount = contribution.contributionType === 'money' 
        ? contribution.payment?.amount || 0
        : contribution.estimatedValue || 0

      const paymentMode = contribution.payment?.mode || 'N/A'
      const description = contribution.contributionType === 'in_kind' 
        ? contribution.inKindDescription || ''
        : ''

      return [
        contribution.id,
        new Date(contribution.createdAt).toLocaleDateString('fr-FR'),
        participant?.participantType === 'member' ? 'Membre' : 'Groupe',
        participantName,
        participantGroup,
        contribution.contributionType === 'money' ? 'Espèces/Virement' : 'En nature',
        amount.toString(),
        paymentMode,
        description,
        contribution.status === 'confirmed' ? 'Confirmé' : contribution.status === 'pending' ? 'En attente' : 'Annulé',
        contribution.createdBy,
        contribution.proofUrl || ''
      ]
    })

    // Construire le CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    return csvContent
  }

  /**
   * Exporte la liste des évènements en CSV
   */
  static exportEventsToCSV(events: CharityEvent[]): string {
    const headers = [
      'ID',
      'Titre',
      'Lieu',
      'Date Début',
      'Date Fin',
      'Statut',
      'Objectif (FCFA)',
      'Collecté (FCFA)',
      'Nb Participants',
      'Nb Groupes',
      'Nb Contributions',
      'Créé le',
      'Créé par'
    ]

    const rows = events.map(event => [
      event.id,
      event.title,
      event.location,
      new Date(event.startDate).toLocaleDateString('fr-FR'),
      new Date(event.endDate).toLocaleDateString('fr-FR'),
      event.status,
      event.targetAmount?.toString() || '',
      event.totalCollectedAmount.toString(),
      event.totalParticipantsCount.toString(),
      event.totalGroupsCount.toString(),
      event.totalContributionsCount.toString(),
      new Date(event.createdAt).toLocaleDateString('fr-FR'),
      event.createdBy
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    return csvContent
  }

  /**
   * Télécharge un fichier CSV
   */
  static downloadCSV(content: string, filename: string): void {
    const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

