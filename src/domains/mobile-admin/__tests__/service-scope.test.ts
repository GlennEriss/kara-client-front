/* eslint-disable no-restricted-imports -- Adaptateur natif utilisant les services et modèles métier existants du site. */
import { describe, it, expect, vi } from 'vitest'
import { createCharityEventService } from '@/services/bienfaiteur/CharityEventService'
const event = {
  title: 'Collecte de test',
  location: 'Owendo',
  description: 'Collecte pour vérifier les services partagés.',
  startDate: new Date('2027-01-01T12:00:00Z'),
  endDate: new Date('2027-01-02T12:00:00Z'),
  status: 'draft',
  isPublic: true,
  currency: 'FCFA',
} as any
describe('services métier réutilisés par les nouvelles sections natives', () => {
  it('isole deux requêtes sans modifier le singleton utilisé par le site', async () => {
    const createA = vi.fn().mockResolvedValue('A'),
      createB = vi.fn().mockResolvedValue('B')
    const serviceA = createCharityEventService({
      CharityEventRepository: { create: createA } as any,
    }).CharityEventService
    const serviceB = createCharityEventService({
      CharityEventRepository: { create: createB } as any,
    }).CharityEventService
    expect(
      await Promise.all([
        serviceA.createEvent(event, 'admin-A'),
        serviceB.createEvent(event, 'admin-B'),
      ]),
    ).toEqual(['A', 'B'])
    expect(createA).toHaveBeenCalledWith(
      expect.objectContaining({
        createdBy: 'admin-A',
        totalCollectedAmount: 0,
        totalContributionsCount: 0,
      }),
    )
    expect(createB).toHaveBeenCalledWith(
      expect.objectContaining({
        createdBy: 'admin-B',
        totalCollectedAmount: 0,
      }),
    )
    expect(createA).toHaveBeenCalledTimes(1)
    expect(createB).toHaveBeenCalledTimes(1)
  })
  it('conserve la règle du site qui interdit de rouvrir une collecte close en cours', async () => {
    const update = vi.fn()
    const service = createCharityEventService({
      CharityEventRepository: {
        getById: async () => ({ ...event, status: 'closed' }),
        update,
      } as any,
    }).CharityEventService
    await expect(
      service.updateEvent('C1', { status: 'ongoing' }, 'admin'),
    ).rejects.toThrow('statut actuel')
    expect(update).not.toHaveBeenCalled()
  })
})
