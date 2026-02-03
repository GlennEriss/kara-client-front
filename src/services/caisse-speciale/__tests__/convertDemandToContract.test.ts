import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CaisseSpecialeService } from '@/services/caisse-speciale/CaisseSpecialeService'

const memberRepository = { getMemberById: vi.fn() }
const adminRepository = { getAdminById: vi.fn() }
const notificationService = { createNotification: vi.fn() }

const subscribe = vi.fn()
const getActiveSettings = vi.fn()

vi.mock('@/factories/RepositoryFactory', () => ({
  RepositoryFactory: {
    getMemberRepository: () => memberRepository,
    getAdminRepository: () => adminRepository,
  },
}))

vi.mock('@/factories/ServiceFactory', () => ({
  ServiceFactory: {
    getNotificationService: () => notificationService,
  },
}))

vi.mock('@/services/caisse/mutations', () => ({
  subscribe,
}))

vi.mock('@/db/caisse/settings.db', () => ({
  getActiveSettings,
}))

describe('CaisseSpecialeService.convertDemandToContract', () => {
  const demandRepository = {
    getDemandById: vi.fn(),
    updateDemand: vi.fn(),
  }

  const baseDemand = {
    id: 'DEM_1',
    status: 'APPROVED',
    memberId: 'MEM_1',
    monthlyAmount: 10000,
    monthsPlanned: 6,
    caisseType: 'STANDARD',
    desiredDate: '2025-01-01',
    createdBy: 'ADMIN_0',
  } as any

  beforeEach(() => {
    vi.clearAllMocks()
    demandRepository.getDemandById.mockResolvedValue(baseDemand)
    demandRepository.updateDemand.mockResolvedValue({
      ...baseDemand,
      status: 'CONVERTED',
      contractId: 'CONTRACT_1',
    })
    adminRepository.getAdminById.mockResolvedValue({ firstName: 'Ada', lastName: 'Admin' })
  })

  it('refuse la conversion si aucun paramètre actif', async () => {
    getActiveSettings.mockResolvedValue(null)

    const service = new CaisseSpecialeService(demandRepository as any)

    await expect(service.convertDemandToContract('DEM_1', 'ADMIN_1')).rejects.toThrow(
      'Paramètres non configurés pour ce type de caisse'
    )

    expect(subscribe).not.toHaveBeenCalled()
  })

  it('convertit la demande avec settingsVersion', async () => {
    getActiveSettings.mockResolvedValue({ id: 'SETTINGS_1' })
    subscribe.mockResolvedValue('CONTRACT_1')

    const service = new CaisseSpecialeService(demandRepository as any)
    const result = await service.convertDemandToContract('DEM_1', 'ADMIN_1')

    expect(result?.contractId).toBe('CONTRACT_1')
    expect(subscribe).toHaveBeenCalledWith(
      expect.objectContaining({
        caisseType: 'STANDARD',
        settingsVersion: 'SETTINGS_1',
      })
    )
    expect(demandRepository.updateDemand).toHaveBeenCalledWith(
      'DEM_1',
      expect.objectContaining({
        status: 'CONVERTED',
        contractId: 'CONTRACT_1',
        convertedBy: 'ADMIN_1',
      })
    )
  })
})
