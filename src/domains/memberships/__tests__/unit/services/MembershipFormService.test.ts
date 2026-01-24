/**
 * Tests unitaires pour MembershipFormService
 * 
 * Teste la soumission de nouvelles demandes, corrections et gestion des brouillons
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MembershipFormService } from '../../../services/MembershipFormService'
import { MembershipRepositoryV2 } from '../../../repositories/MembershipRepositoryV2'
import { MembershipErrorHandler } from '../../../services/MembershipErrorHandler'
import type { RegisterFormData } from '@/types/types'
import { getFunctions, httpsCallable } from 'firebase/functions'

// Mock des dépendances
vi.mock('../../../repositories/MembershipRepositoryV2')
vi.mock('../../../services/MembershipErrorHandler')
vi.mock('firebase/functions')
vi.mock('@/firebase/app', () => ({
  app: {},
}))

describe('MembershipFormService', () => {
  let service: MembershipFormService
  let mockRepository: any
  let mockErrorHandler: any
  let mockSubmitCorrectionsCF: any

  // Fixture de données de test
  const validFormData: RegisterFormData = {
    identity: {
      civility: 'Monsieur',
      firstName: 'Jean',
      lastName: 'Dupont',
      email: 'jean.dupont@example.com',
      birthDate: '1990-01-01', // ISO string format
      birthPlace: 'Paris',
      birthCertificateNumber: '123456789',
      prayerPlace: 'Église',
      religion: 'Catholic',
      gender: 'male',
      nationality: 'French',
      maritalStatus: 'single',
      contacts: ['+33612345678'],
      hasCar: false,
      // photo est optionnel, on l'omet
    },
    address: {
      province: 'Province1',
      city: 'City1',
      arrondissement: 'Arrondissement1',
      district: 'District1',
      // quarter n'existe pas dans l'interface, seulement quarterId (optionnel)
    },
    company: {
      isEmployed: true,
      companyName: 'Company1',
      profession: 'Engineer',
    },
    documents: {
      identityDocument: 'CNI',
      identityDocumentNumber: '123456789',
      expirationDate: '2030-01-01',
      issuingPlace: 'Paris',
      issuingDate: '2020-01-01',
      termsAccepted: true,
      // documentPhotoFront et documentPhotoBack sont optionnels, on les omet
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock MembershipRepositoryV2
    mockRepository = {
      create: vi.fn(),
      update: vi.fn(),
    }
    vi.mocked(MembershipRepositoryV2.getInstance).mockReturnValue(mockRepository as any)

    // Mock MembershipErrorHandler
    mockErrorHandler = {
      normalizeError: vi.fn((error) => ({
        code: 'UNKNOWN_ERROR',
        message: error?.message || 'Erreur',
        userMessage: error?.message || 'Erreur',
      })),
      formatForUI: vi.fn((error) => error.userMessage || error.message),
      createValidationError: vi.fn((message) => ({
        code: 'VALIDATION_ERROR',
        message,
        userMessage: message,
      })),
      createOperationError: vi.fn((operation) => ({
        code: 'OPERATION_FAILED',
        message: `L'opération ${operation} a échoué`,
        userMessage: `L'opération ${operation} a échoué`,
      })),
    }
    vi.mocked(MembershipErrorHandler.getInstance).mockReturnValue(mockErrorHandler as any)

    // Mock Firebase Functions
    mockSubmitCorrectionsCF = vi.fn()
    vi.mocked(getFunctions).mockReturnValue({} as any)
    vi.mocked(httpsCallable).mockReturnValue(mockSubmitCorrectionsCF)

      // Réinitialiser l'instance singleton
      ; (MembershipFormService as any).instance = undefined
    service = MembershipFormService.getInstance()

    // Mock localStorage
    global.localStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    } as any
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getInstance', () => {
    it('devrait retourner une instance singleton', () => {
      const instance1 = MembershipFormService.getInstance()
      const instance2 = MembershipFormService.getInstance()
      expect(instance1).toBe(instance2)
    })
  })

  describe('submitNewMembership', () => {
    it('devrait soumettre avec succès une nouvelle demande', async () => {
      const requestId = '1234.MK.567890'
      mockRepository.create.mockResolvedValue(requestId)

      const result = await service.submitNewMembership(validFormData)

      expect(result.success).toBe(true)
      expect(result.requestId).toBe(requestId)
      expect(result.error).toBeUndefined()
      expect(mockRepository.create).toHaveBeenCalledWith(validFormData)
    })

    it('devrait supprimer le brouillon après soumission réussie', async () => {
      const requestId = '1234.MK.567890'
      mockRepository.create.mockResolvedValue(requestId)

      await service.submitNewMembership(validFormData)

      expect(global.localStorage.removeItem).toHaveBeenCalledWith('membership-form-draft')
      expect(global.localStorage.removeItem).toHaveBeenCalledWith('membership-form-draft-timestamp')
    })

    it('devrait échouer si le nom est manquant', async () => {
      const invalidData = {
        ...validFormData,
        identity: {
          ...validFormData.identity,
          lastName: '',
        },
      }

      const result = await service.submitNewMembership(invalidData)

      expect(result.success).toBe(false)
      expect(result.requestId).toBeNull()
      expect(result.error).toContain('nom')
      expect(mockRepository.create).not.toHaveBeenCalled()
    })

    it('devrait échouer si les conditions ne sont pas acceptées', async () => {
      const invalidData = {
        ...validFormData,
        documents: {
          ...validFormData.documents,
          termsAccepted: false,
        },
      }

      const result = await service.submitNewMembership(invalidData)

      expect(result.success).toBe(false)
      expect(result.requestId).toBeNull()
      expect(result.error).toContain('conditions')
      expect(mockRepository.create).not.toHaveBeenCalled()
    })

    it('devrait échouer si le repository retourne null', async () => {
      mockRepository.create.mockResolvedValue(null)

      const result = await service.submitNewMembership(validFormData)

      expect(result.success).toBe(false)
      expect(result.requestId).toBeNull()
      expect(result.error).toContain('enregistrement')
    })

    it('devrait gérer les erreurs du repository', async () => {
      const error = new Error('Firestore error')
      mockRepository.create.mockRejectedValue(error)

      const result = await service.submitNewMembership(validFormData)

      expect(result.success).toBe(false)
      expect(result.requestId).toBeNull()
      expect(result.error).toBeDefined()
      expect(mockErrorHandler.normalizeError).toHaveBeenCalledWith(error, 'submitNewMembership')
    })

    it('devrait accepter un prénom optionnel', async () => {
      const formDataWithoutFirstName = {
        ...validFormData,
        identity: {
          ...validFormData.identity,
          firstName: undefined,
        },
      }
      const requestId = '1234.MK.567890'
      mockRepository.create.mockResolvedValue(requestId)

      const result = await service.submitNewMembership(formDataWithoutFirstName)

      expect(result.success).toBe(true)
      expect(mockRepository.create).toHaveBeenCalledWith(formDataWithoutFirstName)
    })
  })

  describe('submitCorrection', () => {
    const requestId = '1234.MK.567890'
    const securityCode = '123456'

    it('devrait soumettre avec succès des corrections', async () => {
      mockSubmitCorrectionsCF.mockResolvedValue({
        data: { success: true },
      })

      const result = await service.submitCorrection(validFormData, requestId, securityCode)

      expect(result.success).toBe(true)
      expect(result.error).toBeUndefined()
      expect(mockSubmitCorrectionsCF).toHaveBeenCalledWith({
        requestId,
        securityCode,
        formData: validFormData,
      })
    })

    it('devrait supprimer le brouillon après soumission réussie', async () => {
      mockSubmitCorrectionsCF.mockResolvedValue({
        data: { success: true },
      })

      await service.submitCorrection(validFormData, requestId, securityCode)

      expect(global.localStorage.removeItem).toHaveBeenCalledWith('membership-form-draft')
    })

    it('devrait échouer si requestId est vide', async () => {
      const result = await service.submitCorrection(validFormData, '', securityCode)

      expect(result.success).toBe(false)
      expect(result.error).toContain('ID')
      expect(mockSubmitCorrectionsCF).not.toHaveBeenCalled()
    })

    it('devrait échouer si securityCode est invalide (trop court)', async () => {
      const result = await service.submitCorrection(validFormData, requestId, '12345')

      expect(result.success).toBe(false)
      expect(result.error).toContain('code')
      expect(mockSubmitCorrectionsCF).not.toHaveBeenCalled()
    })

    it('devrait échouer si securityCode est invalide (trop long)', async () => {
      const result = await service.submitCorrection(validFormData, requestId, '1234567')

      expect(result.success).toBe(false)
      expect(result.error).toContain('code')
    })

    it('devrait échouer si la Cloud Function retourne success: false', async () => {
      mockSubmitCorrectionsCF.mockResolvedValue({
        data: { success: false },
      })

      const result = await service.submitCorrection(validFormData, requestId, securityCode)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('devrait gérer les erreurs de la Cloud Function', async () => {
      const error = new Error('Function error')
      mockSubmitCorrectionsCF.mockRejectedValue(error)

      const result = await service.submitCorrection(validFormData, requestId, securityCode)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(mockErrorHandler.normalizeError).toHaveBeenCalledWith(error, 'submitCorrection')
    })
  })

  describe('updateMembershipRequest', () => {
    const requestId = '1234.MK.567890'

    it('devrait mettre à jour avec succès une demande', async () => {
      mockRepository.update.mockResolvedValue(undefined)

      const result = await service.updateMembershipRequest(requestId, validFormData)

      expect(result.success).toBe(true)
      expect(result.requestId).toBe(requestId)
      expect(mockRepository.update).toHaveBeenCalledWith(requestId, validFormData)
    })

    it('devrait échouer si requestId est manquant', async () => {
      const result = await service.updateMembershipRequest('', validFormData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('ID')
      expect(mockRepository.update).not.toHaveBeenCalled()
    })

    it('devrait échouer si le nom est manquant', async () => {
      const invalidData = {
        ...validFormData,
        identity: {
          ...validFormData.identity,
          lastName: '',
        },
      }

      const result = await service.updateMembershipRequest(requestId, invalidData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('nom')
      expect(mockRepository.update).not.toHaveBeenCalled()
    })

    it('devrait gérer les erreurs lors de la mise à jour', async () => {
      const error = new Error('Update failed')
      mockRepository.update.mockRejectedValue(error)
      mockErrorHandler.normalizeError.mockReturnValue(error)
      mockErrorHandler.formatForUI.mockReturnValue('Erreur normalisée')

      const result = await service.updateMembershipRequest(requestId, validFormData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Erreur normalisée')
      expect(mockErrorHandler.normalizeError).toHaveBeenCalledWith(error, 'updateMembershipRequest')
    })
  })

  describe('saveDraft', () => {
    it('devrait sauvegarder un brouillon dans localStorage', () => {
      service.saveDraft(validFormData)

      expect(global.localStorage.setItem).toHaveBeenCalledWith(
        'membership-form-draft',
        expect.stringContaining('Jean')
      )
      expect(global.localStorage.setItem).toHaveBeenCalledWith(
        'membership-form-draft-timestamp',
        expect.any(String)
      )
    })

    it('devrait retirer les fichiers File des données sauvegardées', () => {
      const formDataWithFiles = {
        ...validFormData,
        identity: {
          ...validFormData.identity,
          photo: new File([''], 'photo.jpg', { type: 'image/jpeg' }),
        },
        documents: {
          ...validFormData.documents,
          documentPhotoFront: new File([''], 'front.jpg', { type: 'image/jpeg' }),
          documentPhotoBack: new File([''], 'back.jpg', { type: 'image/jpeg' }),
        },
      }

      service.saveDraft(formDataWithFiles)

      const savedData = JSON.parse(
        (global.localStorage.setItem as any).mock.calls.find(
          (call: any[]) => call[0] === 'membership-form-draft'
        )?.[1] || '{}'
      )

      expect(savedData.identity.photo).toBeUndefined()
      expect(savedData.documents.documentPhotoFront).toBeUndefined()
      expect(savedData.documents.documentPhotoBack).toBeUndefined()
    })

    it('devrait garder les URL si les fichiers File existent', () => {
      const formDataWithFiles = {
        ...validFormData,
        identity: {
          ...validFormData.identity,
          photo: new File([''], 'photo.jpg', { type: 'image/jpeg' }),
          photoURL: 'https://example.com/photo.jpg',
        },
      }

      service.saveDraft(formDataWithFiles)

      const savedData = JSON.parse(
        (global.localStorage.setItem as any).mock.calls.find(
          (call: any[]) => call[0] === 'membership-form-draft'
        )?.[1] || '{}'
      )

      expect(savedData.identity.photoURL).toBe('https://example.com/photo.jpg')
    })

    it('ne devrait pas bloquer si localStorage échoue', () => {
      ; (global.localStorage.setItem as any).mockImplementation(() => {
        throw new Error('localStorage error')
      })

      expect(() => service.saveDraft(validFormData)).not.toThrow()
    })
  })

  describe('loadDraft', () => {
    it('devrait charger un brouillon depuis localStorage', () => {
      const draftData = JSON.stringify(validFormData)
      const timestamp = Date.now().toString()
        ; (global.localStorage.getItem as any).mockImplementation((key: string) => {
          if (key === 'membership-form-draft') return draftData
          if (key === 'membership-form-draft-timestamp') return timestamp
          return null
        })

      const result = service.loadDraft()

      expect(result).toEqual(validFormData)
    })

    it('devrait retourner null si aucun brouillon', () => {
      ; (global.localStorage.getItem as any).mockReturnValue(null)

      const result = service.loadDraft()

      expect(result).toBeNull()
    })

    it('devrait retourner null si le brouillon a expiré', () => {
      const draftData = JSON.stringify(validFormData)
      // Timestamp il y a 8 jours (au-delà de l'expiration de 7 jours)
      const oldTimestamp = (Date.now() - 8 * 24 * 60 * 60 * 1000).toString()
        ; (global.localStorage.getItem as any).mockImplementation((key: string) => {
          if (key === 'membership-form-draft') return draftData
          if (key === 'membership-form-draft-timestamp') return oldTimestamp
          return null
        })

      const result = service.loadDraft()

      expect(result).toBeNull()
      expect(global.localStorage.removeItem).toHaveBeenCalledWith('membership-form-draft')
    })

    it('devrait supprimer le brouillon corrompu en cas d\'erreur de parsing', () => {
      ; (global.localStorage.getItem as any).mockImplementation((key: string) => {
        if (key === 'membership-form-draft') return 'invalid json'
        if (key === 'membership-form-draft-timestamp') return Date.now().toString()
        return null
      })

      const result = service.loadDraft()

      expect(result).toBeNull()
      expect(global.localStorage.removeItem).toHaveBeenCalledWith('membership-form-draft')
    })
  })

  describe('hasDraft', () => {
    it('devrait retourner true si un brouillon existe', () => {
      const draftData = JSON.stringify(validFormData)
      const timestamp = Date.now().toString()
        ; (global.localStorage.getItem as any).mockImplementation((key: string) => {
          if (key === 'membership-form-draft') return draftData
          if (key === 'membership-form-draft-timestamp') return timestamp
          return null
        })

      const result = service.hasDraft()

      expect(result).toBe(true)
    })

    it('devrait retourner false si aucun brouillon', () => {
      ; (global.localStorage.getItem as any).mockReturnValue(null)

      const result = service.hasDraft()

      expect(result).toBe(false)
    })
  })

  describe('clearDraft', () => {
    it('devrait supprimer le brouillon', () => {
      service.clearDraft()

      expect(global.localStorage.removeItem).toHaveBeenCalledWith('membership-form-draft')
      expect(global.localStorage.removeItem).toHaveBeenCalledWith('membership-form-draft-timestamp')
    })

    it('ne devrait pas bloquer si localStorage échoue', () => {
      ; (global.localStorage.removeItem as any).mockImplementation(() => {
        throw new Error('localStorage error')
      })

      expect(() => service.clearDraft()).not.toThrow()
    })
  })

  describe('getDraftAge', () => {
    it('devrait retourner l\'âge du brouillon en jours', () => {
      const daysAgo = 3
      const timestamp = (Date.now() - daysAgo * 24 * 60 * 60 * 1000).toString()
        ; (global.localStorage.getItem as any).mockReturnValue(timestamp)

      const result = service.getDraftAge()

      expect(result).toBe(daysAgo)
    })

    it('devrait retourner null si aucun brouillon', () => {
      ; (global.localStorage.getItem as any).mockReturnValue(null)

      const result = service.getDraftAge()

      expect(result).toBeNull()
    })

    it('devrait retourner null en cas d\'erreur', () => {
      ; (global.localStorage.getItem as any).mockReturnValue('invalid')

      const result = service.getDraftAge()

      expect(result).toBeNull()
    })
  })
})
