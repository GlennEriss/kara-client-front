/**
 * Tests unitaires pour GenererIdentifiantService
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GenererIdentifiantService } from '../GenererIdentifiantService'
import type { User } from '@/types/types'

const mockGetUserById = vi.fn()
vi.mock('@/db/user.db', () => ({
  getUserById: (id: string) => mockGetUserById(id),
}))

function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-123',
    matricule: 'MAT-2024-001',
    firstName: 'Jean',
    lastName: 'Dupont',
    email: 'jean.dupont@example.com',
    birthDate: '1990-01-01',
    contacts: [],
    gender: 'Homme',
    nationality: 'Gabonaise',
    hasCar: false,
    address: { province: '', city: '', district: '', arrondissement: '' },
    membershipType: 'adherant',
    roles: ['Adherant'],
    dossier: '',
    subscriptions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true,
    ...overrides,
  }
}

describe('GenererIdentifiantService', () => {
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
    globalThis.fetch = vi.fn()
  })

  afterEach(() => {
    vi.clearAllMocks()
    globalThis.fetch = originalFetch
  })

  it('retourne les données PDF après réinitialisation réussie', async () => {
    const member = createMockUser({ id: 'user-123', matricule: 'MAT-001', email: 'jean@test.com' })
    mockGetUserById.mockResolvedValue(member)
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response)

    const service = GenererIdentifiantService.getInstance()
    const result = await service.resetPasswordAndGetPdfData('user-123', 'MAT-001')

    expect(mockGetUserById).toHaveBeenCalledWith('user-123')
    expect(fetch).toHaveBeenCalledWith(
      '/api/auth/admin/reset-member-password',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ memberId: 'user-123', newPassword: 'MAT-001' }),
      })
    )
    expect(result).toEqual({
      matricule: 'MAT-001',
      identifiant: 'jean@test.com',
      motDePasse: 'MAT-001',
    })
  })

  it('utilise le matricule comme identifiant si email absent', async () => {
    const member = createMockUser({ id: 'user-456', matricule: 'MAT-002', email: undefined })
    mockGetUserById.mockResolvedValue(member)
    vi.mocked(globalThis.fetch).mockResolvedValue({ ok: true, json: async () => ({}) } as Response)

    const service = GenererIdentifiantService.getInstance()
    const result = await service.resetPasswordAndGetPdfData('user-456', 'MAT-002')

    expect(result.identifiant).toBe('MAT-002')
    expect(result.matricule).toBe('MAT-002')
    expect(result.motDePasse).toBe('MAT-002')
  })

  it('lance une erreur si le membre est introuvable', async () => {
    mockGetUserById.mockResolvedValue(null)

    const service = GenererIdentifiantService.getInstance()
    await expect(service.resetPasswordAndGetPdfData('inconnu', 'MAT-001')).rejects.toThrow(
      'Membre introuvable'
    )
    expect(fetch).not.toHaveBeenCalled()
  })

  it('lance une erreur si l’API retourne une erreur', async () => {
    const member = createMockUser()
    mockGetUserById.mockResolvedValue(member)
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Erreur Auth', details: 'User not found' }),
    } as Response)

    const service = GenererIdentifiantService.getInstance()
    await expect(service.resetPasswordAndGetPdfData('user-123', 'MAT-001')).rejects.toThrow(
      'User not found'
    )
  })
})
