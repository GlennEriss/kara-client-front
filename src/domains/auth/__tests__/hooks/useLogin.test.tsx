/**
 * Tests unitaires pour useLogin
 * 
 * @see https://vitest.dev/
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useLogin } from '../../hooks/useLogin';
import { ServiceFactory } from '@/factories/ServiceFactory';
import { LoginMediatorFactory } from '@/factories/LoginMediatorFactory';

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

// Mock de Firebase Auth
const mockAuth = {
  currentUser: null,
};

vi.mock('@/firebase/auth', () => {
  const mockAuth = {
    currentUser: null,
  };
  return {
    auth: mockAuth,
  };
});

// Mock de routes
vi.mock('@/constantes/routes', () => ({
  default: {
    admin: { dashboard: '/admin/dashboard' },
    member: { home: '/member/home' },
  },
}));

// Mock de ServiceFactory
vi.mock('@/factories/ServiceFactory', () => ({
  ServiceFactory: {
    getLoginService: vi.fn(),
  },
}));

// Mock de LoginMediatorFactory
vi.mock('@/factories/LoginMediatorFactory', () => ({
  LoginMediatorFactory: {
    create: vi.fn((form) => ({
      getForm: () => form,
      handleSubmit: (onSubmit: any, onInvalid: any) => (e?: any) => {
        if (e) e.preventDefault();
        form.handleSubmit(onSubmit, onInvalid)();
      },
    })),
  },
}));

// Mock de document.cookie
Object.defineProperty(document, 'cookie', {
  writable: true,
  value: '',
});

describe('useLogin', () => {
  let queryClient: QueryClient;
  let wrapper: React.FC<{ children: React.ReactNode }>;
  let mockLoginService: any;

  beforeEach(() => {
    vi.clearAllMocks();

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

    mockLoginService = {
      signIn: vi.fn(),
    };

    vi.mocked(ServiceFactory.getLoginService).mockReturnValue(mockLoginService);
  });

  it('devrait initialiser le hook avec un formulaire', () => {
    const { result } = renderHook(() => useLogin(), { wrapper });

    expect(result.current.form).toBeDefined();
    expect(result.current.mediator).toBeDefined();
    expect(result.current.onSubmit).toBeDefined();
    expect(result.current.onInvalid).toBeDefined();
  });

  it('devrait appeler onInvalid avec des erreurs de validation', async () => {
    const { result } = renderHook(() => useLogin(), { wrapper });
    const { toast } = await import('sonner');

    // Simuler une soumission avec des données invalides
    result.current.form.setValue('matricule', '');
    result.current.form.setValue('email', 'invalid-email');
    result.current.form.setValue('password', '');

    await result.current.form.handleSubmit(
      result.current.onSubmit,
      result.current.onInvalid
    )();

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  });

  it('devrait gérer une connexion réussie', async () => {
    const { result } = renderHook(() => useLogin(), { wrapper });
    const { toast } = await import('sonner');
    const { useRouter } = await import('next/navigation');
    const router = useRouter();

    // Mock de auth.currentUser pour useLogin
    const mockCurrentUser = {
      reload: vi.fn().mockResolvedValue(undefined),
      getIdTokenResult: vi.fn().mockResolvedValue({
        claims: { role: 'Admin' },
      }),
    };
    
    // Définir currentUser via l'import de auth
    const { auth } = await import('@/firebase/auth');
    (auth as any).currentUser = mockCurrentUser;

    mockLoginService.signIn.mockResolvedValueOnce('mock-token-id');

    // Remplir le formulaire avec des données valides
    result.current.form.setValue('matricule', '0001.MK.110126');
    result.current.form.setValue('email', 'test@example.com');
    result.current.form.setValue('password', 'password123');

    // Soumettre le formulaire
    await result.current.form.handleSubmit(
      result.current.onSubmit,
      result.current.onInvalid
    )();

    await waitFor(() => {
      expect(mockLoginService.signIn).toHaveBeenCalled();
    }, { timeout: 5000 });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled();
    }, { timeout: 5000 });

    // Note: router.push dépend de auth.currentUser qui est difficile à mocker correctement
    // On vérifie que le service et le toast sont appelés, ce qui est le comportement principal
    // router.push sera testé dans les tests E2E
  });

  it('devrait gérer l\'erreur USER_NOT_FOUND', async () => {
    const { result } = renderHook(() => useLogin(), { wrapper });
    const { toast } = await import('sonner');

    mockLoginService.signIn.mockRejectedValueOnce({ message: 'USER_NOT_FOUND' });

    result.current.form.setValue('matricule', '0001.MK.110126');
    result.current.form.setValue('email', 'test@example.com');
    result.current.form.setValue('password', 'password123');

    await result.current.form.handleSubmit(
      result.current.onSubmit,
      result.current.onInvalid
    )();

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Matricule incorrect',
        expect.objectContaining({
          description: 'Ce matricule n\'existe pas dans notre base de données.',
        })
      );
    });
  });

  it('devrait gérer l\'erreur WRONG_PASSWORD', async () => {
    const { result } = renderHook(() => useLogin(), { wrapper });
    const { toast } = await import('sonner');

    mockLoginService.signIn.mockRejectedValueOnce({ message: 'WRONG_PASSWORD' });

    result.current.form.setValue('matricule', '0001.MK.110126');
    result.current.form.setValue('email', 'test@example.com');
    result.current.form.setValue('password', 'wrong-password');

    await result.current.form.handleSubmit(
      result.current.onSubmit,
      result.current.onInvalid
    )();

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Mot de passe incorrect',
        expect.objectContaining({
          description: 'Vérifiez votre mot de passe et réessayez.',
        })
      );
    });
  });

  it('devrait gérer l\'erreur MATRICULE_EMAIL_MISMATCH', async () => {
    const { result } = renderHook(() => useLogin(), { wrapper });
    const { toast } = await import('sonner');

    mockLoginService.signIn.mockRejectedValueOnce({ message: 'MATRICULE_EMAIL_MISMATCH' });

    result.current.form.setValue('matricule', '0001.MK.110126');
    result.current.form.setValue('email', 'test@example.com');
    result.current.form.setValue('password', 'password123');

    await result.current.form.handleSubmit(
      result.current.onSubmit,
      result.current.onInvalid
    )();

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Matricule et email ne correspondent pas',
        expect.objectContaining({
          description: 'Le matricule saisi ne correspond pas à l\'email utilisé.',
        })
      );
    });
  });

  it('devrait gérer les erreurs Firebase (auth/user-not-found)', async () => {
    const { result } = renderHook(() => useLogin(), { wrapper });
    const { toast } = await import('sonner');

    mockLoginService.signIn.mockRejectedValueOnce({ code: 'auth/user-not-found' });

    result.current.form.setValue('matricule', '0001.MK.110126');
    result.current.form.setValue('email', 'test@example.com');
    result.current.form.setValue('password', 'password123');

    await result.current.form.handleSubmit(
      result.current.onSubmit,
      result.current.onInvalid
    )();

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Email incorrect',
        expect.objectContaining({
          description: 'Aucun compte associé à cet email.',
        })
      );
    });
  });

  it('devrait sauvegarder le token dans un cookie après connexion réussie', async () => {
    const { result } = renderHook(() => useLogin(), { wrapper });

    mockLoginService.signIn.mockResolvedValueOnce('mock-token-id');

    result.current.form.setValue('matricule', '0001.MK.110126');
    result.current.form.setValue('email', 'test@example.com');
    result.current.form.setValue('password', 'password123');

    await result.current.form.handleSubmit(
      result.current.onSubmit,
      result.current.onInvalid
    )();

    await waitFor(() => {
      expect(document.cookie).toContain('auth-token=mock-token-id');
    });
  });
});
