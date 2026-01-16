/**
 * Mock du ProfessionRepository pour les tests
 */
import { vi } from 'vitest'
import type { Profession, PaginatedProfessions } from '@/domains/infrastructure/references/entities/profession.types'

// Données mock par défaut
export const mockProfessions: Profession[] = [
  {
    id: 'prof-1',
    name: 'Ingénieur',
    normalizedName: 'ingenieur',
    category: 'Technique',
    description: 'Ingénieur en informatique',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    createdBy: 'test-user',
  },
  {
    id: 'prof-2',
    name: 'Médecin',
    normalizedName: 'medecin',
    category: 'Santé',
    description: 'Médecin généraliste',
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
    createdBy: 'test-user',
  },
  {
    id: 'prof-3',
    name: 'Enseignant',
    normalizedName: 'enseignant',
    category: 'Éducation',
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-03'),
    createdBy: 'test-user',
  },
]

// Mock du repository
export const mockProfessionRepository = {
  findByName: vi.fn().mockImplementation((name: string) => {
    const normalized = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    const profession = mockProfessions.find(p => p.normalizedName === normalized)
    if (profession) {
      return Promise.resolve({ found: true, profession })
    }
    return Promise.resolve({ found: false, suggestions: [] })
  }),

  create: vi.fn().mockImplementation((data: Omit<Profession, 'id' | 'createdAt' | 'updatedAt'>, adminId: string) => {
    const newProfession: Profession = {
      id: `prof-${Date.now()}`,
      ...data,
      normalizedName: data.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: adminId,
    }
    mockProfessions.push(newProfession)
    return Promise.resolve(newProfession)
  }),

  getById: vi.fn().mockImplementation((id: string) => {
    const profession = mockProfessions.find(p => p.id === id)
    return Promise.resolve(profession || null)
  }),

  getAll: vi.fn().mockResolvedValue(mockProfessions),

  getPaginated: vi.fn().mockImplementation((filters = {}, page = 1, limit = 12) => {
    let filtered = [...mockProfessions]
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchLower) ||
        p.normalizedName.includes(searchLower)
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
    } as PaginatedProfessions)
  }),

  update: vi.fn().mockImplementation((id: string, updates: Partial<Profession>) => {
    const profession = mockProfessions.find(p => p.id === id)
    if (!profession) return Promise.resolve(null)
    const updated = { ...profession, ...updates, updatedAt: new Date() }
    if (updates.name) {
      updated.normalizedName = updates.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    }
    Object.assign(profession, updated)
    return Promise.resolve(updated)
  }),

  delete: vi.fn().mockImplementation((id: string) => {
    const index = mockProfessions.findIndex(p => p.id === id)
    if (index !== -1) {
      mockProfessions.splice(index, 1)
    }
    return Promise.resolve()
  }),

  findOrCreate: vi.fn().mockImplementation((name: string, adminId: string) => {
    const normalized = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    const existing = mockProfessions.find(p => p.normalizedName === normalized)
    if (existing) {
      return Promise.resolve({ id: existing.id, isNew: false })
    }
    const newProfession: Profession = {
      id: `prof-${Date.now()}`,
      name,
      normalizedName: normalized,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: adminId,
    }
    mockProfessions.push(newProfession)
    return Promise.resolve({ id: newProfession.id, isNew: true })
  }),
}
