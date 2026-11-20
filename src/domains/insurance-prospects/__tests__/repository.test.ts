import { beforeEach, describe, expect, it } from 'vitest'
import { InsuranceProspectRepository } from '../repository'
import { KARA_SPONSOR_ID, prospectSchema } from '../model'

const input = {
  ownerName: 'Contact fictif',
  phone: '077000000',
  plateNumber: 'AB-123-CD',
  vehicleType: 'car' as const,
  city: 'Libreville',
  quarterId: 'Q1',
  locationType: 'quarter' as const,
  quarter: 'Awendjé',
  insuranceCompany: 'Assureur externe',
  endDate: '2026-12-20',
}
function memory() {
  const data = new Map<string, Record<string, any>>()
  let serial = 0
  const path = (parent: any, segments: string[]) =>
    [parent?.path, ...segments].filter(Boolean).join('/')
  const ref = (p: string) => ({ path: p, id: p.split('/').at(-1) })
  const snap = (r: any) => ({
    id: r.id,
    exists: () => data.has(r.path),
    data: () => data.get(r.path),
  })
  const scope = () => {
    const operations: (() => void)[] = []
    const tx = {
      get: async (r: any) => snap(r),
      set: (r: any, value: any) => {
        operations.push(() => data.set(r.path, value))
        return tx
      },
      update: (r: any, value: any) => {
        operations.push(() =>
          data.set(r.path, { ...data.get(r.path), ...value }),
        )
        return tx
      },
      commit: async () => {
        operations.forEach((op) => op())
      },
    }
    return tx
  }
  const f = {
    db: {},
    collection: (p: any, ...s: string[]) => ref(path(p, s)),
    doc: (p: any, ...s: string[]) =>
      ref(path(p, s.length ? s : [`generated-${++serial}`])),
    getDoc: async (r: any) => snap(r),
    serverTimestamp: () => 'NOW',
    writeBatch: () => scope(),
    runTransaction: async (_db: any, fn: any) => {
      const tx = scope()
      await fn(tx)
      await tx.commit()
    },
    addDoc: async (p: any, value: any) => {
      const r = ref(`${p.path}/generated-${++serial}`)
      data.set(r.path, value)
      return r
    },
  }
  return {
    data,
    repository: new InsuranceProspectRepository(async () => f as never),
  }
}
describe('droits et transitions de prospection', () => {
  let store: ReturnType<typeof memory>
  const member = {
    id: 'alice',
    memberId: 'M001',
    name: 'Membre fictif',
    admin: false,
  }
  const admin = { id: 'manager', name: 'Administration', admin: true }
  beforeEach(() => {
    store = memory()
    store.data.set('quarters/Q1', { name: 'Awendjé', districtId: 'D1' });
    store.data.set('districts/D1', { name: '3e', communeId: 'C1' });
    store.data.set('communes/C1', { name: 'Libreville', departmentId: 'DEP1' });
    store.data.set('departments/DEP1', { name: 'Komo-Mondah', provinceId: 'P1' });
    store.data.set('provinces/P1', { name: 'Estuaire' });

    store.data.set('insurance-prospects/p1', {
      ...prospectSchema.parse(input),
      status: 'tracking',
      sponsorMemberId: 'M001',
      sponsorName: 'Membre fictif',
    })
    store.data.set('users/M002', { firstName: 'Autre', lastName: 'Membre' })
  })
  it('attribue au membre sa propre prospection et ignore une attribution injectée', async () => {
    const id = await store.repository.create(input, 'M002', member)
    expect(store.data.get(`insurance-prospects/${id}`)).toMatchObject({
      sponsorMemberId: 'M001',
      status: 'tracking',
      source: 'member',
      createdBy: 'alice',
    })
  })
  it('permet à l’administration une attribution LE KARA ou à un membre existant', async () => {
    const id = await store.repository.create(input, '', admin)
    expect(store.data.get(`insurance-prospects/${id}`)).toMatchObject({
      sponsorMemberId: KARA_SPONSOR_ID,
      sponsorName: 'LE KARA — Inconnu',
    })
    await store.repository.change('p1', admin, 'assign', {
      sponsorMemberId: 'M002',
      note: 'Attribution test',
    })
    expect(store.data.get('insurance-prospects/p1')).toMatchObject({
      sponsorMemberId: 'M002',
      sponsorName: 'Autre Membre',
    })
  })
  it('refuse la consultation métier d’un autre parrain et les attributions ou conversions par un membre', async () => {
    await expect(
      store.repository.change(
        'p1',
        { ...member, memberId: 'M002' },
        'contacted',
        { note: 'Appel test' },
      ),
    ).rejects.toThrow('Accès refusé')
    await expect(
      store.repository.change('p1', member, 'assign', {
        note: 'Attribution test',
      }),
    ).rejects.toThrow('réservée')
    await expect(
      store.repository.change('p1', member, 'converted', {
        note: 'Conversion test',
      }),
    ).rejects.toThrow('réservée')
  })
  it('enregistre une relance puis une demande sans créer d’assurance', async () => {
    await store.repository.change('p1', member, 'contacted', {
      note: 'Contact appelé',
      followUpDate: '2026-12-01',
    })
    await store.repository.change('p1', member, 'quote_requested', {
      note: 'Souhaite un devis',
    })
    expect(store.data.get('insurance-prospects/p1')).toMatchObject({
      status: 'quote_requested',
    })
    expect(
      [...store.data.keys()].some((k) => k.startsWith('vehicle-insurances/')),
    ).toBe(false)
    expect(
      [...store.data.keys()].filter((k) => k.includes('/activities/')),
    ).toHaveLength(2)
  })
  it('conserve l’ancienne échéance dans l’historique lors d’un renouvellement ailleurs', async () => {
    await expect(
      store.repository.change('p1', member, 'renewed_elsewhere', {
        note: 'Renouvellement',
        endDate: '2026-12-19',
        insuranceCompany: 'Autre',
      }),
    ).rejects.toThrow('suivre')
    await store.repository.change('p1', member, 'renewed_elsewhere', {
      note: 'Renouvellement',
      endDate: '2027-06-20',
      insuranceCompany: 'Autre assureur',
    })
    expect(store.data.get('insurance-prospects/p1')).toMatchObject({
      status: 'tracking',
      endDate: '2027-06-20',
    })
    expect(
      [...store.data.entries()].find(([k]) => k.includes('/activities/'))?.[1],
    ).toMatchObject({ previousEndDate: '2026-12-20', endDate: '2027-06-20' })
  })
  it.each([
    { declarationStatus: 'pending' },
    { endDate: '2025-12-20' },
    { plateNumber: 'AUTRE' },
    { sponsorMemberId: 'M002' },
    { prospectId: 'other' },
  ])(
    'refuse une assurance incorrecte sans modifier le prospect : %j',
    async (patch) => {
      store.data.set('vehicle-insurances/i1', {
        plateNumber: 'AB123CD',
        sponsorMemberId: 'M001',
        endDate: '2027-12-20',
        ...patch,
      })
      await expect(
        store.repository.change('p1', admin, 'converted', {
          insuranceId: 'i1',
          note: 'Conversion test',
        }),
      ).rejects.toThrow('correspondre')
      expect(store.data.get('insurance-prospects/p1')?.status).toBe('tracking')
    },
  )
  it('rattache atomiquement la vraie assurance au prospect et bloque les modifications après clôture', async () => {
    store.data.set('vehicle-insurances/i1', {
      plateNumber: 'AB123CD',
      sponsorMemberId: 'M001',
      endDate: '2027-12-20',
      declarationStatus: 'validated',
    })
    await store.repository.change('p1', admin, 'converted', {
      insuranceId: 'i1',
      note: 'Assurance enregistrée',
    })
    expect(store.data.get('insurance-prospects/p1')).toMatchObject({
      status: 'converted',
      insuranceId: 'i1',
    })
    expect(store.data.get('vehicle-insurances/i1')).toMatchObject({
      prospectId: 'p1',
    })
    await expect(
      store.repository.change('p1', admin, 'contacted', { note: 'Appel test' }),
    ).rejects.toThrow('clôturé')
  })
})
