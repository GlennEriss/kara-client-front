// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { resolveAdminAccess } from '@/domains/auth/access-policy'
import {
  canReadNotification,
  notificationScopes,
  notificationTarget,
  publicNotification,
} from '../server/notification-policy'
import {
  getNotifications,
  markNotifications,
  saveNotificationDevice,
} from '../server/notifications'
import {
  canDeliverPush,
  pushMessage,
} from '../../../../functions/src/push/push-delivery'
const f = vi.hoisted(() => ({
  caller: vi.fn(),
  docs: new Map<string, Record<string, any>>(),
  devices: new Map<string, Record<string, any>>(),
  writes: [] as string[],
  fail: false,
}))
vi.mock('../server/access', async () => {
  const { NextResponse } = await import('next/server')
  return {
    requireMobileCaller: f.caller,
    mobileJson: (body: unknown, status = 200) =>
      NextResponse.json(body, {
        status,
        headers: { 'Cache-Control': 'no-store, private' },
      }),
  }
})
vi.mock('@/firebase/adminFirestore', () => {
  const ref = (map: Map<string, Record<string, any>>, id: string): any => ({
    id,
    get: async () => ({ id, exists: map.has(id), data: () => map.get(id) }),
    update: async (data: Record<string, any>) => {
      f.writes.push(id)
      map.set(id, { ...map.get(id), ...data })
    },
    _map: map,
  })
  return {
    adminFirestore: {
      collection: (name: string) => ({
        doc: (id: string) =>
          ref(name === 'notifications' ? f.docs : f.devices, id),
        where: () => ({
          limit: (limit: number) => ({
            get: async () => {
              if (f.fail) throw Error('offline')
              const docs = [...f.docs]
                .filter(([, d]) => d.isRead === false)
                .slice(0, limit)
                .map(([id, d]) => ({ id, data: () => d, ref: ref(f.docs, id) }))
              return { docs, size: docs.length }
            },
          }),
        }),
      }),
      batch: () => {
        const pending: (() => Promise<void>)[] = []
        return {
          update: (r: any, data: any) => pending.push(() => r.update(data)),
          commit: async () => Promise.all(pending.map((p) => p())),
        }
      },
      runTransaction: async (fn: (tx: any) => unknown) =>
        fn({
          get: (r: any) => r.get(),
          set: (r: any, data: any) => r._map.set(r.id, data),
          delete: (r: any) => r._map.delete(r.id),
        }),
    },
  }
})
const admin = resolveAdminAccess([{ role: 'SuperAdmin' }], {})
const vehicle = resolveAdminAccess([{ role: 'GestionnaireVehicules' }], {})
const row = (module = 'caisse_imprevue', extra = {}) => ({
  module,
  entityId: 'contract-A',
  type: 'payment_due',
  title: 'Versement attendu',
  message: 'Une échéance arrive.',
  isRead: false,
  createdAt: new Date('2026-11-18T09:00:00Z'),
  ...extra,
})
const request = (body?: unknown, query = '') =>
  new NextRequest(
    `http://localhost/api/mobile/notifications${query}`,
    body ? { method: 'POST', body: JSON.stringify(body) } : undefined,
  )
beforeEach(() => {
  vi.clearAllMocks()
  f.docs.clear()
  f.devices.clear()
  f.writes.length = 0
  f.fail = false
  f.caller.mockResolvedValue({
    claims: { uid: 'admin-A' },
    access: admin,
    mustChangePassword: false,
  })
})
describe('notifications natives et droits', () => {
  it('distingue les demandes et alertes fixe/aide regroupées sous credit_speciale', () => {
    const fixe = resolveAdminAccess(
      [
        {
          role: 'Admin',
          permissions: ['creditFixe.view'],
          permissionsVersion: 2,
        },
      ],
      {},
    )
    const demand = row('credit_speciale', {
      type: 'new_request',
      metadata: { creditType: 'FIXE', demandId: 'DF-A' },
    })
    expect(canReadNotification(fixe, demand)).toBe(true)
    expect(
      canReadNotification(
        fixe,
        row('credit_speciale', { metadata: { creditType: 'SPECIALE' } }),
      ),
    ).toBe(false)
    expect(notificationTarget(fixe, demand)).toEqual({
      screen: 'finance',
      module: 'credit-fixe',
      kind: 'demand',
      id: 'DF-A',
    })
    const aid = row('credit_speciale', {
      metadata: { creditType: 'AIDE', contractId: 'CA-A' },
    })
    expect(notificationTarget(admin, aid)).toMatchObject({
      module: 'caisse-aide',
      kind: 'contract',
      id: 'CA-A',
    })
    expect(publicNotification('A', aid, admin).module).toBe('credit_aide')
    expect(
      canDeliverPush(
        {
          platform: 'ios',
          notificationScopes: notificationScopes(fixe),
          expiresAt: new Date(Date.now() + 60000),
        },
        demand,
      ),
    ).toBe(true)
    expect(
      canDeliverPush(
        {
          platform: 'ios',
          notificationScopes: notificationScopes(fixe),
          expiresAt: new Date(Date.now() + 60000),
        },
        aid,
      ),
    ).toBe(false)
  })
  it('exclut les destinataires membres et restreint liste et cibles aux accès réels', () => {
    expect(
      canReadNotification(admin, row('vehicule', { recipientId: 'member-A' })),
    ).toBe(false)
    expect(canReadNotification(vehicle, row('vehicule'))).toBe(true)
    expect(canReadNotification(vehicle, row())).toBe(false)
    expect(notificationTarget(vehicle, row())).toBeNull()
    const requestsOnly = resolveAdminAccess(
      [
        {
          role: 'Admin',
          permissions: ['memberRequests.view'],
          permissionsVersion: 2,
        },
      ],
      {},
    )
    expect(
      canReadNotification(
        requestsOnly,
        row('memberships', { type: 'corrections_submitted' }),
      ),
    ).toBe(true)
    expect(
      notificationTarget(
        requestsOnly,
        row('memberships', { type: 'corrections_submitted' }),
      ),
    ).toMatchObject({ module: 'member-requests', dataset: 'requests' })
  })
  it('résout les demandes et les contrats sans URL libre ni opération automatique', () => {
    expect(
      notificationTarget(
        admin,
        row('caisse_imprevue', { metadata: { contractId: 'CI-A' } }),
      ),
    ).toEqual({
      screen: 'finance',
      module: 'caisse-imprevue',
      id: 'CI-A',
      kind: 'contract',
    })
    expect(
      notificationTarget(
        admin,
        row('caisse_speciale', {
          type: 'demand_approved',
          metadata: { demandId: 'CS-D' },
        }),
      ),
    ).toMatchObject({ id: 'CS-D', kind: 'demand' })
    expect(
      notificationTarget(
        admin,
        row('placement', {
          type: 'placement_demand_converted',
          metadata: { placementId: 'PL-A' },
        }),
      ),
    ).toMatchObject({ dataset: 'contracts', id: 'PL-A' })
    expect(
      notificationTarget(admin, row('vehicule', { type: 'vehicle_declared' })),
    ).toMatchObject({ section: 'vehicles', declarationView: 'pending' })
    expect(notificationTarget(admin, row('boutique'))).toMatchObject({
      section: 'shops',
      shopTab: 'pending',
    })
    expect(
      notificationTarget(
        admin,
        row('caisse_speciale', {
          entityId: 'https://evil.test',
          metadata: { url: 'https://evil.test' },
        }),
      ),
    ).toBeNull()
    expect(
      publicNotification(
        'A',
        row('memberships', {
          createdAt: undefined,
          metadata: { secret: 'hidden' },
        }),
        admin,
      ),
    ).not.toHaveProperty('metadata')
  })
  it('retourne le vrai compteur, les 50 plus récentes et garde les anciennes sans date', async () => {
    for (let n = 0; n < 55; n++) f.docs.set(`n-${n}`, row())
    f.docs.set('private', row('memberships', { recipientId: 'member-A' }))
    let response = await getNotifications(request())
    expect(response.headers.get('Cache-Control')).toContain('no-store')
    const result = await response.json()
    expect(result.unreadCount).toBe(55)
    expect(result.items).toHaveLength(50)
    f.docs.clear()
    f.docs.set('legacy', row('vehicule', { createdAt: undefined }))
    response = await getNotifications(request())
    expect((await response.json()).items[0].createdAt).toBeNull()
  })
  it('ne marque jamais les notifications membres ou les autres modules comme lus', async () => {
    f.docs.set('CI', row())
    f.docs.set('car', row('vehicule'))
    f.docs.set('private', row('vehicule', { recipientId: 'member-A' }))
    f.caller.mockResolvedValue({
      claims: { uid: 'agent' },
      access: vehicle,
      mustChangePassword: false,
    })
    expect(
      (await markNotifications(request({ action: 'read', id: 'CI' }))).status,
    ).toBe(404)
    expect(
      (await getNotifications(request(undefined, '?id=private'))).status,
    ).toBe(404)
    expect(
      (await markNotifications(request({ action: 'readAll' }))).status,
    ).toBe(200)
    expect(f.writes).toEqual(['car'])
    expect(f.docs.get('CI')?.isRead).toBe(false)
  })
  it('n’annonce pas une liste vide sur panne et bloque le mot de passe initial et les champs injectés', async () => {
    f.fail = true
    expect((await getNotifications(request())).status).toBe(503)
    expect(
      (
        await markNotifications(
          request({ action: 'read', id: 'A', isAdmin: true }),
        )
      ).status,
    ).toBe(422)
    f.caller.mockResolvedValue({
      claims: { uid: 'admin' },
      access: admin,
      mustChangePassword: true,
    })
    expect((await getNotifications(request())).status).toBe(403)
    f.caller.mockResolvedValue(
      NextResponse.json(
        { error: 'Authentification requise.' },
        { status: 401 },
      ),
    )
    expect(
      (await markNotifications(request({ action: 'readAll' }))).status,
    ).toBe(401)
  })
  it('enregistre seulement les droits serveur, mémorise le son et protège la propriété du téléphone', async () => {
    const token = 'fcm-native-token-for-test-1234'
    f.caller.mockResolvedValue({
      claims: { uid: 'agent' },
      access: vehicle,
      mustChangePassword: false,
    })
    expect(
      (
        await saveNotificationDevice(
          request({ token, platform: 'android', muted: true }),
        )
      ).status,
    ).toBe(200)
    expect(f.devices.get(token)).toMatchObject({
      uid: 'agent',
      audience: 'admin',
      notificationScopes: notificationScopes(vehicle),
      muted: true,
    })
    expect(f.devices.get(token)?.notificationScopes).not.toContain(
      'caisse_imprevue',
    )
    f.caller.mockResolvedValue({
      claims: { uid: 'other' },
      access: admin,
      mustChangePassword: false,
    })
    expect(
      (
        await saveNotificationDevice(
          request({ token, platform: 'android', muted: false }),
          true,
        )
      ).status,
    ).toBe(503)
    expect(f.devices.has(token)).toBe(true)
    f.caller.mockResolvedValue({
      claims: { uid: 'agent' },
      access: vehicle,
      mustChangePassword: false,
    })
    await saveNotificationDevice(
      request({ token, platform: 'android', muted: true }),
      true,
    )
    expect(f.devices.has(token)).toBe(false)
  })
  it('livre les push natifs selon les droits, expiration et son sans exposer de données en écran verrouillé', () => {
    const device = {
      platform: 'android',
      notificationScopes: ['vehicule'],
      muted: true,
      expiresAt: new Date(Date.now() + 60000),
    }
    expect(canDeliverPush(device, row())).toBe(false)
    expect(canDeliverPush(device, row('vehicule'))).toBe(true)
    expect(
      canDeliverPush({ ...device, expiresAt: new Date(0) }, row('vehicule')),
    ).toBe(false)
    const payload = pushMessage(
      'token',
      device,
      'notification-A',
      row('vehicule'),
    )
    expect(payload.android?.notification?.channelId).toBe('kara-silent')
    expect(payload.apns?.payload?.aps).not.toHaveProperty('sound')
    expect(payload.notification?.body).not.toContain('échéance')
    expect(payload.data?.notificationId).toBe('notification-A')
    expect(pushMessage('token', {}, 'N', row()).webpush?.fcmOptions?.link).toBe(
      '/notifications',
    )
  })
})
