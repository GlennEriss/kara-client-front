/**
 * Tests d'intégration pour le module Registration
 * Teste l'intégration entre Repository → Service → Hook → Components
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useRegistration } from '../../hooks/useRegistration'
import { RegistrationService } from '../../services/RegistrationService'
import { RegistrationCacheService } from '../../services/RegistrationCacheService'
import type { IRegistrationRepository } from '../../repositories/IRegistrationRepository'
import type { RegisterFormData, MembershipRequest } from '../../entities'

// ==================== MOCKS ====================

// Mock de localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
    get length() {
      return Object.keys(store).length
    },
    key: (index: number) => Object.keys(store)[index] || null,
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock de getMembershipRequestById
vi.mock('@/db/membership.db', () => ({
  getMembershipRequestById: vi.fn(),
}))

// Mock de toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// ==================== DONNÉES DE TEST ====================

const createMockFormData = (): RegisterFormData => ({
  identity: {
    civility: 'Monsieur',
    lastName: 'KOUMBA',
    firstName: 'Jean-Pierre',
    birthDate: '1990-05-15',
    birthPlace: 'Libreville, Gabon',
    birthCertificateNumber: '1234/2020/LBV',
    prayerPlace: 'Église Saint-Michel',
    religion: 'Christianisme',
    contacts: ['+24160123456', '+24165987654'],
    email: 'jean.koumba@email.com',
    gender: 'Homme',
    nationality: 'Gabonaise',
    maritalStatus: 'Célibataire',
    intermediaryCode: '1228.MK.0058',
    hasCar: true,
  },
  address: {
    province: 'Estuaire',
    city: 'Libreville',
    district: 'Akébé',
    arrondissement: '1er Arrondissement',
    additionalInfo: 'Avenue du Général de Gaulle, Près de la station Total',
  },
  company: {
    isEmployed: true,
    companyName: 'Tech Solutions Gabon',
    profession: 'Développeur Full Stack',
    seniority: '5 ans',
    companyAddress: {
      province: 'Estuaire',
      city: 'Libreville',
      district: 'Akébé',
    },
  },
  documents: {
    identityDocument: 'CNI',
    identityDocumentNumber: 'GA123456789',
    expirationDate: '2030-12-31',
    issuingPlace: 'Libreville',
    issuingDate: '2020-01-01',
    termsAccepted: true,
  },
})

const createMockMembershipRequest = (data: RegisterFormData): MembershipRequest => ({
  id: 'test-request-id-123',
  ...data,
  matricule: '1234.MK.5678',
  status: 'pending',
  createdAt: new Date(),
  updatedAt: new Date(),
  securityCode: 'SEC-CODE-123',
  securityCodeUsed: false,
  securityCodeExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  reviewNote: 'Veuillez vérifier votre adresse',
})

// ==================== TESTS ====================

describe('Registration Integration Tests', () => {
  let mockRepository: IRegistrationRepository
  let registrationService: RegistrationService
  let cacheService: RegistrationCacheService

  beforeEach(() => {
    // Reset localStorage
    localStorageMock.clear()

    // Reset mocks
    vi.clearAllMocks()

    // Créer les instances
    mockRepository = {
      create: vi.fn(),
      getById: vi.fn(),
      update: vi.fn(),
      verifySecurityCode: vi.fn(),
      markSecurityCodeAsUsed: vi.fn(),
    } as unknown as IRegistrationRepository

    registrationService = new RegistrationService(mockRepository)
    cacheService = new RegistrationCacheService({ expiry: 1000 * 60 * 60 })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ==================== FLUX COMPLET ====================

  describe('Flux complet : Soumission formulaire', () => {
    it('devrait intégrer correctement le flux complet : remplissage → cache → soumission', async () => {
      const mockData = createMockFormData()
      const expectedId = 'new-request-id-456'

      // Mock du repository
      vi.mocked(mockRepository.create).mockResolvedValue(expectedId)

      // Render le hook
      const { result } = renderHook(() =>
        useRegistration({ registrationService, cacheService })
      )

      // Attendre que le cache soit chargé
      await waitFor(() => {
        expect(result.current.isCacheLoaded).toBe(true)
      })

      // 1. Remplir le formulaire
      act(() => {
        result.current.form.reset(mockData)
      })

      // Attendre que la sauvegarde automatique se déclenche
      await new Promise((resolve) => setTimeout(resolve, 600))

      // 2. Vérifier que le cache est sauvegardé
      expect(cacheService.hasCachedData()).toBe(true)
      const cachedData = cacheService.loadFormData()
      expect(cachedData).toBeDefined()
      expect(cachedData?.identity?.lastName).toBe('KOUMBA')

      // 3. Soumettre le formulaire
      await act(async () => {
        await result.current.submitForm()
      })

      // 4. Vérifier que le repository a été appelé
      expect(mockRepository.create).toHaveBeenCalledWith(mockData)

      // 5. Vérifier l'état final
      await waitFor(() => {
        expect(result.current.isSubmitted).toBe(true)
        expect(result.current.userData?.lastName).toBe('KOUMBA')
      })

      // 6. Vérifier que les données de formulaire ont été nettoyées
      expect(cacheService.hasCachedData()).toBe(false)
      expect(cacheService.hasValidSubmission()).toBe(true)
    })

    it('devrait gérer les erreurs de soumission en cascade', async () => {
      const mockData = createMockFormData()
      const error = new Error('Erreur réseau')

      // Mock une erreur du repository
      vi.mocked(mockRepository.create).mockRejectedValue(error)

      const { result } = renderHook(() =>
        useRegistration({ registrationService, cacheService })
      )

      await waitFor(() => {
        expect(result.current.isCacheLoaded).toBe(true)
      })

      act(() => {
        result.current.form.reset(mockData)
      })

      // Tenter la soumission
      await act(async () => {
        try {
          await result.current.submitForm()
        } catch (e) {
          // Erreur attendue
        }
      })

      // Vérifier que l'erreur est propagée
      await waitFor(() => {
        expect(result.current.submissionError).toBe('Erreur réseau')
        expect(result.current.isSubmitted).toBe(false)
      })

      // Vérifier que le cache n'est pas supprimé en cas d'erreur
      expect(cacheService.hasCachedData()).toBe(true)
    })
  })

  // ==================== CACHE SERVICE ====================

  describe('Cache Service + Registration Service', () => {
    it('devrait sauvegarder automatiquement lors de la navigation', async () => {
      const { result } = renderHook(() =>
        useRegistration({ registrationService, cacheService })
      )

      await waitFor(() => {
        expect(result.current.isCacheLoaded).toBe(true)
      })

      // Modifier le formulaire
      act(() => {
        result.current.form.setValue('identity.lastName', 'MBOUMBA')
      })

      // Attendre le debounce
      await new Promise((resolve) => setTimeout(resolve, 600))

      // Vérifier la sauvegarde
      const cachedData = cacheService.loadFormData()
      expect(cachedData?.identity?.lastName).toBe('MBOUMBA')
    })

    it('devrait restaurer les données du cache au chargement', async () => {
      const mockData = createMockFormData()

      // Pré-remplir le cache
      cacheService.saveFormData(mockData)
      cacheService.saveCurrentStep(3)
      cacheService.saveCompletedSteps(new Set([1, 2]))

      // Render le hook
      const { result } = renderHook(() =>
        useRegistration({ registrationService, cacheService })
      )

      await waitFor(() => {
        expect(result.current.isCacheLoaded).toBe(true)
      })

      // Vérifier la restauration
      expect(result.current.form.getValues('identity.lastName')).toBe('KOUMBA')
      expect(result.current.currentStep).toBe(3)
      expect(result.current.completedSteps.has(1)).toBe(true)
      expect(result.current.completedSteps.has(2)).toBe(true)
    })

    it('devrait nettoyer le cache expiré', async () => {
      const mockData = createMockFormData()

      // Créer un service avec un cache expiré
      const expiredCacheService = new RegistrationCacheService({ expiry: -1 })
      expiredCacheService.saveFormData(mockData)

      // Vérifier que le cache est marqué comme expiré
      expect(expiredCacheService.isExpired()).toBe(true)

      // Render le hook
      const { result } = renderHook(() =>
        useRegistration({
          registrationService,
          cacheService: expiredCacheService,
        })
      )

      await waitFor(() => {
        expect(result.current.isCacheLoaded).toBe(true)
      })

      // Vérifier que le cache a été nettoyé
      expect(expiredCacheService.hasCachedData()).toBe(false)
    })

    it('devrait gérer la version du cache', async () => {
      const mockData = createMockFormData()

      // Sauvegarder avec l'ancienne version
      cacheService.saveFormData(mockData)
      localStorage.setItem('register-cache-version', '1')

      // Créer un nouveau service avec une version différente
      const newCacheService = new RegistrationCacheService({ version: '2' })

      // Render le hook
      const { result } = renderHook(() =>
        useRegistration({
          registrationService,
          cacheService: newCacheService,
        })
      )

      await waitFor(() => {
        expect(result.current.isCacheLoaded).toBe(true)
      })

      // Vérifier que le cache a été nettoyé
      expect(newCacheService.hasCachedData()).toBe(false)
    })
  })

  // ==================== HOOK + SERVICE ====================

  describe('useRegistration + RegistrationService', () => {
    it('devrait naviguer entre les étapes avec validation', async () => {
      const mockData = createMockFormData()

      const { result } = renderHook(() =>
        useRegistration({ registrationService, cacheService })
      )

      await waitFor(() => {
        expect(result.current.isCacheLoaded).toBe(true)
      })

      // Remplir l'étape 1 (identité)
      act(() => {
        result.current.form.reset({
          ...mockData,
          address: {} as any,
          company: {} as any,
          documents: {} as any,
        })
      })

      // Essayer de passer à l'étape suivante
      let canProceed = false
      await act(async () => {
        canProceed = await result.current.nextStep()
      })

      // Devrait pouvoir passer si les données sont valides
      expect(canProceed).toBe(true)
      expect(result.current.currentStep).toBe(2)
    })

    it('devrait bloquer la navigation si l\'étape est invalide', async () => {
      const { result } = renderHook(() =>
        useRegistration({ registrationService, cacheService })
      )

      await waitFor(() => {
        expect(result.current.isCacheLoaded).toBe(true)
      })

      // Ne pas remplir de données (étape invalide)
      expect(result.current.currentStep).toBe(1)

      // Essayer de passer à l'étape suivante
      let canProceed = true
      await act(async () => {
        canProceed = await result.current.nextStep()
      })

      // Ne devrait pas pouvoir passer
      expect(canProceed).toBe(false)
      expect(result.current.currentStep).toBe(1)
    })

    it('devrait permettre la navigation arrière sans validation', async () => {
      const { result } = renderHook(() =>
        useRegistration({ registrationService, cacheService })
      )

      await waitFor(() => {
        expect(result.current.isCacheLoaded).toBe(true)
      })

      // Aller à l'étape 3
      act(() => {
        result.current.goToStep(3)
      })

      expect(result.current.currentStep).toBe(3)

      // Revenir en arrière
      act(() => {
        result.current.prevStep()
      })

      expect(result.current.currentStep).toBe(2)
    })
  })

  // ==================== CODE DE SÉCURITÉ ====================

  describe('Code de sécurité pour corrections', () => {
    it('devrait vérifier le code et charger les données pour correction', async () => {
      const mockData = createMockFormData()
      const mockRequest = createMockMembershipRequest(mockData)

      // Mock de l'URL avec requestId
      const originalLocation = window.location
      delete (window as any).location
      window.location = {
        ...originalLocation,
        search: '?requestId=test-request-id-123',
      } as any

      // Mock de getMembershipRequestById (utilisé par le hook au chargement)
      const { getMembershipRequestById } = await import('@/db/membership.db')
      vi.mocked(getMembershipRequestById).mockResolvedValue(mockRequest)

      // Mock des appels
      vi.mocked(mockRepository.verifySecurityCode).mockResolvedValue(true)
      vi.mocked(mockRepository.getById).mockResolvedValue(mockRequest)

      const { result } = renderHook(() =>
        useRegistration({ registrationService, cacheService })
      )

      await waitFor(() => {
        expect(result.current.isCacheLoaded).toBe(true)
      })

      // Vérifier que correctionRequest a été chargé depuis l'URL
      await waitFor(() => {
        expect(result.current.correctionRequest).toBeDefined()
        expect(result.current.correctionRequest?.requestId).toBe('test-request-id-123')
      })

      // Saisir le code
      act(() => {
        result.current.setSecurityCodeInput('SEC-CODE-123')
      })

      // Vérifier le code
      let isValid = false
      await act(async () => {
        isValid = await result.current.verifySecurityCode()
      })

      // Vérifier le résultat
      expect(isValid).toBe(true)
      expect(mockRepository.verifySecurityCode).toHaveBeenCalledWith(
        'test-request-id-123',
        'SEC-CODE-123'
      )

      // Vérifier que les données ont été chargées
      await waitFor(() => {
        expect(result.current.form.getValues('identity.lastName')).toBe('KOUMBA')
      })
    })

    it('devrait rejeter un code invalide', async () => {
      const mockData = createMockFormData()
      const mockRequest = createMockMembershipRequest(mockData)

      // Mock de l'URL avec requestId
      const originalLocation = window.location
      delete (window as any).location
      window.location = {
        ...originalLocation,
        search: '?requestId=test-request-id-123',
      } as any

      // Mock de getMembershipRequestById
      const { getMembershipRequestById } = await import('@/db/membership.db')
      vi.mocked(getMembershipRequestById).mockResolvedValue(mockRequest)

      vi.mocked(mockRepository.verifySecurityCode).mockResolvedValue(false)

      const { result } = renderHook(() =>
        useRegistration({ registrationService, cacheService })
      )

      await waitFor(() => {
        expect(result.current.isCacheLoaded).toBe(true)
        expect(result.current.correctionRequest).toBeDefined()
      })

      // Saisir un mauvais code
      act(() => {
        result.current.setSecurityCodeInput('WRONG-CODE')
      })

      // Vérifier le code
      let isValid = true
      await act(async () => {
        isValid = await result.current.verifySecurityCode()
      })

      expect(isValid).toBe(false)
    })

    it('devrait mettre à jour une demande existante après correction', async () => {
      const mockData = createMockFormData()
      const mockRequest = createMockMembershipRequest(mockData)

      // Mock de l'URL avec requestId
      Object.defineProperty(window, 'location', {
        writable: true,
        value: {
          ...window.location,
          search: `?requestId=${mockRequest.id}`,
        },
      })

      // Mock de getMembershipRequestById
      const { getMembershipRequestById } = await import('@/db/membership.db')
      vi.mocked(getMembershipRequestById).mockResolvedValue(mockRequest)

      // Mock des appels
      vi.mocked(mockRepository.verifySecurityCode).mockResolvedValue(true)
      vi.mocked(mockRepository.getById).mockResolvedValue(mockRequest)
      vi.mocked(mockRepository.update).mockResolvedValue(true)

      const { result } = renderHook(() =>
        useRegistration({ registrationService, cacheService })
      )

      await waitFor(() => {
        expect(result.current.isCacheLoaded).toBe(true)
        expect(result.current.correctionRequest).toBeDefined()
      })

      // 1. Saisir le code de sécurité
      act(() => {
        result.current.setSecurityCodeInput(mockRequest.securityCode!)
      })

      // 2. Vérifier le code
      await act(async () => {
        await result.current.verifySecurityCode()
      })

      // 3. Modifier les données
      await act(async () => {
        result.current.form.setValue('address.additionalInfo', 'Nouvelle adresse')
      })

      // 4. Soumettre les corrections
      await act(async () => {
        await result.current.submitForm()
      })

      // 5. Vérifier que update a été appelé (pas create)
      expect(mockRepository.update).toHaveBeenCalledWith(
        mockRequest.id,
        expect.objectContaining({
          address: expect.objectContaining({
            additionalInfo: 'Nouvelle adresse',
          }),
        })
      )
      expect(mockRepository.create).not.toHaveBeenCalled()
    })
  })

  // ==================== VALIDATION CROISÉE ====================

  describe('Validation croisée', () => {
    it('devrait valider les dépendances entre étapes', async () => {
      const mockData = createMockFormData()

      const { result } = renderHook(() =>
        useRegistration({ registrationService, cacheService })
      )

      await waitFor(() => {
        expect(result.current.isCacheLoaded).toBe(true)
      })

      // Remplir avec données d'employé
      act(() => {
        result.current.form.reset({
          ...mockData,
          company: {
            isEmployed: true,
            companyName: '', // Manquant (devrait être requis)
          } as any,
        })
      })

      // Valider l'étape entreprise
      let isValid = true
      await act(async () => {
        isValid = await result.current.validateStep(3)
      })

      // Devrait être invalide car companyName est requis si isEmployed = true
      expect(isValid).toBe(false)
    })

    it('devrait valider les informations du conjoint si marié', async () => {
      const mockData = createMockFormData()

      const { result } = renderHook(() =>
        useRegistration({ registrationService, cacheService })
      )

      await waitFor(() => {
        expect(result.current.isCacheLoaded).toBe(true)
      })

      // Remplir avec statut marié mais sans info conjoint
      act(() => {
        result.current.form.reset({
          ...mockData,
          identity: {
            ...mockData.identity,
            maritalStatus: 'Marié(e)',
            spouseLastName: '', // Manquant
            spouseFirstName: '', // Manquant
          },
        })
      })

      // Valider l'étape identité
      let isValid = true
      await act(async () => {
        isValid = await result.current.validateStep(1)
      })

      // Devrait être invalide
      expect(isValid).toBe(false)
    })
  })

  // ==================== GESTION D'ERREURS ====================

  describe('Gestion des erreurs en cascade', () => {
    it('devrait propager les erreurs Repository → Service → Hook', async () => {
      const mockData = createMockFormData()
      const error = new Error('Erreur Firestore')

      // Mock une erreur au niveau Repository
      vi.mocked(mockRepository.create).mockRejectedValue(error)

      const { result } = renderHook(() =>
        useRegistration({ registrationService, cacheService })
      )

      await waitFor(() => {
        expect(result.current.isCacheLoaded).toBe(true)
      })

      act(() => {
        result.current.form.reset(mockData)
      })

      // Tenter la soumission
      await act(async () => {
        try {
          await result.current.submitForm()
        } catch (e) {
          // Erreur attendue
        }
      })

      // Vérifier que l'erreur est propagée jusqu'au hook
      await waitFor(() => {
        expect(result.current.submissionError).toBe('Erreur Firestore')
      })
    })

    it('devrait permettre un retry après une erreur', async () => {
      const mockData = createMockFormData()

      // Premier appel : erreur
      vi.mocked(mockRepository.create)
        .mockRejectedValueOnce(new Error('Erreur réseau'))
        .mockResolvedValueOnce('success-id')

      const { result } = renderHook(() =>
        useRegistration({ registrationService, cacheService })
      )

      await waitFor(() => {
        expect(result.current.isCacheLoaded).toBe(true)
      })

      act(() => {
        result.current.form.reset(mockData)
      })

      // Premier essai (échec)
      await act(async () => {
        try {
          await result.current.submitForm()
        } catch (e) {
          // Erreur attendue
        }
      })

      expect(result.current.submissionError).toBeTruthy()

      // Retry
      await act(async () => {
        await result.current.submitForm()
      })

      // Devrait réussir
      await waitFor(() => {
        expect(result.current.isSubmitted).toBe(true)
        expect(result.current.submissionError).toBeNull()
      })
    })
  })

  // ==================== RÉINITIALISATION ====================

  describe('Réinitialisation du formulaire', () => {
    it('devrait réinitialiser complètement le formulaire et le cache', async () => {
      const mockData = createMockFormData()

      const { result } = renderHook(() =>
        useRegistration({ registrationService, cacheService })
      )

      await waitFor(() => {
        expect(result.current.isCacheLoaded).toBe(true)
      })

      // Remplir le formulaire
      act(() => {
        result.current.form.reset(mockData)
        result.current.goToStep(3)
      })

      // Attendre la sauvegarde
      await new Promise((resolve) => setTimeout(resolve, 600))

      // Vérifier que des données existent
      expect(cacheService.hasCachedData()).toBe(true)
      expect(result.current.currentStep).toBe(3)

      // Réinitialiser
      act(() => {
        result.current.resetForm()
      })

      // Vérifier la réinitialisation
      await waitFor(() => {
        expect(result.current.currentStep).toBe(1)
        expect(result.current.form.getValues('identity.lastName')).toBe('')
        expect(cacheService.hasCachedData()).toBe(false)
      })
    })
  })
})
