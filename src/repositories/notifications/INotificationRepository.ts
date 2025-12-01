import { IRepository } from '@/repositories/IRepository'
import { Notification, NotificationFilters, NotificationModule, PaginatedNotifications } from '@/types/types'

/**
 * Interface pour le repository des notifications
 */
export interface INotificationRepository extends IRepository {
  /**
   * Crée une nouvelle notification
   */
  create(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification>

  /**
   * Récupère une notification par son ID
   */
  getById(id: string): Promise<Notification | null>

  /**
   * Met à jour une notification
   */
  update(id: string, updates: Partial<Notification>): Promise<Notification | null>

  /**
   * Supprime une notification
   */
  delete(id: string): Promise<void>

  /**
   * Récupère le nombre de notifications non lues
   */
  getUnreadCount(): Promise<number>

  /**
   * Récupère les notifications non lues (limitées)
   */
  getUnreadNotifications(limit?: number): Promise<Notification[]>

  /**
   * Récupère les notifications d'un module spécifique
   */
  getNotificationsByModule(module: NotificationModule, filters?: NotificationFilters): Promise<Notification[]>

  /**
   * Récupère les notifications paginées
   */
  getPaginatedNotifications(
    filters?: NotificationFilters,
    page?: number,
    limit?: number
  ): Promise<PaginatedNotifications>

  /**
   * Marque une notification comme lue
   */
  markAsRead(id: string): Promise<void>

  /**
   * Marque toutes les notifications comme lues
   */
  markAllAsRead(): Promise<void>

  /**
   * Marque toutes les notifications d'un module comme lues
   */
  markAsReadByModule(module: NotificationModule): Promise<void>

  /**
   * Récupère les notifications programmées à envoyer avant une date
   */
  getScheduledNotifications(beforeDate: Date): Promise<Notification[]>

  /**
   * Marque une notification comme envoyée
   */
  markAsSent(id: string): Promise<void>
}

