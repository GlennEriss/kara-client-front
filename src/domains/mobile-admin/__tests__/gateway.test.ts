import { beforeEach, describe, it, expect, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
const f = vi.hoisted(() => ({
  caller: {
    claims: { uid: 'admin-local', email: 'admin@example.test' },
    access: {
      isSuperAdmin: true,
      permissions: [] as string[],
      permissionsDefined: true,
      isAgent: false,
      restrictedRole: null,
    },
    mustChangePassword: false,
  },
  row: { status: 'Active', amount: 1000 },
  run: vi.fn(),
  begin: vi.fn(),
  end: vi.fn(),
  audit: vi.fn(),
  scope: 'contract',
  sensitive: false,
  readonly: false,
  fields: [] as any[],
}))
vi.mock('@/domains/mobile/server/access', () => ({
  requireMobileCaller: async () => f.caller,
  mobileJson: (body: unknown, status = 200) =>
    NextResponse.json(body, { status }),
}))
vi.mock('../server/context', () => ({
  createAdminServices: () => ({
    db: {
      collection: () => ({
        doc: () => ({
          get: async () => ({ exists: true, id: 'P1', data: () => f.row }),
        }),
      }),
    },
    audit: f.audit,
  }),
}))
vi.mock('../operations', () => ({
  adminActions: () => [
    {
      id: 'commission.pay',
      label: 'Payer la commission',
      permission: 'placements.commission',
      scope: f.scope,
      sensitiveResult: f.sensitive,
      readonly: f.readonly,
      fields: f.fields,
      schema: z
        .object({
          amount: z.number().positive(),
          identity: z.object({ proof: z.literal(true) }).optional(),
        })
        .strict(),
      run: f.run,
    },
  ],
}))
vi.mock('../server/read-model', () => ({
  plain: (value: unknown) => value,
  title: () => '',
  normalized: (value: string) => value,
  readRows: vi.fn(),
  relatedRows: vi.fn(),
}))
vi.mock('../server/storage-port', () => ({ validateAdminFile: vi.fn() }))
vi.mock('@/domains/finance/server/operations', () => ({
  FinanceRequestConflict: class extends Error {},
  financeFingerprint: vi.fn().mockResolvedValue('fingerprint'),
  beginFinanceOperation: (...args: any[]) => f.begin(...args),
  endFinanceOperation: (...args: any[]) => f.end(...args),
}))
import { postAdminAction, getAdminWorkspace } from '../server/gateway'
const body = {
  action: 'commission.pay',
  operationId: '3190bd7a-8094-4a82-aa09-720cbf2ac569',
  payload: { amount: 25000 },
}
const request = (input: unknown) =>
  new NextRequest(
    'http://localhost/api/mobile/admin/placements/P1?dataset=contracts',
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer test-token',
      },
      body: JSON.stringify(input),
    },
  )
beforeEach(() => {
  vi.clearAllMocks()
  f.caller.access.isSuperAdmin = true
  f.caller.access.permissions = []
  f.caller.mustChangePassword = false
  f.scope = 'contract'
  f.sensitive = false
  f.readonly = false
  f.fields = []
  f.begin.mockResolvedValue({
    operation: { id: 'op' },
    lock: { id: 'lock' },
    replay: false,
  })
  f.run.mockResolvedValue({ paymentId: 'payment' })
  f.audit.mockResolvedValue(undefined)
  f.end.mockResolvedValue(undefined)
})
describe('API natives des nouvelles sections', () => {
  it('refuse les droits insuffisants avant toute lecture ou écriture métier', async () => {
    f.caller.access.isSuperAdmin = false
    const res = await postAdminAction(request(body), 'placements', 'P1')
    expect(res.status).toBe(403)
    expect(f.begin).not.toHaveBeenCalled()
    expect(f.run).not.toHaveBeenCalled()
  })
  it('interdit les actions tant que le mot de passe personnel n’est pas choisi', async () => {
    f.caller.mustChangePassword = true
    expect(
      (await postAdminAction(request(body), 'placements', 'P1')).status,
    ).toBe(403)
    expect(f.run).not.toHaveBeenCalled()
  })
  it('rejette un montant invalide et un acteur injecté', async () => {
    for (const payload of [
      { amount: -1 },
      { amount: 25000, adminId: 'other' },
    ]) {
      const res = await postAdminAction(
        request({ ...body, payload }),
        'placements',
        'P1',
      )
      expect(res.status).toBe(422)
    }
    expect(f.begin).not.toHaveBeenCalled()
  })
  it('ne rejoue pas un paiement déjà traité', async () => {
    f.begin.mockResolvedValue({ replay: true, result: { paymentId: 'old' } })
    const res = await postAdminAction(request(body), 'placements', 'P1')
    expect(await res.json()).toMatchObject({
      replay: true,
      result: { paymentId: 'old' },
    })
    expect(f.run).not.toHaveBeenCalled()
  })
  it('conserve la cible et l’identité authentifiée dans le contexte métier', async () => {
    const res = await postAdminAction(request(body), 'placements', 'P1')
    expect(res.status).toBe(200)
    expect(f.run).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'P1',
        caller: f.caller,
        token: 'test-token',
        row: expect.objectContaining(f.row),
      }),
      { amount: 25000 },
    )
    expect(f.end).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      'DONE',
      { paymentId: 'payment' },
    )
  })
  it('ne conserve pas le PDF des identifiants dans le journal de rejeu', async () => {
    f.sensitive = true
    f.run.mockResolvedValue({
      documents: [{ base64: 'sensitive', filename: 'credentials.pdf' }],
    })
    const res = await postAdminAction(request(body), 'placements', 'P1')
    expect(res.status).toBe(200)
    expect(f.end).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      'DONE',
      { success: true },
    )
  })
  it('refuse un fichier requis manquant même dans un sous-formulaire', async () => {
    f.fields = [
      {
        key: 'identity',
        kind: 'fields',
        fields: [{ key: 'proof', kind: 'file', label: 'Justificatif' }],
      },
    ]
    const res = await postAdminAction(
      request({
        ...body,
        payload: { amount: 25000, identity: { proof: true } },
      }),
      'placements',
      'P1',
    )
    expect(res.status).toBe(400)
    expect(f.begin).not.toHaveBeenCalled()
    expect(f.run).not.toHaveBeenCalled()
  })
  it('refuse un identifiant de cible qui contient un chemin', async () => {
    expect(
      (await postAdminAction(request(body), 'placements', 'foreign/record'))
        .status,
    ).toBe(422)
    expect(f.run).not.toHaveBeenCalled()
  })
  it('renvoie une erreur explicite pour une section inconnue', async () => {
    const res = await getAdminWorkspace(
      new NextRequest('http://localhost/api/mobile/admin/unknown'),
      'unknown',
    )
    expect(res.status).toBe(404)
  })
})
