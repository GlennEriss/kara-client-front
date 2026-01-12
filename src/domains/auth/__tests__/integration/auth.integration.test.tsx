/**
 * Tests d'intégration pour le module Auth
 * 
 * @see https://vitest.dev/
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { LoginService } from '../../services/LoginService';
import { UserRepository } from '../../repositories/UserRepository';
import { ServiceFactory } from '@/factories/ServiceFactory';
import { RepositoryFactory } from '@/factories/RepositoryFactory';
import { useLogin } from '../../hooks/useLogin';
import type { User } from '@/types/types';

// Mock de Firebase Auth
vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: vi.fn(),
}));

vi.mock('@/firebase/auth', () => ({
  auth: {
    currentUser: null,
  },
}));

// Mock de next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
}));

// Mock de sonner (toast)
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

// Mock de document.cookie
Object.defineProperty(document, 'cookie', {
  writable: true,
  value: '',
});

describe('Intégration: Auth Module (Repository → Service → Hook)', () => {
  let queryClient: QueryClient;
  let wrapper: React.FC<{ children: React.ReactNode }>;
  let mockUserRepository: UserRepository;
  let loginService: LoginService;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: Infinity,
        },
      },
    });

    wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    // Créer un mock du repository
    mockUserRepository = {
      name: 'UserRepository',
      getUserByUid: vi.fn(),
      getUserByEmail: vi.fn(),
      userExists: vi.fn(),
    } as any;

    // Créer le service avec le repository mocké
    loginService = new LoginService(mockUserRepository);

    // Mock du ServiceFactory
    vi.spyOn(ServiceFactory, 'getLoginService').mockReturnValue(loginService);
    vi.spyOn(RepositoryFactory, 'getUserRepository').mockReturnValue(mockUserRepository);
  });

  describe('Flux complet : Connexion utilisateur', () => {
    it('devrait authentifier un utilisateur avec des identifiants valides', async () => {
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

      // Mock : l'utilisateur existe
      vi.mocked(mockUserRepository.userExists).mockResolvedValueOnce(true);

      // Mock : Firebase Auth retourne un utilisateur
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      const mockUserCredential = {
        user: {
          uid: '0001.MK.110126',
          getIdToken: vi.fn().mockResolvedValueOnce('mock-token-id'),
          reload: vi.fn().mockResolvedValueOnce(undefined),
        },
      };

      vi.mocked(signInWithEmailAndPassword).mockResolvedValueOnce(mockUserCredential as any);

      const { result } = renderHook(() => useLogin(), { wrapper });

      // Simuler la soumission du formulaire
      const formData = {
        matricule: '0001.MK.110126',
        email: 'test@example.com',
        password: 'password123',
      };

      // Remplir le formulaire
      result.current.form.setValue('matricule', formData.matricule);
      result.current.form.setValue('email', formData.email);
      result.current.form.setValue('password', formData.password);

      // Soumettre le formulaire
      result.current.form.handleSubmit(
        result.current.onSubmit,
        result.current.onInvalid
      )();

      await waitFor(() => {
        expect(mockUserRepository.userExists).toHaveBeenCalledWith('0001.MK.110126');
      }, { timeout: 5000 });

      await waitFor(() => {
        expect(signInWithEmailAndPassword).toHaveBeenCalled();
      }, { timeout: 5000 });
    });

    it('devrait gérer l\'erreur si l\'utilisateur n\'existe pas', async () => {
      // Mock : l'utilisateur n'existe pas
      vi.mocked(mockUserRepository.userExists).mockResolvedValueOnce(false);

      const { result } = renderHook(() => useLogin(), { wrapper });

      const formData = {
        matricule: 'non-existent',
        email: 'test@example.com',
        password: 'password123',
      };

      // Remplir le formulaire
      result.current.form.setValue('matricule', formData.matricule);
      result.current.form.setValue('email', formData.email);
      result.current.form.setValue('password', formData.password);

      // Soumettre le formulaire
      result.current.form.handleSubmit(
        result.current.onSubmit,
        result.current.onInvalid
      )();

      await waitFor(() => {
        expect(mockUserRepository.userExists).toHaveBeenCalledWith('non-existent');
      }, { timeout: 5000 });
    });
  });
});
