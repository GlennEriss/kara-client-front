import { verifyAdminSessionFromRequest } from '@/domains/auth/server/session'
import { adminFirestore } from '@/firebase/adminFirestore'
import { getAuth } from 'firebase-admin/auth'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

/**
 * Amorçage du premier SuperAdmin.
 *
 * Cas d'usage : aucun SuperAdmin ne peut se connecter pour promouvoir via l'UI
 * (problème de l'œuf et la poule). Ce point d'entrée autorise UNIQUEMENT le
 * compte ci-dessous à s'auto-promouvoir. Sécurité : la promotion n'est
 * appliquée que si la session vérifiée correspond exactement à cet email.
 *
 * À retirer une fois l'amorçage effectué (le bouton associé disparaît de toute
 * façon dès que le compte est SuperAdmin).
 */
const BOOTSTRAP_EMAIL = 'phil@gmail.com'

export async function POST(req: NextRequest) {
  if (!adminFirestore) {
    return NextResponse.json({ error: 'Firebase Admin Firestore non configuré' }, { status: 503 })
  }
  const claims = await verifyAdminSessionFromRequest(req)
  if (!claims) {
    return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
  }
  if ((claims.email || '').toLowerCase() !== BOOTSTRAP_EMAIL) {
    return NextResponse.json({ error: 'Réservé au compte d\'amorçage' }, { status: 403 })
  }

  const db = adminFirestore
  const uid = claims.uid
  const now = new Date()

  try {
    const updatedDocs: string[] = []
    for (const col of ['admins', 'users']) {
      const ref = db.collection(col).doc(uid)
      const snap = await ref.get()
      if (!snap.exists) continue
      const data = snap.data() as { roles?: unknown }
      const existing = Array.isArray(data.roles)
        ? (data.roles as unknown[]).filter((r): r is string => typeof r === 'string' && r !== 'SuperAdmin')
        : []
      await ref.set(
        { role: 'SuperAdmin', roles: ['SuperAdmin', ...existing], updatedAt: now },
        { merge: true },
      )
      updatedDocs.push(col)
    }

    // Bonus : custom claim (prend effet au prochain rafraîchissement du token).
    try {
      await getAuth().setCustomUserClaims(uid, { role: 'SuperAdmin' })
    } catch {
      // Non bloquant : la lecture Firestore par useMyAccess suffit.
    }

    if (updatedDocs.length === 0) {
      return NextResponse.json(
        { error: 'Aucun document admin/users trouvé pour ce compte' },
        { status: 404 },
      )
    }

    return NextResponse.json({ success: true, updatedDocs, uid })
  } catch (error) {
    console.error('[bootstrap-superadmin] échec:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur lors de la promotion' },
      { status: 500 },
    )
  }
}
