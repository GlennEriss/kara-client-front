import { verifyAdminSessionFromRequest } from '@/domains/auth/server/session'
import { adminFirestore } from '@/firebase/adminFirestore'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { NextRequest, NextResponse } from 'next/server'

type Payload = {
  matricule: string
  userId: string
  userData: Record<string, unknown>
  subscriptionId: string
  subscriptionData: Record<string, unknown> & {
    dateStart?: string
    dateEnd?: string
  }
}

function cleanPlain(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(cleanPlain)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (val === undefined) continue
      out[key] = cleanPlain(val)
    }
    return out
  }
  return value
}

function timestampFromIso(value: unknown): Timestamp | null {
  if (typeof value !== 'string') return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : Timestamp.fromDate(date)
}

export async function POST(req: NextRequest) {
  if (!adminFirestore) {
    return NextResponse.json({ error: 'Firebase Admin Firestore non configure' }, { status: 503 })
  }

  const claims = await verifyAdminSessionFromRequest(req)
  if (!claims) {
    return NextResponse.json({ error: 'Acces non autorise' }, { status: 403 })
  }

  try {
    const body = (await req.json()) as Partial<Payload>
    const { matricule, userId, userData, subscriptionId, subscriptionData } = body

    if (!matricule || !userId || !subscriptionId || !userData || !subscriptionData) {
      return NextResponse.json({ error: 'Payload incomplet' }, { status: 400 })
    }

    const dateStart = timestampFromIso(subscriptionData.dateStart)
    const dateEnd = timestampFromIso(subscriptionData.dateEnd)
    if (!dateStart || !dateEnd) {
      return NextResponse.json({ error: 'Dates abonnement invalides' }, { status: 400 })
    }

    const batch = adminFirestore.batch()
    const userRef = adminFirestore.collection('users').doc(userId)
    const subscriptionRef = adminFirestore.collection('subscriptions').doc(subscriptionId)

    batch.set(userRef, {
      ...(cleanPlain(userData) as Record<string, unknown>),
      id: userId,
      matricule,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    batch.set(subscriptionRef, {
      ...(cleanPlain(subscriptionData) as Record<string, unknown>),
      id: subscriptionId,
      userId,
      memberMatricule: matricule,
      dateStart,
      dateEnd,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    await batch.commit()

    return NextResponse.json({ success: true, userId, subscriptionId })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inattendue'
    return NextResponse.json({ error: 'Erreur creation adhesion migree', details: message }, { status: 500 })
  }
}
