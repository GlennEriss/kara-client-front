import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { VehicleInsurance } from '@/types/types'

vi.mock('@/factories/RepositoryFactory', () => ({ RepositoryFactory: { getVehicleInsuranceRepository: vi.fn(() => ({})) } }))
vi.mock('@/factories/ServiceFactory', () => ({ ServiceFactory: { getNotificationService: vi.fn(() => ({ createNotification: vi.fn() })) } }))

import { VehicleInsuranceService } from '../VehicleInsuranceService'

const inDays = (days: number) => new Date(Date.now() + days * 86_400_000)

describe('VehicleInsuranceService - déclarations des membres', () => {
  let current: VehicleInsurance
  const repository = {
    getById: vi.fn(async () => current),
    update: vi.fn(async (_id: string, updates: Partial<VehicleInsurance>) => {
      current = { ...current, ...updates }
    }),
  }
  const service = new VehicleInsuranceService(repository as never)

  beforeEach(() => {
    vi.clearAllMocks()
    current = {
      id: 'V1',
      holderType: 'member',
      memberId: '1234.MK.000001',
      plateNumber: 'AB-123-CD',
      city: 'Libreville',
      sponsorMemberId: '9999.MK.000002',
      endDate: inDays(200),
      declarationStatus: 'pending',
    } as VehicleInsurance
  })

  it('valide une déclaration complète avec le statut de ses dates', async () => {
    await service.validateDeclaration('V1', 'A1')
    expect(current.declarationStatus).toBe('validated')
    expect(current.status).toBe('active')
    expect(current.validatedBy).toBe('A1')
  })

  it('donne le statut « expire bientôt » ou « expirée » selon la date de fin', async () => {
    current.endDate = inDays(10)
    await service.validateDeclaration('V1', 'A1')
    expect(current.status).toBe('expires_soon')
  })

  it('exige la plaque, la ville et le parrain avant de valider', async () => {
    current.city = undefined
    await expect(service.validateDeclaration('V1', 'A1')).rejects.toThrow('Complétez')
  })

  it('refuse une déclaration avec un motif', async () => {
    await service.rejectDeclaration('V1', 'Police introuvable chez le partenaire', 'A1')
    expect(current.declarationStatus).toBe('rejected')
    expect(current.rejectionReason).toBe('Police introuvable chez le partenaire')
  })

  it("n'agit que sur une déclaration en attente", async () => {
    current.declarationStatus = 'draft'
    await expect(service.validateDeclaration('V1', 'A1')).rejects.toThrow('attente')
    await expect(service.rejectDeclaration('V1', 'Motif suffisant', 'A1')).rejects.toThrow('attente')
  })
})
