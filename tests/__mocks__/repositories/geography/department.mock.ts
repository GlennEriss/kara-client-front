/**
 * Mock du DepartmentRepository pour les tests
 */
import { vi } from 'vitest'
import type { Department } from '@/domains/infrastructure/geography/entities/geography.types'
import type { PaginatedResult } from '@/domains/infrastructure/geography/types/pagination.types'

// Données mock par défaut
export const mockDepartments: Department[] = [
  { id: 'dept-1', provinceId: 'prov-1', name: 'Libreville', createdAt: new Date(), updatedAt: new Date(), createdBy: 'test-user' },
  { id: 'dept-2', provinceId: 'prov-1', name: 'Ntoum', createdAt: new Date(), updatedAt: new Date(), createdBy: 'test-user' },
  { id: 'dept-3', provinceId: 'prov-2', name: 'Franceville', createdAt: new Date(), updatedAt: new Date(), createdBy: 'test-user' },
  { id: 'dept-4', provinceId: 'prov-2', name: 'Lékoni', createdAt: new Date(), updatedAt: new Date(), createdBy: 'test-user' },
  { id: 'dept-5', provinceId: 'prov-3', name: 'Lambaréné', createdAt: new Date(), updatedAt: new Date(), createdBy: 'test-user' },
]

// Mock du repository
export const mockDepartmentRepository = {
  getPaginated: vi.fn().mockResolvedValue({
    data: mockDepartments,
    pagination: {
      nextCursor: null,
      prevCursor: null,
      hasNextPage: false,
      hasPrevPage: false,
      pageSize: 20,
    },
  } as PaginatedResult<Department>),
  
  getCount: vi.fn().mockResolvedValue(mockDepartments.length),
  
  getById: vi.fn().mockImplementation((id: string) => {
    const department = mockDepartments.find(d => d.id === id)
    return Promise.resolve(department || null)
  }),
  
  getByProvinceId: vi.fn().mockImplementation((provinceId: string) => {
    const departments = mockDepartments.filter(d => d.provinceId === provinceId)
    return Promise.resolve(departments)
  }),
  
  create: vi.fn().mockImplementation((data: Omit<Department, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newDepartment: Department = {
      id: `dept-${Date.now()}`,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    return Promise.resolve(newDepartment)
  }),
  
  update: vi.fn().mockImplementation((id: string, data: Partial<Department>) => {
    const department = mockDepartments.find(d => d.id === id)
    if (!department) throw new Error('Department not found')
    return Promise.resolve({ ...department, ...data, updatedAt: new Date() })
  }),
  
  delete: vi.fn().mockResolvedValue(undefined),
  
  getAll: vi.fn().mockResolvedValue(mockDepartments),
}

/**
 * Helper pour configurer une réponse paginée
 */
export function setupDepartmentPaginatedResponse(
  departments: Department[],
  hasNextPage = false,
  pageSize = 20
) {
  mockDepartmentRepository.getPaginated.mockResolvedValue({
    data: departments,
    pagination: {
      nextCursor: hasNextPage ? departments[departments.length - 1]?.id : null,
      prevCursor: null,
      hasNextPage,
      hasPrevPage: false,
      pageSize,
    },
  })
}

/**
 * Helper pour filtrer par province
 */
export function setupFilteredByProvince(provinceId: string) {
  const filtered = mockDepartments.filter(d => d.provinceId === provinceId)
  mockDepartmentRepository.getPaginated.mockResolvedValue({
    data: filtered,
    pagination: {
      nextCursor: null,
      prevCursor: null,
      hasNextPage: false,
      hasPrevPage: false,
      pageSize: 20,
    },
  })
  mockDepartmentRepository.getCount.mockResolvedValue(filtered.length)
}

/**
 * Reset tous les mocks
 */
export function resetDepartmentRepositoryMocks() {
  mockDepartmentRepository.getPaginated.mockReset()
  mockDepartmentRepository.getCount.mockReset()
  mockDepartmentRepository.getById.mockReset()
  mockDepartmentRepository.getByProvinceId.mockReset()
  mockDepartmentRepository.create.mockReset()
  mockDepartmentRepository.update.mockReset()
  mockDepartmentRepository.delete.mockReset()
  mockDepartmentRepository.getAll.mockReset()
  
  // Restaurer les valeurs par défaut
  mockDepartmentRepository.getCount.mockResolvedValue(mockDepartments.length)
  mockDepartmentRepository.getAll.mockResolvedValue(mockDepartments)
}

export default mockDepartmentRepository
