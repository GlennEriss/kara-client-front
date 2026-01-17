/**
 * Configuration globale pour les tests Vitest
 * 
 * Ce fichier s'exécute avant chaque fichier de test.
 * Il configure l'environnement de test (mocks, utilitaires, etc.)
 */

import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Nettoyer après chaque test
afterEach(() => {
  cleanup();
});

// Mock de Next.js router
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
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock de Firebase (basique - à étendre selon les besoins)
vi.mock('@/firebase/app', () => ({
  app: {},
}));

vi.mock('@/firebase/firestore', () => ({
  db: {},
}));

vi.mock('@/firebase/auth', () => ({
  auth: {},
}));

vi.mock('@/firebase/storage', () => ({
  storage: {},
  getStorage: vi.fn(() => ({})),
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
