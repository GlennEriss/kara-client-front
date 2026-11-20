import type { Message } from 'firebase-admin/messaging'
export interface PushNotificationData {
  title?: string
  message?: string
  module?: string
  type?: string
  entityId?: string
  recipientId?: unknown
  metadata?: { requestId?: unknown; creditType?: unknown }
}
export interface PushDevice {
  platform?: string
  notificationScopes?: string[]
  muted?: boolean
  expiresAt?: { toDate?: () => Date } | Date
}
export function canDeliverPush(
  device: PushDevice,
  data: PushNotificationData,
  now = new Date(),
) {
  if (!['android', 'ios'].includes(device.platform || '')) return true // Existing web registrations.
  const expires =
    device.expiresAt instanceof Date
      ? device.expiresAt
      : device.expiresAt?.toDate?.()
  if (!expires || expires.getTime() <= now.getTime()) return false
  const request =
    data.module === 'memberships' &&
    (!!data.metadata?.requestId ||
      /^(new_request|corrections_|security_code_|membership_)/.test(
        data.type || '',
      ))
  const scope =
    data.type === 'birthday_reminder'
      ? 'birthdays'
      : request
        ? 'member-requests'
        : data.module === 'credit_speciale' &&
            data.metadata?.creditType === 'FIXE'
          ? 'credit_fixe'
          : data.module === 'credit_speciale' &&
              data.metadata?.creditType === 'AIDE'
            ? 'credit_aide'
            : data.module
  return !!device.notificationScopes?.some((s) => s === '*' || s === scope)
}
export function pushMessage(
  token: string,
  device: PushDevice,
  notificationId: string,
  data: PushNotificationData,
): Message {
  const native = ['android', 'ios'].includes(device.platform || '')
  return {
    token,
    notification: {
      title: native ? 'LE KARA' : data.title || 'LE KARA',
      body: native
        ? 'Une nouvelle notification est disponible dans votre espace.'
        : data.message || '',
    },
    data: {
      notificationId,
      module: String(data.module || ''),
      entityId: String(data.entityId || ''),
      audience:
        typeof data.recipientId === 'string' && data.recipientId.length
          ? 'member'
          : 'admin',
    },
    ...(native
      ? {
          android: {
            notification: {
              channelId: device.muted ? 'kara-silent' : 'kara-alerts',
              ...(device.muted ? {} : { sound: 'default' }),
            },
          },
          apns: { payload: { aps: device.muted ? {} : { sound: 'default' } } },
        }
      : {
          webpush: {
            notification: { icon: '/icon-192.png', badge: '/icon-192.png' },
            fcmOptions: { link: '/notifications' },
          },
        }),
  }
}
