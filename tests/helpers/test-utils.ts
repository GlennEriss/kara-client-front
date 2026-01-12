/**
 * Utilitaires généraux pour les tests
 */
import { vi, beforeEach, afterEach, expect } from 'vitest'

/**
 * Attendre un délai (pour les tests async)
 */
export function waitFor(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Mock console.error et console.warn pour les tests
 * 
 * Usage dans un fichier de test:
 * ```typescript
 * import { suppressConsoleErrors } from '@/tests/helpers/test-utils'
 * 
 * const { setup, teardown } = suppressConsoleErrors()
 * 
 * beforeEach(() => setup())
 * afterEach(() => teardown())
 * ```
 */
export function suppressConsoleErrors() {
  const originalError = console.error
  const originalWarn = console.warn
  
  return {
    setup: () => {
      console.error = vi.fn()
      console.warn = vi.fn()
    },
    teardown: () => {
      console.error = originalError
      console.warn = originalWarn
    },
  }
}

/**
 * Créer un mock de toast pour les notifications
 */
export const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
  loading: vi.fn(),
  dismiss: vi.fn(),
}

/**
 * Créer un mock de router Next.js
 */
export const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
  pathname: '/',
  query: {},
}

/**
 * Générer un ID unique pour les tests
 */
export function generateTestId(prefix = 'test'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Créer des dates de test
 */
export function createTestDate(daysAgo = 0): Date {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return date
}

/**
 * Helper pour tester les erreurs async
 */
export async function expectAsyncError(
  asyncFn: () => Promise<any>,
  expectedError?: string | RegExp
): Promise<void> {
  let error: Error | undefined
  
  try {
    await asyncFn()
  } catch (e) {
    error = e as Error
  }
  
  expect(error).toBeDefined()
  
  if (expectedError) {
    if (typeof expectedError === 'string') {
      expect(error?.message).toContain(expectedError)
    } else {
      expect(error?.message).toMatch(expectedError)
    }
  }
}

/**
 * Créer un mock de Firestore Timestamp
 */
export function createMockTimestamp(date = new Date()) {
  return {
    toDate: () => date,
    seconds: Math.floor(date.getTime() / 1000),
    nanoseconds: 0,
  }
}

export default {
  waitFor,
  suppressConsoleErrors,
  mockToast,
  mockRouter,
  generateTestId,
  createTestDate,
  expectAsyncError,
  createMockTimestamp,
}
