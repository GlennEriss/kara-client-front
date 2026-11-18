/**
 * Configuration globale pour les tests Vitest
 * 
 * Ce fichier s'exécute avant chaque fichier de test.
 * Il configure l'environnement de test (mocks, utilitaires, etc.)
 */

import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

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

// Les factories des adaptateurs injectent le SDK ; conserver ses exports purs
// permet d’automocker les repositories sans initialiser une base réelle.
vi.mock('@/firebase/firestore', async () => ({
  ...(await vi.importActual<typeof import('firebase/firestore')>('firebase/firestore')),
  db: {},
}));

vi.mock('@/firebase/auth', () => ({
  auth: {},
}));

vi.mock('@/firebase/storage', async () => ({
  ...(await vi.importActual<typeof import('firebase/storage')>('firebase/storage')),
  storage: {},
  getStorageInstance: vi.fn(() => ({})),
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
