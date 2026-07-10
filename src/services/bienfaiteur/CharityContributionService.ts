import { CharityContributionRepository } from '@/repositories/bienfaiteur/CharityContributionRepository'
import { CharityParticipantRepository } from '@/repositories/bienfaiteur/CharityParticipantRepository'
import { CharityEventService } from './CharityEventService'
import { CharityContribution, CharityContributionInput, EnrichedCharityContribution } from '@/types/types'
import { db, doc, getDoc } from '@/firebase/firestore'

export class CharityContributionService {
  /**
   * Récupère toutes les contributions d'un évènement
   */
  static async getEventContributions(eventId: string): Promise<EnrichedCharityContribution[]> {
    const contributions = await CharityContributionRepository.getByEventId(eventId)
    return await this.enrichContributions(eventId, contributions)
  }

  /**
   * Enrichit les contributions avec les données des participants
   */
  private static async enrichContributions(
    eventId: string,
    contributions: CharityContribution[]
  ): Promise<EnrichedCharityContribution[]> {
    // 1) Participants uniques → une lecture par participant (en parallèle, dédupliqué).
    const participantIds = Array.from(
      new Set(contributions.map((c) => c.participantId).filter((id): id is string => !!id))
    )
    const participantEntries = await Promise.all(
      participantIds.map(async (pid) => [pid, await CharityParticipantRepository.getById(eventId, pid)] as const)
    )
    const participantById = new Map(participantEntries)

    // 2) Membres & groupes référencés uniques.
    const memberIds = new Set<string>()
    const groupIds = new Set<string>()
    for (const p of participantById.values()) {
      if (p?.participantType === 'member' && p.memberId) memberIds.add(p.memberId)
      else if (p?.participantType === 'group' && p.groupId) groupIds.add(p.groupId)
    }

    const [memberEntries, groupEntries] = await Promise.all([
      Promise.all(Array.from(memberIds, async (id) => [id, await getDoc(doc(db, 'users', id))] as const)),
      Promise.all(Array.from(groupIds, async (id) => [id, await getDoc(doc(db, 'groups', id))] as const)),
    ])
    const userById = new Map(memberEntries)
    const groupById = new Map(groupEntries)

    // 3) Noms des groupes référencés par les membres (groupIds[0]), en évitant les doublons déjà chargés.
    const memberGroupIds = new Set<string>()
    for (const [, snap] of memberEntries) {
      const gid = snap.exists() ? (snap.data().groupIds?.[0] as string | undefined) : undefined
      if (gid && !groupById.has(gid)) memberGroupIds.add(gid)
    }
    const memberGroupEntries = await Promise.all(
      Array.from(memberGroupIds, async (id) => [id, await getDoc(doc(db, 'groups', id))] as const)
    )
    for (const [id, snap] of memberGroupEntries) groupById.set(id, snap)

    // 4) Assemblage sans aucune I/O (tout est déjà en cache mémoire).
    return contributions.map((contribution) => {
      if (!contribution.participantId) {
        return { ...contribution, participant: undefined }
      }
      const participant = participantById.get(contribution.participantId)
      if (!participant) {
        return { ...contribution, participant: undefined }
      }

      let participantData: any = {}
      if (participant.participantType === 'member' && participant.memberId) {
        const snap = userById.get(participant.memberId)
        if (snap?.exists()) {
          const userData = snap.data()
          const gid = userData.groupIds?.[0] as string | undefined
          const groupSnap = gid ? groupById.get(gid) : undefined
          participantData = {
            type: 'member' as const,
            name: `${userData.firstName} ${userData.lastName}`,
            groupName: groupSnap?.exists() ? groupSnap.data().name : undefined,
            photoURL: userData.photoURL,
          }
        }
      } else if (participant.participantType === 'group' && participant.groupId) {
        const snap = groupById.get(participant.groupId)
        if (snap?.exists()) {
          const groupData = snap.data()
          participantData = {
            type: 'group' as const,
            name: groupData.name,
            photoURL: groupData.photoURL,
          }
        }
      }

      return { ...contribution, participant: participantData.name ? participantData : undefined }
    })
  }

  /**
   * Récupère une contribution par son ID
   */
  static async getContributionById(eventId: string, contributionId: string): Promise<CharityContribution | null> {
    return await CharityContributionRepository.getById(eventId, contributionId)
  }

  /**
   * Nettoie un objet en supprimant les valeurs undefined
   */
  private static cleanObject(obj: any): any {
    const cleaned: any = {}
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
          // Nettoyer les objets imbriqués
          const cleanedNested = this.cleanObject(value)
          if (Object.keys(cleanedNested).length > 0) {
            cleaned[key] = cleanedNested
          }
        } else {
          cleaned[key] = value
        }
      }
    }
    return cleaned
  }

  /**
   * Crée une nouvelle contribution
   */
  static async createContribution(
    eventId: string, 
    contribution: Omit<CharityContribution, 'id'>, 
    adminId: string
  ): Promise<string> {
    if (!contribution.participantId) {
      throw new Error('participantId is required to create a contribution')
    }
    const now = new Date()

    const contributionData: any = {
      ...contribution,
      eventId: contribution.eventId || eventId,
      createdAt: now,
      updatedAt: now,
      createdBy: adminId,
      status: contribution.status || 'confirmed'
    }

    console.log('🔧 Service - contributionData avant nettoyage:', {
      contributionDate: contributionData.contributionDate,
      hasContributionDate: !!contributionData.contributionDate
    })

    if (contributionData.payment) {
      contributionData.payment = {
        ...contributionData.payment,
        paymentType: 'Charity',
        acceptedBy: contributionData.payment.acceptedBy || adminId,
        date: contributionData.payment.date || now
      }
    }

    // Nettoyer l'objet pour supprimer les valeurs undefined
    const cleanedData = this.cleanObject(contributionData)
    
    console.log('🧹 Service - contributionData après nettoyage:', {
      contributionDate: cleanedData.contributionDate,
      hasContributionDate: !!cleanedData.contributionDate
    })

    // Créer la contribution
    const contributionId = await CharityContributionRepository.create(eventId, cleanedData)

    // Mettre à jour le participant
    await this.updateParticipantStats(eventId, contribution.participantId)

    // Mettre à jour les agrégats de l'évènement
    await CharityEventService.updateEventAggregates(eventId)

    return contributionId
  }

  /**
   * Met à jour une contribution
   */
  static async updateContribution(
    eventId: string, 
    contributionId: string, 
    updates: Partial<CharityContribution>, 
    adminId: string
  ): Promise<void> {
    const updateData = {
      ...updates,
      updatedAt: new Date(),
      updatedBy: adminId
    }

    await CharityContributionRepository.update(eventId, contributionId, updateData)

    // Si le montant a changé, mettre à jour les stats
    if (updates.payment || updates.estimatedValue) {
      const contribution = await CharityContributionRepository.getById(eventId, contributionId)
      if (contribution) {
        await this.updateParticipantStats(eventId, contribution.participantId)
        await CharityEventService.updateEventAggregates(eventId)
      }
    }
  }

  /**
   * Supprime une contribution
   */
  static async deleteContribution(eventId: string, contributionId: string): Promise<void> {
    const contribution = await CharityContributionRepository.getById(eventId, contributionId)
    if (!contribution) {
      throw new Error('Contribution not found')
    }

    await CharityContributionRepository.delete(eventId, contributionId)

    // Mettre à jour les stats du participant
    await this.updateParticipantStats(eventId, contribution.participantId)

    // Mettre à jour les agrégats de l'évènement
    await CharityEventService.updateEventAggregates(eventId)
  }

  /**
   * Met à jour les statistiques d'un participant
   */
  private static async updateParticipantStats(eventId: string, participantId: string): Promise<void> {
    const contributions = await CharityContributionRepository.getByParticipantId(eventId, participantId)

    const totalAmount = contributions.reduce((sum, c) => {
      if (c.contributionType === 'money' && c.payment) {
        return sum + c.payment.amount
      }
      if (c.contributionType === 'in_kind' && c.estimatedValue) {
        return sum + c.estimatedValue
      }
      return sum
    }, 0)

    const lastContribution = contributions.length > 0 
      ? contributions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]
      : null

    await CharityParticipantRepository.update(eventId, participantId, {
      totalAmount,
      contributionsCount: contributions.length,
      lastContributionAt: lastContribution?.createdAt,
      updatedAt: new Date()
    })
  }

  /**
   * Ajoute un participant et sa contribution en une seule opération
   */
  static async addParticipantWithContribution(
    eventId: string,
    memberId: string | undefined,
    groupId: string | undefined,
    contribution: CharityContributionInput,
    adminId: string
  ): Promise<{ participantId: string; contributionId: string }> {
    // Vérifier si le participant existe déjà
    let participant = await CharityParticipantRepository.getByMemberOrGroup(eventId, memberId, groupId)

    // Créer le participant s'il n'existe pas
    if (!participant) {
      const participantId = await CharityParticipantRepository.create(eventId, {
        eventId,
        participantType: memberId ? 'member' : 'group',
        memberId,
        groupId,
        totalAmount: 0,
        contributionsCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: adminId
      })

      participant = await CharityParticipantRepository.getById(eventId, participantId)
    }

    if (!participant) {
      throw new Error('Failed to create/get participant')
    }

    // Créer la contribution
    const contributionId = await this.createContribution(eventId, {
      ...contribution,
      eventId,
      participantId: participant.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: adminId
    }, adminId)

    return {
      participantId: participant.id,
      contributionId
    }
  }

  /**
   * Génère un reçu PDF pour une contribution (URL à générer côté client)
   */
  static generateReceiptData(contribution: CharityContribution, event: any, member: any) {
    return {
      contributionId: contribution.id,
      eventTitle: event.title,
      eventLocation: event.location,
      eventDate: event.startDate,
      contributorName: member ? `${member.firstName} ${member.lastName}` : 'Anonyme',
      contributionType: contribution.contributionType,
      amount: contribution.payment?.amount || contribution.estimatedValue || 0,
      currency: event.currency,
      date: contribution.createdAt,
      receiptNumber: `REC-${contribution.id.slice(0, 8).toUpperCase()}`,
      issuedBy: contribution.createdBy
    }
  }
}

