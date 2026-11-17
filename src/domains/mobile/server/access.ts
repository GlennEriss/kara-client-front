import { adminAuth } from '@/firebase/adminAuth'
import { adminFirestore } from '@/firebase/adminFirestore'
import { loadAdminAccess } from '@/domains/auth/server/admin-access'
import { findAdminDocRef } from '@/domains/auth/server/adminAccountDoc'
import type { SessionClaims } from '@/domains/auth/server/session'
import type { ResolvedAdminAccess } from '@/domains/auth/access-policy'
import { canWithAccess } from '@/domains/auth/access-policy'
import { NextResponse, type NextRequest } from 'next/server'

export const mobileJson = (body: unknown, status = 200) => NextResponse.json(body, {
  status, headers: { 'Cache-Control': 'no-store, private', Vary: 'Authorization' },
})
export interface MobileCaller {
  claims: SessionClaims
  access: ResolvedAdminAccess
  mustChangePassword: boolean
}
export function mobileCapabilities(access: ResolvedAdminAccess) {
  return {
    dashboard: !access.isAgent,
    calendar: canWithAccess(access, 'calendar.view'),
    amounts: access.restrictedRole !== 'AgentRecouvrement',
    finance: Object.fromEntries([['caisse-speciale','caisseSpeciale'],['caisse-imprevue','caisseImprevue'],['credit-speciale','creditSpeciale']].map(([key,prefix])=>[key, access.restrictedRole !== 'AgentRecouvrement' && canWithAccess(access, `${prefix}.view`)])),
  }
}
/** Les routes mobiles demandent un ID token Firebase, jamais un rôle fourni par le client. */
export async function requireMobileCaller(request: NextRequest, feature?: 'dashboard' | 'calendar'): Promise<MobileCaller | NextResponse> {
  const token = request.headers.get('authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1]
  if (!token) return mobileJson({ error: 'Authentification requise.' }, 401)
  if (!adminAuth || !adminFirestore) return mobileJson({ error: 'Le service d’authentification est indisponible.' }, 503)
  let claims: SessionClaims
  try { claims = await adminAuth.verifyIdToken(token, true) as SessionClaims }
  catch { return mobileJson({ error: 'Votre session a expiré. Reconnectez-vous.' }, 401) }
  try {
    const access = await loadAdminAccess(claims)
    if (!access) return mobileJson({ error: 'Cet espace est réservé aux administrateurs KARA.' }, 403)
    const ref = await findAdminDocRef(claims.uid, claims.email)
    const mustChangePassword = ref ? (await ref.get()).data()?.mustChangePassword === true : false
    if (feature && mustChangePassword) return mobileJson({ error: 'Choisissez votre mot de passe personnel avant de continuer.' }, 403)
    const capabilities = mobileCapabilities(access)
    if (!capabilities.dashboard && !capabilities.calendar) return mobileJson({ error: 'Votre compte ne dispose pas d’un accès aux écrans mobiles.' }, 403)
    if (feature && !capabilities[feature]) return mobileJson({ error: 'Vos permissions ne permettent pas d’accéder à cet écran.' }, 403)
    return { claims, access, mustChangePassword }
  } catch {
    return mobileJson({ error: 'Impossible de vérifier les permissions. Réessayez.' }, 503)
  }
}
