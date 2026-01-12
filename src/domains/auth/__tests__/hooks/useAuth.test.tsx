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
      uid: 'user-123',
      email: 'test@example.com',
    } as unknown as User;

    // Simuler onAuthStateChanged avec un utilisateur
    if (authCallback) {
      authCallback(mockUser);
    }

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.authenticated).toBe(true);
    });
  });

  it('devrait retourner un état non authentifié quand l\'utilisateur est null', async () => {
    const { result } = renderHook(() => useAuth());

    // Simuler onAuthStateChanged avec null (déconnexion)
    if (authCallback) {
      authCallback(null);
    }

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.authenticated).toBe(false);
    });
  });

  it('devrait mettre à jour l\'état quand l\'utilisateur change', async () => {
    const { result } = renderHook(() => useAuth());

    const mockUser1 = {
      uid: 'user-1',
      email: 'user1@example.com',
    } as unknown as User;

    const mockUser2 = {
      uid: 'user-2',
      email: 'user2@example.com',
    } as unknown as User;

    // Simuler connexion du premier utilisateur
    if (authCallback) {
      authCallback(mockUser1);
    }

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser1);
      expect(result.current.authenticated).toBe(true);
    });

    // Simuler changement d'utilisateur
    if (authCallback) {
      authCallback(mockUser2);
    }

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser2);
      expect(result.current.authenticated).toBe(true);
    });

    // Simuler déconnexion
    if (authCallback) {
      authCallback(null);
    }

    await waitFor(() => {
      expect(result.current.user).toBeNull();
      expect(result.current.authenticated).toBe(false);
    });
  });

  it('devrait nettoyer l\'abonnement au démontage', () => {
    const { unmount } = renderHook(() => useAuth());

    unmount();

    expect(unsubscribeFn).toHaveBeenCalled();
  });
});
