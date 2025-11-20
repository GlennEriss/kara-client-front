import { CharityEventRepository, PaginatedCharityEvents } from '@/repositories/bienfaiteur/CharityEventRepository'
import { CharityContributionRepository } from '@/repositories/bienfaiteur/CharityContributionRepository'
import { CharityParticipantRepository } from '@/repositories/bienfaiteur/CharityParticipantRepository'
import { CharityEvent, CharityEventFilters, CharityGlobalStats } from '@/types/types'

export class CharityEventService {
  /**
   * Récupère les évènements avec pagination
   */
  static async getPaginatedEvents(filters?: CharityEventFilters, page: number = 1, pageSize: number = 12): Promise<PaginatedCharityEvents> {
    return await CharityEventRepository.getPaginated(filters, page, pageSize)
  }

  /**
   * Récupère tous les évènements avec filtres (sans pagination - pour exports)
   */
  static async getAllEvents(filters?: CharityEventFilters): Promise<CharityEvent[]> {
    return await CharityEventRepository.getAll(filters)
  }

  /**
   * Récupère un évènement par son ID
   */
  static async getEventById(id: string): Promise<CharityEvent | null> {
    return await CharityEventRepository.getById(id)
  }

  /**
   * Crée un nouvel évènement
   */
  static async createEvent(event: Omit<CharityEvent, 'id'>, adminId: string): Promise<string> {
    const now = new Date()
    
    const eventData: Omit<CharityEvent, 'id'> = {
      ...event,
      totalCollectedAmount: 0,
      totalContributionsCount: 0,
      totalParticipantsCount: 0,
      totalGroupsCount: 0,
      createdAt: now,
      updatedAt: now,
      createdBy: adminId,
      status: event.status || 'draft'
    }

    return await CharityEventRepository.create(eventData)
  }

  /**
   * Met à jour un évènement
   */
  static async updateEvent(id: string, updates: Partial<CharityEvent>, adminId: string): Promise<void> {
    const updateData = {
      ...updates,
      updatedAt: new Date(),
      updatedBy: adminId
    }

    await CharityEventRepository.update(id, updateData)
  }

  /**
   * Supprime un évènement
   */
  static async deleteEvent(id: string): Promise<void> {
    await CharityEventRepository.delete(id)
  }

  /**
   * Récupère les statistiques globales des évènements
   */
  static async getGlobalStats(): Promise<CharityGlobalStats> {
    const currentYear = new Date().getFullYear()
    const events = await CharityEventRepository.getByYear(currentYear)

    const totalCollectedAmount = events.reduce((sum, event) => sum + event.totalCollectedAmount, 0)
    const totalParticipants = events.reduce((sum, event) => sum + event.totalParticipantsCount, 0)

    // Trouver le prochain évènement à venir
    // Récupérer aussi les évènements futurs de l'année suivante si nécessaire
    const nextYearEvents = await CharityEventRepository.getByYear(currentYear + 1)
    const allEvents = [...events, ...nextYearEvents]

    const now = new Date()
    now.setHours(0, 0, 0, 0) // Comparer seulement les dates, pas les heures
    
    const upcomingEvents = allEvents
      .filter(e => {
        const eventStartDate = new Date(e.startDate)
        eventStartDate.setHours(0, 0, 0, 0)
        
        // Exclure les évènements terminés ou archivés
        if (e.status === 'closed' || e.status === 'archived') {
          return false
        }
        
        // Inclure si :
        // 1. Statut "upcoming" ou "ongoing" avec startDate >= aujourd'hui
        // 2. OU statut "draft" avec startDate >= aujourd'hui
        return (
          (e.status === 'upcoming' || e.status === 'ongoing' || e.status === 'draft') &&
          eventStartDate >= now
        )
      })
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())

    return {
      totalEventsThisYear: events.length,
      totalCollectedAmount,
      totalParticipants,
      nextUpcomingEvent: upcomingEvents[0] || undefined
    }
  }

  /**
   * Récupère les statistiques d'un évènement
   */
  static async getEventStats(eventId: string) {
    const event = await CharityEventRepository.getById(eventId)
    if (!event) {
      throw new Error('Event not found')
    }

    const participants = await CharityParticipantRepository.getByEventId(eventId)
    const contributions = await CharityContributionRepository.getByEventId(eventId)

    const memberParticipants = participants.filter(p => p.participantType === 'member')
    const groupParticipants = participants.filter(p => p.participantType === 'group')

    const moneyContributions = contributions.filter(c => c.contributionType === 'money')
    const inKindContributions = contributions.filter(c => c.contributionType === 'in_kind')

    const totalMoney = moneyContributions.reduce((sum, c) => sum + (c.payment?.amount || 0), 0)
    const totalInKind = inKindContributions.reduce((sum, c) => sum + (c.estimatedValue || 0), 0)

    // Top contributeurs (tri par montant)
    const topContributors = [...participants]
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 5)

    // Progression par rapport à l'objectif
    const progressPercentage = event.targetAmount 
      ? Math.min(100, (event.totalCollectedAmount / event.targetAmount) * 100)
      : 100

    // Jours restants
    const daysRemaining = Math.ceil((event.endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))

    return {
      event,
      totalMembers: memberParticipants.length,
      totalGroups: groupParticipants.length,
      totalContributions: contributions.length,
      totalMoney,
      totalInKind,
      topContributors,
      progressPercentage,
      daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
      isCompleted: event.status === 'closed',
      isOngoing: event.status === 'ongoing'
    }
  }

  /**
   * Met à jour les statistiques agrégées d'un évènement
   */
  static async updateEventAggregates(eventId: string): Promise<void> {
    const participants = await CharityParticipantRepository.getByEventId(eventId)
    const contributions = await CharityContributionRepository.getByEventId(eventId)

    const totalCollectedAmount = contributions.reduce((sum, c) => {
      if (c.contributionType === 'money' && c.payment) {
        return sum + c.payment.amount
      }
      if (c.contributionType === 'in_kind' && c.estimatedValue) {
        return sum + c.estimatedValue
      }
      return sum
    }, 0)

    const memberParticipants = participants.filter(p => p.participantType === 'member')
    const groupParticipants = participants.filter(p => p.participantType === 'group')

    await CharityEventRepository.update(eventId, {
      totalCollectedAmount,
      totalContributionsCount: contributions.length,
      totalParticipantsCount: memberParticipants.length,
      totalGroupsCount: groupParticipants.length,
      updatedAt: new Date()
    })
  }

  /**
   * Recherche d'évènements
   */
  static async searchEvents(searchQuery: string): Promise<CharityEvent[]> {
    return await CharityEventRepository.search(searchQuery)
  }

  /**
   * Génère un slug pour un évènement
   */
  static generateSlug(title: string): string {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }
}

