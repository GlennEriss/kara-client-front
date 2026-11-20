import { describe, expect, it, vi } from 'vitest'
import { actionSchema, publicAdminAction } from '@/domains/mobile-admin/server/registry'
import { getAdminModule } from '@/domains/mobile-admin/catalog'
import { adminActions } from '@/domains/mobile-admin/operations'
import { sectionMetrics } from '@/domains/mobile-admin/server/filters'
import { notificationTarget } from '@/domains/mobile/server/notification-policy'
import { resolveAdminAccess } from '@/domains/auth/access-policy'
describe('prospection dans l’API mobile', () => {
  const module = getAdminModule('vehicles')!,
    dataset = module.datasets.find((d) => d.key === 'prospects')!
  it('conserve Assurances comme onglet initial et sépare les opérations de prospection', () => {
    expect(module.datasets[0].key).toBe('insurance')
    const actions = adminActions(module, dataset)
    expect(actions.map((a) => a.id).sort()).toEqual(
      [
        'prospect.create',
        'prospect.update',
        'prospect.contacted',
        'prospect.quote_requested',
        'prospect.renew',
        'prospect.assign',
        'prospect.convert',
        'prospect.lost',
      ].sort(),
    )
    expect(actions.every((a) => a.permission.startsWith('vehicules.'))).toBe(
      true,
    )
    expect(
      actions
        .find((a) => a.id === 'prospect.convert')
        ?.fields.find((f) => f.key === 'insuranceId')?.source,
    ).toBe('prospectInsurances')
  })
  it('ne compte pas les prospects comme assurés et respecte les suivis clôturés', () => {
    const metrics = sectionMetrics(
      module,
      dataset,
      [
        { status: 'tracking', endDate: '2020-01-01' },
        { status: 'converted', endDate: '2020-01-01' },
      ],
      [],
    )
    expect(metrics.find((m) => m.label === 'À contacter')?.value).toBe(1)
    expect(metrics.find((m) => m.label === 'Assurés chez LE KARA')?.value).toBe(
      1,
    )
    expect(metrics.some((m) => m.label === 'Membres assurés')).toBe(false)
  })
  it('ouvre directement la bonne fiche de prospection depuis une notification', () => {
    const access = resolveAdminAccess([{ role: 'SuperAdmin' }], {})
    expect(
      notificationTarget(access, {
        module: 'vehicule',
        entityId: 'p1',
        metadata: { prospectId: 'p1' },
      }),
    ).toMatchObject({
      screen: 'record',
      module: 'vehicles',
      dataset: 'prospects',
      id: 'p1',
    })
  })
})

describe('assurance mobile : quartier officiel lors de la modification', () => {
  it('enregistre la ville et le quartier officiels après validation du formulaire natif', async () => {
    const module = getAdminModule('vehicles')!, dataset = module.datasets.find(item => item.key === 'insurance')!
    const action = adminActions(module, dataset).find(item => item.id === 'insurance.update')!
    expect(action.fields.find(field => field.key === 'quarterId')?.source).toBe('vehicleQuarters')
    expect(publicAdminAction(action, { quarterId: 'Q1', quarter: 'Awendjé', city: 'Libreville' }).fields.find(field => field.key === 'quarterId')?.options).toEqual([{ value: 'Q1', label: 'Awendjé · Libreville' }])
    const geography: Record<string, object> = {
      'quarters/Q1': { name: 'Awendjé', districtId: 'D1' },
      'districts/D1': { name: '3e arrondissement', communeId: 'C1' },
      'communes/C1': { name: 'Libreville', departmentId: 'DEPT1' },
      'departments/DEPT1': { name: 'Komo-Mondah', provinceId: 'P1' },
      'provinces/P1': { name: 'Estuaire' },
    }
    const update = vi.fn(async () => ({}))
    const ctx = { id: 'INS1', files: {}, caller: { claims: { uid: 'ADMIN' } }, services: {
      db: { collection: (collection: string) => ({ doc: (id: string) => ({ get: async () => ({ exists: !!geography[`${collection}/${id}`], data: () => geography[`${collection}/${id}`] }) }) }) },
      members: { getMemberById: async () => ({ id: 'SPONSOR', firstName: 'Alice', lastName: 'Ondo', contacts: [] }) },
      vehicles: { updateInsurance: update },
    } }
    const input = actionSchema(action).parse({ holderType: 'non-member', nonMemberFirstName: 'Paul', nonMemberLastName: 'Test', nonMemberPhone1: '+24177000000',
      city: 'Ancien texte', locationType: 'quarter', quarterId: 'Q1', vehicleType: 'car', plateNumber: 'TEST-123', insuranceCompany: 'Assurance test', policyNumber: 'POL-TEST',
      warrantyMonths: 12, premiumAmount: 100000, sponsorMemberId: 'SPONSOR', startDate: '2026-01-01', endDate: '2027-01-01',
    }) as Record<string, unknown>
    await action.run(ctx as never, input)
    expect(update).toHaveBeenCalledWith('INS1', expect.objectContaining({ city: 'Libreville', quarterId: 'Q1', quarter: 'Awendjé', communeId: 'C1', districtId: 'D1' }), 'ADMIN')
    await expect(action.run(ctx as never, { ...input, quarterId: 'ABSENT' })).rejects.toThrow('Quartier introuvable')
    expect(update).toHaveBeenCalledTimes(1)
  })
})
