import { ServiceFactory } from '@/factories/ServiceFactory'
import { NotificationService } from '@/services/notifications/NotificationService'
import {
  MembershipRequest,
  MembershipRequestStatus,
} from '@/types/types'
import { RegisterFormData } from '@/schemas/schemas'
import * as membershipDB from '@/db/membership.db'

export class MembershipService {
  private notificationService: NotificationService

  constructor() {
    this.notificationService = ServiceFactory.getNotificationService()
  }

  /**
   * Crée une nouvelle demande d'adhésion et envoie une notification
   */
  async createMembershipRequest(
    formData: RegisterFormData
  ): Promise<string> {
    // 1. Créer la demande (logique existante depuis membership.db.ts)
    const requestId = await membershipDB.createMembershipRequest(formData)

    // 2. Créer une notification pour les admins
    try {
      await this.notificationService.createMembershipRequestNotification(
        requestId,
        'new_request',
        `${formData.identity.firstName} ${formData.identity.lastName}`,
        undefined
      )
    } catch {
      // Ne pas faire échouer la création de la demande si la notification échoue
    }

    return requestId
  }

  /**
   * Met à jour le statut d'une demande d'adhésion et envoie une notification
   */
  async updateMembershipRequestStatus(
    requestId: string,
    newStatus: MembershipRequestStatus,
    reviewedBy?: string,
    reviewNote?: string,
    motifReject?: string
  ): Promise<boolean> {
    // 1. Mettre à jour le statut (logique existante depuis membership.db.ts)
    const success = await membershipDB.updateMembershipRequestStatus(
      requestId,
      newStatus,
      reviewedBy,
      reviewNote,
      motifReject
    )

    if (!success) {
      return false
    }

    // 2. Récupérer la demande pour obtenir le nom du membre
    try {
      const request = await membershipDB.getMembershipRequestById(requestId)
      
      if (request) {
        const memberName = request.identity
          ? `${request.identity.firstName} ${request.identity.lastName}`
          : undefined

        const statusLabel = this.getStatusLabel(newStatus)

        // 3. Créer une notification pour les admins
        await this.notificationService.createMembershipRequestNotification(
          requestId,
          'status_update',
          memberName,
          statusLabel
        )
      }
    } catch {
      // Ne pas faire échouer la mise à jour si la notification échoue
    }

    return success
  }

  /**
   * Récupère le libellé d'un statut
   */
  private getStatusLabel(status: MembershipRequestStatus): string {
    const labels: Record<MembershipRequestStatus, string> = {
      pending: 'En attente',
      under_review: 'En cours d\'examen',
      approved: 'Approuvée',
      rejected: 'Rejetée',
    }
    return labels[status] || status
  }

  /**
   * Récupère une demande d'adhésion par son ID
   */
  async getMembershipRequestById(requestId: string): Promise<MembershipRequest | null> {
    return membershipDB.getMembershipRequestById(requestId)
  }

  /**
   * Récupère les demandes d'adhésion avec pagination
   */
  async getMembershipRequestsPaginated(options: {
    page?: number
    limit?: number
    status?: MembershipRequestStatus | 'all'
    searchQuery?: string
    startAfterDoc?: any
    orderByField?: string
    orderByDirection?: 'asc' | 'desc'
  } = {}) {
    return membershipDB.getMembershipRequestsPaginated(options)
  }
}

