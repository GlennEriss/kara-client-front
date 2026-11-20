// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
const state = vi.hoisted(() => ({
  caller: vi.fn(),
  read: vi.fn(),
  amounts: true,
}))
vi.mock('@/firebase/adminFirestore', () => ({ adminFirestore: {} }))
vi.mock('../server/calendar-payouts', () => ({
  getMobileUpcomingPayouts: state.read,
}))
vi.mock('../server/access', async () => {
  const { NextResponse } = await import('next/server')
  return {
    requireMobileCaller: state.caller,
    mobileCapabilities: () => ({ amounts: state.amounts }),
    mobileJson: (body: unknown, status = 200) =>
      NextResponse.json(body, {
        status,
        headers: { 'Cache-Control': 'no-store, private' },
      }),
  }
})
import { GET } from '@/app/api/mobile/calendar/payouts/route'
const request = (query = 'module=caisse-speciale&horizonMonths=3') =>
  new NextRequest('http://localhost/api/mobile/calendar/payouts?' + query)
beforeEach(() => {
  vi.clearAllMocks()
  state.amounts = true
  state.caller.mockResolvedValue({ access: {} })
  state.read.mockResolvedValue([
    {
      key: 'cs-C1',
      product: 'Caisse Spéciale',
      kind: 'FINAL',
      contractId: 'C1',
      name: 'Marie Test',
      phone: 'private-phone',
      whatsappNumber: 'private-whatsapp',
      isGroup: false,
      typeLabel: 'Standard',
      amount: 12500,
      dueAt: new Date('2026-11-19T23:00:00Z'),
      referenceAt: new Date('2026-11-19T23:00:00Z'),
      daysUntil: -1,
      isProjected: false,
    },
  ])
})
describe('API de remises à venir native', () => {
  it('garde une remise échue et partielle, avec la date civile du Gabon', async () => {
    const response = await GET(request())
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store, private')
    expect(body.items).toEqual([
      expect.objectContaining({
        contractId: 'C1',
        amount: 12500,
        dueAt: '2026-11-20',
        daysUntil: -1,
        isProjected: false,
      }),
    ])
    expect(body.items[0]).not.toHaveProperty('phone')
    expect(body.items[0]).not.toHaveProperty('whatsappNumber')
  })
  it('masque les montants aux profils de calendrier sans droit sur les sommes', async () => {
    state.amounts = false
    expect((await (await GET(request())).json()).items[0].amount).toBeNull()
  })
  it('protège la lecture et valide le produit et l’horizon avant de lire la base', async () => {
    state.caller.mockResolvedValueOnce(
      NextResponse.json({ error: 'Authentification requise' }, { status: 401 }),
    )
    expect((await GET(request())).status).toBe(401)
    expect(
      (await GET(request('module=credit-speciale&horizonMonths=3'))).status,
    ).toBe(400)
    expect(
      (await GET(request('module=caisse-speciale&horizonMonths=99'))).status,
    ).toBe(400)
    expect(state.read).not.toHaveBeenCalled()
  })
  it('signale une erreur sans annoncer une liste vide de remises', async () => {
    state.read.mockRejectedValue(new Error('Lecture indisponible'))
    const response = await GET(request())
    expect(response.status).toBe(503)
    expect(await response.json()).not.toHaveProperty('items')
  })
})
