import type { Firestore } from 'firebase-admin/firestore'
import { FieldValue } from 'firebase-admin/firestore'
import { z } from 'zod'
import type { MemberCaller, MemberData } from './access'
import { iso, memberIds, MemberError } from './data'

const identifier = z
  .string()
  .min(1)
  .max(240)
  .regex(/^[^/\\]+$/)
export const memberNotificationMutation = z.discriminatedUnion('action', [
  z.object({ action: z.literal('read'), id: identifier }).strict(),
  z.object({ action: z.literal('readAll') }).strict(),
])
const deviceSchema = z
  .object({
    token: z
      .string()
      .min(20)
      .max(1500)
      .regex(/^[A-Za-z0-9_:.-]+$/),
    platform: z.enum(['android', 'ios']),
    muted: z.boolean(),
  })
  .strict()
function presentation(id: string, data: MemberData) {
  return {
    id,
    module: typeof data.module === 'string' ? data.module : 'memberships',
    type: typeof data.type === 'string' ? data.type : 'reminder',
    title: typeof data.title === 'string' ? data.title : 'Notification LE KARA',
    message: typeof data.message === 'string' ? data.message : '',
    isRead: data.isRead === true,
    createdAt: iso(data.createdAt) || null,
    daysUntil: null,
    target: null,
  }
}
export async function memberNotificationInbox(
  db: Firestore,
  caller: MemberCaller,
  id?: string | null,
) {
  if (id) {
    const snapshot = await db
        .collection('notifications')
        .doc(identifier.parse(id))
        .get(),
      data = snapshot.data()
    if (!data || !memberIds(caller).includes(data.recipientId))
      throw new MemberError('Notification introuvable.', 404)
    return { item: presentation(id, data) }
  }
  const snapshot = await db
    .collection('notifications')
    .where('recipientId', 'in', memberIds(caller))
    .orderBy('createdAt', 'desc')
    .limit(100)
    .get()
  const items = snapshot.docs.map((d) => presentation(d.id, d.data()))
  return {
    items: items.slice(0, 50),
    unreadCount: items.filter((n) => !n.isRead).length,
  }
}
export async function markMemberNotifications(
  db: Firestore,
  caller: MemberCaller,
  payload: unknown,
) {
  const input = memberNotificationMutation.parse(payload)
  if (input.action === 'read') {
    const ref = db.collection('notifications').doc(input.id)
    await db.runTransaction(async (tx) => {
      const data = (await tx.get(ref)).data()
      if (!data || !memberIds(caller).includes(data.recipientId))
        throw new MemberError('Notification introuvable.', 404)
      tx.update(ref, { isRead: true, updatedAt: FieldValue.serverTimestamp() })
    })
    return { success: true }
  }
  const snapshot = await db
    .collection('notifications')
    .where('recipientId', 'in', memberIds(caller))
    .where('isRead', '==', false)
    .limit(500)
    .get()
  const batch = db.batch()
  snapshot.docs.forEach((d) =>
    batch.update(d.ref, {
      isRead: true,
      updatedAt: FieldValue.serverTimestamp(),
    }),
  )
  if (snapshot.size) await batch.commit()
  return { success: true, count: snapshot.size }
}
/** Collection sans accès client Firestore (refusée par défaut). Le jeton est
 * lié aux seuls identifiants vérifiés du membre, jamais aux scopes admin. */
export async function saveMemberDevice(
  db: Firestore,
  caller: MemberCaller,
  payload: unknown,
  remove = false,
) {
  const input = deviceSchema.parse(payload),
    ref = db.collection('memberMobileDevices').doc(input.token)
  await db.runTransaction(async (tx) => {
    const previous = (await tx.get(ref)).data()
    if (previous?.uid && previous.uid !== caller.uid)
      throw new MemberError(
        'Cet appareil ne peut pas être associé à ce compte.',
        403,
      )
    if (remove) tx.delete(ref)
    else
      tx.set(ref, {
        audience: 'member',
        uid: caller.uid,
        memberIds: memberIds(caller),
        platform: input.platform,
        notificationScopes: ['*'],
        muted: input.muted,
        updatedAt: FieldValue.serverTimestamp(),
        expiresAt: new Date(Date.now() + 30 * 86400000),
      })
  })
  return { success: true }
}
