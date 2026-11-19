import { z } from 'zod'
import { NextResponse, type NextRequest } from 'next/server'
import { adminFirestore } from '@/firebase/adminFirestore'
import { mobileJson, requireMobileCaller, type MobileCaller } from './access'
import {
  canReadNotification,
  notificationScopes,
  publicNotification,
} from './notification-policy'
import { FieldValue } from 'firebase-admin/firestore'

const id = z
  .string()
  .min(1)
  .max(240)
  .regex(/^[^/\\]+$/)
const mutation = z.discriminatedUnion('action', [
  z.object({ action: z.literal('read'), id }).strict(),
  z.object({ action: z.literal('readAll') }).strict(),
])
async function authorize(request: NextRequest) {
  const caller = await requireMobileCaller(request)
  if (caller instanceof NextResponse) return caller
  return caller.mustChangePassword
    ? mobileJson(
        {
          error: 'Choisissez votre mot de passe personnel avant de continuer.',
        },
        403,
      )
    : caller
}
function error(error: unknown) {
  return error instanceof z.ZodError
    ? mobileJson({ error: 'La demande de notification est invalide.' }, 422)
    : mobileJson(
        {
          error:
            'Les notifications sont momentanément indisponibles. Réessayez.',
        },
        503,
      )
}
async function unread(caller: MobileCaller) {
  const snapshot = await adminFirestore!
    .collection('notifications')
    .where('isRead', '==', false)
    .limit(10001)
    .get()
  if (snapshot.size > 10000) throw Error('Notification scan limit')
  return snapshot.docs.filter((doc) =>
    canReadNotification(caller.access, doc.data()),
  )
}
export async function getNotifications(request: NextRequest) {
  const caller = await authorize(request)
  if (caller instanceof NextResponse) return caller
  try {
    const selected = request.nextUrl.searchParams.get('id')
    if (selected) {
      const snapshot = await adminFirestore!
        .collection('notifications')
        .doc(id.parse(selected))
        .get()
      if (
        !snapshot.exists ||
        !canReadNotification(caller.access, snapshot.data()!)
      )
        return mobileJson(
          { error: 'Notification introuvable ou accès retiré.' },
          404,
        )
      return mobileJson({
        item: publicNotification(snapshot.id, snapshot.data()!, caller.access),
      })
    }
    const docs = await unread(caller)
    const items = docs
      .map((doc) => publicNotification(doc.id, doc.data(), caller.access))
      .sort(
        (a, b) =>
          (b.createdAt || '').localeCompare(a.createdAt || '') ||
          a.id.localeCompare(b.id),
      )
    return mobileJson({ items: items.slice(0, 50), unreadCount: items.length })
  } catch (e) {
    return error(e)
  }
}
export async function markNotifications(request: NextRequest) {
  const caller = await authorize(request)
  if (caller instanceof NextResponse) return caller
  try {
    const input = mutation.parse(await request.json())
    if (input.action === 'read') {
      const ref = adminFirestore!.collection('notifications').doc(input.id)
      const snapshot = await ref.get()
      if (
        !snapshot.exists ||
        !canReadNotification(caller.access, snapshot.data()!)
      )
        return mobileJson(
          { error: 'Notification introuvable ou accès retiré.' },
          404,
        )
      await ref.update({ isRead: true })
    } else {
      const docs = await unread(caller)
      for (let start = 0; start < docs.length; start += 400) {
        const batch = adminFirestore!.batch()
        docs
          .slice(start, start + 400)
          .forEach((doc) => batch.update(doc.ref, { isRead: true }))
        await batch.commit()
      }
    }
    return mobileJson({ success: true })
  } catch (e) {
    return error(e)
  }
}
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
export async function saveNotificationDevice(
  request: NextRequest,
  remove = false,
) {
  const caller = await authorize(request)
  if (caller instanceof NextResponse) return caller
  try {
    const input = deviceSchema.parse(await request.json())
    const ref = adminFirestore!.collection('fcmTokens').doc(input.token)
    await adminFirestore!.runTransaction(async (tx) => {
      const previous = (await tx.get(ref)).data()
      if (previous?.uid && previous.uid !== caller.claims.uid)
        throw Error('Device owner mismatch')
      if (remove) tx.delete(ref)
      else
        tx.set(ref, {
          audience: 'admin',
          uid: caller.claims.uid,
          platform: input.platform,
          notificationScopes: notificationScopes(caller.access),
          muted: input.muted,
          updatedAt: FieldValue.serverTimestamp(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        })
    })
    return mobileJson({ success: true })
  } catch (e) {
    return error(e)
  }
}
