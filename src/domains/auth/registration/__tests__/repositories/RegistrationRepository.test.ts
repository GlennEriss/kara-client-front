/**
 * Tests unitaires pour RegistrationRepository
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RegistrationRepository } from '../../repositories/RegistrationRepository'
import type { RegisterFormData } from '../../entities'
import type { MembershipRequest } from '@/types/types'

// Mock des fonctions de membership.db.ts
const mockCreateMembershipRequest = vi.fn()
const mockGetMembershipRequestById = vi.fn()
const mockUpdateMembershipRequest = vi.fn()

vi.mock('@/db/membership.db', () => ({
  createMembershipRequest: (...args: any[]) => mockCreateMembershipRequest(...args),
  getMembershipRequestById: (...args: any[]) => mockGetMembershipRequestById(...args),
  updateMembershipRequest: (...args: any[]) => mockUpdateMembershipRequest(...args),
}))

describe('RegistrationRepository', () => {
  let repository: RegistrationRepository

  const mockFormData: RegisterFormData = {
    identity: {
      civility: 'Monsieur',
      lastName: 'Doe',
      firstName: 'John',
      birthDate: '1990-01-01',
      birthPlace: 'Libreville',
      birthCertificateNumber: '123456',
      prayerPlace: 'Église',
      religion: 'Christianisme',
      contacts: ['+24165671734'],
      email: 'john.doe@example.com',
      gender: 'Homme',
      nationality: 'Gabonaise',
      maritalStatus: 'Célibataire',
      hasCar: false,
    },
    address: {
      province: 'Estuaire',
      city: 'Libreville',
      district: 'Quartier A',
      arrondissement: 'Arrondissement 1',
    },
    company: {
      isEmployed: false,
    },
    documents: {
      identityDocument: 'CNI',
      identityDocumentNumber: '123456789',
      expirationDate: '2030-01-01',
      issuingPlace: 'Libreville',
      issuingDate: '2020-01-01',
      termsAccepted: true,
    },
  }

  const mockMembershipRequest: MembershipRequest = {
    id: 'test-id-123',
    ...mockFormData,
    matricule: 'MAT-123456',
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
    securityCode: 'ABC123',
    securityCodeUsed: false,
    securityCodeExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 jours
  }

  beforeEach(() => {
    vi.clearAllMocks()
    repository = new RegistrationRepository()
  })

  describe('create', () => {
    it('devrait créer une demande d\'inscription avec succès', async () => {
      mockCreateMembershipRequest.mockResolvedValue('test-id-123')

      const result = await repository.create(mockFormData)

      expect(result).toBe('test-id-123')
      expect(mockCreateMembershipRequest).toHaveBeenCalledWith(mockFormData)
    })

    it('devrait lancer une erreur si la création échoue', async () => {
      const error = new Error('Erreur de création')
      mockCreateMembershipRequest.mockRejectedValue(error)

      await expect(repository.create(mockFormData)).rejects.toThrow('Erreur de création')
    })

    it('devrait lancer une erreur générique si l\'erreur n\'est pas une Error', async () => {
      mockCreateMembershipRequest.mockRejectedValue('Erreur inconnue')

      await expect(repository.create(mockFormData)).rejects.toThrow(
        "Erreur lors de la création de la demande d'inscription"
      )
    })
  })

  describe('getById', () => {
    it('devrait récupérer une demande d\'inscription par ID', async () => {
      mockGetMembershipRequestById.mockResolvedValue(mockMembershipRequest)

      const result = await repository.getById('test-id-123')

      expect(result).toEqual(mockMembershipRequest)
      expect(mockGetMembershipRequestById).toHaveBeenCalledWith('test-id-123')
    })

    it('devrait retourner null si la demande n\'existe pas', async () => {
      mockGetMembershipRequestById.mockResolvedValue(null)

      const result = await repository.getById('non-existent-id')

      expect(result).toBeNull()
    })

    it('devrait retourner null en cas d\'erreur', async () => {
      mockGetMembershipRequestById.mockRejectedValue(new Error('Erreur'))

      const result = await repository.getById('test-id-123')

      expect(result).toBeNull()
    })
  })

  describe('update', () => {
    it('devrait mettre à jour une demande d\'inscription', async () => {
      const updatedData: Partial<RegisterFormData> = {
        identity: {
          ...mockFormData.identity,
          firstName: 'Jane',
        },
      }

      mockGetMembershipRequestById.mockResolvedValue(mockMembershipRequest)
      mockUpdateMembershipRequest.mockResolvedValue(true)

      const result = await repository.update('test-id-123', updatedData)

      expect(result).toBe(true)
      expect(mockGetMembershipRequestById).toHaveBeenCalledWith('test-id-123')
      expect(mockUpdateMembershipRequest).toHaveBeenCalledWith('test-id-123', expect.objectContaining({
        identity: expect.objectContaining({
          firstName: 'Jane',
        }),
      }))
    })

    it('devrait lancer une erreur si la demande n\'existe pas', async () => {
      mockGetMembershipRequestById.mockResolvedValue(null)

      await expect(repository.update('non-existent-id', {})).rejects.toThrow(
        'Demande d\'inscription non-existent-id introuvable'
      )
    })

    it('devrait lancer une erreur si la mise à jour échoue', async () => {
      const error = new Error('Erreur de mise à jour')
      mockGetMembershipRequestById.mockResolvedValue(mockMembershipRequest)
      mockUpdateMembershipRequest.mockRejectedValue(error)

      await expect(repository.update('test-id-123', {})).rejects.toThrow('Erreur de mise à jour')
    })

    it('devrait fusionner les données existantes avec les nouvelles', async () => {
      const partialUpdate: Partial<RegisterFormData> = {
        address: {
          province: 'Haut-Ogooué',
          city: 'Franceville',
          district: 'Quartier B',
          arrondissement: 'Arrondissement 2',
        },
      }

      mockGetMembershipRequestById.mockResolvedValue(mockMembershipRequest)
      mockUpdateMembershipRequest.mockResolvedValue(true)

      await repository.update('test-id-123', partialUpdate)

      expect(mockUpdateMembershipRequest).toHaveBeenCalledWith('test-id-123', expect.objectContaining({
        identity: mockFormData.identity, // Données existantes conservées
        address: partialUpdate.address, // Nouvelles données
        company: mockFormData.company,
        documents: mockFormData.documents,
      }))
    })
  })
})
