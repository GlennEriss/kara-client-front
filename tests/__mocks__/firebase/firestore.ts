/**
 * Mock Firestore pour les tests
 * 
 * Usage:
 * ```typescript
 * vi.mock('@/firebase/firestore', () => mockFirestoreModule)
 * ```
 */
import { vi } from 'vitest'

// Mock des fonctions Firestore
export const mockCollection = vi.fn()
export const mockDoc = vi.fn()
export const mockQuery = vi.fn()
export const mockWhere = vi.fn()
export const mockOrderBy = vi.fn()
export const mockLimit = vi.fn()
export const mockStartAfter = vi.fn()
export const mockGetDocs = vi.fn()
export const mockGetDoc = vi.fn()
export const mockAddDoc = vi.fn()
export const mockUpdateDoc = vi.fn()
export const mockDeleteDoc = vi.fn()
export const mockGetCountFromServer = vi.fn()
export const mockOnSnapshot = vi.fn()
export const mockTimestamp = {
  now: vi.fn(() => ({ toDate: () => new Date() })),
  fromDate: vi.fn((date: Date) => ({ toDate: () => date })),
}

// Mock de la base de données
export const mockDb = {}

// Mock serverTimestamp
export const mockServerTimestamp = vi.fn(() => ({ toMillis: () => Date.now() }))

// Module complet à exporter pour vi.mock()
export const mockFirestoreModule = {
  db: mockDb,
  collection: mockCollection,
  doc: mockDoc,
  query: mockQuery,
  where: mockWhere,
  orderBy: mockOrderBy,
  limit: mockLimit,
  startAfter: mockStartAfter,
  getDocs: mockGetDocs,
  getDoc: mockGetDoc,
  addDoc: mockAddDoc,
  updateDoc: mockUpdateDoc,
  deleteDoc: mockDeleteDoc,
  getCountFromServer: mockGetCountFromServer,
  onSnapshot: mockOnSnapshot,
  Timestamp: mockTimestamp,
  serverTimestamp: mockServerTimestamp,
}

/**
 * Helper pour créer un mock de DocumentSnapshot
 */
export function createMockDocSnapshot(id: string, data: Record<string, any> | null) {
  return {
    id,
    exists: () => data !== null,
    data: () => data,
    ref: { id },
  }
}

/**
 * Helper pour créer un mock de QuerySnapshot
 */
export function createMockQuerySnapshot(docs: Array<{ id: string; data: Record<string, any> }>) {
  const mockDocs = docs.map(({ id, data }) => createMockDocSnapshot(id, data))
  return {
    docs: mockDocs,
    size: mockDocs.length,
    empty: mockDocs.length === 0,
    forEach: (callback: (doc: any) => void) => mockDocs.forEach(callback),
  }
}

/**
 * Helper pour créer un mock de CountSnapshot
 */
export function createMockCountSnapshot(count: number) {
  return {
    data: () => ({ count }),
  }
}

/**
 * Reset tous les mocks
 */
export function resetFirestoreMocks() {
  mockCollection.mockReset()
  mockDoc.mockReset()
  mockQuery.mockReset()
  mockWhere.mockReset()
  mockOrderBy.mockReset()
  mockLimit.mockReset()
  mockStartAfter.mockReset()
  mockGetDocs.mockReset()
  mockGetDoc.mockReset()
  mockAddDoc.mockReset()
  mockUpdateDoc.mockReset()
  mockDeleteDoc.mockReset()
  mockGetCountFromServer.mockReset()
  mockOnSnapshot.mockReset()
}

export default mockFirestoreModule
