// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  staffRow,
  filterStaffRows,
  staffOverview,
  staffExportRow,
} from '../server/staff-presentation'
import { callLogSummary } from '@/utils/call-log-summary'
import { administrationActions } from '../operations/administration'
import { communityActions } from '../operations/community'
import { actionSchema, type AdminContext } from '../server/registry'
import { getAdminModule } from '../catalog'
import { resolveAdminAccess } from '@/domains/auth/access-policy'
const f = vi.hoisted(() => ({
  account: vi.fn(),
  remove: vi.fn(),
  update: vi.fn(),
  contact: vi.fn(),
  log: vi.fn(),
  plan: vi.fn(),
}))
vi.mock('@/app/api/firebase/auth/delete-user/route', () => ({
  POST: f.account,
}))
vi.mock('@/app/api/auth/create-admin/by-email/route', () => ({
  POST: f.account,
}))
vi.mock('@/app/api/auth/update-admin/route', () => ({ POST: f.account }))
vi.mock('@/app/api/auth/admin/reset-admin-password/route', () => ({
  POST: f.account,
}))
const now = new Date('2026-11-18T12:00:00Z'),
  access = resolveAdminAccess([{ role: 'SuperAdmin' }], {})
const ctx = () =>
  ({
    id: 'A',
    row: {
      id: 'A',
      personKey: 'member:M',
      memberId: 'M',
      name: 'Alice TEST',
      totalOverdue: 3000,
    },
    files: {},
    caller: { claims: { uid: 'ADMIN' }, access },
    services: {
      adminAccounts: { deleteAdmin: f.remove, updateAdmin: f.update },
      agents: { updateAgent: f.update },
      callLogs: { createCallLog: f.log },
      callPlans: { createCallPlanBatch: f.plan },
      db: {
        collection: () => ({
          doc: () => ({
            set: f.contact,
            get: async () => ({ data: () => ({}) }),
          }),
        }),
      },
    },
  }) as unknown as AdminContext
const action = (key: string, id: string, dataset = 0) => {
  const m = getAdminModule(key)!
  return [
    ...administrationActions(m, m.datasets[dataset]),
    ...communityActions(m, m.datasets[dataset]),
  ].find((a) => a.id === id)!
}
beforeEach(() => {
  vi.clearAllMocks()
  f.account.mockImplementation(async () => Response.json({ success: true }))
  f.remove.mockResolvedValue(true)
  f.update.mockResolvedValue(true)
  f.log.mockResolvedValue('LOG-A')
  f.plan.mockResolvedValue(1)
})
describe('lot 6 administration, agents et relances', () => {
  it('préserve les anciens rôles multiples sur une modification de profil et envoie les permissions au service existant', async () => {
    const a = action('admins', 'admin.update'),
      context = ctx()
    context.row.roles = ['Admin', 'SuperAdmin']
    const values = {
      civility: 'Monsieur',
      lastName: 'TEST',
      firstName: 'Alice',
      birthDate: '1990-01-01',
      gender: 'Femme',
      email: 'alice@example.test',
      phone: '+24177111111',
      role: 'Admin',
      permissions: [{ permission: 'calendar.view' }],
    }
    await a.run(context, actionSchema(a).parse(values))
    expect(f.update).toHaveBeenCalledWith(
      'A',
      expect.objectContaining({
        roles: ['Admin', 'SuperAdmin'],
        permissions: [],
      }),
    )
    const body = await f.account.mock.calls[0][0].json()
    expect(body.role).toBe('SuperAdmin')
    context.row.roles = ['Admin']
    f.update.mockClear()
    await a.run(context, actionSchema(a).parse(values))
    expect(f.update).toHaveBeenCalledWith(
      'A',
      expect.objectContaining({
        roles: ['Admin'],
        permissions: ['calendar.view'],
      }),
    )
  })
  it('présente les rôles, données anciennes et dates agents sans valeurs techniques', () => {
    expect(
      staffRow('admins', {
        id: 'A',
        role: 'Secretary',
        firstName: 'Alice',
        lastName: 'TEST',
      }),
    ).toMatchObject({
      displayName: 'Alice TEST',
      roleLabels: ['Secrétaire'],
      isActive: true,
    })
    const row = staffRow(
      'agents',
      {
        id: 'A',
        nom: 'TEST',
        prenom: 'Alice',
        sexe: 'F',
        dateNaissance: '1998-11-18',
        pieceIdentite: { dateExpiration: '2026-11-25' },
      },
      now,
    )
    expect(row).toMatchObject({
      age: 28,
      birthdayToday: true,
      birthdayMonth: true,
      identityStatus: 'expiring',
      identityDays: 7,
    })
    expect(
      staffRow(
        'agents',
        { pieceIdentite: { dateExpiration: '2026-01-01' } },
        now,
      ).identityStatus,
    ).toBe('expired')
    expect(staffRow('agents', { dateNaissance: 'bad' }, now).age).toBeNull()
  })
  it('combine les filtres, garde les anniversaires actifs et trie les noms', () => {
    const rows = [
      staffRow(
        'agents',
        {
          id: 'A',
          nom: 'Éléonore',
          prenom: 'Zoé',
          actif: true,
          dateNaissance: '1998-11-18',
        },
        now,
      ),
      staffRow(
        'agents',
        { id: 'B', nom: 'Alice', actif: false, dateNaissance: '1999-11-01' },
        now,
      ),
    ]
    expect(
      filterStaffRows(rows, { agentTab: 'birthdays' }, 'agents').map(
        (r) => r.id,
      ),
    ).toEqual(['A'])
    expect(
      filterStaffRows(rows, { search: 'eleonore', isActive: 'true' }, 'agents'),
    ).toHaveLength(1)
    expect(
      filterStaffRows(rows, { staffSort: 'nameAsc' }, 'agents').map(
        (r) => r.id,
      ),
    ).toEqual(['B', 'A'])
    expect(
      filterStaffRows(
        [staffRow('admins', { id: 'X', roles: ['Admin', 'SuperAdmin'] })],
        { staffRole: 'SuperAdmin' },
        'admins',
      ),
    ).toHaveLength(1)
  })
  it('calcule les appels joints, promesses et règlement ultérieur comme le site, même hors filtre', () => {
    const log = (id: string, extra: any = {}) => ({
      id,
      personKey: 'M',
      adminName: 'Alice',
      channel: 'call',
      outcome: 'promesse_paiement',
      createdAt: new Date('2026-11-01'),
      promiseToPayAt: new Date('2026-11-02'),
      promiseAmount: 1200,
      totalOverdue: 3000,
      ...extra,
    })
    const promise = log('P'),
      whatsapp = log('W', {
        personKey: 'W',
        channel: 'whatsapp',
        outcome: 'message_envoye',
      }),
      missed = log('U', { outcome: 'injoignable' })
    expect(
      callLogSummary(
        [promise, whatsapp, missed] as any,
        [promise, whatsapp, missed] as any,
        +now,
      ),
    ).toMatchObject({
      calls: 2,
      reachRate: 50,
      brokenPromises: 1,
      brokenAmount: 1200,
    })
    const paid = log('DONE', {
      outcome: 'paiement_effectue',
      createdAt: new Date('2026-11-03'),
    })
    expect(
      callLogSummary([promise] as any, [promise, paid] as any, +now)
        .brokenPromises,
    ).toBe(0)
  })
  it('retourne les vraies métadonnées et protège les coordonnées publiques selon droits', async () => {
    const context = ctx()
    const o = await staffOverview(
      context.services,
      context.caller,
      'admins',
      'admins',
      [staffRow('admins', { id: 'A', roles: ['Admin'], isActive: true })],
      [],
    )
    expect(o).toMatchObject({
      total: 1,
      active: 1,
      publicContact: { memberWhatsappNumber: '+24174369729' },
    })
    expect(
      (o as any).permissionGroups.some((g: any) => g.key === 'calendar'),
    ).toBe(true)
    expect(
      (
        (await staffOverview(
          context.services,
          {
            ...context.caller,
            access: {
              ...access,
              isSuperAdmin: false,
              permissionsDefined: true,
              permissions: ['admins.view'],
            },
          },
          'admins',
          'admins',
          [],
          [],
        )) as any
      ).publicContact,
    ).toBeNull()
  })
  it('exporte des colonnes lisibles avec un montant numérique et sans fuite de données', () => {
    const row = staffExportRow(
      'calls',
      staffRow('calls', {
        createdAt: '2026-11-17T23:30:00Z',
        name: 'Alice',
        channel: 'whatsapp',
        outcome: 'message_envoye',
        totalOverdue: 5000,
        secret: 'hidden',
      }),
    )
    expect(row).toMatchObject({
      Date: '2026-11-18',
      Heure: '00:30',
      Canal: 'WhatsApp',
      Issue: 'Message envoyé',
      'Montant dû (FCFA)': 5000,
    })
    expect(row).not.toHaveProperty('secret')
  })
  it('supprime Auth puis la fiche avec le service existant ; protège le compte courant et les pannes', async () => {
    const a = action('admins', 'admin.delete'),
      context = ctx()
    expect(a.superAdminOnly).toBe(true)
    await a.run(context, { reason: 'Compte de test' })
    expect(f.account).toHaveBeenCalledOnce()
    expect(f.remove).toHaveBeenCalledWith('A')
    context.id = 'ADMIN'
    await expect(a.run(context, {})).rejects.toThrow('propre compte')
    f.remove.mockClear()
    context.id = 'OTHER'
    f.account.mockResolvedValue(
      Response.json({ error: 'Auth indisponible' }, { status: 503 }),
    )
    await expect(a.run(context, {})).rejects.toThrow('Auth indisponible')
    expect(f.remove).not.toHaveBeenCalled()
  })
  it('normalise les deux contacts publics et conserve les autres réglages', async () => {
    const a = action('admins', 'admin.public-contact.update')
    await a.run(ctx(), {
      memberWhatsappNumber: '+241 74 36 97 29',
      guestWhatsappNumber: '+24177111111',
    })
    expect(f.contact).toHaveBeenCalledWith(
      expect.objectContaining({
        memberWhatsappNumber: '+24174369729',
        guestWhatsappNumber: '+24177111111',
        updatedBy: 'ADMIN',
      }),
      { merge: true },
    )
    await expect(
      a.run(ctx(), { memberWhatsappNumber: '1', guestWhatsappNumber: '2' }),
    ).rejects.toThrow('numéros')
  })
  it('exige un compte rendu et une date promise, sans inventer de promesse pour les autres issues', async () => {
    const a = action('calls', 'call.record')
    expect(
      actionSchema(a).safeParse({
        channel: 'call',
        outcome: 'injoignable',
        summary: 'ab',
      }).success,
    ).toBe(false)
    await expect(
      a.run(ctx(), {
        outcome: 'promesse_paiement',
        summary: 'Relance téléphonique',
      }),
    ).rejects.toThrow('date promise')
    await a.run(ctx(), {
      outcome: 'injoignable',
      channel: 'call',
      summary: 'Pas de réponse',
      promiseDate: '2027-01-01',
      promiseAmount: 5000,
    })
    expect(f.log).toHaveBeenCalledWith(
      expect.objectContaining({
        promiseToPayAt: undefined,
        promiseAmount: undefined,
      }),
    )
    await a.run(ctx(), {
      outcome: 'promesse_paiement',
      summary: 'Promesse confirmée',
      promiseDate: '2027-01-01',
      schedulePromise: true,
    })
    expect(f.plan).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceCallLogId: 'LOG-A',
        scheduledDate: '2027-01-01',
        createdById: 'ADMIN',
      }),
    )
  })
})
