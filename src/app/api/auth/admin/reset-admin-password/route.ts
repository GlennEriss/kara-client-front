import { adminAuth } from '@/firebase/adminAuth'
import { findAdminDocRef } from '@/domains/auth/server/adminAccountDoc'
import { generateTemporaryPassword } from '@/domains/auth/server/passwords'
import { requireAdminCaller } from '@/domains/auth/server/requireAdminCaller'
import { FieldValue } from 'firebase-admin/firestore'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Réinitialise le mot de passe d'un administrateur (SuperAdmin uniquement).
 * Body : { adminId } (id de la fiche `admins` = uid Firebase Auth).
 * Renvoie le mot de passe temporaire, à remettre à l'admin : il devra en
 * choisir un nouveau à sa prochaine connexion.
 */
export async function POST(req: NextRequest) {
  if (!adminAuth) {
    return NextResponse.json({ error: 'Firebase Admin non configuré' }, { status: 503 })
  }
  const caller = await requireAdminCaller(req, { superAdmin: true })
  if (caller instanceof NextResponse) return caller

  const { adminId } = (await req.json().catch(() => ({}))) as { adminId?: unknown }
  if (typeof adminId !== 'string' || !adminId.trim()) {
    return NextResponse.json({ error: 'adminId requis' }, { status: 400 })
  }

  try {
    const record = await adminAuth.getUser(adminId)
    const temporaryPassword = generateTemporaryPassword()
    await adminAuth.updateUser(adminId, { password: temporaryPassword, disabled: false })
    // Les sessions ouvertes avec l'ancien mot de passe sont fermées.
    await adminAuth.revokeRefreshTokens(adminId)

    const ref = await findAdminDocRef(adminId, record.email)
    await ref?.update({
      mustChangePassword: true,
      passwordResetAt: FieldValue.serverTimestamp(),
      passwordResetBy: caller.claims.uid,
      updatedAt: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({ email: record.email ?? null, temporaryPassword })
  } catch (error: unknown) {
    const code = typeof error === 'object' && error && 'code' in error ? String((error as { code: unknown }).code) : ''
    if (code === 'auth/user-not-found') {
      return NextResponse.json({ error: "Aucun compte de connexion pour cet administrateur" }, { status: 404 })
    }
    console.error('[reset-admin-password] échec:', error)
    return NextResponse.json({ error: 'Erreur lors de la réinitialisation du mot de passe' }, { status: 500 })
  }
}
