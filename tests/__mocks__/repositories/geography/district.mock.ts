/**
 * Mock du DistrictRepository pour les tests
 */
import { vi } from 'vitest'
import type { District } from '@/domains/infrastructure/geography/entities/geography.types'
import type { PaginatedResult } from '@/domains/infrastructure/geography/types/pagination.types'

// Données mock par défaut - 3 arrondissements par commune (structure cohérente)
export const mockDistricts: District[] = [
  // Ntoum (comm-1)
  { id: 'dist-1', communeId: 'comm-1', name: 'Centre-Ville', createdAt: new Date(), updatedAt: new Date(), createdBy: 'test-user' },
  { id: 'dist-2', communeId: 'comm-1', name: 'Quartier Administratif', createdAt: new Date(), updatedAt: new Date(), createdBy: 'test-user' },
  { id: 'dist-3', communeId: 'comm-1', name: 'Zone Industrielle', createdAt: new Date(), updatedAt: new Date(), createdBy: 'test-user' },
  // Cocobeach (comm-2)
  { id: 'dist-4', communeId: 'comm-2', name: 'Résidentiel Nord', createdAt: new Date(), updatedAt: new Date(), createdBy: 'test-user' },
  { id: 'dist-5', communeId: 'comm-2', name: 'Résidentiel Sud', createdAt: new Date(), updatedAt: new Date(), createdBy: 'test-user' },
  { id: 'dist-6', communeId: 'comm-2', name: 'Commercial', createdAt: new Date(), updatedAt: new Date(), createdBy: 'test-user' },
  // Kango (comm-3)
  { id: 'dist-7', communeId: 'comm-3', name: 'Portuaire', createdAt: new Date(), updatedAt: new Date(), createdBy: 'test-user' },
  { id: 'dist-8', communeId: 'comm-3', name: 'Aéroportuaire', createdAt: new Date(), updatedAt: new Date(), createdBy: 'test-user' },
  { id: 'dist-9', communeId: 'comm-3', name: 'Zone Périphérique', createdAt: new Date(), updatedAt: new Date(), createdBy: 'test-user' },
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
