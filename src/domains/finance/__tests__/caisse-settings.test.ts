// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { caisseSettingsActions } from '../operations/caisse-settings'
import { settingsActions } from '../operations/settings'
import {
  settingsRow,
  selectSettings,
  settingsOverview,
  settingsExportRow,
  enrichSettingsAuthors,
} from '../server/settings-presentation'
import { defaultSubscriptionCIValues } from '@/schemas/caisse-imprevue.schema'
import type { ActionContext } from '../actions'
vi.mock('../server/read-model', () => ({
  financeCollection: (_m: string) => 'settings',
}))
const f = {
  create: vi.fn(),
  update: vi.fn(),
  activate: vi.fn(),
  remove: vi.fn(),
  list: vi.fn(),
  author: vi.fn(),
}
const old = {
  caisseType: 'STANDARD',
  isActive: true,
  bonusTable: { M4: 4, M13: 17 },
  penaltyRules: {
    day4To12: { steps: [{ from: 1, to: 3, rate: 1 }] },
    other: { unchanged: true },
  },
  businessTexts: { notice: 'Conserver' },
  code: 'A',
}
const ctx = () =>
  ({
    id: 'S1',
    caller: { claims: { uid: 'ADMIN' } },
    services: {
      db: {
        collection: () => ({
          doc: () => ({ get: async () => ({ exists: true, data: () => old }) }),
        }),
      },
      csSettings: {
        createSettings: f.create,
        updateSettings: f.update,
        activateSettings: f.activate,
        deleteSettings: f.remove,
      },
      caisseImprevue: {
        createSubscription: f.create,
        updateSubscription: f.update,
        deleteSubscription: f.remove,
        getAllSubscriptions: f.list,
      },
      admins: { getAdminById: f.author },
    },
  }) as unknown as ActionContext
const action = (module: 'caisse-speciale' | 'caisse-imprevue', id: string) =>
  caisseSettingsActions(module).find((a) => a.id === id)!
const cs = {
  bonus: Array.from({ length: 9 }, (_, i) => ({ month: i + 4, rate: 5 })),
  useSteps: true,
  penaltyPerDay: 0,
  penaltySteps: [
    { from: 1, to: 3, rate: 1 },
    { from: 4, to: 9, rate: 2 },
  ],
}
beforeEach(() => {
  vi.clearAllMocks()
  f.list.mockResolvedValue([{ id: 'A', code: 'A' }])
  f.author.mockResolvedValue({
    firstName: 'Alice',
    lastName: 'TEST',
    email: 'alice@example.test',
  })
})
describe('lot 8 paramètres des caisses', () => {
  it('crée une version inactive et réserve l’activation au service qui désactive les autres versions du même type', async () => {
    const a = action('caisse-speciale', 'settings.create')
    await a.run(
      ctx(),
      a.schema.parse({
        caisseType: 'STANDARD',
        effectiveAt: '2026-11-19',
        bonus: cs.bonus,
        penaltyPerDay: 1,
      }),
    )
    expect(f.create).toHaveBeenCalledWith(
      expect.objectContaining({
        isActive: false,
        caisseType: 'STANDARD',
        createdBy: 'ADMIN',
        bonusTable: {
          M4: 5,
          M5: 5,
          M6: 5,
          M7: 5,
          M8: 5,
          M9: 5,
          M10: 5,
          M11: 5,
          M12: 5,
        },
        effectiveAt: new Date('2026-11-19T11:00:00Z'),
      }),
    )
    expect(
      a.schema.safeParse({
        caisseType: 'STANDARD',
        effectiveAt: '2026-11-19',
        bonus: [],
        penaltyPerDay: 0,
        isActive: true,
      }).success,
    ).toBe(false)
    await action('caisse-speciale', 'settings.activate').run(ctx(), {})
    expect(f.activate).toHaveBeenCalledWith('S1')
  })
  it('modifie les bonus et paliers sans changer le type, la date d’effet, l’activation ni les autres règles', async () => {
    const a = action('caisse-speciale', 'settings.update')
    await a.run(ctx(), a.schema.parse(cs))
    const update = f.update.mock.calls[0][1]
    expect(update).toMatchObject({
      bonusTable: { M4: 5, M13: 17 },
      penaltyRules: {
        other: { unchanged: true },
        day4To12: { steps: cs.penaltySteps },
      },
      updatedBy: 'ADMIN',
    })
    for (const k of ['caisseType', 'effectiveAt', 'isActive', 'businessTexts'])
      expect(update).not.toHaveProperty(k)
    f.update.mockClear()
    await a.run(
      ctx(),
      a.schema.parse({
        ...cs,
        useSteps: false,
        penaltyPerDay: 0.5,
        penaltySteps: [],
      }),
    )
    expect(f.update.mock.calls[0][1].penaltyRules.day4To12).toEqual({
      perDay: 0.5,
    })
  })
  it('rejette les paliers vides, inversés, chevauchants, les taux invalides et les bonus dupliqués', () => {
    const schema = action('caisse-speciale', 'settings.update').schema
    for (const penaltySteps of [
      [],
      [{ from: 3, to: 1, rate: 1 }],
      [
        { from: 1, to: 4, rate: 1 },
        { from: 3, to: 5, rate: 2 },
      ],
      [{ from: 0, to: 3, rate: 1 }],
      [{ from: 1, to: 9, rate: 101 }],
    ])
      expect(schema.safeParse({ ...cs, penaltySteps }).success).toBe(false)
    expect(
      schema.safeParse({
        ...cs,
        bonus: [
          { month: 4, rate: 1 },
          { month: 4, rate: 2 },
        ],
      }).success,
    ).toBe(false)
  })
  it('utilise le schéma CI du site et empêche les codes utilisés ou modifiés après création', async () => {
    const create = action('caisse-imprevue', 'settings.create'),
      update = action('caisse-imprevue', 'settings.update'),
      data = { ...defaultSubscriptionCIValues, code: 'F' }
    await create.run(ctx(), create.schema.parse(data))
    expect(f.create).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'F',
        nominal: 120000,
        createdBy: 'ADMIN',
        updatedBy: 'ADMIN',
      }),
    )
    await expect(create.run(ctx(), { ...data, code: 'A' })).rejects.toThrow(
      'déjà utilisé',
    )
    await expect(update.run(ctx(), { ...data, code: 'F' })).rejects.toThrow(
      'ne peut pas être modifié',
    )
    await update.run(
      ctx(),
      update.schema.parse({
        ...data,
        code: 'A',
        label: '',
        nominal: 50000,
        durationInMonths: 5,
      }),
    )
    expect(f.update).toHaveBeenCalledWith(
      'S1',
      expect.objectContaining({
        code: 'A',
        label: '',
        nominal: 50000,
        durationInMonths: 5,
      }),
    )
    for (const invalid of [
      { supportMin: 50000, supportMax: 30000 },
      { amountPerMonth: 1.5 },
      { penaltyDelayDays: 31 },
      { durationInMonths: 13 },
    ])
      expect(create.schema.safeParse({ ...data, ...invalid }).success).toBe(
        false,
      )
    expect(update.fields.find((f) => f.key === 'label')).toMatchObject({
      keepEmpty: true,
    })
  })
  it('ne propose qu’une simulation par caisse et protège les suppressions selon les droits existants', async () => {
    for (const module of ['caisse-imprevue', 'caisse-speciale'] as const) {
      expect(
        settingsActions(module).filter((a) => a.id === 'simulation.standard'),
      ).toHaveLength(1)
      const remove = action(module, 'settings.delete')
      expect(remove.superAdminOnly).toBe(true)
      expect(remove.destructive).toBe(true)
      expect(remove.permission).toBe(
        module === 'caisse-speciale'
          ? 'caisseSpeciale.settings'
          : 'caisseImprevue.settings',
      )
      await remove.run(ctx(), { reason: 'Doublon de test' })
      expect(f.remove).toHaveBeenCalledWith('S1')
    }
  })
  it('filtre les vraies versions, conserve les statistiques globales et exporte les bonus et paliers lisibles', () => {
    const rows = [
      settingsRow('caisse-speciale', {
        id: 'S',
        caisseType: 'STANDARD',
        isActive: true,
        effectiveAt: '2026-11-01',
        createdAt: '2026-01-01',
        bonusTable: { M4: 4 },
        penaltyRules: { day4To12: { steps: [{ from: 1, to: 3, rate: 0.5 }] } },
      }),
      settingsRow('caisse-speciale', {
        id: 'J',
        caisseType: 'JOURNALIERE',
        isActive: false,
        effectiveAt: '2026-10-01',
        createdAt: '2026-02-01',
      }),
    ]
    expect(
      selectSettings(rows, {
        search: 'journaliere',
        status: 'INACTIVE',
        type: 'JOURNALIERE',
      }).map((r) => r.id),
    ).toEqual(['J'])
    expect(
      selectSettings(rows, { settingsSort: 'effective' }).map((r) => r.id),
    ).toEqual(['S', 'J'])
    expect(settingsOverview('caisse-speciale', rows)).toMatchObject({
      total: 2,
      active: 1,
    })
    expect(settingsExportRow('caisse-speciale', rows[0])).toMatchObject({
      'Type de caisse': 'Standard',
      'Bonus M4 (%)': 4,
      'Utilise des paliers': 'Oui',
      Paliers: 'J+4 à J+6 : 0.5 %/jour',
    })
  })
  it('résout les noms et emails des auteurs sans renvoyer leur profil complet', async () => {
    const row = await enrichSettingsAuthors(ctx().services, {
      id: 'S',
      createdBy: 'ADMIN',
      updatedBy: 'ADMIN',
    })
    expect(f.author).toHaveBeenCalledTimes(1)
    expect(row.createdByAdmin).toEqual({
      name: 'Alice TEST',
      email: 'alice@example.test',
    })
  })
})
