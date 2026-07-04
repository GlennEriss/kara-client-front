import { adminAuth } from '@/firebase/adminAuth'
import { adminFirestore } from '@/firebase/adminFirestore'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'

/**
 * Email de connexion généré, même schéma que l'ajout d'un membre par l'admin :
 * prenomnom + 4 premiers chiffres du matricule @kara.ga (ex. jeandupont2014@kara.ga).
 */
function generateMemberEmail(matricule: string, firstName?: string, lastName?: string): string {
  const fn = (firstName || '').toLowerCase().replace(/[^a-z]/g, '')
  const ln = (lastName || '').toLowerCase().replace(/[^a-z]/g, '')
  const namePart = `${fn}${ln}` || 'membre'
  const digits = matricule.replace(/\D/g, '').slice(0, 4) || '0000'
  return `${namePart}${digits}@kara.ga`
}

/**
 * Réinitialise le mot de passe d'un membre (admin uniquement) et **crée le compte
 * Firebase Auth s'il n'existe pas** (cas des membres importés, créés sans Auth).
 * Body: { memberId: string }
 * memberId = uid Firebase Auth (= id du document users = matricule normalisé).
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

    const newPassword = generatePassword(12)

    // Données membre (nom, matricule, email réel) pour générer l'email de connexion.
    let firstName = ''
    let lastName = ''
    let realEmail = ''
    let matricule = memberId
    if (adminFirestore) {
      try {
        const snap = await adminFirestore.collection('users').doc(memberId).get()
        const d = (snap.exists ? snap.data() : null) as
          | { email?: string; firstName?: string; lastName?: string; matricule?: string }
          | null
        if (d) {
          firstName = d.firstName || ''
          lastName = d.lastName || ''
          matricule = d.matricule || memberId
          if (typeof d.email === 'string' && d.email.includes('@')) realEmail = d.email.trim()
        }
      } catch {
        // ignore : on génère l'email depuis le matricule
      }
    }

    // Email de connexion : email réel s'il existe, sinon généré (schéma admin @kara.ga).
    const email = realEmail || generateMemberEmail(matricule, firstName, lastName)
    const displayName = [firstName, lastName].filter(Boolean).join(' ').trim() || undefined
    let created = false

    try {
      // Compte Auth existant → réinitialiser le mot de passe + email + activer.
      const userRecord = await adminAuth.getUser(memberId)
      await adminAuth.updateUser(memberId, {
        password: newPassword,
        email: userRecord.email || email, // garder l'email existant, sinon le poser
        emailVerified: true,
        disabled: false,
      })
    } catch (err: unknown) {
      const code = typeof err === 'object' && err !== null && 'code' in err ? String((err as { code: unknown }).code) : ''
      if (code !== 'auth/user-not-found') throw err

      // Pas de compte Auth (membre importé) → création + activation directe.
      await adminAuth.createUser({
        uid: memberId,
        email,
        password: newPassword,
        displayName,
        emailVerified: true,
        disabled: false,
      })
      created = true
    }

    // Stocker l'email de connexion sur la fiche membre (cohérence d'affichage) et
    // marquer le mot de passe comme « à changer » : le membre devra en définir un
    // nouveau à sa prochaine connexion (le mot de passe initial est généré par l'admin).
    if (adminFirestore) {
      try {
        await adminFirestore
          .collection('users')
          .doc(memberId)
          .update({ email, mustChangePassword: true, updatedAt: new Date() })
      } catch {
        // non bloquant
      }
    }

    return NextResponse.json({ success: true, email, newPassword, created })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    return NextResponse.json(
      { error: 'Erreur lors de la réinitialisation du mot de passe', details: message },
      { status: 500 }
    )
  }
}
