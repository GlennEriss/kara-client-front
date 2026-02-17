import { adminAuth } from '@/firebase/adminAuth'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'

/**
 * Réinitialise le mot de passe d'un membre (admin uniquement).
 * Body: { memberId: string }
 * memberId = uid Firebase Auth (même que l'id du document users).
 */
export async function POST(req: NextRequest) {
  if (!adminAuth) {
    return NextResponse.json(
      { error: 'Firebase Admin non configuré' },
      { status: 503 }
    )
  }

  const generatePassword = (length: number = 12): string => {
    // Avoid ambiguous chars and ensure a decent mix.
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*?'
    const pick = () => alphabet[crypto.randomInt(0, alphabet.length)]
    let pwd = Array.from({ length }, pick).join('')

    // Ensure at least one of each: lower, upper, digit.
    const hasLower = /[a-z]/.test(pwd)
    const hasUpper = /[A-Z]/.test(pwd)
    const hasDigit = /[0-9]/.test(pwd)
    if (!hasLower || !hasUpper || !hasDigit) {
      pwd = `${pick()}${pick()}A1a${pwd}`.slice(0, length)
    }
    return pwd
  }

  try {
    const body = await req.json()
    const { memberId } = body as { memberId?: string }

    if (!memberId || typeof memberId !== 'string') {
      return NextResponse.json(
        { error: 'memberId requis' },
        { status: 400 }
      )
    }

    const userRecord = await adminAuth.getUser(memberId)
    const email = userRecord.email || null
    const newPassword = generatePassword(12)

    await adminAuth.updateUser(memberId, { password: newPassword })
    return NextResponse.json({ success: true, email, newPassword })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    return NextResponse.json(
      { error: 'Erreur lors de la réinitialisation du mot de passe', details: message },
      { status: 500 }
    )
  }
}
