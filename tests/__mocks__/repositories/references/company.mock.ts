/**
 * Mock du CompanyRepository pour les tests
 */
import { vi } from 'vitest'
import type { Company } from '@/domains/infrastructure/references/entities/company.types'
import type { PaginatedCompanies } from '@/domains/infrastructure/references/repositories/ICompanyRepository'

// Données mock par défaut
export const mockCompanies: Company[] = [
  {
    id: 'comp-1',
    name: 'Total Gabon',
    normalizedName: 'total gabon',
    industry: 'Pétrole',
    employeeCount: 500,
    address: {
      province: 'Estuaire',
      city: 'Libreville',
      district: 'Akanda',
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    createdBy: 'test-user',
  },
  {
    id: 'comp-2',
    name: 'Ministère de la Santé',
    normalizedName: 'ministere de la sante',
    industry: 'Public',
    address: {
      province: 'Estuaire',
      city: 'Libreville',
    },
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
    createdBy: 'test-user',
  },
  {
    id: 'comp-3',
    name: 'Banque Gabonaise',
    normalizedName: 'banque gabonaise',
    industry: 'Finance',
    employeeCount: 200,
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-03'),
    createdBy: 'test-user',
  },
]

// Mock du repository
export const mockCompanyRepository = {
  findByName: vi.fn().mockImplementation((name: string) => {
    const normalized = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    const company = mockCompanies.find(c => c.normalizedName === normalized)
    if (company) {
      return Promise.resolve({ found: true, company })
    }
    return Promise.resolve({ found: false, suggestions: [] })
  }),

  create: vi.fn().mockImplementation((data: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>, adminId: string) => {
    const newCompany: Company = {
      id: `comp-${Date.now()}`,
      ...data,
      normalizedName: data.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: adminId,
    }
    mockCompanies.push(newCompany)
    return Promise.resolve(newCompany)
  }),

  getById: vi.fn().mockImplementation((id: string) => {
    const company = mockCompanies.find(c => c.id === id)
    return Promise.resolve(company || null)
  }),

  getAll: vi.fn().mockResolvedValue(mockCompanies),

  getPaginated: vi.fn().mockImplementation((filters = {}, page = 1, limit = 12) => {
    let filtered = [...mockCompanies]
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(searchLower) ||
        c.normalizedName.includes(searchLower)
      )
    }

    const totalItems = filtered.length
    const startIndex = (page - 1) * limit
    const pageData = filtered.slice(startIndex, startIndex + limit)

    return Promise.resolve({
      data: pageData,
      pagination: {
        currentPage: page,
        totalPages: Math.max(1, Math.ceil(totalItems / limit)),
        totalItems,
        itemsPerPage: limit,
        hasNextPage: startIndex + limit < totalItems,
        hasPrevPage: page > 1,
      },
    } as PaginatedCompanies)
  }),

  update: vi.fn().mockImplementation((id: string, updates: Partial<Company>) => {
    const company = mockCompanies.find(c => c.id === id)
    if (!company) return Promise.resolve(null)
    const updated = { ...company, ...updates, updatedAt: new Date() }
    if (updates.name) {
      updated.normalizedName = updates.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    }
    Object.assign(company, updated)
    return Promise.resolve(updated)
  }),

  delete: vi.fn().mockImplementation((id: string) => {
    const index = mockCompanies.findIndex(c => c.id === id)
    if (index !== -1) {
      mockCompanies.splice(index, 1)
    }
    return Promise.resolve()
  }),

  findOrCreate: vi.fn().mockImplementation((name: string, adminId: string) => {
    const normalized = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    const existing = mockCompanies.find(c => c.normalizedName === normalized)
    if (existing) {
      return Promise.resolve({ id: existing.id, isNew: false })
    }
    const newCompany: Company = {
      id: `comp-${Date.now()}`,
      name,
      normalizedName: normalized,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: adminId,
    }
    mockCompanies.push(newCompany)
    return Promise.resolve({ id: newCompany.id, isNew: true })
  }),
}
