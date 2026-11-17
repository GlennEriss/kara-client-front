import { beforeEach, describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'
const f = vi.hoisted(() => ({
  caller: {
    claims: { uid: 'admin' },
    access: {
      isSuperAdmin: true,
      permissions: [],
      permissionsDefined: true,
      restrictedRole: null,
    },
    mustChangePassword: false,
  },
  services: { db: {} },
  run: vi.fn().mockResolvedValue({ paymentId: 'p1' }),
  begin: vi.fn(),
  guard: vi.fn(),
}))
vi.mock('../server/authorization', () => ({
  requireFinanceCaller: vi.fn(async () => f.caller),
  canFinanceAction: vi.fn(() => true),
  guardFinanceTarget: vi.fn((...args) => f.guard(...args)),
  financePermissionPrefix: () => 'caisseSpeciale',
}))
vi.mock('../server/services', () => ({
  createFinanceServices: () => f.services,
}))
vi.mock('../server/documents', () => ({ validateFinanceFile: vi.fn() }))
vi.mock('../server/operations', () => ({
  FinanceRequestConflict: class extends Error {},
  financeFingerprint: vi.fn().mockResolvedValue('fingerprint'),
  beginFinanceOperation: vi.fn((...args) => f.begin(...args)),
  endFinanceOperation: vi.fn(),
}))
vi.mock('../registry', async () => {
  const { z } = await import('zod')
  return {
    financeActions: () => [
      {
        id: 'payment.create',
        label: 'Ajouter un paiement',
        scope: 'contract',
        permission: 'caisseSpeciale.payment',
        fields: [],
        schema: z.object({ amount: z.number().positive() }).strict(),
        run: (...args: any[]) => f.run(...args),
      },
    ],
  }
})
import { postFinanceAction } from '../server/gateway'
const request = (body: unknown) =>
  new NextRequest(
    'https://kara.example/api/mobile/finance/caisse-speciale/C1',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    },
  )
const input = {
  action: 'payment.create',
  operationId: '3190bd7a-8094-4a82-aa09-720cbf2ac569',
  payload: { amount: 1000 },
}
beforeEach(() => {
  vi.clearAllMocks()
  f.begin.mockResolvedValue({
    operation: { id: 'operation' },
    lock: { id: 'lock' },
    replay: true,
    result: { paymentId: 'p1' },
  })
})
describe('frontière HTTP des écritures financières', () => {
  it('ne renvoie pas un paiement existant dans une seconde écriture', async () => {
    const response = await postFinanceAction(
      request(input),
      'caisse-speciale',
      'C1',
    )
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      replay: true,
      result: { paymentId: 'p1' },
    })
    expect(f.run).not.toHaveBeenCalled()
  })
  it('refuse un montant invalide avant de réserver ou écrire', async () => {
    const response = await postFinanceAction(
      request({ ...input, payload: { amount: -100 } }),
      'caisse-speciale',
      'C1',
    )
    expect(response.status).toBe(422)
    expect(f.begin).not.toHaveBeenCalled()
    expect(f.run).not.toHaveBeenCalled()
  })
  it('rejette un acteur ou une cible injecté dans les données', async () => {
    const response = await postFinanceAction(
      request({
        ...input,
        payload: { amount: 1000, adminId: 'other', contractId: 'foreign' },
      }),
      'caisse-speciale',
      'C1',
    )
    expect(response.status).toBe(422)
    expect(f.run).not.toHaveBeenCalled()
  })
})
