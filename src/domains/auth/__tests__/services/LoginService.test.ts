/**
 * Tests unitaires pour LoginService
 * 
 * @see https://vitest.dev/
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoginService } from '../../services/LoginService';
import { IUserRepository } from '../../repositories/IUserRepository';
import { signInWithEmailAndPassword } from 'firebase/auth';

// Mock de Firebase Auth
vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: vi.fn(),
}));

vi.mock('@/firebase/auth', () => ({
  auth: {},
}));

describe('LoginService', () => {
  let service: LoginService;
  let mockUserRepository: IUserRepository;

  beforeEach(() => {
    vi.clearAllMocks();

    mockUserRepository = {
      name: 'UserRepository',
      getUserByUid: vi.fn(),
      getUserByEmail: vi.fn(),
      userExists: vi.fn(),
    };

    service = new LoginService(mockUserRepository);
  });

  describe('signIn', () => {
    const validData = {
      success: true,
      data: {
        matricule: '0001.MK.110126',
        email: 'test@example.com',
        password: 'password123',
      },
    } as any;

    it('devrait authentifier un utilisateur avec des identifiants valides', async () => {
      // Mock : l'utilisateur existe
      vi.mocked(mockUserRepository.userExists).mockResolvedValueOnce(true);

      // Mock : Firebase Auth retourne un utilisateur
      const mockUserCredential = {
        user: {
          uid: '0001.MK.110126',
          getIdToken: vi.fn().mockResolvedValueOnce('mock-token-id'),
        },
      };

      vi.mocked(signInWithEmailAndPassword).mockResolvedValueOnce(mockUserCredential as any);

      const result = await service.signIn(validData);

      expect(result).toBe('mock-token-id');
      expect(mockUserRepository.userExists).toHaveBeenCalledWith('0001.MK.110126');
      expect(signInWithEmailAndPassword).toHaveBeenCalled();
    });

    it('devrait lancer une erreur si l\'utilisateur n\'existe pas', async () => {
      // Mock : l'utilisateur n'existe pas
      vi.mocked(mockUserRepository.userExists).mockResolvedValueOnce(false);

      await expect(service.signIn(validData)).rejects.toThrow('USER_NOT_FOUND');
      expect(signInWithEmailAndPassword).not.toHaveBeenCalled();
    });

    it('devrait lancer une erreur si le matricule ne correspond pas à l\'UID', async () => {
      // Mock : l'utilisateur existe
      vi.mocked(mockUserRepository.userExists).mockResolvedValueOnce(true);

      // Mock : Firebase Auth retourne un utilisateur avec un UID différent
      const mockUserCredential = {
        user: {
          uid: 'different-uid',
          getIdToken: vi.fn().mockResolvedValueOnce('mock-token-id'),
        },
      };

      vi.mocked(signInWithEmailAndPassword).mockResolvedValueOnce(mockUserCredential as any);

      await expect(service.signIn(validData)).rejects.toThrow('MATRICULE_EMAIL_MISMATCH');
    });

    it('devrait transformer les erreurs Firebase en erreurs métier', async () => {
      // Mock : l'utilisateur existe
      vi.mocked(mockUserRepository.userExists).mockResolvedValueOnce(true);

      // Mock : Firebase Auth lance une erreur
      const firebaseError = { code: 'auth/wrong-password' };
      vi.mocked(signInWithEmailAndPassword).mockRejectedValueOnce(firebaseError);

      await expect(service.signIn(validData)).rejects.toThrow('WRONG_PASSWORD');
    });

    it('devrait gérer auth/user-not-found', async () => {
      vi.mocked(mockUserRepository.userExists).mockResolvedValueOnce(true);

      const firebaseError = { code: 'auth/user-not-found' };
      vi.mocked(signInWithEmailAndPassword).mockRejectedValueOnce(firebaseError);

      await expect(service.signIn(validData)).rejects.toThrow('USER_NOT_FOUND');
    });

    it('devrait gérer auth/invalid-email', async () => {
      vi.mocked(mockUserRepository.userExists).mockResolvedValueOnce(true);

      const firebaseError = { code: 'auth/invalid-email' };
      vi.mocked(signInWithEmailAndPassword).mockRejectedValueOnce(firebaseError);

      await expect(service.signIn(validData)).rejects.toThrow('INVALID_EMAIL');
    });

    it('devrait gérer auth/too-many-requests', async () => {
      vi.mocked(mockUserRepository.userExists).mockResolvedValueOnce(true);

      const firebaseError = { code: 'auth/too-many-requests' };
      vi.mocked(signInWithEmailAndPassword).mockRejectedValueOnce(firebaseError);

      await expect(service.signIn(validData)).rejects.toThrow('TOO_MANY_REQUESTS');
    });

    it('devrait gérer AUTHENTICATION_FAILED quand userCred.user est null', async () => {
      vi.mocked(mockUserRepository.userExists).mockResolvedValueOnce(true);

      const mockUserCredential = {
        user: null,
      };

      vi.mocked(signInWithEmailAndPassword).mockResolvedValueOnce(mockUserCredential as any);

      await expect(service.signIn(validData)).rejects.toThrow('AUTHENTICATION_FAILED');
    });

    it('devrait gérer les erreurs non reconnues de Firebase', async () => {
      vi.mocked(mockUserRepository.userExists).mockResolvedValueOnce(true);

      const firebaseError = { code: 'auth/unknown-error', message: 'Unknown error' };
      vi.mocked(signInWithEmailAndPassword).mockRejectedValueOnce(firebaseError);

      await expect(service.signIn(validData)).rejects.toEqual(firebaseError);
    });

    it('devrait trimmer le matricule avant vérification', async () => {
      vi.mocked(mockUserRepository.userExists).mockResolvedValueOnce(true);

      const dataWithSpaces = {
        success: true,
        data: {
          matricule: '  0001.MK.110126  ',
          email: 'test@example.com',
          password: 'password123',
        },
      } as any;

      const mockUserCredential = {
        user: {
          uid: '0001.MK.110126',
          getIdToken: vi.fn().mockResolvedValueOnce('mock-token-id'),
        },
      };

      vi.mocked(signInWithEmailAndPassword).mockResolvedValueOnce(mockUserCredential as any);

      const result = await service.signIn(dataWithSpaces);

      expect(result).toBe('mock-token-id');
      expect(mockUserRepository.userExists).toHaveBeenCalledWith('0001.MK.110126');
    });
  });
});
