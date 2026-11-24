// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
const f = vi.hoisted(() => ({
  queries: [] as string[],
  send: vi.fn(),
  deleted: [] as string[],
}))
const fake = {
  apps: [{}],
  initializeApp: vi.fn(),
  firestore: () => ({
    collection: (name: string) => ({
      where: (field: string, _operator: string, value: string) => ({
        get: async () => {
          f.queries.push(`${name}:${field}:${value}`)
          const rows =
            name === 'memberMobileDevices'
              ? [
                  {
                    id: 'native-member',
                    audience: 'member',
                    platform: 'android',
                    notificationScopes: ['*'],
                    expiresAt: new Date('2099-01-01'),
                  },
                ]
              : [
                  {
                    id: value === 'admin' ? 'admin-token' : 'web-member',
                    audience: value === 'admin' ? 'admin' : 'member',
                  },
                ]
          return {
            docs: rows.map((row) => ({
              id: row.id,
              data: () => row,
              ref: {
                delete: async () => {
                  f.deleted.push(`${name}/${row.id}`)
                },
              },
            })),
          }
        },
      }),
    }),
  }),
  messaging: () => ({ sendEach: f.send }),
}
import { deliverPushForNotification } from '../../../../functions/src/push/deliver-notification'
const sendPushForNotification = (
  id: string,
  data: Parameters<typeof deliverPushForNotification>[3],
) =>
  deliverPushForNotification(
    fake.firestore() as any,
    fake.messaging() as any,
    id,
    data,
  )
beforeEach(() => {
  vi.clearAllMocks()
  f.queries = []
  f.deleted = []
  f.send.mockImplementation(async (messages: any[]) => ({
    successCount: messages.length,
    responses: messages.map(() => ({ success: true })),
  }))
})
describe('livraison push native membre', () => {
  it('cherche uniquement les appareils du destinataire et garde un message système sans donnée sensible', async () => {
    await sendPushForNotification('N1', {
      recipientId: 'OWN',
      title: 'Solde privé',
      message: 'Montant privé',
      module: 'caisse_speciale',
    })
    expect(f.queries).toEqual([
      'fcmTokens:memberIds:OWN',
      'memberMobileDevices:memberIds:OWN',
    ])
    const messages = f.send.mock.calls[0][0]
    expect(messages.map((m: any) => m.token)).toEqual([
      'web-member',
      'native-member',
    ])
    expect(messages[1]).toMatchObject({
      notification: { title: 'LE KARA' },
      data: { audience: 'member', notificationId: 'N1' },
    })
    expect(JSON.stringify(messages[1])).not.toContain('Montant privé')
  })
  it('n’envoie jamais une notification admin aux appareils de la collection membre', async () => {
    await sendPushForNotification('ADMIN', { module: 'memberships' })
    expect(f.queries).toEqual(['fcmTokens:audience:admin'])
    expect(f.send.mock.calls[0][0].map((m: any) => m.token)).toEqual([
      'admin-token',
    ])
  })
  it('retire le placement du push membre tout en conservant les alertes admin', async () => {
    await sendPushForNotification('PLACEMENT', { module: 'placement', recipientId: 'OWN' })
    expect(f.send).not.toHaveBeenCalled()
    await sendPushForNotification('ADMIN', { module: 'placement' })
    expect(f.queries).toEqual(['fcmTokens:audience:admin'])
  })
  it('supprime un jeton invalide dans sa collection d’origine', async () => {
    f.send.mockResolvedValue({
      successCount: 1,
      responses: [
        { success: true },
        {
          success: false,
          error: { code: 'messaging/registration-token-not-registered' },
        },
      ],
    })
    await sendPushForNotification('N1', { recipientId: 'OWN' })
    expect(f.deleted).toEqual(['memberMobileDevices/native-member'])
  })
})
