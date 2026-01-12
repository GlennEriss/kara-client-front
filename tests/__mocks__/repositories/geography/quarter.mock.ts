/**
 * Mock du QuarterRepository pour les tests
 */
import { vi } from 'vitest'
import type { Quarter } from '@/domains/infrastructure/geography/entities/geography.types'
import type { PaginatedResult } from '@/domains/infrastructure/geography/types/pagination.types'

// Données mock par défaut
export const mockQuarters: Quarter[] = [
  { id: 'qtr-1', districtId: 'dist-1', name: 'Quartier A 1-1', createdAt: new Date(), updatedAt: new Date(), createdBy: 'test-user' },
  { id: 'qtr-2', districtId: 'dist-1', name: 'Quartier B 1-2', createdAt: new Date(), updatedAt: new Date(), createdBy: 'test-user' },
  { id: 'qtr-3', districtId: 'dist-2', name: 'Quartier C 2-1', createdAt: new Date(), updatedAt: new Date(), createdBy: 'test-user' },
  { id: 'qtr-4', districtId: 'dist-2', name: 'Quartier D 2-2', createdAt: new Date(), updatedAt: new Date(), createdBy: 'test-user' },
  { id: 'qtr-5', districtId: 'dist-3', name: 'Quartier E 3-1', createdAt: new Date(), updatedAt: new Date(), createdBy: 'test-user' },
]

// Mock du repository
export const mockQuarterRepository = {
  getPaginated: vi.fn().mockResolvedValue({
    data: mockQuarters,
    pagination: {
      nextCursor: null,
      prevCursor: null,
      hasNextPage: false,
      hasPrevPage: false,
      pageSize: 20,
    },
  } as PaginatedResult<Quarter>),
  
  getCount: vi.fn().mockResolvedValue(mockQuarters.length),
  
  getById: vi.fn().mockImplementation((id: string) => {
    const quarter = mockQuarters.find(q => q.id === id)
    return Promise.resolve(quarter || null)
  }),
  
  getByDistrictId: vi.fn().mockImplementation((districtId: string) => {
    const quarters = mockQuarters.filter(q => q.districtId === districtId)
    return Promise.resolve(quarters)
  }),
  
  create: vi.fn().mockImplementation((data: Omit<Quarter, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newQuarter: Quarter = {
      id: `qtr-${Date.now()}`,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    return Promise.resolve(newQuarter)
  }),
  
  update: vi.fn().mockImplementation((id: string, data: Partial<Quarter>) => {
    const quarter = mockQuarters.find(q => q.id === id)
    if (!quarter) throw new Error('Quarter not found')
    return Promise.resolve({ ...quarter, ...data, updatedAt: new Date() })
  }),
  
  delete: vi.fn().mockResolvedValue(undefined),
  
  getAll: vi.fn().mockResolvedValue(mockQuarters),
}

/**
 * Reset tous les mocks
 */
export function resetQuarterRepositoryMocks() {
  Object.values(mockQuarterRepository).forEach(mock => {
    if (typeof mock === 'function' && 'mockReset' in mock) {
      mock.mockReset()
    }
  })
  
  // Restaurer les valeurs par défaut
  mockQuarterRepository.getCount.mockResolvedValue(mockQuarters.length)
  mockQuarterRepository.getAll.mockResolvedValue(mockQuarters)
}

export default mockQuarterRepository
