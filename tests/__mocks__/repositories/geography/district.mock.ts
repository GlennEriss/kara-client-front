/**
 * Mock du DistrictRepository pour les tests
 */
import { vi } from 'vitest'
import type { District } from '@/domains/infrastructure/geography/entities/geography.types'
import type { PaginatedResult } from '@/domains/infrastructure/geography/types/pagination.types'

// Données mock par défaut
export const mockDistricts: District[] = [
  { id: 'dist-1', communeId: 'comm-1', name: 'Centre-Ville 1', createdAt: new Date(), updatedAt: new Date(), createdBy: 'test-user' },
  { id: 'dist-2', communeId: 'comm-1', name: 'Quartier Administratif 1', createdAt: new Date(), updatedAt: new Date(), createdBy: 'test-user' },
  { id: 'dist-3', communeId: 'comm-2', name: 'Zone Industrielle 2', createdAt: new Date(), updatedAt: new Date(), createdBy: 'test-user' },
  { id: 'dist-4', communeId: 'comm-2', name: 'Résidentiel Nord 2', createdAt: new Date(), updatedAt: new Date(), createdBy: 'test-user' },
  { id: 'dist-5', communeId: 'comm-3', name: 'Résidentiel Sud 3', createdAt: new Date(), updatedAt: new Date(), createdBy: 'test-user' },
]

// Mock du repository
export const mockDistrictRepository = {
  getPaginated: vi.fn().mockResolvedValue({
    data: mockDistricts,
    pagination: {
      nextCursor: null,
      prevCursor: null,
      hasNextPage: false,
      hasPrevPage: false,
      pageSize: 20,
    },
  } as PaginatedResult<District>),
  
  getCount: vi.fn().mockResolvedValue(mockDistricts.length),
  
  getById: vi.fn().mockImplementation((id: string) => {
    const district = mockDistricts.find(d => d.id === id)
    return Promise.resolve(district || null)
  }),
  
  getByCommuneId: vi.fn().mockImplementation((communeId: string) => {
    const districts = mockDistricts.filter(d => d.communeId === communeId)
    return Promise.resolve(districts)
  }),
  
  create: vi.fn().mockImplementation((data: Omit<District, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newDistrict: District = {
      id: `dist-${Date.now()}`,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    return Promise.resolve(newDistrict)
  }),
  
  createBulk: vi.fn().mockImplementation((dataArray: Array<Omit<District, 'id' | 'createdAt' | 'updatedAt'>>) => {
    return Promise.resolve(dataArray.map((data, index) => ({
      id: `dist-bulk-${Date.now()}-${index}`,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    })))
  }),
  
  update: vi.fn().mockImplementation((id: string, data: Partial<District>) => {
    const district = mockDistricts.find(d => d.id === id)
    if (!district) throw new Error('District not found')
    return Promise.resolve({ ...district, ...data, updatedAt: new Date() })
  }),
  
  delete: vi.fn().mockResolvedValue(undefined),
  
  getAll: vi.fn().mockResolvedValue(mockDistricts),
}

/**
 * Reset tous les mocks
 */
export function resetDistrictRepositoryMocks() {
  Object.values(mockDistrictRepository).forEach(mock => {
    if (typeof mock === 'function' && 'mockReset' in mock) {
      mock.mockReset()
    }
  })
  
  // Restaurer les valeurs par défaut
  mockDistrictRepository.getCount.mockResolvedValue(mockDistricts.length)
  mockDistrictRepository.getAll.mockResolvedValue(mockDistricts)
}

export default mockDistrictRepository
