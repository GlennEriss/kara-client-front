import { NextResponse, type NextRequest } from 'next/server'
import { adminAuth } from '@/firebase/adminAuth'
import { adminFirestore } from '@/firebase/adminFirestore'
import { mobileJson } from '@/domains/mobile/server/access'
import { REGLEMENT_VERSION } from '@/constantes/reglement-interieur'

export type MemberData = Record<string, any>
export interface MemberCaller {
  uid: string
  email: string
  matricule: string
  member: MemberData
  dossier: MemberData
}

/** Accès personnel : ne réutilise et n'élargit jamais les permissions admin.
 * L'identité du membre vient exclusivement du jeton vérifié et de users/{uid}.
 * Aucun identifiant de membre transmis en query/body n'est utilisé. */
export async function requireMemberCaller(
  request: NextRequest,
  onboarding = false,
): Promise<MemberCaller | NextResponse> {
  const token = request.headers
    .get('authorization')
    ?.match(/^Bearer\s+(\S+)$/i)?.[1]
  if (!token) return mobileJson({ error: 'Authentification requise.' }, 401)
  if (!adminAuth || !adminFirestore)
    return mobileJson({ error: 'Service membre indisponible.' }, 503)
  let claims
  try {
    claims = await adminAuth.verifyIdToken(token, true)
  } catch {
    return mobileJson(
      { error: 'Votre session a expiré. Reconnectez-vous.' },
      401,
    )
  }
  try {
    const memberSnap = await adminFirestore
      .collection('users')
      .doc(claims.uid)
      .get()
    const member = memberSnap.data()
    const matricule =
      typeof member?.matricule === 'string' ? member.matricule.trim() : ''
    if (
      !member ||
      !matricule ||
      matricule.includes('/') ||
      member.isActive === false
    )
      return mobileJson(
        { error: 'Aucun compte membre actif associé à cette connexion.' },
        403,
      )
    let dossierSnap = await adminFirestore
      .collection('membership-requests')
      .doc(matricule)
      .get()
    if (!dossierSnap.exists) {
      const matches = await adminFirestore
        .collection('membership-requests')
        .where('matricule', '==', matricule)
        .limit(1)
        .get()
      dossierSnap = matches.docs[0] ?? dossierSnap
    }
    const dossier = dossierSnap.data()
    if (!dossier || dossier.status !== 'approved')
      return mobileJson(
        {
          error:
            'Votre adhésion doit être validée pour accéder à l’espace membre.',
        },
        403,
      )
    if (!onboarding && member.mustChangePassword === true)
      return mobileJson(
        {
          error: 'Choisissez votre mot de passe personnel avant de continuer.',
        },
        403,
      )
    if (
      !onboarding &&
      member.reglementInterieurAccepte?.version !== REGLEMENT_VERSION
    )
      return mobileJson(
        { error: 'Veuillez lire et accepter le règlement intérieur.' },
        403,
      )
    return {
      uid: claims.uid,
      email: claims.email || '',
      matricule,
      member,
      dossier: { ...dossier, id: dossierSnap.id },
    }
  } catch {
    return mobileJson(
      { error: 'Impossible de vérifier votre espace membre. Réessayez.' },
      503,
    )
  }
}
