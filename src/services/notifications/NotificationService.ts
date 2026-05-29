import { RepositoryFactory } from '@/factories/RepositoryFactory'
import { NotificationRepository } from '@/repositories/notifications/NotificationRepository'
import {
  Notification,
  NotificationFilters,
  NotificationModule,
  NotificationType,
} from '@/types/types'

export class NotificationService {
  constructor(
    private readonly repository: NotificationRepository = RepositoryFactory.getNotificationRepository()
  ) {}

  /**
   * Crée une notification générique (ciblée admin)
   */
  async createNotification(params: {
    module: NotificationModule
    entityId: string
    type: NotificationType
    title: string
    message: string
    metadata?: Record<string, any>
    scheduledAt?: Date
  }): Promise<Notification> {
    return this.repository.create({
      module: params.module,
      entityId: params.entityId,
      type: params.type,
      title: params.title,
      message: params.message,
      isRead: false,
      metadata: params.metadata,
      scheduledAt: params.scheduledAt,
    })
  }

  /**
   * Crée une notification destinée à un membre (avec recipientId).
   * Le portail membre filtre par `recipientId == matricule || recipientId == uid`.
   * Silencieux : une erreur ne doit jamais bloquer le flux principal.
   */
  async notifyMember(params: {
    recipientId: string     // matricule ou uid du membre
    module: NotificationModule
    entityId: string
    type: NotificationType
    title: string
    message: string
    metadata?: Record<string, any>
  }): Promise<void> {
    try {
      await this.repository.create({
        module: params.module,
        entityId: params.entityId,
        type: params.type,
        title: params.title,
        message: params.message,
        isRead: false,
        recipientId: params.recipientId,
        metadata: params.metadata,
      })
    } catch (error) {
      console.error('[NotificationService.notifyMember] échec silencieux:', error)
    }
  }

  /**
   * Crée une notification d'anniversaire
   */
  async createBirthdayNotification(
    memberId: string,
    memberFirstName: string,
    memberLastName: string,
    birthDate: Date,
    daysUntil: number
  ): Promise<Notification> {
    // Validation : daysUntil doit être -1, 0, ou 2
    if (![-1, 0, 2].includes(daysUntil)) {
      throw new Error(`Invalid daysUntil for birthday notification: ${daysUntil}`)
    }

    // Calculer l'âge
    const today = new Date()
    const currentYear = today.getFullYear()
    const birthYear = birthDate.getFullYear()
    const age = currentYear - birthYear - (daysUntil > 0 ? 1 : 0)

    // Déterminer le message selon daysUntil
    let message: string
    if (daysUntil === 2) {
      message = `L'anniversaire de ${memberFirstName} ${memberLastName} est dans 2 jours. Il/Elle aura ${age} ans.`
    } else if (daysUntil === 0) {
      message = `Aujourd'hui est l'anniversaire de ${memberFirstName} ${memberLastName}. Il/Elle fête ses ${age} ans aujourd'hui ! 🎉`
    } else {
      // daysUntil === -1
      message = `L'anniversaire de ${memberFirstName} ${memberLastName} était hier. Il/Elle a fêté ses ${age} ans.`
    }

    // Vérifier qu'une notification similaire n'existe pas déjà (éviter doublons)
    const existingNotifications = await this.repository.getNotificationsByModule('memberships', {
      type: 'birthday_reminder',
    })

    const todayStr = today.toISOString().split('T')[0] // Format YYYY-MM-DD
    const alreadyExists = existingNotifications.some(
      (n) =>
        n.metadata?.memberId === memberId &&
        n.metadata?.notificationDate === todayStr &&
        n.metadata?.daysUntil === daysUntil
    )

    if (alreadyExists) {
      console.log(
        `Notification d'anniversaire déjà créée pour ${memberId} (J${daysUntil >= 0 ? '-' : '+'}${Math.abs(daysUntil)})`
      )
      // Retourner la notification existante
      const existing = existingNotifications.find(
        (n) =>
          n.metadata?.memberId === memberId &&
          n.metadata?.notificationDate === todayStr &&
          n.metadata?.daysUntil === daysUntil
      )
      if (existing) {
        return existing
      }
    }

    // Créer la notification
    return await this.repository.create({
      module: 'memberships',
      entityId: memberId,
      type: 'birthday_reminder',
      title: `Anniversaire de ${memberFirstName} ${memberLastName}`,
      message,
      isRead: false,
      metadata: {
        memberId,
        memberFirstName,
        memberLastName,
        birthDate: birthDate.toISOString(),
        daysUntil,
        age,
        notificationDate: todayStr, // Pour éviter les doublons
      },
    })
  }

  /**
   * Crée une notification pour une demande d'adhésion
   */
  async createMembershipRequestNotification(
    requestId: string,
    type: 'new_request' | 'status_update',
    memberName?: string,
    status?: string
  ): Promise<Notification> {
    let title: string
    let message: string

    if (type === 'new_request') {
      title = 'Nouvelle demande d\'adhésion'
      message = memberName
        ? `Une nouvelle demande d'adhésion a été soumise par ${memberName}.`
        : 'Une nouvelle demande d\'adhésion a été soumise.'
    } else {
      title = 'Statut de demande modifié'
      message = memberName && status
        ? `Le statut de la demande de ${memberName} a été modifié : ${status}.`
        : status
          ? `Le statut de la demande a été modifié : ${status}.`
          : 'Le statut d\'une demande d\'adhésion a été modifié.'
    }

    return this.repository.create({
      module: 'memberships',
      entityId: requestId,
      type,
      title,
      message,
      isRead: false,
      metadata: {
        requestId,
        memberName,
        status,
      },
    })
  }

  /**
   * Récupère le nombre de notifications non lues
   */
  async getUnreadCount(): Promise<number> {
    return this.repository.getUnreadCount()
  }

  /**
   * Récupère les notifications non lues
   */
  async getUnreadNotifications(limit: number = 50): Promise<Notification[]> {
    return this.repository.getUnreadNotifications(limit)
  }

  /**
   * Récupère les notifications avec filtres
   */
  async getNotifications(filters?: NotificationFilters): Promise<Notification[]> {
    if (filters?.module) {
      return this.repository.getNotificationsByModule(filters.module, filters)
    }
    // Si pas de module spécifié, récupérer toutes les notifications non lues
    return this.repository.getUnreadNotifications(100)
  }

  /**
   * Marque une notification comme lue
   */
  async markAsRead(id: string): Promise<void> {
    return this.repository.markAsRead(id)
  }

  /**
   * Marque toutes les notifications comme lues
   */
  async markAllAsRead(): Promise<void> {
    return this.repository.markAllAsRead()
  }

  /**
   * Marque toutes les notifications d'un module comme lues
   */
  async markAsReadByModule(module: NotificationModule): Promise<void> {
    return this.repository.markAsReadByModule(module)
  }

  /**
   * Formate un message de notification selon le type
   */
  formatNotificationMessage(type: NotificationType, metadata: any): string {
    switch (type) {
      case 'birthday_reminder': {
        const { memberFirstName, memberLastName, daysUntil, age } = metadata
        if (daysUntil === 2) {
          return `L'anniversaire de ${memberFirstName} ${memberLastName} est dans 2 jours. Il/Elle aura ${age} ans.`
        } else if (daysUntil === 0) {
          return `Aujourd'hui est l'anniversaire de ${memberFirstName} ${memberLastName}. Il/Elle fête ses ${age} ans aujourd'hui ! 🎉`
        } else {
          return `L'anniversaire de ${memberFirstName} ${memberLastName} était hier. Il/Elle a fêté ses ${age} ans.`
        }
      }
      case 'new_request':
        return `Une nouvelle demande d'adhésion a été soumise.`
      case 'status_update':
        return `Le statut d'une demande a été modifié.`
      default:
        return 'Nouvelle notification'
    }
  }

  /**
   * Détermine si une notification doit être créée selon le contexte
   */
  shouldCreateNotification(type: NotificationType, context: any): boolean {
    switch (type) {
      case 'birthday_reminder':
        // Créer uniquement si daysUntil est -1, 0, ou 2
        return context.daysUntil !== undefined && [-1, 0, 2].includes(context.daysUntil)
      case 'new_request':
        return true
      case 'status_update':
        return context.status !== undefined
      default:
        return true
    }
  }

  /**
   * Crée une notification pour le rejet d'une demande d'adhésion
   */
  async createRejectionNotification(
    requestId: string,
    memberName: string,
    adminName: string,
    adminId: string,
    motifReject: string,
    processedAt: Date
  ): Promise<Notification> {
    return this.repository.create({
      module: 'memberships',
      entityId: requestId,
      type: 'membership_rejected',
      title: 'Demande d\'adhésion rejetée',
      message: `${adminName} a rejeté la demande de ${memberName}. Motif: ${motifReject}`,
      isRead: false,
      metadata: {
        requestId,
        memberName,
        adminName,
        adminId,
        status: 'rejected',
        motifReject,
        processedAt: processedAt.toISOString(),
        processedBy: adminId,
      },
    })
  }

  /**
   * Crée une notification pour la réouverture d'un dossier rejeté
   */
  async createReopeningNotification(
    requestId: string,
    memberName: string,
    adminName: string,
    adminId: string,
    reopenReason: string,
    reopenedAt: Date,
    previousMotifReject?: string
  ): Promise<Notification> {
    return this.repository.create({
      module: 'memberships',
      entityId: requestId,
      type: 'membership_reopened',
      title: 'Dossier réouvert',
      message: `${adminName} a réouvert le dossier de ${memberName}. Motif: ${reopenReason}`,
      isRead: false,
      metadata: {
        requestId,
        memberName,
        adminName,
        adminId,
        status: 'under_review',
        reopenReason,
        reopenedAt: reopenedAt.toISOString(),
        reopenedBy: adminId,
        previousStatus: 'rejected',
        previousMotifReject,
      },
    })
  }

  /**
   * Crée une notification pour la suppression définitive d'un dossier
   */
  async createDeletionNotification(
    requestId: string,
    memberName: string,
    matricule: string,
    adminName: string,
    adminId: string,
    deletedAt: Date,
    previousMotifReject?: string
  ): Promise<Notification> {
    return this.repository.create({
      module: 'memberships',
      entityId: requestId,
      type: 'membership_deleted',
      title: 'Dossier supprimé définitivement',
      message: `${adminName} a supprimé définitivement le dossier de ${memberName} (matricule: ${matricule})`,
      isRead: false,
      metadata: {
        requestId,
        memberName,
        matricule,
        adminName,
        adminId,
        deletedAt: deletedAt.toISOString(),
        deletedBy: adminId,
        reason: 'Suppression définitive d\'une demande rejetée',
        previousStatus: 'rejected',
        previousMotifReject,
      },
    })
  }
}

