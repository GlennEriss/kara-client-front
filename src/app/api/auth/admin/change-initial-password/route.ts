import { adminAuth } from '@/firebase/adminAuth'
import { findAdminDocRef } from '@/domains/auth/server/adminAccountDoc'
import { isValidNewPassword } from '@/domains/auth/server/passwords'
import { requireAdminCaller } from '@/domains/auth/server/requireAdminCaller'
import { FieldValue } from 'firebase-admin/firestore'
import { NextRequest, NextResponse } from 'next/server'

/**
 * L'administrateur connecté remplace le mot de passe temporaire qui lui a été
 * remis par un mot de passe personnel, puis le drapeau `mustChangePassword` est
 * levé. Même règle que l'espace membre : 8 caractères, une lettre, un chiffre.
 */
export async function POST(req: NextRequest) {
  if (!adminAuth) {
    return NextResponse.json({ error: 'Firebase Admin non configuré' }, { status: 503 })
  }
  // Tout compte admin, rôles restreints compris : chacun change son propre mot de passe.
  const caller = await requireAdminCaller(req, { allowRestricted: true })
  if (caller instanceof NextResponse) return caller

  const { newPassword } = (await req.json().catch(() => ({}))) as { newPassword?: unknown }
  if (!isValidNewPassword(newPassword)) {
    return NextResponse.json({ error: 'INVALID_PASSWORD' }, { status: 400 })
  }

  try {
    const { uid, email } = caller.claims
    await adminAuth.updateUser(uid, { password: newPassword })
    const ref = await findAdminDocRef(uid, typeof email === 'string' ? email : null)
    await ref?.update({
      mustChangePassword: false,
      passwordChangedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[change-initial-password] échec:', error)
    return NextResponse.json({ error: 'PASSWORD_UPDATE_FAILED' }, { status: 500 })
  }
}
