/**
 * Mock du ProvinceRepository pour les tests
 */
import { vi } from 'vitest'
import type { Province } from '@/domains/infrastructure/geography/entities/geography.types'
import type { PaginatedResult } from '@/domains/infrastructure/geography/types/pagination.types'

// Données mock par défaut
export const mockProvinces: Province[] = [
  { id: 'prov-1', code: 'EST', name: 'Estuaire', createdAt: new Date(), updatedAt: new Date(), createdBy: 'test-user' },
  { id: 'prov-2', code: 'HOG', name: 'Haut-Ogooué', createdAt: new Date(), updatedAt: new Date(), createdBy: 'test-user' },
  { id: 'prov-3', code: 'MOG', name: 'Moyen-Ogooué', createdAt: new Date(), updatedAt: new Date(), createdBy: 'test-user' },
  { id: 'prov-4', code: 'NGO', name: 'Ngounié', createdAt: new Date(), updatedAt: new Date(), createdBy: 'test-user' },
  { id: 'prov-5', code: 'NYA', name: 'Nyanga', createdAt: new Date(), updatedAt: new Date(), createdBy: 'test-user' },
]

// Mock du repository
export const mockProvinceRepository = {
  getPaginated: vi.fn().mockResolvedValue({
    data: mockProvinces,
    pagination: {
      nextCursor: null,
      prevCursor: null,
      hasNextPage: false,
      hasPrevPage: false,
      pageSize: 20,
    },
  } as PaginatedResult<Province>),
  
  getCount: vi.fn().mockResolvedValue(mockProvinces.length),
  
  getById: vi.fn().mockImplementation((id: string) => {
    const province = mockProvinces.find(p => p.id === id)
    return Promise.resolve(province || null)
  }),
  
  create: vi.fn().mockImplementation((data: Omit<Province, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newProvince: Province = {
      id: `prov-${Date.now()}`,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    return Promise.resolve(newProvince)
  }),
  
  update: vi.fn().mockImplementation((id: string, data: Partial<Province>) => {
    const province = mockProvinces.find(p => p.id === id)
    if (!province) throw new Error('Province not found')
    return Promise.resolve({ ...province, ...data, updatedAt: new Date() })
  }),
  
  delete: vi.fn().mockResolvedValue(undefined),
  
  getAll: vi.fn().mockResolvedValue(mockProvinces),
}

/**
 * Helper pour configurer une réponse paginée
 */
export function setupProvincePaginatedResponse(
  provinces: Province[],
  hasNextPage = false,
  pageSize = 20
) {
  mockProvinceRepository.getPaginated.mockResolvedValue({
    data: provinces,
    pagination: {
      nextCursor: hasNextPage ? provinces[provinces.length - 1]?.id : null,
      prevCursor: null,
      hasNextPage,
      hasPrevPage: false,
      pageSize,
    },
  })
}

/**
 * Reset tous les mocks
 */
export function resetProvinceRepositoryMocks() {
  mockProvinceRepository.getPaginated.mockReset()
  mockProvinceRepository.getCount.mockReset()
  mockProvinceRepository.getById.mockReset()
  mockProvinceRepository.create.mockReset()
  mockProvinceRepository.update.mockReset()
  mockProvinceRepository.delete.mockReset()
  mockProvinceRepository.getAll.mockReset()
  
  // Restaurer les valeurs par défaut
  mockProvinceRepository.getCount.mockResolvedValue(mockProvinces.length)
  mockProvinceRepository.getAll.mockResolvedValue(mockProvinces)
}

export default mockProvinceRepository
