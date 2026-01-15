/**
 * Tests unitaires pour RegistrationCacheService
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { RegistrationCacheService } from '../../services/RegistrationCacheService'
import type { RegisterFormData } from '../../entities'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('RegistrationCacheService', () => {
  let cacheService: RegistrationCacheService

  beforeEach(() => {
    localStorage.clear()
    cacheService = new RegistrationCacheService()
  })

  describe('isExpired', () => {
    it('devrait retourner true si aucun timestamp', () => {
      expect(cacheService.isExpired()).toBe(true)
    })

    it('devrait retourner false si le cache est récent', () => {
      const now = Date.now()
      localStorage.setItem('register-cache-timestamp', now.toString())
      expect(cacheService.isExpired()).toBe(false)
    })

    it('devrait retourner true si le cache est expiré', () => {
      const oldTime = Date.now() - 25 * 60 * 60 * 1000 // 25h
      localStorage.setItem('register-cache-timestamp', oldTime.toString())
      expect(cacheService.isExpired()).toBe(true)
    })
  })

  describe('isSubmissionExpired', () => {
    it('devrait retourner true si aucun timestamp', () => {
      expect(cacheService.isSubmissionExpired()).toBe(true)
    })

    it('devrait retourner false si la soumission est récente', () => {
      const now = Date.now()
      localStorage.setItem('register-submission-timestamp', now.toString())
      expect(cacheService.isSubmissionExpired()).toBe(false)
    })

    it('devrait retourner true si la soumission est expirée', () => {
      const oldTime = Date.now() - 49 * 60 * 60 * 1000 // 49h
      localStorage.setItem('register-submission-timestamp', oldTime.toString())
      expect(cacheService.isSubmissionExpired()).toBe(true)
    })
  })

  describe('saveFormData et loadFormData', () => {
    it('devrait sauvegarder et charger les données du formulaire', () => {
      const formData: Partial<RegisterFormData> = {
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
          gender: 'Homme',
          nationality: 'Gabonaise',
          maritalStatus: 'Célibataire',
          hasCar: false,
        },
      }

      cacheService.saveFormData(formData)
      const loaded = cacheService.loadFormData()

      expect(loaded).toEqual(formData)
    })

    it('devrait retourner null si le cache est expiré', () => {
      const formData: Partial<RegisterFormData> = {
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
          gender: 'Homme',
          nationality: 'Gabonaise',
          maritalStatus: 'Célibataire',
          hasCar: false,
        },
      }

      cacheService.saveFormData(formData)
      
      // Simuler l'expiration
      const oldTime = Date.now() - 25 * 60 * 60 * 1000
      localStorage.setItem('register-cache-timestamp', oldTime.toString())

      const loaded = cacheService.loadFormData()
      expect(loaded).toBeNull()
    })

    it('devrait nettoyer les données obsolètes (insurance)', () => {
      const formDataWithInsurance = {
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
          gender: 'Homme',
          nationality: 'Gabonaise',
          maritalStatus: 'Célibataire',
          hasCar: false,
        },
        insurance: { plan: 'premium' }, // Données obsolètes
      }

      localStorage.setItem('register-form-data', JSON.stringify(formDataWithInsurance))
      localStorage.setItem('register-cache-timestamp', Date.now().toString())
      localStorage.setItem('register-cache-version', '2')

      const loaded = cacheService.loadFormData()
      expect(loaded).not.toHaveProperty('insurance')
    })

    it('devrait nettoyer le cache si la version est obsolète', () => {
      const formData: Partial<RegisterFormData> = {
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
          gender: 'Homme',
          nationality: 'Gabonaise',
          maritalStatus: 'Célibataire',
          hasCar: false,
        },
      }

      cacheService.saveFormData(formData)
      
      // Changer la version
      localStorage.setItem('register-cache-version', '1')

      const loaded = cacheService.loadFormData()
      expect(loaded).toBeNull()
    })
  })

  describe('saveCurrentStep et loadCurrentStep', () => {
    it('devrait sauvegarder et charger l\'étape actuelle', () => {
      cacheService.saveCurrentStep(3)
      expect(cacheService.loadCurrentStep()).toBe(3)
    })

    it('devrait retourner 1 par défaut si aucune étape sauvegardée', () => {
      expect(cacheService.loadCurrentStep()).toBe(1)
    })
  })

  describe('saveCompletedSteps et loadCompletedSteps', () => {
    it('devrait sauvegarder et charger les étapes complétées', () => {
      const steps = new Set([1, 2, 3])
      cacheService.saveCompletedSteps(steps)
      const loaded = cacheService.loadCompletedSteps()

      expect(loaded).toEqual(steps)
    })

    it('devrait retourner un Set vide par défaut', () => {
      const loaded = cacheService.loadCompletedSteps()
      expect(loaded).toEqual(new Set())
    })
  })

  describe('saveSubmissionData et loadSubmissionData', () => {
    it('devrait sauvegarder et charger les données de soumission', () => {
      const membershipId = 'test-id-123'
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        civility: 'Monsieur',
      }

      cacheService.saveSubmissionData(membershipId, userData)
      const loaded = cacheService.loadSubmissionData()

      expect(loaded).toEqual({
        membershipId,
        userData,
        timestamp: expect.any(Number),
      })
    })

    it('devrait retourner null si la soumission est expirée', () => {
      const membershipId = 'test-id-123'
      const userData = { firstName: 'John', lastName: 'Doe' }

      cacheService.saveSubmissionData(membershipId, userData)
      
      // Simuler l'expiration
      const oldTime = Date.now() - 49 * 60 * 60 * 1000
      localStorage.setItem('register-submission-timestamp', oldTime.toString())

      const loaded = cacheService.loadSubmissionData()
      expect(loaded).toBeNull()
    })
  })

  describe('hasCachedData', () => {
    it('devrait retourner true si des données sont en cache', () => {
      const formData: Partial<RegisterFormData> = {
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
          gender: 'Homme',
          nationality: 'Gabonaise',
          maritalStatus: 'Célibataire',
          hasCar: false,
        },
      }

      cacheService.saveFormData(formData)
      expect(cacheService.hasCachedData()).toBe(true)
    })

    it('devrait retourner false si aucune donnée en cache', () => {
      expect(cacheService.hasCachedData()).toBe(false)
    })
  })

  describe('hasValidSubmission', () => {
    it('devrait retourner true si une soumission valide existe', () => {
      cacheService.saveSubmissionData('test-id', { firstName: 'John' })
      expect(cacheService.hasValidSubmission()).toBe(true)
    })

    it('devrait retourner false si aucune soumission', () => {
      expect(cacheService.hasValidSubmission()).toBe(false)
    })
  })

  describe('clearFormDataOnly', () => {
    it('devrait supprimer uniquement les données du formulaire', () => {
      const formData: Partial<RegisterFormData> = {
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
          gender: 'Homme',
          nationality: 'Gabonaise',
          maritalStatus: 'Célibataire',
          hasCar: false,
        },
      }
      
      // Sauvegarder les données du formulaire
      cacheService.saveFormData(formData)
      cacheService.saveCurrentStep(2)

      // Vérifier que tout est sauvegardé
      expect(cacheService.loadFormData()).not.toBeNull()
      expect(cacheService.loadCurrentStep()).toBe(2)

      // Nettoyer uniquement les données du formulaire
      cacheService.clearFormDataOnly()

      // Vérifier que les données du formulaire sont supprimées
      expect(cacheService.loadFormData()).toBeNull()
      expect(cacheService.loadCurrentStep()).toBe(1)
      
      // Vérifier que les clés de formulaire sont supprimées
      expect(localStorage.getItem('register-form-data')).toBeNull()
      expect(localStorage.getItem('register-cache-timestamp')).toBeNull()
      expect(localStorage.getItem('register-current-step')).toBeNull()
      expect(localStorage.getItem('register-completed-steps')).toBeNull()
    })
  })

  describe('clearSubmissionData', () => {
    it('devrait supprimer uniquement les données de soumission', () => {
      cacheService.saveFormData({ identity: { civility: 'Monsieur', lastName: 'Doe', firstName: 'John', birthDate: '1990-01-01', birthPlace: 'Libreville', birthCertificateNumber: '123456', prayerPlace: 'Église', religion: 'Christianisme', contacts: ['+24165671734'], gender: 'Homme', nationality: 'Gabonaise', maritalStatus: 'Célibataire', hasCar: false } })
      cacheService.saveSubmissionData('test-id', { firstName: 'John' })

      cacheService.clearSubmissionData()

      expect(cacheService.loadFormData()).not.toBeNull() // Les données du formulaire doivent rester
      expect(cacheService.loadSubmissionData()).toBeNull()
    })
  })

  describe('clearAll', () => {
    it('devrait supprimer toutes les données du cache', () => {
      cacheService.saveFormData({ identity: { civility: 'Monsieur', lastName: 'Doe', firstName: 'John', birthDate: '1990-01-01', birthPlace: 'Libreville', birthCertificateNumber: '123456', prayerPlace: 'Église', religion: 'Christianisme', contacts: ['+24165671734'], gender: 'Homme', nationality: 'Gabonaise', maritalStatus: 'Célibataire', hasCar: false } })
      cacheService.saveCurrentStep(2)
      cacheService.saveSubmissionData('test-id', { firstName: 'John' })

      cacheService.clearAll()

      expect(cacheService.loadFormData()).toBeNull()
      expect(cacheService.loadCurrentStep()).toBe(1)
      expect(cacheService.loadSubmissionData()).toBeNull()
    })
  })

  describe('Configuration personnalisée', () => {
    it('devrait utiliser la configuration personnalisée', () => {
      const customService = new RegistrationCacheService({
        expiry: 1000, // 1 seconde
        version: '3',
      })

      const formData: Partial<RegisterFormData> = {
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
          gender: 'Homme',
          nationality: 'Gabonaise',
          maritalStatus: 'Célibataire',
          hasCar: false,
        },
      }

      customService.saveFormData(formData)
      
      // Attendre que le cache expire
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(customService.isExpired()).toBe(true)
          resolve()
        }, 1100)
      })
    })
  })
})
