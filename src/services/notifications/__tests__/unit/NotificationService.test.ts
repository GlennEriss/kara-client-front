/**
 * Tests unitaires pour NotificationService
 * 
 * Tests pour les méthodes de notification de rejet, réouverture et suppression
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NotificationService } from '../../NotificationService'
import { NotificationRepository } from '@/repositories/notifications/NotificationRepository'

// Mock du repository
vi.mock('@/repositories/notifications/NotificationRepository', () => ({
  NotificationRepository: vi.fn().mockImplementation(() => ({
    create: vi.fn().mockResolvedValue({
      id: 'notification-123',
      module: 'memberships',
      entityId: 'req-123',
      type: 'membership_rejected',
      title: 'Demande d\'adhésion rejetée',
      message: 'Test',
      isRead: false,
      createdAt: new Date(),
    }),
  })),
}))

vi.mock('@/factories/RepositoryFactory', () => ({
  RepositoryFactory: {
    getNotificationRepository: vi.fn(() => ({
      create: vi.fn().mockResolvedValue({
        id: 'notification-123',
        module: 'memberships',
        entityId: 'req-123',
        type: 'membership_rejected',
        title: 'Demande d\'adhésion rejetée',
        message: 'Test',
        isRead: false,
        createdAt: new Date(),
      }),
    })),
  },
}))

describe('NotificationService', () => {
  let service: NotificationService
  let mockRepository: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockRepository = {
      create: vi.fn().mockResolvedValue({
        id: 'notification-123',
        module: 'memberships',
        entityId: 'req-123',
        type: 'membership_rejected',
        title: 'Demande d\'adhésion rejetée',
        message: 'Test',
        isRead: false,
        createdAt: new Date(),
      }),
    }
    
    service = new NotificationService(mockRepository)
  })

  describe('createRejectionNotification', () => {
    it('devrait créer une notification de rejet pour les admins', async () => {
      // Arrange
      const params = {
        requestId: 'req-123',
        memberName: 'Jean Dupont',
        adminName: 'Admin User',
        adminId: 'admin-123',
        motifReject: 'Documents incomplets',
        processedAt: new Date(),
      }
      
      // Act
      await service.createRejectionNotification(
        params.requestId,
        params.memberName,
        params.adminName,
        params.adminId,
        params.motifReject,
        params.processedAt
      )
      
      // Assert
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          module: 'memberships',
          entityId: 'req-123',
          type: 'membership_rejected',
          title: 'Demande d\'adhésion rejetée',
          message: expect.stringMatching(/Admin User[\s\S]*Jean Dupont[\s\S]*Documents incomplets/),
          isRead: false,
          metadata: expect.objectContaining({
            requestId: 'req-123',
            memberName: 'Jean Dupont',
            adminName: 'Admin User',
            adminId: 'admin-123',
            status: 'rejected',
            motifReject: 'Documents incomplets',
            processedAt: expect.any(String),
            processedBy: 'admin-123',
          }),
        })
      )
    })

    it('devrait inclure toutes les métadonnées nécessaires', async () => {
      // Arrange
      const processedAt = new Date()
      
      // Act
      await service.createRejectionNotification(
        'req-123',
        'Jean Dupont',
        'Admin User',
        'admin-123',
        'Documents incomplets',
        processedAt
      )
      
      // Assert
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            requestId: 'req-123',
            memberName: 'Jean Dupont',
            adminName: 'Admin User',
            adminId: 'admin-123',
            status: 'rejected',
            motifReject: 'Documents incomplets',
            processedBy: 'admin-123',
          }),
        })
      )
    })
  })

  describe('createReopeningNotification', () => {
    it('devrait créer une notification de réouverture pour les admins', async () => {
      // Arrange
      const reopenedAt = new Date()
      const previousMotifReject = 'Documents incomplets'
      
      // Act
      await service.createReopeningNotification(
        'req-123',
        'Jean Dupont',
        'Admin User',
        'admin-123',
        'Nouvelle information disponible',
        reopenedAt,
        previousMotifReject
      )
      
      // Assert
      const createCall = mockRepository.create.mock.calls[0][0]
      expect(createCall).toMatchObject({
        module: 'memberships',
        entityId: 'req-123',
        type: 'membership_reopened',
        title: 'Dossier réouvert',
        isRead: false,
        metadata: expect.objectContaining({
          requestId: 'req-123',
          memberName: 'Jean Dupont',
          adminName: 'Admin User',
          adminId: 'admin-123',
          status: 'under_review',
          reopenReason: 'Nouvelle information disponible',
          reopenedAt: expect.any(String),
          reopenedBy: 'admin-123',
          previousStatus: 'rejected',
          previousMotifReject: 'Documents incomplets',
        }),
      })
      expect(createCall.message).toContain('Nouvelle information disponible')
    })

    it('devrait créer une notification de réouverture sans motif de rejet précédent', async () => {
      // Arrange
      const reopenedAt = new Date()
      
      // Act
      await service.createReopeningNotification(
        'req-123',
        'Jean Dupont',
        'Admin User',
        'admin-123',
        'Nouvelle information disponible',
        reopenedAt
      )
      
      // Assert
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            previousMotifReject: undefined,
          }),
        })
      )
    })
  })

  describe('createDeletionNotification', () => {
    it('devrait créer une notification de suppression pour les admins', async () => {
      // Arrange
      const deletedAt = new Date()
      const previousMotifReject = 'Documents incomplets'
      
      // Act
      await service.createDeletionNotification(
        'req-123',
        'Jean Dupont',
        'MK-2024-001234',
        'Admin User',
        'admin-123',
        deletedAt,
        previousMotifReject
      )
      
      // Assert
      const createCall = mockRepository.create.mock.calls[0][0]
      expect(createCall).toMatchObject({
        module: 'memberships',
        entityId: 'req-123',
        type: 'membership_deleted',
        title: 'Dossier supprimé définitivement',
        isRead: false,
        metadata: expect.objectContaining({
          requestId: 'req-123',
          memberName: 'Jean Dupont',
          matricule: 'MK-2024-001234',
          adminName: 'Admin User',
          adminId: 'admin-123',
          deletedAt: expect.any(String),
          deletedBy: 'admin-123',
          reason: 'Suppression définitive d\'une demande rejetée',
          previousStatus: 'rejected',
          previousMotifReject: 'Documents incomplets',
        }),
      })
      expect(createCall.message).toContain('Jean Dupont')
      expect(createCall.message).toContain('MK-2024-001234')
    })

    it('devrait créer une notification de suppression sans motif de rejet précédent', async () => {
      // Arrange
      const deletedAt = new Date()
      
      // Act
      await service.createDeletionNotification(
        'req-123',
        'Jean Dupont',
        'MK-2024-001234',
        'Admin User',
        'admin-123',
        deletedAt
      )
      
      // Assert
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            previousMotifReject: undefined,
          }),
        })
      )
    })
  })
})
