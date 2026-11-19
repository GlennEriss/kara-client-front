import { describe, it, expect, vi } from 'vitest'
import {
  archiveRows,
  archiveOverview,
  filterArchiveRows,
  archiveExportRow,
} from '../server/archive-presentation'
import { officialDocument } from '../server/official-documents'
import { documentActions } from '../operations/documents'
import { getAdminModule } from '../catalog'
import { actionSchema, type AdminContext } from '../server/registry'
import type { AdminServices } from '../server/context'
const payment = {
  id: 'P1',
  memberId: 'A',
  beneficiaryId: 'A',
  paymentType: 'UnexpectedFund',
  mode: 'cash',
  adminId: 'admin',
  amount: 10000,
  date: '2026-11-18T23:30:00Z',
  createdAt: '2026-11-17T10:00:00Z',
  updatedAt: '2026-11-19T09:00:00Z',
}
describe('historiques natifs du lot 5', () => {
  it('respecte le dossier du bénéficiaire et combine les filtres et dates civiles', () => {
    expect(filterArchiveRows([payment], {}, 'payment-history')).toEqual([])
    expect(
      filterArchiveRows(
        [payment],
        {
          memberId: 'A',
          paymentType: 'UnexpectedFund',
          mode: 'cash',
          adminId: 'admin',
          from: '2026-11-19',
          to: '2026-11-19',
          createdFrom: '2026-11-17',
          createdTo: '2026-11-17',
          updatedFrom: '2026-11-19',
          minAmount: 10000,
          maxAmount: 10000,
        },
        'payment-history',
      ),
    ).toEqual([payment])
    expect(
      filterArchiveRows([payment], { memberId: 'B' }, 'payment-history'),
    ).toEqual([])
    expect(() =>
      filterArchiveRows([payment], { from: '2026-02-31' }, 'payment-history'),
    ).toThrow('date valide')
    expect(() =>
      filterArchiveRows(
        [],
        { minAmount: 20, maxAmount: 10 },
        'payment-history',
      ),
    ).toThrow('minimum')
  })
  it('recherche les noms accentués et filtre les formats des documents avant pagination', () => {
    const row = {
      id: 'D',
      memberId: 'A',
      memberName: 'André Essono',
      format: 'image',
      type: 'ADHESION',
      displayName: 'Pièce signée',
      createdAt: '2026-11-18T22:30:00Z',
    }
    expect(
      filterArchiveRows(
        [row],
        {
          search: 'andre',
          fileFormat: 'image',
          type: 'ADHESION',
          memberId: 'A',
        },
        'contract-history',
      ),
    ).toEqual([row])
    expect(
      filterArchiveRows([row], { fileFormat: 'pdf' }, 'contract-history'),
    ).toEqual([])
  })
  it('borne explicitement les statistiques des paiements et garde le nombre complet', () => {
    const all = Array.from({ length: 502 }, (_, i) => ({
      ...payment,
      id: String(i),
    }))
    const result = archiveOverview('payment-history', all, all, {
      memberId: 'A',
    })
    expect(result).toMatchObject({
      total: 502,
      amount: 5000000,
      sampleCount: 500,
      limited: true,
    })
    expect(result.beneficiaries).toHaveLength(1)
    expect(archiveOverview('contract-history', [], [], {}).limited).toBe(false)
  })
  it('résout les noms des membres, demandes et auteurs sans transmettre leurs profils', async () => {
    const saved: Record<string, Record<string, unknown>> = {
      'users/A': {
        firstName: 'Alice',
        lastName: 'TEST',
        email: 'private@example.test',
      },
      'membership-requests/B': {
        identity: { firstName: 'Berthe', lastName: 'TEST' },
      },
      'admins/admin': { firstName: 'Admin', lastName: 'KARA' },
    }
    const getAll = vi.fn(async (...paths: string[]) =>
      paths.map((path) => ({
        id: path.split('/')[1],
        data: () => saved[path],
      })),
    )
    const services = {
      db: {
        collection: (name: string) => ({
          doc: (id: string) => `${name}/${id}`,
        }),
        getAll,
      },
    } as unknown as AdminServices
    const rows = await archiveRows(services, 'payment-history', [
      { ...payment, acceptedBy: 'admin' },
      {
        ...payment,
        id: 'P2',
        memberId: undefined,
        beneficiaryId: 'B',
        acceptedBy: 'admin',
      },
    ])
    expect(rows[0]).toMatchObject({
      beneficiaryName: 'Alice TEST',
      adminName: 'Admin KARA',
      typeLabel: 'Caisse imprévue',
    })
    expect(rows[1].beneficiaryName).toBe('Berthe TEST')
    expect(rows[0].email).toBeUndefined()
    expect(getAll.mock.calls.flat()).toEqual([
      'users/A',
      'users/B',
      'admins/admin',
      'membership-requests/B',
    ])
  })
  it('exporte des colonnes lisibles et des valeurs numériques, sans URL ni signature', () => {
    const row = archiveExportRow('contract-history', {
      displayName: 'Contrat signé',
      typeLabel: 'Adhésion',
      formatLabel: 'PDF',
      memberName: 'Alice',
      memberId: 'A',
      size: 120,
      url: 'https://private.test',
      secretaireSignature: 'secret',
      createdAt: '2026-11-18',
    })
    expect(row['Taille (octets)']).toBe(120)
    expect(Object.keys(row)).not.toContain('url')
    expect(JSON.stringify(row)).not.toContain('private.test')
  })
})
describe('documents institutionnels', () => {
  it('expose le texte canonique et les tables sans changer la publication sauvegardée', () => {
    const r = officialDocument('reglement-interieur', {
      lieu: 'Lieu publié',
      version: 'historique',
    })
    expect(r.lieu).toBe('Lieu publié')
    expect(r.version).toBe('historique')
    expect(r.textVersion).toBe('2026-01')
    expect(r.content.length).toBeGreaterThan(10)
    expect(r.tables.contributions?.rows.at(-1)?.[0]).toBe('Niveau E')
    expect(officialDocument('statuts').workContent.length).toBeGreaterThan(2)
  })
  it('autorise les champs d’adoption vides comme le site, et refuse les annexes dans la publication', () => {
    const actions = documentActions(getAdminModule('documents')!)
    expect(
      actionSchema(actions[0]).safeParse({ avecAnnexes: true }).success,
    ).toBe(true)
    expect(actionSchema(actions[1]).safeParse({}).success).toBe(true)
    expect(
      actionSchema(actions[1]).safeParse({ avecAnnexes: true }).success,
    ).toBe(false)
  })
  it('publie la bonne version et permet d’effacer une signature existante sans modifier l’autre', async () => {
    const publierDocument = vi.fn(async () => {})
    const ctx = {
      id: 'statuts',
      row: {
        secretaireSignature: 'old-secretary',
        conseillerSignature: 'old-adviser',
      },
      files: {},
      caller: { claims: { uid: 'ADMIN' } },
      services: { publications: { publierDocument } },
    } as unknown as AdminContext
    const publish = documentActions(getAdminModule('documents')!)[1]
    await publish.run(ctx, {
      lieu: '',
      date: '',
      clearsecretaireSignature: true,
    })
    expect(publierDocument).toHaveBeenCalledWith(
      'statuts',
      expect.objectContaining({
        lieu: '',
        date: '',
        secretaireSignature: null,
        conseillerSignature: 'old-adviser',
      }),
      '2026-01',
      'ADMIN',
    )
  })
})
