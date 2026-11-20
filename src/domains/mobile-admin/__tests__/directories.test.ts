// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import {
  directoryRow,
  directoryRows,
  directoryOverview,
  filterDirectoryRows,
  directoryExportRow,
} from '../server/directory-presentation'
import {
  baseActions,
  actionSchema,
  publicAdminAction,
  type AdminContext,
} from '../server/registry'
import { directoryActions } from '../operations/directories'
import { getAdminModule } from '../catalog'
import { geographySearchText } from '@/domains/infrastructure/geography/utils/search-text'
const graph = {
  provinces: [
    { id: 'P', name: 'Estuaire', code: 'G1' },
    { id: 'P2', name: 'Woleu-Ntem', code: 'G9' },
  ],
  departments: [
    { id: 'D', name: 'Komo', provinceId: 'P' },
    { id: 'D2', name: 'Ntem', provinceId: 'P2' },
  ],
  communes: [
    { id: 'C', name: 'Centre', departmentId: 'D' },
    { id: 'C2', name: 'Centre', departmentId: 'D2' },
  ],
  districts: [{ id: 'A', name: '1er arrondissement', communeId: 'C' }],
  quarters: [{ id: 'Q', name: 'École', districtId: 'A' }],
}
const services = () =>
  ({
    db: {
      collection: (key: string) => ({
        limit: () => ({
          get: async () => ({
            size: (graph as any)[key].length,
            docs: (graph as any)[key].map((r: any) => ({
              id: r.id,
              data: () => r,
            })),
          }),
        }),
        count: () => ({
          get: async () => ({
            data: () => ({ count: key === 'companies' ? 51 : 49 }),
          }),
        }),
      }),
    },
  }) as any
const find = (module: string, dataset: string, id: string) => {
  const m = getAdminModule(module)!
  const d = m.datasets.find((d) => d.key === dataset)!
  return [...baseActions(m, d), ...directoryActions(m, d)].find(
    (a) => a.id === id,
  )!
}
describe('lot 7 journalisation et référentiels', () => {
  it('garde le journal en lecture seule, traduit les actions et filtre la journée du Gabon', async () => {
    const m = getAdminModule('journal')!
    expect(baseActions(m, m.datasets[0])).toEqual([])
    const rows = [
      directoryRow('journal', 'audit', {
        id: 'L1',
        action: 'create',
        module: 'members',
        adminId: 'ADMIN',
        adminName: 'Zoé',
        description: 'Membre créé',
        targetId: 'M1',
        createdAt: '2026-11-17T23:30:00Z',
      }),
      directoryRow('journal', 'audit', {
        id: 'L2',
        action: 'delete',
        module: 'members',
        adminId: 'ADMIN',
        adminName: 'Zoé',
        createdAt: '2026-11-17T10:00:00Z',
      }),
    ]
    expect(rows[0]).toMatchObject({
      actionLabel: 'Création',
      moduleLabel: 'Membres',
    })
    expect(
      filterDirectoryRows(
        rows,
        {
          search: 'zoe',
          action: 'create',
          module: 'members',
          from: '2026-11-18',
          to: '2026-11-18',
        },
        'journal',
      ).map((r) => r.id),
    ).toEqual(['L1'])
    expect(filterDirectoryRows(rows, { adminId: 'OTHER' }, 'journal')).toEqual(
      [],
    )
    expect(
      await directoryOverview(
        services(),
        'journal',
        rows,
        new Date('2026-11-18T10:00:00Z'),
      ),
    ).toMatchObject({
      total: 2,
      today: 1,
      admins: 1,
      deletions: 1,
      sampleLimit: 500,
    })
    expect(() =>
      filterDirectoryRows(
        rows,
        { from: '2026-11-19', to: '2026-11-18' },
        'journal',
      ),
    ).toThrow()
  })
  it('résout les cinq niveaux, les vrais enfants et les filtres d’ascendance sans confondre deux communes homonymes', async () => {
    const rows = await directoryRows(
      services(),
      'geography',
      'quarters',
      graph.quarters,
    )
    expect(rows[0]).toMatchObject({
      provinceId: 'P',
      provinceName: 'Estuaire',
      departmentId: 'D',
      communeId: 'C',
      districtId: 'A',
      childCount: 0,
      childDataset: null,
    })
    expect(
      filterDirectoryRows(
        rows,
        {
          provinceId: 'P',
          departmentId: 'D',
          communeId: 'C',
          districtId: 'A',
          search: 'ecole',
        },
        'geography',
      ),
    ).toHaveLength(1)
    expect(
      filterDirectoryRows(rows, { provinceId: 'P2' }, 'geography'),
    ).toEqual([])
    expect(
      directoryRow('geography', 'communes', graph.communes[0], graph),
    ).toMatchObject({ childCount: 1, childDataset: 'districts' })
    const overview = await directoryOverview(services(), 'geography', [])
    expect(overview.counts?.find((c) => c.key === 'quarters')?.value).toBe(1)
    expect((overview as any).hierarchy.communes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          value: 'C2',
          label: 'Centre',
          provinceId: 'P2',
          departmentId: 'D2',
          provinceName: 'Woleu-Ntem',
        }),
      ]),
    )
    expect(
      directoryRow(
        'geography',
        'districts',
        { id: 'bad', communeId: 'missing' },
        graph,
      ).communeName,
    ).toBe('Parent introuvable')
  })
  it('exporte des colonnes métier lisibles sans objets techniques et conserve les totaux globaux des référentiels', async () => {
    const row = directoryRow('journal', 'audit', {
      id: 'L',
      action: 'payment',
      module: 'members',
      createdAt: '2026-11-17T23:30:00Z',
      adminName: 'Alice',
      privatePayload: 'secret',
    })
    expect(directoryExportRow('journal', 'audit', row)).toMatchObject({
      Date: '2026-11-18',
      Heure: '00:30',
      Action: 'Paiement',
    })
    expect(directoryExportRow('journal', 'audit', row)).not.toHaveProperty(
      'privatePayload',
    )
    expect(
      directoryExportRow('references', 'companies', {
        name: 'KARA',
        address: { city: 'Libreville' },
      }),
    ).toMatchObject({ Nom: 'KARA', Ville: 'Libreville', Province: '' })
    expect(
      (await directoryOverview(services(), 'references', [])).counts?.map(
        (c) => c.value,
      ),
    ).toEqual([51, 49])
    expect(
      filterDirectoryRows(
        [
          { id: 'Z', name: 'École', industry: 'Santé' },
          { id: 'A', name: 'Alpha' },
        ],
        { search: 'sante' },
        'references',
      ).map((r) => r.id),
    ).toEqual(['Z'])
  })
  it('réutilise les schémas du site : nom de deux caractères, adresse et description facultatives, codes géographiques valides', () => {
    expect(
      actionSchema(find('references', 'companies', 'record.create')).safeParse({
        name: 'A',
      }).success,
    ).toBe(false)
    expect(
      actionSchema(find('references', 'companies', 'record.create')).parse({
        name: 'AB',
      }),
    ).toEqual({ name: 'AB' })
    expect(
      actionSchema(find('references', 'professions', 'record.create')).parse({
        name: 'Médecin',
      }),
    ).toEqual({ name: 'Médecin' })
    expect(
      actionSchema(find('geography', 'provinces', 'record.create')).safeParse({
        name: 'Estuaire',
        code: 'g-1',
      }).success,
    ).toBe(false)
    expect(
      actionSchema(find('geography', 'communes', 'record.update')).safeParse({
        name: 'Libreville',
        departmentId: 'D',
        postalCode: '?',
      }).success,
    ).toBe(false)
    const fields = publicAdminAction(
      find('references', 'companies', 'record.update'),
      { name: 'AB', industry: '', address: { city: '' } },
    ).fields
    expect(fields.find((f) => f.key === 'industry')).toMatchObject({
      keepEmpty: true,
      initial: '',
    })
  })
  it('délègue les créations, modifications, suppressions et créations en série aux services métier existants', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'NEW' }),
      update = vi.fn(),
      remove = vi.fn(),
      bulk = vi.fn().mockResolvedValue([{ id: 'A' }, { id: 'B' }])
    const context = {
      id: 'C',
      caller: { claims: { uid: 'ADMIN' } },
      services: {
        company: { create, update, delete: remove },
        geography: {
          createDistrictsBulk: bulk,
          updateCommune: update,
          deleteCommune: remove,
        },
      },
    } as unknown as AdminContext
    await find('references', 'companies', 'record.create').run(context, {
      name: 'KARA',
    })
    expect(create).toHaveBeenCalledWith({ name: 'KARA' }, 'ADMIN')
    await find('geography', 'communes', 'record.update').run(context, {
      name: 'Ville',
      departmentId: 'D',
    })
    expect(update).toHaveBeenCalledWith(
      'C',
      { name: 'Ville', departmentId: 'D' },
      'ADMIN',
    )
    await find('geography', 'communes', 'record.delete').run(context, {
      reason: 'Doublon',
    })
    expect(remove).toHaveBeenCalledWith('C')
    const a = find('geography', 'districts', 'district.bulk')
    expect(
      directoryActions(
        getAdminModule('geography')!,
        getAdminModule('geography')!.datasets[0],
      ),
    ).toEqual([])
    for (const count of [0, 51, 1.5])
      expect(actionSchema(a).safeParse({ communeId: 'C', count }).success).toBe(
        false,
      )
    expect(
      await a.run(context, actionSchema(a).parse({ communeId: 'C', count: 2 })),
    ).toEqual({ count: 2 })
    expect(bulk).toHaveBeenCalledWith('C', 2, 'ADMIN')
    bulk.mockRejectedValue(
      new Error('Cette commune a déjà des arrondissements.'),
    )
    await expect(a.run(context, { communeId: 'C', count: 2 })).rejects.toThrow(
      'déjà',
    )
  })
  it('garde la normalisation de recherche du site pour les écritures mobiles', () => {
    expect(geographySearchText('École du Centre', 'G1')).toBe(
      'ecole du centre g1',
    )
  })
})
