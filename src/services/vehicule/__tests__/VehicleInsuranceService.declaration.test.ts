import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { VehicleInsuranceFormValues } from '@/schemas/vehicule.schema'
import type { VehicleInsurance } from '@/types/types'

vi.mock('@/factories/RepositoryFactory', () => ({ RepositoryFactory: { getVehicleInsuranceRepository: vi.fn(() => ({})) } }))
vi.mock('@/factories/ServiceFactory', () => ({ ServiceFactory: { getNotificationService: vi.fn(() => ({ createNotification: vi.fn() })) } }))

import { VehicleInsuranceService } from '../VehicleInsuranceService'

const inDays = (days: number) => new Date(Date.now() + days * 86_400_000)

describe('VehicleInsuranceService - déclarations des membres', () => {
  let current: VehicleInsurance
  const repository = {
    getById: vi.fn(async () => current),
    create: vi.fn(async (data: Omit<VehicleInsurance, 'id'>) => {
      current = { id: 'created', ...data }
      return 'created'
    }),
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

  it('ne transmet aucun champ de pièce jointe indéfini à Firestore', async () => {
    const payload = {
      holderType: 'member',
      city: 'Libreville',
      memberId: '1234.MK.000001',
      memberFirstName: 'Awa',
      memberLastName: 'N.',
      memberContacts: [],
      sponsorMemberId: '1234.MK.000001',
      sponsorName: 'N. Awa',
      sponsorContacts: [],
      vehicleType: 'car',
      plateNumber: 'AB-123-CD',
      insuranceCompany: 'Assureur test',
      policyNumber: 'POL-001',
      warrantyMonths: 12,
      premiumAmount: 100_000,
      currency: 'FCFA',
      startDate: new Date(),
      endDate: inDays(365),
      attachments: {
        policyUrl: undefined,
        policyPath: undefined,
        receiptUrl: undefined,
        receiptPath: undefined,
      },
    } as VehicleInsuranceFormValues

    await service.createInsurance(payload, 'A1')

    const saved = repository.create.mock.calls.at(-1)?.[0]
    expect(saved).not.toHaveProperty('attachments')
  })

  it('ne conserve que le reçu réellement renseigné', async () => {
    const payload = {
      holderType: 'member',
      city: 'Libreville',
      memberId: '1234.MK.000001',
      sponsorMemberId: '1234.MK.000001',
      sponsorName: 'N. Awa',
      vehicleType: 'car',
      plateNumber: 'AB-123-CD',
      insuranceCompany: 'Assureur test',
      policyNumber: 'POL-001',
      warrantyMonths: 12,
      premiumAmount: 100_000,
      currency: 'FCFA',
      startDate: new Date(),
      endDate: inDays(365),
      attachments: {
        policyUrl: undefined,
        receiptUrl: 'https://example.test/recu.pdf',
        receiptPath: 'vehicle-insurances/membre/dossier/recu.pdf',
      },
    } as VehicleInsuranceFormValues

    await service.createInsurance(payload, 'A1')

    expect(repository.create.mock.calls.at(-1)?.[0].attachments).toEqual({
      receiptUrl: 'https://example.test/recu.pdf',
      receiptPath: 'vehicle-insurances/membre/dossier/recu.pdf',
    })
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
