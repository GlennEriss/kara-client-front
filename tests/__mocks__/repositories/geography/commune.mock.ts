/**
 * Mock du CommuneRepository pour les tests
 */
import { vi } from 'vitest'
import type { Commune } from '@/domains/infrastructure/geography/entities/geography.types'
import type { PaginatedResult } from '@/domains/infrastructure/geography/types/pagination.types'

// Données mock par défaut - 3 communes par département (structure cohérente)
export const mockCommunes: Commune[] = [
  // Komo-Mondah (dept-1)
  { id: 'comm-1', departmentId: 'dept-1', name: 'Ntoum', postalCode: '24110', createdAt: new Date(), updatedAt: new Date(), createdBy: 'test-user' },
  { id: 'comm-2', departmentId: 'dept-1', name: 'Cocobeach', postalCode: '24111', createdAt: new Date(), updatedAt: new Date(), createdBy: 'test-user' },
  { id: 'comm-3', departmentId: 'dept-1', name: 'Kango', postalCode: '24112', createdAt: new Date(), updatedAt: new Date(), createdBy: 'test-user' },
  // Libreville (dept-2)
  { id: 'comm-4', departmentId: 'dept-2', name: 'Libreville Centre', postalCode: '24100', alias: 'Ville', createdAt: new Date(), updatedAt: new Date(), createdBy: 'test-user' },
  { id: 'comm-5', departmentId: 'dept-2', name: 'Akanda', postalCode: '24101', createdAt: new Date(), updatedAt: new Date(), createdBy: 'test-user' },
  { id: 'comm-6', departmentId: 'dept-2', name: 'Owendo', postalCode: '24102', createdAt: new Date(), updatedAt: new Date(), createdBy: 'test-user' },
  // Komo-Océan (dept-3)
  { id: 'comm-7', departmentId: 'dept-3', name: 'Ndzomoé', postalCode: '24120', createdAt: new Date(), updatedAt: new Date(), createdBy: 'test-user' },
  { id: 'comm-8', departmentId: 'dept-3', name: 'Cap Estérias', postalCode: '24121', createdAt: new Date(), updatedAt: new Date(), createdBy: 'test-user' },
  { id: 'comm-9', departmentId: 'dept-3', name: 'Ntoum', postalCode: '24122', createdAt: new Date(), updatedAt: new Date(), createdBy: 'test-user' },
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
