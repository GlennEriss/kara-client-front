import { CharityParticipantRepository } from '@/repositories/bienfaiteur/CharityParticipantRepository'
import { CharityEventRepository } from '@/repositories/bienfaiteur/CharityEventRepository'
import { CharityParticipant } from '@/types/types'

export interface PaginatedParticipants {
  participants: CharityParticipant[]
  total: number
  hasMore: boolean
}

export class CharityParticipantService {
  /**
   * Ajoute un participant à un évènement
   */
  static async addParticipant(
    eventId: string,
    participantType: 'member' | 'group',
    memberId: string | undefined,
    groupId: string | undefined,
    adminId: string
  ): Promise<string> {
    // Vérifier si le participant existe déjà
    const existing = await CharityParticipantRepository.getByMemberOrGroup(eventId, memberId, groupId)
    if (existing) {
      throw new Error('Ce participant est déjà inscrit à cet évènement')
    }

    const now = new Date()
    const participantData: Omit<CharityParticipant, 'id'> = {
      eventId,
      participantType,
      memberId,
      groupId,
      totalAmount: 0,
      contributionsCount: 0,
      createdAt: now,
      updatedAt: now,
      createdBy: adminId
    }

    const participantId = await CharityParticipantRepository.create(eventId, participantData)

    // Mettre à jour les statistiques de l'évènement
    await this.updateEventParticipantStats(eventId)

    return participantId
  }

  /**
   * Retire un participant d'un évènement
   */
  static async removeParticipant(eventId: string, participantId: string): Promise<void> {
    // Vérifier que le participant n'a pas de contributions
    const participant = await CharityParticipantRepository.getById(eventId, participantId)
    if (participant && participant.contributionsCount > 0) {
      throw new Error('Impossible de retirer un participant ayant des contributions')
    }

    await CharityParticipantRepository.delete(eventId, participantId)
    await this.updateEventParticipantStats(eventId)
  }

  /**
   * Récupère les participants d'un évènement avec pagination
   */
  static async getParticipantsByEvent(
    eventId: string,
    type?: 'member' | 'group'
  ): Promise<CharityParticipant[]> {
    if (type) {
      return await CharityParticipantRepository.getByType(eventId, type)
    }
    return await CharityParticipantRepository.getByEventId(eventId)
  }

  /**
   * Met à jour les statistiques d'un participant
   */
  static async updateParticipantStats(
    eventId: string,
    participantId: string,
    adminId: string
  ): Promise<void> {
    // Cette méthode sera appelée après l'ajout d'une contribution
    // Pour recalculer totalAmount, contributionsCount, lastContributionAt
    const participant = await CharityParticipantRepository.getById(eventId, participantId)
    if (!participant) return

    // Le calcul est fait dans CharityContributionService lors de l'ajout d'une contribution
    const updates: Partial<CharityParticipant> = {
      updatedAt: new Date(),
      updatedBy: adminId
    }

    await CharityParticipantRepository.update(eventId, participantId, updates)
  }

  /**
   * Met à jour les compteurs de participants de l'évènement
   */
  static async updateEventParticipantStats(eventId: string): Promise<void> {
    const allParticipants = await CharityParticipantRepository.getByEventId(eventId)
    const members = allParticipants.filter(p => p.participantType === 'member')
    const groups = allParticipants.filter(p => p.participantType === 'group')

    await CharityEventRepository.update(eventId, {
      totalParticipantsCount: members.length,
      totalGroupsCount: groups.length,
      updatedAt: new Date()
    })
  }

  /**
   * Récupère les statistiques d'un participant
   */
  static async getParticipantStats(eventId: string, participantId: string) {
    const participant = await CharityParticipantRepository.getById(eventId, participantId)
    if (!participant) return null

    return {
      totalAmount: participant.totalAmount,
      contributionsCount: participant.contributionsCount,
      lastContributionAt: participant.lastContributionAt
    }
  }
}

