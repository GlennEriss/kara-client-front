import { adminAuth } from '@/firebase/adminAuth'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Réinitialise le mot de passe d'un membre (admin uniquement).
 * Body: { memberId: string, newPassword: string }
 * memberId = uid Firebase Auth (même que l'id du document users).
 */
export async function POST(req: NextRequest) {
  if (!adminAuth) {
    return NextResponse.json(
      { error: 'Firebase Admin non configuré' },
      { status: 503 }
    )
  }

  try {
    const body = await req.json()
    const { memberId, newPassword } = body as { memberId?: string; newPassword?: string }

    if (!memberId || typeof memberId !== 'string') {
      return NextResponse.json(
        { error: 'memberId requis' },
        { status: 400 }
      )
    }

    if (!newPassword || typeof newPassword !== 'string') {
      return NextResponse.json(
        { error: 'newPassword requis' },
        { status: 400 }
      )
    }

    await adminAuth.updateUser(memberId, { password: newPassword })
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    return NextResponse.json(
      { error: 'Erreur lors de la réinitialisation du mot de passe', details: message },
      { status: 500 }
    )
  }
}
