import { adminFirestore } from '@/firebase/adminFirestore'
import { RESTRICTED_ROLE_TEMPLATES } from '@/constantes/permissions'
import { NextResponse, type NextRequest } from 'next/server'
import { verifyAdminSessionFromRequest, type SessionClaims } from './session'

export type AdminCaller = {
  claims: SessionClaims
  roles: string[]
  isSuperAdmin: boolean
  /** Rôle restreint (agent de recouvrement, gestionnaire des véhicules), ou null. */
  restrictedRole: string | null
}

const isSuperAdminRole = (role: string) => role.toLowerCase().replace(/[^a-z]/g, '').includes('superadmin')

/** Fiche `admins` de l'appelant : par uid (= matricule), sinon par email. */
async function findAdminRoles(claims: SessionClaims): Promise<string[]> {
  if (!adminFirestore) return []
  try {
    const byId = await adminFirestore.collection('admins').doc(claims.uid).get()
    if (byId.exists) return (byId.data()?.roles ?? []) as string[]
    if (typeof claims.email === 'string' && claims.email) {
      const q = await adminFirestore.collection('admins').where('email', '==', claims.email).limit(1).get()
      if (!q.empty) return (q.docs[0].data()?.roles ?? []) as string[]
    }
  } catch {
    // ignore : on s'appuie sur le claim
  }
  return []
}

/** Identifie l'admin connecté qui appelle une route d'API (cookie de session ou jeton Bearer). */
export async function getAdminCaller(req: NextRequest): Promise<AdminCaller | null> {
  const claims = await verifyAdminSessionFromRequest(req)
  if (!claims) return null
  const docRoles = await findAdminRoles(claims)
  const roles = [...new Set([...(typeof claims.role === 'string' ? [claims.role] : []), ...docRoles].filter(Boolean))]
  const isSuperAdmin = roles.some(isSuperAdminRole)
  const restrictedRole = isSuperAdmin ? null : (roles.find((r) => r in RESTRICTED_ROLE_TEMPLATES) ?? null)
  return { claims, roles, isSuperAdmin, restrictedRole }
}

/**
 * Garde des routes d'API sensibles : le middleware ne couvre pas `/api`, chaque
 * route doit donc vérifier elle-même son appelant.
 * - `superAdmin` : réservé au SuperAdmin (gestion des comptes administrateurs) ;
 * - sinon tout admin, hors rôles restreints sauf `allowRestricted`.
 * Renvoie l'appelant, ou la réponse d'erreur à retourner telle quelle.
 */
export async function requireAdminCaller(
  req: NextRequest,
  opts: { superAdmin?: boolean; allowRestricted?: boolean } = {},
): Promise<AdminCaller | NextResponse> {
  const caller = await getAdminCaller(req)
  if (!caller) return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
  if (opts.superAdmin && !caller.isSuperAdmin) {
    return NextResponse.json({ error: 'Action réservée au SuperAdmin' }, { status: 403 })
  }
  if (!opts.allowRestricted && caller.restrictedRole) {
    return NextResponse.json({ error: 'Action non autorisée pour ce rôle' }, { status: 403 })
  }
  return caller
}
