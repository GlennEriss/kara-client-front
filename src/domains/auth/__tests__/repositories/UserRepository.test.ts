/**
 * Tests unitaires pour UserRepository
 * 
 * @see https://vitest.dev/
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserRepository } from '../../repositories/UserRepository';
import type { User } from '@/types/types';

// Mock de Firestore
vi.mock('@/firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(),
  db: {},
  Timestamp: {
    now: vi.fn(() => new Date()),
  },
}));

// Mock de firebaseCollectionNames
vi.mock('@/constantes/firebase-collection-names', () => ({
  firebaseCollectionNames: {
    users: 'users',
  },
}));

describe('UserRepository', () => {
  let repository: UserRepository;
  let mockGetFirestore: any;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new UserRepository();
    
    // Mock de getFirestore
    mockGetFirestore = vi.fn(async () => ({
      doc: vi.fn(),
      getDoc: vi.fn(),
      collection: vi.fn(),
      query: vi.fn(),
      where: vi.fn(),
      getDocs: vi.fn(),
      db: {},
      Timestamp: {
        now: vi.fn(() => new Date()),
      },
    }));
  });

  describe('getUserByUid', () => {
    it('devrait gérer les erreurs lors de la récupération', async () => {
      const { getDoc, doc } = await import('@/firebase/firestore');
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      vi.mocked(getDoc).mockRejectedValueOnce(new Error('Firestore error'));
      vi.mocked(doc).mockReturnValueOnce({} as any);

      await expect(repository.getUserByUid('0001.MK.110126')).rejects.toThrow('Firestore error');
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('devrait gérer les timestamps Firestore manquants', async () => {
      const mockUser = {
        id: '0001.MK.110126',
        matricule: '0001.MK.110126',
        lastName: 'Test',
        firstName: 'User',
        birthDate: '1990-01-01',
        contacts: [],
        gender: 'Homme',
        email: 'test@example.com',
        nationality: 'Gabonaise',
        hasCar: false,
        subscriptions: [],
        dossier: 'dossier-1',
        membershipType: 'adherant',
        roles: ['Adherant'],
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
      };

      const mockDoc = {
        exists: () => true,
        id: '0001.MK.110126',
        data: () => ({
          ...mockUser,
          // Pas de createdAt/updatedAt avec toDate
          createdAt: undefined,
          updatedAt: undefined,
        }),
      };

      const { getDoc, doc } = await import('@/firebase/firestore');
      vi.mocked(getDoc).mockResolvedValueOnce(mockDoc as any);
      vi.mocked(doc).mockReturnValueOnce({} as any);

      const result = await repository.getUserByUid('0001.MK.110126');

      expect(result).toBeDefined();
      expect(result?.createdAt).toBeInstanceOf(Date);
      expect(result?.updatedAt).toBeInstanceOf(Date);
    });

    it('devrait retourner un utilisateur existant', async () => {
      const mockUser: User = {
        id: '0001.MK.110126',
        matricule: '0001.MK.110126',
        lastName: 'Test',
        firstName: 'User',
        birthDate: '1990-01-01',
        contacts: [],
        gender: 'Homme',
        email: 'test@example.com',
        nationality: 'Gabonaise',
        hasCar: false,
        subscriptions: [],
        dossier: 'dossier-1',
        membershipType: 'adherant',
        roles: ['Adherant'],
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
      };

      const mockDoc = {
        exists: () => true,
        id: '0001.MK.110126',
        data: () => ({
          ...mockUser,
          createdAt: { toDate: () => mockUser.createdAt },
          updatedAt: { toDate: () => mockUser.updatedAt },
        }),
      };

      const { getDoc, doc, db } = await import('@/firebase/firestore');
      vi.mocked(getDoc).mockResolvedValueOnce(mockDoc as any);
      vi.mocked(doc).mockReturnValueOnce({} as any);

      const result = await repository.getUserByUid('0001.MK.110126');

      expect(result).toEqual(mockUser);
      expect(getDoc).toHaveBeenCalled();
    });

    it('devrait retourner null si l\'utilisateur n\'existe pas', async () => {
      const mockDoc = {
        exists: () => false,
      };

      const { getDoc, doc } = await import('@/firebase/firestore');
      vi.mocked(getDoc).mockResolvedValueOnce(mockDoc as any);
      vi.mocked(doc).mockReturnValueOnce({} as any);

      const result = await repository.getUserByUid('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getUserByEmail', () => {
    it('devrait gérer les erreurs lors de la récupération', async () => {
      const { getDocs, collection, query, where } = await import('@/firebase/firestore');
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      vi.mocked(getDocs).mockRejectedValueOnce(new Error('Firestore error'));
      vi.mocked(collection).mockReturnValueOnce({} as any);
      vi.mocked(query).mockReturnValueOnce({} as any);
      vi.mocked(where).mockReturnValueOnce({} as any);

      await expect(repository.getUserByEmail('test@example.com')).rejects.toThrow('Firestore error');
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('devrait normaliser l\'email en minuscules', async () => {
      const mockUser: User = {
        id: '0001.MK.110126',
        matricule: '0001.MK.110126',
        lastName: 'Test',
        firstName: 'User',
        birthDate: '1990-01-01',
        contacts: [],
        gender: 'Homme',
        email: 'test@example.com',
        nationality: 'Gabonaise',
        hasCar: false,
        subscriptions: [],
        dossier: 'dossier-1',
        membershipType: 'adherant',
        roles: ['Adherant'],
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
      };

      const mockQuerySnapshot = {
        empty: false,
        docs: [
          {
            id: '0001.MK.110126',
            data: () => ({
              ...mockUser,
              createdAt: { toDate: () => mockUser.createdAt },
              updatedAt: { toDate: () => mockUser.updatedAt },
            }),
          },
        ],
      };

      const { getDocs, collection, query, where } = await import('@/firebase/firestore');
      vi.mocked(getDocs).mockResolvedValueOnce(mockQuerySnapshot as any);
      vi.mocked(collection).mockReturnValueOnce({} as any);
      vi.mocked(query).mockReturnValueOnce({} as any);
      vi.mocked(where).mockReturnValueOnce({} as any);

      // Tester avec un email en majuscules
      const result = await repository.getUserByEmail('TEST@EXAMPLE.COM');

      expect(result).toEqual(mockUser);
      // Vérifier que where a été appelé avec l'email en minuscules
      expect(where).toHaveBeenCalledWith(expect.anything(), '==', 'test@example.com');
    });

    it('devrait retourner un utilisateur par email', async () => {
      const mockUser: User = {
        id: '0001.MK.110126',
        matricule: '0001.MK.110126',
        lastName: 'Test',
        firstName: 'User',
        birthDate: '1990-01-01',
        contacts: [],
        gender: 'Homme',
        email: 'test@example.com',
        nationality: 'Gabonaise',
        hasCar: false,
        subscriptions: [],
        dossier: 'dossier-1',
        membershipType: 'adherant',
        roles: ['Adherant'],
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
      };

      const mockQuerySnapshot = {
        empty: false,
        docs: [
          {
            id: '0001.MK.110126',
            data: () => ({
              ...mockUser,
              createdAt: { toDate: () => mockUser.createdAt },
              updatedAt: { toDate: () => mockUser.updatedAt },
            }),
          },
        ],
      };

      const { getDocs, collection, query, where, db } = await import('@/firebase/firestore');
      vi.mocked(getDocs).mockResolvedValueOnce(mockQuerySnapshot as any);
      vi.mocked(collection).mockReturnValueOnce({} as any);
      vi.mocked(query).mockReturnValueOnce({} as any);
      vi.mocked(where).mockReturnValueOnce({} as any);

      const result = await repository.getUserByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(getDocs).toHaveBeenCalled();
    });

    it('devrait retourner null si aucun utilisateur n\'est trouvé', async () => {
      const mockQuerySnapshot = {
        empty: true,
        docs: [],
      };

      const { getDocs, collection, query, where } = await import('@/firebase/firestore');
      vi.mocked(getDocs).mockResolvedValueOnce(mockQuerySnapshot as any);
      vi.mocked(collection).mockReturnValueOnce({} as any);
      vi.mocked(query).mockReturnValueOnce({} as any);
      vi.mocked(where).mockReturnValueOnce({} as any);

      const result = await repository.getUserByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('userExists', () => {
    beforeEach(() => {
      // Mock global fetch pour les tests
      global.fetch = vi.fn() as any;
    });

    it('devrait retourner true si l\'utilisateur existe', async () => {
      // Mock de la réponse de l'API route /api/auth/check-user
      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          found: true,
          inAuth: true,
          inUsers: false,
          inAdmins: false,
        }),
      };

      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const result = await repository.userExists('0001.MK.110126');

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/auth/check-user',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: '0001.MK.110126' }),
        })
      );
    });

    it('devrait retourner false si l\'utilisateur n\'existe pas', async () => {
      // Mock de la réponse de l'API route /api/auth/check-user
      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          found: false,
          inAuth: false,
          inUsers: false,
          inAdmins: false,
        }),
      };

      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const result = await repository.userExists('non-existent');

      expect(result).toBe(false);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/auth/check-user',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: 'non-existent' }),
        })
      );
    });

    it('devrait retourner false si l\'API route retourne une erreur', async () => {
      // Mock d'une réponse d'erreur
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: vi.fn().mockResolvedValue({ error: 'Erreur serveur' }),
      };

      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const result = await repository.userExists('test-uid');

      expect(result).toBe(false);
    });

    it('devrait retourner false si l\'appel fetch échoue', async () => {
      // Mock d'une erreur réseau
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const result = await repository.userExists('test-uid');

      expect(result).toBe(false);
    });
  });
});
