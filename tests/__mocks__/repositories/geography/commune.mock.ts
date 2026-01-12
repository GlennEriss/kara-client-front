/**
 * Mock du CommuneRepository pour les tests
 */
import { vi } from 'vitest'
import type { Commune } from '@/domains/infrastructure/geography/entities/geography.types'
import type { PaginatedResult } from '@/domains/infrastructure/geography/types/pagination.types'

// Données mock par défaut
export const mockCommunes: Commune[] = [
  { id: 'comm-1', departmentId: 'dept-1', name: 'Libreville Centre', createdAt: new Date(), updatedAt: new Date(), createdBy: 'test-user' },
  { id: 'comm-2', departmentId: 'dept-1', name: 'Akanda', createdAt: new Date(), updatedAt: new Date(), createdBy: 'test-user' },
  { id: 'comm-3', departmentId: 'dept-1', name: 'Owendo', createdAt: new Date(), updatedAt: new Date(), createdBy: 'test-user' },
  { id: 'comm-4', departmentId: 'dept-2', name: 'Ntoum Centre', createdAt: new Date(), updatedAt: new Date(), createdBy: 'test-user' },
  { id: 'comm-5', departmentId: 'dept-3', name: 'Franceville Centre', createdAt: new Date(), updatedAt: new Date(), createdBy: 'test-user' },
]

// Mock du repository
export const mockCommuneRepository = {
  getPaginated: vi.fn().mockResolvedValue({
    data: mockCommunes,
    pagination: {
      nextCursor: null,
      prevCursor: null,
      hasNextPage: false,
      hasPrevPage: false,
      pageSize: 20,
    },
  } as PaginatedResult<Commune>),
  
  getCount: vi.fn().mockResolvedValue(mockCommunes.length),
  
  getById: vi.fn().mockImplementation((id: string) => {
    const commune = mockCommunes.find(c => c.id === id)
    return Promise.resolve(commune || null)
  }),
  
  getByDepartmentId: vi.fn().mockImplementation((departmentId: string) => {
    const communes = mockCommunes.filter(c => c.departmentId === departmentId)
    return Promise.resolve(communes)
  }),
  
  create: vi.fn().mockImplementation((data: Omit<Commune, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newCommune: Commune = {
      id: `comm-${Date.now()}`,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    return Promise.resolve(newCommune)
  }),
  
  update: vi.fn().mockImplementation((id: string, data: Partial<Commune>) => {
    const commune = mockCommunes.find(c => c.id === id)
    if (!commune) throw new Error('Commune not found')
    return Promise.resolve({ ...commune, ...data, updatedAt: new Date() })
  }),
  
  delete: vi.fn().mockResolvedValue(undefined),
  
  getAll: vi.fn().mockResolvedValue(mockCommunes),
}

/**
 * Reset tous les mocks
 */
export function resetCommuneRepositoryMocks() {
  Object.values(mockCommuneRepository).forEach(mock => {
    if (typeof mock === 'function' && 'mockReset' in mock) {
      mock.mockReset()
    }
  })
  
  // Restaurer les valeurs par défaut
  mockCommuneRepository.getCount.mockResolvedValue(mockCommunes.length)
  mockCommuneRepository.getAll.mockResolvedValue(mockCommunes)
}

export default mockCommuneRepository
