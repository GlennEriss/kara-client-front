import { adminAuth } from '@/firebase/adminAuth'
import { adminFirestore } from '@/firebase/adminFirestore'
import { verifyAdminSessionFromRequest } from '@/domains/auth/server/session'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Migre l'UID d'un compte admin sur Auth ET Firestore.
 *
 * Un UID Firebase Auth étant immuable, on RECRÉE le compte avec le nouvel UID
 * (même email, même mot de passe fourni, mêmes custom claims) puis on supprime
 * l'ancien. Les documents Firestore (admins/{uid}, users/{uid}) sont recopiés
 * vers le nouvel ID puis supprimés.
 *
 * Body: { email: string, newUid: string, password: string }
 * Réservé aux admins.
 */
const COLLECTIONS_TO_MIGRATE = ['admins', 'users'] as const

export async function POST(req: NextRequest) {
  if (!adminAuth || !adminFirestore) {
    return NextResponse.json({ error: 'Firebase Admin non configuré' }, { status: 503 })
  }

  const claims = await verifyAdminSessionFromRequest(req)
  if (!claims) {
    return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
  }

  let oldEmailFreed: { oldUid: string; email: string } | null = null

  try {
    const { email, newUid, password } = (await req.json()) as {
      email?: string
      newUid?: string
      password?: string
    }

    const trimmedEmail = (email || '').trim().toLowerCase()
    const trimmedUid = (newUid || '').trim()
    if (!trimmedEmail || !trimmedUid || !password) {
      return NextResponse.json({ error: 'email, newUid et password sont requis' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Le mot de passe doit faire au moins 6 caractères' }, { status: 400 })
    }

    // 1) Compte source
    const oldUser = await adminAuth.getUserByEmail(trimmedEmail)
    const oldUid = oldUser.uid
    if (oldUid === trimmedUid) {
      return NextResponse.json({ error: 'Le compte a déjà cet UID' }, { status: 400 })
    }

    // 2) Le nouvel UID doit être libre (Auth + Firestore)
    try {
      await adminAuth.getUser(trimmedUid)
      return NextResponse.json({ error: `L'UID ${trimmedUid} est déjà utilisé dans Auth` }, { status: 409 })
    } catch (e: unknown) {
      const code = typeof e === 'object' && e !== null && 'code' in e ? String((e as { code: unknown }).code) : ''
      if (code !== 'auth/user-not-found') throw e
    }
    for (const col of COLLECTIONS_TO_MIGRATE) {
      const exists = await adminFirestore.collection(col).doc(trimmedUid).get()
      if (exists.exists) {
        return NextResponse.json(
          { error: `Un document ${col}/${trimmedUid} existe déjà` },
          { status: 409 },
        )
      }
    }

    // 3) Données à recopier
    const customClaims = oldUser.customClaims || {}
    const docsToCopy: { col: string; data: FirebaseFirestore.DocumentData }[] = []
    for (const col of COLLECTIONS_TO_MIGRATE) {
      const snap = await adminFirestore.collection(col).doc(oldUid).get()
      if (snap.exists) docsToCopy.push({ col, data: snap.data() || {} })
    }

    // 4) Libérer l'email de l'ancien compte (un email Auth doit être unique)
    const tempEmail = `migrated-${oldUid.toLowerCase().replace(/[^a-z0-9._-]/g, '')}@kara.local`
    await adminAuth.updateUser(oldUid, { email: tempEmail })
    oldEmailFreed = { oldUid, email: trimmedEmail }

    // 5) Créer le nouveau compte Auth avec le nouvel UID
    await adminAuth.createUser({
      uid: trimmedUid,
      email: trimmedEmail,
      password,
      emailVerified: oldUser.emailVerified,
      displayName: oldUser.displayName,
      disabled: oldUser.disabled,
    })
    if (Object.keys(customClaims).length > 0) {
      await adminAuth.setCustomUserClaims(trimmedUid, customClaims)
    }

    // 6) Recopier les documents Firestore vers le nouvel ID, puis supprimer les anciens
    const migratedDocs: string[] = []
    for (const { col, data } of docsToCopy) {
      await adminFirestore
        .collection(col)
        .doc(trimmedUid)
        .set({ ...data, id: trimmedUid, uid: trimmedUid, matricule: trimmedUid, updatedAt: new Date() })
      migratedDocs.push(`${col}/${trimmedUid}`)
    }
    for (const { col } of docsToCopy) {
      await adminFirestore.collection(col).doc(oldUid).delete()
    }

    // 7) Supprimer l'ancien compte Auth
    await adminAuth.deleteUser(oldUid)
    oldEmailFreed = null

    return NextResponse.json({
      success: true,
      oldUid,
      newUid: trimmedUid,
      email: trimmedEmail,
      migratedDocs,
      claimsCopied: Object.keys(customClaims),
    })
  } catch (error: unknown) {
    // En cas d'échec après avoir renommé l'email, on restaure l'ancien compte.
    if (oldEmailFreed && adminAuth) {
      try {
        await adminAuth.updateUser(oldEmailFreed.oldUid, { email: oldEmailFreed.email })
      } catch {
        // best-effort
      }
    }
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    return NextResponse.json(
      { error: "Échec de la migration de l'UID admin", details: message },
      { status: 500 },
    )
  }
}
