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

/** Un SuperAdmin existe-t-il déjà (admins ou users) ? */
async function superAdminExists(db: FirebaseFirestore.Firestore): Promise<boolean> {
  for (const col of ['admins', 'users']) {
    const byArray = await db.collection(col).where('roles', 'array-contains', 'SuperAdmin').limit(1).get()
    if (!byArray.empty) return true
    const byField = await db.collection(col).where('role', '==', 'SuperAdmin').limit(1).get()
    if (!byField.empty) return true
  }
  return false
}

export async function POST(req: NextRequest) {
  if (!adminFirestore) {
    return NextResponse.json({ error: 'Firebase Admin Firestore non configuré' }, { status: 503 })
  }
  const claims = await verifyAdminSessionFromRequest(req)
  if (!claims) {
    return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
  }

  const db = adminFirestore
  const uid = claims.uid
  const now = new Date()

  // Autorisé si : c'est le compte d'amorçage désigné, OU aucun SuperAdmin
  // n'existe encore (premier SuperAdmin du système). Sinon → passer par l'UI.
  const isBootstrapEmail = (claims.email || '').toLowerCase() === BOOTSTRAP_EMAIL
  if (!isBootstrapEmail) {
    if (await superAdminExists(db)) {
      return NextResponse.json(
        { error: 'Un SuperAdmin existe déjà — utilisez la page Administration pour promouvoir un compte.' },
        { status: 403 },
      )
    }
  }

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
