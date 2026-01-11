/**
 * Tests unitaires pour useAuth
 * 
 * @see https://vitest.dev/
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAuth } from '../../hooks/useAuth';
import type { User } from 'firebase/auth';

// Mock de Firebase Auth
let authCallback: ((user: any) => void) | null = null;
let unsubscribeFn: () => void = vi.fn();

vi.mock('@/firebase/auth', () => ({
  auth: {},
}));

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn((auth: any, callback: (user: any) => void) => {
    authCallback = callback;
    return unsubscribeFn;
  }),
}));

// Mock de fetch pour l'API /api/auth/verify
global.fetch = vi.fn();

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authCallback = null;
    unsubscribeFn = vi.fn();
  });

  it('devrait initialiser avec un état de chargement', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBeNull();
    expect(result.current.authenticated).toBe(false);
  });

  it('devrait retourner un état non authentifié quand aucun utilisateur', async () => {
    const { result } = renderHook(() => useAuth());

    // Simuler onAuthStateChanged avec null (pas d'utilisateur)
    if (authCallback) {
      authCallback(null);
    }

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.authenticated).toBe(false);
    }, { timeout: 3000 });
  });

  it('devrait retourner un état authentifié quand l\'utilisateur existe et est vérifié', async () => {
    const { result } = renderHook(() => useAuth());

    const mockUser = {
      getIdToken: vi.fn().mockResolvedValue('mock-token'),
    } as unknown as User;

    // Mock de fetch pour retourner un résultat authentifié
    vi.mocked(fetch).mockResolvedValueOnce({
      json: async () => ({ authenticated: true }),
    } as Response);

    // Simuler onAuthStateChanged avec un utilisateur
    if (authCallback) {
      authCallback(mockUser);
    }

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.authenticated).toBe(true);
    });

    expect(fetch).toHaveBeenCalledWith('/api/auth/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token: 'mock-token' }),
    });
  });

  it('devrait retourner un état non authentifié quand l\'utilisateur n\'est pas vérifié', async () => {
    const { result } = renderHook(() => useAuth());

    const mockUser = {
      getIdToken: vi.fn().mockResolvedValue('mock-token'),
    } as unknown as User;

    // Mock de fetch pour retourner un résultat non authentifié
    vi.mocked(fetch).mockResolvedValueOnce({
      json: async () => ({ authenticated: false }),
    } as Response);

    // Simuler onAuthStateChanged avec un utilisateur
    if (authCallback) {
      authCallback(mockUser);
    }

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.authenticated).toBe(false);
    });
  });

  it('devrait gérer les erreurs de vérification du token', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useAuth());

    const mockUser = {
      getIdToken: vi.fn().mockResolvedValue('mock-token'),
    } as unknown as User;

    // Mock de fetch pour retourner une erreur
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

    // Simuler onAuthStateChanged avec un utilisateur
    if (authCallback) {
      authCallback(mockUser);
    }

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.authenticated).toBe(false);
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Erreur de vérification du token:',
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
  });

  it('devrait nettoyer l\'abonnement au démontage', () => {
    const { unmount } = renderHook(() => useAuth());

    unmount();

    expect(unsubscribeFn).toHaveBeenCalled();
  });
});
