/**
 * Tests unitaires pour MembershipErrorHandler
 * 
 * Teste la normalisation et le formatage des erreurs
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { 
  MembershipErrorHandler, 
  MembershipErrorCode,
  type MembershipError 
} from '../../../services/MembershipErrorHandler'

describe('MembershipErrorHandler', () => {
  let handler: MembershipErrorHandler

  beforeEach(() => {
    vi.clearAllMocks()
    // Réinitialiser l'instance singleton pour chaque test
    ;(MembershipErrorHandler as any).instance = undefined
    handler = MembershipErrorHandler.getInstance()
  })

  describe('getInstance', () => {
    it('devrait retourner une instance singleton', () => {
      const instance1 = MembershipErrorHandler.getInstance()
      const instance2 = MembershipErrorHandler.getInstance()
      expect(instance1).toBe(instance2)
    })
  })

  describe('normalizeError', () => {
    it('devrait normaliser une erreur Firebase Storage unauthorized', () => {
      const error = {
        code: 'storage/unauthorized',
        message: 'User does not have permission',
      }

      const result = handler.normalizeError(error)

      expect(result.code).toBe(MembershipErrorCode.STORAGE_PERMISSION_DENIED)
      expect(result.message).toBe('User does not have permission')
      expect(result.originalError).toBe(error)
    })

    it('devrait normaliser une erreur Firestore permission-denied', () => {
      const error = {
        code: 'permission-denied',
        message: 'Missing or insufficient permissions',
      }

      const result = handler.normalizeError(error)

      expect(result.code).toBe(MembershipErrorCode.FIRESTORE_PERMISSION_DENIED)
      expect(result.message).toBe('Missing or insufficient permissions')
    })

    it('devrait normaliser une erreur Firebase Functions not-found', () => {
      const error = {
        code: 'functions/not-found',
        message: 'Function not found',
      }

      const result = handler.normalizeError(error)

      expect(result.code).toBe(MembershipErrorCode.FUNCTION_NOT_FOUND)
    })

    it('devrait normaliser une erreur ZodError (validation)', () => {
      const error = {
        name: 'ZodError',
        errors: [
          {
            path: ['identity', 'lastName'],
            message: 'Required',
          },
        ],
        message: 'Validation failed',
      }

      const result = handler.normalizeError(error)

      expect(result.code).toBe(MembershipErrorCode.VALIDATION_ERROR)
      expect(result.message).toBe('Validation failed')
    })

    it('devrait normaliser une erreur réseau', () => {
      const error = {
        code: 'network-error',
        message: 'Network request failed',
      }

      const result = handler.normalizeError(error)

      expect(result.code).toBe(MembershipErrorCode.NETWORK_ERROR)
    })

    it('devrait normaliser une erreur timeout', () => {
      const error = {
        code: 'timeout',
        message: 'Request timeout',
      }

      const result = handler.normalizeError(error)

      expect(result.code).toBe(MembershipErrorCode.TIMEOUT_ERROR)
    })

    it('devrait normaliser une erreur inconnue', () => {
      const error = new Error('Something went wrong')

      const result = handler.normalizeError(error)

      expect(result.code).toBe(MembershipErrorCode.UNKNOWN_ERROR)
      expect(result.message).toBe('Something went wrong')
    })

    it('devrait inclure un contexte dans les logs', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const error = new Error('Test error')

      handler.normalizeError(error, 'testContext')

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[MembershipErrorHandler:testContext]'),
        expect.anything()
      )

      consoleSpy.mockRestore()
    })

    it('devrait extraire les détails de la stack trace', () => {
      const error = new Error('Test error')
      error.stack = 'Error: Test error\n    at test.js:1:1'

      const result = handler.normalizeError(error)

      expect(result.details).toBe(error.stack)
    })
  })

  describe('generateUserMessage', () => {
    it('devrait générer un message utilisateur pour une erreur de validation', () => {
      const error = {
        name: 'ZodError',
        errors: [
          {
            path: ['identity', 'lastName'],
            message: 'Required',
          },
        ],
      }

      const result = handler.normalizeError(error)

      expect(result.userMessage).toContain('identity.lastName')
      expect(result.userMessage).toContain('Required')
    })

    it('devrait générer un message utilisateur pour une erreur Storage permission-denied', () => {
      const error = {
        code: 'storage/permission-denied',
        message: 'Permission denied',
      }

      const result = handler.normalizeError(error)

      expect(result.userMessage).toContain('permission')
      expect(result.userMessage).toContain('uploader')
    })

    it('devrait générer un message utilisateur pour une erreur réseau', () => {
      const error = {
        code: 'network-error',
        message: 'Network request failed',
      }

      const result = handler.normalizeError(error)

      expect(result.userMessage).toContain('réseau')
      expect(result.userMessage).toContain('connexion')
    })

    it('devrait générer un message utilisateur pour une erreur de quota Storage', () => {
      const error = {
        code: 'storage/quota-exceeded',
        message: 'Quota exceeded',
      }

      const result = handler.normalizeError(error)

      expect(result.userMessage).toContain('stockage')
      expect(result.userMessage).toContain('insuffisant')
    })
  })

  describe('createValidationError', () => {
    it('devrait créer une erreur de validation avec un message personnalisé', () => {
      const error = handler.createValidationError('Le nom est obligatoire', 'details')

      expect(error.code).toBe(MembershipErrorCode.VALIDATION_ERROR)
      expect(error.message).toBe('Le nom est obligatoire')
      expect(error.details).toBe('details')
      expect(error.userMessage).toBe('Le nom est obligatoire')
    })
  })

  describe('createOperationError', () => {
    it('devrait créer une erreur d\'opération échouée', () => {
      const error = handler.createOperationError('soumission des corrections', 'details')

      expect(error.code).toBe(MembershipErrorCode.OPERATION_FAILED)
      expect(error.message).toContain('soumission des corrections')
      expect(error.details).toBe('details')
    })
  })

  describe('formatForUI', () => {
    it('devrait retourner le message utilisateur formaté', () => {
      const error: MembershipError = {
        code: MembershipErrorCode.VALIDATION_ERROR,
        message: 'Validation failed',
        userMessage: 'Message pour l\'utilisateur',
      }

      const result = handler.formatForUI(error)

      expect(result).toBe('Message pour l\'utilisateur')
    })
  })

  describe('extractErrorCode - Cas limites', () => {
    it('devrait gérer une erreur avec code storage/authorization', () => {
      const error = {
        code: 'storage/authorization',
        message: 'Authorization failed',
      }

      const result = handler.normalizeError(error)

      expect(result.code).toBe(MembershipErrorCode.STORAGE_PERMISSION_DENIED)
    })

    it('devrait gérer une erreur avec message contenant "permission"', () => {
      const error = {
        message: 'Missing or insufficient permissions',
      }

      const result = handler.normalizeError(error)

      expect(result.code).toBe(MembershipErrorCode.FIRESTORE_PERMISSION_DENIED)
    })

    it('devrait gérer une erreur avec message contenant "invalid"', () => {
      const error = {
        message: 'Invalid argument provided',
      }

      const result = handler.normalizeError(error)

      expect(result.code).toBe(MembershipErrorCode.INVALID_FORM_DATA)
    })

    it('devrait gérer une chaîne de caractères comme erreur', () => {
      const error = 'Simple error message'

      const result = handler.normalizeError(error)

      expect(result.message).toBe('Simple error message')
    })

    it('devrait gérer une erreur sans message', () => {
      const error = {}

      const result = handler.normalizeError(error)

      expect(result.message).toBe('Une erreur inattendue s\'est produite')
      expect(result.code).toBe(MembershipErrorCode.UNKNOWN_ERROR)
    })
  })
})
