import { describe, expect, it } from 'vitest'
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
